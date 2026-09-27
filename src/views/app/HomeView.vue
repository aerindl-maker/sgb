<template>
    <v-container class="">
        <v-row dense>
            <v-col cols="12">
                <EspBreadcrumbs :items="[{ title: 'Dashboard' }]"></EspBreadcrumbs>
                <h4 class="text-grey-darken-1">DASHBOARD</h4>
            </v-col>
        </v-row>
        <v-row dense>
            <v-col cols="6" sm="6" lg="4">
                <ReadingCard
                    status="Optimal"
                    icon:color="red"
                    status:color="accent"
                    :icon="temperature ? temperature.icon : `mdi-thermometer`"
                    :unit="temperature ? temperature.unit : `C`"
                    :date="temperature ? temperature.createdAt : new Date()"
                    :title="temperature ? temperature.name : `Temperature`"
                    :value="temperature?.value || 0"
                ></ReadingCard>
            </v-col>
            <v-col cols="6" sm="6" lg="4">
                <ReadingCard
                    status="Good"
                    icon:color="blue"
                    status:color="accent"
                    :icon="humidity ? humidity.icon : `mdi-water`"
                    :unit="humidity ? humidity.unit : `%`"
                    :date="humidity ? humidity.createdAt : new Date()"
                    :title="humidity ? humidity.name : `Humidity`"
                    :value="humidity?.value || 0"
                ></ReadingCard>
            </v-col>
            <v-col cols="6" sm="6" lg="4">
                <ReadingCard
                    status="Normal"
                    icon:color="accent"
                    status:color="accent"
                    :icon="soilMoisture ? soilMoisture.icon : `mdi-water`"
                    :unit="soilMoisture ? soilMoisture.unit : `%`"
                    :date="soilMoisture ? soilMoisture.createdAt : new Date()"
                    :title="soilMoisture ? soilMoisture.name : `Humidity`"
                    :value="soilMoisture?.value || 0"
                ></ReadingCard>
            </v-col>
            <v-col cols="6" sm="6" lg="4">
                <ReadingCard
                    status="Good"
                    icon:color="orange"
                    status:color="accent"
                    :icon="light ? light.icon : `mdi-white-balance-sunny`"
                    :unit="light ? light.unit : `lux`"
                    :date="light ? light.createdAt : new Date()"
                    :title="light ? light.name : `Light`"
                    :value="light?.value || 0"
                ></ReadingCard>
            </v-col>
            <v-col cols="6" sm="6" lg="4">
                <ReadingCard
                    to="/app/errors"
                    icon="mdi-information-outline"
                    unit=""
                    title="Alerts"
                    icon:color="orange"
                    :status="alertCount ? `Review` : `Clear`"
                    :status:color="alertCount ? `orange` : `accent`"
                    :date="latestAlertAt"
                    :value="alertCount"
                ></ReadingCard>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup lang="ts">
import ReadingCard from '@/components/app/home/ReadingCard.vue';
import EspBreadcrumbs from '@/components/app/EspBreadcrumbs.vue';
import { useReadingStore } from '@/stores/reading';
import { useEspStore } from '@/stores/esp';
import { api } from '@/plugins/api';
import { FaultSchema } from '@/schemas/FaultSchema';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref } from 'vue';
import z from 'zod';

//

// --- Reading
const readingStore = useReadingStore()
const { temperatures, humidities, soilMoistures, lights } = storeToRefs(readingStore)

const temperature = computed(() => temperatures.value[temperatures.value.length - 1])
const humidity = computed(() => humidities.value[humidities.value.length - 1])
const soilMoisture = computed(() => soilMoistures.value[soilMoistures.value.length - 1])
const light = computed(() => lights.value[lights.value.length - 1])

// --- Alerts
const espStore = useEspStore()
const alertCount = ref(0)
const latestAlertAt = ref<Date>(new Date())

const getAlerts = async () => {
    const alpha = new Date()
    alpha.setHours(0, 0, 0, 0)
    const params = { espId: espStore.selectedId, alpha: alpha.toISOString(), limit: 100 }
    const res = await api.get<FaultSchema[]>("/api/fault", { params })
    const faults = z.array(FaultSchema).parse(res.data)
    alertCount.value = faults.length
    if (faults[0]) latestAlertAt.value = faults[0].createdAt
}

//

const onMountedCb = async () => {
    await Promise.all([readingStore.getReadings(), getAlerts()])
}

onMounted(onMountedCb)

//

</script>

<style scoped>
.v-enter-from,
.v-leave-to {
    opacity: 0;
}

.v-enter-active,
.v-leave-active {
    transition: opacity 1s ease-in-out;
}

.v-enter-to,
.v-leave-from {
    opacity: 1;
}
</style>
