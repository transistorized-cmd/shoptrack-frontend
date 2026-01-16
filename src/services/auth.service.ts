import api, { apiWithoutAutoLogout } from "@/services/api";
import { tokenManager } from "./tokenManager";
import type { AxiosResponse } from "axios";
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
  PasskeyCreationOptionsResponse,
  PasskeyRequestOptionsResponse,
  TwoFactorRequest,
  TwoFactorSetupResponse,
  UserSession,
} from "@/types/auth";

/**
 * Authentication Service
 *
 * IMPORTANT: This service uses HTTP-only cookies for authentication.
 * - Tokens are NOT accessible to JavaScript (prevents XSS attacks)
 * - Authentication state is managed by the backend via secure cookies
 * - Use the auth store (useAuthStore) for authentication state management
 * - DO NOT attempt to manually manage tokens - they're handled automatically
 */
class AuthService {
  private readonly API_BASE = "/auth";

  // All requests now go through the centralized api instance
  // which handles CSRF tokens automatically

  // Authentication methods
  async login(request: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      `${this.API_BASE}/login`,
      request,
    );

    // Store tokens for cross-origin scenarios (fly.dev public suffix domains)
    // Cookies can't be shared on these domains, so we use Bearer tokens instead
    if (response.data.success && response.data.accessToken) {
      tokenManager.setTokens(
        response.data.accessToken,
        response.data.refreshToken || '',
        response.data.expiresAt || new Date(Date.now() + 15 * 60 * 1000) // 15 min default
      );
    }

