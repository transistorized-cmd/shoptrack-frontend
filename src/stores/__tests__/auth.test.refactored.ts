import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAuthStore } from "../auth";
import { authService } from "@/services/auth.service";
import type {
  User,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from "@/types/auth";

// Import test factories
import {
  userVariants,
  authResponseVariants,
  mockAuthServiceResponses,
  mockSettingsServiceResponses,
  createTestUser,
} from "../../../tests/factories";

// Mock the auth service
vi.mock("@/services/auth.service", () => ({
  authService: {
    initializeAuth: vi.fn(),
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
    updateProfile: vi.fn(),
    loginWithOAuth: vi.fn(),
    loginWithPasskey: vi.fn(),
    registerPasskey: vi.fn(),
    removePasskey: vi.fn(),
    getPasskeys: vi.fn(),
    verifyTwoFactor: vi.fn(),
    confirmEmail: vi.fn(),
    resendEmailConfirmation: vi.fn(),
  },
}));

// Mock the settings service
vi.mock("@/services/settings.service", () => ({
  settingsService: {
    getSettings: vi
      .fn()
      .mockResolvedValue(mockSettingsServiceResponses.getSettings()),
    updateSetting: vi
      .fn()
      .mockResolvedValue(mockSettingsServiceResponses.updateSetting()),
    updateSettings: vi
      .fn()
      .mockResolvedValue(mockSettingsServiceResponses.updateSettings()),
  },
}));

describe("Auth Store (Refactored with Factories)", () => {
  let authStore: ReturnType<typeof useAuthStore>;
  const mockAuthService = authService as any;

  // Use factories for test data
  const { user: mockUser, authResponse: mockAuthResponse } = createTestUser({
    user: {
      id: 1,
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    },
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    authStore = useAuthStore();
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      expect(authStore.user).toBeNull();
      expect(authStore.loading).toBe(false);
      expect(authStore.error).toBeNull();
      expect(authStore.sessionExpired).toBe(false);
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.isEmailConfirmed).toBe(false);
      expect(authStore.hasPassword).toBe(false);
      expect(authStore.passkeysEnabled).toBe(false);
      expect(authStore.connectedAccounts).toEqual([]);
    });
  });

  describe("User Authentication", () => {
    it("should initialize authentication successfully", async () => {
      // Use factory-generated responses
      mockAuthService.initializeAuth.mockResolvedValue(mockUser);

      await authStore.initializeAuth();

      expect(authStore.user).toEqual(mockUser);
      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.loading).toBe(false);
      expect(authStore.error).toBeNull();
    });

    it("should handle login successfully", async () => {
      // Use factory-generated successful login response
      const successResponse = authResponseVariants.success();
      mockAuthService.login.mockResolvedValue(successResponse);

      const loginData = {
        email: "test@example.com",
        password: "password123",
        rememberMe: false,
      };

      await authStore.login(loginData);

      expect(authStore.user).toEqual(successResponse.user);
      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.error).toBeNull();
      expect(mockAuthService.login).toHaveBeenCalledWith(loginData);
    });

    it("should handle login failure", async () => {
      // Use factory-generated failure response
      const failureResponse = authResponseVariants.failure();
      mockAuthService.login.mockResolvedValue(failureResponse);

      const loginData = {
        email: "invalid@example.com",
        password: "wrongpassword",
        rememberMe: false,
      };

      await authStore.login(loginData);

      expect(authStore.user).toBeNull();
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.error).toBe(failureResponse.message);
    });

    it("should handle email confirmation required", async () => {
      // Use factory-generated email confirmation response
      const emailConfirmationResponse =
        authResponseVariants.emailConfirmationRequired();
      mockAuthService.login.mockResolvedValue(emailConfirmationResponse);

      const loginData = {
        email: "unconfirmed@example.com",
        password: "password123",
        rememberMe: false,
      };

      await authStore.login(loginData);

      expect(authStore.user).toEqual(emailConfirmationResponse.user);
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.isEmailConfirmed).toBe(false);
    });

    it("should handle two-factor authentication required", async () => {
      // Use factory-generated 2FA response
      const twoFactorResponse = authResponseVariants.twoFactorRequired();
      mockAuthService.login.mockResolvedValue(twoFactorResponse);

      const loginData = {
        email: "2fa@example.com",
        password: "password123",
        rememberMe: false,
      };

      await authStore.login(loginData);

      expect(authStore.requiresTwoFactor).toBe(true);
      expect(authStore.isAuthenticated).toBe(false);
    });
  });

  describe("User Registration", () => {
    it("should register user successfully", async () => {
      // Use factory-generated successful registration response
      const registrationResponse = authResponseVariants.success();
      mockAuthService.register.mockResolvedValue(registrationResponse);

      const registerData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "password123",
        confirmPassword: "password123",
        acceptTerms: true,
      };

      await authStore.register(registerData);

      expect(authStore.user).toEqual(registrationResponse.user);
      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.error).toBeNull();
    });

    it("should handle registration failure", async () => {
      // Use factory-generated failure response
      const failureResponse = authResponseVariants.failure();
      mockAuthService.register.mockResolvedValue(failureResponse);

      const registerData = {
        firstName: "John",
        lastName: "Doe",
        email: "existing@example.com",
        password: "password123",
        confirmPassword: "password123",
        acceptTerms: true,
      };

      await authStore.register(registerData);

      expect(authStore.user).toBeNull();
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.error).toBe(failureResponse.message);
    });
  });

  describe("User Profile Management", () => {
    beforeEach(() => {
      // Set up authenticated state using factory data
      authStore.setUser(mockUser);
    });

    it("should update user profile successfully", async () => {
      // Create updated user using factory
      const updatedUser = userVariants.authenticated();
      updatedUser.firstName = "Updated";
      updatedUser.lastName = "Name";

      mockAuthService.updateProfile.mockResolvedValue(updatedUser);

      const profileData = {
        firstName: "Updated",
        lastName: "Name",
        phone: "123-456-7890",
      };

      await authStore.updateProfile(profileData);

      expect(authStore.user).toEqual(updatedUser);
      expect(authStore.error).toBeNull();
    });

    it("should handle profile update failure", async () => {
      const error = new Error("Validation failed");
      mockAuthService.updateProfile.mockRejectedValue(error);

      const profileData = {
        firstName: "",
        lastName: "Doe",
        phone: "invalid-phone",
      };

      await authStore.updateProfile(profileData);

      expect(authStore.error).toBe("Validation failed");
      expect(authStore.user).toEqual(mockUser); // Should remain unchanged
    });
  });

  describe("OAuth Authentication", () => {
    it("should handle OAuth login successfully", async () => {
      // Use factory to create OAuth user
      const oauthUser = userVariants.oauthOnly();
      const oauthResponse = authResponseVariants.success();
      oauthResponse.user = oauthUser;

      mockAuthService.loginWithOAuth.mockResolvedValue(oauthResponse);

      await authStore.loginWithOAuth("google", "oauth_code");

      expect(authStore.user).toEqual(oauthUser);
      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.hasPassword).toBe(false);
    });
  });

  describe("Passkey Authentication", () => {
    it("should handle passkey login successfully", async () => {
      // Use factory to create passkey-enabled user
      const passkeyUser = userVariants.withPasskeys();
      const passkeyResponse = authResponseVariants.success();
      passkeyResponse.user = passkeyUser;

      mockAuthService.loginWithPasskey.mockResolvedValue(passkeyResponse);

      const credential = { id: "passkey123", type: "public-key" };
      await authStore.loginWithPasskey(credential);

      expect(authStore.user).toEqual(passkeyUser);
      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.passkeysEnabled).toBe(true);
    });
  });

  describe("Session Management", () => {
    it("should handle logout successfully", async () => {
      // Set up authenticated state
      authStore.setUser(mockUser);
      mockAuthService.logout.mockResolvedValue(true);

      await authStore.logout();

      expect(authStore.user).toBeNull();
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.error).toBeNull();
    });

    it("should handle session expiration", () => {
      // Set up authenticated state
      authStore.setUser(mockUser);

      authStore.handleSessionExpired();

      expect(authStore.user).toBeNull();
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.sessionExpired).toBe(true);
    });
  });

  describe("User State Getters", () => {
    it("should correctly compute user state for authenticated user", () => {
      authStore.setUser(mockUser);

      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.isEmailConfirmed).toBe(mockUser.emailConfirmed);
      expect(authStore.hasPassword).toBe(mockUser.hasPassword);
      expect(authStore.passkeysEnabled).toBe(mockUser.passkeysEnabled);
      expect(authStore.connectedAccounts).toEqual(
        mockUser.connectedAccounts || [],
      );
    });

    it("should correctly compute user state for premium user", () => {
      // Use factory to create premium user
      const premiumUser = userVariants.premium();
      authStore.setUser(premiumUser);

      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.user?.subscriptionStatus).toBe("active");
      expect(authStore.user?.subscriptionPlan).toBe("premium");
    });

    it("should correctly compute user state for trial user", () => {
      // Use factory to create trial user
      const trialUser = userVariants.trial();
      authStore.setUser(trialUser);

      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.user?.subscriptionStatus).toBe("trial");
      expect(authStore.user?.trialEndsAt).toBeTruthy();
    });
  });
});
