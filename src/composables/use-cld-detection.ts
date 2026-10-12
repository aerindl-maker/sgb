import type { Accelerator } from "@litertjs/core"
import type { DetectionRawSchema } from "@/schemas/DetectionSchema"
import CldDetectionWorker from "@/tasks/cld.detection.task.ts?worker"
import * as Comlink from "comlink"
import { ref, toRaw } from "vue"

//

type CldDetectionWorkerExpose = {
	load: (url: string, wasmUrl: string, classes: string[], accelerator?: Accelerator) => Promise<{ accelerator: Accelerator; imageSize: number }>
	warmup: () => Promise<void>
	dispose: () => Promise<void>
	predict: (image: ImageBitmap, minIoU?: number, minScore?: number, maxBoxCount?: number) => Promise<DetectionRawSchema[]>
}

//

export default () => {
	//

	const path = ref("")
	const wasm = ref("/litert/")
	const size = ref(0)
	const classes = ref<string[]>([])
	const loaded = ref(false)
	const accelerator = ref<Accelerator>()

	let model: Comlink.Remote<CldDetectionWorkerExpose> | undefined
	let worker: InstanceType<typeof CldDetectionWorker> | undefined

	//

	const dispose = async () => {
		try {
			if (model) await model.dispose()
		} finally {
			worker?.terminate()
			model = undefined
			worker = undefined
			loaded.value = false
			accelerator.value = undefined
			size.value = 0
		}
	}

	const load = async (url: string, labels: string[]) => {
		await dispose()
		path.value = url
		classes.value = labels
		worker = new CldDetectionWorker()
		model = Comlink.wrap<CldDetectionWorkerExpose>(worker)

		try {
			const details = await model.load(url, toRaw(wasm.value), toRaw(classes.value))
			accelerator.value = details.accelerator
			size.value = details.imageSize
			loaded.value = true
		} catch (error) {
			worker.terminate()
			worker = undefined
			model = undefined
			throw error
		}
	}

	const warmup = async () => {
		if (!model) throw new Error("AI model is not initialized yet.")
		await model.warmup()
	}

	const predict = async (image: ImageBitmap, minIoU = 0.9, minScore = 0.25, maxBoxCount = 100) => {
		if (!model) throw new Error("AI model is not initialized yet.")
		return await model.predict(Comlink.transfer(image, [image]), minIoU, minScore, maxBoxCount)
	}

	//

	return { accelerator, classes, loaded, path, size, wasm, dispose, load, predict, warmup }
}
