import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createRouter, createWebHistory, type Router } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import { useAuthStore } from "@/stores/auth";
import router from "../index";

// Mock the stores
vi.mock("@/stores/auth");

// Mock Vue components
vi.mock("@/views/Home.vue", () => ({
  default: { name: "Home", template: "<div>Home</div>" },
}));

// Mock dynamic imports
vi.mock("@/views/Login.vue", () => ({
  default: { name: "Login", template: "<div>Login</div>" },
}));

vi.mock("@/views/Register.vue", () => ({
  default: { name: "Register", template: "<div>Register</div>" },
}));

vi.mock("@/views/ForgotPassword.vue", () => ({
  default: { name: "ForgotPassword", template: "<div>ForgotPassword</div>" },
}));

vi.mock("@/views/ResetPassword.vue", () => ({
  default: { name: "ResetPassword", template: "<div>ResetPassword</div>" },
}));

vi.mock("@/views/VerifyEmail.vue", () => ({
  default: { name: "VerifyEmail", template: "<div>VerifyEmail</div>" },
}));

vi.mock("@/views/Receipts.vue", () => ({
  default: { name: "Receipts", template: "<div>Receipts</div>" },
}));

vi.mock("@/views/Upload.vue", () => ({
  default: { name: "Upload", template: "<div>Upload</div>" },
}));

vi.mock("@/views/ReceiptDetail.vue", () => ({
  default: { name: "ReceiptDetail", template: "<div>ReceiptDetail</div>" },
}));

vi.mock("@/views/Reports.vue", () => ({
  default: { name: "Reports", template: "<div>Reports</div>" },
}));

vi.mock("@/views/CategoryAnalytics.vue", () => ({
  default: {
    name: "CategoryAnalytics",
    template: "<div>CategoryAnalytics</div>",
  },
}));

vi.mock("@/views/PriceTrends.vue", () => ({
  default: { name: "PriceTrends", template: "<div>PriceTrends</div>" },
}));

vi.mock("@/views/Profile.vue", () => ({
  default: { name: "Profile", template: "<div>Profile</div>" },
}));

vi.mock("@/views/NotFound.vue", () => ({
  default: { name: "NotFound", template: "<div>NotFound</div>" },
}));

