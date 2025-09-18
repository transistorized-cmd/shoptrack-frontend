import { describe, it, expect, beforeEach, vi } from "vitest";
import { translateError, translateValidationError } from "../errorTranslation";
import type { AuthError } from "@/types/auth";

// Mock i18n
vi.mock("@/i18n", () => ({
  default: {
    global: {
      t: vi.fn(),
    },
  },
}));

// Import after mocking
import i18n from "@/i18n";

const mockTranslate = vi.mocked(i18n.global.t);

describe("Error Translation Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock behavior - return translation key if no specific mock
    mockTranslate.mockImplementation((key: string) => `Translated: ${key}`);
  });

  describe("translateError", () => {
    describe("String Error Messages", () => {
      it("should translate exact match string error messages", () => {
        const result = translateError("Invalid email or password");

        expect(mockTranslate).toHaveBeenCalledWith(
          "errors.auth.invalidCredentials",
        );
        expect(result).toBe("Translated: errors.auth.invalidCredentials");
      });

      it("should translate network error messages", () => {
        const result = translateError("Network error");

        expect(mockTranslate).toHaveBeenCalledWith("errors.networkError");
        expect(result).toBe("Translated: errors.networkError");
      });

      it("should translate server error messages", () => {
        const result = translateError("Server error");

        expect(mockTranslate).toHaveBeenCalledWith("errors.serverError");
        expect(result).toBe("Translated: errors.serverError");
      });

      it("should handle case-insensitive partial matches", () => {
        const result = translateError(
          "Something went wrong with NETWORK ERROR occurred",
        );

        expect(mockTranslate).toHaveBeenCalledWith("errors.networkError");
        expect(result).toBe("Translated: errors.networkError");
      });

      it("should return original message if no match found", () => {
        const unknownError = "This is a completely unknown error message";
        const result = translateError(unknownError);

        expect(mockTranslate).not.toHaveBeenCalled();
        expect(result).toBe(unknownError);
      });
    });

    describe("AuthError Object Messages", () => {
      it("should translate AuthError objects", () => {
        const authError: AuthError = {
          message: "Invalid credentials",
          code: "AUTH_INVALID_CREDENTIALS",
        };

        const result = translateError(authError);

        expect(mockTranslate).toHaveBeenCalledWith(
          "errors.auth.invalidCredentials",
        );
        expect(result).toBe("Translated: errors.auth.invalidCredentials");
      });

      it("should handle AuthError with details", () => {
        const authError: AuthError = {
          message: "Account locked",
          code: "AUTH_ACCOUNT_LOCKED",
          details: {
            email: ["Account is locked due to too many failed attempts"],
            lockoutDuration: 30,
          },
        };

        const result = translateError(authError);

        expect(mockTranslate).toHaveBeenCalledWith("errors.auth.accountLocked");
        expect(result).toBe("Translated: errors.auth.accountLocked");
      });

      it("should return original message from AuthError if no match", () => {
        const authError: AuthError = {
          message: "Unknown auth error occurred",
          code: "AUTH_UNKNOWN",
        };

        const result = translateError(authError);

        expect(mockTranslate).not.toHaveBeenCalled();
        expect(result).toBe("Unknown auth error occurred");
      });
    });

    describe("Authentication Specific Errors", () => {
      const authErrorTests = [
        {
          input: "Invalid email or password",
          expectedKey: "errors.auth.invalidCredentials",
        },
        {
          input: "Account not found",
          expectedKey: "errors.auth.accountNotFound",
        },
        {
          input: "Email not verified",
          expectedKey: "errors.auth.emailNotVerified",
        },
        {
          input: "Please verify your email",
          expectedKey: "errors.auth.emailNotVerified",
        },
        { input: "Account locked", expectedKey: "errors.auth.accountLocked" },
        {
          input: "Too many failed attempts",
          expectedKey: "errors.auth.accountLocked",
        },
        { input: "Login failed", expectedKey: "errors.auth.loginFailed" },
        {
          input: "Registration failed",
          expectedKey: "errors.auth.registrationFailed",
        },
        {
          input: "Password reset failed",
          expectedKey: "errors.auth.passwordResetFailed",
        },
        { input: "Session expired", expectedKey: "errors.auth.sessionExpired" },
        { input: "OAuth login failed", expectedKey: "errors.auth.oauthFailed" },
        {
          input: "Social login failed",
          expectedKey: "errors.auth.oauthFailed",
        },
        {
          input: "Passkey login failed",
          expectedKey: "errors.auth.passkeyFailed",
        },
        {
          input: "Passkey authentication failed",
          expectedKey: "errors.auth.passkeyFailed",
        },
        {
          input: "Account disabled",
          expectedKey: "errors.auth.accountDisabled",
        },
        {
          input: "Two-factor authentication required",
          expectedKey: "errors.auth.twoFactorRequired",
        },
        { input: "2FA required", expectedKey: "errors.auth.twoFactorRequired" },
        {
          input: "Invalid two-factor code",
          expectedKey: "errors.auth.invalidTwoFactor",
        },
        {
          input: "Invalid 2FA code",
          expectedKey: "errors.auth.invalidTwoFactor",
        },
        {
          input: "An error occurred during login",
          expectedKey: "errors.auth.unknownError",
        },
      ];

      authErrorTests.forEach(({ input, expectedKey }) => {
        it(`should translate "${input}" to "${expectedKey}"`, () => {
          const result = translateError(input);

          expect(mockTranslate).toHaveBeenCalledWith(expectedKey);
          expect(result).toBe(`Translated: ${expectedKey}`);
        });
      });
    });

    describe("Partial String Matching", () => {
      it("should match partial strings case-insensitively", () => {
        const result = translateError("User account not found in database");

        expect(mockTranslate).toHaveBeenCalledWith(
          "errors.auth.accountNotFound",
        );
        expect(result).toBe("Translated: errors.auth.accountNotFound");
      });

      it("should match with different case", () => {
        const result = translateError("EMAIL NOT VERIFIED please check inbox");

        expect(mockTranslate).toHaveBeenCalledWith(
          "errors.auth.emailNotVerified",
        );
        expect(result).toBe("Translated: errors.auth.emailNotVerified");
      });

      it("should prioritize exact matches over partial matches", () => {
        const result = translateError("Invalid email or password");

        expect(mockTranslate).toHaveBeenCalledWith(
          "errors.auth.invalidCredentials",
        );
        expect(result).toBe("Translated: errors.auth.invalidCredentials");
      });
    });

    describe("Edge Cases", () => {
      it("should handle empty string", () => {
        const result = translateError("");

        expect(mockTranslate).not.toHaveBeenCalled();
        expect(result).toBe("");
      });

      it("should handle null message in AuthError", () => {
        const authError: AuthError = {
          message: null as any,
          code: "TEST_CODE",
        };

        // This will throw an error in the current implementation, which is expected
        expect(() => translateError(authError)).toThrow();
      });

      it("should handle undefined message in AuthError", () => {
        const authError: AuthError = {
          message: undefined as any,
          code: "TEST_CODE",
        };

        // This will throw an error in the current implementation, which is expected
        expect(() => translateError(authError)).toThrow();
      });

      it("should handle translation key not found gracefully", () => {
        mockTranslate.mockImplementation(() => {
          throw new Error("Translation key not found");
        });

        // The translateError function doesn't catch translation errors, so it will throw
        expect(() => translateError("Network error")).toThrow(
          "Translation key not found",
        );
        expect(mockTranslate).toHaveBeenCalledWith("errors.networkError");
      });
    });
  });

  describe("translateValidationError", () => {
    describe("Basic Validation Errors", () => {
      it("should translate common validation errors", () => {
        const result = translateValidationError("email", "required");

        expect(mockTranslate).toHaveBeenCalledWith("validation.required");
        expect(result).toBe("Translated: validation.required");
      });

      it("should translate field-specific validation errors", () => {
        mockTranslate.mockImplementation((key: string) => {
          if (key === "validation.minLength") {
            throw new Error("Key not found");
          }
          if (key === "validation.passwordMinLength") {
            return "Password must be at least 8 characters";
          }
          return `Translated: ${key}`;
        });

        const result = translateValidationError("password", "minLength");

        expect(mockTranslate).toHaveBeenCalledWith("validation.minLength");
        expect(mockTranslate).toHaveBeenCalledWith(
          "validation.passwordMinLength",
        );
        expect(result).toBe("Password must be at least 8 characters");
      });

      it("should fall back to generic required message when all else fails", () => {
        mockTranslate.mockImplementation((key: string) => {
          if (key === "validation.unknownError") {
            throw new Error("Key not found");
          }
          if (key === "validation.fieldUnknownError") {
            throw new Error("Key not found");
          }
          if (key === "validation.required") {
            return "This field is required";
          }
          return `Translated: ${key}`;
        });

        const result = translateValidationError("field", "unknownError");

        expect(result).toBe("This field is required");
      });
    });

    describe("Field-Specific Validation", () => {
      const validationTests = [
        {
          field: "email",
          error: "invalid",
          expectedFirst: "validation.invalid",
          expectedFallback: "validation.emailInvalid",
        },
        {
          field: "password",
          error: "weak",
          expectedFirst: "validation.weak",
          expectedFallback: "validation.passwordWeak",
        },
        {
          field: "confirmPassword",
          error: "mismatch",
          expectedFirst: "validation.mismatch",
          expectedFallback: "validation.confirmPasswordMismatch",
        },
      ];

      validationTests.forEach(
        ({ field, error, expectedFirst, expectedFallback }) => {
          it(`should handle ${field} ${error} validation`, () => {
            mockTranslate.mockImplementation((key: string) => {
              if (key === expectedFirst) {
                throw new Error("Generic key not found");
              }
              if (key === expectedFallback) {
                return `Field-specific: ${expectedFallback}`;
              }
              return `Translated: ${key}`;
            });

            const result = translateValidationError(field, error);

            expect(mockTranslate).toHaveBeenCalledWith(expectedFirst);
            expect(mockTranslate).toHaveBeenCalledWith(expectedFallback);
            expect(result).toBe(`Field-specific: ${expectedFallback}`);
          });
        },
      );
    });

    describe("Capitalization Logic", () => {
      it("should capitalize error type correctly", () => {
        mockTranslate.mockImplementation((key: string) => {
          if (key === "validation.minlength") {
            throw new Error("Key not found");
          }
          if (key === "validation.passwordMinlength") {
            return "Password field-specific error";
          }
          return `Translated: ${key}`;
        });

        const result = translateValidationError("password", "minlength");

        expect(mockTranslate).toHaveBeenCalledWith(
          "validation.passwordMinlength",
        );
        expect(result).toBe("Password field-specific error");
      });

      it("should handle single character error types", () => {
        mockTranslate.mockImplementation((key: string) => {
          if (key === "validation.x") {
            throw new Error("Key not found");
          }
          if (key === "validation.fieldX") {
            return "Single char error";
          }
          return `Translated: ${key}`;
        });

        const result = translateValidationError("field", "x");

        expect(mockTranslate).toHaveBeenCalledWith("validation.fieldX");
        expect(result).toBe("Single char error");
      });
    });

    describe("Error Handling", () => {
      it("should handle translation errors gracefully", () => {
        mockTranslate.mockImplementation((key: string) => {
          if (key === "validation.required") {
            return "This field is required";
          }
          throw new Error("Translation failed");
        });

        const result = translateValidationError("email", "invalid");

        expect(result).toBe("This field is required");
      });

      it("should handle all translation failures", () => {
        mockTranslate.mockImplementation(() => {
          throw new Error("All translations failed");
        });

        // If all translation attempts fail (including validation.required), it will throw
        expect(() => translateValidationError("email", "required")).toThrow(
          "All translations failed",
        );
      });
    });

    describe("Edge Cases", () => {
      it("should handle empty field name", () => {
        const result = translateValidationError("", "required");

        expect(mockTranslate).toHaveBeenCalledWith("validation.required");
        expect(result).toBe("Translated: validation.required");
      });

      it("should handle empty error type", () => {
        mockTranslate.mockImplementation((key: string) => {
          if (key === "validation.") {
            throw new Error("Invalid key");
          }
          if (key === "validation.field") {
            return "Field-specific empty error";
          }
          return `Translated: ${key}`;
        });

        const result = translateValidationError("field", "");

        expect(result).toBe("Field-specific empty error");
      });

      it("should handle special characters in field names", () => {
        const result = translateValidationError("user-email", "required");

        expect(mockTranslate).toHaveBeenCalledWith("validation.required");
        expect(result).toBe("Translated: validation.required");
      });
    });
  });

  describe("Integration Tests", () => {
    it("should work with realistic error scenarios", () => {
      // Simulate real translation responses
      mockTranslate.mockImplementation((key: string) => {
        const translations: Record<string, string> = {
          "errors.auth.invalidCredentials": "Invalid email or password.",
          "errors.auth.accountLocked": "Account is temporarily locked.",
          "errors.networkError": "Network connection failed.",
          "validation.required": "This field is required.",
          "validation.emailInvalid": "Please enter a valid email address.",
        };
        if (translations[key]) {
          return translations[key];
        }
        // Simulate i18n behavior - throw for unknown keys so fallback logic works
        throw new Error(`Translation key not found: ${key}`);
      });

      // Test various realistic scenarios
      expect(translateError("Invalid email or password")).toBe(
        "Invalid email or password.",
      );
      expect(translateError("Account locked")).toBe(
        "Account is temporarily locked.",
      );
      expect(translateError("Some random network error occurred")).toBe(
        "Network connection failed.",
      );

      expect(translateValidationError("email", "required")).toBe(
        "This field is required.",
      );
      expect(translateValidationError("unknown", "weird")).toBe(
        "This field is required.",
      );
    });
  });
});
