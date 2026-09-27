<template>
    <v-container fluid class="pt-16">
        <v-sheet class="d-flex justify-center">
            <v-sheet
                class="blob position-fixed top-0 mt-n10 rounded-circle"
                width="150dvw"
                height="max(120px, 10dvh)"
            ></v-sheet>
        </v-sheet>
        <v-row dense class="pt-16" justify="center">
            <v-col cols="12" md="6" lg="4" xl="3" xxl="2">
                <v-card
                    class="bg-primary"
                    elevation="0"
                >
                    <v-card-title class="font-weight-bold text-center">Reset Password</v-card-title>
                    <v-card-subtitle class="text-center text-wrap">Enter the code sent to your email</v-card-subtitle>
                    <v-card-text class="px-0">
                        <ResetPasswordForm
                            ref="formRef"
                            class="mt-5"
                            :email="routeCmp.query.email as string | undefined"
                            @submit="onSubmitReset"
                        ></ResetPasswordForm>
                        <div class="w-100 d-flex flex-column align-center ga-1">
                            <v-btn
                                variant="text"
                                size="small"
                                color="accent"
                                :disabled="cooldown > 0 || resending"
                                :loading="resending"
                                :text="cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'"
                                @click="onResend"
                            ></v-btn>
                            <router-link
                                to="/auth/sign-in"
                                class="text-caption text-accent text-decoration-none"
                            >Back to sign in</router-link>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup lang="ts">
import type { UserResetPasswordSchema } from '@/schemas/UserSchema';
import { UserForgotPasswordSchema } from '@/schemas/UserSchema';
import { useRoute, useRouter } from 'vue-router';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm.vue';
import useToast from '@/composables/use-toast';
import { useAuthStore } from '@/stores/auth';

//

// --- Utils
const toastCmp = useToast()
const routeCmp = useRoute()
const routerCmp = useRouter()

// --- Stores
const authStore = useAuthStore()

// --- Resend, matches the backend cooldown
const COOLDOWN = 60
const formRef = ref<InstanceType<typeof ResetPasswordForm>>()
const cooldown = ref(0)
const resending = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

//

const startCooldown = () => {
    cooldown.value = COOLDOWN
    clearInterval(timer)
    timer = setInterval(() => {
        if (--cooldown.value <= 0) clearInterval(timer)
    }, 1000)
}

const onResend = async () => {
    const parsed = UserForgotPasswordSchema.safeParse({ email: formRef.value?.email })
    if (!parsed.success) return toastCmp.error("Enter a valid email first.")

    resending.value = true
    await authStore.forgotPassword(parsed.data)
        .then(() => toastCmp.success("If the email is registered, a new code was sent to it."))
        .then(() => startCooldown())
        .catch((e) => toastCmp.error(e?.status == 502 ? "Failed to send the code, try again later." : "Something went wrong."))
        .finally(() => resending.value = false)
}

const onSubmitReset = async (values: UserResetPasswordSchema) => {
    await authStore.resetPassword(values)
        .then(() => toastCmp.success("Password reset successfully, kindly sign in."))
        .then(async () => await routerCmp.push("/auth/sign-in"))
        .catch((e) => toastCmp.error(e?.status == 400 ? "Invalid or expired code." : "Something went wrong."))
}

//

onMounted(() => routeCmp.query.email && startCooldown())
onBeforeUnmount(() => clearInterval(timer))

</script>

<style scoped>
.blob {
    background: #008A17;
    background: linear-gradient(180deg, rgb(var(--v-theme-accent)) 0%, rgb(var(--v-theme-secondary)) 100%);
}
</style>
