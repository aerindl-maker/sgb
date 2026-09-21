import type { DetectionRawSchema } from "@/schemas/DetectionSchema"
import type { Accelerator, CompiledModel } from "@litertjs/core"
import { isWebGPUSupported, loadAndCompile, loadLiteRt, supportsFeature, Tensor } from "@litertjs/core"

//

type Layout = "nchw" | "nhwc"

type Candidate = { x: number; y: number; w: number; h: number; confidence: number }

type PlantDetector = {
	accelerator: Accelerator
	anchorCount: number
	channelCount: number
	imageSize: number
	inputShape: number[]
	layout: Layout
	model: CompiledModel
}

//

/** Glue files `loadLiteRt` picks from when neither threads nor JSPI are requested. */
const RELAXED_SIMD_SCRIPT = "litert_wasm_internal.js"
const COMPAT_SCRIPT = "litert_wasm_compat_internal.js"

let runtime: Promise<void> | undefined
let scratch: OffscreenCanvas | undefined

//

const absolute = (url: string) => new URL(url, self.location.href).href

const folderOf = (url: string) => (url.endsWith("/") ? url : `${url}/`)

/** Reads a script the way `importScripts` would, without leaving the worker. */
const readSync = (url: string) => {
	const request = new XMLHttpRequest()
	request.open("GET", url, false)
	request.send()
	if (request.status >= 400) throw new Error(`Failed to read ${url}. (${request.status})`)
	return request.responseText
}

/**
 * LiteRT hands its Emscripten glue to `importScripts`, which module workers
 * reject, and it then locates the `.wasm` next to the worker chunk instead of
 * the runtime folder. Shadow both so the glue runs in global scope the way a
 * classic worker would run it, and resolves its binary against the served folder.
 */
const bootstrap = async (wasmUrl: string) => {
	const folder = folderOf(wasmUrl)
	const relaxed = await supportsFeature("relaxedSimd")
	const script = absolute(`${folder}${relaxed ? RELAXED_SIMD_SCRIPT : COMPAT_SCRIPT}`)

	const response = await fetch(script)
	if (!response.ok) throw new Error(`Failed to load the LiteRT runtime. (${response.status})`)
	const source = await response.text()

	const evaluate = (source: string) => (0, eval)(source)

	// The runtime narrates itself on stderr, which Chrome renders as a stack
	// trace per line. Keep real failures loud and demote the rest to verbose.
	const report = (line: string) =>
		/\bERROR\b/.test(line) ? console.error(`[litert] ${line}`) : console.debug(`[litert] ${line}`)

	Object.assign(self, {
		Module: {
			locateFile: (name: string) => absolute(`${folder}${name}`),
			print: report,
			printErr: report,
		},
		importScripts: (...urls: string[]) => {
			for (const url of urls) {
				const resolved = absolute(url)
				evaluate(resolved === script ? source : readSync(resolved))
			}
		},
	})

	await loadLiteRt(folder)
}

/** Compiles on the requested accelerator, then retries on the CPU once. */
const compile = async (bytes: Uint8Array, accelerator: Accelerator) => {
	try {
		return { model: await loadAndCompile(bytes, { accelerator }), accelerator }
	} catch (error) {
		if (accelerator === "wasm") throw error
		console.warn(`LiteRT could not compile the model on ${accelerator}, falling back to wasm.`, error)
		return { model: await loadAndCompile(bytes, { accelerator: "wasm" }), accelerator: "wasm" as Accelerator }
	}
}

/** Derives the frame size and tensor layouts the model was exported with. */
const describe = (model: CompiledModel) => {
	const [input] = model.getInputDetails()
	const [output] = model.getOutputDetails()
	if (!input || !output) throw new Error("The plant model exposes no input or output tensor.")

	const inputShape = Array.from(input.shape)
	const layout: Layout = inputShape[1] === 3 ? "nchw" : "nhwc"
	const imageSize = (layout === "nchw" ? inputShape[2] : inputShape[1]) || 0
	if (imageSize <= 0) throw new Error(`Unsupported plant model input shape [${inputShape}].`)

	// YOLO detection heads emit [1, 4 + classes, anchors]; a few exports transpose it.
	const outputShape = Array.from(output.shape)
	const [, first = 0, second = 0] = outputShape
	const transposed = second < first
	const channelCount = transposed ? second : first
	const anchorCount = transposed ? first : second
	if (channelCount < 5) throw new Error(`Unsupported plant model output shape [${outputShape}].`)

	return { anchorCount, channelCount, imageSize, inputShape, layout, transposed }
}

//

const load = async (url: string, wasmUrl: string, accelerator?: Accelerator): Promise<PlantDetector> => {
	runtime ??= bootstrap(wasmUrl)
	await runtime

	const response = await fetch(url)
	if (!response.ok) throw new Error(`Failed to download the plant model. (${response.status})`)
	const bytes = new Uint8Array(await response.arrayBuffer())

	const preferred = accelerator ?? (isWebGPUSupported() ? "webgpu" : "wasm")
	const compiled = await compile(bytes, preferred)
	const { transposed, ...described } = describe(compiled.model)

	if (transposed) {
		compiled.model.delete()
		throw new Error("Transposed plant model outputs are not supported.")
	}

	return { ...described, accelerator: compiled.accelerator, model: compiled.model }
}

const warmup = async (detector: PlantDetector) => {
	const elements = detector.inputShape.reduce((total, size) => total * size, 1)
	await infer(detector, new Float32Array(elements))
}

