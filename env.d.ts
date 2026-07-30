/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string
    readonly VITE_AI_CLD_URL: string
    readonly VITE_AI_CLD_CLASSES: string
    readonly VITE_AI_PLANT_URL: string
    readonly VITE_AI_PLANT_CLASSES: string
    readonly VITE_APP_VERSION: string
    readonly VITE_APP_ANDROID_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}