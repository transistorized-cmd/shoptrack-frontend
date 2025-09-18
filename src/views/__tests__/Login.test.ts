import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import Login from "../Login.vue";
import { createMockRouter } from "../../../tests/utils/router";
import { useAuthStore } from "@/stores/auth";
import { useWebAuthn } from "@/composables/useWebAuthn";
import { useOAuth } from "@/composables/useOAuth";

// Mock dependencies
vi.mock("@/stores/auth");
vi.mock("@/composables/useWebAuthn");
vi.mock("@/composables/useOAuth");
vi.mock("@/utils/errorTranslation", () => ({
  translateError: vi.fn((error) => `Translated: ${error}`),
}));

describe("Login Component", () => {
  let wrapper: any;
  let mockAuthStore: any;
  let mockWebAuthn: any;
  let mockOAuth: any;
  let mockRouter: any;

  const createWrapper = (initialRoute = "/login", initialQuery = {}) => {
    const { mockRouter: router } = createMockRouter(initialRoute);
    mockRouter = router;

    // Mock router.push method specifically
    vi.spyOn(mockRouter, "push").mockResolvedValue(undefined as any);

    // Set up the current route with query parameters BEFORE mounting
    const mockRoute = {
      path: initialRoute,
      query: initialQuery,
      params: {},
      name: "Login",
      hash: "",
      fullPath: initialRoute + (Object.keys(initialQuery).length > 0 ? '?' + new URLSearchParams(initialQuery as any).toString() : ''),
      matched: [],
      meta: {},
      redirectedFrom: undefined,
    };

    mockRouter.currentRoute.value = mockRoute;

    wrapper = mount(Login, {
      global: {
        plugins: [mockRouter],
        mocks: {
          $t: (key: string, params?: any) => {
            const translations: Record<string, string> = {
              "auth.signIn": "Sign In",
              "common.or": "Or",
              "auth.createAccount": "Create Account",
              "common.error": "Error",
              "auth.sessionExpired":
                "Your session has expired. Please sign in again.",
              "auth.email": "Email",
              "auth.password": "Password",
              "auth.rememberMe": "Remember Me",
              "auth.forgotPassword": "Forgot Password?",
              "auth.signingIn": "Signing in...",
              "auth.continueWith": "Continue with",
              "auth.authenticating": "Authenticating...",
              "auth.signInWithPasskey": "Sign in with Passkey",
              "auth.iAgreeToThe": "I agree to the",
              "auth.termsOfService": "Terms of Service",
              "auth.and": "and",
              "auth.privacyPolicy": "Privacy Policy",
              "auth.securityNoticeRegistration":
                "Your data is encrypted and secure.",
            };
            return translations[key] || key;
          },
        },
      },
      props: {
        initialRoute: initialRoute,
        initialQuery: initialQuery,
      },
    });
  };

  beforeEach(() => {
    // Mock auth store
    mockAuthStore = {
      isAuthenticated: false,
      user: null,
      error: null,
      sessionExpired: false,
      login: vi.fn().mockResolvedValue({ success: true }),
      loginWithPasskey: vi.fn(),
      clearError: vi.fn(),
      setError: vi.fn(),
    };
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);

    // Mock WebAuthn composable
    mockWebAuthn = {
      isSupported: true,
      loading: { value: false },
      error: { value: null },
      loginWithPasskey: vi.fn(),
      clearError: vi.fn(),
      resetState: vi.fn(),
    };
    vi.mocked(useWebAuthn).mockReturnValue(mockWebAuthn);

    // Mock OAuth composable
    mockOAuth = {
      loading: false,
      error: { value: null },
      loginWithGoogle: vi.fn(),
      loginWithApple: vi.fn(),
      clearError: vi.fn(),
    };
    vi.mocked(useOAuth).mockReturnValue(mockOAuth);

    createWrapper();
  });

  

  describe("Component Lifecycle", () => {
    it("should clear errors on mount", () => {
      expect(mockAuthStore.clearError).toHaveBeenCalled();
      expect(mockOAuth.clearError).toHaveBeenCalled();
      expect(mockWebAuthn.clearError).toHaveBeenCalled();
    });

    it("should handle query error parameter", async () => {
      createWrapper("/login", { error: "Login failed" });
      await nextTick();

      expect(mockAuthStore.setError).toHaveBeenCalledWith({
        code: "FORM_LOGIN_ERROR",
        message: "Login failed",
      });
    });

    it("should redirect already authenticated users", async () => {
      mockAuthStore.isAuthenticated = true;
      vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);
      createWrapper();

      await nextTick();

      expect(mockRouter.push).toHaveBeenCalledWith("/");
    });

    it("should redirect to specified URL for authenticated users", async () => {
      mockAuthStore.isAuthenticated = true;
      vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);
      createWrapper("/login", { redirect: "/dashboard" });

      await nextTick();

      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Input Validation", () => {
    it("should prevent form submission with empty email", async () => {
      const emailInput = wrapper.find("#email");
      await emailInput.setValue("");
      const passwordInput = wrapper.find("#password");
      await passwordInput.setValue("password123");

      const form = wrapper.find("form");
      await form.trigger("submit");
      await nextTick();

      expect(mockAuthStore.login).not.toHaveBeenCalled();
    });

    it("should prevent form submission with empty password", async () => {
      const emailInput = wrapper.find("#email");
      await emailInput.setValue("test@example.com");
      const passwordInput = wrapper.find("#password");
      await passwordInput.setValue("");

      const form = wrapper.find("form");
      await form.trigger("submit");
      await nextTick();

      expect(mockAuthStore.login).not.toHaveBeenCalled();
    });

    it("should enable submit button with valid inputs", async () => {
      const emailInput = wrapper.find("#email");
      const passwordInput = wrapper.find("#password");

      await emailInput.setValue("test@example.com");
      await passwordInput.setValue("password123");

      // Wait for reactivity
      await nextTick();

      const submitButton = wrapper.find('button[type="submit"]');
      expect(submitButton.attributes("disabled")).toBeUndefined();
    });
  });

  describe("Accessibility", () => {
    it("should have proper form labels", () => {
      expect(wrapper.find('label[for="email"]').exists()).toBe(true);
      expect(wrapper.find('label[for="password"]').exists()).toBe(true);
      expect(wrapper.find('label[for="remember-me"]').exists()).toBe(true);
    });

    it("should have proper input attributes", () => {
      const emailInput = wrapper.find("#email");
      const passwordInput = wrapper.find("#password");

      expect(emailInput.attributes("type")).toBe("email");
      expect(emailInput.attributes("autocomplete")).toBe("username");
      expect(emailInput.attributes("required")).toBeDefined();

      expect(passwordInput.attributes("type")).toBe("password");
      expect(passwordInput.attributes("autocomplete")).toBe("current-password");
      expect(passwordInput.attributes("required")).toBeDefined();
    });

    it("should have proper form structure for password managers", () => {
      const form = wrapper.find("#login-form");
      expect(form.exists()).toBe(true);
      expect(form.attributes("method")).toBe("post");
      expect(form.attributes("action")).toBe("/login");
    });
  });
});