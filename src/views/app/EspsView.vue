<template>
    <v-container class="pb-16">
        <v-row dense align="center">
            <v-col cols="12" class="d-flex align-center justify-space-between">
                <div>
                    <h4 class="text-grey-darken-1">MY DEVICES</h4>
                    <small class="text-grey">Pick a greenhouse to see its readings and controls.</small>
                </div>
                <v-btn icon="mdi-cog" variant="text" to="/app/settings"></v-btn>
            </v-col>
        </v-row>
        <v-row dense class="mt-2">
            <v-col v-if="isFetchingEsps" v-for="n in [1, 2]" :key="n" cols="6" sm="6" lg="4">
                <v-skeleton-loader type="article"></v-skeleton-loader>
            </v-col>
            <v-col v-else-if="!esps.length" cols="12">
                <v-card elevation="1" class="py-5">
                    <v-card-text class="d-flex flex-column align-center ga-2 text-grey text-center">
                        <v-icon icon="mdi-chip" color="accent" size="36"></v-icon>
                        <span>No devices yet. Tap + to add your first ESP.</span>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col v-else v-for="esp in esps" :key="esp.id" cols="6" sm="6" lg="4">
                <v-card class="pt-4" elevation="1" :class="{ 'opacity-60': !esp.enabled }" @click="onClickOpen(esp)">
                    <template #subtitle>
                        <span class="d-flex align-center ga-1">
                            <v-icon icon="mdi-chip" :color="esp.online ? `accent` : `grey`" size="small"></v-icon>
                            <span>ESP Device</span>
                        </span>
                    </template>
                    <template #append>
                        <v-menu location="bottom end">
                            <template #activator="{ props }">
                                <v-btn v-bind="props" size="x-small" icon="mdi-dots-vertical" variant="text" class="mt-n2 mr-n2" @click.stop></v-btn>
                            </template>
                            <v-list density="compact" rounded="lg">
                                <v-list-item prepend-icon="mdi-pencil-outline" title="Rename" @click="onClickRename(esp)"></v-list-item>
                                <v-list-item prepend-icon="mdi-key-change" title="New key" @click="onClickRegenerate(esp)"></v-list-item>
                                <v-list-item
                                    v-if="esp.id != DEFAULT_ESP_ID"
                                    :prepend-icon="esp.enabled ? `mdi-power-plug-off-outline` : `mdi-power-plug-outline`"
                                    :title="esp.enabled ? `Disable` : `Enable`"
                                    :class="esp.enabled ? `text-red` : ``"
                                    @click="onClickToggle(esp)"
                                ></v-list-item>
                                <v-list-item
                                    v-if="esp.id != DEFAULT_ESP_ID"
                                    prepend-icon="mdi-delete-outline"
                                    title="Delete"
                                    class="text-red"
                                    @click="onClickDelete(esp)"
                                ></v-list-item>
                            </v-list>
                        </v-menu>
                    </template>
                    <template #text>
                        <div class="d-flex flex-column align-start ga-2">
                            <h3 class="pl-2 w-100 text-truncate">{{ esp.name }}</h3>
                            <div class="w-100 d-flex align-center justify-space-between ga-1">
                                <v-chip size="x-small" :color="espStatus(esp).color">{{ espStatus(esp).text }}</v-chip>
                                <span v-if="esp.lastSeenAt" class="text-caption text-grey">{{ dateCmp.format(esp.lastSeenAt, "fullTime12h") }}</span>
                            </div>
                        </div>
                    </template>
                </v-card>
            </v-col>
        </v-row>
        <v-dialog v-model="showNameDialog" max-width="500">
            <v-card class="py-5">
                <v-card-title class="text-center font-weight-bold">{{ espToRename ? "Rename ESP" : "Add ESP" }}</v-card-title>
                <v-card-text>
                    <v-text-field
                        v-model="nameInput"
                        label="Name"
                        color="accent"
                        placeholder="Greenhouse 2"
                        prepend-inner-icon="mdi-chip"
                        :error-messages="nameError"
                        :disabled="isSavingName"
                        @keyup.enter="onSubmitName"
                    ></v-text-field>
                    <v-btn
                        block
                        color="accent"
                        :text="espToRename ? `Save` : `Add`"
                        :loading="isSavingName"
                        :disabled="isSavingName"
                        @click="onSubmitName"
                    ></v-btn>
                </v-card-text>
            </v-card>
        </v-dialog>
        <v-dialog v-model="showKeyDialog" max-width="500" persistent>
            <v-card class="py-5">
                <v-card-title class="text-center font-weight-bold">{{ espWithKey?.name }} Key</v-card-title>
                <v-card-subtitle class="text-center text-wrap">
                    Copy it now, it won't be shown again. Put it in the board's secrets.h and re-flash.
                </v-card-subtitle>
                <v-card-text>
                    <v-sheet rounded="lg" color="grey-lighten-4" class="pa-3 text-grey-darken-3" style="word-break: break-all">
                        <code>{{ keySnippet }}</code>
                    </v-sheet>
                    <div class="d-flex ga-2 mt-4">
                        <v-btn class="flex-grow-1" color="accent" prepend-icon="mdi-content-copy" text="Copy" @click="onClickCopyKey"></v-btn>
                        <v-btn class="flex-grow-1" variant="tonal" text="Done" @click="showKeyDialog = false"></v-btn>
                    </div>
                </v-card-text>
            </v-card>
        </v-dialog>
        <v-dialog v-model="showConfirmDialog" max-width="500">
            <v-card class="py-5">
                <v-card-title class="text-center font-weight-bold">{{ confirmation?.title }}</v-card-title>
                <v-card-text>
                    <p class="text-center text-grey">{{ confirmation?.message }}</p>
                    <v-text-field
                        v-if="confirmation?.phrase"
                        v-model="confirmInput"
                        class="mt-4"
                        color="red"
                        hide-details
                        :label="`Type ${confirmation.phrase} to confirm`"
                        :disabled="isConfirming"
                    ></v-text-field>
                    <div class="d-flex ga-2 mt-4">
                        <v-btn class="flex-grow-1" variant="tonal" text="Cancel" @click="showConfirmDialog = false"></v-btn>
                        <v-btn
                            class="flex-grow-1"
                            color="red"
                            :text="confirmation?.action"
                            :loading="isConfirming"
                            :disabled="isConfirming || !isPhraseTyped"
                            @click="onConfirm"
                        ></v-btn>
                    </div>
                </v-card-text>
            </v-card>
        </v-dialog>
        <v-fab
            icon="mdi-plus"
            style="z-index: 999"
            color="accent"
            class="position-fixed bottom-0 right-0 mb-16 mr-5"
            location="right bottom"
            @click="onClickAdd"
        ></v-fab>
    </v-container>
