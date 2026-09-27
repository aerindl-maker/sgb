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
                    <v-card-title class="font-weight-bold text-center">Forgot Password</v-card-title>
                    <v-card-subtitle class="text-center text-wrap">We will email you a code to reset it</v-card-subtitle>
                    <v-card-text class="px-0">
                        <ForgotPasswordForm
                            class="mt-5"
                            :email="routeCmp.query.email as string | undefined"
                            @submit="onSubmitForgot"
                        ></ForgotPasswordForm>
                        <div class="w-100 text-center">
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
import type { UserForgotPasswordSchema } from '@/schemas/UserSchema';
import { useRoute, useRouter } from 'vue-router';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm.vue';
import useToast from '@/composables/use-toast';
import { useAuthStore } from '@/stores/auth';

//

// --- Utils
const toastCmp = useToast()
const routeCmp = useRoute()
const routerCmp = useRouter()

// --- Stores
const authStore = useAuthStore()

//

const onSubmitForgot = async (values: UserForgotPasswordSchema) => {
    await authStore.forgotPassword(values)
        .then(() => toastCmp.success("If the email is registered, a code was sent to it."))
        .then(async () => await routerCmp.push({ path: "/auth/reset-password", query: { email: values.email } }))
        .catch((e) => toastCmp.error(e?.status == 502 ? "Failed to send the code, try again later." : "Something went wrong."))
}

//

</script>

<style scoped>
.blob {
    background: #008A17;
    background: linear-gradient(180deg, rgb(var(--v-theme-accent)) 0%, rgb(var(--v-theme-secondary)) 100%);
}
</style>
