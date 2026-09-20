import type { DetectionRawSchema } from "@/schemas/DetectionSchema"
import {
	getGlobalLiteRtPromise,
	getWebGpuDevice,
	isWebGPUSupported,
	loadAndCompile,
	loadLiteRt,
	Tensor,
} from "@litertjs/core"
import type { Accelerator, CompiledModel } from "@litertjs/core"

//

// --- Types
/**
 * CHANGED: was `Parameters<typeof tf.browser.fromPixels>[0]`. LiteRT has no image
 * entry point of its own, so frames are rasterized through a 2D canvas instead and
 * the accepted sources are whatever `drawImage` takes.
 */
type PixelSource = ImageBitmap | OffscreenCanvas | HTMLCanvasElement | HTMLImageElement | HTMLVideoElement

/**
 * NEW: the tfjs pipeline hardcoded an NHWC input and an "Identity" output. A LiteRT
 * export carries its real tensor shapes, so they are read back once at load time and
 * passed around rather than assumed.
 */
type ModelLayout = {
	imageSize: number
	channelsFirst: boolean
	boxCount: number
	boxStride: number
	boxesLast: boolean
}

/** NEW: a decoded detection in 0-1 corner form, used between decoding and NMS. */
type DecodedBox = {
	x1: number
	y1: number
	x2: number
	y2: number
	confidence: number
}

//

// --- Config
/** CHANGED: LiteRT's wasm runtime is served from `public/litert/`, replacing `public/tfjs/`. */
const WASM_PATH = "/litert/"

/**
 * CHANGED: a single-class export emits [cx, cy, w, h, score] with no class channel, so the
 * stride is 5 rather than the 6 a multiclass head would use. The bundled yolo26l export is
 * [1, 5, 2100]; the real stride is read off the model and this is only the floor used to
 * reject a malformed output.
 */
const MIN_BOX_STRIDE = 5

/** CHANGED: replaces the tfjs backend string. LiteRT only offers "webgpu" and "wasm". */
let accelerator: Accelerator = "wasm"

//

// --- Functions
/**
 * NEW: LiteRT bootstraps its wasm glue with importScripts(), which exists but throws in an ES
 * module worker — and Vite hardcodes module workers in dev regardless of `worker.format`, so the
 * app hits exactly that. The glue is a UMD classic script whose top-level `var ModuleFactory`
 * only reaches the global object under classic evaluation, so a dynamic import() cannot stand in
 * for it. This installs a synchronous XHR + indirect-eval shim that keeps the signature LiteRT
 * expects. It is a no-op wherever native importScripts already works (classic workers) and on the
 * main thread, where LiteRT appends a <script> tag instead.
 */
const ensureImportScripts = () => {
	const scope = globalThis as typeof globalThis & { importScripts?: (...urls: string[]) => void }

	try {
		// A zero-argument call does nothing in a classic worker but throws in a module worker.
		scope.importScripts?.()
		return
	} catch {
		// Not usable here, so fall through and install the shim.
	}

	scope.importScripts = (...urls: string[]) => {
		for (const url of urls) {
			const request = new XMLHttpRequest()
			request.open("GET", url, false)
			request.send()
			if (request.status >= 400) throw new Error(`Failed to load ${url} (${request.status}).`)

			// Indirect eval runs in global scope. The trailing assignment re-exports the factory
			// explicitly so this holds even if the glue is ever built in strict mode, where a
			// top-level `var` would otherwise stay inside the eval.
			const globalize = ";globalThis.ModuleFactory = typeof ModuleFactory !== 'undefined' ? ModuleFactory : globalThis.ModuleFactory;"
			;(0, eval)(request.responseText + globalize)
		}
	}
}

/**
 * CHANGED: was `setWasmPaths` + a wasm/webgl race + `tf.loadGraphModel`. LiteRT has no
 * webgl backend, so the choice collapses to WebGPU when the browser exposes it and
 * XNNPACK-on-wasm otherwise. The Capacitor WebView has no WebGPU, so it lands on wasm.
 */
const load = async (url: string) => {
	ensureImportScripts()

	// NEW: LiteRT calls createWasmLib() without a file locator, so its Emscripten glue resolves
	// the .wasm relative to the running script. In a worker that is the bundle's own folder
	// (/assets/), not WASM_PATH, and the fetch 404s. Seeding globalThis.Module with a locateFile
	// pins the lookup; wasm-utils only overwrites it when LiteRT supplies a locator of its own.
	Object.assign(globalThis, { Module: { locateFile: (file: string) => `${WASM_PATH}${file}` } })

	// The wasm module is a global singleton, so reuse it when a model was already loaded.
	await (getGlobalLiteRtPromise() ?? loadLiteRt(WASM_PATH))

	// CHANGED: isWebGPUSupported() only reports that navigator.gpu exists. The adapter can still
	// be missing (blocklisted GPU, software rendering, headless), in which case compiling for
	// WebGPU throws. The real device is checked first and the compile still falls back to
	// XNNPACK-on-wasm, which is the path the Capacitor WebView always takes.
	if (isWebGPUSupported() && getWebGpuDevice()) {
		try {
			const model = await loadAndCompile(url, { accelerator: "webgpu" })
			accelerator = "webgpu"
			return model
		} catch (error) {
			console.warn("WebGPU is unusable, falling back to wasm.", error)
		}
	}

	accelerator = "wasm"
	return await loadAndCompile(url, { accelerator })
}

