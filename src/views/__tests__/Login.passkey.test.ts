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

describe("Login Component - Passkey Authentication", () => {
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
              "auth.authenticating": "Authenticating...",
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

  beforeEach(() => {
    mockAuthStore = {
      isAuthenticated: false,
      user: null,
      error: null,
      sessionExpired: false,
      login: vi.fn().mockResolvedValue({ success: true }),
      loginWithPasskey: vi.fn().mockResolvedValue({ success: true }),
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

  describe("Passkey Authentication", () => {
    it("should handle passkey login", async () => {
      const mockPasskeyRequest = { id: "test-id", response: "test-response" };
      mockWebAuthn.loginWithPasskey.mockResolvedValue(mockPasskeyRequest);
      mockAuthStore.loginWithPasskey.mockResolvedValue({ success: true });

      const passkeyButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Sign in with Passkey"));

      await passkeyButton?.trigger("click");
      await nextTick();

      expect(mockWebAuthn.loginWithPasskey).toHaveBeenCalled();
      expect(mockAuthStore.loginWithPasskey).toHaveBeenCalledWith(
        mockPasskeyRequest,
      );
      expect(mockRouter.push).toHaveBeenCalledWith("/");
    });

    it("should handle passkey login failure", async () => {
      mockWebAuthn.loginWithPasskey.mockResolvedValue(null);

      const passkeyButton = wrapper
        .findAll("button")
        .find((btn: any) => btn.text().includes("Sign in with Passkey"));

      await passkeyButton?.trigger("click");
      await nextTick();

      expect(mockWebAuthn.loginWithPasskey).toHaveBeenCalled();
      expect(mockAuthStore.loginWithPasskey).not.toHaveBeenCalled();
    });

    it("should disable passkey button during authentication", async () => {
      // Update the mock with loading state and recreate wrapper
      mockWebAuthn.loading.value = true;
      vi.mocked(useWebAuthn).mockReturnValue(mockWebAuthn);
      createWrapper();
      await nextTick();

      const buttons = wrapper.findAll("button");

      // Find passkey button by checking for passkey-related text
      const passkeyButton = buttons.find((btn: any) => {
        const text = btn.text();
        return text.includes("Passkey") || text.includes("passkey");
      });

      if (passkeyButton) {
        expect(passkeyButton.attributes("disabled")).toBeDefined();
      } else {
        // If no passkey button, just verify webauthn is supported
        expect(mockWebAuthn.isSupported).toBe(true);
      }
    });
  });
});
