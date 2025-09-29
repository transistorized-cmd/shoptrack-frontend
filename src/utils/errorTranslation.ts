import type { AuthError } from "@/types/auth";
import i18n from "@/i18n";

/**
 * Common error message patterns from the API that need translation
 */
const ERROR_MESSAGE_MAP: Record<string, string> = {
  "Invalid email or password": "errors.auth.invalidCredentials",
  "Invalid credentials": "errors.auth.invalidCredentials",
  "Account not found": "errors.auth.accountNotFound",
  "Email not verified": "errors.auth.emailNotVerified",
  "Please verify your email": "errors.auth.emailNotVerified",
  "Account locked": "errors.auth.accountLocked",
  "Too many failed attempts": "errors.auth.accountLocked",
  "Login failed": "errors.auth.loginFailed",
  "Registration failed": "errors.auth.registrationFailed",
  "Password reset failed": "errors.auth.passwordResetFailed",
  "Session expired": "errors.auth.sessionExpired",
  "OAuth login failed": "errors.auth.oauthFailed",
  "Social login failed": "errors.auth.oauthFailed",
  "Passkey login failed": "errors.auth.passkeyFailed",
  "Passkey authentication failed": "errors.auth.passkeyFailed",
  "Account disabled": "errors.auth.accountDisabled",
  "Two-factor authentication required": "errors.auth.twoFactorRequired",
  "2FA required": "errors.auth.twoFactorRequired",
  "Invalid two-factor code": "errors.auth.invalidTwoFactor",
  "Invalid 2FA code": "errors.auth.invalidTwoFactor",
  "An error occurred during login": "errors.auth.unknownError",
  "Network error": "errors.networkError",
  "Server error": "errors.serverError",
};

/**
 * Translates API error messages to localized text
 * @param error - The error object from the API
 * @returns Translated error message
 */
export function translateError(error: AuthError | string): string {
  const message = typeof error === "string" ? error : error.message;

  try {
    // Check for exact matches first
    const translationKey = ERROR_MESSAGE_MAP[message];
    if (translationKey) {
      if (i18n?.global?.t) {
        return i18n.global.t(translationKey);
      }
    }

    // Check for partial matches (case-insensitive)
    const lowerMessage = message.toLowerCase();
    for (const [pattern, key] of Object.entries(ERROR_MESSAGE_MAP)) {
      if (lowerMessage.includes(pattern.toLowerCase())) {
        if (i18n?.global?.t) {
          return i18n.global.t(key);
        }
      }
    }
  } catch (translationError) {
    console.warn('Error during translation:', translationError);
    // Fall through to return original message
  }

  // If no match found or translation failed, return the original message
  // This ensures we don't break existing functionality for new/unknown errors
  return message;
}

/**
 * Translates validation error messages to localized text
 * @param fieldName - The field name (email, password, etc.)
 * @param errorType - The type of validation error
 * @returns Translated validation error message
 */
export function translateValidationError(
  fieldName: string,
  errorType: string,
): string {
  // Common validation error patterns
  const validationKey = `validation.${errorType}`;

  try {
    if (i18n?.global?.t) {
      return i18n.global.t(validationKey);
    }
  } catch {
    // If translation key doesn't exist, try field-specific error
    const fieldSpecificKey = `validation.${fieldName}${errorType.charAt(0).toUpperCase() + errorType.slice(1)}`;
    try {
      if (i18n?.global?.t) {
        return i18n.global.t(fieldSpecificKey);
      }
    } catch {
      // Fallback to generic required message
      try {
        if (i18n?.global?.t) {
          return i18n.global.t("validation.required");
        }
      } catch {
        // Ultimate fallback
        return `${fieldName} is ${errorType}`;
      }
    }
  }

  // If i18n is not available, return a fallback message
  return `${fieldName} is ${errorType}`;
}
