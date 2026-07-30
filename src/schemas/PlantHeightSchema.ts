import { CaptureSchema } from "@/schemas/CaptureSchema"
import { DetectionRawSchema } from "@/schemas/DetectionSchema"
import z from "zod"

//

const PlantBoundingBoxSchema = DetectionRawSchema.shape.box
	.extend({
		x: z.coerce.number().finite().min(0).max(1),
		y: z.coerce.number().finite().min(0).max(1),
		w: z.coerce.number().finite().positive().max(1),
		h: z.coerce.number().finite().positive().max(1),
	})
	.refine(box => box.x + box.w <= 1.000001 && box.y + box.h <= 1.000001, {
		message: "Bounding box must remain within the captured frame.",
	})

const PlantDetectionSchema = DetectionRawSchema.extend({
	box: PlantBoundingBoxSchema,
	class: z.literal("plant"),
	confidence: z.coerce.number().finite().min(0).max(1),
})

const PlantHeightSchema = z.object({
	id: z.coerce.number().int(),
	captureId: z.coerce.number().int(),
	detectionId: z.coerce.number().int(),
	box: PlantBoundingBoxSchema,
	frameWidth: z.coerce.number().int().positive(),
	frameHeight: z.coerce.number().int().positive(),
	pixelHeight: z.coerce.number().nonnegative(),
	heightPercent: z.coerce.number().min(0).max(100),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
})

const PlantSavedDetectionSchema = PlantDetectionSchema.extend({
	id: z.coerce.number().int(),
	captureId: z.coerce.number().int(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
})

const PlantCaptureResponseSchema = z.object({
	capture: CaptureSchema.extend({ object: z.literal("plant") }),
	detections: z.array(PlantSavedDetectionSchema),
	heights: z.array(PlantHeightSchema),
})

const PixelToCmRatioSchema = z.object({
	id: z.coerce.number().int(),
	pixels: z.coerce.number().positive(),
	centimeters: z.coerce.number().positive(),
	centimetersPerPixel: z.coerce.number().positive(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
})

//

type PlantDetectionSchema = z.infer<typeof PlantDetectionSchema>
type PlantHeightSchema = z.infer<typeof PlantHeightSchema>
type PlantSavedDetectionSchema = z.infer<typeof PlantSavedDetectionSchema>
type PlantCaptureResponseSchema = z.infer<typeof PlantCaptureResponseSchema>
type PixelToCmRatioSchema = z.infer<typeof PixelToCmRatioSchema>

//

export {
	PixelToCmRatioSchema,
	PlantCaptureResponseSchema,
	PlantDetectionSchema,
	PlantHeightSchema,
	PlantSavedDetectionSchema,
}
