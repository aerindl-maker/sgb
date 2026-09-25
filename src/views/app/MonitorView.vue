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
                    <template v-if="!isPDFExporting" #append>
                        <ReportExportMenu
                            :loading="exportingReport == `humidity`"
                            :disabled="exportingReport != undefined"
                            @select="(format) => onSelectExport(`humidity`, format)"
                        ></ReportExportMenu>
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
                    <template v-if="!isPDFExporting" #append>
                        <ReportExportMenu
                            :loading="exportingReport == `temperature`"
                            :disabled="exportingReport != undefined"
                            @select="(format) => onSelectExport(`temperature`, format)"
                        ></ReportExportMenu>
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
                    <template v-if="!isPDFExporting" #append>
                        <ReportExportMenu
                            :loading="exportingReport == `soilMoisture`"
                            :disabled="exportingReport != undefined"
                            @select="(format) => onSelectExport(`soilMoisture`, format)"
                        ></ReportExportMenu>
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
                    <template v-if="!isPDFExporting" #append>
                        <ReportExportMenu
                            :loading="exportingReport == `light`"
                            :disabled="exportingReport != undefined"
                            @select="(format) => onSelectExport(`light`, format)"
                        ></ReportExportMenu>
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
                    <template v-if="!isPDFExporting" #append>
                        <ReportExportMenu
                            :loading="exportingReport == `height`"
                            :disabled="exportingReport != undefined"
                            @select="(format) => onSelectExport(`height`, format)"
                        ></ReportExportMenu>
                    </template>
                    <template #subtitle>
                        <span>Estimated plant height</span>
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
                            :centimeters-per-pixel="plantCentimetersPerPixel"
                        ></PlantHeightChart>
                    </template>
                </v-card>
            </v-col>
        </v-row>
        <v-dialog v-model="showExportDialog" max-width="500">
            <v-card class="py-5">
                <v-card-title class="text-center font-weight-bold">Export {{ exportTitle }}</v-card-title>
                <v-card-subtitle class="text-center">Filter and paginate the rows to download.</v-card-subtitle>
                <ReportExportForm
                    :key="exportFormKey"
                    :format="exportFormat"
                    :total="exportTotal"
                    :counting="isCountingExport"
                    :disabled="exportingReport != undefined"
                    @filter="onFilterExport"
                    @submit="onSubmitExport"
                ></ReportExportForm>
            </v-card>
        </v-dialog>
    </v-container>
</template>

