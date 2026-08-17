import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router"
import { redirectAuth, refreshAuth, requireAuth } from "@/middlewares/auth.middleware"

//

const SignInView = () => import("@/views/auth/SignInView.vue")
const HomeView = () => import("@/views/app/HomeView.vue")
const MonitorView = () => import("@/views/app/MonitorView.vue")
const GrowthView = () => import("@/views/app/GrowthView.vue")
const ErrorView = () => import("@/views/app/ErrorView.vue")
const SettingsView = () => import("@/views/app/SettingsView.vue")
const WelcomeView = () => import("@/views/WelcomeView.vue")
const GuideView = () => import("@/views/GuideView.vue")
const AdminAccountsView = () => import("@/views/admin/AdminAccountsView.vue")
const AdminThresholdsView = () => import("@/views/admin/AdminThresholdsView.vue")
const AdminControlsView = () => import("@/views/admin/AdminControlsView.vue")
const AdminDetectionView = () => import("@/views/admin/AdminDetectionView.vue")
const AdminSettingsView = () => import("@/views/admin/AdminSettingsView.vue")

//

const routes: RouteRecordRaw[] = [
	{
		path: "/",
		name: "welcome",
		meta: { layout: "home" },
		component: WelcomeView,
	},
	{
		path: "/home",
		name: "guide",
		meta: { layout: "home" },
		component: GuideView,
	},
	{
		path: "/auth/sign-in",
		name: "sign-in",
		meta: { layout: "auth" },
		component: SignInView,
		beforeEnter: [refreshAuth, redirectAuth],
	},
	{
		path: "/admin/accounts",
		name: "admin accounts",
		meta: { layout: "admin" },
		component: AdminAccountsView,
		beforeEnter: [refreshAuth, requireAuth],
	},
	{
		path: "/admin/thresholds",
		name: "admin thresholds",
		meta: { layout: "admin" },
		component: AdminThresholdsView,
		beforeEnter: [refreshAuth, requireAuth],
	},
	{
		path: "/admin/controls",
		name: "admin controls",
		meta: { layout: "admin" },
		component: AdminControlsView,
		beforeEnter: [refreshAuth, requireAuth],
	},
	{
		path: "/admin/detection",
		name: "admin detection",
		meta: { layout: "admin" },
		component: AdminDetectionView,
		beforeEnter: [refreshAuth, requireAuth],
	},
	{
		path: "/admin/settings",
		name: "admin settings",
		meta: { layout: "admin" },
		component: AdminSettingsView,
		beforeEnter: [refreshAuth, requireAuth],
	},
	{
		path: "/app/home",
		name: "home",
		meta: { layout: "app" },
		component: HomeView,
		beforeEnter: [refreshAuth, requireAuth],
	},
	{
		path: "/app/monitor",
		name: "monitor",
		meta: { layout: "app" },
		component: MonitorView,
		beforeEnter: [refreshAuth, requireAuth],
	},
	{
		path: "/app/growth",
		name: "growth",
		meta: { layout: "app" },
		component: GrowthView,
		beforeEnter: [refreshAuth, requireAuth],
	},
	{
		path: "/app/error",
		name: "error",
		meta: { layout: "app" },
		component: ErrorView,
		beforeEnter: [refreshAuth, requireAuth],
	},
	{
		path: "/app/settings",
		name: "settings",
		meta: { layout: "app" },
		component: SettingsView,
		beforeEnter: [refreshAuth, requireAuth],
	},
	{
		path: "/:pathMatch(.*)*",
		name: "404",
		redirect: "/",
	},
]

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
})

router.beforeEach(to => {
	if (!to.query.path) return

	const redirectPath = to.query.path as string
	const resolved = router.resolve(redirectPath)

	if (resolved.matched.length > 0 && resolved.name !== "404") {
		const { path, ...remainingQuery } = to.query
		return { path: redirectPath, query: remainingQuery, replace: true }
	}
})

//

export default router
