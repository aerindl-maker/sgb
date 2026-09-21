import type { Accelerator } from "@litertjs/core"
import * as Comlink from "comlink"
import litertPipelinePlant from "@/utils/litert.pipeline.plant"
import type { PlantDetector } from "@/utils/litert.pipeline.plant"

//

// --- Config
let detector: PlantDetector | undefined = undefined
let classLabel = "plant"

// --- Functions
const load = async (url: string, wasmUrl: string, label: string, accelerator?: Accelerator) => {
	classLabel = label

	const alpha = performance.now()
	detector = await litertPipelinePlant.load(url, wasmUrl, accelerator)
	const omega = performance.now()

	const backend = litertPipelinePlant.backend(detector)
	console.info(`AI model loaded on ${backend} in ${(omega - alpha).toFixed(2)}ms.`)

	return { accelerator: backend, imageSize: detector.imageSize }
}

const warmup = async () => {
	if (!detector) throw new Error(`AI model not initialized yet.`)
	await litertPipelinePlant.warmup(detector)
}

const predict = async (image: ImageBitmap, minIoU?: number, minScore?: number, maxBoxCount?: number) => {
	if (!detector) throw new Error(`AI model not initialized yet.`)

	try {
		return await litertPipelinePlant.predict(detector, image, classLabel, minIoU, minScore, maxBoxCount)
	} finally {
		image.close()
	}
}

const dispose = async () => {
	if (detector) litertPipelinePlant.dispose(detector)
	detector = undefined
}

//

Comlink.expose({ load, warmup, predict, dispose })
