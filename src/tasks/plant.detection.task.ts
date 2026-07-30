import { Buffer } from "buffer"
Object.assign(self, { Buffer })

//

import type { GraphModel } from "@tensorflow/tfjs"
import * as Comlink from "comlink"
import yoloPipelineSingleclass from "@/utils/yolo.pipeline.singleclass"

//

// --- Config
let model: GraphModel | undefined = undefined
let classLabel = ""
let imgsize = 256

// --- Functions
const load = async (url: string, imgsz: number, label: string) => {
	classLabel = label
	imgsize = imgsz

	const alpha = performance.now()
	model = await yoloPipelineSingleclass.load(url)
	const omega = performance.now()

	const backend = await yoloPipelineSingleclass.backend()
	console.info(`AI model loaded on ${backend} in ${(omega - alpha).toFixed(2)}ms.`)
}

const warmup = async () => {
	if (!model) throw new Error(`AI model not initialized yet.`)
	await yoloPipelineSingleclass.warmup(model, imgsize)
}

const predict = async (image: ImageBitmap, minIoU?: number, minScore?: number, maxBoxCount?: number) => {
	if (!model) throw new Error(`AI model not initialized yet.`)

	try {
		return await yoloPipelineSingleclass.predict(model, image, classLabel, imgsize, minIoU, minScore, maxBoxCount)
	} finally {
		image.close()
	}
}

const dispose = async () => {
	if (model) model.dispose()
	model = undefined
}

//

Comlink.expose({ load, warmup, predict, dispose })
