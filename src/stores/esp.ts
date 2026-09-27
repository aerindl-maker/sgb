import { api } from "@/plugins/api";
import { DEFAULT_ESP_ID, EspSchema, EspWithKeySchema, type EspCreateSchema, type EspUpdateSchema } from "@/schemas/EspSchema";
import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";
import z from "zod";

//

export const useEspStore = defineStore("esp", () => {

    //

    const esps = reactive<EspSchema[]>([])
    const selectedId = ref(DEFAULT_ESP_ID)
    const selected = computed(() => esps.find((e) => e.id == selectedId.value))
    const enableds = computed(() => esps.filter((e) => e.enabled))

    //

    const upsert = (esp: EspSchema) => {
        const index = esps.findIndex((e) => e.id == esp.id)
        if (index != -1) esps.splice(index, 1, esp)
        else esps.push(esp)
        return esp
    }

    const select = (id: number) => {
        selectedId.value = id
    }

    //

    const getEsps = async () => {
        const res = await api.get<EspSchema[]>("/api/esp")
        const parsed = z.array(EspSchema).parse(res.data)
        esps.splice(0, esps.length, ...parsed)

        // --- Fall back when the remembered esp was disabled
        const valid = parsed.some((e) => e.id == selectedId.value && e.enabled)
        if (!valid) selectedId.value = DEFAULT_ESP_ID
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
        const parsed = upsert(EspSchema.parse(res.data))
        if (!parsed.enabled && selectedId.value == id) selectedId.value = DEFAULT_ESP_ID
        return parsed
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
        getEsps,
        postEsp,
        patchEsp,
        regenerateKey,
    }
}, { persist: { pick: ["selectedId"] } })
