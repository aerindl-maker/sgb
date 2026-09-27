<template>
    <v-card class="py-2" elevation="1">
        <v-list-item>
            <template #prepend>
                <v-icon :icon :color="value ? `accent` : `grey`"></v-icon>
            </template>
            <template #default>
                <div class="font-weight-bold">{{ title }}</div>
                <small class="text-grey">{{ subtitle }}</small>
            </template>
            <template #append>
                <v-switch
                    inset
                    hide-details
                    color="accent"
                    :loading
                    :disabled="disabled || loading"
                    :model-value="value"
                    @update:model-value="onChangeValue"
                ></v-switch>
            </template>
        </v-list-item>
    </v-card>
</template>

<script setup lang="ts">

//

const props = defineProps<{
    icon: string
    title: string
    subtitle: string
    value: boolean
    loading?: boolean
    disabled?: boolean
    onToggle?: (value: boolean) => any
    onError?: (error: any) => any
}>()

//

const onChangeValue = async (value: unknown) => {
    await Promise
        .resolve()
        .then(() => props.onToggle && props.onToggle(!!value))
        .catch(err => props.onError && props.onError(err))
}

//

</script>

<style scoped>

</style>
