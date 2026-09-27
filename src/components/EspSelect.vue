<template>
    <v-menu v-if="enableds.length > 1" location="bottom end">
        <template #activator="{ props }">
            <v-chip
                v-bind="props"
                color="white"
                variant="flat"
                class="text-grey-darken-3"
                append-icon="mdi-chevron-down"
            >
                <v-badge dot inline :color="selected?.online ? `accent` : `grey`" class="mr-2"></v-badge>
                <span>{{ selected?.name ?? "ESP" }}</span>
            </v-chip>
        </template>
        <v-list density="compact" rounded="lg">
            <v-list-item
                v-for="esp in enableds"
                :key="esp.id"
                :active="esp.id == selectedId"
                color="accent"
                @click="espStore.select(esp.id)"
            >
                <template #prepend>
                    <v-badge dot inline :color="esp.online ? `accent` : `grey`" class="mr-3"></v-badge>
                </template>
                <v-list-item-title>{{ esp.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ esp.online ? "Online" : "Offline" }}</v-list-item-subtitle>
            </v-list-item>
        </v-list>
    </v-menu>
</template>

<script setup lang="ts">
import { useEspStore } from '@/stores/esp'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'

//

// --- Esp
const espStore = useEspStore()
const { enableds, selected, selectedId } = storeToRefs(espStore)

//

// --- Hidden with a single esp, so a failed load changes nothing visible
onMounted(() => espStore.getEsps().catch(() => undefined))

//

</script>
