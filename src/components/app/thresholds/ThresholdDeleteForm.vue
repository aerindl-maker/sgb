<template>
	<v-form 
        class="d-flex flex-column align-center" 
        @submit.prevent="onSubmit"
    >
		<v-text-field
			class="w-75"
			label="Reading"
			v-model="reading"
			:disabled="isSubmitting || disabled"
			:error-messages="readingError"
		></v-text-field>
		<v-btn 
            text="Delete"
			type="submit" 
			color="orange" 
			class="w-75 my-2" 
			:disabled
			:loading="isSubmitting"
		></v-btn>
	</v-form>
</template>

<script setup lang="ts">
import { ThresholdDeleteSchema } from "@/schemas/ThresholdSchema"
import { toTypedSchema } from "@vee-validate/zod"
import { useField, useForm, type SubmissionContext } from "vee-validate"

//

const props = defineProps<{
	disabled?: boolean
	threshold: ThresholdDeleteSchema
	onError?: (error: any) => any
	onSubmit?: (
		values: ThresholdDeleteSchema,
		ctx: SubmissionContext<{ [K in keyof ThresholdDeleteSchema]?: unknown }>
	) => any
}>()

//

const ConfirmSchema = ThresholdDeleteSchema.refine(
	({ reading }) => reading == props.threshold.reading,
	{ path: ["reading"], message: `Match threshold reading "${props.threshold.reading}".` }
)

const { handleSubmit, isSubmitting } = useForm({ validationSchema: toTypedSchema(ConfirmSchema) })
const { value: reading, errorMessage: readingError } = useField<string>("reading")

//

const onSubmit = handleSubmit(async (values, ctx) => {
	await Promise.resolve()
		.then(() => props.onSubmit && props.onSubmit(values, ctx))
		.catch(err => props.onError && props.onError(err))
})

//
</script>

<style scoped></style>
