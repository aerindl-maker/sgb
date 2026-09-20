// CHANGED: the `buffer` polyfill only existed for tfjs and is no longer imported.
import yoloPipelineSingleclass from "@/utils/yolo.pipeline.singleclass"
import type { ModelLayout } from "@/utils/yolo.pipeline.singleclass"
import * as Comlink from "comlink"
import type { CompiledModel } from "@litertjs/core"

//

// --- Config
// CHANGED: a LiteRT `CompiledModel` replaces the tfjs `GraphModel`.
let model: CompiledModel | undefined = undefined
let layout: ModelLayout | undefined = undefined
let classLabel = ""

// --- Functions
/** CHANGED: `imgsz` is now only a fallback hint; the real size is read from the model. */
const load = async (url: string, imgsz: number, label: string) => {
	classLabel = label

	const alpha = performance.now()
	model = await yoloPipelineSingleclass.load(url)
	const omega = performance.now()

	// NEW: the export carries its own input and output shapes, so trust those over `imgsz`.
	layout = yoloPipelineSingleclass.describe(model)
	if (layout.imageSize !== imgsz) {
		console.warn(`AI model expects ${layout.imageSize}px input, not the requested ${imgsz}px.`)
	}

	const backend = await yoloPipelineSingleclass.backend()
	console.info(
		`AI model loaded on ${backend} in ${(omega - alpha).toFixed(2)}ms ` +
			`(${layout.imageSize}px, ${layout.channelsFirst ? "NCHW" : "NHWC"}, ${layout.boxCount} boxes, ` +
			`fully accelerated: ${model.isFullyAccelerated}).`
	)
}

const warmup = async () => {
	if (!model || !layout) throw new Error(`AI model not initialized yet.`)
	await yoloPipelineSingleclass.warmup(model, layout)
}

const predict = async (image: ImageBitmap, minIoU?: number, minScore?: number, maxBoxCount?: number) => {
	if (!model || !layout) throw new Error(`AI model not initialized yet.`)

	try {
		return await yoloPipelineSingleclass.predict(model, image, classLabel, layout, minIoU, minScore, maxBoxCount)
	} finally {
		image.close()
	}
}

const dispose = async () => {
	// CHANGED: LiteRT frees the compiled model with `delete()` instead of `dispose()`.
	if (model) model.delete()
	model = undefined
	layout = undefined
}

//

Comlink.expose({ load, warmup, predict, dispose })
