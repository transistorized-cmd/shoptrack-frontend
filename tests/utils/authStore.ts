/**
 * Auth Store Mocking Utility
 * Provides comprehensive mocking for the auth store to prevent test failures
 * due to unmocked store methods and computed properties.
 */
import { vi, type MockedFunction } from "vitest";
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

/**
 * Mock user data for testing
 */
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: "1",
  email: "test@example.com",
  firstName: "John",
  lastName: "Doe",
  userName: "johndoe",
  profilePicture: "https://example.com/avatar.jpg",
  createdAt: "2023-01-01T00:00:00Z",
  emailConfirmed: true,
  emailVerifiedAt: "2023-01-01T00:00:00Z",
  hasPassword: true,
  passkeysEnabled: false,
  connectedAccounts: [],
  ...overrides,
});

/**
 * Create a complete auth store mock with all methods and computed properties
 */
export function createAuthStoreMock(initialUser: User | null = null) {
  // Create reactive state
  const user = ref<User | null>(initialUser);
  const loading = ref(false);
  const error = ref<AuthError | null>(null);
  const lastActivity = ref(Date.now());
  const sessionExpired = ref(false);

  // Create computed properties that depend on user state
  const isAuthenticated = computed(() => user.value !== null);
  const isEmailConfirmed = computed(() => {
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
    tokens: null,
    loading: loading.value,
    lastActivity: lastActivity.value,
  }));

  // Create mocked methods with proper typing
  const mockStore = {
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

    // Actions - all properly mocked
    initialize: vi.fn().mockResolvedValue(undefined) as MockedFunction<
      () => Promise<void>
    >,

    login: vi.fn().mockResolvedValue({
      success: true,
      message: "Login successful",
      user: user.value,
    }) as MockedFunction<(credentials: LoginRequest) => Promise<AuthResponse>>,

    register: vi.fn().mockResolvedValue({
      success: true,
      message: "Registration successful",
    }) as MockedFunction<(userData: RegisterRequest) => Promise<AuthResponse>>,

    loginWithOAuth: vi.fn().mockResolvedValue({
      success: true,
      message: "OAuth login successful",
      user: user.value,
    }) as MockedFunction<(request: OAuthLoginRequest) => Promise<AuthResponse>>,

    loginWithPasskey: vi.fn().mockResolvedValue({
      success: true,
      message: "Passkey login successful",
      user: user.value,
    }) as MockedFunction<
      (request: PasskeyLoginRequest) => Promise<AuthResponse>
    >,

    logout: vi.fn().mockImplementation(() => {
      user.value = null;
      error.value = null;
      sessionExpired.value = false;
      loading.value = false;
      return Promise.resolve();
    }) as MockedFunction<() => Promise<void>>,

    refreshTokens: vi.fn().mockResolvedValue(true) as MockedFunction<
      () => Promise<boolean>
    >,

    forgotPassword: vi.fn().mockResolvedValue({
      success: true,
      message: "Password reset email sent",
    }) as MockedFunction<
      (request: ForgotPasswordRequest) => Promise<AuthResponse>
    >,

    resetPassword: vi.fn().mockResolvedValue({
      success: true,
      message: "Password reset successful",
    }) as MockedFunction<
      (request: ResetPasswordRequest) => Promise<AuthResponse>
    >,

    changePassword: vi.fn().mockResolvedValue({
      success: true,
      message: "Password changed successfully",
    }) as MockedFunction<
      (request: ChangePasswordRequest) => Promise<AuthResponse>
    >,

    updateProfile: vi
      .fn()
      .mockImplementation((request: UpdateProfileRequest) => {
        if (user.value) {
          // Update user data optimistically
          user.value = { ...user.value, ...request };
        }
        return Promise.resolve({
          success: true,
          message: "Profile updated successfully",
          user: user.value,
        });
      }) as MockedFunction<
      (request: UpdateProfileRequest) => Promise<AuthResponse>
    >,

    registerPasskey: vi.fn().mockImplementation(() => {
      if (user.value) {
        user.value.passkeysEnabled = true;
      }
      return Promise.resolve({
        success: true,
        message: "Passkey registered successfully",
      });
    }) as MockedFunction<
      (request: PasskeyRegistrationRequest) => Promise<AuthResponse>
    >,

    removePasskey: vi.fn().mockImplementation(() => {
      if (user.value) {
        user.value.passkeysEnabled = false;
      }
      return Promise.resolve({
        success: true,
        message: "Passkey removed successfully",
      });
    }) as MockedFunction<() => Promise<AuthResponse>>,

    verifyTwoFactor: vi.fn().mockResolvedValue({
      success: true,
      message: "Two-factor verification successful",
      user: user.value,
    }) as MockedFunction<(request: TwoFactorRequest) => Promise<AuthResponse>>,

    confirmEmail: vi.fn().mockImplementation((token: string) => {
      if (user.value) {
        user.value.emailConfirmed = true;
      }
      return Promise.resolve({
        success: true,
        message: "Email confirmed successfully",
      });
    }) as MockedFunction<(token: string) => Promise<AuthResponse>>,

    resendEmailConfirmation: vi.fn().mockResolvedValue({
      success: true,
      message: "Confirmation email sent",
    }) as MockedFunction<() => Promise<AuthResponse>>,

    clearError: vi.fn().mockImplementation(() => {
      error.value = null;
    }) as MockedFunction<() => void>,

    updateLastActivity: vi.fn().mockImplementation(() => {
      lastActivity.value = Date.now();
    }) as MockedFunction<() => void>,

    setSessionExpired: vi.fn().mockImplementation((expired: boolean) => {
      sessionExpired.value = expired;
    }) as MockedFunction<(expired: boolean) => void>,

    setOnSessionExpiredCallback: vi.fn() as MockedFunction<
      (callback: () => void) => void
    >,

    // Session management
    getSessions: vi.fn().mockResolvedValue([]) as MockedFunction<
      () => Promise<UserSession[]>
    >,

    revokeSession: vi.fn().mockResolvedValue({
      success: true,
      message: "Session revoked successfully",
    }) as MockedFunction<(sessionId: string) => Promise<AuthResponse>>,

    revokeAllSessions: vi.fn().mockImplementation(() => {
      user.value = null;
      return Promise.resolve({
        success: true,
        message: "All sessions revoked",
      });
    }) as MockedFunction<() => Promise<AuthResponse>>,

    // Internal helper
    initializeUserData: vi.fn().mockResolvedValue(undefined) as MockedFunction<
      () => Promise<void>
    >,
  };

  return mockStore;
}

