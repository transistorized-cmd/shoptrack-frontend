import { vi } from "vitest";
import { createRouter, createMemoryHistory, type RouteLocationNormalizedLoaded } from "vue-router";

export const createMockRouter = (initialRoute = "/") => {
  // Create a real router instance with memory history for testing
  const mockRouter = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "Home", component: { template: "<div>Home</div>" } },
      {
        path: "/login",
        name: "Login",
        component: { template: "<div>Login</div>" },
      },
      {
        path: "/register",
        name: "Register",
        component: { template: "<div>Register</div>" },
      },
      {
        path: "/forgot-password",
        name: "ForgotPassword",
        component: { template: "<div>ForgotPassword</div>" },
      },
      {
        path: "/reset-password",
        name: "ResetPassword",
        component: { template: "<div>ResetPassword</div>" },
      },
      {
        path: "/receipt-detail/:id",
        name: "receipt-detail",
        component: { template: "<div>ReceiptDetail</div>" },
      },
      {
        path: "/receipts",
        name: "Receipts",
        component: { template: "<div>Receipts</div>" },
      },
      {
        path: "/reports",
        name: "Reports",
        component: { template: "<div>Reports</div>" },
      },
      {
        path: "/analytics/categories",
        name: "analytics-categories",
        component: { template: "<div>CategoryAnalytics</div>" },
      },
      {
        path: "/upload",
        name: "Upload",
        component: { template: "<div>Upload</div>" },
      },
      {
        path: "/receipts/:id",
        name: "ReceiptDetail",
        component: { template: "<div>ReceiptDetail</div>" },
      },
      {
        path: "/profile",
        name: "Profile",
        component: { template: "<div>Profile</div>" },
      },
    ],
  });

  // Mock router methods that tests might use
  vi.spyOn(mockRouter, "push").mockResolvedValue(undefined as any);
  vi.spyOn(mockRouter, "replace").mockResolvedValue(undefined as any);
  vi.spyOn(mockRouter, "go").mockImplementation(() => {});
  vi.spyOn(mockRouter, "back").mockImplementation(() => {});
  vi.spyOn(mockRouter, "forward").mockImplementation(() => {});

  // Mock the resolve method to handle invalid inputs gracefully
  vi.spyOn(mockRouter, "resolve").mockImplementation((to: any) => {
    // Handle invalid inputs that might cause NaN errors
    if (typeof to !== "string" && typeof to !== "object") {
      console.warn("Invalid route location passed to router.resolve:", to);
      return {
        href: "/",
        fullPath: "/",
        path: "/",
        name: "Home",
        params: {},
        query: {},
        hash: "",
        matched: [],
        meta: {},
        redirectedFrom: undefined,
      } as any;
    }

    // For valid inputs, return a sensible default
    const path = typeof to === "string" ? to : (to.path || "/");
    return {
      href: path,
      fullPath: path,
      path: path,
      name: path === "/" ? "Home" : undefined,
      params: {},
      query: {},
      hash: "",
      matched: [],
      meta: {},
      redirectedFrom: undefined,
    } as any;
  });

  const mockRoute: Partial<RouteLocationNormalizedLoaded> = {
    path: initialRoute,
    name: "Home",
    params: {},
    query: {},
    hash: "",
    fullPath: initialRoute,
    matched: [],
    meta: {},
    redirectedFrom: undefined,
  };

  return { mockRouter, mockRoute };
};