<script setup lang="ts">
import useToast from '@/composables/use-toast';
import useFileSave from '@/composables/use-file-save';
import PlantHeightChart from '@/components/app/growth/PlantHeightChart.vue';
import ReadingChart from '@/components/app/monitor/ReadingChart.vue';
import ReportExportForm from '@/components/app/monitor/ReportExportForm.vue';
import ReportExportMenu from '@/components/app/monitor/ReportExportMenu.vue';
import usePlantHeight from '@/composables/use-plant-height';
import { useDate, useTheme } from 'vuetify';
import { useReadingStore } from '@/stores/reading';
import { computed, nextTick, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import useReport, { type ReportRow } from '@/composables/use-report';
import { toCentimeters } from '@/utils/plant-height';
import type { ReadingSchema } from '@/schemas/ReadingSchema';
import type { PlantHeightSchema } from '@/schemas/PlantHeightSchema';
import type { ReportExportSchema, ReportFilterSchema, ReportFormat, ReportQuerySchema } from '@/schemas/ReportSchema';

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
const { heights: plantHeights, centimetersPerPixel: plantCentimetersPerPixel } = plantHeightCmp

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

// --- Report Exporting
type ReportKey = "humidity" | "temperature" | "soilMoisture" | "light" | "height"
type Report = {
    title: string
    count: (filter: ReportFilterSchema) => Promise<number>
    rows: (query: ReportQuerySchema) => Promise<ReportRow[]>
}

const toReadingRow = (r: ReadingSchema): ReportRow => ({
    "ID": r.id,
    "Reading": r.name,
    "Value": r.value,
    "Unit": r.unit,
    "Recorded At": r.createdAt,
})

const toHeightRow = (h: PlantHeightSchema): ReportRow => ({
    "ID": h.id,
    "Capture ID": h.captureId,
    "Height (cm)": Number(toCentimeters(h.pixelHeight, h.frameHeight, plantCentimetersPerPixel.value).toFixed(1)),
    "Height (%)": h.heightPercent,
    "Pixel Height": h.pixelHeight,
    "Frame Height": h.frameHeight,
    "Recorded At": h.createdAt,
})

const readingReport = (title: string, name: string): Report => ({
    title,
    count: (filter) => readingStore.countReadings(name, filter),
    rows: async (query) => (await readingStore.queryReadings(name, query)).map(toReadingRow),
})

const reports: Record<ReportKey, Report> = {
    humidity: readingReport("Humidity", "Humidity"),
    temperature: readingReport("Temperature", "Temperature"),
    soilMoisture: readingReport("Soil Moisture", "Soil Moisture"),
    light: readingReport("Light", "Light"),
    height: {
        title: "Height History",
        count: (filter) => plantHeightCmp.count(filter),
        rows: async (query) => (await plantHeightCmp.query(query)).map(toHeightRow),
    },
}

const exportReport = ref<ReportKey>("humidity")
const exportFormat = ref<ReportFormat>("csv")
const exportFormKey = ref(0)
const exportTotal = ref<number>()
const exportingReport = ref<ReportKey>()
const isCountingExport = ref(false)
const showExportDialog = ref(false)
const exportTitle = computed(() => reports[exportReport.value].title)

// --- Date inputs pick whole days, so the end date covers until its last moment
const toExportFilter = (filter: ReportFilterSchema) => ({
    alpha: filter.alpha ? dateCmp.startOfDay(filter.alpha) as Date : undefined,
    omega: filter.omega ? dateCmp.endOfDay(filter.omega) as Date : undefined,
})

const onSelectExport = (key: ReportKey, format: ReportFormat) => {
    exportReport.value = key
    exportFormat.value = format
    exportTotal.value = undefined
    exportFormKey.value++
    showExportDialog.value = true
}

let countRequest = 0
const onFilterExport = async (filter: ReportFilterSchema) => {
    // --- Only the latest filter may update the total
    const request = ++countRequest
    isCountingExport.value = true

    const { res, err } = await reports[exportReport.value].count(toExportFilter(filter))
        .then((res) => ({ res, err: undefined }))
        .catch((err) => ({ res: undefined, err }))

    if (request != countRequest) return
    isCountingExport.value = false
    exportTotal.value = res

    if (err) toastCmp.error(err?.message || "Something went wrong.")
}

const onSubmitExport = async (values: ReportExportSchema) => {
    const key = exportReport.value
    const report = reports[key]
    exportingReport.value = key

    const query: ReportQuerySchema = {
        ...toExportFilter(values),
        order: values.order,
        limit: values.limit,
        offset: (values.page - 1) * values.limit,
    }

    const { res, err } = await report.rows(query)
        .then((rows) => reportCmp.generateReport(rows, values.format, report.title))
        .then(({ base64, mime, extension }) => {
            const name = report.title.toLowerCase().replace(/\s+/g, "-")
            return fileSaveCmp.saveFile(base64, mime, `${name}-report-p${values.page}-${Date.now()}.${extension}`)
        })
        .then((res) => ({ res, err: undefined }))
        .catch((err) => ({ res: undefined, err }))
        .finally(() => exportingReport.value = undefined)

    if (err) return toastCmp.error(err?.message || "Something went wrong.")
    toastCmp.success(`${report.title} report exported successfully.`)
    showExportDialog.value = false
}

//

const onMountedCb = async () => {
    await Promise.all([
        readingStore.getReadings().catch(() => toastCmp.error("Something went wrong.")),
        plantHeightCmp.list().catch(() => toastCmp.error("Something went wrong.")),
        // A missing calibration only falls the estimate back to the frame scale.
        plantHeightCmp.listRatios().catch(() => undefined),
    ])
}

onMounted(onMountedCb)

//

</script>

<style scoped>

</style>