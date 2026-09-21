<template>
    <v-container id="printable">
        <v-row v-if="isPDFExporting" dense>
            <v-col cols="12" class="pt-5 d-flex flex-column align-center">
                <h3 class="font-weight-black">SGB Monitoring Report</h3>
                <span class="text-grey text-center">
                    <span>Reports from &nbsp;</span>
                    <span>{{ dateCmp.format(readingSorted[0]?.createdAt, "fullDateTime12h") }} to &nbsp;</span>
                    <span>
                        {{ dateCmp.format(readingSorted[readingSorted.length - 1]?.createdAt, "fullDateTime12h") }}.
                    </span>
                </span>
            </v-col>
        </v-row>
        <v-row v-if="!isPDFExporting" dense>
            <v-col cols="12" class="d-flex align-center justify-space-between">
                <h4 class="text-grey-darken-1">GRAPHS</h4>
                <v-btn
                    text="Export PDF"
                    color="accent"
                    prepend-icon="mdi-file"
                    :loading="isPDFExporting"
                    @click="onClickExportPDF"
                ></v-btn>
            </v-col>
        </v-row>
        <v-row dense>
            <v-col cols="12" lg="6">
                <v-card class="pt-4" elevation="1">
                    <template #prepend>
                        <v-icon color="blue">mdi-water</v-icon>
                    </template>
                    <template #title>
                        <span>Humidity</span>
                    </template>
                    <template #subtitle>
                        <span>24-hour monitoring</span>
                    </template>
                    <template #text>
                        <ReadingChart 
                            :color="themeCmp.current.value.colors.accent"
                            :readings="humidities"
                        ></ReadingChart>
                    </template>
                </v-card>
            </v-col>
            <v-col cols="12" lg="6">
                <v-card class="pt-4" elevation="1">
                    <template #prepend>
                        <v-icon color="red">mdi-thermometer</v-icon>
                    </template>
                    <template #title>
                        <span>Temperature & Humidity</span>
                    </template>
                    <template #subtitle>
                        <span>24-hour monitoring</span>
                    </template>
                    <template #text>
                        <ReadingChart 
                            :color="themeCmp.current.value.colors.accent"
                            :readings="temperatures"
                        ></ReadingChart>
                    </template>
                </v-card>
            </v-col>
            <v-col cols="12" lg="6">
                <v-card class="pt-4" elevation="1">
                    <template #prepend>
                        <v-icon color="blue">mdi-water-outline</v-icon>
                    </template>
                    <template #title>
                        <span>Soil Moisture</span>
                    </template>
                    <template #subtitle>
                        <span>24-hour monitoring</span>
                    </template>
                    <template #text>
                        <ReadingChart 
                            :color="themeCmp.current.value.colors.accent"
                            :readings="soilMoistures"
                        ></ReadingChart>
                    </template>
                </v-card>
            </v-col>
            <v-col cols="12" lg="6">
                <v-card class="pt-4" elevation="1">
                    <template #prepend>
                        <v-icon color="orange">mdi-white-balance-sunny</v-icon>
                    </template>
                    <template #title>
                        <span>Light</span>
                    </template>
                    <template #subtitle>
                        <span>24-hour monitoring</span>
                    </template>
                    <template #text>
                        <ReadingChart
                            :color="themeCmp.current.value.colors.accent"
                            :readings="lights"
                        ></ReadingChart>
                    </template>
                </v-card>
            </v-col>
            <v-col cols="12" lg="6">
                <v-card class="pt-4" elevation="1">
                    <template #prepend>
                        <v-icon color="green">mdi-sprout</v-icon>
                    </template>
                    <template #title>
                        <span>Height History</span>
                    </template>
                    <template #subtitle>
                        <span>Normalized plant height</span>
                    </template>
                    <template #text>
                        <v-skeleton-loader v-if="plantHeightCmp.loading.value" type="image"></v-skeleton-loader>
                        <v-empty-state
                            v-else-if="plantHeights.length === 0"
                            size="48"
                            icon="mdi-chart-line"
                            title="No height history yet"
                        ></v-empty-state>
                        <PlantHeightChart
                            v-else
                            :color="themeCmp.current.value.colors.accent"
                            :heights="plantHeights"
                        ></PlantHeightChart>
                    </template>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup lang="ts">
import useToast from '@/composables/use-toast';
import useFileSave from '@/composables/use-file-save';
import PlantHeightChart from '@/components/app/growth/PlantHeightChart.vue';
import ReadingChart from '@/components/app/monitor/ReadingChart.vue';
import usePlantHeight from '@/composables/use-plant-height';
import { useDate, useTheme } from 'vuetify';
import { useReadingStore } from '@/stores/reading';
import { computed, nextTick, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import useReport from '@/composables/use-report';

//

// --- Utils
const dateCmp = useDate()
const toastCmp = useToast()
const themeCmp = useTheme()

// --- Reading
const readingStore = useReadingStore()
const { readings, humidities, temperatures, soilMoistures, lights } = storeToRefs(readingStore)
const readingSorted = computed(() => [...readings.value].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()))

// --- Plant Height
const plantHeightCmp = usePlantHeight()
const { heights: plantHeights } = plantHeightCmp

// --- PDF Exporting
const reportCmp = useReport()
const fileSaveCmp = useFileSave()
const isPDFExporting = ref(false)

const onClickExportPDF = async () => {
    const el = document.getElementById("printable")
    if (!el) return

    isPDFExporting.value = true
    await nextTick()

    const pdf = await reportCmp.generatePDF(el)
    const base64 = pdf.output('datauristring').split(',')[1]!

    await fileSaveCmp.saveFile(base64, "pdf", `report-${Date.now()}.pdf`)
    isPDFExporting.value = false
}

//

const onMountedCb = async () => {
    await Promise.all([
        readingStore.getReadings().catch(() => toastCmp.error("Something went wrong.")),
        plantHeightCmp.list().catch(() => toastCmp.error("Something went wrong.")),
    ])
}

onMounted(onMountedCb)

//

</script>

<style scoped>

</style>