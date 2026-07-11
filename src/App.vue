<template>
	<v-app class="bg-primary">
		<v-progress-linear
			v-if="busy && !alive"
			indeterminate
			color="red"
			class="position-fixed top-0 left-0"
			style="z-index: 1000"
		></v-progress-linear>
		<v-progress-linear
			v-if="isRouting"
			indeterminate
			color="accent"
			class="position-fixed top-0 left-0"
			style="z-index: 999"
		></v-progress-linear>
		<router-view #="{ Component, route }">
			<component :is="layouts[route.meta?.layout as string] || layouts.default">
				<component :is="Component" />
			</component>
		</router-view>
		<ToastQueue
			closable
			class="position-fixed top-0 left-0"
			msg-class="position-fixed top-0 left-0 mt-11 ml-n1 bg-secondary"
			v-model="messages"
		></ToastQueue>
		<UpdateDialog
			v-if="Capacitor.isNativePlatform()"
			:version
			:mismatch
			:persistent="version.required"
			:hide-cancel="version.required"
        	v-model="versionDialog"
			@cancel="onVersionCancel"
			@update="onUpdateClicked"
		></UpdateDialog>
	</v-app>
</template>

<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue'
import AuthLayout from './layouts/AuthLayout.vue'
import HomeLayout from './layouts/HomeLayout.vue'
import ToastQueue from '@/components/ToastQueue.vue'
import UpdateDialog from './components/UpdateDialog.vue'
import useToast from '@/composables/use-toast'
import { useTheme } from 'vuetify'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { useAuthStore } from './stores/auth'
import { usePushStore } from './stores/push'
import { onMounted, reactive, ref, watch, type Component } from 'vue'
import { useRouter } from 'vue-router'
import useWebsocket from './composables/use-websocket'
import { useReadingStore } from './stores/reading'
import { ReadingSchema } from './schemas/ReadingSchema'
import AdminLayout from './layouts/AdminLayout.vue'
import { PushNotifications, type PushNotificationSchema } from '@capacitor/push-notifications'
import { useServerStore } from './stores/server'
import { storeToRefs } from 'pinia'
import z from 'zod'
import { useVersionStore } from './stores/version'
import type { VersionSchema } from './schemas/Version.Schema'
import { AppLauncher } from '@capacitor/app-launcher'

//

// --- Utils
const toastCmp = useToast()
const themeCmp = useTheme()
const authStore = useAuthStore()
const pushStore = usePushStore()
const { messages } = toastCmp

// --- Layouts
const layouts: Record<string, Component> = {
	"app": AppLayout,
	"auth": AuthLayout,
	"home": HomeLayout,
	"admin": AdminLayout,
	"default": HomeLayout,
}

// --- Server
const serverStore = useServerStore()
const { busy, alive } = storeToRefs(serverStore)
watch(alive, nv => toastCmp.show(`${nv ? "C" : "Disc"}onnected to server.`, nv ? "green" : "red"))

// --- Router
const routerCmp = useRouter()
const isRouting = ref(false)

// --- Reading
const websocketCmp = useWebsocket()
const readingStore = useReadingStore()

const onWsReading = (data: ReadingSchema[]) => {
	const parsed = z.array(ReadingSchema).parse(data)
	readingStore.readings.push(...parsed)
}

// --- Push Notifications
const onReceivedPushNotification = (notification: PushNotificationSchema) => {
	if (!notification.title || !notification.body) return
	toastCmp.info(notification.title)
}

// --- Version
const versionStore = useVersionStore()
const { version, mismatch } = storeToRefs(versionStore)
const versionDialog = ref(mismatch.value)

const onVersionCancel = async () => {
	versionDialog.value = false
}

const onUpdateClicked = async (v: VersionSchema) => {
	const native = Capacitor.isNativePlatform()
	if (!native) return window.open(version.value.url, "_blank", "noopener,noreferrer")
	const result = await AppLauncher.openUrl({ url: version.value.url })
	if (!result.completed) toastCmp.error("Unable to open update's URL.")
}

//

const onMountedCb = async () => {
	// --- Theme
	const savedTheme = localStorage.getItem("theme") ?? "system"
	themeCmp.change(savedTheme)

	// --- Reading
	websocketCmp.connect(`${import.meta.env.VITE_API_URL}/ws/app`)
	websocketCmp.subscribe("Reading", "Create", onWsReading)

	// --- Status Bar
	const native = Capacitor.isNativePlatform()
	if (native) StatusBar.setBackgroundColor({ color: "#00000000" })
	if (native) StatusBar.setOverlaysWebView({ overlay: true })
	if (native) StatusBar.setStyle({ style: savedTheme == "dark" ? Style.Dark : Style.Light })

	// --- Server
	await serverStore.connect(import.meta.env.VITE_API_URL)

	// --- Version
	await versionStore.get()

	// --- Route Loader
	routerCmp.beforeEach(() => isRouting.value = true)
	routerCmp.afterEach(() => isRouting.value = false)

	// --- Push Notifications
	if (authStore.user) await pushStore.connect()
	if (native) PushNotifications.addListener("pushNotificationReceived", onReceivedPushNotification)
}

onMounted(onMountedCb)

//

</script>

<style>
* {
	font-family: 'DM Sans', sans-serif !important;
}
</style>
