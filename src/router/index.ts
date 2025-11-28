import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import Home from "@/views/Home.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public routes
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/Login.vue"),
      meta: { requiresGuest: true },
    },
    {
      path: "/register",
      name: "register",
      component: () => import("@/views/Register.vue"),
      meta: { requiresGuest: true },
    },
    {
      path: "/forgot-password",
      name: "forgot-password",
      component: () => import("@/views/ForgotPassword.vue"),
      meta: { requiresGuest: true },
    },
    {
      path: "/reset-password",
      name: "reset-password",
      component: () => import("@/views/ResetPassword.vue"),
      meta: { requiresGuest: true },
    },
    {
      path: "/verify-email",
      name: "verify-email",
      component: () => import("@/views/VerifyEmail.vue"),
      meta: { requiresGuest: true },
    },

    // Protected routes
    {
      path: "/",
      name: "home",
      component: Home,
      meta: { requiresAuth: true },
    },
    {
      path: "/receipts",
      name: "receipts",
      component: () => import("@/views/Receipts.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/upload",
      name: "upload",
      component: () => import("@/views/Upload.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/receipts/:id",
      name: "receipt-detail",
      component: () => import("@/views/ReceiptDetail.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/reports",
      name: "reports",
      component: () => import("@/views/Reports.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/analytics/categories",
      name: "category-analytics",
      component: () => import("@/views/CategoryAnalytics.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/analytics/price-trends",
      name: "price-trends",
      component: () => import("@/views/PriceTrends.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/analytics/purchase-patterns",
      name: "purchase-patterns",
      component: () => import("@/views/PurchasePatterns.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/analytics/predictions",
      name: "prediction-insights",
      component: () => import("@/views/PredictionInsights.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/profile",
      name: "profile",
      component: () => import("@/views/Profile.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/billing",
      name: "billing",
      component: () => import("@/views/Billing.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/subscription-plans",
      name: "subscription-plans",
      component: () => import("@/views/SubscriptionPlans.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/subscription",
      name: "subscription",
      component: () => import("@/views/Subscription.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/subscription/success",
      name: "subscription-success",
      component: () => import("@/views/SubscriptionSuccess.vue"),
      meta: { requiresAuth: true },
    },

    // Error pages
    {
      path: "/404",
      name: "not-found",
      component: () => import("@/views/NotFound.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/404",
    },
  ],
});

// Navigation guards
router.beforeEach(async (to, from, next) => {
  try {
    const authStore = useAuthStore();

    // Temporarily disable router auth initialization to debug hanging /me endpoint
    // The router guard was causing automatic logout due to hanging /api/auth/me calls
    /*
    if (!authStore.isAuthenticated && !authStore.loading) {
      try {
        await authStore.initialize();
      } catch (initError: any) {
        // Don't block navigation if auth initialization fails
        // 401 errors are expected when user is not logged in
        if (initError?.response?.status !== 401 && initError?.status !== 401) {
          console.warn("Auth initialization failed in router guard:", initError);
        }
        // Continue with navigation assuming user is not authenticated
      }
    }
    */

    const isAuthenticated = authStore.isAuthenticated;
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
    const requiresGuest = to.matched.some(
      (record) => record.meta.requiresGuest,
    );

    if (requiresAuth && !isAuthenticated) {
      // Redirect to login with return URL
      next({
        path: "/login",
        query: { redirect: to.fullPath },
      });
    } else if (requiresGuest && isAuthenticated) {
      // Redirect authenticated users away from auth pages
      next("/");
    } else {
      next();
    }
  } catch (error: any) {
    console.error("Navigation guard error:", error);

    // For authentication-related routes, still allow navigation to prevent blocking
    if (
      to.path.startsWith("/login") ||
      to.path.startsWith("/register") ||
      to.path.startsWith("/forgot-password")
    ) {
      next();
      return;
    }

    // For protected routes where auth check failed, redirect to login
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
    if (requiresAuth) {
      next({
        path: "/login",
        query: { redirect: to.fullPath },
      });
    } else {
      // For public routes, allow navigation to continue
      next();
    }
  }
});

export default router;