/**
 * Create an authenticated auth store mock with a logged-in user
 */
export function createAuthenticatedAuthStoreMock(
  userOverrides: Partial<User> = {},
) {
  const mockUser = createMockUser(userOverrides);
  return createAuthStoreMock(mockUser);
}

/**
 * Create an unauthenticated auth store mock
 */
export function createUnauthenticatedAuthStoreMock() {
  return createAuthStoreMock(null);
}

/**
 * Helper to update the user in an existing auth store mock
 */
export function setMockUser(
  authStoreMock: ReturnType<typeof createAuthStoreMock>,
  user: User | null,
) {
  authStoreMock.user.value = user;
}

/**
 * Helper to set loading state in an auth store mock
 */
export function setMockLoading(
  authStoreMock: ReturnType<typeof createAuthStoreMock>,
  loading: boolean,
) {
  authStoreMock.loading.value = loading;
}

/**
 * Helper to set error state in an auth store mock
 */
export function setMockError(
  authStoreMock: ReturnType<typeof createAuthStoreMock>,
  error: AuthError | null,
) {
  authStoreMock.error.value = error;
}

/**
 * Helper to simulate login in a mock auth store
 */
export function simulateLogin(
  authStoreMock: ReturnType<typeof createAuthStoreMock>,
  user: User,
) {
  authStoreMock.user.value = user;
  authStoreMock.loading.value = false;
  authStoreMock.error.value = null;
  authStoreMock.sessionExpired.value = false;
  authStoreMock.updateLastActivity();
}

/**
 * Helper to simulate logout in a mock auth store
 */
export function simulateLogout(
  authStoreMock: ReturnType<typeof createAuthStoreMock>,
) {
  authStoreMock.user.value = null;
  authStoreMock.loading.value = false;
  authStoreMock.error.value = null;
  authStoreMock.sessionExpired.value = false;
}

/**
 * Mock the auth store module for vi.mock()
 */
export function mockAuthStoreModule(
  authStoreMock?: ReturnType<typeof createAuthStoreMock>,
) {
  const mockStore = authStoreMock || createAuthStoreMock();

  return {
    useAuthStore: vi.fn(() => mockStore),
    useAuth: vi.fn(() => mockStore),
  };
}

/**
 * Common auth test scenarios
 */
export const authTestScenarios = {
  /**
   * Authenticated user with all features enabled
   */
  authenticatedUser: () =>
    createAuthenticatedAuthStoreMock({
      emailConfirmed: true,
      hasPassword: true,
      passkeysEnabled: true,
    }),

  /**
   * Authenticated user with unconfirmed email
   */
  unconfirmedUser: () =>
    createAuthenticatedAuthStoreMock({
      emailConfirmed: false,
      emailVerifiedAt: null,
    }),

  /**
   * Social login user without password
   */
  socialUser: () =>
    createAuthenticatedAuthStoreMock({
      hasPassword: false,
      passkeysEnabled: false,
    }),

  /**
   * User with passkeys enabled
   */
  passkeyUser: () =>
    createAuthenticatedAuthStoreMock({
      passkeysEnabled: true,
    }),

  /**
   * Unauthenticated state
   */
  unauthenticated: () => createUnauthenticatedAuthStoreMock(),

  /**
   * Loading state
   */
  loading: () => {
    const mock = createAuthStoreMock();
    setMockLoading(mock, true);
    return mock;
  },

  /**
   * Error state
   */
  error: (errorMessage = "Authentication error") => {
    const mock = createAuthStoreMock();
    setMockError(mock, {
      code: "AUTH_ERROR",
      message: errorMessage,
    });
    return mock;
  },
};
