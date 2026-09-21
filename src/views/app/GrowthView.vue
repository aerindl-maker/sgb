<template>
	<v-container class="pb-16">
		<v-row dense justify="center">
			<v-col cols="12" md="8" lg="7">
				<div class="mb-3">
					<h3 class="font-weight-bold">Plant growth</h3>
					<p class="text-body-2 text-medium-emphasis">
						Capture the plant against the same camera position to build a comparable height history.
					</p>
				</div>

				<PlantHeightCameraCard
					:cameras="plantCameraOptions"
					:selected-camera-id="selectedPlantCameraId"
					:camera-loading="cameraLoading"
					:stream-active="plantCameraActive"
					:model-loading="plantDetectionLoading"
					:model-ready="plantDetectionReady"
					:saving="plantCaptureBusy"
					:detection-count="plantDetections.length"
					:height-percent="currentPlantHeightPercent"
					:error-message="plantDetectionError"
					:on-select-camera="onSelectPlantCamera"
					:on-start="onStartPlantCamera"
					:on-stop="onStopPlantCamera"
					:on-capture="onCapturePlantHeight"
				>
					<template #preview>
						<PlantCameraPreview
							ref="plantCameraPreview"
							:src="plantStream"
							:detections="plantDetections"
							:on-frame="onPlantCameraFrame"
							:on-error="onPlantPreviewError"
						></PlantCameraPreview>
					</template>
				</PlantHeightCameraCard>

				<v-card rounded="xl" elevation="1" class="mt-3">
					<v-card-item>
						<template #prepend>
							<v-avatar color="secondary" class="text-accent">
								<v-icon icon="mdi-chart-timeline-variant-shimmer"></v-icon>
							</v-avatar>
						</template>
						<template #title>Height history</template>
						<template #subtitle>Normalized plant height as a percentage of the frame</template>
						<template v-if="latestPlantHeight" #append>
							<v-chip color="accent" variant="tonal" size="small">
								Latest {{ latestPlantHeight.heightPercent.toFixed(1) }}%
							</v-chip>
						</template>
					</v-card-item>
					<v-card-text>
						<v-skeleton-loader v-if="plantHeightCmp.loading.value" type="image"></v-skeleton-loader>
						<v-empty-state
							v-else-if="plantHeights.length === 0"
							icon="mdi-chart-line"
							title="No height history yet"
							text="Start the camera and save a detected plant to add the first measurement."
						></v-empty-state>
						<PlantHeightChart v-else :heights="plantHeights"></PlantHeightChart>
					</v-card-text>
				</v-card>
			</v-col>
		</v-row>
		<v-dialog
			class="w-100 w-md-50 w-lg-33"
			location="center"
			v-model="showScanDialog"
			@after-leave="cameraCmp.terminate()"
		>
			<VideoScanCard
				:paused="freezeScanning"
				:uploading="freezeFrameUploading"
				:downloading="freezeFrameDownloading"
				:hide-bounding-box="!showDetectionBBox"
				@close="onCloseDialog"
				@pause="onClickPauseFrame"
				@upload="onClickUpload"
				@download="onClickDownload"
				@switch-camera="onSwitchCamera"
				@toggle-bounding-box="showDetectionBBox = !showDetectionBBox"
			>
				<VideoBoundingBoxRenderer
					class="mt-1 border rounded overflow-hidden d-flex align-center justify-center"
					:src="stream"
					:freeze="freezeScanning"
					:detections="detections"
					@frame="async c => onDrawCameraFrame(c).catch(console.error)"
					@freeze="async c => onFreezeCapture(c).catch(console.error)"
					@render="async c => onRenderDetectionFrame(c).catch(console.error)"
				></VideoBoundingBoxRenderer>
			</VideoScanCard>
		</v-dialog>
		<v-dialog class="w-100 w-md-50 w-lg-33" location="center" v-model="showUploadDialog">
			<ImageUploadCard @clear="onClearUploadDialog" @close="onCloseUploadDialog">
				<v-file-upload
					v-if="!fileUpload"
					rounded
					clearable
					show-size
					accept="image/*"
					v-model="fileUpload"
				></v-file-upload>
				<ImageBoundingBoxRenderer
					v-if="fileUpload"
					class="d-flex align-center justify-center"
					:src="fileUpload"
					:detections="uploadDetections"
					@draw="onDrawImageUpload"
				></ImageBoundingBoxRenderer>
			</ImageUploadCard>
		</v-dialog>
		<v-fab
			icon
			style="z-index: 9999"
			color="accent"
			class="position-fixed bottom-0 right-0 mb-16 mr-5"
			location="right bottom"
			transition="fade"
		>
			<v-icon>mdi-scan-helper</v-icon>
			<v-speed-dial activator="parent">
				<v-btn
					key="1"
					color="accent"
					icon="mdi-camera"
					:loading="cameraLoading || cldDetectionLoading"
					:disabled="cameraLoading || cldDetectionLoading"
					@click="onClickCamera"
				></v-btn>
				<v-btn
					key="1"
					color="accent"
					icon="mdi-image"
					:loading="cldUploadDetectionLoading"
					:disabled="cldUploadDetectionLoading"
					@click="onClickImage"
				></v-btn>
			</v-speed-dial>
		</v-fab>
	</v-container>