</template>

<script setup lang="ts">
import useToast from '@/composables/use-toast'
import { DEFAULT_ESP_ID, EspCreateSchema, type EspSchema, type EspWithKeySchema } from '@/schemas/EspSchema'
import { useEspStore } from '@/stores/esp'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useDate } from 'vuetify'
import { useRouter } from 'vue-router'

//

// --- Utils
const dateCmp = useDate()
const routerCmp = useRouter()
const toastCmp = useToast()
const toError = (err: any) => err?.response?.data || err?.message || "Something went wrong."

// --- Esps
const espStore = useEspStore()
const { esps } = storeToRefs(espStore)
const isFetchingEsps = ref(false)

// --- Status
const espStatus = (esp: EspSchema) => {
    if (!esp.enabled) return { text: "Disabled", color: "red" }
    return esp.online ? { text: "Online", color: "accent" } : { text: "Offline", color: "grey" }
}

// --- Open
const onClickOpen = async (esp: EspSchema) => {
    espStore.select(esp.id)
    await routerCmp.push("/app/home")
}

// --- Add & Rename
const espToRename = ref<EspSchema>()
const nameInput = ref("")
const nameError = ref<string>()
const isSavingName = ref(false)
const showNameDialog = ref(false)

const onClickAdd = () => {
    espToRename.value = undefined
    nameInput.value = ""
    nameError.value = undefined
    showNameDialog.value = true
}

