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

describe("Login Component - Form Input Handling", () => {
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

  it("should update email input value", async () => {
    const emailInput = wrapper.find("#email");
    await emailInput.setValue("test@example.com");

    expect((emailInput.element as HTMLInputElement).value).toBe(
      "test@example.com",
    );
  });

  it("should update password input value", async () => {
    const passwordInput = wrapper.find("#password");
    await passwordInput.setValue("password123");

    expect((passwordInput.element as HTMLInputElement).value).toBe(
      "password123",
    );
  });

  it("should toggle password visibility", async () => {
    const passwordInput = wrapper.find("#password");
    const toggleButton = wrapper.find('button[type="button"]');

    expect(passwordInput.attributes("type")).toBe("password");

    await toggleButton.trigger("click");
    expect(passwordInput.attributes("type")).toBe("text");

    await toggleButton.trigger("click");
    expect(passwordInput.attributes("type")).toBe("password");
  });

  it("should handle remember me checkbox", async () => {
    const checkbox = wrapper.find("#remember-me");
    expect((checkbox.element as HTMLInputElement).checked).toBe(false);

    await checkbox.setChecked(true);
    expect((checkbox.element as HTMLInputElement).checked).toBe(true);
  });
});