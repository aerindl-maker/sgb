import { api } from "@/plugins/api"
import { ref } from "vue"
import { defineStore } from "pinia"
import { useEspStore } from "@/stores/esp"
import type { UserSafeSchema, UserSignInSchema } from "@/schemas/UserSchema"

//

export const useAuthStore = defineStore("auth", () => {

    //

    const user = ref<UserSafeSchema>()

    //

    const whoami = async () => {
        let error: any = undefined
        await api
            .get<UserSafeSchema>("/api/auth/me")
            .then((res) => user.value = res.data)
            .catch((e) => error = e)

        if (error) user.value = undefined
        if (error) throw new Error(error)
        return user.value
    }

    const signIn = async (data: UserSignInSchema) => {
        const res = await api.post<UserSafeSchema>("/api/auth/sign-in", data)
        user.value = res.data
        return res.data
    }

    const signOut = async () => {
        await api.post<UserSafeSchema>("/api/auth/sign-out")
        user.value = undefined
        useEspStore().clear()
    }

    //

    return {
        user,
        whoami,
        signIn,
        signOut,
    }

}, { persist: true })
