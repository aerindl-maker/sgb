import { ReadingSchema } from "@/schemas/ReadingSchema";
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

    //

    return {
        readings,
        humidities,
        temperatures,
        soilMoistures,
        lights,
        getReadings,
    }
})
