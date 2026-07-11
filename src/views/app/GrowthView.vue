<template>
    <v-container class="">
        <v-row dense justify="center">
            <v-col cols="12" md="6" lg="4">
                <v-empty-state
                    icon="mdi-crane"
                    text="This feature is being worked on."
                    title="Comming Soon"
                ></v-empty-state>
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
                    @frame="async (c) => onDrawCameraFrame(c).catch(console.error)"
                    @freeze="async (c) => onFreezeCapture(c).catch(console.error)"
                    @render="async (c) => onRenderDetectionFrame(c).catch(console.error)"
                ></VideoBoundingBoxRenderer>
            </VideoScanCard>
        </v-dialog>
        <v-dialog 
            class="w-100 w-md-50 w-lg-33"
            location="center"
            v-model="showUploadDialog" 
        >
            <ImageUploadCard
                @clear="onClearUploadDialog"
                @close="onCloseUploadDialog"
            >
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
import useToast from '@/composables/use-toast';
import useCamera from '@/composables/use-camera';
import useFileSave from '@/composables/use-file-save';
import useCldDetection from '@/composables/use-cld-detection';
import ImageBoundingBoxRenderer from '@/components/app/growth/ImageBoundingBoxRenderer.vue';
import VideoBoundingBoxRenderer from '@/components/app/growth/VideoBoundingBoxRenderer.vue';
import { nextTick, onMounted, onUnmounted, reactive, ref } from 'vue';
import type { DetectionRawSchema } from '@/schemas/DetectionSchema';
import { useParameterStore } from '@/stores/parameter';
import { storeToRefs } from 'pinia';
import VideoScanCard from '@/components/app/growth/VideoScanCard.vue';
import { blob } from 'stream/consumers';
import { api } from '@/plugins/api';
import type { CaptureSchema } from '@/schemas/CaptureSchema';

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
    showScanDialog.value = true
    cldDetectionBusy.value = false
    const cameraId = cameras.value[cameraIndex.value]?.deviceId
    await cameraCmp.begin(cameraId)
}

const onSwitchCamera = async () => {
    await cameraCmp.terminate()
    cameraIndex.value = (cameraIndex.value + 1) % (cameras.value.length)
    const cameraId = cameras.value[cameraIndex.value]?.deviceId
    await cameraCmp.begin(cameraId)
}

const onMountedCamera = async () => {
    cameraLoading.value = true
    await cameraCmp
        .list()
        .then(() => toastCmp.success("Camera initialized."))
        .catch((e) => toastCmp.error(e?.message || "Something went wrong."))
    cameraLoading.value = false
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
    await new Promise((res, rej) => [reader.onloadend, reader.onerror] = [res, rej])

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

const onDrawCameraFrame = async (canvas: HTMLCanvasElement) => {
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => b ? res(b) : rej()))
    scanDrawFrameBlob.value = blob

    if (cldDetectionBusy.value) return;
    if (!showDetectionBBox.value) return;
    
    cldDetectionBusy.value = true
    const bitmap = await createImageBitmap(canvas)
    const [iou, score, boxes] = [minIoU.value, minScore.value, maxBoxCount.value]
    detections.value = await cldDetectionCmp.predict(bitmap, iou, score, boxes)
    cldDetectionBusy.value = false
    bitmap.close()
}

const onRenderDetectionFrame = async (canvas: HTMLCanvasElement) => {
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => b ? res(b) : rej()))
    scanRenderFrameBlob.value = blob
}

const onMountedCldScanDetection = async () => {
    const { VITE_AI_CLD_URL, VITE_AI_CLD_CLASSES } = import.meta.env
    const [folder, classes] = [VITE_AI_CLD_URL, VITE_AI_CLD_CLASSES?.split(", ")]

    cldDetectionLoading.value = true
    await cldDetectionCmp
        .load(`${folder}/nano/model.json`, 256, classes)
        .then(() => cldDetectionCmp.warmup())
        .then(() => toastCmp.success("Camera scan ai model loaded."))
        .catch((e) => toastCmp.error(e?.message || "Something went wrong."))
    cldDetectionLoading.value = false
}

//

// --- Upload Dialog
const fileUpload = ref<File>()
const showUploadDialog = ref(false)

const onClickImage = async () => {
    showUploadDialog.value = true
}

const onClearUploadDialog = () => {
    fileUpload.value = undefined
}

const onCloseUploadDialog = () => {
    showUploadDialog.value = false
    fileUpload.value = undefined
    detections.value = []
}

// --- CLD Upload Detection
const uploadDetections = ref<DetectionRawSchema[]>([])
const cldUploadDetectionCmp = useCldDetection()
const cldUploadDetectionLoading = ref(false)

const onDrawImageUpload = async (canvas: HTMLCanvasElement) => {
    const bitmap = await createImageBitmap(canvas)
    const [iou, score, boxes] = [minIoU.value, minScore.value, maxBoxCount.value]
    uploadDetections.value = await cldUploadDetectionCmp.predict(bitmap, iou, score, boxes)

    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => b ? res(b) : rej(), "image/jpeg", 1))
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
        .then(() => toastCmp.success("Image upload ai model loaded."))
        .catch((e) => toastCmp.error(e?.message || "Something went wrong."))
    cldUploadDetectionLoading.value = false
}

//

const onMountedCb = async () => {
    await Promise.all([onMountedCamera(), onMountedCldScanDetection(), onMountedCldUploadDetection()])
}

const onUnmountedCb = async () => {
    await Promise.all([cldDetectionCmp.dispose(), cldUploadDetectionCmp.dispose()])
}

onMounted(onMountedCb)
onUnmounted(onUnmountedCb)

//

</script>

<style scoped>

</style>
