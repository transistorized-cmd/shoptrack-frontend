import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { nextTick } from "vue";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { authService } from "@/services/auth.service";

// Mock authService
vi.mock("@/services/auth.service", () => ({
  authService: {
    getPasskeyCreationOptions: vi.fn(),
    getPasskeyRequestOptions: vi.fn(),
  },
}));

// Setup WebAuthn mocks before importing the composable
const mockCredentials = {
  create: vi.fn(),
  get: vi.fn(),
};

const mockPublicKeyCredential = {
  rawId: new ArrayBuffer(32),
  response: {
    clientDataJSON: new ArrayBuffer(128),
    authenticatorData: new ArrayBuffer(64),
    getPublicKey: vi.fn().mockReturnValue(new ArrayBuffer(65)),
    attestationObject: new ArrayBuffer(256),
    signature: new ArrayBuffer(70),
  },
};

// Mock global window with WebAuthn support
Object.defineProperty(globalThis, "window", {
  value: {
    navigator: {
      credentials: mockCredentials,
    },
    PublicKeyCredential: function PublicKeyCredential() {},
    btoa: vi.fn((str: string) => Buffer.from(str, "binary").toString("base64")),
    atob: vi.fn((str: string) => Buffer.from(str, "base64").toString("binary")),
    TextEncoder: class {
      encode(str: string) {
        return new Uint8Array(str.split("").map((c) => c.charCodeAt(0)));
      }
    },
  },
  writable: true,
  configurable: true,
});

// Add isUserVerifyingPlatformAuthenticatorAvailable to the constructor
(
  globalThis.window.PublicKeyCredential as any
).isUserVerifyingPlatformAuthenticatorAvailable = vi
  .fn()
  .mockResolvedValue(true);

// Also set it globally
Object.defineProperty(globalThis, "PublicKeyCredential", {
  value: globalThis.window.PublicKeyCredential,
  writable: true,
  configurable: true,
});

// Set up navigator globally
Object.defineProperty(globalThis, "navigator", {
  value: globalThis.window.navigator,
  writable: true,
  configurable: true,
});

// Mock globals
global.btoa = globalThis.window.btoa;
global.atob = globalThis.window.atob;

// Import the composable after setting up mocks
import { useWebAuthn } from "../useWebAuthn";

