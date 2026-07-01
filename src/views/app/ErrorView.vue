<template>
	<v-container class="pb-16">
		<v-row dense align="center">
			<v-col cols="12" class="d-flex align-center justify-space-between">
				<h4 class="text-grey-darken-1">ERRORS</h4>
				<v-btn icon="mdi-refresh" color="accent" :loading="isFetchingFaults" @click="getFaults"></v-btn>
			</v-col>
		</v-row>
		<v-row dense align="center">
			<v-col cols="12" sm="5">
				<v-date-input
					v-model="alpha"
					label="From"
					color="accent"
					prepend-icon="mdi-calendar-start"
				></v-date-input>
			</v-col>
			<v-col cols="12" sm="5">
				<v-date-input v-model="omega" label="To" color="accent" prepend-icon="mdi-calendar-end"></v-date-input>
			</v-col>
			<v-col cols="12" sm="2" class="d-flex align-center ga-2">
				<v-btn icon="mdi-calendar-today" color="accent" variant="tonal" @click="onClickToday"></v-btn>
				<v-btn
					icon="mdi-filter"
					color="accent"
					:disabled="hasDateError"
					:loading="isFetchingFaults"
					@click="getFaults"
				></v-btn>
			</v-col>
		</v-row>
		<v-row v-if="hasDateError" dense>
			<v-col cols="12">
				<v-alert
					type="error"
					variant="tonal"
					density="compact"
					text="Start date must be before end date."
				></v-alert>
			</v-col>
		</v-row>
		<v-row dense>
			<v-col v-if="isFetchingFaults" v-for="n in [1, 2, 3]" :key="n" cols="12" md="6" lg="4">
				<v-skeleton-loader type="article"></v-skeleton-loader>
			</v-col>
			<v-col v-else-if="!faults.length" cols="12">
				<v-card elevation="1" class="py-5">
					<v-card-text class="d-flex flex-column align-center ga-2 text-grey">
						<v-icon icon="mdi-check-circle-outline" color="accent" size="36"></v-icon>
						<span>No errors found.</span>
					</v-card-text>
				</v-card>
			</v-col>
			<v-col v-else v-for="fault in faults" :key="fault.id" cols="12" md="6" lg="4">
				<v-card elevation="1">
					<template #prepend>
						<v-avatar color="error" variant="tonal">
							<v-icon icon="mdi-alert-circle-outline"></v-icon>
						</v-avatar>
					</template>
					<template #title>
						<span>{{ fault.title }}</span>
					</template>
					<template #subtitle>
						<span>{{ dateCmp.format(fault.createdAt, "fullDateTime12h") }}</span>
					</template>
					<template #text>
						<div class="d-flex flex-column ga-3">
							<span>{{ fault.message }}</span>
							<v-chip size="small" color="error" variant="tonal" prepend-icon="mdi-alert">
								Sensor Fault
							</v-chip>
						</div>
					</template>
				</v-card>
			</v-col>
		</v-row>
	</v-container>
</template>

<script setup lang="ts">
import useToast from "@/composables/use-toast"
import { api } from "@/plugins/api"
import { FaultSchema } from "@/schemas/FaultSchema"
import { computed, onMounted, ref } from "vue"
import { useDate } from "vuetify"
import z from "zod"

//

// --- Utils
const dateCmp = useDate()
const toastCmp = useToast()

// --- Date Range
const createTodayRange = () => {
	const alpha = new Date()
	const omega = new Date()
	alpha.setHours(0, 0, 0, 0)
	omega.setHours(23, 59, 59, 999)
	return { alpha, omega }
}

const defaultRange = createTodayRange()
const alpha = ref<Date | null>(defaultRange.alpha)
const omega = ref<Date | null>(defaultRange.omega)
const hasDateError = computed(() => !!alpha.value && !!omega.value && alpha.value.getTime() > omega.value.getTime())

const createFaultParams = () => ({
	limit: 100,
	...(alpha.value && { alpha: startOfDay(alpha.value).toISOString() }),
	...(omega.value && { omega: endOfDay(omega.value).toISOString() }),
})

const startOfDay = (date: Date) => {
	const value = new Date(date)
	value.setHours(0, 0, 0, 0)
	return value
}

const endOfDay = (date: Date) => {
	const value = new Date(date)
	value.setHours(23, 59, 59, 999)
	return value
}

// --- Faults
const faults = ref<FaultSchema[]>([])
const isFetchingFaults = ref(false)

const getFaults = async () => {
	if (hasDateError.value) return toastCmp.error("Invalid date range.")

	isFetchingFaults.value = true
	await api
		.get<FaultSchema[]>("/api/fault", { params: createFaultParams() })
		.then(res => z.array(FaultSchema).parse(res.data))
		.then(data => (faults.value = data))
		.catch(() => toastCmp.error("Something went wrong."))
		.finally(() => (isFetchingFaults.value = false))
}

const onClickToday = async () => {
	const range = createTodayRange()
	alpha.value = range.alpha
	omega.value = range.omega
	await getFaults()
}

//

onMounted(getFaults)

//
</script>
