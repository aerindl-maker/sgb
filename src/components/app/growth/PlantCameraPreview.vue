<template>
	<div class="w-100 d-flex align-center justify-center">
		<div v-if="!src" class="d-flex flex-column align-center justify-center text-grey">
			<v-icon icon="mdi-camera-outline" size="32"></v-icon>
			<span class="mt-1 text-caption">No camera feed</span>
		</div>
		<video ref="videoElement" autoplay muted playsinline class="d-none"></video>
		<canvas v-show="src" ref="canvasElement" class="w-100" :width="size" :height="size"></canvas>
	</div>
</template>

<script setup lang="ts">
import type { DetectionRawSchema } from "@/schemas/DetectionSchema"
import { onMounted, onUnmounted, ref, watch } from "vue"

//

const props = withDefaults(
	defineProps<{
		src?: MediaStream
		detections: DetectionRawSchema[]
		size?: number
		boxColor?: string
		onFrame?: (canvas: HTMLCanvasElement) => Promise<void> | void
		onError?: (error: unknown) => void
	}>(),
	{
		size: 640,
		boxColor: "#4a8c6f",
		onFrame: undefined,
		onError: undefined,
	}
)

//

const canvasElement = ref<HTMLCanvasElement>()
const videoElement = ref<HTMLVideoElement>()

let animationFrame: number | undefined
let framePromise: Promise<void> | undefined
let running = false

//

const drawVideoFrame = () => {
	const canvas = canvasElement.value
	const video = videoElement.value
	const context = canvas?.getContext("2d")
	if (!canvas || !video || !context || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false

	const side = Math.min(video.videoWidth, video.videoHeight)
	const sourceX = (video.videoWidth - side) / 2
	const sourceY = (video.videoHeight - side) / 2
	context.clearRect(0, 0, canvas.width, canvas.height)
	context.drawImage(video, sourceX, sourceY, side, side, 0, 0, canvas.width, canvas.height)
	return true
}

const drawDetections = () => {
	const canvas = canvasElement.value
	const context = canvas?.getContext("2d")
	if (!canvas || !context) return

	context.lineWidth = Math.max(2, canvas.width / 240)
	context.strokeStyle = props.boxColor
	context.font = `600 ${Math.max(14, canvas.width / 32)}px sans-serif`
	context.textBaseline = "top"

	for (const detection of props.detections) {
		const x = detection.box.x * canvas.width
		const y = detection.box.y * canvas.height
		const width = detection.box.w * canvas.width
		const height = detection.box.h * canvas.height
		const label = `${(detection.box.h * 100).toFixed(1)}% of frame`
		const padding = Math.max(4, canvas.width / 160)
		const labelHeight = Math.max(20, canvas.width / 24)
		const labelWidth = context.measureText(label).width + padding * 2
		const labelY = Math.max(0, y - labelHeight)

		context.strokeRect(x, y, width, height)
		context.fillStyle = props.boxColor
		context.fillRect(x, labelY, labelWidth, labelHeight)
		context.fillStyle = "#ffffff"
		context.fillText(label, x + padding, labelY + padding / 2)
	}
}

const renderFrame = async () => {
	if (!drawVideoFrame() || !canvasElement.value) return

	// The boxes belong to the previous inference, but drawing them onto the fresh
	// frame keeps them visible for its whole lifetime. Drawing them after the
	// inference instead would leave them on screen for a single frame only.
	drawDetections()
	await props.onFrame?.(canvasElement.value)
}

const queueFrame = () => {
	if (!running || !props.src) return

	animationFrame = requestAnimationFrame(() => {
		framePromise = renderFrame()
			.catch(error => props.onError?.(error))
			.finally(queueFrame)
	})
}

const start = () => {
	if (running || !props.src) return
	running = true
	queueFrame()
}

const stop = async () => {
	running = false
	if (animationFrame !== undefined) cancelAnimationFrame(animationFrame)
	animationFrame = undefined
	await framePromise?.catch(() => undefined)
	framePromise = undefined
}

const restart = async () => {
	await stop()
	const video = videoElement.value
	const canvas = canvasElement.value
	if (!video || !canvas) return

	video.pause()
	video.srcObject = props.src || null
	if (!props.src) {
		canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height)
		return
	}

	if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
		await new Promise<void>((resolve, reject) => {
			video.onloadedmetadata = () => resolve()
			video.onerror = () => reject(new Error("The selected camera feed could not be opened."))
		})
	}

	await video.play()
	start()
}

const capture = async () => {
	running = false
	if (animationFrame !== undefined) cancelAnimationFrame(animationFrame)
	animationFrame = undefined
	await framePromise

	const canvas = canvasElement.value
	if (!canvas) throw new Error("The camera preview is not ready.")

	const image = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			blob => (blob ? resolve(blob) : reject(new Error("The camera frame could not be captured."))),
			"image/jpeg",
			0.92
		)
	})

	return { image, width: canvas.width, height: canvas.height }
}

const resume = () => start()

//

watch(() => props.src, restart)

onMounted(restart)
onUnmounted(stop)

defineExpose({ capture, resume })

//
</script>

<style scoped>
/* Plain display, not d-block: the helper is !important and would beat the inline display of v-show. */
canvas {
	display: block;
}
</style>
