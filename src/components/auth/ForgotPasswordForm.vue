<template>
	<v-form class="d-flex flex-column align-center" @submit.prevent="onSubmit">
		<v-text-field
			type="email"
			color="accent"
			class="w-75"
			label="Email"
			v-model="email"
			:disabled="isSubmitting || disabled"
			:error-messages="emailError"
		></v-text-field>
		<v-btn
			type="submit"
			text="Send Code"
			class="w-75 my-2"
			color="accent"
			:disabled
			:loading="isSubmitting"
		></v-btn>
	</v-form>
</template>

<script setup lang="ts">
import { UserForgotPasswordSchema } from "@/schemas/UserSchema"
import { toTypedSchema } from "@vee-validate/zod"
import { useField, useForm, type SubmissionContext } from "vee-validate"

//

const props = defineProps<{
	email?: string
	disabled?: boolean
	onError?: (error: any) => any
	onSubmit?: (values: UserForgotPasswordSchema, ctx: SubmissionContext<{ [K in keyof UserForgotPasswordSchema]?: unknown }>) => any
}>()

const { handleSubmit, isSubmitting } = useForm({
	validationSchema: toTypedSchema(UserForgotPasswordSchema),
	initialValues: { email: props.email ?? "" },
})

const { value: email, errorMessage: emailError } = useField<string>("email")

//

const onSubmit = handleSubmit(async (values, ctx) => {
	await Promise.resolve()
		.then(() => props.onSubmit && props.onSubmit(values, ctx))
		.catch(err => props.onError && props.onError(err))
})

//
</script>

<style scoped></style>
