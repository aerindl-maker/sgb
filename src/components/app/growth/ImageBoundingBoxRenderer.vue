<template>
	<div ref="divElement">
		<img
			ref="imageElement"
			style="aspect-ratio: 1; position: absolute; left: -9999px"
			:width="size.width"
			:height="size.height"
		/>
	</div>
</template>

<script setup lang="ts">
import type { DetectionRawSchema } from "@/schemas/DetectionSchema"
import * as PIXI from "pixi.js"
import { watch } from "vue"
import { onMounted, onUnmounted, reactive, ref } from "vue"

//

const props = defineProps<{
	src?: string | File | Blob | HTMLImageElement
	detections: DetectionRawSchema[]
	onDraw?: (canvas: HTMLCanvasElement) => any
	onRender?: (canvas: HTMLCanvasElement) => any
}>()

//

const divElement = ref<HTMLDivElement>()
const imageElement = ref<HTMLImageElement>()

let observer: ResizeObserver | undefined = undefined
const size = reactive({ width: 320, height: 320 })

let app: PIXI.Application<PIXI.Renderer> | undefined = undefined
let sprite: PIXI.Sprite | undefined = undefined
let texture: PIXI.Texture | undefined = undefined
let graphics: PIXI.Graphics[] = []
let labels: PIXI.Text[] = []

//

const init = async () => {
	app = new PIXI.Application()
	await app.init({
		width: size.width,
		height: size.height,
		backgroundAlpha: 0,
		antialias: true,
		preserveDrawingBuffer: true,
	})

	if (!divElement.value) return
	divElement.value.appendChild(app.canvas)

	observer = new ResizeObserver(onResize)
	observer.observe(divElement.value)

	await draw()
	await render()
}

const clean = async () => {
	observer?.disconnect()
	await dispose(graphics, labels)
	app?.destroy(true, { children: true })
}

const draw = async () => {
	if (!app || !imageElement.value || !props.src) return
	app.stage.removeChildren()

	if (typeof props.src === 'string') imageElement.value.src = props.src
	else if (props.src instanceof HTMLImageElement) imageElement.value.src = props.src.src
	else if (props.src instanceof File) imageElement.value.src = URL.createObjectURL(props.src)
	else if (props.src instanceof Blob) imageElement.value.src = URL.createObjectURL(props.src)
	await new Promise((res, rej) => [imageElement.value!.onload, imageElement.value!.onerror] = [res, rej])

	if (texture) texture.destroy()
	if (sprite) sprite.destroy()
	
	texture = PIXI.Texture.from(imageElement.value)
	sprite = new PIXI.Sprite(texture)
	sprite.width = app.screen.width
	sprite.height = app.screen.height

	app.stage.addChild(sprite)
	app.render()
	props.onDraw?.(app.canvas)
}

const render = async () => {
	if (!app || !texture || !texture.source || !props.src) return
	await dispose(graphics, labels)
	graphics = []
	labels = []
	
	if (!props.detections) return await props.onRender?.(app.canvas)
	for (const { box, class: label, confidence } of props.detections) {
		const x = box.x * size.width
		const y = box.y * size.height
		const w = box.w * size.width
		const h = box.h * size.height

		const g = new PIXI.Graphics()
		g.rect(x, y, w, h)
		g.stroke({ width: 2, color: 0xff0000, alpha: 1 })

		app.stage.addChild(g)
		graphics.push(g)

		const text = new PIXI.Text({
			text: `${label} ${(confidence * 100).toFixed(0)}%`,
			style: {
				fontSize: 11,
				fill: 0xffffff,
				fontWeight: 'bold',
			}
		})
		
		const padding = 2
		const labelWidth = text.width + padding * 2
		const labelHeight = text.height + padding * 2
		
		const bgX = x
		const bgY = y - labelHeight
		
		const bg = new PIXI.Graphics()
		bg.rect(bgX, bgY, labelWidth, labelHeight)
		bg.fill({ color: 0xff0000, alpha: 0.7 })
		
		text.x = bgX + padding
		text.y = bgY + padding
		
		app.stage.addChild(bg)
		app.stage.addChild(text)
		graphics.push(bg)
		labels.push(text)
	}

	await props.onRender?.(app.canvas)
}

const dispose = async (graphics: PIXI.Graphics[], labels: PIXI.Text[]) => {
	graphics.forEach(g => [app?.stage.removeChild(g), g.destroy()])
	labels.forEach(l => [app?.stage.removeChild(l), l.destroy()])
}

//

const onResize = async () => {
	if (!app || !divElement.value) return

    const { clientWidth, clientHeight } = divElement.value
	const min = Math.min(clientWidth, clientHeight)
    app.renderer.resize(min, min);
    [size.width, size.height] = [min, min]
	
	if (sprite) {
		sprite.width = min
		sprite.height = min
		await render()
	}
}

//

watch(() => props.src, draw, { immediate: true })
watch(() => props.detections, render, { deep: true })

//

onMounted(init)
onUnmounted(clean)

//
</script>

<style scoped></style>
