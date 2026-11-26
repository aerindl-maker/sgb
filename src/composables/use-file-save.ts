import { Capacitor } from "@capacitor/core"
import { Directory, Filesystem } from "@capacitor/filesystem"
import { Share } from "@capacitor/share"
import { nextTick, ref } from "vue"

//

export default () => {

    //

    const saving = ref(false)
    const savingOnWeb = ref(false)
    const savingOnNative = ref(false)

    //

    const saveFile = async (base64: string, mime: string, filename: string) => {
        if (!Capacitor.isNativePlatform()) await saveFileOnWeb(base64, mime, filename)
        else await saveFileOnNative(base64, mime, filename)
    }

    const saveFileOnWeb = async (base64: string, mime: string, filename: string) => {
        saving.value = true
        savingOnWeb.value = true
        const dataUrl = `data:${mime};base64,${base64}`
        const a = document.createElement("a")
        
        a.href = dataUrl
        a.download = filename
        a.style.display = "none"
        document.body.appendChild(a)
        a.click()

        await nextTick()
        document.body.removeChild(a)
        URL.revokeObjectURL(a.href)
        saving.value = false
        savingOnWeb.value = false
    }
    
    const saveFileOnNative = async (base64: string, mime: string, filename: string) => {
        saving.value = true
        savingOnNative.value = true

        try {
            // --- Save to filesystem
            await Filesystem.writeFile({
                path: filename,
                data: base64,
                directory: Directory.Cache,
            })

            // --- Get reference
            const fileUri = await Filesystem.getUri({
                path: filename,
                directory: Directory.Cache,
            })

            // --- Open native share sheet (Save to Files, Drive, etc.), dismissing it is not a failure
            await Share.share({
                title: "Save File",
                url: fileUri.uri,
                dialogTitle: "Save or Share File",
            }).catch((e) => {
                if (!/cancel/i.test(e?.message ?? "")) throw e
            })
        } finally {
            saving.value = false
            savingOnNative.value = false
        }
    }

    //

    return {
        saving, 
        savingOnWeb,
        savingOnNative,
        saveFile, 
        saveFileOnWeb, 
        saveFileOnNative,
    }
}

