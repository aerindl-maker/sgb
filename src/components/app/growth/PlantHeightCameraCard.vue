<template>
	<v-card rounded="xl" elevation="1">
		<v-card-item>
			<template #prepend>
				<v-avatar color="secondary" class="text-accent">
					<v-icon icon="mdi-sprout"></v-icon>
				</v-avatar>
			</template>
			<template #title>Plant height capture</template>
			<template #subtitle>Frame the whole plant inside the square</template>
			<template #append>
				<v-chip
					size="small"
					:color="modelReady ? 'success' : modelLoading ? 'warning' : 'error'"
					:prepend-icon="modelReady ? 'mdi-check-circle' : modelLoading ? 'mdi-loading' : 'mdi-alert-circle'"
				>
					{{ modelReady ? "AI ready" : modelLoading ? "Loading AI" : "AI unavailable" }}
				</v-chip>
			</template>
		</v-card-item>

		<v-card-text>
			<v-select
				label="Camera"
				variant="outlined"
				density="comfortable"
				prepend-inner-icon="mdi-camera-outline"
				:items="cameras"
				:model-value="selectedCameraId"
				:loading="cameraLoading"
				:disabled="streamActive || cameraLoading"
				@update:model-value="onUpdateCamera"
			></v-select>

			<slot name="preview"></slot>

			<v-alert
				v-if="errorMessage"
				type="error"
				variant="tonal"
				density="compact"
				class="mt-3"
				:text="errorMessage"
			></v-alert>

			<v-sheet v-if="streamActive" color="transparent" class="mt-3 d-flex align-center justify-space-between">
				<span class="text-body-2 text-medium-emphasis">
					{{
						detectionCount
							? `${detectionCount} plant detection${detectionCount === 1 ? "" : "s"}`
							: "Looking for a plant…"
					}}
				</span>
				<v-chip
					v-if="heightPercent !== undefined"
					color="accent"
					variant="tonal"
					size="small"
					prepend-icon="mdi-arrow-expand-vertical"
				>
					{{ heightPercent.toFixed(1) }}% of frame
				</v-chip>
			</v-sheet>
		</v-card-text>

		<v-card-actions class="px-4 pb-4">
			<v-btn
				v-if="!streamActive"
				color="accent"
				variant="flat"
				prepend-icon="mdi-video"
				text="Start camera"
				:disabled="!modelReady || cameras.length === 0"
				@click="onStart"
			></v-btn>
			<v-btn
				v-else
				color="error"
				variant="tonal"
				prepend-icon="mdi-stop"
				text="Stop"
				:disabled="saving"
				@click="onStop"
			></v-btn>
			<v-spacer></v-spacer>
			<v-btn
				color="accent"
				variant="flat"
				prepend-icon="mdi-camera"
				text="Capture & save"
				:loading="saving"
				:disabled="!streamActive || detectionCount === 0 || !modelReady"
				@click="onCapture"
			></v-btn>
		</v-card-actions>
	</v-card>
</template>

<script setup lang="ts">
//

const props = defineProps<{
	cameras: { title: string; value: string }[]
	selectedCameraId?: string
	cameraLoading?: boolean
	streamActive?: boolean
	modelLoading?: boolean
	modelReady?: boolean
	saving?: boolean
	detectionCount: number
	heightPercent?: number
	errorMessage?: string
	onSelectCamera?: (cameraId?: string) => void
	onStart?: () => Promise<void> | void
	onStop?: () => Promise<void> | void
	onCapture?: () => Promise<void> | void
}>()

//

const onUpdateCamera = (value: unknown) => props.onSelectCamera?.(typeof value === "string" ? value : undefined)

//
</script>
