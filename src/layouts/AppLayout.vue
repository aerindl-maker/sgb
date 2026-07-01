<template>
	<v-layout class="pt-16">
		<v-main class="pt-0">
			<v-sheet class="w-100 d-flex justify-center">
				<v-sheet
					class="blob position-fixed top-0 mt-n16 rounded-circle"
					width="150dvw"
					height="max(120px, 10dvh)"
				></v-sheet>
			</v-sheet>
			<slot></slot>
		</v-main>
		<v-bottom-navigation
			grow
			fixed
			mode="shift"
			color="accent"
			class="position-fixed bottom-0 left-0 text-grey-darken-1"
		>
			<v-btn to="/app/home" value="home">
				<v-icon>mdi-home</v-icon>
				<span>Home</span>
			</v-btn>
			<v-btn to="/app/monitor" value="monitor">
				<v-icon>mdi-chart-bar</v-icon>
				<span>Monitor</span>
			</v-btn>
			<v-btn to="/app/growth" value="growth">
				<v-icon>mdi-sprout</v-icon>
				<span>Growth</span>
			</v-btn>
			<v-btn to="/app/error" value="error">
				<v-icon>mdi-alert-circle-outline</v-icon>
				<span>Errors</span>
			</v-btn>
			<v-btn to="/app/settings" value="settings">
				<v-icon>mdi-cog</v-icon>
				<span>Settings</span>
			</v-btn>
		</v-bottom-navigation>
	</v-layout>
</template>

<script setup lang="ts"></script>

<style scoped>
.v-app-bar,
.blob {
	z-index: -1;
	background: #008a17;
	background: linear-gradient(270deg, rgb(var(--v-theme-accent)) 0%, rgb(var(--v-theme-secondary)) 100%);
}
</style>
