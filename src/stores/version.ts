import { api } from "@/plugins/api";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { VersionSchema } from "@/schemas/Version.Schema";

//

export const useVersionStore = defineStore("version", () => {

    //

    const current = ref(import.meta.env.VITE_APP_VERSION || "0.0.0")
    const version = ref<VersionSchema>({ url: "", version: "", changes: [], required: true })

    //

    const mismatch = computed(() => version.value.version != current.value)

    //

    const get = async () => {
        const res = await api.get<VersionSchema>("/api/version")
        current.value = import.meta.env.VITE_APP_VERSION || "0.0.0"
        version.value = res.data
        return res.data
    }

    //

    return {
        current,
        version,
        mismatch,
        get,
    }

})
