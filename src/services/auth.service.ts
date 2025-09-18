import api, { apiWithoutAutoLogout } from "@/services/api";
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
  PublicKeyCredentialCreationOptions,
  PublicKeyCredentialRequestOptions,
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

    // Authentication tokens are now set as secure HTTP-only cookies by the backend
    // No need to manually handle tokens on the frontend

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

    // Authentication tokens are now set as secure HTTP-only cookies by the backend

    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await api.post(`${this.API_BASE}/logout`);
    } catch (error) {
      console.warn("Logout API call failed:", error);
    } finally {
      // Cookies are cleared by the backend logout endpoint
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
  async getPasskeyCreationOptions(): Promise<PublicKeyCredentialCreationOptions> {
    const response = await api.get("/passkey/creation-options");
    return response.data;
  }

  async registerPasskey(
    request: PasskeyRegistrationRequest,
  ): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/passkey/register", request);
    return response.data;
  }

  async getPasskeyRequestOptions(): Promise<PublicKeyCredentialRequestOptions> {
    const response = await api.get("/passkey/assertion-options");
    return response.data;
  }

  async loginWithPasskey(request: PasskeyLoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/passkey/verify", request);

    // Authentication tokens are now set as secure HTTP-only cookies by the backend

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

  // Token refresh - now using cookies only
  async refreshToken(): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      `${this.API_BASE}/refresh-token`,
    );
    return response.data;
  }

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
  // Initialize auth - kept for backward compatibility
  initializeAuth(): void {
    // HTTP-only cookies are automatically sent with requests
    // This method is kept for components that still call it
  }
}

export const authService = new AuthService();
export default authService;
