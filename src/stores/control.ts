import { ControlSchema, ControlUpdateSchema } from "@/schemas/ControlSchema";
import { api } from "@/plugins/api";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useEspStore } from "@/stores/esp";

//

export const useControlStore = defineStore("control", () => {

    //

    const espStore = useEspStore()
    const control = ref<ControlSchema>()
    const automation = computed(() => control.value?.automation ?? true)

    //

    const getControl = async () => {
        const res = await api.get<ControlSchema>("/api/control", { params: { espId: espStore.selectedId } })
        const parsed = ControlSchema.parse(res.data)
        control.value = parsed
        return parsed
    }

    const patchControl = async (data: ControlUpdateSchema) => {
        const res = await api.patch<ControlSchema>("/api/control", data, { params: { espId: espStore.selectedId } })
        const parsed = ControlSchema.parse(res.data)
        control.value = parsed
        return parsed
    }

    //

    return {
        control,
        automation,
        getControl,
        patchControl,
    }
})
