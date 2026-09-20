import type { DetectionRawSchema } from "@/schemas/DetectionSchema"
import PlantDetectionWorker from "@/tasks/plant.detection.task.ts?worker"
import * as Comlink from "comlink"
import { ref, toRaw } from "vue"

//

type PlantDetectionWorkerExpose = {
	load: (url: string, imageSize: number, label: string) => Promise<void>
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
	// CHANGED: hint only. The LiteRT pipeline reads the real input size from the model.
	const size = ref(320)
	const label = ref("plant")
	const loaded = ref(false)

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
		}
	}

	const load = async (url: string, imageSize = 320, classLabel = "plant") => {
		await dispose()

		path.value = url
		size.value = imageSize
		label.value = classLabel
		worker = new PlantDetectionWorker()
		model = Comlink.wrap<PlantDetectionWorkerExpose>(worker)

		try {
			await model.load(url, toRaw(size.value), toRaw(label.value))
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
		label,
		loaded,
		path,
		size,
		dispose,
		load,
		predict,
		warmup,
	}
}
