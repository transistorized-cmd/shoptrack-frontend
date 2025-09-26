import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getCsrfTokenFromMeta,
  setCsrfTokenMeta,
  removeCsrfTokenMeta,
  isValidCsrfToken,
  getCsrfTokenWithFallback,
} from "../csrfMeta";

// Mock the constants
vi.mock("@/constants/app", () => ({
  SECURITY: {
    MIN_CSRF_TOKEN_LENGTH: 16,
  },
}));

// Mock the composable import
const mockCsrfManager = {
  getToken: vi.fn(),
};

vi.mock("@/composables/useCsrfToken", () => ({
  csrfManager: mockCsrfManager,
}));

describe("csrfMeta utilities", () => {
  let originalDocument: Document;

  beforeEach(() => {
    // Reset document head
    originalDocument = global.document;

    // Create a fresh DOM for each test
    const { JSDOM } = require("jsdom");
    const dom = new JSDOM(
      "<!DOCTYPE html><html><head></head><body></body></html>",
    );
    global.document = dom.window.document as unknown as Document;
    global.window = dom.window as unknown as Window & typeof globalThis;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
    global.document = originalDocument;
  });

  describe("getCsrfTokenFromMeta", () => {
    it("should return token when meta tag exists with content", () => {
      // Arrange
      const token = "test-csrf-token-123456";
      const metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "csrf-token");
      metaTag.setAttribute("content", token);
      document.head.appendChild(metaTag);

      // Act
      const result = getCsrfTokenFromMeta();

      // Assert
      expect(result).toBe(token);
    });

    it("should return null when meta tag does not exist", () => {
      // Act
      const result = getCsrfTokenFromMeta();

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when meta tag exists but has no content attribute", () => {
      // Arrange
      const metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "csrf-token");
      document.head.appendChild(metaTag);

      // Act
      const result = getCsrfTokenFromMeta();

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when meta tag has empty content", () => {
      // Arrange
      const metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "csrf-token");
      metaTag.setAttribute("content", "");
      document.head.appendChild(metaTag);

      // Act
      const result = getCsrfTokenFromMeta();

      // Assert
      expect(result).toBeNull();
    });

    it("should handle multiple meta tags and return first csrf-token", () => {
      // Arrange
      const otherMeta = document.createElement("meta");
      otherMeta.setAttribute("name", "viewport");
      otherMeta.setAttribute("content", "width=device-width");
      document.head.appendChild(otherMeta);

      const csrfMeta = document.createElement("meta");
      csrfMeta.setAttribute("name", "csrf-token");
      csrfMeta.setAttribute("content", "first-csrf-token");
      document.head.appendChild(csrfMeta);

      const secondCsrfMeta = document.createElement("meta");
      secondCsrfMeta.setAttribute("name", "csrf-token");
      secondCsrfMeta.setAttribute("content", "second-csrf-token");
      document.head.appendChild(secondCsrfMeta);

      // Act
      const result = getCsrfTokenFromMeta();

      // Assert
      expect(result).toBe("first-csrf-token");
    });

    it("should handle special characters in token content", () => {
      // Arrange
      const specialToken = "token-with-special!@#$%^&*()_+";
      const metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "csrf-token");
      metaTag.setAttribute("content", specialToken);
      document.head.appendChild(metaTag);

      // Act
      const result = getCsrfTokenFromMeta();

      // Assert
      expect(result).toBe(specialToken);
    });

    it("should handle long token content", () => {
      // Arrange
      const longToken = "a".repeat(1000); // Very long token
      const metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "csrf-token");
      metaTag.setAttribute("content", longToken);
      document.head.appendChild(metaTag);

      // Act
      const result = getCsrfTokenFromMeta();

      // Assert
      expect(result).toBe(longToken);
    });

    it("should handle whitespace in token content", () => {
      // Arrange
      const tokenWithSpaces = "  token-with-spaces  ";
      const metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "csrf-token");
      metaTag.setAttribute("content", tokenWithSpaces);
      document.head.appendChild(metaTag);

      // Act
      const result = getCsrfTokenFromMeta();

      // Assert
      expect(result).toBe(tokenWithSpaces);
    });
  });

  describe("setCsrfTokenMeta", () => {
    it("should create new meta tag when none exists", () => {
      // Arrange
      const token = "new-csrf-token-123";

      // Act
      setCsrfTokenMeta(token);

      // Assert
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      expect(metaTag).toBeTruthy();
      expect(metaTag?.getAttribute("content")).toBe(token);
      expect(metaTag?.getAttribute("name")).toBe("csrf-token");
    });

    it("should update existing meta tag when one exists", () => {
      // Arrange
      const oldToken = "old-csrf-token";
      const newToken = "new-csrf-token-456";

      const existingMeta = document.createElement("meta");
      existingMeta.setAttribute("name", "csrf-token");
      existingMeta.setAttribute("content", oldToken);
      document.head.appendChild(existingMeta);

      // Act
      setCsrfTokenMeta(newToken);

      // Assert
      const metaTags = document.querySelectorAll('meta[name="csrf-token"]');
      expect(metaTags).toHaveLength(1); // Should still be only one
      expect(metaTags[0].getAttribute("content")).toBe(newToken);
    });

    it("should add meta tag to document head", () => {
      // Arrange
      const token = "test-token-for-head";
      const initialChildCount = document.head.children.length;

      // Act
      setCsrfTokenMeta(token);

      // Assert
      expect(document.head.children).toHaveLength(initialChildCount + 1);
      const addedMeta = document.head.querySelector('meta[name="csrf-token"]');
      expect(addedMeta).toBeTruthy();
    });

    it("should handle empty string token", () => {
      // Arrange
      const emptyToken = "";

      // Act
      setCsrfTokenMeta(emptyToken);

      // Assert
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      expect(metaTag?.getAttribute("content")).toBe("");
    });

    it("should handle special characters in token", () => {
      // Arrange
      const specialToken = "token!@#$%^&*()+=[]{}|;':\",./<>?`~";

      // Act
      setCsrfTokenMeta(specialToken);

      // Assert
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      expect(metaTag?.getAttribute("content")).toBe(specialToken);
    });

    it("should handle unicode characters in token", () => {
      // Arrange
      const unicodeToken = "token-with-unicode-🔒-δοκιμή-测试";

      // Act
      setCsrfTokenMeta(unicodeToken);

      // Assert
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      expect(metaTag?.getAttribute("content")).toBe(unicodeToken);
    });

    it("should preserve other meta tags when creating csrf-token meta", () => {
      // Arrange
      const viewportMeta = document.createElement("meta");
      viewportMeta.setAttribute("name", "viewport");
      viewportMeta.setAttribute("content", "width=device-width");
      document.head.appendChild(viewportMeta);

      const descriptionMeta = document.createElement("meta");
      descriptionMeta.setAttribute("name", "description");
      descriptionMeta.setAttribute("content", "Test description");
      document.head.appendChild(descriptionMeta);

      // Act
      setCsrfTokenMeta("test-token");

      // Assert
      expect(document.head.children).toHaveLength(3);
      expect(document.querySelector('meta[name="viewport"]')).toBeTruthy();
      expect(document.querySelector('meta[name="description"]')).toBeTruthy();
      expect(document.querySelector('meta[name="csrf-token"]')).toBeTruthy();
    });
  });

  describe("removeCsrfTokenMeta", () => {
    it("should remove existing csrf-token meta tag", () => {
      // Arrange
      const metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "csrf-token");
      metaTag.setAttribute("content", "token-to-remove");
      document.head.appendChild(metaTag);

      // Verify it exists first
      expect(document.querySelector('meta[name="csrf-token"]')).toBeTruthy();

      // Act
      removeCsrfTokenMeta();

      // Assert
      expect(document.querySelector('meta[name="csrf-token"]')).toBeNull();
    });

    it("should do nothing when no csrf-token meta tag exists", () => {
      // Arrange
      const initialChildCount = document.head.children.length;

      // Act - should not throw error
      removeCsrfTokenMeta();

      // Assert
      expect(document.head.children).toHaveLength(initialChildCount);
    });

    it("should only remove csrf-token meta tag and preserve others", () => {
      // Arrange
      const viewportMeta = document.createElement("meta");
      viewportMeta.setAttribute("name", "viewport");
      viewportMeta.setAttribute("content", "width=device-width");
      document.head.appendChild(viewportMeta);

      const csrfMeta = document.createElement("meta");
      csrfMeta.setAttribute("name", "csrf-token");
      csrfMeta.setAttribute("content", "token-to-remove");
      document.head.appendChild(csrfMeta);

      const descriptionMeta = document.createElement("meta");
      descriptionMeta.setAttribute("name", "description");
      descriptionMeta.setAttribute("content", "Test description");
      document.head.appendChild(descriptionMeta);

      // Act
      removeCsrfTokenMeta();

      // Assert
      expect(document.head.children).toHaveLength(2);
      expect(document.querySelector('meta[name="viewport"]')).toBeTruthy();
      expect(document.querySelector('meta[name="description"]')).toBeTruthy();
      expect(document.querySelector('meta[name="csrf-token"]')).toBeNull();
    });

    it("should remove only first csrf-token meta tag if multiple exist", () => {
      // Arrange
      const firstCsrfMeta = document.createElement("meta");
      firstCsrfMeta.setAttribute("name", "csrf-token");
      firstCsrfMeta.setAttribute("content", "first-token");
      document.head.appendChild(firstCsrfMeta);

      const secondCsrfMeta = document.createElement("meta");
      secondCsrfMeta.setAttribute("name", "csrf-token");
      secondCsrfMeta.setAttribute("content", "second-token");
      document.head.appendChild(secondCsrfMeta);

      // Act
      removeCsrfTokenMeta();

      // Assert
      const remainingCsrfTags = document.querySelectorAll(
        'meta[name="csrf-token"]',
      );
      expect(remainingCsrfTags).toHaveLength(1);
      expect(remainingCsrfTags[0].getAttribute("content")).toBe("second-token");
    });
  });

  describe("isValidCsrfToken", () => {
    it("should return true for valid alphanumeric token with minimum length", () => {
      // Arrange
      const validToken = "abcdefghij1234567890"; // 20 characters

      // Act
      const result = isValidCsrfToken(validToken);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for token exactly at minimum length", () => {
      // Arrange
      const minLengthToken = "abcdefghij123456"; // Exactly 16 characters

      // Act
      const result = isValidCsrfToken(minLengthToken);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false for token shorter than minimum length", () => {
      // Arrange
      const shortToken = "abc12345"; // 8 characters

      // Act
      const result = isValidCsrfToken(shortToken);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for empty string", () => {
      // Act
      const result = isValidCsrfToken("");

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for null input", () => {
      // Act
      const result = isValidCsrfToken(null as any);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for undefined input", () => {
      // Act
      const result = isValidCsrfToken(undefined as any);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for non-string input", () => {
      // Act & Assert
      expect(isValidCsrfToken(123 as any)).toBe(false);
      expect(isValidCsrfToken({} as any)).toBe(false);
      expect(isValidCsrfToken([] as any)).toBe(false);
      expect(isValidCsrfToken(true as any)).toBe(false);
    });

    it("should return false for token with special characters", () => {
      // Arrange
      const tokenWithSpecialChars = "abcdefghij123456!@#$";

      // Act
      const result = isValidCsrfToken(tokenWithSpecialChars);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for token with spaces", () => {
      // Arrange
      const tokenWithSpaces = "abcdefghij 123456789";

      // Act
      const result = isValidCsrfToken(tokenWithSpaces);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for token with hyphens or underscores", () => {
      // Arrange
      const tokenWithHyphens = "abcdefghij-123456789";
      const tokenWithUnderscores = "abcdefghij_123456789";

      // Act & Assert
      expect(isValidCsrfToken(tokenWithHyphens)).toBe(false);
      expect(isValidCsrfToken(tokenWithUnderscores)).toBe(false);
    });

    it("should return true for very long valid token", () => {
      // Arrange
      const longValidToken = "a".repeat(100) + "1".repeat(100); // 200 characters, all alphanumeric

      // Act
      const result = isValidCsrfToken(longValidToken);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for mixed case alphanumeric token", () => {
      // Arrange
      const mixedCaseToken = "AbCdEfGhIj1234567890";

      // Act
      const result = isValidCsrfToken(mixedCaseToken);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for all lowercase token", () => {
      // Arrange
      const lowercaseToken = "abcdefghijklmnopqrstuvwxyz1234567890";

      // Act
      const result = isValidCsrfToken(lowercaseToken);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for all uppercase token", () => {
      // Arrange
      const uppercaseToken = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

      // Act
      const result = isValidCsrfToken(uppercaseToken);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for all numeric token", () => {
      // Arrange
      const numericToken = "1234567890123456"; // 16 digits

      // Act
      const result = isValidCsrfToken(numericToken);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false for token with unicode characters", () => {
      // Arrange
      const unicodeToken = "abcdefghij123456δοκ"; // Contains Greek characters

      // Act
      const result = isValidCsrfToken(unicodeToken);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("getCsrfTokenWithFallback", () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    beforeEach(() => {
      consoleWarnSpy.mockClear();
      consoleErrorSpy.mockClear();
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it("should return token from composable when available and valid", async () => {
      // Arrange
      const validToken = "composableToken123456";
      mockCsrfManager.getToken.mockResolvedValue(validToken);

      // Act
      const result = await getCsrfTokenWithFallback();

      // Assert
      expect(result).toBe(validToken);
      expect(mockCsrfManager.getToken).toHaveBeenCalled();
    });

    it("should fallback to meta tag when composable fails", async () => {
      // Arrange
      const metaToken = "metaTokenFallback123456";
      mockCsrfManager.getToken.mockRejectedValue(new Error("Composable error"));

      const metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "csrf-token");
      metaTag.setAttribute("content", metaToken);
      document.head.appendChild(metaTag);

      // Act
      const result = await getCsrfTokenWithFallback();

      // Assert
      expect(result).toBe(metaToken);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Failed to get CSRF token from composable:",
        expect.any(Error),
      );
    });

    it("should fallback to meta tag when composable returns invalid token", async () => {
      // Arrange
      const invalidToken = "short"; // Too short
      const validMetaToken = "validMetaToken123456";
      mockCsrfManager.getToken.mockResolvedValue(invalidToken);

      const metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "csrf-token");
      metaTag.setAttribute("content", validMetaToken);
      document.head.appendChild(metaTag);

      // Act
      const result = await getCsrfTokenWithFallback();

      // Assert
      expect(result).toBe(validMetaToken);
    });

    it("should fallback to meta tag when composable returns null", async () => {
      // Arrange
      const validMetaToken = "validMetaToken123456";
      mockCsrfManager.getToken.mockResolvedValue(null);

      const metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "csrf-token");
      metaTag.setAttribute("content", validMetaToken);
      document.head.appendChild(metaTag);

      // Act
      const result = await getCsrfTokenWithFallback();

      // Assert
      expect(result).toBe(validMetaToken);
    });

    it("should return null when both sources fail", async () => {
      // Arrange
      mockCsrfManager.getToken.mockRejectedValue(new Error("Composable error"));
      // No meta tag in DOM

      // Act
      const result = await getCsrfTokenWithFallback();

      // Assert
      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Failed to get CSRF token from composable:",
        expect.any(Error),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "No valid CSRF token found in any source",
      );
    });

    it("should return null when both sources return invalid tokens", async () => {
      // Arrange
      const invalidComposableToken = "invalid1"; // Too short
      const invalidMetaToken = "invalid2"; // Too short
      mockCsrfManager.getToken.mockResolvedValue(invalidComposableToken);

      const metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "csrf-token");
      metaTag.setAttribute("content", invalidMetaToken);
      document.head.appendChild(metaTag);

      // Act
      const result = await getCsrfTokenWithFallback();

      // Assert
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "No valid CSRF token found in any source",
      );
    });

    it("should handle composable import error gracefully", async () => {
      // Arrange
      // Mock dynamic import to throw an error
      const originalImport = global.require;
      global.require = vi.fn().mockImplementation((moduleName) => {
        if (moduleName === "jsdom") {
          return originalImport("jsdom");
        }
        throw new Error("Import error");
      });

      const validMetaToken = "validMetaToken123456";
      const metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "csrf-token");
      metaTag.setAttribute("content", validMetaToken);
      document.head.appendChild(metaTag);

      // Act
      const result = await getCsrfTokenWithFallback();

      // Assert
      expect(result).toBe(validMetaToken);

      // Restore
      global.require = originalImport;
    });

    it("should prefer composable token over meta tag when both are valid", async () => {
      // Arrange
      const composableToken = "composableToken123456";
      const metaToken = "differentMetaToken789";
      mockCsrfManager.getToken.mockResolvedValue(composableToken);

      const metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "csrf-token");
      metaTag.setAttribute("content", metaToken);
      document.head.appendChild(metaTag);

      // Act
      const result = await getCsrfTokenWithFallback();

      // Assert
      expect(result).toBe(composableToken); // Should prefer composable
    });

    it("should handle empty string from composable", async () => {
      // Arrange
      const validMetaToken = "validMetaToken123456";
      mockCsrfManager.getToken.mockResolvedValue("");

      const metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "csrf-token");
      metaTag.setAttribute("content", validMetaToken);
      document.head.appendChild(metaTag);

      // Act
      const result = await getCsrfTokenWithFallback();

      // Assert
      expect(result).toBe(validMetaToken);
    });

    it("should handle undefined from composable", async () => {
      // Arrange
      const validMetaToken = "validMetaToken123456";
      mockCsrfManager.getToken.mockResolvedValue(undefined);

      const metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "csrf-token");
      metaTag.setAttribute("content", validMetaToken);
      document.head.appendChild(metaTag);

      // Act
      const result = await getCsrfTokenWithFallback();

      // Assert
      expect(result).toBe(validMetaToken);
    });
  });

  describe("integration tests", () => {
    it("should work with full create-update-remove cycle", () => {
      // Initial state - no token
      expect(getCsrfTokenFromMeta()).toBeNull();

      // Set token
      const token1 = "initialToken123456789";
      setCsrfTokenMeta(token1);
      expect(getCsrfTokenFromMeta()).toBe(token1);

      // Update token
      const token2 = "updatedToken987654321";
      setCsrfTokenMeta(token2);
      expect(getCsrfTokenFromMeta()).toBe(token2);
      expect(document.querySelectorAll('meta[name="csrf-token"]')).toHaveLength(
        1,
      );

      // Remove token
      removeCsrfTokenMeta();
      expect(getCsrfTokenFromMeta()).toBeNull();
    });

    it("should validate tokens correctly with edge cases", () => {
      // Valid tokens
      expect(isValidCsrfToken("abcdefghij1234567890")).toBe(true);
      expect(isValidCsrfToken("A".repeat(16))).toBe(true);
      expect(isValidCsrfToken("1".repeat(32))).toBe(true);

      // Invalid tokens
      expect(isValidCsrfToken("short")).toBe(false);
      expect(isValidCsrfToken("valid-but-with-hyphen1234")).toBe(false);
      expect(isValidCsrfToken("valid_but_with_underscore12")).toBe(false);
      expect(isValidCsrfToken("")).toBe(false);
      expect(isValidCsrfToken(null as any)).toBe(false);
    });

    it("should handle multiple operations on same document", () => {
      // Multiple set operations
      setCsrfTokenMeta("token1-123456789012");
      setCsrfTokenMeta("token2-123456789012");
      setCsrfTokenMeta("token3-123456789012");

      expect(getCsrfTokenFromMeta()).toBe("token3-123456789012");
      expect(document.querySelectorAll('meta[name="csrf-token"]')).toHaveLength(
        1,
      );

      // Multiple remove operations (should not error)
      removeCsrfTokenMeta();
      removeCsrfTokenMeta();
      removeCsrfTokenMeta();

      expect(getCsrfTokenFromMeta()).toBeNull();
    });
  });

  describe("error handling and edge cases", () => {
    it("should handle malformed DOM gracefully", () => {
      // Simulate querySelector returning null unexpectedly
      const originalQuerySelector = document.querySelector;
      document.querySelector = vi.fn().mockReturnValue(null);

      expect(() => getCsrfTokenFromMeta()).not.toThrow();
      expect(getCsrfTokenFromMeta()).toBeNull();

      expect(() => removeCsrfTokenMeta()).not.toThrow();

      // Restore
      document.querySelector = originalQuerySelector;
    });

    it("should handle document.head being null", () => {
      // This is more of a theoretical test as document.head should always exist
      const originalHead = document.head;
      Object.defineProperty(document, "head", {
        value: null,
        writable: true,
        configurable: true,
      });

      // Should not throw errors (though might not work correctly)
      expect(() => setCsrfTokenMeta("test-token")).not.toThrow();

      // Restore
      Object.defineProperty(document, "head", {
        value: originalHead,
        writable: true,
        configurable: true,
      });
    });
  });
});
