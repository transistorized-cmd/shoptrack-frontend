import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { authService } from "../auth.service";
import api, { apiWithoutAutoLogout } from "../api";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  OAuthLoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  User,
  PasskeyLoginRequest,
  PasskeyRegistrationRequest,
  PublicKeyCredentialCreationOptions,
  PublicKeyCredentialRequestOptions,
  TwoFactorRequest,
  TwoFactorSetupResponse,
  UserSession,
} from "@/types/auth";

// Mock the API modules
vi.mock("../api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  apiWithoutAutoLogout: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("AuthService", () => {
  let mockApi: typeof api;
  let mockApiWithoutAutoLogout: typeof apiWithoutAutoLogout;

  // Mock data
  const mockUser: User = {
    id: 1,
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    name: "John Doe",
    emailConfirmed: true,
    emailVerifiedAt: "2024-01-15T10:00:00Z",
    hasPassword: true,
    passkeysEnabled: false,
    provider: "local",
    avatarUrl: null,
    phone: null,
    isActive: true,
    twoFactorEnabled: false,
    subscriptionStatus: "active",
    subscriptionPlan: "premium",
    subscriptionExpiresAt: "2024-12-31T23:59:59Z",
    trialEndsAt: null,
    createdAt: "2024-01-01T00:00:00Z",
    connectedAccounts: [],
  };

  const mockAuthResponse: AuthResponse = {
    success: true,
    user: mockUser,
    message: "Authentication successful",
  };

  const mockErrorResponse: AuthResponse = {
    success: false,
    message: "Authentication failed",
    errors: ["Invalid credentials"],
  };

  beforeEach(() => {
    mockApi = api as any;
    mockApiWithoutAutoLogout = apiWithoutAutoLogout as any;

    // Reset all mocks
    vi.clearAllMocks();

    // Mock console.warn to avoid noise in tests
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  describe("Authentication Methods", () => {
    describe("login", () => {
      const loginRequest: LoginRequest = {
        email: "test@example.com",
        password: "password123",
        rememberMe: true,
        recaptchaToken: "recaptcha-token",
      };

      it("should login successfully with valid credentials", async () => {
        mockApi.post.mockResolvedValue({ data: mockAuthResponse });

        const result = await authService.login(loginRequest);

        expect(mockApi.post).toHaveBeenCalledWith("/auth/login", loginRequest);
        expect(result).toEqual(mockAuthResponse);
      });

      it("should handle login failure", async () => {
        mockApi.post.mockResolvedValue({ data: mockErrorResponse });

        const result = await authService.login(loginRequest);

        expect(result).toEqual(mockErrorResponse);
        expect(result.success).toBe(false);
      });

      it("should handle API errors during login", async () => {
        const apiError = new Error("Network error");
        mockApi.post.mockRejectedValue(apiError);

        await expect(authService.login(loginRequest)).rejects.toThrow(
          "Network error",
        );
      });

      it("should handle minimal login request", async () => {
        const minimalRequest: LoginRequest = {
          email: "test@example.com",
          password: "password123",
        };

        mockApi.post.mockResolvedValue({ data: mockAuthResponse });

        const result = await authService.login(minimalRequest);

        expect(mockApi.post).toHaveBeenCalledWith(
          "/auth/login",
          minimalRequest,
        );
        expect(result).toEqual(mockAuthResponse);
      });
    });

    describe("register", () => {
      const registerRequest: RegisterRequest = {
        email: "newuser@example.com",
        password: "password123",
        confirmPassword: "password123",
        firstName: "Jane",
        lastName: "Smith",
        acceptTerms: true,
        recaptchaToken: "recaptcha-token",
      };

      it("should register successfully with valid data", async () => {
        mockApi.post.mockResolvedValue({ data: mockAuthResponse });

        const result = await authService.register(registerRequest);

        expect(mockApi.post).toHaveBeenCalledWith(
          "/auth/register",
          registerRequest,
        );
        expect(result).toEqual(mockAuthResponse);
      });

      it("should handle registration failure", async () => {
        const errorResponse: AuthResponse = {
          success: false,
          message: "Email already exists",
          errors: ["Email is already registered"],
        };

        mockApi.post.mockResolvedValue({ data: errorResponse });

        const result = await authService.register(registerRequest);

        expect(result).toEqual(errorResponse);
        expect(result.success).toBe(false);
      });

      it("should handle minimal registration request", async () => {
        const minimalRequest: RegisterRequest = {
          email: "minimal@example.com",
          password: "password123",
          confirmPassword: "password123",
          acceptTerms: true,
        };

        mockApi.post.mockResolvedValue({ data: mockAuthResponse });

        const result = await authService.register(minimalRequest);

        expect(mockApi.post).toHaveBeenCalledWith(
          "/auth/register",
          minimalRequest,
        );
        expect(result).toEqual(mockAuthResponse);
      });
    });

    describe("OAuth Authentication", () => {
      const oauthRequest: OAuthLoginRequest = {
        provider: "google",
        accessToken: "google-access-token",
        idToken: "google-id-token",
      };

      it("should login with OAuth successfully", async () => {
        mockApi.post.mockResolvedValue({ data: mockAuthResponse });

        const result = await authService.loginWithOAuth(oauthRequest);

        expect(mockApi.post).toHaveBeenCalledWith(
          "/auth/oauth/google",
          oauthRequest,
        );
        expect(result).toEqual(mockAuthResponse);
      });

      it("should handle different OAuth providers", async () => {
        const providers: Array<"google" | "apple" | "microsoft"> = [
          "google",
          "apple",
          "microsoft",
        ];

        for (const provider of providers) {
          const request: OAuthLoginRequest = {
            provider,
            accessToken: `${provider}-token`,
          };

          mockApi.post.mockResolvedValue({ data: mockAuthResponse });

          await authService.loginWithOAuth(request);

          expect(mockApi.post).toHaveBeenCalledWith(
            `/auth/oauth/${provider}`,
            request,
          );
        }
      });

      it("should handle OAuth login failure", async () => {
        mockApi.post.mockResolvedValue({ data: mockErrorResponse });

        const result = await authService.loginWithOAuth(oauthRequest);

        expect(result).toEqual(mockErrorResponse);
        expect(result.success).toBe(false);
      });
    });

    describe("logout", () => {
      it("should logout successfully", async () => {
        mockApi.post.mockResolvedValue({});

        await authService.logout();

        expect(mockApi.post).toHaveBeenCalledWith("/auth/logout");
      });

      it("should handle logout API failure gracefully", async () => {
        const apiError = new Error("Logout failed");
        mockApi.post.mockRejectedValue(apiError);

        // Should not throw error, should handle gracefully
        await expect(authService.logout()).resolves.toBeUndefined();

        expect(console.warn).toHaveBeenCalledWith(
          "Logout API call failed:",
          apiError,
        );
      });

      it("should complete logout process even if API fails", async () => {
        mockApi.post.mockRejectedValue(new Error("Network error"));

        await authService.logout();

        // Should complete without throwing
        expect(mockApi.post).toHaveBeenCalledWith("/auth/logout");
      });
    });
  });

  describe("Password Recovery", () => {
    describe("forgotPassword", () => {
      const forgotPasswordRequest: ForgotPasswordRequest = {
        email: "test@example.com",
        recaptchaToken: "recaptcha-token",
      };

      it("should send forgot password request successfully", async () => {
        const response: AuthResponse = {
          success: true,
          message: "Password reset email sent",
        };

        mockApi.post.mockResolvedValue({ data: response });

        const result = await authService.forgotPassword(forgotPasswordRequest);

        expect(mockApi.post).toHaveBeenCalledWith(
          "/auth/forgot-password",
          forgotPasswordRequest,
        );
        expect(result).toEqual(response);
      });

      it("should handle forgot password without recaptcha", async () => {
        const minimalRequest: ForgotPasswordRequest = {
          email: "test@example.com",
        };

        mockApi.post.mockResolvedValue({ data: mockAuthResponse });

        const result = await authService.forgotPassword(minimalRequest);

        expect(mockApi.post).toHaveBeenCalledWith(
          "/auth/forgot-password",
          minimalRequest,
        );
        expect(result).toEqual(mockAuthResponse);
      });
    });

    describe("resetPassword", () => {
      const resetPasswordRequest: ResetPasswordRequest = {
        email: "test@example.com",
        token: "reset-token",
        password: "newpassword123",
        confirmPassword: "newpassword123",
      };

      it("should reset password successfully", async () => {
        mockApi.post.mockResolvedValue({ data: mockAuthResponse });

        const result = await authService.resetPassword(resetPasswordRequest);

        expect(mockApi.post).toHaveBeenCalledWith(
          "/auth/reset-password",
          resetPasswordRequest,
        );
        expect(result).toEqual(mockAuthResponse);
      });

      it("should handle invalid reset token", async () => {
        const errorResponse: AuthResponse = {
          success: false,
          message: "Invalid or expired reset token",
          errors: ["Reset token is invalid"],
        };

        mockApi.post.mockResolvedValue({ data: errorResponse });

        const result = await authService.resetPassword(resetPasswordRequest);

        expect(result).toEqual(errorResponse);
        expect(result.success).toBe(false);
      });
    });

    describe("changePassword", () => {
      const changePasswordRequest: ChangePasswordRequest = {
        currentPassword: "oldpassword123",
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      };

      it("should change password successfully", async () => {
        mockApi.post.mockResolvedValue({ data: mockAuthResponse });

        const result = await authService.changePassword(changePasswordRequest);

        expect(mockApi.post).toHaveBeenCalledWith(
          "/auth/change-password",
          changePasswordRequest,
        );
        expect(result).toEqual(mockAuthResponse);
      });

      it("should handle incorrect current password", async () => {
        const errorResponse: AuthResponse = {
          success: false,
          message: "Current password is incorrect",
          errors: ["Invalid current password"],
        };

        mockApi.post.mockResolvedValue({ data: errorResponse });

        const result = await authService.changePassword(changePasswordRequest);

        expect(result).toEqual(errorResponse);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Profile Management", () => {
    describe("getCurrentUser", () => {
      it("should get current user successfully", async () => {
        mockApiWithoutAutoLogout.get.mockResolvedValue({ data: mockUser });

        const result = await authService.getCurrentUser();

        expect(mockApiWithoutAutoLogout.get).toHaveBeenCalledWith("/auth/me");
        expect(result).toEqual(mockUser);
      });

      it("should return null when user is not authenticated", async () => {
        const authError = new Error("Unauthorized");
        mockApiWithoutAutoLogout.get.mockRejectedValue(authError);

        const result = await authService.getCurrentUser();

        expect(result).toBeNull();
      });

      it("should handle API errors gracefully", async () => {
        mockApiWithoutAutoLogout.get.mockRejectedValue(
          new Error("Network error"),
        );

        const result = await authService.getCurrentUser();

        expect(result).toBeNull();
      });
    });

    describe("updateProfile", () => {
      const updateProfileRequest: UpdateProfileRequest = {
        firstName: "UpdatedFirst",
        lastName: "UpdatedLast",
        userName: "updateduser",
        email: "updated@example.com",
      };

      it("should update profile successfully", async () => {
        const updatedAuthResponse: AuthResponse = {
          success: true,
          user: {
            ...mockUser,
            firstName: "UpdatedFirst",
            lastName: "UpdatedLast",
          },
          message: "Profile updated successfully",
        };

        mockApi.put.mockResolvedValue({ data: updatedAuthResponse });

        const result = await authService.updateProfile(updateProfileRequest);

        expect(mockApi.put).toHaveBeenCalledWith(
          "/auth/profile",
          updateProfileRequest,
        );
        expect(result).toEqual(updatedAuthResponse);
      });

      it("should handle partial profile updates", async () => {
        const partialUpdate: UpdateProfileRequest = {
          firstName: "NewFirstName",
        };

        mockApi.put.mockResolvedValue({ data: mockAuthResponse });

        const result = await authService.updateProfile(partialUpdate);

        expect(mockApi.put).toHaveBeenCalledWith("/auth/profile", {
          firstName: "NewFirstName",
        });
        expect(result).toEqual(mockAuthResponse);
      });

      it("should handle profile picture upload rejection", async () => {
        const requestWithPicture: UpdateProfileRequest = {
          firstName: "Test",
          profilePicture: new File(["test"], "test.jpg", {
            type: "image/jpeg",
          }),
        };

        await expect(
          authService.updateProfile(requestWithPicture),
        ).rejects.toThrow("Profile picture upload not yet implemented");
      });

      it("should filter out undefined fields", async () => {
        const requestWithUndefined: UpdateProfileRequest = {
          firstName: "Test",
          lastName: undefined,
          email: "test@example.com",
          userName: undefined,
        };

        mockApi.put.mockResolvedValue({ data: mockAuthResponse });

        await authService.updateProfile(requestWithUndefined);

        expect(mockApi.put).toHaveBeenCalledWith("/auth/profile", {
          firstName: "Test",
          email: "test@example.com",
        });
      });
    });
  });

  describe("Passkey / WebAuthn Support", () => {
    describe("getPasskeyCreationOptions", () => {
      const mockCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: "challenge-string",
        rp: { name: "ShopTrack", id: "shoptrack.com" },
        user: {
          id: "user-id",
          name: "test@example.com",
          displayName: "Test User",
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        timeout: 60000,
      };

      it("should get passkey creation options successfully", async () => {
        mockApi.get.mockResolvedValue({ data: mockCreationOptions });

        const result = await authService.getPasskeyCreationOptions();

        expect(mockApi.get).toHaveBeenCalledWith("/passkey/creation-options");
        expect(result).toEqual(mockCreationOptions);
      });

      it("should handle creation options failure", async () => {
        const apiError = new Error("Passkey not supported");
        mockApi.get.mockRejectedValue(apiError);

        await expect(authService.getPasskeyCreationOptions()).rejects.toThrow(
          "Passkey not supported",
        );
      });
    });

    describe("registerPasskey", () => {
      const passkeyRegistrationRequest: PasskeyRegistrationRequest = {
        credentialId: "credential-id",
        publicKey: "public-key-data",
        authenticatorData: "authenticator-data",
        clientDataJSON: "client-data-json",
        attestationObject: "attestation-object",
      };

      it("should register passkey successfully", async () => {
        mockApi.post.mockResolvedValue({ data: mockAuthResponse });

        const result = await authService.registerPasskey(
          passkeyRegistrationRequest,
        );

        expect(mockApi.post).toHaveBeenCalledWith(
          "/passkey/register",
          passkeyRegistrationRequest,
        );
        expect(result).toEqual(mockAuthResponse);
      });

      it("should handle passkey registration failure", async () => {
        mockApi.post.mockResolvedValue({ data: mockErrorResponse });

        const result = await authService.registerPasskey(
          passkeyRegistrationRequest,
        );

        expect(result).toEqual(mockErrorResponse);
        expect(result.success).toBe(false);
      });
    });

    describe("getPasskeyRequestOptions", () => {
      const mockRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: "challenge-string",
        timeout: 60000,
        rpId: "shoptrack.com",
      };

      it("should get passkey request options successfully", async () => {
        mockApi.get.mockResolvedValue({ data: mockRequestOptions });

        const result = await authService.getPasskeyRequestOptions();

        expect(mockApi.get).toHaveBeenCalledWith("/passkey/assertion-options");
        expect(result).toEqual(mockRequestOptions);
      });
    });

    describe("loginWithPasskey", () => {
      const passkeyLoginRequest: PasskeyLoginRequest = {
        credentialId: "credential-id",
        authenticatorData: "authenticator-data",
        clientDataJSON: "client-data-json",
        signature: "signature-data",
      };

      it("should login with passkey successfully", async () => {
        mockApi.post.mockResolvedValue({ data: mockAuthResponse });

        const result = await authService.loginWithPasskey(passkeyLoginRequest);

        expect(mockApi.post).toHaveBeenCalledWith(
          "/passkey/verify",
          passkeyLoginRequest,
        );
        expect(result).toEqual(mockAuthResponse);
      });

      it("should handle passkey login failure", async () => {
        mockApi.post.mockResolvedValue({ data: mockErrorResponse });

        const result = await authService.loginWithPasskey(passkeyLoginRequest);

        expect(result).toEqual(mockErrorResponse);
        expect(result.success).toBe(false);
      });
    });

    describe("getPasskeys", () => {
      const mockPasskeys = [
        { id: 1, name: "iPhone Touch ID", createdAt: "2024-01-01T00:00:00Z" },
        { id: 2, name: "YubiKey", createdAt: "2024-01-02T00:00:00Z" },
      ];

      it("should get user passkeys successfully", async () => {
        mockApi.get.mockResolvedValue({ data: mockPasskeys });

        const result = await authService.getPasskeys();

        expect(mockApi.get).toHaveBeenCalledWith("/passkey/list");
        expect(result).toEqual(mockPasskeys);
      });

      it("should handle empty passkeys list", async () => {
        mockApi.get.mockResolvedValue({ data: [] });

        const result = await authService.getPasskeys();

        expect(result).toEqual([]);
      });
    });

    describe("removePasskey", () => {
      it("should remove passkey successfully", async () => {
        const backendResponse = { message: "Passkey removed successfully" };
        mockApi.delete.mockResolvedValue({ data: backendResponse });

        const result = await authService.removePasskey(1);

        expect(mockApi.delete).toHaveBeenCalledWith("/passkey/1");
        expect(result).toEqual({
          success: true,
          message: "Passkey removed successfully",
        });
      });

      it("should handle passkey removal failure", async () => {
        const apiError = {
          response: {
            data: { error: "Passkey not found" },
          },
        };
        mockApi.delete.mockRejectedValue(apiError);

        const result = await authService.removePasskey(999);

        expect(result).toEqual({
          success: false,
          message: "Passkey not found",
          errors: ["Passkey not found"],
        });
      });

      it("should handle API error with message field", async () => {
        const apiError = {
          response: {
            data: { message: "Database error" },
          },
        };
        mockApi.delete.mockRejectedValue(apiError);

        const result = await authService.removePasskey(1);

        expect(result).toEqual({
          success: false,
          message: "Database error",
          errors: ["Database error"],
        });
      });

      it("should handle generic API errors", async () => {
        const apiError = new Error("Network error");
        mockApi.delete.mockRejectedValue(apiError);

        const result = await authService.removePasskey(1);

        expect(result).toEqual({
          success: false,
          message: "Failed to remove passkey",
          errors: ["Failed to remove passkey"],
        });
      });
    });
  });

  describe("Two-Factor Authentication", () => {
    describe("enableTwoFactor", () => {
      const mockTwoFactorSetup: TwoFactorSetupResponse = {
        secret: "JBSWY3DPEHPK3PXP",
        qrCodeUri:
          "otpauth://totp/ShopTrack:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=ShopTrack",
        recoveryCodes: ["123456", "234567", "345678"],
      };

      it("should enable two-factor authentication successfully", async () => {
        mockApi.post.mockResolvedValue({ data: mockTwoFactorSetup });

        const result = await authService.enableTwoFactor();

        expect(mockApi.post).toHaveBeenCalledWith("/auth/2fa/enable");
        expect(result).toEqual(mockTwoFactorSetup);
      });

      it("should handle two-factor setup failure", async () => {
        const apiError = new Error("2FA setup failed");
        mockApi.post.mockRejectedValue(apiError);

        await expect(authService.enableTwoFactor()).rejects.toThrow(
          "2FA setup failed",
        );
      });
    });

    describe("verifyTwoFactor", () => {
      const twoFactorRequest: TwoFactorRequest = {
        code: "123456",
        provider: "authenticator",
        rememberMe: true,
      };

      it("should verify two-factor code successfully", async () => {
        mockApi.post.mockResolvedValue({ data: mockAuthResponse });

        const result = await authService.verifyTwoFactor(twoFactorRequest);

        expect(mockApi.post).toHaveBeenCalledWith(
          "/auth/2fa/verify",
          twoFactorRequest,
        );
        expect(result).toEqual(mockAuthResponse);
      });

      it("should handle different 2FA providers", async () => {
        const providers: Array<"authenticator" | "sms" | "email"> = [
          "authenticator",
          "sms",
          "email",
        ];

        for (const provider of providers) {
          const request: TwoFactorRequest = {
            code: "123456",
            provider,
          };

          mockApi.post.mockResolvedValue({ data: mockAuthResponse });

          await authService.verifyTwoFactor(request);

          expect(mockApi.post).toHaveBeenCalledWith(
            "/auth/2fa/verify",
            request,
          );
        }
      });

      it("should handle invalid two-factor code", async () => {
        const errorResponse: AuthResponse = {
          success: false,
          message: "Invalid verification code",
          errors: ["The provided code is invalid"],
        };

        mockApi.post.mockResolvedValue({ data: errorResponse });

        const result = await authService.verifyTwoFactor(twoFactorRequest);

        expect(result).toEqual(errorResponse);
        expect(result.success).toBe(false);
      });
    });

    describe("disableTwoFactor", () => {
      it("should disable two-factor authentication successfully", async () => {
        mockApi.post.mockResolvedValue({ data: mockAuthResponse });

        const result = await authService.disableTwoFactor("123456");

        expect(mockApi.post).toHaveBeenCalledWith("/auth/2fa/disable", {
          code: "123456",
        });
        expect(result).toEqual(mockAuthResponse);
      });

      it("should handle incorrect code when disabling 2FA", async () => {
        const errorResponse: AuthResponse = {
          success: false,
          message: "Incorrect verification code",
          errors: ["Code is required to disable 2FA"],
        };

        mockApi.post.mockResolvedValue({ data: errorResponse });

        const result = await authService.disableTwoFactor("wrong-code");

        expect(result).toEqual(errorResponse);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Session Management", () => {
    describe("getSessions", () => {
      const mockSessions: UserSession[] = [
        {
          id: 1,
          deviceId: "device-1",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ipAddress: "192.168.1.100",
          createdAt: "2024-01-15T10:00:00Z",
          expiresAt: "2024-02-15T10:00:00Z",
        },
        {
          id: 2,
          deviceId: "device-2",
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
          ipAddress: "192.168.1.101",
          createdAt: "2024-01-10T08:00:00Z",
          expiresAt: "2024-02-10T08:00:00Z",
        },
      ];

      it("should get user sessions successfully", async () => {
        mockApi.get.mockResolvedValue({ data: mockSessions });

        const result = await authService.getSessions();

        expect(mockApi.get).toHaveBeenCalledWith("/auth/sessions");
        expect(result).toEqual(mockSessions);
      });

      it("should handle empty sessions list", async () => {
        mockApi.get.mockResolvedValue({ data: [] });

        const result = await authService.getSessions();

        expect(result).toEqual([]);
      });
    });

    describe("revokeSession", () => {
      it("should revoke session successfully", async () => {
        mockApi.delete.mockResolvedValue({ data: mockAuthResponse });

        const result = await authService.revokeSession("session-123");

        expect(mockApi.delete).toHaveBeenCalledWith(
          "/auth/sessions/session-123",
        );
        expect(result).toEqual(mockAuthResponse);
      });

      it("should handle session not found", async () => {
        const errorResponse: AuthResponse = {
          success: false,
          message: "Session not found",
          errors: ["Invalid session ID"],
        };

        mockApi.delete.mockResolvedValue({ data: errorResponse });

        const result = await authService.revokeSession("invalid-session");

        expect(result).toEqual(errorResponse);
        expect(result.success).toBe(false);
      });
    });

    describe("revokeAllSessions", () => {
      it("should revoke all sessions successfully", async () => {
        const response: AuthResponse = {
          success: true,
          message: "All sessions revoked successfully",
        };

        mockApi.delete.mockResolvedValue({ data: response });

        const result = await authService.revokeAllSessions();

        expect(mockApi.delete).toHaveBeenCalledWith("/auth/sessions");
        expect(result).toEqual(response);
      });

      it("should handle revoke all sessions failure", async () => {
        mockApi.delete.mockResolvedValue({ data: mockErrorResponse });

        const result = await authService.revokeAllSessions();

        expect(result).toEqual(mockErrorResponse);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Token Management", () => {
    describe("refreshToken", () => {
      it("should refresh token successfully", async () => {
        const refreshResponse: AuthResponse = {
          success: true,
          message: "Token refreshed successfully",
        };

        mockApi.post.mockResolvedValue({ data: refreshResponse });

        const result = await authService.refreshToken();

        expect(mockApi.post).toHaveBeenCalledWith("/auth/refresh-token");
        expect(result).toEqual(refreshResponse);
      });

      it("should handle token refresh failure", async () => {
        const errorResponse: AuthResponse = {
          success: false,
          message: "Refresh token expired",
          errors: ["Token is no longer valid"],
        };

        mockApi.post.mockResolvedValue({ data: errorResponse });

        const result = await authService.refreshToken();

        expect(result).toEqual(errorResponse);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("OAuth Account Management", () => {
    describe("connectOAuthAccount", () => {
      it("should get OAuth connection URL successfully", async () => {
        const authUrl =
          "https://accounts.google.com/oauth/authorize?client_id=...";
        mockApi.get.mockResolvedValue({ data: { authUrl } });

        const result = await authService.connectOAuthAccount("google");

        expect(mockApi.get).toHaveBeenCalledWith("/auth/oauth/google/connect");
        expect(result).toBe(authUrl);
      });

      it("should handle different OAuth providers", async () => {
        const providers = ["google", "apple", "microsoft"];

        for (const provider of providers) {
          const authUrl = `https://${provider}.com/oauth/authorize`;
          mockApi.get.mockResolvedValue({ data: { authUrl } });

          const result = await authService.connectOAuthAccount(provider);

          expect(mockApi.get).toHaveBeenCalledWith(
            `/auth/oauth/${provider}/connect`,
          );
          expect(result).toBe(authUrl);
        }
      });
    });

    describe("disconnectOAuthAccount", () => {
      it("should disconnect OAuth account successfully", async () => {
        const response: AuthResponse = {
          success: true,
          message: "Google account disconnected successfully",
        };

        mockApi.delete.mockResolvedValue({ data: response });

        const result = await authService.disconnectOAuthAccount("google");

        expect(mockApi.delete).toHaveBeenCalledWith(
          "/auth/oauth/google/disconnect",
        );
        expect(result).toEqual(response);
      });

      it("should handle OAuth disconnect failure", async () => {
        const errorResponse: AuthResponse = {
          success: false,
          message: "Cannot disconnect the only authentication method",
          errors: ["At least one authentication method must remain"],
        };

        mockApi.delete.mockResolvedValue({ data: errorResponse });

        const result = await authService.disconnectOAuthAccount("google");

        expect(result).toEqual(errorResponse);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Email Confirmation", () => {
    describe("confirmEmail", () => {
      it("should confirm email with token successfully", async () => {
        mockApi.get.mockResolvedValue({ data: mockAuthResponse });

        const result = await authService.confirmEmail("confirm-token");

        expect(mockApi.get).toHaveBeenCalledWith(
          "/auth/verify-email?token=confirm-token",
        );
        expect(result).toEqual(mockAuthResponse);
      });

      it("should confirm email with token and email", async () => {
        mockApi.get.mockResolvedValue({ data: mockAuthResponse });

        const result = await authService.confirmEmail(
          "confirm-token",
          "test@example.com",
        );

        expect(mockApi.get).toHaveBeenCalledWith(
          "/auth/verify-email?token=confirm-token&email=test%40example.com",
        );
        expect(result).toEqual(mockAuthResponse);
      });

      it("should handle invalid confirmation token", async () => {
        const errorResponse: AuthResponse = {
          success: false,
          message: "Invalid or expired confirmation token",
          errors: ["Token is not valid"],
        };

        mockApi.get.mockResolvedValue({ data: errorResponse });

        const result = await authService.confirmEmail("invalid-token");

        expect(result).toEqual(errorResponse);
        expect(result.success).toBe(false);
      });
    });

    describe("resendEmailConfirmation", () => {
      it("should resend email confirmation successfully", async () => {
        const response: AuthResponse = {
          success: true,
          message: "Confirmation email sent successfully",
        };

        mockApi.post.mockResolvedValue({ data: response });

        const result = await authService.resendEmailConfirmation();

        expect(mockApi.post).toHaveBeenCalledWith(
          "/auth/resend-email-confirmation",
        );
        expect(result).toEqual(response);
      });

      it("should handle resend email confirmation failure", async () => {
        const errorResponse: AuthResponse = {
          success: false,
          message: "Email already confirmed",
          errors: ["Email verification is not required"],
        };

        mockApi.post.mockResolvedValue({ data: errorResponse });

        const result = await authService.resendEmailConfirmation();

        expect(result).toEqual(errorResponse);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Utility Methods", () => {
    describe("initializeAuth", () => {
      it("should initialize auth without errors", () => {
        // This method is a no-op for backward compatibility
        expect(() => authService.initializeAuth()).not.toThrow();
      });
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle network timeouts", async () => {
      const timeoutError = new Error("timeout of 15000ms exceeded");
      timeoutError.name = "AxiosError";
      mockApi.post.mockRejectedValue(timeoutError);

      await expect(
        authService.login({ email: "test@example.com", password: "test" }),
      ).rejects.toThrow("timeout of 15000ms exceeded");
    });

    it("should handle server errors (5xx)", async () => {
      const serverError = {
        response: {
          status: 500,
          data: { message: "Internal server error" },
        },
      };
      mockApi.post.mockRejectedValue(serverError);

      await expect(
        authService.login({ email: "test@example.com", password: "test" }),
      ).rejects.toEqual(serverError);
    });

    it("should handle malformed responses", async () => {
      mockApi.post.mockResolvedValue({ data: null });

      const result = await authService.login({
        email: "test@example.com",
        password: "test",
      });

      expect(result).toBeNull();
    });

    it("should handle empty string responses", async () => {
      mockApi.post.mockResolvedValue({ data: "" });

      const result = await authService.login({
        email: "test@example.com",
        password: "test",
      });

      expect(result).toBe("");
    });
  });

  describe("API Instance Usage", () => {
    it("should use standard api instance for most operations", async () => {
      mockApi.post.mockResolvedValue({ data: mockAuthResponse });

      await authService.login({ email: "test@example.com", password: "test" });

      expect(mockApi.post).toHaveBeenCalled();
      expect(mockApiWithoutAutoLogout.post).not.toHaveBeenCalled();
    });

    it("should use apiWithoutAutoLogout for getCurrentUser", async () => {
      mockApiWithoutAutoLogout.get.mockResolvedValue({ data: mockUser });

      await authService.getCurrentUser();

      expect(mockApiWithoutAutoLogout.get).toHaveBeenCalledWith("/auth/me");
      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });
});
