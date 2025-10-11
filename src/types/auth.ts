export interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  emailConfirmed: boolean;
  emailVerifiedAt?: string | null;
  hasPassword: boolean;
  passkeysEnabled: boolean;
  provider: string;
  avatarUrl?: string | null;
  phone?: string | null;
  isActive: boolean;
  twoFactorEnabled: boolean;
  subscriptionStatus: string;
  subscriptionPlan: string;
  subscriptionExpiresAt?: string | null;
  trialEndsAt?: string | null;
  createdAt?: string | null;
  // Legacy fields for backward compatibility
  userName?: string;
  profilePicture?: string;
  lastLoginAt?: string;
  connectedAccounts?: ConnectedAccount[];
}

export interface ConnectedAccount {
  id: string;
  provider: "google" | "apple" | "microsoft";
  providerDisplayName: string;
  email: string;
  connectedAt: string;
  isActive: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  recaptchaToken?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  subscriptionPlanId: number;
  currency: string;
  languageCode: string;
  timezone?: string;
  acceptTerms: boolean;
  recaptchaToken?: string;
}

export interface OAuthLoginRequest {
  provider: "google" | "apple" | "microsoft";
  accessToken: string;
  idToken?: string;
}

export interface PasskeyLoginRequest {
  credentialId: string;
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
}

export interface PasskeyRegistrationRequest {
  credentialId: string;
  publicKey: string;
  authenticatorData: string;
  clientDataJSON: string;
  attestationObject?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  message?: string;
  errors?: string[];
  requiresEmailConfirmation?: boolean;
  requiresTwoFactor?: boolean;
  lockoutEnd?: string;
}

export interface ForgotPasswordRequest {
  email: string;
  recaptchaToken?: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  userName?: string;
  email?: string;
  profilePicture?: File;
}

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface TwoFactorRequest {
  code: string;
  provider: "authenticator" | "sms" | "email";
  rememberMe?: boolean;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUri: string;
  recoveryCodes: string[];
}

// WebAuthn / Passkey server response types
export type WebAuthnTransport =
  | "usb"
  | "nfc"
  | "ble"
  | "internal"
  | "hybrid";

export interface PasskeyCredentialDescriptor {
  type: "public-key";
  id: string;
  transports?: WebAuthnTransport[];
}

export interface PasskeyCreationOptionsResponse {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: "public-key";
    alg: number;
  }>;
  authenticatorSelection?: {
    authenticatorAttachment?: "platform" | "cross-platform";
    requireResidentKey?: boolean;
    residentKey?: "discouraged" | "preferred" | "required";
    userVerification?: "required" | "preferred" | "discouraged";
  };
  timeout?: number;
  excludeCredentials?: PasskeyCredentialDescriptor[];
}

export interface PasskeyRequestOptionsResponse {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: PasskeyCredentialDescriptor[];
  userVerification?: "required" | "preferred" | "discouraged";
}

// Session and token types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
}

export interface SessionInfo {
  isAuthenticated: boolean;
  user: User | null;
  tokens: AuthTokens | null;
  loading: boolean;
  lastActivity: number;
}

// Backend session data structure (from /api/auth/sessions)
export interface UserSession {
  id: number;
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  expiresAt: string;
}
