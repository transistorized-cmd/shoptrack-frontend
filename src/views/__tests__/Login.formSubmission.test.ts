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

describe("Login Component - Form Submission", () => {
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
      fullPath:
        initialRoute +
        (Object.keys(initialQuery).length > 0
          ? "?" + new URLSearchParams(initialQuery as any).toString()
          : ""),
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
              "auth.signingIn": "Signing in...",
              "common.or": "Or",
              "auth.createAccount": "Create Account",
              "auth.forgotPassword": "Forgot Password?",
              "auth.signInWithPasskey": "Sign in with Passkey",
              "auth.sessionExpired":
                "Your session has expired. Please sign in again.",
              "common.error": "Error",
              "auth.email": "Email",
              "auth.password": "Password",
              "auth.rememberMe": "Remember me",
              "auth.continueWith": "Continue with",
              "auth.iAgreeToThe": "I agree to the",
              "auth.termsOfService": "Terms of Service",
              "auth.and": "and",
              "auth.privacyPolicy": "Privacy Policy",
              "auth.securityNoticeRegistration": "Registration",
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

  beforeEach(async () => {
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

    mockWebAuthn = {
      isSupported: true,
      loading: { value: false },
      error: { value: null },
      loginWithPasskey: vi.fn(),
      clearError: vi.fn(),
      resetState: vi.fn(),
    };
    vi.mocked(useWebAuthn).mockReturnValue(mockWebAuthn);

    mockOAuth = {
      loading: false,
      error: { value: null },
      loginWithGoogle: vi.fn(),
      loginWithApple: vi.fn(),
      clearError: vi.fn(),
    };
    vi.mocked(useOAuth).mockReturnValue(mockOAuth);

    createWrapper();

    // Set up form inputs after wrapper is created
    const emailInput = wrapper.find("#email");
    const passwordInput = wrapper.find("#password");
    await emailInput.setValue("test@example.com");
    await passwordInput.setValue("password123");
  });

  describe("Form Submission", () => {
    it("should call login on form submission", async () => {
      // Verify the form inputs are filled
      const emailInput = wrapper.find("#email");
      const passwordInput = wrapper.find("#password");
      expect((emailInput.element as HTMLInputElement).value).toBe(
        "test@example.com",
      );
      expect((passwordInput.element as HTMLInputElement).value).toBe(
        "password123",
      );

      const form = wrapper.find("form");
      await form.trigger("submit");

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockAuthStore.login).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        rememberMe: false,
      });
    });

    it("should handle remember me option", async () => {
      mockAuthStore.login.mockResolvedValue({ success: true });

      const checkbox = wrapper.find("#remember-me");
      await checkbox.setChecked(true);

      const form = wrapper.find("form");
      await form.trigger("submit");

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockAuthStore.login).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        rememberMe: true,
      });
    });

    it("should show loading state during submission", async () => {
      mockAuthStore.login.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true }), 100),
          ),
      );

      const form = wrapper.find("form");
      const submitButton = wrapper.find('button[type="submit"]');

      await form.trigger("submit");
      await nextTick();

      expect(submitButton.text()).toBe("Signing in...");
      expect(submitButton.attributes("disabled")).toBeDefined();
    });

    it("should redirect to home on successful login", async () => {
      mockAuthStore.login.mockResolvedValue({ success: true });

      const form = wrapper.find("form");
      await form.trigger("submit");

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mockRouter.push).toHaveBeenCalledWith("/");
    });

    describe("with redirect query", () => {
      beforeEach(async () => {
        createWrapper("/login", { redirect: "/dashboard" });

        // Set up form inputs after wrapper is created with redirect query
        const emailInput = wrapper.find("#email");
        const passwordInput = wrapper.find("#password");
        await emailInput.setValue("test@example.com");
        await passwordInput.setValue("password123");
      });

      it("should redirect to specified redirect URL", async () => {
        mockAuthStore.login.mockResolvedValue({ success: true });

        const form = wrapper.find("form");
        await form.trigger("submit");

        await new Promise((resolve) => setTimeout(resolve, 200));

        expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("should not redirect with invalid redirect URL", async () => {
      createWrapper("/login", { redirect: "https://evil.com" });
      const emailInput = wrapper.find("#email");
      const passwordInput = wrapper.find("#password");
      await emailInput.setValue("test@example.com");
      await passwordInput.setValue("password123");
      mockAuthStore.login.mockResolvedValue({ success: true });

      const form = wrapper.find("form");
      await form.trigger("submit");

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mockRouter.push).toHaveBeenCalledWith("/");
    });

    it("should not submit form with empty fields", async () => {
      const emailInput = wrapper.find("#email");
      await emailInput.setValue("");
      const form = wrapper.find("form");
      await form.trigger("submit");

      expect(mockAuthStore.login).not.toHaveBeenCalled();
    });
  });
});
