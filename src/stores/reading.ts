import { ReadingSchema } from "@/schemas/ReadingSchema";
import type { ReportFilterSchema, ReportQuerySchema } from "@/schemas/ReportSchema";
import { api } from "@/plugins/api";
import { defineStore } from "pinia";
import { computed, reactive } from "vue";

//

export const useReadingStore = defineStore("reading", () => {

    //

    const readings = reactive<ReadingSchema[]>([])
    const humidities = computed(() => readings.filter((r) => r.name.toLowerCase().startsWith("humidity")))
    const temperatures = computed(() => readings.filter((r) => r.name.toLowerCase().startsWith("temperature")))
    const soilMoistures = computed(() => readings.filter((r) => r.name.toLowerCase().startsWith("soil")))
    const lights = computed(() => readings.filter((r) => r.name.toLowerCase().startsWith("light")))

    //

    const getReadings = async () => {
        const res = await api.get<ReadingSchema[]>("/api/reading")
        readings.splice(0, readings.length)
        readings.push(...res.data.map((r) => ReadingSchema.parse(r)))
        return res.data
    }

    const queryReadings = async (name: string, query: ReportQuerySchema) => {
        const res = await api.get<ReadingSchema[]>("/api/reading", { params: { ...query, name } })
        return res.data.map((r) => ReadingSchema.parse(r))
    }

    const countReadings = async (name: string, filter: ReportFilterSchema) => {
        const params = { name, alpha: filter.alpha ?? undefined, omega: filter.omega ?? undefined }
        const res = await api.get<{ count: number }>("/api/reading/count", { params })
        return Number(res.data.count)
    }

    //

    return {
        readings,
        humidities,
        temperatures,
        soilMoistures,
        lights,
        getReadings,
        queryReadings,
        countReadings,
    }
})
