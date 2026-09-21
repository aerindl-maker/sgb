//

/**
 * Scene height the square camera frame is assumed to span while no pixel to
 * centimeter ratio has been measured yet. Estimating from the frame instead of
 * a fixed pixel scale keeps the fallback independent of the capture resolution.
 */
const DEFAULT_FRAME_CENTIMETERS = 60

//

/** Converts a bounding box height in frame pixels into an estimated centimeter value. */
const toCentimeters = (pixelHeight: number, frameHeight: number, centimetersPerPixel?: number) => {
	if (centimetersPerPixel && centimetersPerPixel > 0) return pixelHeight * centimetersPerPixel
	if (frameHeight <= 0) return 0
	return (pixelHeight / frameHeight) * DEFAULT_FRAME_CENTIMETERS
}

/** Converts a normalized bounding box height into an estimated centimeter value. */
const boxToCentimeters = (boxHeight: number, frameHeight: number, centimetersPerPixel?: number) =>
	toCentimeters(boxHeight * frameHeight, frameHeight, centimetersPerPixel)

const formatCentimeters = (centimeters: number) => `${centimeters.toFixed(1)} cm`

//

export { DEFAULT_FRAME_CENTIMETERS, boxToCentimeters, formatCentimeters, toCentimeters }