    return response.data;
  }

  async register(request: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      `${this.API_BASE}/register`,
      request,
    );
    return response.data;
  }

  async loginWithOAuth(request: OAuthLoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      `${this.API_BASE}/oauth/${request.provider}`,
      request,
    );

    // Store tokens for cross-origin scenarios (fly.dev public suffix domains)
    if (response.data.success && response.data.accessToken) {
      tokenManager.setTokens(
        response.data.accessToken,
        response.data.refreshToken || '',
        response.data.expiresAt || new Date(Date.now() + 15 * 60 * 1000)
      );
    }

    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await api.post(`${this.API_BASE}/logout`);
    } catch (error) {
      console.warn("Logout API call failed:", error);
    } finally {
      // Clear stored tokens for cross-origin scenarios
      tokenManager.clearTokens();
      // Cookies are also cleared by the backend logout endpoint
    }
  }

  // Password recovery
  async forgotPassword(request: ForgotPasswordRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      `${this.API_BASE}/forgot-password`,
      request,
    );
    return response.data;
  }

  async resetPassword(request: ResetPasswordRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      `${this.API_BASE}/reset-password`,
      request,
    );
    return response.data;
  }

  async changePassword(request: ChangePasswordRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      `${this.API_BASE}/change-password`,
      request,
    );
    return response.data;
  }

  // Profile management
  async getCurrentUser(): Promise<User | null> {
    try {
      // Use apiWithoutAutoLogout to prevent false logout triggers when checking auth status
      const response = await apiWithoutAutoLogout.get(`${this.API_BASE}/me`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async updateProfile(request: UpdateProfileRequest): Promise<AuthResponse> {
    // Handle profile picture upload separately if needed
    if (request.profilePicture) {
      // TODO: Implement profile picture upload endpoint
      throw new Error("Profile picture upload not yet implemented");
    }

    // For text-only updates, send as JSON
    const updateData: Record<string, string> = {};

    if (request.firstName) updateData.firstName = request.firstName;
    if (request.lastName) updateData.lastName = request.lastName;
    if (request.userName) updateData.userName = request.userName;
    if (request.email) updateData.email = request.email;

    const response = await api.put<AuthResponse>(
      `${this.API_BASE}/profile`,
      updateData,
    );
    return response.data;
  }

  // Passkey / WebAuthn support
  async getPasskeyCreationOptions(): Promise<PasskeyCreationOptionsResponse> {
    const response = await api.get("/passkey/creation-options");
    return response.data;
  }

  async registerPasskey(
    request: PasskeyRegistrationRequest,
  ): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/passkey/register", request);
    return response.data;
  }

  async getPasskeyRequestOptions(): Promise<PasskeyRequestOptionsResponse> {
    const response = await api.get("/passkey/assertion-options");
    return response.data;
  }

  async loginWithPasskey(request: PasskeyLoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/passkey/verify", request);

    // Store tokens for cross-origin scenarios (fly.dev public suffix domains)
    if (response.data.success && response.data.accessToken) {
      tokenManager.setTokens(
        response.data.accessToken,
        response.data.refreshToken || '',
        response.data.expiresAt || new Date(Date.now() + 15 * 60 * 1000)
      );
    }

    return response.data;
  }

  async getPasskeys(): Promise<any[]> {
    const response = await api.get("/passkey/list");
    return response.data;
  }

  async removePasskey(credentialId: number): Promise<AuthResponse> {
    try {
      const response = await api.delete<any>(`/passkey/${credentialId}`);

      // Backend returns { message: "..." } format, convert to AuthResponse format
      return {
        success: true,
        message: response.data.message || "Passkey removed successfully",
      };
    } catch (err: any) {
      return {
        success: false,
        message:
          err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to remove passkey",
        errors: [
          err.response?.data?.error ||
            err.response?.data?.message ||
            "Failed to remove passkey",
        ],
      };
    }
  }

  // Two-factor authentication
  async enableTwoFactor(): Promise<TwoFactorSetupResponse> {
    const response = await api.post(`${this.API_BASE}/2fa/enable`);
    return response.data;
  }

  async verifyTwoFactor(request: TwoFactorRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      `${this.API_BASE}/2fa/verify`,
      request,
    );
    return response.data;
  }

  async disableTwoFactor(code: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      `${this.API_BASE}/2fa/disable`,
      { code },
    );
    return response.data;
  }

  // Session management
  async getSessions(): Promise<UserSession[]> {
    const response = await api.get(`${this.API_BASE}/sessions`);
    return response.data;
  }

  async revokeSession(sessionId: string): Promise<AuthResponse> {
    const response = await api.delete<AuthResponse>(
      `${this.API_BASE}/sessions/${sessionId}`,
    );
    return response.data;
  }

  async revokeAllSessions(): Promise<AuthResponse> {
    const response = await api.delete<AuthResponse>(
      `${this.API_BASE}/sessions`,
    );
    return response.data;
  }

  // Token refresh not needed with cookie authentication
  // Cookies are automatically managed by the browser and backend

  // OAuth account management
  async connectOAuthAccount(provider: string): Promise<string> {
    const response = await api.get(
      `${this.API_BASE}/oauth/${provider}/connect`,
    );
    return response.data.authUrl;
  }

  async disconnectOAuthAccount(provider: string): Promise<AuthResponse> {
    const response = await api.delete<AuthResponse>(
      `${this.API_BASE}/oauth/${provider}/disconnect`,
    );
    return response.data;
  }

  // Email confirmation
  async confirmEmail(token: string, email?: string): Promise<AuthResponse> {
    const queryParams = new URLSearchParams({ token });
    if (email) queryParams.set("email", email);
    const response = await api.get<AuthResponse>(
      `${this.API_BASE}/verify-email?${queryParams.toString()}`,
    );
    return response.data;
  }

  async resendEmailConfirmation(): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      `${this.API_BASE}/resend-email-confirmation`,
    );
    return response.data;
  }
  // Initialize auth for cookie-based authentication
  initializeAuth(): void {
    // Clean up any old JWT tokens from localStorage/sessionStorage (one-time cleanup)
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("authToken");
      localStorage.removeItem("shoptrack_token");

      sessionStorage.removeItem("token");
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
      sessionStorage.removeItem("authToken");
      sessionStorage.removeItem("shoptrack_token");
    } catch (error) {
      console.warn("Failed to clean up old JWT tokens:", error);
    }

    // HTTP-only cookies are automatically sent with requests
    // No manual token management needed
  }
}

export const authService = new AuthService();
export default authService;
