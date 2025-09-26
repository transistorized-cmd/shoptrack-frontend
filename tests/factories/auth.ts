/**
 * Authentication and user test data factories
 * Provides factories for User, AuthResponse, ConnectedAccount and related auth types
 */
import { faker } from "@faker-js/faker";
import {
  createFactory,
  testId,
  testDate,
  testEmail,
  testConstants,
} from "./base";
import type {
  User,
  ConnectedAccount,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  TwoFactorRequest,
  PasskeyCredential,
} from "@/types/auth";

/**
 * Connected account factory
 */
export const connectedAccountFactory = createFactory<ConnectedAccount>(() => ({
  id: testId.uuid(),
  provider: faker.helpers.arrayElement(["google", "apple", "microsoft"]),
  providerUserId: testId.uuid(),
  email: testEmail.fake(),
  name: faker.person.fullName(),
  connectedAt: testDate.recent(),
}));

/**
 * User factory with realistic defaults
 */
export const userFactory = createFactory<User>(() => ({
  id: testId.sequence(),
  email: testEmail.fake(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  name: faker.person.fullName(),
  emailConfirmed: true,
  emailVerifiedAt: testDate.recent(),
  hasPassword: true,
  passkeysEnabled: false,
  provider: "local",
  avatarUrl: faker.image.avatar(),
  phone: faker.phone.number(),
  isActive: true,
  twoFactorEnabled: false,
  subscriptionStatus: "active",
  subscriptionPlan: "free",
  subscriptionExpiresAt: null,
  trialEndsAt: null,
  createdAt: testDate.past(),
  // Legacy fields
  userName: faker.internet.username(),
  profilePicture: faker.image.avatar(),
  lastLoginAt: testDate.recent(),
  connectedAccounts: [],
}));

/**
 * AuthResponse factory
 */
export const authResponseFactory = createFactory<AuthResponse>(() => ({
  success: true,
  message: "Authentication successful",
  user: userFactory.build(),
  token: faker.string.alphanumeric(64),
  refreshToken: faker.string.alphanumeric(64),
  expiresIn: 3600,
}));

/**
 * Login request factory
 */
export const loginRequestFactory = createFactory<LoginRequest>(() => ({
  email: testEmail.fake(),
  password: "TestPassword123!",
  rememberMe: false,
}));

/**
 * Register request factory
 */
export const registerRequestFactory = createFactory<RegisterRequest>(() => ({
  email: testEmail.fake(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  password: "TestPassword123!",
  confirmPassword: "TestPassword123!",
  acceptTerms: true,
}));

/**
 * Refresh token request factory
 */
export const refreshTokenRequestFactory = createFactory<RefreshTokenRequest>(
  () => ({
    refreshToken: faker.string.alphanumeric(64),
  }),
);

/**
 * Change password request factory
 */
export const changePasswordRequestFactory =
  createFactory<ChangePasswordRequest>(() => ({
    currentPassword: "OldPassword123!",
    newPassword: "NewPassword123!",
    confirmPassword: "NewPassword123!",
  }));

/**
 * Update profile request factory
 */
export const updateProfileRequestFactory = createFactory<UpdateProfileRequest>(
  () => ({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: faker.phone.number(),
  }),
);

/**
 * Forgot password request factory
 */
export const forgotPasswordRequestFactory =
  createFactory<ForgotPasswordRequest>(() => ({
    email: testEmail.fake(),
  }));

/**
 * Reset password request factory
 */
export const resetPasswordRequestFactory = createFactory<ResetPasswordRequest>(
  () => ({
    email: testEmail.fake(),
    token: faker.string.alphanumeric(32),
    password: "NewPassword123!",
    confirmPassword: "NewPassword123!",
  }),
);

/**
 * Two-factor authentication request factory
 */
export const twoFactorRequestFactory = createFactory<TwoFactorRequest>(() => ({
  code: faker.string.numeric(6),
  rememberDevice: false,
}));

/**
 * Passkey credential factory
 */
export const passkeyCredentialFactory = createFactory<PasskeyCredential>(
  () => ({
    id: testId.uuid(),
    name: `${faker.company.name()} Device`,
    createdAt: testDate.recent(),
    lastUsedAt: testDate.recent(),
  }),
);

/**
 * Predefined user variants for common test scenarios
 */
export const userVariants = {
  /**
   * Basic authenticated user
   */
  authenticated: () =>
    userFactory.build({
      id: 1,
      email: testEmail.fixed(),
      firstName: "Test",
      lastName: "User",
      emailConfirmed: true,
      hasPassword: true,
      isActive: true,
    }),

  /**
   * User with unconfirmed email
   */
  unconfirmedEmail: () =>
    userFactory.build({
      emailConfirmed: false,
      emailVerifiedAt: null,
    }),

  /**
   * User without password (OAuth only)
   */
  oauthOnly: () =>
    userFactory.build({
      hasPassword: false,
      provider: "google",
      connectedAccounts: [
        connectedAccountFactory.build({ provider: "google" }),
      ],
    }),

  /**
   * User with passkeys enabled
   */
  withPasskeys: () =>
    userFactory.build({
      passkeysEnabled: true,
      hasPassword: false,
    }),

  /**
   * User with two-factor authentication
   */
  with2FA: () =>
    userFactory.build({
      twoFactorEnabled: true,
    }),

  /**
   * Premium subscription user
   */
  premium: () =>
    userFactory.build({
      subscriptionStatus: "active",
      subscriptionPlan: "premium",
      subscriptionExpiresAt: testDate.future(),
    }),

  /**
   * Trial user
   */
  trial: () =>
    userFactory.build({
      subscriptionStatus: "trial",
      subscriptionPlan: "premium",
      trialEndsAt: testDate.future(),
    }),

  /**
   * Inactive/suspended user
   */
  inactive: () =>
    userFactory.build({
      isActive: false,
      subscriptionStatus: "suspended",
    }),
};

/**
 * Predefined auth response variants
 */
export const authResponseVariants = {
  /**
   * Successful login response
   */
  success: () =>
    authResponseFactory.build({
      success: true,
      message: "Login successful",
      user: userVariants.authenticated(),
    }),

  /**
   * Failed login response
   */
  failure: () =>
    authResponseFactory.build({
      success: false,
      message: "Invalid credentials",
      user: null,
      token: null,
      refreshToken: null,
      expiresIn: 0,
    }),

  /**
   * Email confirmation required
   */
  emailConfirmationRequired: () =>
    authResponseFactory.build({
      success: false,
      message: "Email confirmation required",
      user: userVariants.unconfirmedEmail(),
      token: null,
      refreshToken: null,
    }),

  /**
   * Two-factor authentication required
   */
  twoFactorRequired: () =>
    authResponseFactory.build({
      success: false,
      message: "Two-factor authentication required",
      user: userVariants.with2FA(),
      requiresTwoFactor: true,
      token: null,
      refreshToken: null,
    }),

  /**
   * Account suspended
   */
  suspended: () =>
    authResponseFactory.build({
      success: false,
      message: "Account has been suspended",
      user: userVariants.inactive(),
      token: null,
      refreshToken: null,
    }),
};

/**
 * Mock service responses for common auth operations
 */
export const mockAuthServiceResponses = {
  /**
   * Successful operations
   */
  success: {
    login: () => Promise.resolve(authResponseVariants.success()),
    register: () => Promise.resolve(authResponseVariants.success()),
    refreshToken: () => Promise.resolve(authResponseFactory.build()),
    getCurrentUser: () => Promise.resolve(userVariants.authenticated()),
    updateProfile: () => Promise.resolve(userVariants.authenticated()),
    changePassword: () => Promise.resolve(true),
    logout: () => Promise.resolve(true),
    initializeAuth: () => Promise.resolve(userVariants.authenticated()),
    forgotPassword: () => Promise.resolve(true),
    resetPassword: () => Promise.resolve(true),
    confirmEmail: () => Promise.resolve(true),
    resendEmailConfirmation: () => Promise.resolve(true),
    verifyTwoFactor: () => Promise.resolve(authResponseVariants.success()),
  },

  /**
   * Error operations
   */
  error: {
    login: () => Promise.reject(new Error("Invalid credentials")),
    register: () => Promise.reject(new Error("Email already exists")),
    refreshToken: () => Promise.reject(new Error("Invalid refresh token")),
    getCurrentUser: () => Promise.reject(new Error("Unauthorized")),
    updateProfile: () => Promise.reject(new Error("Validation failed")),
    changePassword: () =>
      Promise.reject(new Error("Current password incorrect")),
    logout: () => Promise.reject(new Error("Logout failed")),
    initializeAuth: () =>
      Promise.reject(new Error("Auth initialization failed")),
    forgotPassword: () => Promise.reject(new Error("Email not found")),
    resetPassword: () => Promise.reject(new Error("Invalid reset token")),
    confirmEmail: () => Promise.reject(new Error("Invalid confirmation token")),
    resendEmailConfirmation: () =>
      Promise.reject(new Error("Too many requests")),
    verifyTwoFactor: () =>
      Promise.reject(new Error("Invalid verification code")),
  },
};

/**
 * Settings service mock responses
 */
export const mockSettingsServiceResponses = {
  getSettings: () =>
    Promise.resolve({
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
  updateSetting: () => Promise.resolve(true),
  updateSettings: () => Promise.resolve(true),
};