</template>

<script setup lang="ts">
import ImageBoundingBoxRenderer from "@/components/app/growth/ImageBoundingBoxRenderer.vue"
import PlantCameraPreview from "@/components/app/growth/PlantCameraPreview.vue"
import PlantHeightCameraCard from "@/components/app/growth/PlantHeightCameraCard.vue"
import PlantHeightChart from "@/components/app/growth/PlantHeightChart.vue"
import VideoBoundingBoxRenderer from "@/components/app/growth/VideoBoundingBoxRenderer.vue"
import VideoScanCard from "@/components/app/growth/VideoScanCard.vue"
import useCamera from "@/composables/use-camera"
import useCldDetection from "@/composables/use-cld-detection"
import useFileSave from "@/composables/use-file-save"
import usePlantDetection from "@/composables/use-plant-detection"
import usePlantHeight from "@/composables/use-plant-height"
import useToast from "@/composables/use-toast"
import { api } from "@/plugins/api"
import type { CaptureSchema } from "@/schemas/CaptureSchema"
import type { DetectionRawSchema } from "@/schemas/DetectionSchema"
import { PlantDetectionSchema } from "@/schemas/PlantHeightSchema"
import { useParameterStore } from "@/stores/parameter"
import { storeToRefs } from "pinia"
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue"

//

// --- Utils
const toastCmp = useToast()

// --- Parameters
const parameterStore = useParameterStore()
const { minIoU, minScore, maxBoxCount } = storeToRefs(parameterStore)

//

// --- Camera
const cameraCmp = useCamera()
const { stream, cameras } = cameraCmp
const cameraIndex = ref(0)
const cameraLoading = ref(false)

const onClickCamera = async () => {
	await onStopPlantCamera()
	if (!cldDetectionReady.value) await onMountedCldScanDetection()
	if (!cldDetectionReady.value) return

	showScanDialog.value = true
	cldDetectionBusy.value = false
	const cameraId = cameras.value[cameraIndex.value]?.deviceId
	await cameraCmp.begin(cameraId)
}

const onSwitchCamera = async () => {
	await cameraCmp.terminate()
	cameraIndex.value = (cameraIndex.value + 1) % cameras.value.length
	const cameraId = cameras.value[cameraIndex.value]?.deviceId
	await cameraCmp.begin(cameraId)
}

const onMountedCamera = async () => {
	cameraLoading.value = true
	await cameraCmp
		.list()
		.then(devices => {
			selectedPlantCameraId.value = devices[0]?.deviceId
			toastCmp.success("Camera initialized.")
		})
		.catch(e => toastCmp.error(e?.message || "Something went wrong."))
	cameraLoading.value = false
}

// --- Plant Height Camera
type PlantCameraPreviewRef = {
	capture: () => Promise<{ image: Blob; width: number; height: number }>
	resume: () => void
}

const plantCameraCmp = useCamera()
const { stream: plantStream } = plantCameraCmp
const plantCameraPreview = ref<PlantCameraPreviewRef>()
const selectedPlantCameraId = ref<string>()
const plantCameraSession = ref(0)
const plantCameraOptions = computed(() =>
	cameras.value.map((camera, index) => ({
		title: camera.label || `Camera ${index + 1}`,
		value: camera.deviceId,
	}))
)
const plantCameraActive = computed(() => !!plantStream.value)

const onSelectPlantCamera = (cameraId?: string) => {
	selectedPlantCameraId.value = cameraId
}

const onStartPlantCamera = async () => {
	await cameraCmp.terminate()
	showScanDialog.value = false
	plantCameraSession.value++
	plantDetections.value = []

	await plantCameraCmp
		.begin(selectedPlantCameraId.value, 720, 720)
		.catch(error => toastCmp.error(getErrorMessage(error)))
}

const onStopPlantCamera = async () => {
	plantCameraSession.value++
	await plantCameraCmp.terminate()
	plantDetections.value = []
}

