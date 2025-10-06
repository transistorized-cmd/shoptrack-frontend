/**
 * Idempotency Utilities
 *
 * Provides utilities for generating and managing idempotency keys for API requests.
 * Idempotency keys prevent duplicate operations when requests are retried due to
 * network issues or user actions.
 *
 * @module utils/idempotency
 */

/**
 * Generates a UUID v4 string for use as an idempotency key
 *
 * @returns A randomly generated UUID string
 *
 * @example
 * ```typescript
 * const key = generateIdempotencyKey();
 * // Returns: "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generateIdempotencyKey(): string {
  // Use crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validates if a string is a valid UUID format
 *
 * @param key - The string to validate
 * @returns True if the string is a valid UUID, false otherwise
 *
 * @example
 * ```typescript
 * isValidIdempotencyKey("550e8400-e29b-41d4-a716-446655440000"); // true
 * isValidIdempotencyKey("invalid-key"); // false
 * ```
 */
export function isValidIdempotencyKey(key: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(key);
}

/**
 * Storage key for idempotency keys in session storage
 * Used to track pending operations and prevent key reuse
 */
const STORAGE_KEY_PREFIX = 'idempotency_key_';

/**
 * Stores an idempotency key in session storage
 * This allows tracking of pending operations across page reloads
 *
 * @param operationId - Unique identifier for the operation
 * @param key - The idempotency key to store
 *
 * @example
 * ```typescript
 * const key = generateIdempotencyKey();
 * storeIdempotencyKey('create-subscription', key);
 * ```
 */
export function storeIdempotencyKey(operationId: string, key: string): void {
  try {
    sessionStorage.setItem(`${STORAGE_KEY_PREFIX}${operationId}`, key);
  } catch (error) {
    console.warn('Failed to store idempotency key:', error);
  }
}

/**
 * Retrieves a stored idempotency key from session storage
 *
 * @param operationId - Unique identifier for the operation
 * @returns The stored idempotency key, or null if not found
 *
 * @example
 * ```typescript
 * const key = getStoredIdempotencyKey('create-subscription');
 * if (key) {
 *   // Retry with same key
 * }
 * ```
 */
export function getStoredIdempotencyKey(operationId: string): string | null {
  try {
    return sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${operationId}`);
  } catch (error) {
    console.warn('Failed to retrieve idempotency key:', error);
    return null;
  }
}

/**
 * Removes a stored idempotency key from session storage
 * Should be called after a successful operation completes
 *
 * @param operationId - Unique identifier for the operation
 *
 * @example
 * ```typescript
 * // After successful API call
 * clearIdempotencyKey('create-subscription');
 * ```
 */
export function clearIdempotencyKey(operationId: string): void {
  try {
    sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${operationId}`);
  } catch (error) {
    console.warn('Failed to clear idempotency key:', error);
  }
}

/**
 * Gets or creates an idempotency key for an operation
 * If a key already exists for this operation (e.g., from a retry),
 * it will be reused. Otherwise, a new key is generated.
 *
 * @param operationId - Unique identifier for the operation
 * @param persist - Whether to persist the key in session storage (default: true)
 * @returns An idempotency key (existing or newly generated)
 *
 * @example
 * ```typescript
 * // First call - generates new key
 * const key1 = getOrCreateIdempotencyKey('upload-receipt');
 *
 * // Subsequent call (e.g., retry) - reuses same key
 * const key2 = getOrCreateIdempotencyKey('upload-receipt');
 * // key1 === key2
 * ```
 */
export function getOrCreateIdempotencyKey(
  operationId: string,
  persist = true
): string {
  // Try to get existing key
  const existingKey = getStoredIdempotencyKey(operationId);
  if (existingKey && isValidIdempotencyKey(existingKey)) {
    return existingKey;
  }

  // Generate new key
  const newKey = generateIdempotencyKey();

  // Store if persistence is enabled
  if (persist) {
    storeIdempotencyKey(operationId, newKey);
  }

  return newKey;
}

/**
 * Clears all stored idempotency keys from session storage
 * Useful for cleanup or testing scenarios
 *
 * @example
 * ```typescript
 * // Clear all keys on logout
 * clearAllIdempotencyKeys();
 * ```
 */
export function clearAllIdempotencyKeys(): void {
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach((key) => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clear all idempotency keys:', error);
  }
}
