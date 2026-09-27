import { api } from "@/plugins/api";
import { EspSchema, EspWithKeySchema, type EspCreateSchema, type EspUpdateSchema } from "@/schemas/EspSchema";
import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";
import z from "zod";

//

export const useEspStore = defineStore("esp", () => {

    //

    const esps = reactive<EspSchema[]>([])
    // --- Picked from the device list, every esp page reads it
    const selectedId = ref<number>()
    const selected = computed(() => esps.find((e) => e.id == selectedId.value))
    const enableds = computed(() => esps.filter((e) => e.enabled))

    //

    const upsert = (esp: EspSchema) => {
        const index = esps.findIndex((e) => e.id == esp.id)
        if (index != -1) esps.splice(index, 1, esp)
        else esps.push(esp)
        return esp
    }

    const select = (id?: number) => {
        selectedId.value = id
    }

    // --- Another account may sign in next on this device
    const clear = () => {
        esps.splice(0, esps.length)
        selectedId.value = undefined
    }

    //

    const getEsps = async () => {
        const res = await api.get<EspSchema[]>("/api/esp")
        const parsed = z.array(EspSchema).parse(res.data)
        esps.splice(0, esps.length, ...parsed)

        // --- Forget a remembered esp that's no longer owned
        const owned = parsed.some((e) => e.id == selectedId.value)
        if (!owned) selectedId.value = undefined
        return parsed
    }

    const postEsp = async (data: EspCreateSchema) => {
        const res = await api.post<EspWithKeySchema>("/api/esp", data)
        const parsed = EspWithKeySchema.parse(res.data)
        upsert(EspSchema.parse(parsed))
        return parsed
    }

    const patchEsp = async (id: number, data: EspUpdateSchema) => {
        const res = await api.patch<EspSchema>(`/api/esp/${id}`, data)
        return upsert(EspSchema.parse(res.data))
    }

    // --- Permanent, the server drops the esp with all of its history
    const deleteEsp = async (id: number) => {
        await api.delete(`/api/esp/${id}`)
        const index = esps.findIndex((e) => e.id == id)
        if (index != -1) esps.splice(index, 1)
        if (selectedId.value == id) selectedId.value = undefined
    }

    const regenerateKey = async (id: number) => {
        const res = await api.post<EspWithKeySchema>(`/api/esp/${id}/key`)
        const parsed = EspWithKeySchema.parse(res.data)
        upsert(EspSchema.parse(parsed))
        return parsed
    }

    //

    return {
        esps,
        selectedId,
        selected,
        enableds,
        upsert,
        select,
        clear,
        getEsps,
        postEsp,
        patchEsp,
        regenerateKey,
        deleteEsp,
    }
}, { persist: { pick: ["selectedId"] } })
