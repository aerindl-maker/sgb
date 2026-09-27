import { api } from "@/plugins/api";
import { ThresholdCreateSchema, ThresholdSchema, ThresholdUpdateSchema } from "@/schemas/ThresholdSchema";
import { defineStore } from "pinia";
import { reactive } from "vue";
import z from "zod";
import { useEspStore } from "@/stores/esp";

//

export const useThresholdStore = defineStore("threshold", () => {

    //

    const espStore = useEspStore()
    const thresholds = reactive<ThresholdSchema[]>([])

    //

    const getThresholds = async () => {
        const res = await api.get<ThresholdSchema[]>("/api/threshold", { params: { espId: espStore.selectedId } })
        const parsed = z.array(ThresholdSchema).parse(res.data)
        parsed.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        thresholds.splice(0, thresholds.length)
        thresholds.push(...parsed)
        return parsed
    }

    const postThreshold = async (data: ThresholdCreateSchema) => {
        const res = await api.post<ThresholdSchema>("/api/threshold", { ...data, espId: espStore.selectedId })
        const parsed = ThresholdSchema.parse(res.data)
        thresholds.push(parsed)
        return parsed
    }

    const patchThreshold = async (id: number, data: ThresholdUpdateSchema) => {
        const res = await api.patch<ThresholdSchema>(`/api/threshold/${id}`, data)
        const parsed = ThresholdSchema.parse(res.data)
        const index = thresholds.findIndex(u => u.id == id)
        if (index != -1) thresholds.splice(index, 1, parsed)
        return parsed
    }

    const deleteThreshold = async (id: number,) => {
        await api.delete<ThresholdSchema>(`/api/threshold/${id}`)
        const index = thresholds.findIndex(u => u.id == id)
        if (index != -1) thresholds.splice(index, 1)
    }

    //

    return {
        thresholds,
        getThresholds,
        postThreshold,
        patchThreshold,
        deleteThreshold,
    }
})
