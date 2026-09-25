<template>
	<v-menu location="bottom end">
		<template #activator="{ props: activator }">
			<v-btn
				v-bind="activator"
				size="small"
				icon="mdi-download"
				class="text-grey-darken-1 bg-transparent"
				:disabled
				:loading
			></v-btn>
		</template>
		<v-list density="compact">
			<v-list-subheader>Download report</v-list-subheader>
			<v-list-item
				title="CSV"
				prepend-icon="mdi-file-delimited"
				@click="props.onSelect && props.onSelect(`csv`)"
			></v-list-item>
			<v-list-item
				title="XLSX"
				prepend-icon="mdi-file-excel"
				@click="props.onSelect && props.onSelect(`xlsx`)"
			></v-list-item>
		</v-list>
	</v-menu>
</template>

<script setup lang="ts">
import type { ReportFormat } from "@/schemas/ReportSchema"

//

const props = defineProps<{
	loading?: boolean
	disabled?: boolean
	onSelect?: (format: ReportFormat) => any
}>()

//
</script>

<style scoped></style>
