<template>
    <v-container class="">
        <v-row dense align="center">
            <v-col cols="12">
                <h4 class="text-grey-darken-1">Thresholds</h4>
            </v-col>
        </v-row>
        <v-row dense>
            <v-col 
                v-if="!isFetchingThresholds"
                v-for="t in thresholds"
                cols="12"
                md="6"
                :key="t.id"
            >
                <ThresholdCard 
                    :threshold="t"
                    @edit="onClickUpdateThreshold(t)"
                    @delete="onClickDeleteThreshold(t)"
                ></ThresholdCard>
            </v-col>
            <v-col 
                v-if="isFetchingThresholds"
                v-for="n in [1, 2, 3, 4]"
                cols="12"
                md="6"
                :key="n"
            >
                <v-skeleton-loader type="article"></v-skeleton-loader>
            </v-col>
        </v-row>
        <v-dialog v-model="showCreateThresholdDialog">
            <v-card class="py-5">
                <v-card-title class="text-center font-weight-bold">Create Threshold</v-card-title>
                <ThresholdCreateForm
                    :readings
                    :icons="[`mdi-water`, `mdi-water-outline`, `mdi-thermometer`]"
                    :disabled="isCreatingThreshold"
                    @submit="onSubmitCreateThreshold"
                ></ThresholdCreateForm>
            </v-card>
        </v-dialog>
        <v-dialog v-model="showUpdateThresholdDialog">
            <v-card class="py-5">
                <v-card-title class="text-center font-weight-bold">Update Threshold</v-card-title>
                <ThresholdUpdateForm
                    :readings
                    :icons="[`mdi-water`, `mdi-water-outline`, `mdi-thermometer`]"
                    :disabled="isUpdatingThreshold"
                    :threshold="thresholdToUpdate!"
                    @submit="onSubmitUpdateThreshold"
                ></ThresholdUpdateForm>
            </v-card>
        </v-dialog>
        <v-dialog v-model="showDeleteThresholdDialog">
            <v-card class="py-5">
                <v-card-title class="text-center font-weight-bold">Delete Threshold</v-card-title>
                <ThresholdDeleteForm
                    :readings
                    :icons="[`mdi-water`, `mdi-water-outline`, `mdi-thermometer`]"
                    :disabled="isDeletingThreshold"
                    :threshold="thresholdToDelete!"
                    @submit="onSubmitDeleteThreshold"
                ></ThresholdDeleteForm>
            </v-card>
        </v-dialog>
        <v-fab
            icon
            style="z-index: 999"
            color="accent"
            class="position-fixed bottom-0 right-0 mb-16 mr-5"
            location="right bottom"
            transition="fade"
        >
            <v-icon>mdi-plus-circle-outline</v-icon>
            <v-speed-dial activator="parent">
                <v-btn 
                    key="1"
                    color="accent" 
                    icon="mdi-tune-vertical"
                    @click="showCreateThresholdDialog = true"
                ></v-btn>
            </v-speed-dial>
        </v-fab>
    </v-container>
</template>

<script setup lang="ts">
import { api } from '@/plugins/api'
import { ThresholdDeleteSchema, ThresholdSchema, type ThresholdCreateSchema, type ThresholdUpdateSchema } from '@/schemas/ThresholdSchema'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useEspStore } from '@/stores/esp';
import type { SubmissionContext } from 'vee-validate';
import useToast from '@/composables/use-toast';
import ThresholdCard from '@/components/admin/thresholds/ThresholdCard.vue';
import ThresholdCreateForm from '@/components/admin/thresholds/ThresholdCreateForm.vue';
import ThresholdUpdateForm from '@/components/admin/thresholds/ThresholdUpdateForm.vue';
import ThresholdDeleteForm from '@/components/admin/thresholds/ThresholdDeleteForm.vue';
import { useReadingStore } from '@/stores/reading';
import { useThresholdStore } from '@/stores/threshold';
import { storeToRefs } from 'pinia';

