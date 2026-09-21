<template>
	<v-sheet color="transparent" height="260">
		<Line :data="data" :options="options"></Line>
	</v-sheet>
</template>

<script setup lang="ts">
import type { PlantHeightSchema } from "@/schemas/PlantHeightSchema"
import { formatCentimeters, toCentimeters } from "@/utils/plant-height"
import type { ChartData, ChartOptions } from "chart.js"
import { computed } from "vue"
import { Line } from "vue-chartjs"

//

const props = withDefaults(
	defineProps<{ heights: PlantHeightSchema[]; color?: string; centimetersPerPixel?: number }>(),
	{ color: "#4a8c6f", centimetersPerPixel: undefined }
)

//

const data = computed<ChartData<"line">>(() => ({
	labels: props.heights.map(height =>
		height.createdAt.toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		})
	),
	datasets: [
		{
			data: props.heights.map(height =>
				toCentimeters(height.pixelHeight, height.frameHeight, props.centimetersPerPixel)
			),
			borderColor: props.color,
			backgroundColor: `${props.color}22`,
			fill: true,
			tension: 0.35,
			borderWidth: 2,
			pointRadius: props.heights.length > 30 ? 0 : 3,
			pointHoverRadius: 5,
		},
	],
}))

const options = computed<ChartOptions<"line">>(() => ({
	responsive: true,
	maintainAspectRatio: false,
	interaction: { intersect: false, mode: "index" },
	plugins: {
		legend: { display: false },
		tooltip: {
			callbacks: {
				label: context => `Height: ${formatCentimeters(Number(context.parsed.y))}`,
			},
		},
	},
	scales: {
		x: {
			grid: { display: false },
			border: { display: false },
			ticks: { color: "#888", maxTicksLimit: 6, maxRotation: 0 },
		},
		y: {
			beginAtZero: true,
			grid: { color: "rgba(128, 128, 128, 0.15)" },
			border: { display: false },
			ticks: {
				color: "#888",
				callback: value => `${value} cm`,
			},
		},
	},
}))

//
</script>
