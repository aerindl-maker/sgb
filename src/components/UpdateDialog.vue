<template>
    <v-dialog>
        <v-card border class="pa-2 pb-0" rounded="lg">
            <v-card-text class="d-flex flex-column ga-2">
                <div class="d-flex align-center ga-4">
                    <v-icon color="green">mdi-update</v-icon>
                    <div class="d-flex flex-column">
                        <span class="font-weight-bold">Version {{ version.version }} Available!</span>
                        <span class="text-subtitle-2 text-grey">A new update is ready to install</span>
                    </div>
                </div>
                <v-list class="pa-0" density="compact">
                    <v-list-subheader class="pa-0">What's new?</v-list-subheader>
                    <ul 
                        v-for="c in version.changes"
                        class="py-0 pl-5 text-subtitle-2"
                    >- {{ c }}</ul>
                </v-list>
                <div class="d-flex justify-end ga-2">
                    <v-btn
                        v-if="!hideCancel"
                        text="Cancel"
                        class="border"
                        @click="onClickCancel"
                    ></v-btn>
                    <v-btn
                        text="Update"
                        color="blue"
                        @click="onClickUpdate"
                    ></v-btn>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import type { VersionSchema } from '@/schemas/Version.Schema';

//

const props = defineProps<{
    version: VersionSchema,
    mismatch: boolean,
    hideCancel?: boolean,
    onError?: (error: any) => any,
    onCancel?: () => any,
    onUpdate?: (version: VersionSchema) => any,
}>()

//

const onClickCancel = async () => {
    await Promise.resolve()
        .then(() => props.onCancel && props.onCancel())
        .catch(err => props.onError && props.onError(err))
}

const onClickUpdate = async () => {
    await Promise.resolve()
        .then(() => props.onUpdate && props.onUpdate(props.version))
        .catch(err => props.onError && props.onError(err))
}

//

</script>

<style scoped>

</style>