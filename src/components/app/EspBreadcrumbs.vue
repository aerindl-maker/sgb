<template>
    <v-breadcrumbs :items="crumbs" density="compact" class="pa-0 mb-1 text-caption">
        <template #prepend>
            <v-icon icon="mdi-chip" size="small" color="accent" class="mr-1"></v-icon>
        </template>
        <template #divider>
            <v-icon icon="mdi-chevron-right" size="small"></v-icon>
        </template>
    </v-breadcrumbs>
</template>

<script setup lang="ts">
import { useEspStore } from '@/stores/esp'
import { computed } from 'vue'

//

type Crumb = { title: string, to?: string }

const props = defineProps<{ items: Crumb[] }>()

// --- Esp
const espStore = useEspStore()

// --- The esp crumb leads back to the device list, the current page is never a link
const crumbs = computed(() => {
    const trail = [{ title: espStore.selected?.name ?? "My Devices", to: "/app/esps" }, ...props.items]
    return trail.map((c, i) => ({ ...c, disabled: i == trail.length - 1 }))
})

//

</script>
