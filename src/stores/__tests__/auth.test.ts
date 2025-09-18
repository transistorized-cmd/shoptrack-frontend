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
    getSettings: vi.fn().mockResolvedValue({
      display: {
        language: "en",
        theme: "light",
        currency: "USD",
      },
      notifications: {
        emailNotifications: true,
        pushNotifications: true,
      },
      privacy: {
        shareData: false,
      },
      receipts: {
        autoDelete: false,
        retentionDays: 365,
      },
    }),
    updateSetting: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

describe("Auth Store", () => {
  let authStore: ReturnType<typeof useAuthStore>;
  const mockAuthService = authService as any;

  const mockUser: User = {
    id: "1",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    emailConfirmed: true,
    emailVerifiedAt: "2024-01-01T00:00:00Z",
    hasPassword: true,
    passkeysEnabled: false,
    connectedAccounts: [],
  };

  const mockAuthResponse: AuthResponse = {
    success: true,
    message: "Success",
    user: mockUser,
  };

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

    it("should compute session info correctly", () => {
      const sessionInfo = authStore.sessionInfo;
      expect(sessionInfo.isAuthenticated).toBe(false);
      expect(sessionInfo.user).toBeNull();
      expect(sessionInfo.tokens).toBeNull();
      expect(sessionInfo.loading).toBe(false);
      expect(typeof sessionInfo.lastActivity).toBe("number");
    });
  });

  describe("Computed Properties", () => {
    beforeEach(() => {
      authStore.user = mockUser;
    });

    it("should compute isAuthenticated correctly", () => {
      expect(authStore.isAuthenticated).toBe(true);

      authStore.user = null;
      expect(authStore.isAuthenticated).toBe(false);
    });

    it("should compute isEmailConfirmed correctly", () => {
      // Test with emailConfirmed = true
      authStore.user = { ...mockUser, emailConfirmed: true };
      expect(authStore.isEmailConfirmed).toBe(true);

      // Test with emailVerifiedAt date
      authStore.user = {
        ...mockUser,
        emailConfirmed: false,
        emailVerifiedAt: "2024-01-01T00:00:00Z",
      };
      expect(authStore.isEmailConfirmed).toBe(true);

      // Test with both false/null
      authStore.user = {
        ...mockUser,
        emailConfirmed: false,
        emailVerifiedAt: null,
      };
      expect(authStore.isEmailConfirmed).toBe(false);
    });

    it("should compute hasPassword correctly", () => {
      authStore.user = { ...mockUser, hasPassword: true };
      expect(authStore.hasPassword).toBe(true);

      authStore.user = { ...mockUser, hasPassword: false };
      expect(authStore.hasPassword).toBe(false);
    });

    it("should compute passkeysEnabled correctly", () => {
      authStore.user = { ...mockUser, passkeysEnabled: true };
      expect(authStore.passkeysEnabled).toBe(true);

      authStore.user = { ...mockUser, passkeysEnabled: false };
      expect(authStore.passkeysEnabled).toBe(false);
    });
  });

  describe("Helper Actions", () => {
    it("should clear error", () => {
      authStore.error = {
        code: "TEST_ERROR",
        message: "Test error",
      };

      authStore.clearError();
      expect(authStore.error).toBeNull();
    });

    it("should update last activity", async () => {
      const initialActivity = authStore.lastActivity;

      // Wait a small amount to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));
      authStore.updateLastActivity();
      expect(authStore.lastActivity).toBeGreaterThan(initialActivity);
    });

    it("should set session expired", () => {
      authStore.setSessionExpired(true);
      expect(authStore.sessionExpired).toBe(true);

      authStore.setSessionExpired(false);
      expect(authStore.sessionExpired).toBe(false);
    });
  });

  describe("Initialize", () => {
    it("should initialize successfully with user data", async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      await authStore.initialize();

      expect(mockAuthService.initializeAuth).toHaveBeenCalled();
      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
      expect(authStore.user).toEqual(mockUser);
      expect(authStore.loading).toBe(false);
      expect(authStore.sessionExpired).toBe(false);
    });

    it("should handle initialization with no user", async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(null);

      await authStore.initialize();

      expect(authStore.user).toBeNull();
      expect(authStore.sessionExpired).toBe(false);
      expect(authStore.loading).toBe(false);
    });

    it("should handle initialization errors", async () => {
      mockAuthService.getCurrentUser.mockRejectedValue(
        new Error("Network error"),
      );

      await authStore.initialize();

      expect(authStore.user).toBeNull();
      expect(authStore.sessionExpired).toBe(false);
      expect(authStore.loading).toBe(false);
    });
  });

  describe("Login", () => {
    const loginRequest: LoginRequest = {
      email: "test@example.com",
      password: "password123",
    };

    it("should login successfully with user in response", async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await authStore.login(loginRequest);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginRequest);
      expect(authStore.user).toEqual(mockUser);
      expect(authStore.loading).toBe(false);
      expect(authStore.sessionExpired).toBe(false);
      expect(result).toEqual(mockAuthResponse);
    });

    it("should login successfully and fetch user data", async () => {
      const responseWithoutUser = { ...mockAuthResponse, user: undefined };
      mockAuthService.login.mockResolvedValue(responseWithoutUser);
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      const result = await authStore.login(loginRequest);

      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
      expect(authStore.user).toEqual(mockUser);
      expect(result).toEqual(responseWithoutUser);
    });

    it("should handle login failure with errors", async () => {
      const failureResponse = {
        success: false,
        message: "Invalid credentials",
        errors: ["Invalid email or password"],
      };
      mockAuthService.login.mockResolvedValue(failureResponse);

      const result = await authStore.login(loginRequest);

      expect(authStore.user).toBeNull();
      expect(authStore.error).toMatchObject({
        code: "LOGIN_FAILED",
        message: "Invalid credentials",
      });
      expect(result).toEqual(failureResponse);
    });

    it("should handle login network error", async () => {
      const networkError = new Error("Network error");
      networkError.response = {
        data: { message: "Server error" },
      };
      mockAuthService.login.mockRejectedValue(networkError);

      const result = await authStore.login(loginRequest);

      expect(authStore.error).toMatchObject({
        code: "LOGIN_ERROR",
        message: "Server error",
      });
      expect(result.success).toBe(false);
      expect(authStore.loading).toBe(false);
    });
  });

  describe("Register", () => {
    const registerRequest: RegisterRequest = {
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      password: "password123",
    };

    it("should register successfully", async () => {
      const registerResponse = {
        success: true,
        message: "Registration successful",
      };
      mockAuthService.register.mockResolvedValue(registerResponse);

      const result = await authStore.register(registerRequest);

      expect(mockAuthService.register).toHaveBeenCalledWith(registerRequest);
      expect(authStore.loading).toBe(false);
      expect(result).toEqual(registerResponse);
    });

    it("should handle registration failure", async () => {
      const failureResponse = {
        success: false,
        message: "Email already exists",
        errors: ["Email is already taken"],
      };
      mockAuthService.register.mockResolvedValue(failureResponse);

      const result = await authStore.register(registerRequest);

      expect(authStore.error).toMatchObject({
        code: "REGISTRATION_FAILED",
        message: "Email already exists",
      });
      expect(result).toEqual(failureResponse);
    });

    it("should handle registration network error", async () => {
      mockAuthService.register.mockRejectedValue(new Error("Network error"));

      const result = await authStore.register(registerRequest);

      expect(authStore.error).toMatchObject({
        code: "REGISTRATION_ERROR",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Logout", () => {
    beforeEach(() => {
      authStore.user = mockUser;
    });

    it("should logout successfully", async () => {
      mockAuthService.logout.mockResolvedValue();

      await authStore.logout();

      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(authStore.user).toBeNull();
      expect(authStore.sessionExpired).toBe(false);
      expect(authStore.error).toBeNull();
      expect(authStore.loading).toBe(false);
    });

    it("should clear state even if logout API fails", async () => {
      mockAuthService.logout.mockRejectedValue(new Error("Logout failed"));

      await authStore.logout();

      expect(authStore.user).toBeNull();
      expect(authStore.sessionExpired).toBe(false);
      expect(authStore.error).toBeNull();
      expect(authStore.loading).toBe(false);
    });
  });

  describe("Refresh Tokens", () => {
    it("should refresh tokens successfully", async () => {
      mockAuthService.refreshToken.mockResolvedValue({
        success: true,
        user: mockUser,
        message: "Tokens refreshed",
      });

      const result = await authStore.refreshTokens();

      expect(result).toBe(true);
      expect(authStore.user).toEqual(mockUser);
    });

    it("should handle refresh failure and logout", async () => {
      mockAuthService.refreshToken.mockResolvedValue({ success: false, message: "Refresh failed" });
      mockAuthService.getCurrentUser.mockResolvedValue(null);
      mockAuthService.logout.mockResolvedValue();

      const result = await authStore.refreshTokens();

      expect(result).toBe(false);
      expect(authStore.sessionExpired).toBe(true);
      expect(authStore.user).toBeNull();
    });

    it("should handle refresh error and logout", async () => {
      mockAuthService.getCurrentUser.mockRejectedValue(
        new Error("Token expired"),
      );
      mockAuthService.logout.mockResolvedValue();

      const result = await authStore.refreshTokens();

      expect(result).toBe(false);
      expect(authStore.sessionExpired).toBe(true);
      expect(authStore.user).toBeNull();
    });
  });

  describe("Password Operations", () => {
    it("should handle forgot password successfully", async () => {
      const response = { success: true, message: "Reset email sent" };
      mockAuthService.forgotPassword.mockResolvedValue(response);

      const result = await authStore.forgotPassword({
        email: "test@example.com",
      });

      expect(result).toEqual(response);
      expect(authStore.loading).toBe(false);
    });

    it("should handle change password successfully", async () => {
      authStore.user = { ...mockUser, hasPassword: false };
      const response = { success: true, message: "Password changed" };
      mockAuthService.changePassword.mockResolvedValue(response);

      const result = await authStore.changePassword({
        currentPassword: "old123",
        newPassword: "new456",
      });

      expect(result).toEqual(response);
      expect(authStore.user?.hasPassword).toBe(true);
    });
  });

  describe("Profile Operations", () => {
    beforeEach(() => {
      authStore.user = mockUser;
    });

    it("should update profile successfully", async () => {
      const updatedUser = { ...mockUser, firstName: "Updated" };
      const response = {
        success: true,
        message: "Profile updated",
        user: updatedUser,
      };
      mockAuthService.updateProfile.mockResolvedValue(response);

      const result = await authStore.updateProfile({
        firstName: "Updated",
        lastName: "User",
      });

      expect(result).toEqual(response);
      expect(authStore.user).toEqual(updatedUser);
    });
  });

  describe("Passkey Operations", () => {
    beforeEach(() => {
      authStore.user = mockUser;
    });

    it("should register passkey successfully", async () => {
      const response = { success: true, message: "Passkey registered" };
      mockAuthService.registerPasskey.mockResolvedValue(response);

      const result = await authStore.registerPasskey({
        credential: { id: "test-credential" },
      });

      expect(result).toEqual(response);
      expect(authStore.user?.passkeysEnabled).toBe(true);
    });

    it("should remove passkeys successfully", async () => {
      authStore.user = { ...mockUser, passkeysEnabled: true };
      const mockPasskeys = [{ id: "key1" }, { id: "key2" }];
      const removeResponse = { success: true, message: "Passkey removed" };

      mockAuthService.getPasskeys.mockResolvedValue(mockPasskeys);
      mockAuthService.removePasskey.mockResolvedValue(removeResponse);

      const result = await authStore.removePasskey();

      expect(mockAuthService.getPasskeys).toHaveBeenCalled();
      expect(mockAuthService.removePasskey).toHaveBeenCalledTimes(2);
      expect(authStore.user?.passkeysEnabled).toBe(false);
      expect(result.success).toBe(true);
    });

    it("should handle no passkeys found", async () => {
      mockAuthService.getPasskeys.mockResolvedValue([]);

      const result = await authStore.removePasskey();

      expect(result.success).toBe(false);
      expect(result.message).toBe("No passkeys found");
    });
  });

  describe("Email Operations", () => {
    beforeEach(() => {
      authStore.user = { ...mockUser, emailConfirmed: false };
    });

    it("should confirm email successfully", async () => {
      const response = { success: true, message: "Email confirmed" };
      mockAuthService.confirmEmail.mockResolvedValue(response);

      const result = await authStore.confirmEmail("token123");

      expect(mockAuthService.confirmEmail).toHaveBeenCalledWith("token123");
      expect(authStore.user?.emailConfirmed).toBe(true);
      expect(result).toEqual(response);
    });

    it("should resend email confirmation successfully", async () => {
      const response = { success: true, message: "Confirmation email sent" };
      mockAuthService.resendEmailConfirmation.mockResolvedValue(response);

      const result = await authStore.resendEmailConfirmation();

      expect(result).toEqual(response);
    });

    it("should handle email service not configured error", async () => {
      const error = new Error("Service unavailable");
      error.response = { status: 415 };
      mockAuthService.resendEmailConfirmation.mockRejectedValue(error);

      const result = await authStore.resendEmailConfirmation();

      expect(result.success).toBe(false);
      expect(result.message).toContain("Email service is not configured");
    });
  });

  describe("OAuth and Two-Factor", () => {
    it("should handle OAuth login successfully", async () => {
      mockAuthService.loginWithOAuth.mockResolvedValue(mockAuthResponse);

      const result = await authStore.loginWithOAuth({
        provider: "google",
        code: "oauth-code",
      });

      expect(authStore.user).toEqual(mockUser);
      expect(result).toEqual(mockAuthResponse);
    });

    it("should handle passkey login successfully", async () => {
      mockAuthService.loginWithPasskey.mockResolvedValue(mockAuthResponse);

      const result = await authStore.loginWithPasskey({
        credential: { id: "passkey-id" },
      });

      expect(authStore.user).toEqual(mockUser);
      expect(result).toEqual(mockAuthResponse);
    });

    it("should handle two-factor verification successfully", async () => {
      mockAuthService.verifyTwoFactor.mockResolvedValue(mockAuthResponse);

      const result = await authStore.verifyTwoFactor({
        token: "123456",
      });

      expect(authStore.user).toEqual(mockUser);
      expect(result).toEqual(mockAuthResponse);
    });
  });
});