/**
 * NEW: reads the compiled model's real input and output shapes so preprocessing and
 * decoding never guess. Ultralytics warns not to assume the legacy NHWC layout or the
 * "Identity" output names on LiteRT exports.
 */
const describe = (model: CompiledModel): ModelLayout => {
	const input = model.getInputDetails()[0]
	const output = model.getOutputDetails()[0]
	if (!input || !output) throw new Error("The AI model exposes no input or output tensor.")

	// [1, 3, size, size] when channels-first, [1, size, size, 3] when channels-last.
	const channelsFirst = input.shape[1] === 3
	const imageSize = (channelsFirst ? input.shape[2] : input.shape[1]) ?? 0

	// The detection axis is whichever is larger: [1, 5, 2100] here, but [1, 8400, 6] also occurs.
	const first = output.shape[1] ?? 0
	const second = output.shape[2] ?? 0
	const boxesLast = first <= second
	const boxStride = boxesLast ? first : second
	const boxCount = boxesLast ? second : first

	if (imageSize <= 0 || boxCount <= 0) throw new Error("The AI model has an unexpected tensor shape.")
	if (boxStride < MIN_BOX_STRIDE) throw new Error(`The AI model returns only ${boxStride} values per box.`)

	return { imageSize, channelsFirst, boxCount, boxStride, boxesLast }
}

/** NEW: builds the input shape in whichever layout the export was traced with. */
const inputShape = (layout: ModelLayout) => {
	const { imageSize, channelsFirst } = layout
	return channelsFirst ? [1, 3, imageSize, imageSize] : [1, imageSize, imageSize, 3]
}

/**
 * CHANGED: was `tf.zeros` + `model.execute(dummy, "Identity")`. LiteRT tensors are not
 * garbage collected, so the dummy input and every output are deleted by hand.
 */
const warmup = async (model: CompiledModel, layout: ModelLayout) => {
	const dummy = new Tensor(new Float32Array(layout.imageSize * layout.imageSize * 3), inputShape(layout))
	let outputs: Tensor[] = []

	try {
		outputs = await model.run(dummy)
	} finally {
		dummy.delete()
		for (const output of outputs) output.delete()
	}
}

/** Runs preprocessing, prediction, and postprocessing to get bounding boxes. */
const predict = async (
	model: CompiledModel,
	image: PixelSource,
	label: string,
	layout: ModelLayout,
	minIoU = 0.5,
	minScore = 0.4,
	maxBoxCount = 100
) => {
	// CHANGED: `tf.tidy` is gone, so every tensor is released explicitly in `finally`.
	const input = preprocess(image, layout)
	let outputs: Tensor[] = []

	try {
		outputs = await model.run(input)

		const output = outputs[0]
		if (!output) throw new Error("The AI model returned no detection output.")

		// CHANGED: postprocessing now runs on a plain Float32Array instead of on tensors.
		const raw = (await output.data()) as Float32Array
		return postprocess(raw, label, layout, minIoU, minScore, maxBoxCount)
	} finally {
		input.delete()
		for (const output of outputs) output.delete()
	}
}

/** CHANGED: reports the LiteRT accelerator picked at load time instead of `tf.getBackend()`. */
const backend = async () => accelerator

/**
 * CHANGED: `fromPixels().div(255).resizeBilinear().expandDims(0)` produced NHWC. This export
 * is traced from PyTorch and is channels-first, so the resize now happens on an OffscreenCanvas
 * and the pixels are packed into planar CHW. Aspect ratio is still squashed rather than
 * letterboxed, which matches the previous behaviour.
 */
const preprocess = (image: PixelSource, layout: ModelLayout) => {
	const { imageSize, channelsFirst } = layout

	const canvas = new OffscreenCanvas(imageSize, imageSize)
	const context = canvas.getContext("2d", { willReadFrequently: true })
	if (!context) throw new Error("Unable to rasterize the frame for the AI model.")

	context.drawImage(image, 0, 0, imageSize, imageSize)
	const { data } = context.getImageData(0, 0, imageSize, imageSize)

	const plane = imageSize * imageSize
	const pixels = new Float32Array(plane * 3)

	for (let index = 0; index < plane; index++) {
		const red = data[index * 4]! / 255
		const green = data[index * 4 + 1]! / 255
		const blue = data[index * 4 + 2]! / 255

		if (channelsFirst) {
			pixels[index] = red
			pixels[plane + index] = green
			pixels[plane * 2 + index] = blue
		} else {
			pixels[index * 3] = red
			pixels[index * 3 + 1] = green
			pixels[index * 3 + 2] = blue
		}
	}

	return new Tensor(pixels, inputShape(layout))
}