const onClickRename = (esp: EspSchema) => {
    espToRename.value = esp
    nameInput.value = esp.name
    nameError.value = undefined
    showNameDialog.value = true
}

const onSubmitName = async () => {
    const { data, error, success } = EspCreateSchema.safeParse({ name: nameInput.value })
    nameError.value = error?.issues.at(0)?.message
    if (!success) return

    isSavingName.value = true
    const target = espToRename.value
    // --- Only a new esp comes back with a key to show
    const err = await (target ? espStore.patchEsp(target.id, data) : espStore.postEsp(data).then(showKey))
        .then(() => undefined)
        .catch((err) => err)
        .finally(() => isSavingName.value = false)

    if (err) return toastCmp.error(toError(err))
    showNameDialog.value = false
    toastCmp.success(`ESP ${target ? "renamed" : "added"} successfully.`)
}

// --- Key
const espWithKey = ref<EspWithKeySchema>()
const showKeyDialog = ref(false)
const keySnippet = computed(() => `#define WS_KEY "${espWithKey.value?.key ?? ""}"`)

const showKey = (esp: EspWithKeySchema) => {
    espWithKey.value = esp
    showKeyDialog.value = true
}

const onClickCopyKey = async () => {
    await navigator.clipboard
        .writeText(espWithKey.value?.key ?? "")
        .then(() => toastCmp.success("Key copied."))
        .catch(() => toastCmp.error("Unable to copy, select the key manually."))
}

// --- Confirmations
// --- A phrase makes the user type it first, for actions that can't be undone
type Confirmation = { title: string, message: string, action: string, phrase?: string, run: () => Promise<unknown> }
const confirmation = ref<Confirmation>()
const confirmInput = ref("")
const isConfirming = ref(false)
const showConfirmDialog = ref(false)
const isPhraseTyped = computed(() => !confirmation.value?.phrase || confirmInput.value.trim() == confirmation.value.phrase)

const confirm = (value: Confirmation) => {
    confirmation.value = value
    confirmInput.value = ""
    showConfirmDialog.value = true
}

const onClickRegenerate = (esp: EspSchema) => {
    confirm({
        title: "New Key",
        action: "Generate",
        message: `${esp.name} will disconnect until it's re-flashed with the new key.`,
        run: () => espStore.regenerateKey(esp.id).then(showKey),
    })
}

const onClickToggle = (esp: EspSchema) => {
    if (!esp.enabled) return espStore.patchEsp(esp.id, { enabled: true })
        .then(() => toastCmp.success(`${esp.name} enabled.`))
        .catch((err) => toastCmp.error(toError(err)))

    confirm({
        title: "Disable ESP",
        action: "Disable",
        message: `${esp.name} will be disconnected and rejected. Its history is kept.`,
        run: () => espStore.patchEsp(esp.id, { enabled: false }).then(() => toastCmp.success(`${esp.name} disabled.`)),
    })
}

const onClickDelete = (esp: EspSchema) => {
    confirm({
        title: "Delete ESP",
        action: "Delete",
        phrase: esp.name,
        message: `${esp.name} and all of its readings, thresholds, controls, errors, and growth captures will be permanently deleted. This can't be undone.`,
        run: () => espStore.deleteEsp(esp.id).then(() => toastCmp.success(`${esp.name} deleted.`)),
    })
}

const onConfirm = async () => {
    if (!confirmation.value) return
    isConfirming.value = true
    const err = await confirmation.value
        .run()
        .then(() => undefined)
        .catch((err) => err)
        .finally(() => isConfirming.value = false)

    if (err) return toastCmp.error(toError(err))
    showConfirmDialog.value = false
}

//

const onMountedCb = async () => {
    isFetchingEsps.value = true
    await espStore
        .getEsps()
        .catch(() => toastCmp.error("Unable to load ESPs."))
    isFetchingEsps.value = false
}

onMounted(onMountedCb)

//

</script>

<style scoped>

</style>
