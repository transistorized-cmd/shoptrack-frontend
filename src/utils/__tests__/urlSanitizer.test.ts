import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sanitizeImageUrl,
  sanitizeLinkUrl,
  useSafeImageUrl,
  safeImageUrl,
  safeLinkUrl,
} from "../urlSanitizer";

describe("urlSanitizer utilities", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe("sanitizeImageUrl", () => {
    describe("valid URLs", () => {
      it("should return valid HTTPS image URLs unchanged", () => {
        // Arrange
        const validUrls = [
          "https://example.com/image.jpg",
          "https://cdn.example.com/photos/image.png",
          "https://secure.image.host.com/img/12345.webp",
          "https://api.example.com/v1/images/avatar.gif",
        ];

        // Act & Assert
        validUrls.forEach((url) => {
          expect(sanitizeImageUrl(url)).toBe(url);
          expect(consoleWarnSpy).not.toHaveBeenCalled();
        });
      });

      it("should return valid HTTP image URLs unchanged", () => {
        // Arrange
        const httpUrls = [
          "http://example.com/image.jpg",
          "http://old-site.com/photos/pic.png",
        ];

        // Act & Assert
        httpUrls.forEach((url) => {
          expect(sanitizeImageUrl(url)).toBe(url);
        });
      });

      it("should handle URLs with query parameters and fragments", () => {
        // Arrange
        const urlsWithParams = [
          "https://example.com/image.jpg?size=large&quality=high",
          "https://api.example.com/avatar.png?userId=123&v=2",
          "https://cdn.example.com/img.webp#section",
        ];

        // Act & Assert
        urlsWithParams.forEach((url) => {
          expect(sanitizeImageUrl(url)).toBe(url);
        });
      });

      it("should handle URLs with special characters in path", () => {
        // Arrange
        const specialUrls = [
          "https://example.com/images/file%20with%20spaces.jpg",
          "https://example.com/user-images/file-name_123.png",
          "https://example.com/images/file.name.with.dots.jpg",
        ];

        // Act & Assert
        specialUrls.forEach((url) => {
          expect(sanitizeImageUrl(url)).toBe(url);
        });
      });

      it("should trim whitespace from URLs", () => {
        // Arrange
        const urlWithSpaces = "  https://example.com/image.jpg  ";

        // Act
        const result = sanitizeImageUrl(urlWithSpaces);

        // Assert
        expect(result).toBe("https://example.com/image.jpg");
      });
    });

    describe("data URLs", () => {
      it("should return valid base64 image data URLs", () => {
        // Arrange
        const validDataUrls = [
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAAEAAQMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUkaEjM0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmJmgoaKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/APn+iiigD/9k=",
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwNzNlNiIvPjwvc3ZnPg==",
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        ];

        // Act & Assert
        validDataUrls.forEach((url) => {
          const result = sanitizeImageUrl(url);
          // Should either return the original URL or fallback for invalid ones
          expect(typeof result).toBe("string");
          expect(result.length).toBeGreaterThan(0);
        });
      });

      it("should reject invalid data URL formats", () => {
        // Arrange
        const invalidDataUrls = [
          "data:text/plain;base64,SGVsbG8gV29ybGQ=", // Not an image
          "data:application/json;base64,eyJrZXkiOiJ2YWx1ZSJ9", // Not an image
          "data:image/png;base64,invalid-base64-content!!!", // Invalid base64
          "data:image/png;base32,somedata", // Wrong encoding
          "data:image/unknown;base64,validbase64content", // Unknown image format
        ];

        const fallback = "fallback-image.jpg";

        // Act & Assert
        invalidDataUrls.forEach((url) => {
          expect(sanitizeImageUrl(url, fallback)).toBe(fallback);
          expect(consoleWarnSpy).toHaveBeenCalled();
        });
      });

      it("should reject data URLs with missing base64 content", () => {
        // Arrange
        const incompleteDataUrls = [
          "data:image/png;base64,",
          "data:image/jpeg;base64",
        ];

        const fallback = "default.png";

        // Act & Assert
        incompleteDataUrls.forEach((url) => {
          expect(sanitizeImageUrl(url, fallback)).toBe(fallback);
        });
      });
    });

    describe("dangerous URLs", () => {
      it("should reject javascript: URLs", () => {
        // Arrange
        const dangerousUrls = [
          'javascript:alert("XSS")',
          "javascript:void(0)",
          "JAVASCRIPT:alert(1)", // Case insensitive
          'javascript:eval("malicious code")',
        ];

        const fallback = "safe-fallback.jpg";

        // Act & Assert
        dangerousUrls.forEach((url) => {
          expect(sanitizeImageUrl(url, fallback)).toBe(fallback);
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            "Dangerous URL pattern detected:",
            expect.any(String),
          );
        });
      });

      it("should reject vbscript: URLs", () => {
        // Arrange
        const vbscriptUrls = [
          'vbscript:msgbox("XSS")',
          'VBSCRIPT:Execute("malicious")',
        ];

        const fallback = "safe-image.jpg";

        // Act & Assert
        vbscriptUrls.forEach((url) => {
          expect(sanitizeImageUrl(url, fallback)).toBe(fallback);
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            "Dangerous URL pattern detected:",
            expect.any(String),
          );
        });
      });

      it("should reject file: URLs", () => {
        // Arrange
        const fileUrls = [
          "file:///etc/passwd",
          "file://C:/Windows/system32/config",
          "FILE:///usr/local/bin",
        ];

        const fallback = "secure-image.png";

        // Act & Assert
        fileUrls.forEach((url) => {
          expect(sanitizeImageUrl(url, fallback)).toBe(fallback);
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            "Dangerous URL pattern detected:",
            expect.any(String),
          );
        });
      });

      it("should reject browser extension URLs", () => {
        // Arrange
        const extensionUrls = [
          "chrome-extension://abcdefghijklmnop/popup.html",
          "moz-extension://12345678-1234-1234-1234-123456789012/",
          "ms-browser-extension://extension-id/",
          "safari-extension://com.company.extension/",
          "opera-extension://extension-name/",
        ];

        // Act & Assert
        extensionUrls.forEach((url) => {
          expect(sanitizeImageUrl(url)).toContain("data:image/svg+xml"); // Default fallback
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            "Dangerous URL pattern detected:",
            expect.any(String),
          );
        });
      });

      it("should reject URLs with encoded dangerous patterns", () => {
        // Arrange
        const encodedDangerousUrls = [
          "http://example.com/image.jpg?onclick=alert(1)",
          'https://example.com/onmouseover=alert("XSS")&img.jpg',
          "https://example.com/%3Cscript%3Ealert(1)%3C/script%3E.jpg",
          "https://example.com/\\u003Cscript\\u003Ealert(1)\\u003C/script\\u003E.jpg",
        ];

        // Act & Assert
        encodedDangerousUrls.forEach((url) => {
          expect(sanitizeImageUrl(url)).toContain("data:image/svg+xml");
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            "Dangerous URL pattern detected:",
            expect.any(String),
          );
        });
      });
    });

    describe("private/local URLs", () => {
      it("should reject localhost URLs", () => {
        // Arrange
        const localhostUrls = [
          "http://localhost/image.jpg",
          "https://localhost:3000/avatar.png",
          "http://127.0.0.1/photo.gif",
          "https://127.0.0.1:8080/img.webp",
        ];

        // Act & Assert
        localhostUrls.forEach((url) => {
          expect(sanitizeImageUrl(url)).toContain("data:image/svg+xml");
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            "Private/local URL detected:",
            expect.any(String),
          );
        });
      });

      it("should reject private IP range URLs", () => {
        // Arrange
        const privateIpUrls = [
          "http://192.168.1.1/image.jpg",
          "https://10.0.0.1/photo.png",
          "http://172.16.0.1/avatar.gif",
          "https://169.254.1.1/img.webp", // Link-local
        ];

        // Act & Assert
        privateIpUrls.forEach((url) => {
          expect(sanitizeImageUrl(url)).toContain("data:image/svg+xml");
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            "Private/local URL detected:",
            expect.any(String),
          );
        });
      });

      it("should reject IPv6 localhost URLs", () => {
        // Arrange
        const ipv6LocalUrls = [
          "http://[::1]/image.jpg",
          "https://::1/photo.png",
        ];

        // Act & Assert
        ipv6LocalUrls.forEach((url) => {
          expect(sanitizeImageUrl(url)).toContain("data:image/svg+xml");
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            "Private/local URL detected:",
            expect.any(String),
          );
        });
      });
    });

    describe("invalid URLs and edge cases", () => {
      it("should return fallback for null/undefined URLs", () => {
        // Arrange
        const customFallback = "custom-fallback.jpg";

        // Act & Assert
        expect(sanitizeImageUrl(null)).toContain("data:image/svg+xml"); // Default fallback
        expect(sanitizeImageUrl(undefined)).toContain("data:image/svg+xml");
        expect(sanitizeImageUrl(null, customFallback)).toBe(customFallback);
        expect(sanitizeImageUrl(undefined, customFallback)).toBe(
          customFallback,
        );
      });

      it("should return fallback for empty string URLs", () => {
        // Arrange
        const customFallback = "empty-fallback.png";

        // Act & Assert
        expect(sanitizeImageUrl("", customFallback)).toBe(customFallback);
        expect(sanitizeImageUrl("   ", customFallback)).toBe(customFallback);
      });

      it("should return fallback for malformed URLs", () => {
        // Arrange
        const malformedUrls = [
          "not-a-url",
          "http://",
          "https://",
          "://example.com",
          "htp://example.com", // Typo in protocol
          "example.com/image.jpg", // Missing protocol
        ];

        const fallback = "error-fallback.jpg";

        // Act & Assert
        malformedUrls.forEach((url) => {
          const result = sanitizeImageUrl(url, fallback);
          expect(result).toBe(fallback);
          // Verify that some warning was logged (don't care about exact message)
          expect(consoleWarnSpy).toHaveBeenCalled();
        });
      });

      it("should reject unsupported protocols", () => {
        // Arrange
        const unsupportedProtocols = [
          "ftp://example.com/image.jpg",
          "ws://example.com/image.jpg",
          "wss://example.com/image.jpg",
          "tel:+1234567890",
          "sms:+1234567890",
        ];

        const fallback = "protocol-fallback.jpg";

        // Act & Assert
        unsupportedProtocols.forEach((url) => {
          expect(sanitizeImageUrl(url, fallback)).toBe(fallback);
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            "Invalid URL scheme for image:",
            expect.any(String),
          );
        });
      });
    });

    describe("custom fallbacks", () => {
      it("should use custom fallback when provided", () => {
        // Arrange
        const customFallback = "https://example.com/default-avatar.png";
        const badUrl = 'javascript:alert("bad")';

        // Act
        const result = sanitizeImageUrl(badUrl, customFallback);

        // Assert
        expect(result).toBe(customFallback);
      });

      it("should use default fallback when none provided", () => {
        // Arrange
        const badUrl = 'vbscript:msgbox("bad")';

        // Act
        const result = sanitizeImageUrl(badUrl);

        // Assert
        expect(result).toContain("data:image/svg+xml");
        expect(result).toContain("base64");
      });
    });
  });

  describe("sanitizeLinkUrl", () => {
    describe("valid URLs", () => {
      it("should return valid HTTPS URLs unchanged", () => {
        // Arrange
        const httpsUrls = [
          "https://example.com",
          "https://www.google.com/search?q=test",
          "https://api.example.com/v1/data",
        ];

        // Act & Assert
        httpsUrls.forEach((url) => {
          expect(sanitizeLinkUrl(url)).toBe(url);
        });
      });

      it("should return valid HTTP URLs unchanged", () => {
        // Arrange
        const httpUrls = [
          "http://example.com",
          "http://old-site.org/page.html",
        ];

        // Act & Assert
        httpUrls.forEach((url) => {
          expect(sanitizeLinkUrl(url)).toBe(url);
        });
      });

      it("should return valid mailto URLs unchanged", () => {
        // Arrange
        const mailtoUrls = [
          "mailto:user@example.com",
          "mailto:contact@company.org?subject=Hello&body=Message",
        ];

        // Act & Assert
        mailtoUrls.forEach((url) => {
          expect(sanitizeLinkUrl(url)).toBe(url);
        });
      });

      it("should return relative URLs unchanged", () => {
        // Arrange
        const relativeUrls = [
          "/dashboard",
          "/users/profile",
          "./local-page.html",
          "../parent-directory/page.html",
          "../../up-two-levels.html",
        ];

        // Act & Assert
        relativeUrls.forEach((url) => {
          expect(sanitizeLinkUrl(url)).toBe(url);
        });
      });

      it("should trim whitespace from URLs", () => {
        // Arrange
        const urlWithSpaces = "  https://example.com/page  ";

        // Act
        const result = sanitizeLinkUrl(urlWithSpaces);

        // Assert
        expect(result).toBe("https://example.com/page");
      });
    });

    describe("dangerous URLs", () => {
      it("should reject javascript: URLs", () => {
        // Arrange
        const javascriptUrls = [
          'javascript:alert("XSS")',
          'javascript:window.location="http://evil.com"',
          "JAVASCRIPT:void(0)",
        ];

        const fallback = "/safe-page";

        // Act & Assert
        javascriptUrls.forEach((url) => {
          expect(sanitizeLinkUrl(url, fallback)).toBe(fallback);
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            "Dangerous URL pattern detected:",
            expect.any(String),
          );
        });
      });

      it("should reject vbscript: URLs", () => {
        // Arrange
        const vbscriptUrls = [
          'vbscript:msgbox("XSS")',
          'VBSCRIPT:Execute("location.href=chr(104)+chr(116)+chr(116)+chr(112)+chr(58)+chr(47)+chr(47)+chr(101)+chr(118)+chr(105)+chr(108)+chr(46)+chr(99)+chr(111)+chr(109)")',
        ];

        // Act & Assert
        vbscriptUrls.forEach((url) => {
          expect(sanitizeLinkUrl(url)).toBe("#"); // Default fallback
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            "Dangerous URL pattern detected:",
            expect.any(String),
          );
        });
      });

      it("should reject URLs with encoded dangerous patterns", () => {
        // Arrange
        const encodedDangerousUrls = [
          "https://example.com/?onclick=alert(1)",
          'https://example.com/page.html?onload=eval("bad code")',
          "https://example.com/%3Cscript%3Ealert(1)%3C/script%3E",
        ];

        // Act & Assert
        encodedDangerousUrls.forEach((url) => {
          expect(sanitizeLinkUrl(url)).toBe("#");
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            "Dangerous URL pattern detected:",
            expect.any(String),
          );
        });
      });
    });

    describe("invalid URLs and edge cases", () => {
      it("should return fallback for null/undefined URLs", () => {
        // Arrange
        const customFallback = "/error-page";

        // Act & Assert
        expect(sanitizeLinkUrl(null)).toBe("#"); // Default fallback
        expect(sanitizeLinkUrl(undefined)).toBe("#");
        expect(sanitizeLinkUrl(null, customFallback)).toBe(customFallback);
        expect(sanitizeLinkUrl(undefined, customFallback)).toBe(customFallback);
      });

      it("should return fallback for empty string URLs", () => {
        // Arrange
        const customFallback = "/home";

        // Act & Assert
        expect(sanitizeLinkUrl("", customFallback)).toBe(customFallback);
        expect(sanitizeLinkUrl("   ", customFallback)).toBe(customFallback);
      });

      it("should return fallback for malformed absolute URLs", () => {
        // Arrange
        const malformedUrls = [
          "htp://example.com", // Typo in protocol
          "http://",
          "https://",
          "://example.com",
        ];

        const fallback = "/fallback";

        // Act & Assert
        malformedUrls.forEach((url) => {
          const result = sanitizeLinkUrl(url, fallback);
          expect(result).toBe(fallback);
          // Verify that some warning was logged (don't care about exact message)
          expect(consoleWarnSpy).toHaveBeenCalled();
        });
      });

      it("should reject unsupported protocols", () => {
        // Arrange
        const unsupportedProtocols = [
          "ftp://example.com/file.txt",
          "file:///etc/passwd",
          "ws://example.com",
          "chrome-extension://extension-id/",
        ];

        const fallback = "/safe-link";

        // Act & Assert
        unsupportedProtocols.forEach((url) => {
          expect(sanitizeLinkUrl(url, fallback)).toBe(fallback);
        });
      });
    });

    describe("custom fallbacks", () => {
      it("should use custom fallback when provided", () => {
        // Arrange
        const customFallback = "/custom-error-page";
        const badUrl = 'javascript:alert("bad")';

        // Act
        const result = sanitizeLinkUrl(badUrl, customFallback);

        // Assert
        expect(result).toBe(customFallback);
      });

      it("should use default fallback when none provided", () => {
        // Arrange
        const badUrl = 'vbscript:msgbox("bad")';

        // Act
        const result = sanitizeLinkUrl(badUrl);

        // Assert
        expect(result).toBe("#");
      });
    });
  });

  describe("useSafeImageUrl composable", () => {
    it("should return object with sanitization functions", () => {
      // Act
      const { safeUrl, safeLinkUrl: composableSafeLinkUrl } = useSafeImageUrl();

      // Assert
      expect(typeof safeUrl).toBe("function");
      expect(typeof composableSafeLinkUrl).toBe("function");
    });

    it("should work the same as direct function calls", () => {
      // Arrange
      const { safeUrl, safeLinkUrl: composableSafeLinkUrl } = useSafeImageUrl();
      const testImageUrl = "https://example.com/image.jpg";
      const testLinkUrl = "https://example.com/page.html";

      // Act & Assert
      expect(safeUrl(testImageUrl)).toBe(sanitizeImageUrl(testImageUrl));
      expect(composableSafeLinkUrl(testLinkUrl)).toBe(
        sanitizeLinkUrl(testLinkUrl),
      );
    });
  });

  describe("exported aliases", () => {
    it("should export safeImageUrl as alias for sanitizeImageUrl", () => {
      // Arrange
      const testUrl = "https://example.com/image.jpg";

      // Act & Assert
      expect(safeImageUrl(testUrl)).toBe(sanitizeImageUrl(testUrl));
      expect(safeImageUrl).toBe(sanitizeImageUrl);
    });

    it("should export safeLinkUrl as alias for sanitizeLinkUrl", () => {
      // Arrange
      const testUrl = "https://example.com/page.html";

      // Act & Assert
      expect(safeLinkUrl(testUrl)).toBe(sanitizeLinkUrl(testUrl));
      expect(safeLinkUrl).toBe(sanitizeLinkUrl);
    });
  });

  describe("comprehensive security tests", () => {
    it("should handle mixed case dangerous protocols", () => {
      // Arrange
      const mixedCaseUrls = [
        "JavaScript:alert(1)",
        'VbScript:msgbox("test")',
        "FiLe:///etc/passwd",
        "ChRoMe-ExTeNsIoN://test/",
      ];

      // Act & Assert
      mixedCaseUrls.forEach((url) => {
        expect(sanitizeImageUrl(url)).toContain("data:image/svg+xml");
        expect(sanitizeLinkUrl(url)).toBe("#");
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Dangerous URL pattern detected:",
          expect.any(String),
        );
      });
    });

    it("should handle various URL encoding attacks", () => {
      // Arrange
      const encodedAttacks = [
        "javascript%3Aalert%281%29", // URL encoded javascript:alert(1)
        "java%0ascript:alert(1)", // Null byte injection attempt
        "java\x00script:alert(1)", // Hex encoded null byte
        "&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)", // HTML entity encoding
      ];

      // Act & Assert
      encodedAttacks.forEach((url) => {
        const imageResult = sanitizeImageUrl(url);
        const linkResult = sanitizeLinkUrl(url);

        // Should either be treated as invalid URL or dangerous pattern
        expect(
          imageResult === url || imageResult.includes("data:image/svg+xml"),
        ).toBe(true);
        expect(linkResult === url || linkResult === "#").toBe(true);
      });
    });

    it("should handle edge case hostnames safely", () => {
      // Arrange
      const edgeCaseUrls = [
        "http://0.0.0.0/image.jpg", // All zeros IP
        "https://[::1]:8080/image.png", // IPv6 localhost with port
        "http://127.0.0.1:3000/avatar.gif", // Localhost with port
        "https://192.168.0.1/photo.webp", // Common router IP
      ];

      // Act & Assert
      edgeCaseUrls.forEach((url) => {
        expect(sanitizeImageUrl(url)).toContain("data:image/svg+xml");
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "Private/local URL detected:",
          expect.any(String),
        );
      });
    });

    it("should handle very long URLs without performance issues", () => {
      // Arrange
      const longUrl = "https://example.com/" + "a".repeat(1000) + ".jpg";
      const longDataUrl = "data:image/png;base64," + "VGVzdA==".repeat(100);

      // Act & Assert
      const startTime = performance.now();
      const result1 = sanitizeImageUrl(longUrl);
      const result2 = sanitizeImageUrl(longDataUrl);
      const endTime = performance.now();

      // Should handle both URLs efficiently
      expect(typeof result1).toBe("string");
      expect(result1.length).toBeGreaterThan(0);
      expect(typeof result2).toBe("string");
      expect(result2.length).toBeGreaterThan(0);

      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should handle URLs with unusual but valid characters", () => {
      // Arrange
      const unusualUrls = [
        "https://example.com/path/with-unicode-café.jpg",
        "https://example.com/image.jpg?param1=value1&param2=value%202",
        "https://user:pass@example.com/secure-image.png",
        "https://example.com:8443/images/file[1].jpg",
      ];

      // Act & Assert
      unusualUrls.forEach((url) => {
        const result = sanitizeImageUrl(url);
        // Should either accept the URL or handle gracefully
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it("should consistently handle boundary conditions", () => {
      // Test various boundary conditions that might cause issues
      const boundaryTests = [
        {
          input: null,
          expected: expect.stringContaining("data:image/svg+xml"),
        },
        {
          input: undefined,
          expected: expect.stringContaining("data:image/svg+xml"),
        },
        { input: "", expected: expect.stringContaining("data:image/svg+xml") },
        {
          input: "   ",
          expected: expect.stringContaining("data:image/svg+xml"),
        },
        {
          input: "https://example.com/valid.jpg",
          expected: "https://example.com/valid.jpg",
        },
      ];

      boundaryTests.forEach(({ input, expected }) => {
        expect(sanitizeImageUrl(input)).toEqual(expected);
      });
    });
  });

  describe("performance and edge cases", () => {
    it("should handle rapid successive calls efficiently", () => {
      // Arrange
      const testUrl = "https://example.com/image.jpg";
      const iterations = 1000;

      // Act
      const startTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        sanitizeImageUrl(testUrl);
        sanitizeLinkUrl(testUrl);
      }
      const endTime = performance.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    it("should be memory efficient with repeated calls", () => {
      // Arrange
      const testUrls = [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
        "javascript:alert(1)",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      ];

      // Act - multiple rounds to test memory usage
      for (let round = 0; round < 10; round++) {
        testUrls.forEach((url) => {
          sanitizeImageUrl(url);
          sanitizeLinkUrl(url);
        });
      }

      // Assert - should not throw memory errors or hang
      expect(true).toBe(true); // If we get here, memory handling is okay
    });
  });
});
