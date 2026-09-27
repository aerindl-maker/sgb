import useToast from "@/composables/use-toast";
import { useAuthStore } from "@/stores/auth";
import { useEspStore } from "@/stores/esp";
import type { NavigationGuard } from "vue-router";

//

const refreshAuth: NavigationGuard = async (to, from) => {
    const authStore = useAuthStore()
    await authStore.whoami().catch(() => { })
}

const requireAuth: NavigationGuard = async (to, from) => {
    const toastCmp = useToast()
    const authStore = useAuthStore()
    
    if (authStore.user !== undefined) return
    if (to.path == "/auth/sign-in") return
    
    toastCmp.error("Session expired, kindly login again.")
    return "/auth/sign-in"
}

const redirectAuth: NavigationGuard = async (to, from) => {
    const authStore = useAuthStore()
    if (authStore.user === undefined) return
    
    const path = authStore.user.role == "Admin" ? "/admin/accounts" : "/app/esps"
    if (to.path != path) return path
}

// --- Esp pages need a device picked from the list first
const requireEsp: NavigationGuard = async (to, from) => {
    const espStore = useEspStore()
    if (espStore.selectedId === undefined) return "/app/esps"
}

//

export { refreshAuth, requireAuth, redirectAuth, requireEsp }