// --- Plant Height Detection
const plantDetectionCmp = usePlantDetection()
const plantDetections = ref<DetectionRawSchema[]>([])
const plantDetectionLoading = ref(false)
const plantDetectionReady = ref(false)
const plantDetectionError = ref("")
const currentPlantHeightPercent = computed(() => {
	if (plantDetections.value.length === 0) return undefined
	return Math.max(...plantDetections.value.map(detection => detection.box.h * 100))
})

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong.")

const onPlantCameraFrame = async (canvas: HTMLCanvasElement) => {
	if (!plantDetectionReady.value) return

	const session = plantCameraSession.value
	const bitmap = await createImageBitmap(canvas)
	const detections = await plantDetectionCmp.predict(bitmap, minIoU.value, minScore.value, maxBoxCount.value)
	if (session !== plantCameraSession.value || !plantStream.value) return
	plantDetections.value = detections
}

const onPlantPreviewError = (error: unknown) => {
	if (plantDetectionError.value) return
	plantDetectionReady.value = false
	plantDetectionError.value = getErrorMessage(error)
	toastCmp.error(plantDetectionError.value)
}

const onMountedPlantDetection = async () => {
	const folder = import.meta.env.VITE_AI_PLANT_URL.replace(/\/+$/, "")
	const modelUrl = folder.endsWith(".tflite") ? folder : `${folder}/nano.tflite`

	plantDetectionLoading.value = true
	plantDetectionError.value = ""

	try {
		await plantDetectionCmp.load(modelUrl, "plant")
		await plantDetectionCmp.warmup()
		plantDetectionReady.value = true
	} catch (error) {
		plantDetectionError.value = getErrorMessage(error)
		toastCmp.error(`Plant detection model failed to load. ${plantDetectionError.value}`)
	} finally {
		plantDetectionLoading.value = false
	}
}

// --- Plant Height History
const plantHeightCmp = usePlantHeight()
const { heights: plantHeights } = plantHeightCmp
const plantCapturePreparing = ref(false)
const plantCaptureBusy = computed(() => plantCapturePreparing.value || plantHeightCmp.saving.value)
const latestPlantHeight = computed(() => plantHeights.value.at(-1))

const onCapturePlantHeight = async () => {
	if (plantCaptureBusy.value || !plantCameraPreview.value || plantDetections.value.length === 0) return
	plantCapturePreparing.value = true

	try {
		const frame = await plantCameraPreview.value.capture()
		const detections = PlantDetectionSchema.array().min(1).parse(plantDetections.value)
		await plantHeightCmp.capture({
			image: frame.image,
			detections,
			frameWidth: frame.width,
			frameHeight: frame.height,
		})
		toastCmp.success("Plant height captured and saved.")
	} catch (error) {
		toastCmp.error(getErrorMessage(error))
	} finally {
		plantCapturePreparing.value = false
		plantCameraPreview.value?.resume()
	}
}

const onMountedPlantHeights = async () => {
	await plantHeightCmp.list().catch(error => toastCmp.error(getErrorMessage(error)))
}

// --- Scan Dialog
const fileSaveCmp = useFileSave()
const showScanDialog = ref(false)
const freezeScanning = ref(false)
const scanDrawFrameBlob = ref<Blob>()
const scanRenderFrameBlob = ref<Blob>()
const freezeFrameUploading = ref(false)
const freezeFrameDownloading = ref(false)

const onCloseDialog = async () => {
	freezeScanning.value = false
	showScanDialog.value = false
	detections.value = []
}

const onClickUpload = async () => {
	if (!scanDrawFrameBlob.value) return
	const isFreeze = freezeScanning.value
	freezeScanning.value = true
	freezeFrameUploading.value = true

	const form = new FormData()
	form.append("object", "Leaf")
	form.append("image", scanDrawFrameBlob.value)
	const cres = await api.postForm<CaptureSchema>("/api/capture", form)
	await api.post(`/api/capture/${cres.data.id}/detection/bulk`, detections.value)

	freezeScanning.value = isFreeze
	freezeFrameUploading.value = false
}

const onClickDownload = async () => {
	const isFreeze = freezeScanning.value
	freezeScanning.value = true
	freezeFrameDownloading.value = true
	while (!scanRenderFrameBlob.value) await new Promise(res => setTimeout(res, 100))

	const reader = new FileReader()
	reader.readAsDataURL(scanRenderFrameBlob.value)
	await new Promise((res, rej) => ([reader.onloadend, reader.onerror] = [res, rej]))

	const base64 = reader.result!.toString().split(",")[1]!
	await fileSaveCmp.saveFile(base64, "image/jpeg", `sgb-scan-${Date.now()}.jpeg`)

	freezeScanning.value = isFreeze
	freezeFrameDownloading.value = false
}

