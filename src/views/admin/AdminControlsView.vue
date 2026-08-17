<template>
    <v-container class="">
        <v-row dense align="center">
            <v-col cols="12">
                <h4 class="text-grey-darken-1">Controls</h4>
                <small class="text-grey">Manual overrides for testing the greenhouse hardware.</small>
            </v-col>
        </v-row>
        <v-row dense class="mt-2">
            <v-col cols="12">
                <v-alert
                    density="compact"
                    variant="tonal"
                    :type="automation ? `info` : `warning`"
                    :text="automation
                        ? `Automations are running. Turn them off to control the actuators manually.`
                        : `Automations are off. Actuators stay exactly as set below until automations are turned back on.`"
                ></v-alert>
            </v-col>
        </v-row>
        <v-row dense class="mt-2">
            <v-col cols="12">
                <h5 class="text-grey">Automation</h5>
            </v-col>
            <v-col cols="12" md="6">
                <ControlSwitchCard
                    v-if="!isFetchingControl && control"
                    icon="mdi-robot-industrial"
                    title="Automations"
                    subtitle="Threshold-driven cooling, watering, and lighting"
                    :value="control.automation"
                    :loading="fieldToToggle == `automation`"
                    :disabled="!!fieldToToggle"
                    :on-toggle="onToggleControl(`automation`)"
                    :on-error="onErrorControl"
                ></ControlSwitchCard>
                <v-skeleton-loader v-else type="list-item-avatar"></v-skeleton-loader>
            </v-col>
        </v-row>
        <v-row dense class="mt-2">
            <v-col cols="12">
                <h5 class="text-grey">Actuators</h5>
            </v-col>
            <v-col
                v-if="!isFetchingControl && control"
                v-for="a in actuators"
                cols="12"
                md="6"
                :key="a.field"
            >
                <ControlSwitchCard
                    :icon="a.icon"
                    :title="a.title"
                    :subtitle="a.subtitle"
                    :value="control[a.field]"
                    :loading="fieldToToggle == a.field"
                    :disabled="automation || !!fieldToToggle"
                    :on-toggle="onToggleControl(a.field)"
                    :on-error="onErrorControl"
                ></ControlSwitchCard>
            </v-col>
            <v-col
                v-if="isFetchingControl || !control"
                v-for="n in [1, 2, 3, 4]"
                cols="12"
                md="6"
                :key="n"
            >
                <v-skeleton-loader type="list-item-avatar"></v-skeleton-loader>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup lang="ts">
import ControlSwitchCard from '@/components/admin/controls/ControlSwitchCard.vue'
import useToast from '@/composables/use-toast'
import { ControlActuator, type ControlField } from '@/schemas/ControlSchema'
import { useControlStore } from '@/stores/control'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'

//

// --- Utils
const toastCmp = useToast()

// --- Actuators
const actuatorLabels: Record<(typeof ControlActuator)[number], { icon: string, title: string, subtitle: string }> = {
    pump: { icon: "mdi-water-pump", title: "Water Pump", subtitle: "Irrigates the soil bed" },
    intake: { icon: "mdi-fan", title: "Intake Fan", subtitle: "Pulls fresh air in" },
    exhaust: { icon: "mdi-weather-windy", title: "Exhaust Fan", subtitle: "Pushes warm air out" },
    light: { icon: "mdi-lightbulb-on-outline", title: "Grow Light", subtitle: "Supplements sunlight" },
}

const actuators = ControlActuator.map(a => ({ field: a, ...actuatorLabels[a] }))

// --- Control
const controlStore = useControlStore()
const { control, automation } = storeToRefs(controlStore)
const isFetchingControl = ref(false)
const fieldToToggle = ref<ControlField>()

const onToggleControl = (field: ControlField) => async (value: boolean) => {
    fieldToToggle.value = field

    const { res, err } = await controlStore
        .patchControl({ [field]: value })
        .then(res => ({ res, err: undefined }))
        .catch(err => ({ res: undefined, err }))
        .finally(() => fieldToToggle.value = undefined)

    if (err) return toastCmp.error(err?.message || "Something went wrong.")
    toastCmp.success(`${field == "automation" ? "Automations" : actuatorLabels[field].title} turned ${value ? "on" : "off"}.`)
}

const onErrorControl = (error: any) => {
    toastCmp.error(error?.message || "Something went wrong.")
}

//

const onMountedCb = async () => {
    isFetchingControl.value = true
    await controlStore
        .getControl()
        .catch(() => toastCmp.error("Unable to load controls."))
    isFetchingControl.value = false
}

onMounted(onMountedCb)

//

</script>

<style scoped>

</style>
