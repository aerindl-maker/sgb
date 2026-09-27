<template>
	<v-form 
        class="d-flex flex-column align-center" 
        @submit.prevent="onSubmit"
    >
		<div class="w-75 d-flex align-center">
			<v-select
				class="w-66"
				label="Icon"
				v-model="icon"
				:items="icons"
				:disabled="isSubmitting || disabled"
				:item-title="i => i.slice(4)"
				:item-value="i => i"
				:error-messages="iconError"
				:prepend-inner-icon="`${icon} text-${color}`"
			></v-select>
			<v-select
				class="w-33"
				label="Color"
				v-model="color"
				:items="[`accent`, `blue`, `red`, `orange`, `white`, `grey`, `black`]"
				:disabled="isSubmitting || disabled"
			></v-select>
		</div>
		<v-select
			class="w-75"
			label="Reading"
			v-model="reading"
            :items="readings"
			:disabled="isSubmitting || disabled"
			:error-messages="readingError"
		></v-select>
		<v-select
			class="w-75"
			label="Operator"
			v-model="operator"
            :items="ThresholdOp"
			:disabled="isSubmitting || disabled"
			:error-messages="operatorError"
		></v-select>
		<v-number-input
			inset
			class="w-75"
			label="Value"
			v-model="value"
			:precision="2"
			:disabled="isSubmitting || disabled"
			:error-messages="valueError"
		></v-number-input>
		<v-text-field
			class="w-75"
			label="Message"
			v-model="message"
			:disabled="isSubmitting || disabled"
			:error-messages="messageError"
		></v-text-field>
		<v-btn 
            text="Update"
			type="submit" 
			color="accent" 
			class="w-75 my-2" 
			:disabled
			:loading="isSubmitting"
		></v-btn>
	</v-form>
</template>

<script setup lang="ts">
import { ThresholdUpdateSchema, ThresholdOp } from "@/schemas/ThresholdSchema"
import { toTypedSchema } from "@vee-validate/zod"
import { useField, useForm, type SubmissionContext } from "vee-validate"
import { ref } from "vue"

//

const props = defineProps<{
	disabled?: boolean
	icons: string[]
	readings: string[]
	threshold: ThresholdUpdateSchema
	onError?: (error: any) => any
	onSubmit?: (
		values: ThresholdUpdateSchema,
		ctx: SubmissionContext<{ [K in keyof ThresholdUpdateSchema]?: unknown }>
	) => any
}>()

//

const { handleSubmit, isSubmitting } = useForm({
	initialValues: { ...props.threshold, icon: props.threshold.icon?.split(" ")[0] || "" },
	validationSchema: toTypedSchema(ThresholdUpdateSchema)
})

const color = ref("blue")
const { value: icon, errorMessage: iconError } = useField<string>("icon")
const { value: value, errorMessage: valueError } = useField<number>("value")
const { value: reading, errorMessage: readingError } = useField<string>("reading")
const { value: message, errorMessage: messageError } = useField<string>("message")
const { value: operator, errorMessage: operatorError } = useField<ThresholdOp>("operator")

//

const onSubmit = handleSubmit(async (values, ctx) => {
	const data = { ...values, icon: `${values.icon} text-${color.value}` }
	await Promise.resolve()
		.then(() => props.onSubmit && props.onSubmit(data, ctx))
		.catch(err => props.onError && props.onError(err))
})

//
</script>

<style scoped></style>
