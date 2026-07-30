import { api } from "@/plugins/api"
import { PlantCaptureResponseSchema, PlantDetectionSchema, PlantHeightSchema } from "@/schemas/PlantHeightSchema"
import { ref } from "vue"
import type { z } from "zod"

//

type PlantCaptureInput = {
	image: Blob
	detections: z.infer<typeof PlantDetectionSchema>[]
	frameWidth: number
	frameHeight: number
}

//

export default () => {
	//

	const heights = ref<PlantHeightSchema[]>([])
	const loading = ref(false)
	const saving = ref(false)

	//

	const list = async () => {
		loading.value = true

		try {
			const response = await api.get("/api/plant/heights", { params: { limit: 100 } })
			const data = PlantHeightSchema.array().parse(response.data)
			heights.value = data
			return data
		} finally {
			loading.value = false
		}
	}

	const capture = async (input: PlantCaptureInput) => {
		saving.value = true

		try {
			const detections = PlantDetectionSchema.array().min(1).parse(input.detections)
			const form = new FormData()
			form.append("image", input.image, `plant-${Date.now()}.jpg`)
			form.append("detections", JSON.stringify(detections))
			form.append("frameWidth", input.frameWidth.toString())
			form.append("frameHeight", input.frameHeight.toString())

			const response = await api.post("/api/plant/captures", form)
			const data = PlantCaptureResponseSchema.parse(response.data)
			heights.value = [...heights.value, ...data.heights].sort(
				(a, b) => a.createdAt.getTime() - b.createdAt.getTime()
			)
			return data
		} finally {
			saving.value = false
		}
	}

	//

	return { heights, loading, saving, capture, list }
}