/** Runs preprocessing, prediction, and postprocessing to get bounding boxes. */
const predict = async (
	detector: PlantDetector,
	image: CanvasImageSource,
	label: string,
	minIoU = 0.45,
	minScore = 0.25,
	maxBoxCount = 100
) => {
	const output = await infer(detector, preprocess(image, detector.imageSize, detector.layout))
	return postprocess(output, detector, label, minIoU, minScore, maxBoxCount)
}

const dispose = (detector: PlantDetector) => detector.model.delete()

const backend = (detector: PlantDetector) => detector.accelerator

//

/** Resizes to the model frame and normalizes into the model's channel order. */
const preprocess = (image: CanvasImageSource, imageSize: number, layout: Layout) => {
	scratch ??= new OffscreenCanvas(imageSize, imageSize)
	if (scratch.width !== imageSize || scratch.height !== imageSize) {
		scratch.width = imageSize
		scratch.height = imageSize
	}

	const context = scratch.getContext("2d", { willReadFrequently: true })
	if (!context) throw new Error("The plant frame could not be rasterized.")
	context.drawImage(image, 0, 0, imageSize, imageSize)

	const { data } = context.getImageData(0, 0, imageSize, imageSize)
	const pixels = imageSize * imageSize
	const input = new Float32Array(pixels * 3)

	if (layout === "nchw") {
		for (let index = 0, offset = 0; index < pixels; index++, offset += 4) {
			input[index] = (data[offset] || 0) / 255
			input[pixels + index] = (data[offset + 1] || 0) / 255
			input[pixels * 2 + index] = (data[offset + 2] || 0) / 255
		}
	} else {
		for (let index = 0, offset = 0; index < pixels; index++, offset += 4) {
			input[index * 3] = (data[offset] || 0) / 255
			input[index * 3 + 1] = (data[offset + 1] || 0) / 255
			input[index * 3 + 2] = (data[offset + 2] || 0) / 255
		}
	}

	return input
}

/** Feeds one frame through the interpreter and copies the output back to the CPU. */
const infer = async (detector: PlantDetector, input: Float32Array) => {
	const tensor = Tensor.fromTypedArray(input, detector.inputShape)

	let outputs: Tensor[]
	try {
		outputs = await detector.model.run([tensor])
	} finally {
		tensor.delete()
	}

	try {
		const [output] = outputs
		if (!output) throw new Error("The AI model returned no detection output.")
		return (await output.data()) as Float32Array
	} finally {
		for (const output of outputs) output.delete()
	}
}

/**
 * YOLO26 emits [1, 4 + classes, anchors] laid out channel first, where a box is
 * a normalized center point plus a size, and the score is already sigmoid scaled.
 */
const extract = (output: Float32Array, detector: PlantDetector, minScore: number) => {
	const { anchorCount, channelCount } = detector
	const candidates: Candidate[] = []

	for (let anchor = 0; anchor < anchorCount; anchor++) {
		let confidence = 0
		for (let channel = 4; channel < channelCount; channel++) {
			confidence = Math.max(confidence, output[channel * anchorCount + anchor] || 0)
		}
		if (confidence < minScore) continue

		const cx = output[anchor] || 0
		const cy = output[anchorCount + anchor] || 0
		const w = output[anchorCount * 2 + anchor] || 0
		const h = output[anchorCount * 3 + anchor] || 0
		if (w <= 0 || h <= 0) continue

		candidates.push({ x: cx - w / 2, y: cy - h / 2, w, h, confidence })
	}

	return candidates
}

const intersectionOverUnion = (a: Candidate, b: Candidate) => {
	const width = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
	const height = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
	if (width <= 0 || height <= 0) return 0

	const overlap = width * height
	return overlap / (a.w * a.h + b.w * b.h - overlap)
}

/** Filters boxes based on intersection-over-union, strongest confidence first. */
const nms = (candidates: Candidate[], minIoU: number, maxBoxCount: number) => {
	const kept: Candidate[] = []

	for (const candidate of [...candidates].sort((a, b) => b.confidence - a.confidence)) {
		if (kept.length >= maxBoxCount) break
		if (kept.some(box => intersectionOverUnion(box, candidate) > minIoU)) continue
		kept.push(candidate)
	}

	return kept
}

/** Builds normalized, frame-clipped detections out of the surviving boxes. */
const classify = (candidates: Candidate[], label: string, divisor: number): DetectionRawSchema[] => {
	const result: DetectionRawSchema[] = []

	for (const candidate of candidates) {
		const x = Math.min(1, Math.max(0, candidate.x / divisor))
		const y = Math.min(1, Math.max(0, candidate.y / divisor))
		const x2 = Math.min(1, Math.max(0, (candidate.x + candidate.w) / divisor))
		const y2 = Math.min(1, Math.max(0, (candidate.y + candidate.h) / divisor))
		const w = x2 - x
		const h = y2 - y
		if (w <= 0 || h <= 0) continue

		result.push({
			box: { x, y, w, h },
			class: label,
			confidence: Math.min(1, Math.max(0, candidate.confidence)),
		})
	}

	return result
}

/** Combines all postprocessing steps into usable detections. */
const postprocess = (
	output: Float32Array,
	detector: PlantDetector,
	label: string,
	minIoU = 0.45,
	minScore = 0.25,
	maxBoxCount = 100
) => {
	const candidates = extract(output, detector, minScore)

	// Exports without the normalize wrapper keep their boxes in input pixels instead.
	const extent = candidates.reduce((largest, box) => Math.max(largest, box.w, box.h), 0)
	const divisor = extent > 1.5 ? detector.imageSize : 1

	return classify(nms(candidates, minIoU, maxBoxCount), label, divisor)
}

//

export type { PlantDetector }

export default { backend, classify, describe, dispose, extract, load, nms, postprocess, predict, preprocess, warmup }