const onFreezeCapture = async (canvas: HTMLCanvasElement) => {
	const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/jpeg", 1))
	if (blob) scanRenderFrameBlob.value = blob
}

const onClickPauseFrame = async () => {
	freezeScanning.value = !freezeScanning.value
}

// --- CLD Scan Detection
const detections = ref<DetectionRawSchema[]>([])
const cldDetectionCmp = useCldDetection()
const cldDetectionBusy = ref(false)
const showDetectionBBox = ref(true)
const cldDetectionLoading = ref(false)
const cldDetectionReady = ref(false)

const onDrawCameraFrame = async (canvas: HTMLCanvasElement) => {
	const blob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej())))
	scanDrawFrameBlob.value = blob

	if (cldDetectionBusy.value) return
	if (!showDetectionBBox.value) return

	cldDetectionBusy.value = true
	const bitmap = await createImageBitmap(canvas)
	const [iou, score, boxes] = [minIoU.value, minScore.value, maxBoxCount.value]
	detections.value = await cldDetectionCmp.predict(bitmap, iou, score, boxes)
	cldDetectionBusy.value = false
	bitmap.close()
}

const onRenderDetectionFrame = async (canvas: HTMLCanvasElement) => {
	const blob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej())))
	scanRenderFrameBlob.value = blob
}

const onMountedCldScanDetection = async () => {
	const { VITE_AI_CLD_URL, VITE_AI_CLD_CLASSES } = import.meta.env
	const [folder, classes] = [VITE_AI_CLD_URL, VITE_AI_CLD_CLASSES?.split(", ")]

	cldDetectionLoading.value = true
	await cldDetectionCmp
		.load(`${folder}/nano/model.json`, 256, classes)
		.then(() => cldDetectionCmp.warmup())
		.then(() => {
			cldDetectionReady.value = true
			toastCmp.success("Camera scan ai model loaded.")
		})
		.catch(async e => {
			await cldDetectionCmp.dispose().catch(() => undefined)
			toastCmp.error(e?.message || "Something went wrong.")
		})
	cldDetectionLoading.value = false
}

//

// --- Upload Dialog
const fileUpload = ref<File>()
const showUploadDialog = ref(false)

const onClickImage = async () => {
	if (!cldUploadDetectionReady.value) await onMountedCldUploadDetection()
	if (!cldUploadDetectionReady.value) return
	showUploadDialog.value = true
}

const onClearUploadDialog = () => {
	fileUpload.value = undefined
}

const onCloseUploadDialog = () => {
	showUploadDialog.value = false
	fileUpload.value = undefined
	uploadDetections.value = []
}

// --- CLD Upload Detection
const uploadDetections = ref<DetectionRawSchema[]>([])
const cldUploadDetectionCmp = useCldDetection()
const cldUploadDetectionLoading = ref(false)
const cldUploadDetectionReady = ref(false)

const onDrawImageUpload = async (canvas: HTMLCanvasElement) => {
	const bitmap = await createImageBitmap(canvas)
	const [iou, score, boxes] = [minIoU.value, minScore.value, maxBoxCount.value]
	uploadDetections.value = await cldUploadDetectionCmp.predict(bitmap, iou, score, boxes)

	const blob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej()), "image/jpeg", 1))
	console.info(URL.createObjectURL(blob))
	console.table(uploadDetections.value)

	bitmap.close()
}

const onMountedCldUploadDetection = async () => {
	const { VITE_AI_CLD_URL, VITE_AI_CLD_CLASSES } = import.meta.env
	const [folder, classes] = [VITE_AI_CLD_URL, VITE_AI_CLD_CLASSES?.split(", ")]

	cldUploadDetectionLoading.value = true
	await cldUploadDetectionCmp
		.load(`${folder}/large/model.json`, 640, classes)
		.then(() => cldUploadDetectionCmp.warmup())
		.then(() => {
			cldUploadDetectionReady.value = true
			toastCmp.success("Image upload ai model loaded.")
		})
		.catch(async e => {
			await cldUploadDetectionCmp.dispose().catch(() => undefined)
			toastCmp.error(e?.message || "Something went wrong.")
		})
	cldUploadDetectionLoading.value = false
}

//

const onMountedCb = async () => {
	await Promise.all([onMountedCamera(), onMountedPlantDetection(), onMountedPlantHeights()])
}

const onUnmountedCb = async () => {
	await Promise.allSettled([
		cameraCmp.terminate(),
		plantCameraCmp.terminate(),
		cldDetectionCmp.dispose(),
		cldUploadDetectionCmp.dispose(),
		plantDetectionCmp.dispose(),
	])
}

onMounted(onMountedCb)
onUnmounted(onUnmountedCb)

//
</script>
