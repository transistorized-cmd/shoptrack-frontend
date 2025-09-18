/**
 * Utility functions for CSRF token meta tag management
 *
 * This module provides functions to work with CSRF tokens in HTML meta tags,
 * which is a common pattern for server-side rendered applications.
 *
 * For client-side applications like this Vue SPA, we use the CSRF composable
 * for dynamic token generation, but these utilities can be helpful if you
 * need to integrate with server-side CSRF token management.
 */

import { SECURITY } from "@/constants/app";

/**
 * Get CSRF token from HTML meta tag
 * This is typically used when the server pre-renders a CSRF token in the HTML
 */
export function getCsrfTokenFromMeta(): string | null {
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  return metaTag?.getAttribute("content") || null;
}

/**
 * Set or update the CSRF token meta tag
 * This can be useful for updating the meta tag when token changes
 */
export function setCsrfTokenMeta(token: string): void {
  let metaTag = document.querySelector('meta[name="csrf-token"]');

  if (!metaTag) {
    metaTag = document.createElement("meta");
    metaTag.setAttribute("name", "csrf-token");
    document.head.appendChild(metaTag);
  }

  metaTag.setAttribute("content", token);
}

/**
 * Remove CSRF token meta tag
 * This can be useful when clearing tokens on logout
 */
export function removeCsrfTokenMeta(): void {
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  if (metaTag) {
    metaTag.remove();
  }
}

/**
 * Validate CSRF token format
 * Basic validation to ensure token looks like a proper CSRF token
 */
export function isValidCsrfToken(token: string): boolean {
  // Check if token is a non-empty string with reasonable length
  if (!token || typeof token !== "string") {
    return false;
  }

  // CSRF tokens should typically be at least 16 characters long
  // and contain only alphanumeric characters
  const csrfTokenPattern = new RegExp(
    `^[a-zA-Z0-9]{${SECURITY.MIN_CSRF_TOKEN_LENGTH},}$`,
  );
  return csrfTokenPattern.test(token);
}

/**
 * Get CSRF token with fallback strategy
 * Tries multiple sources in order of preference
 */
export async function getCsrfTokenWithFallback(): Promise<string | null> {
  // Try to get from our dynamic token management first
  try {
    const { csrfManager } = await import("@/composables/useCsrfToken");
    const token = await csrfManager.getToken();
    if (token && isValidCsrfToken(token)) {
      return token;
    }
  } catch (error) {
    console.warn("Failed to get CSRF token from composable:", error);
  }

  // Fallback to meta tag
  const metaToken = getCsrfTokenFromMeta();
  if (metaToken && isValidCsrfToken(metaToken)) {
    return metaToken;
  }

  // No valid token found
  console.error("No valid CSRF token found in any source");
  return null;
}
