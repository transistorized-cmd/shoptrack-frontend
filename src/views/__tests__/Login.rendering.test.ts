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

describe("Login Component - Rendering", () => {
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

  it("should render the login form with all elements", () => {
    expect(wrapper.find("h2").text()).toBe("Sign In");
    expect(wrapper.find("#email").exists()).toBe(true);
    expect(wrapper.find("#password").exists()).toBe(true);
    expect(wrapper.find("#remember-me").exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it("should render create account link", () => {
    const createAccountLink = wrapper.find('a[href="/register"]');
    expect(createAccountLink.exists()).toBe(true);
    expect(createAccountLink.text()).toBe("Create Account");
  });

  it("should render forgot password link", () => {
    const forgotPasswordLink = wrapper.find('a[href="/forgot-password"]');
    expect(forgotPasswordLink.exists()).toBe(true);
    expect(forgotPasswordLink.text()).toBe("Forgot Password?");
  });

  it("should render passkey login button when supported", () => {
    const passkeyButton = wrapper
      .findAll("button")
      .find((btn: any) => btn.text().includes("Sign in with Passkey"));
    expect(passkeyButton?.exists()).toBe(true);
    expect(passkeyButton?.text()).toContain("Sign in with Passkey");
  });

  it("should not render passkey button when not supported", async () => {
    mockWebAuthn.isSupported = false;
    await wrapper.vm.$forceUpdate();
    await nextTick();

    const passkeyButtons = wrapper
      .findAll("button")
      .filter((btn: any) => btn.text().includes("Sign in with Passkey"));
    expect(passkeyButtons.length).toBe(0);
  });
});
