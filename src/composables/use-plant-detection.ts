import type { DetectionRawSchema } from "@/schemas/DetectionSchema"
import PlantDetectionWorker from "@/tasks/plant.detection.task.ts?worker"
import type { Accelerator } from "@litertjs/core"
import * as Comlink from "comlink"
import { ref, toRaw } from "vue"

//

type PlantDetectionWorkerExpose = {
	load: (
		url: string,
		wasmUrl: string,
		label: string,
		accelerator?: Accelerator
	) => Promise<{ accelerator: Accelerator; imageSize: number }>
	warmup: () => Promise<void>
	dispose: () => Promise<void>
	predict: (
		image: ImageBitmap,
		minIoU?: number,
		minScore?: number,
		maxBoxCount?: number
	) => Promise<DetectionRawSchema[]>
}

//

export default () => {
	//

	const path = ref("")
	const wasm = ref("/litert/")
	const size = ref(0)
	const label = ref("plant")
	const loaded = ref(false)
	const accelerator = ref<Accelerator>()

	let model: Comlink.Remote<PlantDetectionWorkerExpose> | undefined
	let worker: InstanceType<typeof PlantDetectionWorker> | undefined

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

	const load = async (url: string, classLabel = "plant", wasmUrl = "/litert/") => {
		await dispose()

		path.value = url
		wasm.value = wasmUrl
		label.value = classLabel
		worker = new PlantDetectionWorker()
		model = Comlink.wrap<PlantDetectionWorkerExpose>(worker)

		try {
			// The frame size comes from the model itself, so exports can change freely.
			const details = await model.load(url, toRaw(wasm.value), toRaw(label.value))
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

	const predict = async (image: ImageBitmap, minIoU = 0.45, minScore = 0.25, maxBoxCount = 100) => {
		if (!model) throw new Error("AI model is not initialized yet.")
		return await model.predict(Comlink.transfer(image, [image]), minIoU, minScore, maxBoxCount)
	}

	//

	return {
		accelerator,
		label,
		loaded,
		path,
		size,
		wasm,
		dispose,
		load,
		predict,
		warmup,
	}
}
