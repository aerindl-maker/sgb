import type { DetectionRawSchema } from "@/schemas/DetectionSchema"
import * as tf from "@tensorflow/tfjs"
import "@tensorflow/tfjs-backend-wasm"
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm"

//

type PixelSource = Parameters<typeof tf.browser.fromPixels>[0]

//

const load = async (url: string) => {
	setWasmPaths("/tfjs/")

	const wasmMilliseconds = await bench("wasm")
	const webglMilliseconds = await bench("webgl")
	if (wasmMilliseconds < webglMilliseconds) await tf.setBackend("wasm")

	await tf.ready()
	return await tf.loadGraphModel(url)
}

const bench = async (backend: "webgl" | "wasm") => {
	try {
		const activated = await tf.setBackend(backend)
		if (!activated) return Number.POSITIVE_INFINITY
		await tf.ready()

		const input = tf.randomUniform([1, 256, 256, 3])
		for (let index = 0; index < 10; index++) tf.tidy(() => tf.sum(input).dataSync())

		const alpha = performance.now()
		tf.tidy(() => tf.sum(input).dataSync())
		const omega = performance.now()

		input.dispose()
		return omega - alpha
	} catch {
		return Number.POSITIVE_INFINITY
	}
}

const warmup = async (model: tf.GraphModel, imageSize: number) => {
	const dummy = tf.zeros([1, imageSize, imageSize, 3], "float32")
	const result = model.execute(dummy, "Identity")
	tf.dispose([dummy, result])
}

/** Runs preprocessing, prediction, and postprocessing to get bounding boxes. */
const predict = async (
	model: tf.GraphModel,
	image: PixelSource,
	label: string,
	imageSize: number,
	minIoU = 0.5,
	minScore = 0.4,
	maxBoxCount = 100
) => {
	const prediction = tf.tidy(() => {
		const imageTensor = preprocess(image, imageSize)
		const raw = model.execute(imageTensor, "Identity")
		const output = Array.isArray(raw) ? raw[0] : raw
		if (!output) throw new Error("The AI model returned no detection output.")
		return output
	})

	try {
		return await postprocess(prediction, label, imageSize, minIoU, minScore, maxBoxCount)
	} finally {
		prediction.dispose()
	}
}

const backend = async () => {
	await tf.ready()
	return tf.getBackend()
}

/** Resizes and normalizes an image. */
const preprocess = (image: PixelSource, imageSize: number) => {
	return tf.tidy(
		() =>
			tf.browser
				.fromPixels(image, 3)
				.toFloat()
				.div(255)
				.resizeBilinear([imageSize, imageSize])
				.expandDims(0) as tf.Tensor4D
	)
}

/** YOLO26 has a prediction vector of [x1, y1, x2, y2, confidence, class]. */
const extract = (vector: tf.Tensor2D) => {
	return tf.tidy(() => {
		const x1 = vector.slice([0, 0], [-1, 1]).squeeze() as tf.Tensor1D
		const y1 = vector.slice([0, 1], [-1, 1]).squeeze() as tf.Tensor1D
		const x2 = vector.slice([0, 2], [-1, 1]).squeeze() as tf.Tensor1D
		const y2 = vector.slice([0, 3], [-1, 1]).squeeze() as tf.Tensor1D
		const confidence = vector.slice([0, 4], [-1, 1]).squeeze() as tf.Tensor1D
		return [x1, y1, x2, y2, confidence] as const
	})
}

/** Filters boxes based on intersection-over-union and confidence. */
const nms = async (boxes: tf.Tensor2D, scores: tf.Tensor1D, minIoU: number, minScore: number, maxBoxCount: number) => {
	return await tf.image.nonMaxSuppressionAsync(boxes, scores, maxBoxCount, minIoU, minScore)
}

/** Uses NMS indices to build normalized, frame-clipped detections. */
const classify = (
	label: string,
	imageSize: number,
	indices: number[],
	boxes: number[][],
	scores: number[]
): DetectionRawSchema[] => {
	const result: DetectionRawSchema[] = []

	for (const index of indices) {
		const coordinates = boxes[index]
		if (!coordinates) continue
		const [rawX = 0, rawY = 0, rawWidth = 0, rawHeight = 0] = coordinates

		const x = Math.min(1, Math.max(0, rawX / imageSize))
		const y = Math.min(1, Math.max(0, rawY / imageSize))
		const x2 = Math.min(1, Math.max(0, (rawX + rawWidth) / imageSize))
		const y2 = Math.min(1, Math.max(0, (rawY + rawHeight) / imageSize))
		const w = x2 - x
		const h = y2 - y
		if (w <= 0 || h <= 0) continue

		result.push({
			box: { x, y, w, h },
			class: label,
			confidence: scores[index] || 0,
		})
	}

	return result
}

/** Combines all postprocessing steps into usable detections. */
const postprocess = async (
	prediction: tf.Tensor,
	label: string,
	imageSize: number,
	minIoU = 0.5,
	minScore = 0.4,
	maxBoxCount = 100
) => {
	const { boxes, cornerBoxes, confidence } = tf.tidy(() => {
		const raw = prediction.squeeze([0]) as tf.Tensor2D
		const [x1, y1, x2, y2, scores] = extract(raw)
		const width = x2.sub(x1)
		const height = y2.sub(y1)

		return {
			boxes: tf.stack([x1, y1, width, height], 1) as tf.Tensor2D,
			cornerBoxes: tf.stack([y1, x1, y2, x2], 1) as tf.Tensor2D,
			confidence: scores,
		}
	})

	const selectedIndices = await nms(cornerBoxes, confidence, minIoU, minScore, maxBoxCount)

	try {
		const [indicesArray, boxesArray, scoresArray] = await Promise.all([
			selectedIndices.array(),
			boxes.array(),
			confidence.array(),
		])
		return classify(label, imageSize, indicesArray, boxesArray, scoresArray)
	} finally {
		tf.dispose([selectedIndices, cornerBoxes, boxes, confidence])
	}
}

//

export default { backend, classify, extract, load, nms, postprocess, predict, preprocess, warmup }
