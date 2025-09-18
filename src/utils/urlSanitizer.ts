/**
 * URL Sanitization Utility
 * Prevents XSS attacks through malicious URLs in user-provided content
 */

// Allowed URL schemes for different content types
const ALLOWED_IMAGE_SCHEMES = [
  "https:",
  "http:",
  "data:", // For base64 encoded images
];

const ALLOWED_LINK_SCHEMES = ["https:", "http:", "mailto:"];

// Dangerous protocols that could execute JavaScript
const DANGEROUS_SCHEMES = [
  "javascript:",
  "vbscript:",
  "file:",
  "about:",
  "chrome:",
  "chrome-extension:",
  "ms-browser-extension:",
  "moz-extension:",
  "opera-extension:",
  "safari-extension:",
  "webkit:",
];

/**
 * Default fallback image for invalid/dangerous URLs
 */
const DEFAULT_AVATAR =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiI+PGNpcmNsZSBjeD0iMTIiIGN5PSI4IiByPSI0Ii8+PHBhdGggZD0iTTUgMTlhNyA3IDAgMCAxIDE0IDB2MUg1di0xeiIvPjwvc3ZnPg==";

/**
 * Sanitize image URLs to prevent XSS attacks
 * @param url - The URL to sanitize
 * @param fallback - Optional fallback URL if sanitization fails
 * @returns Safe URL or fallback
 */
export function sanitizeImageUrl(
  url: string | null | undefined,
  fallback: string = DEFAULT_AVATAR,
): string {
  if (!url) {
    return fallback;
  }

  try {
    // Trim whitespace and decode any HTML entities
    const cleanUrl = url.trim();

    // Check for dangerous patterns first
    if (containsDangerousPatterns(cleanUrl)) {
      console.warn("Dangerous URL pattern detected:", cleanUrl);
      return fallback;
    }

    // For data URLs, perform additional validation
    if (cleanUrl.startsWith("data:")) {
      return sanitizeDataUrl(cleanUrl, fallback);
    }

    // For regular URLs, validate the scheme
    const urlObj = new URL(cleanUrl);

    if (!ALLOWED_IMAGE_SCHEMES.includes(urlObj.protocol)) {
      console.warn("Invalid URL scheme for image:", urlObj.protocol);
      return fallback;
    }

    // Additional validation for HTTP(S) URLs
    if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
      // Validate hostname isn't localhost or private IP
      if (isPrivateUrl(urlObj.hostname)) {
        console.warn("Private/local URL detected:", urlObj.hostname);
        return fallback;
      }
    }

    return cleanUrl;
  } catch (error) {
    // Invalid URL format
    console.warn("Invalid URL format:", url);
    return fallback;
  }
}

/**
 * Sanitize general link URLs
 * @param url - The URL to sanitize
 * @param fallback - Optional fallback URL if sanitization fails
 * @returns Safe URL or fallback
 */
export function sanitizeLinkUrl(
  url: string | null | undefined,
  fallback: string = "#",
): string {
  if (!url) {
    return fallback;
  }

  try {
    const cleanUrl = url.trim();

    // Check for dangerous patterns
    if (containsDangerousPatterns(cleanUrl)) {
      console.warn("Dangerous URL pattern detected:", cleanUrl);
      return fallback;
    }

    // Handle relative URLs
    if (
      cleanUrl.startsWith("/") ||
      cleanUrl.startsWith("./") ||
      cleanUrl.startsWith("../")
    ) {
      return cleanUrl;
    }

    // Validate absolute URLs
    const urlObj = new URL(cleanUrl);

    if (!ALLOWED_LINK_SCHEMES.includes(urlObj.protocol)) {
      console.warn("Invalid URL scheme for link:", urlObj.protocol);
      return fallback;
    }

    return cleanUrl;
  } catch (error) {
    console.warn("Invalid URL format:", url);
    return fallback;
  }
}

/**
 * Sanitize data URLs (base64 encoded images)
 */
function sanitizeDataUrl(dataUrl: string, fallback: string): string {
  // Validate data URL format
  const dataUrlRegex = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/i;

  if (!dataUrlRegex.test(dataUrl)) {
    console.warn("Invalid data URL format");
    return fallback;
  }

  // Check for suspicious patterns in the base64 content
  const base64Content = dataUrl.split(",")[1];
  if (base64Content) {
    try {
      // Validate base64 encoding
      atob(base64Content);
      return dataUrl;
    } catch {
      console.warn("Invalid base64 encoding in data URL");
      return fallback;
    }
  }

  return fallback;
}

/**
 * Check if URL contains dangerous patterns
 */
function containsDangerousPatterns(url: string): boolean {
  const lowerUrl = url.toLowerCase();

  // Check for dangerous schemes
  for (const scheme of DANGEROUS_SCHEMES) {
    if (lowerUrl.startsWith(scheme)) {
      return true;
    }
  }

  // Check for encoded dangerous patterns
  const dangerousPatterns = [
    /javascript:/i,
    /vbscript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<script/i,
    /&lt;script/i,
    /%3Cscript/i,
    /\\x3Cscript/i,
    /\\u003Cscript/i,
  ];

  return dangerousPatterns.some((pattern) => pattern.test(url));
}

/**
 * Check if hostname is a private/local address
 */
function isPrivateUrl(hostname: string): boolean {
  const privatePatterns = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"];

  if (privatePatterns.includes(hostname.toLowerCase())) {
    return true;
  }

  // Check for private IP ranges
  const privateIpRegex =
    /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.)/;
  return privateIpRegex.test(hostname);
}

/**
 * Create a safe image URL helper for Vue templates
 */
export function useSafeImageUrl() {
  return {
    safeUrl: sanitizeImageUrl,
    safeLinkUrl: sanitizeLinkUrl,
  };
}

// Shorter alias for template usage
export const safeImageUrl = sanitizeImageUrl;
export const safeLinkUrl = sanitizeLinkUrl;
