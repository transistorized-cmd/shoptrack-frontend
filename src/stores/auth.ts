import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  User,
  AuthTokens,
  SessionInfo,
  LoginRequest,
  RegisterRequest,
  OAuthLoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  AuthResponse,
  AuthError,
  PasskeyLoginRequest,
  PasskeyRegistrationRequest,
  TwoFactorRequest,
  UserSession,
} from "@/types/auth";
import { authService } from "@/services/auth.service";
import { languageSettingsService } from "@/services/languageSettings.service";
import { useCsrfToken } from "@/composables/useCsrfToken";

// Import csrf manager at module level to avoid dynamic imports in error paths
let csrfManagerPromise: Promise<any> | null = null;
const getCsrfManager = async () => {
  if (!csrfManagerPromise) {
    csrfManagerPromise = import('@/composables/useCsrfToken').then(module => module.csrfManager);
  }
  return csrfManagerPromise;
};

export const useAuthStore = defineStore("auth", () => {
  // State
  const user = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<AuthError | null>(null);
  const lastActivity = ref(Date.now());
  const sessionExpired = ref(false);

  // Callback for handling session expiration/logout navigation
  let onSessionExpiredCallback: (() => void) | null = null;

  // Computed
  const isAuthenticated = computed(() => user.value !== null);
  const isEmailConfirmed = computed(() => {
    // Email is confirmed if emailConfirmed is true OR emailVerifiedAt has a date
    return (
      user.value?.emailConfirmed === true ||
      (user.value?.emailVerifiedAt !== null &&
        user.value?.emailVerifiedAt !== undefined)
    );
  });
  const hasPassword = computed(() => user.value?.hasPassword ?? false);
  const passkeysEnabled = computed(() => user.value?.passkeysEnabled ?? false);
  const connectedAccounts = computed(() => user.value?.connectedAccounts ?? []);

  const sessionInfo = computed<SessionInfo>(() => ({
    isAuthenticated: isAuthenticated.value,
    user: user.value,
    tokens: null, // Tokens are now in secure HTTP-only cookies - no longer used
    loading: loading.value,
    lastActivity: lastActivity.value,
  }));

  // Actions
  function clearError() {
    error.value = null;
  }

  function setOnSessionExpiredCallback(callback: () => void) {
    onSessionExpiredCallback = callback;
  }

  function updateLastActivity() {
    lastActivity.value = Date.now();
  }

  function setError(authError: AuthError) {
    error.value = authError;
  }

  function setSessionExpired(expired: boolean) {
    sessionExpired.value = expired;
  }

  async function initialize() {
    loading.value = true;
    clearError();

    try {
      // No need to initialize auth service - cookies are handled automatically
      authService.initializeAuth();

      // Try to fetch current user data to check if we're authenticated
      const userData = await authService.getCurrentUser();
      if (userData) {
        user.value = userData;
        updateLastActivity();

        // Initialize language from user settings if authenticated
        try {
          await languageSettingsService.initializeFromUserSettings();
        } catch (error) {
          console.warn(
            "Failed to initialize language from user settings:",
            error,
          );
        }
      } else {
        // No valid session, clear user state
        user.value = null;
        sessionExpired.value = false;
      }
    } catch (err: any) {
      // If getCurrentUser fails, we're not authenticated
      // Don't treat 401 errors as application errors - they're expected when not logged in
      if (err?.response?.status === 401 || err?.status === 401) {
        console.info("User not authenticated - this is expected behavior");
      } else {
        console.warn("Authentication initialization failed:", err);
        // Only set error for non-authentication related issues
        if (err?.response?.status !== 401 && err?.status !== 401) {
          setError({
            code: "INIT_ERROR",
            message: "Failed to initialize authentication system",
          });
        }
      }

      user.value = null;
      sessionExpired.value = false;
    } finally {
      loading.value = false;
    }
  }

  async function login(credentials: LoginRequest): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      const response = await authService.login(credentials);

      if (response.success) {
        // If we have user data in response, use it
        if (response.user) {
          user.value = response.user;
        } else {
          // If no user data in login response, fetch it
          const userData = await authService.getCurrentUser();
          if (userData) {
            user.value = userData;
          }
        }

        // Initialize user data (settings, language, etc.) after successful login
        await initializeUserData();

        // Initialize CSRF protection after successful login
        try {
          const csrfManager = await getCsrfManager();
          if (csrfManager && csrfManager.initialize) {
            await csrfManager.initialize();
            console.info('CSRF protection initialized after login');
          }
        } catch (csrfError) {
          console.warn('Failed to initialize CSRF protection after login', csrfError);
          // Don't fail the login process for CSRF issues
        }

        // Authentication is now handled by secure HTTP-only cookies automatically
        updateLastActivity();
        sessionExpired.value = false;
      } else if (response.errors) {
        setError({
          code: "LOGIN_FAILED",
          message: response.message || "Login failed",
          details: response.errors.reduce(
            (acc, err) => {
              acc[err] = [err];
              return acc;
            },
            {} as Record<string, string[]>,
          ),
        });
      }

      return response;
    } catch (err: any) {
      console.error("Login error:", err); // Debug log
      const authError: AuthError = {
        code: "LOGIN_ERROR",
        message:
          err.response?.data?.message || "An error occurred during login",
      };
      setError(authError);

      return {
        success: false,
        message: authError.message,
        errors: [authError.message],
      };
    } finally {
      loading.value = false;
    }
  }

  async function register(userData: RegisterRequest): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      const response = await authService.register(userData);

      if (!response.success && response.errors) {
        setError({
          code: "REGISTRATION_FAILED",
          message: response.message || "Registration failed",
          details: response.errors.reduce(
            (acc, err) => {
              acc[err] = [err];
              return acc;
            },
            {} as Record<string, string[]>,
          ),
        });
      }

      return response;
    } catch (err: any) {
      const authError: AuthError = {
        code: "REGISTRATION_ERROR",
        message:
          err.response?.data?.message ||
          "An error occurred during registration",
      };
      setError(authError);

      return {
        success: false,
        message: authError.message,
        errors: [authError.message],
      };
    } finally {
      loading.value = false;
    }
  }

  async function loginWithOAuth(
    request: OAuthLoginRequest,
  ): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      const response = await authService.loginWithOAuth(request);

      if (response.success && response.user) {
        user.value = response.user;
        // Authentication is now handled by secure HTTP-only cookies automatically
        updateLastActivity();
        sessionExpired.value = false;

        // Initialize user data (settings, language, etc.) after successful OAuth login
        await initializeUserData();
      }

      return response;
    } catch (err: any) {
      const authError: AuthError = {
        code: "OAUTH_LOGIN_ERROR",
        message: err.response?.data?.message || "OAuth login failed",
      };
      setError(authError);

      return {
        success: false,
        message: authError.message,
        errors: [authError.message],
      };
    } finally {
      loading.value = false;
    }
  }

  async function loginWithPasskey(
    request: PasskeyLoginRequest,
  ): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      const response = await authService.loginWithPasskey(request);

      if (response.success && response.user) {
        user.value = response.user;
        // Authentication is now handled by secure HTTP-only cookies automatically
        updateLastActivity();
        sessionExpired.value = false;

        // Initialize user data (settings, language, etc.) after successful passkey login
        await initializeUserData();
      }

      return response;
    } catch (err: any) {
      const authError: AuthError = {
        code: "PASSKEY_LOGIN_ERROR",
        message: err.response?.data?.message || "Passkey login failed",
      };
      setError(authError);

      return {
        success: false,
        message: authError.message,
        errors: [authError.message],
      };
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    loading.value = true;

    try {
      await authService.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Always clear local state regardless of API call success
      user.value = null;
      // Authentication cookies are cleared by the backend automatically
      sessionExpired.value = false;
      clearError();

      // Clear CSRF tokens on logout
      try {
        const { invalidateCsrf } = useCsrfToken()
        invalidateCsrf()
      } catch (error) {
        // Don't fail logout for CSRF cleanup issues
        console.warn('Failed to clear CSRF tokens during logout')
      }

      loading.value = false;

      // Navigate to login page if callback is set
      if (onSessionExpiredCallback) {
        onSessionExpiredCallback();
      }
    }
  }

  async function refreshTokens(): Promise<boolean> {
    try {
      // With cookie authentication, we just need to check if we're still authenticated
      const userData = await authService.getCurrentUser();
      if (userData) {
        user.value = userData;
        updateLastActivity();
        return true;
      }

      // Session expired, logout user
      await logout();
      setSessionExpired(true);
      return false;
    } catch (err) {
      await logout();
      setSessionExpired(true);
      return false;
    }
  }

  async function forgotPassword(
    request: ForgotPasswordRequest,
  ): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      return await authService.forgotPassword(request);
    } catch (err: any) {
      const authError: AuthError = {
        code: "FORGOT_PASSWORD_ERROR",
        message:
          err.response?.data?.message || "Failed to send password reset email",
      };
      setError(authError);

      return {
        success: false,
        message: authError.message,
        errors: [authError.message],
      };
    } finally {
      loading.value = false;
    }
  }

  async function resetPassword(
    request: ResetPasswordRequest,
  ): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      return await authService.resetPassword(request);
    } catch (err: any) {
      const authError: AuthError = {
        code: "RESET_PASSWORD_ERROR",
        message: err.response?.data?.message || "Failed to reset password",
      };
      setError(authError);

      return {
        success: false,
        message: authError.message,
        errors: [authError.message],
      };
    } finally {
      loading.value = false;
    }
  }

  async function changePassword(
    request: ChangePasswordRequest,
  ): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      const response = await authService.changePassword(request);

      if (response.success) {
        // Update user to reflect that they now have a password
        if (user.value) {
          user.value.hasPassword = true;
        }
      }

      return response;
    } catch (err: any) {
      const authError: AuthError = {
        code: "CHANGE_PASSWORD_ERROR",
        message: err.response?.data?.message || "Failed to change password",
      };
      setError(authError);

      return {
        success: false,
        message: authError.message,
        errors: [authError.message],
      };
    } finally {
      loading.value = false;
    }
  }

  async function updateProfile(
    request: UpdateProfileRequest,
  ): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      const response = await authService.updateProfile(request);

      if (response.success && response.user) {
        user.value = response.user;
      }

      return response;
    } catch (err: any) {
      const authError: AuthError = {
        code: "UPDATE_PROFILE_ERROR",
        message: err.response?.data?.message || "Failed to update profile",
      };
      setError(authError);

      return {
        success: false,
        message: authError.message,
        errors: [authError.message],
      };
    } finally {
      loading.value = false;
    }
  }

  async function registerPasskey(
    request: PasskeyRegistrationRequest,
  ): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      const response = await authService.registerPasskey(request);

      if (response.success) {
        // Refresh user from backend to ensure latest state (e.g., passkeysEnabled)
        try {
          const freshUser = await authService.getCurrentUser();
          if (freshUser) {
            user.value = freshUser;
          } else if (user.value) {
            // Fallback: optimistically set the flag
            user.value.passkeysEnabled = true;
          }
        } catch {
          // Network or auth issue; fallback to optimistic update
          if (user.value) user.value.passkeysEnabled = true;
        }
      }

      return response;
    } catch (err: any) {
      const authError: AuthError = {
        code: "PASSKEY_REGISTER_ERROR",
        message: err.response?.data?.message || "Failed to register passkey",
      };
      setError(authError);

      return {
        success: false,
        message: authError.message,
        errors: [authError.message],
      };
    } finally {
      loading.value = false;
    }
  }

  async function removePasskey(): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      // First, get the user's passkeys
      const passkeys = await authService.getPasskeys();

      if (!passkeys.length) {
        return {
          success: false,
          message: "No passkeys found",
          errors: ["No passkeys found"],
        };
      }

      // Remove all passkeys (since UI shows simple Active/Inactive state)
      const errors: string[] = [];
      let hasSuccess = false;

      for (const passkey of passkeys) {
        try {
          const response = await authService.removePasskey(passkey.id);
          if (response.success) {
            hasSuccess = true;
          } else {
            errors.push(response.message || "Failed to remove passkey");
          }
        } catch (err: any) {
          errors.push(
            err.response?.data?.message || "Failed to remove passkey",
          );
        }
      }

      // Update user state if any removal was successful
      if (hasSuccess && user.value) {
        user.value.passkeysEnabled = false;
      }

      // Return response based on results
      if (hasSuccess) {
        return {
          success: true,
          message:
            errors.length > 0
              ? "Some passkeys were removed, but there were errors with others"
              : "All passkeys removed successfully",
          errors: errors.length > 0 ? errors : undefined,
        };
      } else {
        return {
          success: false,
          message: "Failed to remove passkeys",
          errors,
        };
      }
    } catch (err: any) {
      const authError: AuthError = {
        code: "PASSKEY_REMOVE_ERROR",
        message: err.response?.data?.message || "Failed to remove passkey",
      };
      setError(authError);

      return {
        success: false,
        message: authError.message,
        errors: [authError.message],
      };
    } finally {
      loading.value = false;
    }
  }

  async function verifyTwoFactor(
    request: TwoFactorRequest,
  ): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      const response = await authService.verifyTwoFactor(request);

      if (response.success && response.user) {
        user.value = response.user;
        // Authentication is now handled by secure HTTP-only cookies automatically
        updateLastActivity();
      }

      return response;
    } catch (err: any) {
      const authError: AuthError = {
        code: "TWO_FACTOR_ERROR",
        message:
          err.response?.data?.message || "Two-factor verification failed",
      };
      setError(authError);

      return {
        success: false,
        message: authError.message,
        errors: [authError.message],
      };
    } finally {
      loading.value = false;
    }
  }

  async function confirmEmail(token: string): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      const response = await authService.confirmEmail(token);

      if (response.success && user.value) {
        user.value.emailConfirmed = true;
      }

      return response;
    } catch (err: any) {
      const authError: AuthError = {
        code: "EMAIL_CONFIRMATION_ERROR",
        message: err.response?.data?.message || "Email confirmation failed",
      };
      setError(authError);

      return {
        success: false,
        message: authError.message,
        errors: [authError.message],
      };
    } finally {
      loading.value = false;
    }
  }

  async function resendEmailConfirmation(): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      return await authService.resendEmailConfirmation();
    } catch (err: any) {
      let message = "Failed to resend confirmation email";

      // Handle specific error cases
      if (err.response?.status === 415) {
        message =
          "Email service is not configured on the server. Please contact support.";
      } else if (err.response?.status === 500) {
        message =
          "Server error occurred while sending email. Please try again later.";
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      }

      const authError: AuthError = {
        code: "RESEND_CONFIRMATION_ERROR",
        message,
      };
      setError(authError);

      return {
        success: false,
        message: authError.message,
        errors: [authError.message],
      };
    } finally {
      loading.value = false;
    }
  }

  // Session management methods
  async function getSessions(): Promise<UserSession[]> {
    try {
      return await authService.getSessions();
    } catch (err: any) {
      console.error("Failed to get sessions:", err);
      return [];
    }
  }

  async function revokeSession(sessionId: string): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      return await authService.revokeSession(sessionId);
    } catch (err: any) {
      const authError: AuthError = {
        code: "REVOKE_SESSION_ERROR",
        message: err.response?.data?.message || "Failed to revoke session",
      };
      setError(authError);

      return {
        success: false,
        message: authError.message,
        errors: [authError.message],
      };
    } finally {
      loading.value = false;
    }
  }

  async function revokeAllSessions(): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      const response = await authService.revokeAllSessions();

      if (response.success) {
        // After revoking all sessions, user needs to login again
        await logout();
      }

      return response;
    } catch (err: any) {
      const authError: AuthError = {
        code: "REVOKE_ALL_SESSIONS_ERROR",
        message: err.response?.data?.message || "Failed to revoke all sessions",
      };
      setError(authError);

      return {
        success: false,
        message: authError.message,
        errors: [authError.message],
      };
    } finally {
      loading.value = false;
    }
  }

  // Helper function to initialize user-specific data after successful authentication
  const initializeUserData = async () => {
    try {
      // Initialize language settings
      await languageSettingsService.initializeFromUserSettings();

      // Initialize settings store (temporarily disabled - settings endpoint not implemented)
      // TODO: Re-enable when settings endpoints are added to backend
      // const { useSettingsStore } = await import("@/stores/settings");
      // const settingsStore = useSettingsStore();
      // await settingsStore.fetchSettings();

      console.info("User data initialized successfully");
    } catch (error) {
      console.error("Failed to initialize user data:", error);
    }
  };

  return {
    // State
    user,
    loading,
    error,
    lastActivity,
    sessionExpired,

    // Computed
    isAuthenticated,
    isEmailConfirmed,
    hasPassword,
    passkeysEnabled,
    connectedAccounts,
    sessionInfo,

    // Actions
    initialize,
    login,
    register,
    loginWithOAuth,
    loginWithPasskey,
    logout,
    refreshTokens,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
    registerPasskey,
    removePasskey,
    verifyTwoFactor,
    confirmEmail,
    resendEmailConfirmation,
    clearError,
    updateLastActivity,
    setSessionExpired,
    setOnSessionExpiredCallback,
    // Session management
    getSessions,
    revokeSession,
    revokeAllSessions,
    // Internal helper
    initializeUserData,
  };
});

// Helper to access store outside of components
export function useAuth() {
  return useAuthStore();
}