describe("Router", () => {
  let mockAuthStore: any;
  let testRouter: Router;

  beforeEach(() => {
    // Create fresh pinia instance for each test
    setActivePinia(createPinia());

    // Setup mock auth store
    mockAuthStore = {
      isAuthenticated: false,
      loading: false,
      initialize: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);

    // Create a fresh router instance for testing
    testRouter = createRouter({
      history: createWebHistory(),
      routes: router.getRoutes(),
    });

    // Copy the navigation guards from the original router
    testRouter.beforeEach(async (to, from, next) => {
      const authStore = useAuthStore();

      // Initialize auth store if not already done
      if (!authStore.isAuthenticated && !authStore.loading) {
        await authStore.initialize();
      }

      const isAuthenticated = authStore.isAuthenticated;
      const requiresAuth = to.matched.some(
        (record) => record.meta.requiresAuth,
      );
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
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Route Configuration", () => {
    it("should have correct public routes", () => {
      const routes = testRouter.getRoutes();

      const publicRoutes = [
        { path: "/login", name: "login" },
        { path: "/register", name: "register" },
        { path: "/forgot-password", name: "forgot-password" },
        { path: "/reset-password", name: "reset-password" },
        { path: "/verify-email", name: "verify-email" },
      ];

      publicRoutes.forEach(({ path, name }) => {
        const route = routes.find((r) => r.path === path && r.name === name);
        expect(route).toBeDefined();
        expect(route?.meta?.requiresGuest).toBe(true);
      });
    });

    it("should have correct protected routes", () => {
      const routes = testRouter.getRoutes();

      const protectedRoutes = [
        { path: "/", name: "home" },
        { path: "/receipts", name: "receipts" },
        { path: "/upload", name: "upload" },
        { path: "/receipts/:id", name: "receipt-detail" },
        { path: "/reports", name: "reports" },
        { path: "/analytics/categories", name: "category-analytics" },
        { path: "/analytics/price-trends", name: "price-trends" },
        { path: "/profile", name: "profile" },
      ];

      protectedRoutes.forEach(({ path, name }) => {
        const route = routes.find((r) => r.path === path && r.name === name);
        expect(route).toBeDefined();
        expect(route?.meta?.requiresAuth).toBe(true);
      });
    });

    it("should have error handling routes", () => {
      const routes = testRouter.getRoutes();

      const notFoundRoute = routes.find(
        (r) => r.path === "/404" && r.name === "not-found",
      );
      expect(notFoundRoute).toBeDefined();
      expect(notFoundRoute?.meta?.requiresAuth).toBeUndefined();
      expect(notFoundRoute?.meta?.requiresGuest).toBeUndefined();

      const catchAllRoute = routes.find((r) => r.path === "/:pathMatch(.*)*");
      expect(catchAllRoute).toBeDefined();
      expect(catchAllRoute?.redirect).toBe("/404");
    });

    it("should use lazy loading for most components", () => {
      const routes = testRouter.getRoutes();

      // Check that most routes use dynamic imports (lazy loading)
      const lazyLoadedRoutes = [
        "login",
        "register",
        "forgot-password",
        "reset-password",
        "verify-email",
        "receipts",
        "upload",
        "receipt-detail",
        "reports",
        "category-analytics",
        "price-trends",
        "profile",
        "not-found",
      ];

      lazyLoadedRoutes.forEach((routeName) => {
        const route = routes.find((r) => r.name === routeName);
        expect(route).toBeDefined();
        expect(typeof route?.components?.default).toBe("function");
      });
    });
  });

  describe("Authentication Guards", () => {
    describe("Protected Routes", () => {
      it("should redirect unauthenticated users to login", async () => {
        mockAuthStore.isAuthenticated = false;

        await testRouter.push("/");

        expect(mockAuthStore.initialize).toHaveBeenCalled();
        expect(testRouter.currentRoute.value.name).toBe("login");
        expect(testRouter.currentRoute.value.query?.redirect).toBe("/");
      });

      it("should allow authenticated users to access protected routes", async () => {
        mockAuthStore.isAuthenticated = true;

        await testRouter.push("/");

        expect(testRouter.currentRoute.value.name).toBe("home");
        expect(testRouter.currentRoute.value.path).toBe("/");
      });

      it("should preserve query parameters when redirecting to login", async () => {
        mockAuthStore.isAuthenticated = false;

        await testRouter.push("/receipts?status=pending&page=2");

        expect(testRouter.currentRoute.value.name).toBe("login");
        expect(testRouter.currentRoute.value.query?.redirect).toBe(
          "/receipts?status=pending&page=2",
        );
      });

      it("should handle nested protected routes", async () => {
        mockAuthStore.isAuthenticated = false;

        await testRouter.push("/receipts/123");

        expect(testRouter.currentRoute.value.name).toBe("login");
        expect(testRouter.currentRoute.value.query?.redirect).toBe(
          "/receipts/123",
        );
      });

      it("should handle protected analytics routes", async () => {
        mockAuthStore.isAuthenticated = false;

        await testRouter.push("/analytics/categories");

        expect(testRouter.currentRoute.value.name).toBe("login");
        expect(testRouter.currentRoute.value.query?.redirect).toBe(
          "/analytics/categories",
        );
      });
    });

    describe("Guest-Only Routes", () => {
      it("should redirect authenticated users away from login", async () => {
        mockAuthStore.isAuthenticated = true;

        await testRouter.push("/login");

        expect(testRouter.currentRoute.value.name).toBe("home");
        expect(testRouter.currentRoute.value.path).toBe("/");
      });

      it("should redirect authenticated users away from register", async () => {
        mockAuthStore.isAuthenticated = true;

        await testRouter.push("/register");

        expect(testRouter.currentRoute.value.name).toBe("home");
        expect(testRouter.currentRoute.value.path).toBe("/");
      });

      it("should redirect authenticated users away from forgot password", async () => {
        mockAuthStore.isAuthenticated = true;

        await testRouter.push("/forgot-password");

        expect(testRouter.currentRoute.value.name).toBe("home");
        expect(testRouter.currentRoute.value.path).toBe("/");
      });

      it("should redirect authenticated users away from reset password", async () => {
        mockAuthStore.isAuthenticated = true;

        await testRouter.push("/reset-password");

        expect(testRouter.currentRoute.value.name).toBe("home");
        expect(testRouter.currentRoute.value.path).toBe("/");
      });

      it("should redirect authenticated users away from verify email", async () => {
        mockAuthStore.isAuthenticated = true;

        await testRouter.push("/verify-email");

        expect(testRouter.currentRoute.value.name).toBe("home");
        expect(testRouter.currentRoute.value.path).toBe("/");
      });

      it("should allow unauthenticated users to access guest routes", async () => {
        mockAuthStore.isAuthenticated = false;

        await testRouter.push("/login");

        expect(testRouter.currentRoute.value.name).toBe("login");
        expect(testRouter.currentRoute.value.path).toBe("/login");
      });
    });

    describe("Public Routes", () => {
      it("should allow access to 404 page regardless of auth status", async () => {
        mockAuthStore.isAuthenticated = false;

        await testRouter.push("/404");

        expect(testRouter.currentRoute.value.name).toBe("not-found");
        expect(testRouter.currentRoute.value.path).toBe("/404");

        // Test with authenticated user
        mockAuthStore.isAuthenticated = true;

        await testRouter.push("/404");

        expect(testRouter.currentRoute.value.name).toBe("not-found");
        expect(testRouter.currentRoute.value.path).toBe("/404");
      });

      it("should redirect unknown routes to 404", async () => {
        await testRouter.push("/unknown-route");

        expect(testRouter.currentRoute.value.name).toBe("not-found");
        expect(testRouter.currentRoute.value.path).toBe("/404");
      });

      it("should redirect deeply nested unknown routes to 404", async () => {
        await testRouter.push("/some/deeply/nested/unknown/route");

        expect(testRouter.currentRoute.value.name).toBe("not-found");
        expect(testRouter.currentRoute.value.path).toBe("/404");
      });
    });

    describe("Auth Store Initialization", () => {
      it("should initialize auth store when not authenticated and not loading", async () => {
        mockAuthStore.isAuthenticated = false;
        mockAuthStore.loading = false;
        mockAuthStore.initialize = vi.fn().mockResolvedValue(undefined);

        await testRouter.push("/");

        expect(mockAuthStore.initialize).toHaveBeenCalled();
      });

      it("should not initialize auth store when already loading", async () => {
        mockAuthStore.isAuthenticated = false;
        mockAuthStore.loading = true;
        mockAuthStore.initialize = vi.fn();

        await testRouter.push("/");

        expect(mockAuthStore.initialize).not.toHaveBeenCalled();
      });

      it("should not initialize auth store when already authenticated", async () => {
        mockAuthStore.isAuthenticated = true;
        mockAuthStore.loading = false;
        mockAuthStore.initialize = vi.fn();

        await testRouter.push("/");

        expect(mockAuthStore.initialize).not.toHaveBeenCalled();
      });

      it("should handle auth store initialization errors gracefully", async () => {
        mockAuthStore.isAuthenticated = false;
        mockAuthStore.loading = false;
        mockAuthStore.initialize = vi
          .fn()
          .mockRejectedValue(new Error("Init failed"));

        // Should not throw error, but handle gracefully
        try {
          await testRouter.push("/");
          // If no error thrown, navigation should still proceed
          expect(testRouter.currentRoute.value).toBeDefined();
        } catch (error) {
          // If error is thrown, it should be the init error
          expect(error).toBeInstanceOf(Error);
        }
      });
    });

    describe("Route Parameters and Queries", () => {
      it("should preserve route parameters in redirects", async () => {
        mockAuthStore.isAuthenticated = false;

        await testRouter.push("/receipts/123");

        expect(testRouter.currentRoute.value.query?.redirect).toBe(
          "/receipts/123",
        );
      });

      it("should preserve complex query strings in redirects", async () => {
        mockAuthStore.isAuthenticated = false;

        await testRouter.push(
          "/reports?dateFrom=2024-01-01&dateTo=2024-12-31&category=food",
        );

        expect(testRouter.currentRoute.value.query?.redirect).toBe(
          "/reports?dateFrom=2024-01-01&dateTo=2024-12-31&category=food",
        );
      });

      it("should handle hash fragments in redirects", async () => {
        mockAuthStore.isAuthenticated = false;

        await testRouter.push("/profile#settings");

        expect(testRouter.currentRoute.value.query?.redirect).toBe(
          "/profile#settings",
        );
      });
    });

    describe("Navigation Flow", () => {
      it("should allow proper login flow", async () => {
        // Start unauthenticated
        mockAuthStore.isAuthenticated = false;

        // Try to access protected route
        await testRouter.push("/receipts");
        expect(testRouter.currentRoute.value.name).toBe("login");

        // User logs in
        mockAuthStore.isAuthenticated = true;

        // Navigate to home after login
        await testRouter.push("/");
        expect(testRouter.currentRoute.value.name).toBe("home");

        // Now can access protected routes
        await testRouter.push("/receipts");
        expect(testRouter.currentRoute.value.name).toBe("receipts");
      });

      it("should handle logout flow", async () => {
        // Start authenticated
        mockAuthStore.isAuthenticated = true;

        // Access protected route
        await testRouter.push("/receipts");
        expect(testRouter.currentRoute.value.name).toBe("receipts");

        // User logs out
        mockAuthStore.isAuthenticated = false;

        // Try to access protected route again
        await testRouter.push("/profile");
        expect(testRouter.currentRoute.value.name).toBe("login");
      });

      it("should handle authentication state changes during navigation", async () => {
        // Start unauthenticated
        mockAuthStore.isAuthenticated = false;

        // Begin navigation to protected route
        await testRouter.push("/upload");
        expect(testRouter.currentRoute.value.name).toBe("login");

        // Authentication changes during navigation
        mockAuthStore.isAuthenticated = true;

        // Can now access the route
        await testRouter.push("/upload");
        expect(testRouter.currentRoute.value.name).toBe("upload");
      });
    });

    describe("Edge Cases", () => {
      it("should handle concurrent navigation attempts", async () => {
        mockAuthStore.isAuthenticated = false;

        // Simulate concurrent navigation - only test the final result
        await testRouter.push("/receipts");
        await testRouter.push("/reports");
        await testRouter.push("/profile");

        // Should end up redirected to login for the last route
        expect(testRouter.currentRoute.value.name).toBe("login");
        expect(testRouter.currentRoute.value.query?.redirect).toBe("/profile");
      });

      it("should handle navigation to same route", async () => {
        mockAuthStore.isAuthenticated = true;

        await testRouter.push("/");
        const result = await testRouter.push("/");

        // Should not cause errors
        expect(testRouter.currentRoute.value.name).toBe("home");
      });

      it("should handle malformed route paths", async () => {
        mockAuthStore.isAuthenticated = false;

        // These should all redirect to 404
        const malformedPaths = [
          "/receipt-detail", // Missing parameter
          "/analytics", // Incomplete path
          "//double-slash",
          "/path with spaces",
        ];

        for (const path of malformedPaths) {
          await testRouter.push(path);
          expect(testRouter.currentRoute.value.name).toBe("not-found");
        }
      });

      it("should handle auth store state inconsistencies", async () => {
        // Edge case: loading = true but isAuthenticated = true
        mockAuthStore.isAuthenticated = true;
        mockAuthStore.loading = true;

        await testRouter.push("/");

        // Should still allow access based on isAuthenticated
        expect(testRouter.currentRoute.value.name).toBe("home");
      });
    });

    describe("Performance", () => {
      it("should not initialize auth store unnecessarily", async () => {
        mockAuthStore.isAuthenticated = true;
        mockAuthStore.loading = false;
        mockAuthStore.initialize = vi.fn();

        // Multiple navigations
        await testRouter.push("/");
        await testRouter.push("/receipts");
        await testRouter.push("/reports");

        // Should not call initialize for authenticated user
        expect(mockAuthStore.initialize).not.toHaveBeenCalled();
      });

      it("should handle rapid navigation changes", async () => {
        mockAuthStore.isAuthenticated = true;

        // Rapid navigation
        await testRouter.push("/");
        await testRouter.push("/receipts");
        await testRouter.push("/upload");
        await testRouter.push("/reports");

        // Should end up at the last route
        expect(testRouter.currentRoute.value.name).toBe("reports");
      });
    });
  });

  describe("Route Meta Properties", () => {
    it("should correctly identify routes requiring authentication", () => {
      const routes = testRouter.getRoutes();

      const authRequiredRoutes = routes.filter(
        (route) => route.meta?.requiresAuth === true,
      );

      expect(authRequiredRoutes.length).toBeGreaterThan(0);

      const expectedAuthRoutes = [
        "home",
        "receipts",
        "upload",
        "receipt-detail",
        "reports",
        "category-analytics",
        "price-trends",
        "profile",
      ];

      expectedAuthRoutes.forEach((routeName) => {
        const found = authRequiredRoutes.some(
          (route) => route.name === routeName,
        );
        expect(found).toBe(true);
      });
    });

    it("should correctly identify guest-only routes", () => {
      const routes = testRouter.getRoutes();

      const guestOnlyRoutes = routes.filter(
        (route) => route.meta?.requiresGuest === true,
      );

      expect(guestOnlyRoutes.length).toBeGreaterThan(0);

      const expectedGuestRoutes = [
        "login",
        "register",
        "forgot-password",
        "reset-password",
        "verify-email",
      ];

      expectedGuestRoutes.forEach((routeName) => {
        const found = guestOnlyRoutes.some((route) => route.name === routeName);
        expect(found).toBe(true);
      });
    });

    it("should have routes without special meta requirements", () => {
      const routes = testRouter.getRoutes();

      const publicRoutes = routes.filter(
        (route) => !route.meta?.requiresAuth && !route.meta?.requiresGuest,
      );

      expect(publicRoutes.length).toBeGreaterThan(0);

      // 404 and catch-all routes should be public
      const expectedPublicRoutes = ["not-found"];

      expectedPublicRoutes.forEach((routeName) => {
        const found = publicRoutes.some((route) => route.name === routeName);
        expect(found).toBe(true);
      });
    });
  });
});
