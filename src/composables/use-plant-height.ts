import { api } from "@/plugins/api"
import {
	PixelToCmRatioSchema,
	PlantCaptureResponseSchema,
	PlantDetectionSchema,
	PlantHeightSchema,
} from "@/schemas/PlantHeightSchema"
import { computed, ref } from "vue"
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
	const ratios = ref<PixelToCmRatioSchema[]>([])
	const loading = ref(false)
	const saving = ref(false)

	/** The most recent calibration wins, so a re-measure takes effect right away. */
	const centimetersPerPixel = computed(() => ratios.value[0]?.centimetersPerPixel)

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

	const listRatios = async () => {
		const response = await api.get("/api/plant/pixel-to-cm-ratios")
		const data = PixelToCmRatioSchema.array().parse(response.data)
		ratios.value = [...data].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
		return data
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

	return { centimetersPerPixel, heights, loading, ratios, saving, capture, list, listRatios }
}
