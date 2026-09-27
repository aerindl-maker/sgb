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
		<div class="w-75 mt-3">
			<small class="text-grey">Code</small>
			<v-otp-input
				length="6"
				type="number"
				color="accent"
				variant="underlined"
				class="px-0"
				v-model="code"
				:disabled="isSubmitting || disabled"
				:error="!!codeError"
			></v-otp-input>
			<div v-if="codeError" class="text-caption text-error text-center">{{ codeError }}</div>
		</div>
		<v-text-field
			color="accent"
			class="w-75"
			label="New Password"
			v-model="password"
			:type="showPasswordType"
			:disabled="isSubmitting || disabled"
			:error-messages="passwordError"
			:append-inner-icon="showPasswordIcon"
			@click:append-inner="showPassword = !showPassword"
		></v-text-field>
		<v-text-field
			color="accent"
			class="w-75"
			label="Confirm Password"
			v-model="confirm"
			:type="showPasswordType"
			:disabled="isSubmitting || disabled"
			:error-messages="confirmError"
		></v-text-field>
		<v-btn
			type="submit"
			text="Reset Password"
			class="w-75 my-2"
			color="accent"
			:disabled
			:loading="isSubmitting"
		></v-btn>
	</v-form>
</template>

<script setup lang="ts">
import { UserResetPasswordSchema } from "@/schemas/UserSchema"
import { toTypedSchema } from "@vee-validate/zod"
import { useField, useForm, type SubmissionContext } from "vee-validate"
import { computed, ref } from "vue"

//

const props = defineProps<{
	email?: string
	disabled?: boolean
	onError?: (error: any) => any
	onSubmit?: (values: UserResetPasswordSchema, ctx: SubmissionContext<{ [K in keyof UserResetPasswordSchema]?: unknown }>) => any
}>()

const { handleSubmit, isSubmitting } = useForm({
	validationSchema: toTypedSchema(UserResetPasswordSchema),
	initialValues: { email: props.email ?? "", code: "" },
})

const { value: email, errorMessage: emailError } = useField<string>("email")
const { value: code, errorMessage: codeError } = useField<string>("code")
const { value: password, errorMessage: passwordError } = useField<string>("password")
const { value: confirm, errorMessage: confirmError } = useField<string>("confirm")

const showPassword = ref(false)
const showPasswordType = computed(() => (showPassword.value ? "text" : "password"))
const showPasswordIcon = computed(() => (showPassword.value ? "mdi-eye-off" : "mdi-eye"))

//

// --- The view reads it to resend the code
defineExpose({ email })

const onSubmit = handleSubmit(async (values, ctx) => {
	await Promise.resolve()
		.then(() => props.onSubmit && props.onSubmit(values, ctx))
		.catch(err => props.onError && props.onError(err))
})

//
</script>

<style scoped></style>
