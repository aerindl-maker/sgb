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
                    <v-card-title class="font-weight-bold text-center">Sign In</v-card-title>
                    <v-card-subtitle class="text-center">Sign in to Dashboard</v-card-subtitle>
                    <v-card-text class="px-0">
                        <SignInForm 
                            class="mt-5"
                            @submit="onSubmitSignIn"
                        ></SignInForm>
                        <div class="w-100 text-center">
                            <small class="text-grey">Contact admin for an account.</small>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup lang="ts">
import type { UserSignInSchema } from '@/schemas/UserSchema';
import type { SubmissionContext } from 'vee-validate';
import { useRouter } from 'vue-router';
import SignInForm from '@/components/auth/SignInForm.vue';
import useToast from '@/composables/use-toast';
import { useAuthStore } from '@/stores/auth';
import { usePushStore } from '@/stores/push';

//

// --- Utils
const toastCmp = useToast()
const routerCmp = useRouter()

// --- Stores
const authStore = useAuthStore()
const pushStore = usePushStore()

//

const onSubmitSignIn = async (
    values: UserSignInSchema,
    ctx: SubmissionContext<{ [K in keyof UserSignInSchema]?: unknown }>
) => {
    await authStore.signIn(values)
        .then(() => toastCmp.success("User signed-in successfully."))
        .then(() => pushStore.connect())
        .then(async () => await routerCmp.push(authStore.user?.role == "Admin" ? "/admin/accounts" : "/app/esps"))
        .catch((e) => toastCmp.error(e?.status == 400 ? "Incorrect credentials provided." : "Something went wrong."))
}

//

</script>

<style scoped>
.blob {
    background: #008A17;
    background: linear-gradient(180deg, rgb(var(--v-theme-accent)) 0%, rgb(var(--v-theme-secondary)) 100%);
}
</style>