//

// --- Utils
const toastCmp = useToast()

// --- Readings
const readingStore = useReadingStore()
// --- A new esp has no readings yet, so the known sensors are always offered
const knownReadings = ["Temperature", "Humidity", "Soil Moisture", "Light"]
const readings = computed(() => [...new Set([...knownReadings, ...readingStore.readings.map(r => r.name)]).values()])

// --- Thresholds
const thresholdStore = useThresholdStore()
const { thresholds } = storeToRefs(thresholdStore)
const { getThresholds, postThreshold, patchThreshold, deleteThreshold } = thresholdStore
const isFetchingThresholds = ref(false)

// --- Threshold Create
const isCreatingThreshold = ref(false)
const showCreateThresholdDialog = ref(false)

const onSubmitCreateThreshold = async (
    values: ThresholdCreateSchema,
    ctx: SubmissionContext<{ [K in keyof ThresholdCreateSchema]?: unknown }>
) => {
    isCreatingThreshold.value = true
    const { res, err } = await postThreshold(values)
        .then((res) => ({ res, err: undefined }))
        .catch((err) => ({ res: undefined, err }))
        .finally(() => isCreatingThreshold.value = false)

    if (err) return toastCmp.error(err?.message || "Something went wrong.")
    ctx.resetForm()
    toastCmp.success("Threshold created successfully.")
    showCreateThresholdDialog.value = false
}

// --- Threshold Update
const thresholdToUpdate = ref<ThresholdSchema>()
const isUpdatingThreshold = ref(false)
const showUpdateThresholdDialog = ref(false)

const onClickUpdateThreshold = (threshold: ThresholdSchema) => {
    thresholdToUpdate.value = threshold
    showUpdateThresholdDialog.value = true
}

const onSubmitUpdateThreshold = async (
    values: ThresholdUpdateSchema,
    ctx: SubmissionContext<{ [K in keyof ThresholdUpdateSchema]?: unknown }>
) => {
    if (!thresholdToUpdate.value) return
    isUpdatingThreshold.value = true

    const { res, err } = await patchThreshold(thresholdToUpdate.value.id, values)
        .then((res) => ({ res, err: undefined }))
        .catch((err) => ({ res: undefined, err }))
        .finally(() => isUpdatingThreshold.value = false)

    if (err) return toastCmp.error(err?.message || "Something went wrong.")
    ctx.resetForm()
    toastCmp.success("Threshold updated successfully.")
    showUpdateThresholdDialog.value = false
}

// --- Threshold Delete
const thresholdToDelete = ref<ThresholdSchema>()
const isDeletingThreshold = ref(false)
const showDeleteThresholdDialog = ref(false)

const onClickDeleteThreshold = (threshold: ThresholdSchema) => {
    thresholdToDelete.value = threshold
    showDeleteThresholdDialog.value = true
}

const onSubmitDeleteThreshold = async (
    values: ThresholdDeleteSchema,
    ctx: SubmissionContext<{ [K in keyof ThresholdDeleteSchema]?: unknown }>
) => {
    if (!thresholdToDelete.value) return
    isDeletingThreshold.value = true

    const { res, err } = await deleteThreshold(thresholdToDelete.value.id)
        .then((res) => ({ res, err: undefined }))
        .catch((err) => ({ res: undefined, err }))
        .finally(() => isDeletingThreshold.value = false)

    if (err) return toastCmp.error(err?.message || "Something went wrong.")
    ctx.resetForm()
    toastCmp.success("Threshold deleted successfully.")
    showDeleteThresholdDialog.value = false
}

//

const onMountedCb = async () => {
    isFetchingThresholds.value = true
    await Promise.all([getThresholds(), readingStore.getReadings()])
    isFetchingThresholds.value = false
}

onMounted(onMountedCb)
watch(() => useEspStore().selectedId, onMountedCb)

//

</script>

<style scoped>

</style>