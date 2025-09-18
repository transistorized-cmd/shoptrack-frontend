import { vi } from "vitest";
import { createRouter, createWebHistory, type RouteLocationNormalizedLoaded } from "vue-router";

export const createMockRouter = (initialRoute = "/") => {
  // Create a real router instance with mock history for better compatibility
  const mockRouter = createRouter({
    history: createWebHistory(),
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
