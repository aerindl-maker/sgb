import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router"
import { redirectAuth, refreshAuth, requireAuth, requireEsp } from "@/middlewares/auth.middleware"

//

const SignInView = () => import("@/views/auth/SignInView.vue")
const ForgotPasswordView = () => import("@/views/auth/ForgotPasswordView.vue")
const ResetPasswordView = () => import("@/views/auth/ResetPasswordView.vue")
const HomeView = () => import("@/views/app/HomeView.vue")
const GrowthView = () => import("@/views/app/GrowthView.vue")
const ErrorsView = () => import("@/views/app/ErrorsView.vue")
const EspsView = () => import("@/views/app/EspsView.vue")
const ThresholdsView = () => import("@/views/app/ThresholdsView.vue")
const ControlsView = () => import("@/views/app/ControlsView.vue")
const GraphsView = () => import("@/views/app/GraphsView.vue")
const SettingsView = () => import("@/views/app/SettingsView.vue")
const WelcomeView = () => import("@/views/WelcomeView.vue")
const GuideView = () => import("@/views/GuideView.vue")
const AdminAccountsView = () => import("@/views/admin/AdminAccountsView.vue")
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
		path: "/auth/forgot-password",
		name: "forgot-password",
		meta: { layout: "auth" },
		component: ForgotPasswordView,
		beforeEnter: [refreshAuth, redirectAuth],
	},
	{
		path: "/auth/reset-password",
		name: "reset-password",
		meta: { layout: "auth" },
		component: ResetPasswordView,
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
		path: "/app/esps",
		name: "esps",
		meta: { layout: "app" },
		component: EspsView,
		beforeEnter: [refreshAuth, requireAuth],
	},
	{
		path: "/app/home",
		name: "home",
		meta: { layout: "app", esp: true },
		component: HomeView,
		beforeEnter: [refreshAuth, requireAuth, requireEsp],
	},
	{
		path: "/app/graphs",
		name: "graphs",
		meta: { layout: "app", esp: true },
		component: GraphsView,
		beforeEnter: [refreshAuth, requireAuth, requireEsp],
	},
	{
		path: "/app/growth",
		name: "growth",
		meta: { layout: "app", esp: true },
		component: GrowthView,
		beforeEnter: [refreshAuth, requireAuth, requireEsp],
	},
	{
		path: "/app/controls",
		name: "controls",
		meta: { layout: "app", esp: true },
		component: ControlsView,
		beforeEnter: [refreshAuth, requireAuth, requireEsp],
	},
	{
		path: "/app/thresholds",
		name: "thresholds",
		meta: { layout: "app", esp: true },
		component: ThresholdsView,
		beforeEnter: [refreshAuth, requireAuth, requireEsp],
	},
	{
		path: "/app/errors",
		name: "errors",
		meta: { layout: "app", esp: true },
		component: ErrorsView,
		beforeEnter: [refreshAuth, requireAuth, requireEsp],
	},
	// --- Pages that moved, kept so old links still land somewhere
	{ path: "/app/monitor", redirect: "/app/graphs" },
	{ path: "/app/error", redirect: "/app/errors" },
	{ path: "/admin/thresholds", redirect: "/admin/accounts" },
	{ path: "/admin/controls", redirect: "/admin/accounts" },
	{ path: "/admin/esps", redirect: "/admin/accounts" },
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