/**
 * CHANGED: the old code read the vector as corners [x1, y1, x2, y2, confidence]. This export
 * is the standard Ultralytics raw head, (1, 4 + classes, anchors) with one class, so each
 * anchor is [cx, cy, w, h, score] in CENTER form. Verified against the bundled model: 1893 of
 * its 2100 anchors have x2 <= x1 under the corner reading, which only makes sense as centers.
 * The label is supplied by the caller since a single-class export has no class channel.
 */
const extract = (raw: Float32Array, layout: ModelLayout, index: number) => {
	// CHANGED: was five tfjs slice/squeeze calls, now a strided read of the flat output.
	// The bundled export is channel-major ([1, 5, 2100]), so channels stride by box count.
	const at = (channel: number) =>
		(layout.boxesLast ? raw[channel * layout.boxCount + index] : raw[index * layout.boxStride + channel]) ?? 0

	return { cx: at(0), cy: at(1), w: at(2), h: at(3), confidence: at(4) }
}

/** NEW: intersection-over-union in 0-1 corner space, for the JavaScript NMS below. */
const iou = (first: DecodedBox, second: DecodedBox) => {
	const left = Math.max(first.x1, second.x1)
	const top = Math.max(first.y1, second.y1)
	const right = Math.min(first.x2, second.x2)
	const bottom = Math.min(first.y2, second.y2)

	const overlap = Math.max(0, right - left) * Math.max(0, bottom - top)
	if (overlap <= 0) return 0

	const firstArea = (first.x2 - first.x1) * (first.y2 - first.y1)
	const secondArea = (second.x2 - second.x1) * (second.y2 - second.y1)
	const union = firstArea + secondArea - overlap

	return union > 0 ? overlap / union : 0
}

/**
 * CHANGED: `tf.image.nonMaxSuppressionAsync` has no LiteRT equivalent, so this is a plain
 * greedy pass. The export emits 2100 raw anchors rather than an NMS-free head, so this is
 * doing real work and is not just a duplicate guard.
 */
const nms = (boxes: DecodedBox[], minIoU: number, maxBoxCount: number) => {
	const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence)
	const kept: DecodedBox[] = []

	for (const candidate of sorted) {
		if (kept.length >= maxBoxCount) break
		if (kept.some(box => iou(box, candidate) > minIoU)) continue
		kept.push(candidate)
	}

	return kept
}

/** Uses the kept boxes to build normalized, frame-clipped detections. */
const classify = (label: string, boxes: DecodedBox[]): DetectionRawSchema[] => {
	const result: DetectionRawSchema[] = []

	// CHANGED: boxes already arrive normalized, so this only clips and converts to x/y/w/h.
	for (const box of boxes) {
		const x = Math.min(1, Math.max(0, box.x1))
		const y = Math.min(1, Math.max(0, box.y1))
		const w = Math.min(1, Math.max(0, box.x2)) - x
		const h = Math.min(1, Math.max(0, box.y2)) - y
		if (w <= 0 || h <= 0) continue

		result.push({ box: { x, y, w, h }, class: label, confidence: box.confidence })
	}

	return result
}

/** Combines all postprocessing steps into usable detections. */
const postprocess = (
	raw: Float32Array,
	label: string,
	layout: ModelLayout,
	minIoU = 0.5,
	minScore = 0.4,
	maxBoxCount = 100
) => {
	const decoded: DecodedBox[] = []

	for (let index = 0; index < layout.boxCount; index++) {
		const { cx, cy, w, h, confidence } = extract(raw, layout, index)
		if (confidence < minScore) continue

		// CHANGED: the old pipeline always divided by the image size. This export runs through
		// the Ultralytics `_NormalizeCoords` wrapper, so coordinates already arrive in 0-1.
		// Pixel-space exports are still handled by scaling only when values clearly exceed 1.
		const scale = Math.max(cx, cy, w, h) > 1.5 ? layout.imageSize : 1

		// CHANGED: centers are converted to corners here; the old code assumed corners already.
		const halfWidth = w / scale / 2
		const halfHeight = h / scale / 2
		decoded.push({
			x1: cx / scale - halfWidth,
			y1: cy / scale - halfHeight,
			x2: cx / scale + halfWidth,
			y2: cy / scale + halfHeight,
			confidence,
		})
	}

	return classify(label, nms(decoded, minIoU, maxBoxCount))
}

//

export default { backend, classify, describe, extract, load, nms, postprocess, predict, preprocess, warmup }
export type { ModelLayout, PixelSource }
