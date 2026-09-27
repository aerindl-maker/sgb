<template>
    <v-container class="">
        <v-row dense>
            <v-col cols="12">
                <h4 class="text-grey-darken-1">Settings</h4>
            </v-col>
        </v-row>
        <v-row dense class="mt-2">
            <v-col cols="12">
                <h5 class="text-grey">Preferences</h5>
                <v-list 
                    rounded="lg"
                    density="compact"
                >
                    <v-list-item>
                        <template #prepend>
                            <v-icon>{{ themeFlag ? `mdi-weather-night` : `mdi-white-balance-sunny` }}</v-icon>
                        </template>
                        <template #default>
                            <div class="font-weight-bold">Dark Mode</div>
                        </template>
                        <template #append>
                            <v-switch
                                inset
                                hide-details
                                color="accent"
                                v-model="themeFlag"
                                @update:model-value="onChangeTheme"
                            ></v-switch>
                        </template>
                    </v-list-item>
                </v-list>
                <h5 class="mt-5 text-grey">Actions</h5>
                <v-list 
                    rounded="lg"
                    density="compact" 
                >
                    <v-list-item v-if="!isNative">
                        <template #prepend>
                            <v-icon color="accent">mdi-android</v-icon>
                        </template>
                        <template #default>
                            <div class="font-weight-bold">Download APK</div>
                        </template>
                        <template #append>
                            <v-btn
                                size="small"
                                icon="mdi-download"
                                color="accent"
                                :disabled="!appApkUrl"
                                @click="onClickDownloadApk"
                            ></v-btn>
                        </template>
                    </v-list-item>
                    <v-divider v-if="!isNative" class="my-2"></v-divider>
                    <v-list-item>
                        <v-btn
                            text="Logout"
                            color="red"
                            class="w-100"
                            prepend-icon="mdi-logout"
                            :loading="isSigningOut"
                            :disabled="isSigningOut"
                            @click="onClickSignOut"
                        ></v-btn>
                    </v-list-item>
                </v-list>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup lang="ts">
import useToast from '@/composables/use-toast'
import { ref } from 'vue'
import { useTheme } from 'vuetify'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

//

// --- Utils
const toastCmp = useToast()
const routerCmp = useRouter()

// --- App
const isNative = Capacitor.isNativePlatform()
const appApkUrl = import.meta.env.VITE_APP_ANDROID_URL

const onClickDownloadApk = async () => {
    window.location.href = appApkUrl
}

// --- Auth
const authStore = useAuthStore()
const isSigningOut = ref(false)

const onClickSignOut = async () => {
    isSigningOut.value = true
    await authStore
        .signOut()
        .then(() => toastCmp.success("User signed-out successfully."))
        .then(async () => await routerCmp.push("/auth/sign-in"))
        .catch((e) => toastCmp.error("Something went wrong."))
    isSigningOut.value = false
}

// --- Theme
const theme = useTheme()
const themeFlag = ref(localStorage.getItem("theme") == "dark")

const onChangeTheme = (v: unknown) => {
    const value = !!v ? "dark" : "light"
    theme.change(value)
    localStorage.setItem("theme", value)

    const native = Capacitor.isNativePlatform()
    if (native) StatusBar.setStyle({ style: value == "dark" ? Style.Dark : Style.Light })
}

//

</script>

<style scoped>

</style>