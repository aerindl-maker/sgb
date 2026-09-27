<template>
	<v-layout class="pt-16">
		<v-main class="pt-0">
			<v-sheet class="w-100 d-flex justify-center">
				<v-sheet
					class="blob position-fixed top-0 mt-n16 rounded-circle"
					width="150dvw"
					height="max(120px, 10dvh)"
				></v-sheet>
			</v-sheet>
			<slot></slot>
		</v-main>
		<v-bottom-navigation
			v-if="inEsp"
			grow
			fixed
			mode="shift"
			color="accent"
			class="position-fixed bottom-0 left-0 text-grey-darken-1"
		>
			<v-btn to="/app/home" value="home">
				<v-icon>mdi-home</v-icon>
				<span>Home</span>
			</v-btn>
			<v-btn to="/app/graphs" value="graphs">
				<v-icon>mdi-chart-bar</v-icon>
				<span>Graphs</span>
			</v-btn>
			<v-btn to="/app/growth" value="growth">
				<v-icon>mdi-sprout</v-icon>
				<span>Growth</span>
			</v-btn>
			<v-btn to="/app/thresholds" value="thresholds">
				<v-icon>mdi-tune-vertical</v-icon>
				<span>Thresholds</span>
			</v-btn>
			<v-btn to="/app/settings" value="settings">
				<v-icon>mdi-cog</v-icon>
				<span>Settings</span>
			</v-btn>
		</v-bottom-navigation>
	</v-layout>
</template>

<script setup lang="ts">
import { useEspStore } from '@/stores/esp'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

//

// --- Router
const route = useRoute()
const router = useRouter()

// --- Esp
const espStore = useEspStore()
const { selectedId } = storeToRefs(espStore)

// --- The device list is the entry point, esp pages sit behind it
const inEsp = computed(() => selectedId.value !== undefined && route.name != "esps")

// --- A remembered esp may have been disabled or handed over since last visit
const onMountedCb = async () => {
	if (espStore.esps.length) return
	await espStore.getEsps().catch(() => undefined)
	if (selectedId.value === undefined && route.meta.esp) await router.replace("/app/esps")
}

onMounted(onMountedCb)

//

</script>

<style scoped>
.v-app-bar,
.blob {
	z-index: -1;
	background: #008a17;
	background: linear-gradient(270deg, rgb(var(--v-theme-accent)) 0%, rgb(var(--v-theme-secondary)) 100%);
}
</style>
