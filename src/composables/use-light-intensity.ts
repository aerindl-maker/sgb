import { onMounted, onUnmounted, ref } from "vue"

//

export default () => {

	//

	const lightIntensity = ref({
		name: "Light Intensity",
		icon: "mdi-white-balance-sunny",
		unit: " lux",
		value: 480,
		createdAt: new Date(),
	})
	let interval: ReturnType<typeof setInterval> | undefined

	//

	const updateReading = () => {
		const elapsedSeconds = Date.now() / 1000
		const daylightTrend = Math.sin(elapsedSeconds / 18) * 180
		const smallVariation = (Math.random() - 0.5) * 36
		const targetValue = Math.max(80, Math.min(900, 480 + daylightTrend + smallVariation))
		const nextValue = lightIntensity.value.value + (targetValue - lightIntensity.value.value) * 0.35

		lightIntensity.value = {
			...lightIntensity.value,
			value: Math.round(nextValue),
			createdAt: new Date(),
		}
	}

	//

	onMounted(() => {
		interval = setInterval(updateReading, 1000)
	})

	onUnmounted(() => {
		if (interval) clearInterval(interval)
	})

	//

	return { lightIntensity }
}
