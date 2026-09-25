<template>
	<v-form
		class="d-flex flex-column align-center"
		@submit.prevent="onSubmit"
	>
		<v-select
			class="w-75"
			label="Format"
			v-model="format"
			:items="formats"
			:disabled="isSubmitting || disabled"
			:error-messages="formatError"
		></v-select>
		<div class="w-75 d-flex ga-2">
			<v-date-input
				clearable
				class="w-50"
				label="From"
				prepend-icon=""
				prepend-inner-icon="mdi-calendar"
				v-model="alpha"
				:max="omega ?? undefined"
				:disabled="isSubmitting || disabled"
				:error-messages="alphaError"
			></v-date-input>
			<v-date-input
				clearable
				class="w-50"
				label="To"
				prepend-icon=""
				prepend-inner-icon="mdi-calendar"
				v-model="omega"
				:min="alpha ?? undefined"
				:disabled="isSubmitting || disabled"
				:error-messages="omegaError"
			></v-date-input>
		</div>
		<v-select
			class="w-75"
			label="Order"
			v-model="order"
			:items="orders"
			:disabled="isSubmitting || disabled"
			:error-messages="orderError"
		></v-select>
		<div class="w-75 d-flex ga-2">
			<v-select
				class="w-50"
				label="Rows per page"
				v-model="limit"
				:items="ReportLimit"
				:disabled="isSubmitting || disabled"
				:error-messages="limitError"
			></v-select>
			<v-number-input
				inset
				class="w-50"
				label="Page"
				v-model="page"
				:min="1"
				:max="pages || undefined"
				:disabled="isSubmitting || disabled || !pages"
				:error-messages="pageError"
			></v-number-input>
		</div>
		<span class="w-75 my-2 text-caption text-grey">
			<span v-if="counting">Counting rows...</span>
			<span v-else-if="total == undefined">Row count unavailable.</span>
			<span v-else-if="total == 0">No rows match these filters.</span>
			<span v-else>
				Exports rows {{ first }}–{{ last }} of {{ total }} (page {{ page || 1 }} of {{ pages }}).
			</span>
		</span>
		<v-btn
			text="Export"
			type="submit"
			color="accent"
			class="w-75 my-2"
			:disabled="disabled || counting || total == 0"
			:loading="isSubmitting"
		></v-btn>
	</v-form>
</template>

<script setup lang="ts">
import {
	ReportExportSchema,
	ReportLimit,
	type ReportFilterSchema,
	type ReportFormat,
	type ReportOrder,
} from "@/schemas/ReportSchema"
import { toTypedSchema } from "@vee-validate/zod"
import { useField, useForm, type SubmissionContext } from "vee-validate"
import { computed, watch } from "vue"

//

const props = defineProps<{
	format: ReportFormat
	total?: number
	counting?: boolean
	disabled?: boolean
	onError?: (error: any) => any
	onFilter?: (filter: ReportFilterSchema) => any
	onSubmit?: (values: ReportExportSchema, ctx: SubmissionContext<{ [K in keyof ReportExportSchema]?: unknown }>) => any
}>()

//

const formats = [
	{ title: "CSV", value: "csv" },
	{ title: "XLSX (Excel)", value: "xlsx" },
]

const orders = [
	{ title: "Oldest first", value: "asc" },
	{ title: "Newest first", value: "desc" },
]

//

const PageSchema = ReportExportSchema.refine(
	({ page, limit }) => !props.total || page <= Math.ceil(props.total / limit),
	{ path: ["page"], message: "Page is past the last page." }
)

const { handleSubmit, isSubmitting } = useForm({
	validationSchema: toTypedSchema(PageSchema),
	initialValues: { format: props.format, order: "asc", limit: 100, page: 1 },
})

const { value: format, errorMessage: formatError } = useField<ReportFormat>("format")
const { value: alpha, errorMessage: alphaError } = useField<Date | null | undefined>("alpha")
const { value: omega, errorMessage: omegaError } = useField<Date | null | undefined>("omega")
const { value: order, errorMessage: orderError } = useField<ReportOrder>("order")
const { value: limit, errorMessage: limitError } = useField<ReportLimit>("limit")
const { value: page, errorMessage: pageError } = useField<number>("page")

// --- Pagination summary
const pages = computed(() => (props.total ? Math.ceil(props.total / (limit.value || 1)) : 0))
const first = computed(() => ((page.value || 1) - 1) * limit.value + 1)
const last = computed(() => Math.min((page.value || 1) * limit.value, props.total ?? 0))

//

// --- Changing the filters or page size moves the page window, so start over
const onChangeFilter = () => {
	page.value = 1
	props.onFilter && props.onFilter({ alpha: alpha.value, omega: omega.value })
}

watch([alpha, omega], onChangeFilter, { immediate: true })
watch(limit, () => (page.value = 1))

//

const onSubmit = handleSubmit(async (values, ctx) => {
	await Promise.resolve()
		.then(() => props.onSubmit && props.onSubmit(values, ctx))
		.catch(err => props.onError && props.onError(err))
})

//
</script>

<style scoped></style>
