/**
 * Vue Composable for Idempotency Management
 *
 * Provides reactive idempotency key management for Vue components.
 * Automatically handles key generation, storage, and cleanup for API operations.
 *
 * @module composables/useIdempotency
 */

import { ref, onUnmounted } from 'vue';
import {
  generateIdempotencyKey,
  getOrCreateIdempotencyKey,
  clearIdempotencyKey,
  isValidIdempotencyKey
} from '@/utils/idempotency';

/**
 * Composable for managing idempotency keys in Vue components
 *
 * @param operationId - Optional unique identifier for the operation
 * @returns Object containing idempotency key management functions
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useIdempotency } from '@/composables/useIdempotency';
 *
 * const { idempotencyKey, refreshKey, clearKey } = useIdempotency('upload-receipt');
 *
 * async function uploadReceipt() {
 *   const response = await api.post('/api/upload', formData, {
 *     headers: {
 *       'Idempotency-Key': idempotencyKey.value
 *     }
 *   });
 *
 *   // Clear key after successful upload
 *   clearKey();
 * }
 * </script>
 * ```
 */
export function useIdempotency(operationId?: string) {
  /**
   * Current idempotency key
   * Reactive ref that updates when key is refreshed
   */
  const idempotencyKey = ref<string | null>(null);

  /**
   * Whether a key is currently active
   */
  const hasKey = ref(false);

  /**
   * Generates a new idempotency key
   * If operationId is provided, stores the key for potential retries
   *
   * @param persist - Whether to persist the key in session storage (default: true)
   * @returns The generated idempotency key
   */
  function refreshKey(persist = true): string {
    if (operationId) {
      idempotencyKey.value = getOrCreateIdempotencyKey(operationId, persist);
    } else {
      idempotencyKey.value = generateIdempotencyKey();
    }
    hasKey.value = true;
    return idempotencyKey.value;
  }

  /**
   * Clears the current idempotency key
   * Removes from session storage if operationId is provided
   */
  function clearKey(): void {
    if (operationId) {
      clearIdempotencyKey(operationId);
    }
    idempotencyKey.value = null;
    hasKey.value = false;
  }

  /**
   * Gets the current key or generates a new one if none exists
   *
   * @param persist - Whether to persist the key in session storage (default: true)
   * @returns The current or newly generated idempotency key
   */
  function getKey(persist = true): string {
    if (idempotencyKey.value && isValidIdempotencyKey(idempotencyKey.value)) {
      return idempotencyKey.value;
    }
    return refreshKey(persist);
  }

  /**
   * Validates if the current key is valid
   *
   * @returns True if the current key is a valid UUID, false otherwise
   */
  function isKeyValid(): boolean {
    return idempotencyKey.value !== null && isValidIdempotencyKey(idempotencyKey.value);
  }

  /**
   * Clears the key when component is unmounted
   * Prevents memory leaks and stale keys
   */
  onUnmounted(() => {
    // Only clear if auto-generated (no operationId)
    // Keys with operationId should persist for retries
    if (!operationId) {
      clearKey();
    }
  });

  return {
    /** Current idempotency key (reactive) */
    idempotencyKey,
    /** Whether a key is currently active */
    hasKey,
    /** Generate a new idempotency key */
    refreshKey,
    /** Clear the current idempotency key */
    clearKey,
    /** Get current key or generate new one */
    getKey,
    /** Validate the current key */
    isKeyValid
  };
}

/**
 * Creates a one-time idempotency key for a single operation
 * The key is not persisted and will be cleared after use
 *
 * @returns A new idempotency key
 *
 * @example
 * ```typescript
 * const key = createOneTimeKey();
 * await api.post('/api/subscriptions', data, {
 *   headers: { 'Idempotency-Key': key }
 * });
 * ```
 */
export function createOneTimeKey(): string {
  return generateIdempotencyKey();
}

/**
 * Higher-order function that wraps an API call with automatic idempotency handling
 *
 * @param operationId - Unique identifier for the operation
 * @param apiCall - The API call function to wrap
 * @param options - Configuration options
 * @returns Wrapped API call with automatic idempotency key management
 *
 * @example
 * ```typescript
 * const uploadWithIdempotency = withIdempotency(
 *   'upload-receipt',
 *   async (data: FormData, key: string) => {
 *     return api.post('/api/upload', data, {
 *       headers: { 'Idempotency-Key': key }
 *     });
 *   }
 * );
 *
 * // Use it
 * const result = await uploadWithIdempotency(formData);
 * ```
 */
export function withIdempotency<T extends any[], R>(
  operationId: string,
  apiCall: (key: string, ...args: T) => Promise<R>,
  options: {
    clearOnSuccess?: boolean;
    clearOnError?: boolean;
  } = {}
): (...args: T) => Promise<R> {
  const { clearOnSuccess = true, clearOnError = false } = options;

  return async (...args: T): Promise<R> => {
    const key = getOrCreateIdempotencyKey(operationId);

    try {
      const result = await apiCall(key, ...args);

      // Clear key after successful operation
      if (clearOnSuccess) {
        clearIdempotencyKey(operationId);
      }

      return result;
    } catch (error) {
      // Clear key on error if configured
      if (clearOnError) {
        clearIdempotencyKey(operationId);
      }

      throw error;
    }
  };
}
