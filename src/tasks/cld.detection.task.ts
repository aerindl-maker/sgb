import type { Accelerator } from "@litertjs/core"
import * as Comlink from "comlink"
import litertPipeline from "@/utils/litert.pipeline.detect"
import type { Detector } from "@/utils/litert.pipeline.detect"

//

let detector: Detector | undefined
let labels: string[] = []

//

const load = async (url: string, wasmUrl: string, classes: string[], accelerator?: Accelerator) => {
	labels = classes
	detector = await litertPipeline.load(url, wasmUrl, accelerator)
	if (labels.length !== detector.channelCount - 4 || labels.some(label => !label.trim())) {
		litertPipeline.dispose(detector)
		detector = undefined
		throw new Error("CLD class labels must match the model's output classes.")
	}
	const backend = litertPipeline.backend(detector)
	console.info(`CLD model loaded on ${backend}.`)
	return { accelerator: backend, imageSize: detector.imageSize }
}

const warmup = async () => {
	if (!detector) throw new Error("AI model is not initialized yet.")
	await litertPipeline.warmup(detector)
}

const predict = async (image: ImageBitmap, minIoU?: number, minScore?: number, maxBoxCount?: number) => {
	if (!detector) throw new Error("AI model is not initialized yet.")
	try {
		return await litertPipeline.predict(detector, image, labels, minIoU, minScore, maxBoxCount)
	} finally {
		image.close()
	}
}

const dispose = async () => {
	if (detector) litertPipeline.dispose(detector)
	detector = undefined
	labels = []
}

//

Comlink.expose({ load, warmup, predict, dispose })
