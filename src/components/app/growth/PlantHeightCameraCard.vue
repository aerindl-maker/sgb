<template>
    <v-card elevation="1">
        <v-card-text class="pb-0">
            <div class="d-flex align-center justify-space-between">
                <h4 class="text-accent font-weight-bold">
                    Plant Height
                </h4>
                <v-menu open-on-hover>
                    <template #activator="{ props }">
                        <v-btn
                            size="x-small"
                            icon="mdi-dots-vertical"
                            class="text-grey"
                            :="props"
                        ></v-btn>
                    </template>
                    <template #default>
                        <v-list density="compact">
                            <v-list-item
                                title="Switch Camera"
                                prepend-icon="mdi-camera-switch"
                                :disabled="cameras.length < 2 || cameraLoading"
                                @click="onSwitchCamera"
                            ></v-list-item>
                        </v-list>
                    </template>
                </v-menu>
            </div>
            <v-responsive
                class="w-100 mt-1 border rounded overflow-hidden"
                content-class="d-flex align-center justify-center"
                :aspect-ratio="1"
            >
                <slot name="preview">
                    <!-- PlantCameraPreview -->
                </slot>
            </v-responsive>
            <v-alert
                v-if="errorMessage"
                type="error"
                variant="tonal"
                density="compact"
                class="mt-3"
                :text="errorMessage"
            ></v-alert>
        </v-card-text>
        <v-card-actions>
            <v-btn
                size="small"
                color="accent"
                :icon="streamActive ? `mdi-stop` : `mdi-video`"
                :loading="cameraLoading || modelLoading"
                :disabled="saving || (!streamActive && (!modelReady || cameras.length === 0))"
                @click="onToggleCamera"
            ></v-btn>
            <v-btn
                size="small"
                icon="mdi-camera"
                color="accent"
                :loading="saving"
                :disabled="!streamActive || detectionCount === 0"
                @click="onCapture"
            ></v-btn>
        </v-card-actions>
    </v-card>
</template>

<script setup lang="ts">

//

const props = defineProps<{
    cameras: { title: string; value: string }[]
    cameraLoading?: boolean
    streamActive?: boolean
    modelLoading?: boolean
    modelReady?: boolean
    saving?: boolean
    detectionCount: number
    errorMessage?: string
    onStart?: () => any
    onStop?: () => any
    onCapture?: () => any
    onSwitchCamera?: () => any
}>()

//

const onToggleCamera = () => (props.streamActive ? props.onStop?.() : props.onStart?.())

//

</script>

<style scoped>

</style>