describe("useWebAuthn Composable", () => {
  let wrapper: any;

  const TestComponent = defineComponent({
    setup() {
      return useWebAuthn();
    },
    template: "<div>test</div>",
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockCredentials.create.mockResolvedValue(mockPublicKeyCredential);
    mockCredentials.get.mockResolvedValue(mockPublicKeyCredential);
    (
      globalThis.window.PublicKeyCredential as any
    ).isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    vi.restoreAllMocks();
  });

  describe("Initialization and Support Detection", () => {
    it("should initialize with correct default values", () => {
      wrapper = mount(TestComponent);

      expect(wrapper.vm.loading).toBe(false);
      expect(wrapper.vm.error).toBeNull();
      expect(wrapper.vm.isSupported).toBe(true);
    });

    it("should detect WebAuthn support correctly", () => {
      wrapper = mount(TestComponent);

      expect(wrapper.vm.isSupported).toBe(true);
    });

    it("should check platform authenticator availability", async () => {
      wrapper = mount(TestComponent);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));
      await nextTick();

      expect(
        (globalThis.window.PublicKeyCredential as any)
          .isUserVerifyingPlatformAuthenticatorAvailable,
      ).toHaveBeenCalled();
    });
  });

  describe("State Management", () => {
    it("should clear error when clearError is called", async () => {
      wrapper = mount(TestComponent);

      // Set an error manually (simulating an error state)
      const composable = useWebAuthn();
      composable.error.value = "Test error";
      await nextTick();

      composable.clearError();
      await nextTick();

      expect(composable.error.value).toBeNull();
    });

    it("should reset state when resetState is called", async () => {
      wrapper = mount(TestComponent);

      const composable = useWebAuthn();
      composable.loading.value = true;
      composable.error.value = "Test error";
      await nextTick();

      composable.resetState();
      await nextTick();

      expect(composable.loading.value).toBe(false);
      expect(composable.error.value).toBeNull();
    });
  });

  describe("Passkey Registration", () => {
    const mockCreationOptions = {
      challenge: "dGVzdC1jaGFsbGVuZ2U=",
      rp: { name: "Test App", id: "example.com" },
      user: {
        id: "user-id",
        name: "test@example.com",
        displayName: "Test User",
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      timeout: 60000,
      excludeCredentials: [{ type: "public-key", id: "existing-cred-id" }],
    };

    it("should register passkey successfully", async () => {
      const mockAuthService = authService as any;
      mockAuthService.getPasskeyCreationOptions.mockResolvedValue(
        mockCreationOptions,
      );

      wrapper = mount(TestComponent);

      const result = await wrapper.vm.registerPasskey();

      expect(mockAuthService.getPasskeyCreationOptions).toHaveBeenCalled();
      expect(mockCredentials.create).toHaveBeenCalled();
      expect(result).toEqual({
        credentialId: expect.any(String),
        publicKey: expect.any(String),
        authenticatorData: expect.any(String),
        clientDataJSON: expect.any(String),
        attestationObject: expect.any(String),
      });
      expect(wrapper.vm.loading).toBe(false);
    });

    it("should handle WebAuthn not supported error", async () => {
      // Temporarily remove WebAuthn support
      const originalWindow = globalThis.window;
      Object.defineProperty(globalThis, "window", {
        value: { navigator: {} },
        configurable: true,
      });

      wrapper = mount(TestComponent);

      const result = await wrapper.vm.registerPasskey();

      expect(result).toBeNull();
      expect(wrapper.vm.error).toBe(
        "WebAuthn is not supported by this browser",
      );

      // Restore window
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
      });
    });

    it("should handle credential creation failure", async () => {
      const mockAuthService = authService as any;
      mockAuthService.getPasskeyCreationOptions.mockResolvedValue(
        mockCreationOptions,
      );
      mockCredentials.create.mockResolvedValue(null);

      wrapper = mount(TestComponent);

      const result = await wrapper.vm.registerPasskey();

      expect(result).toBeNull();
      expect(wrapper.vm.error).toBe("Failed to create credential");
    });

    it("should handle NotAllowedError during registration", async () => {
      const mockAuthService = authService as any;
      mockAuthService.getPasskeyCreationOptions.mockResolvedValue(
        mockCreationOptions,
      );

      const error = new Error("User cancelled");
      error.name = "NotAllowedError";
      mockCredentials.create.mockRejectedValue(error);

      wrapper = mount(TestComponent);

      const result = await wrapper.vm.registerPasskey();

      expect(result).toBeNull();
      expect(wrapper.vm.error).toBe(
        "Passkey registration was cancelled or not allowed",
      );
    });

    it("should handle InvalidStateError during registration", async () => {
      const mockAuthService = authService as any;
      mockAuthService.getPasskeyCreationOptions.mockResolvedValue(
        mockCreationOptions,
      );

      const error = new Error("Invalid state");
      error.name = "InvalidStateError";
      mockCredentials.create.mockRejectedValue(error);

      wrapper = mount(TestComponent);

      const result = await wrapper.vm.registerPasskey();

      expect(result).toBeNull();
      expect(wrapper.vm.error).toBe(
        "A passkey for this account already exists on this device",
      );
    });

    it("should handle NotSupportedError during registration", async () => {
      const mockAuthService = authService as any;
      mockAuthService.getPasskeyCreationOptions.mockResolvedValue(
        mockCreationOptions,
      );

      const error = new Error("Not supported");
      error.name = "NotSupportedError";
      mockCredentials.create.mockRejectedValue(error);

      wrapper = mount(TestComponent);

      const result = await wrapper.vm.registerPasskey();

      expect(result).toBeNull();
      expect(wrapper.vm.error).toBe(
        "Passkeys are not supported on this device",
      );
    });

    it("should handle generic errors during registration", async () => {
      const mockAuthService = authService as any;
      mockAuthService.getPasskeyCreationOptions.mockResolvedValue(
        mockCreationOptions,
      );
      mockCredentials.create.mockRejectedValue(new Error("Generic error"));

      wrapper = mount(TestComponent);

      const result = await wrapper.vm.registerPasskey();

      expect(result).toBeNull();
      expect(wrapper.vm.error).toBe("Generic error");
    });
  });

  describe("Passkey Login", () => {
    const mockRequestOptions = {
      challenge: "dGVzdC1jaGFsbGVuZ2U=",
      timeout: 60000,
      rpId: "example.com",
      allowCredentials: [{ type: "public-key", id: "existing-cred-id" }],
      userVerification: "required",
    };

    it("should login with passkey successfully", async () => {
      const mockAuthService = authService as any;
      mockAuthService.getPasskeyRequestOptions.mockResolvedValue(
        mockRequestOptions,
      );

      wrapper = mount(TestComponent);

      const result = await wrapper.vm.loginWithPasskey();

      expect(mockAuthService.getPasskeyRequestOptions).toHaveBeenCalled();
      expect(mockCredentials.get).toHaveBeenCalled();
      expect(result).toEqual({
        credentialId: expect.any(String),
        authenticatorData: expect.any(String),
        clientDataJSON: expect.any(String),
        signature: expect.any(String),
      });
      expect(wrapper.vm.loading).toBe(false);
    });

    it("should handle WebAuthn not supported error during login", async () => {
      // Temporarily remove WebAuthn support
      const originalWindow = globalThis.window;
      Object.defineProperty(globalThis, "window", {
        value: { navigator: {} },
        configurable: true,
      });

      wrapper = mount(TestComponent);

      const result = await wrapper.vm.loginWithPasskey();

      expect(result).toBeNull();
      expect(wrapper.vm.error).toBe(
        "WebAuthn is not supported by this browser",
      );

      // Restore window
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
      });
    });

    it("should handle credential get failure", async () => {
      const mockAuthService = authService as any;
      mockAuthService.getPasskeyRequestOptions.mockResolvedValue(
        mockRequestOptions,
      );
      mockCredentials.get.mockResolvedValue(null);

      wrapper = mount(TestComponent);

      const result = await wrapper.vm.loginWithPasskey();

      expect(result).toBeNull();
      expect(wrapper.vm.error).toBe("Failed to get credential");
    });

    it("should handle NotAllowedError during login", async () => {
      const mockAuthService = authService as any;
      mockAuthService.getPasskeyRequestOptions.mockResolvedValue(
        mockRequestOptions,
      );

      const error = new Error("User cancelled");
      error.name = "NotAllowedError";
      mockCredentials.get.mockRejectedValue(error);

      wrapper = mount(TestComponent);

      const result = await wrapper.vm.loginWithPasskey();

      expect(result).toBeNull();
      expect(wrapper.vm.error).toBe(
        "Passkey authentication was cancelled or not allowed",
      );
    });
  });

  describe("Loading States", () => {
    it("should set loading state during registration", async () => {
      const mockAuthService = authService as any;
      mockAuthService.getPasskeyCreationOptions.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          challenge: "test-challenge",
          rp: { name: "Test App", id: "example.com" },
          user: {
            id: "user-id",
            name: "test@example.com",
            displayName: "Test User",
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        };
      });

      wrapper = mount(TestComponent);

      const registerPromise = wrapper.vm.registerPasskey();
      await nextTick();

      expect(wrapper.vm.loading).toBe(true);

      await registerPromise;
      expect(wrapper.vm.loading).toBe(false);
    });

    it("should set loading state during login", async () => {
      const mockAuthService = authService as any;
      mockAuthService.getPasskeyRequestOptions.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          challenge: "test-challenge",
        };
      });

      wrapper = mount(TestComponent);

      const loginPromise = wrapper.vm.loginWithPasskey();
      await nextTick();

      expect(wrapper.vm.loading).toBe(true);

      await loginPromise;
      expect(wrapper.vm.loading).toBe(false);
    });
  });

  describe("Data Conversion", () => {
    it("should convert base64 data during registration", async () => {
      const mockAuthService = authService as any;
      mockAuthService.getPasskeyCreationOptions.mockResolvedValue({
        challenge: "dGVzdC1jaGFsbGVuZ2U=", // base64 challenge
        rp: { name: "Test App", id: "example.com" },
        user: {
          id: "user-id",
          name: "test@example.com",
          displayName: "Test User",
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        excludeCredentials: [{ type: "public-key", id: "Y3JlZC1pZA==" }], // base64 credential ID
      });

      wrapper = mount(TestComponent);

      await wrapper.vm.registerPasskey();

      expect(global.atob).toHaveBeenCalledWith("dGVzdC1jaGFsbGVuZ2U=");
      expect(global.atob).toHaveBeenCalledWith("Y3JlZC1pZA==");
      expect(global.btoa).toHaveBeenCalled(); // Called for response data
    });

    it("should convert base64 data during login", async () => {
      const mockAuthService = authService as any;
      mockAuthService.getPasskeyRequestOptions.mockResolvedValue({
        challenge: "dGVzdC1jaGFsbGVuZ2U=", // base64 challenge
        allowCredentials: [{ type: "public-key", id: "Y3JlZC1pZA==" }], // base64 credential ID
      });

      wrapper = mount(TestComponent);

      await wrapper.vm.loginWithPasskey();

      expect(global.atob).toHaveBeenCalledWith("dGVzdC1jaGFsbGVuZ2U=");
      expect(global.atob).toHaveBeenCalledWith("Y3JlZC1pZA==");
      expect(global.btoa).toHaveBeenCalled(); // Called for response data
    });
  });

  describe("Type Safety and Return Values", () => {
    it("should provide correct return types", () => {
      wrapper = mount(TestComponent);

      expect(typeof wrapper.vm.loading).toBe("boolean");
      expect(
        wrapper.vm.error === null || typeof wrapper.vm.error === "string",
      ).toBe(true);
      expect(typeof wrapper.vm.isSupported).toBe("boolean");
      expect(
        wrapper.vm.isPlatformAuthenticatorAvailable === null ||
          typeof wrapper.vm.isPlatformAuthenticatorAvailable === "boolean",
      ).toBe(true);
      expect(typeof wrapper.vm.registerPasskey).toBe("function");
      expect(typeof wrapper.vm.loginWithPasskey).toBe("function");
      expect(typeof wrapper.vm.clearError).toBe("function");
      expect(typeof wrapper.vm.resetState).toBe("function");
    });

    it("should return correct data structure from registerPasskey", async () => {
      const mockAuthService = authService as any;
      mockAuthService.getPasskeyCreationOptions.mockResolvedValue({
        challenge: "test-challenge",
        rp: { name: "Test App", id: "example.com" },
        user: {
          id: "user-id",
          name: "test@example.com",
          displayName: "Test User",
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      });

      wrapper = mount(TestComponent);

      const result = await wrapper.vm.registerPasskey();

      expect(result).toEqual({
        credentialId: expect.any(String),
        publicKey: expect.any(String),
        authenticatorData: expect.any(String),
        clientDataJSON: expect.any(String),
        attestationObject: expect.any(String),
      });
    });

    it("should return correct data structure from loginWithPasskey", async () => {
      const mockAuthService = authService as any;
      mockAuthService.getPasskeyRequestOptions.mockResolvedValue({
        challenge: "test-challenge",
      });

      wrapper = mount(TestComponent);

      const result = await wrapper.vm.loginWithPasskey();

      expect(result).toEqual({
        credentialId: expect.any(String),
        authenticatorData: expect.any(String),
        clientDataJSON: expect.any(String),
        signature: expect.any(String),
      });
    });
  });
});
