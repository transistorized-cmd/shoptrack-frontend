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

describe("Login Component - Error Handling", () => {
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

    wrapper = mount(Login, {
      global: {
        plugins: [mockRouter],
        mocks: {
          $t: (key: string, params?: any) => {
            const translations: Record<string, string> = {
              "auth.signIn": "Sign In",
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

    mockRouter.currentRoute.value = {
      path: initialRoute,
      query: initialQuery,
      params: {},
      name: "Login",
      hash: "",
      fullPath: initialRoute,
      matched: [],
      meta: {},
      redirectedFrom: undefined,
    };
  };

  beforeEach(() => {
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
  });

  describe("Error Handling", () => {
    it("should display login errors", async () => {
      // Update the mock and recreate wrapper to ensure reactivity
      mockAuthStore.error = { message: "Invalid credentials" };
      vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);
      createWrapper();
      await nextTick();

      expect(wrapper.text()).toContain("Translated: Invalid credentials");
    });

    it("should display OAuth errors", async () => {
      // Create a reactive ref for the error
      mockOAuth.error = { value: "OAuth login failed" };
      vi.mocked(useOAuth).mockReturnValue(mockOAuth);
      createWrapper();
      await nextTick();

      expect(wrapper.text()).toContain("Translated: OAuth login failed");
    });

    it("should display WebAuthn errors", async () => {
      // Create a reactive ref for the error
      mockWebAuthn.error = { value: "Passkey authentication failed" };
      vi.mocked(useWebAuthn).mockReturnValue(mockWebAuthn);
      createWrapper();
      await nextTick();

      expect(wrapper.text()).toContain(
        "Translated: Passkey authentication failed",
      );
    });

    it("should show session expired warning", async () => {
      // Update the mock and recreate wrapper to ensure reactivity
      mockAuthStore.sessionExpired = true;
      vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);
      createWrapper();
      await nextTick();

      expect(wrapper.text()).toContain(
        "Your session has expired. Please sign in again.",
      );
    });
  });
});
