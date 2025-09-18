/**
 * Async Error Handler Composable
 * Provides comprehensive error handling for async operations in setup() functions
 * and other contexts where Vue's ErrorBoundary might not catch errors
 */

import {
  ref,
  onErrorCaptured,
  getCurrentInstance,
  readonly,
  onMounted,
  onBeforeMount,
  type Ref,
} from "vue";
import { errorLogger } from "@/services/errorLogging";

export interface AsyncErrorHandler {
  executeAsync: <T>(
    operation: () => Promise<T>,
    fallbackValue?: T,
  ) => Promise<T>;
  handleError: (error: Error, context?: string) => void;
  isLoading: Readonly<Ref<boolean>>;
  hasError: Readonly<Ref<boolean>>;
  errorMessage: Readonly<Ref<string | null>>;
  clearError: () => void;
}

export interface AsyncErrorOptions {
  showNotification?: boolean;
  logError?: boolean;
  fallbackValue?: any;
  retryCount?: number;
  onError?: (error: Error) => void;
  context?: string;
}

/**
 * Enhanced async error handler that catches errors Vue's ErrorBoundary might miss
 */
export function useAsyncErrorHandler(
  options: AsyncErrorOptions = {},
): AsyncErrorHandler {
  const isLoading = ref(false);
  const hasError = ref(false);
  const errorMessage = ref<string | null>(null);
  const instance = getCurrentInstance();

  const {
    showNotification = true,
    logError = true,
    fallbackValue,
    retryCount = 0,
    onError,
    context = "Async Operation",
  } = options;

  /**
   * Execute async operation with comprehensive error handling
   */
  const executeAsync = async <T>(
    operation: () => Promise<T>,
    fallbackValue?: T,
  ): Promise<T> => {
    isLoading.value = true;
    hasError.value = false;
    errorMessage.value = null;

    let attempts = 0;
    const maxAttempts = retryCount + 1;

    while (attempts < maxAttempts) {
      try {
        const result = await operation();
        isLoading.value = false;
        return result;
      } catch (error) {
        attempts++;

        if (attempts < maxAttempts) {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempts) * 1000),
          );
          continue;
        }

        // All attempts failed
        isLoading.value = false;
        hasError.value = true;

        const errorObj =
          error instanceof Error ? error : new Error(String(error));
        errorMessage.value = getErrorMessage(errorObj);

        handleError(errorObj, context);

        if (fallbackValue !== undefined) {
          return fallbackValue;
        }

        throw errorObj;
      }
    }

    // This should never be reached
    throw new Error("Unexpected error in executeAsync");
  };

  /**
   * Handle errors with logging, notifications, and propagation
   */
  const handleError = (error: Error, context = "Unknown Context") => {
    hasError.value = true;
    errorMessage.value = getErrorMessage(error);

    // Log error if enabled
    if (logError) {
      errorLogger.logError(error, context, {
        component: instance?.type.__name || "Unknown Component",
        route: window.location.pathname,
        timestamp: new Date().toISOString(),
      });
    }

    // Show notification if enabled
    if (showNotification) {
      showErrorNotification(error);
    }

    // Call custom error handler
    onError?.(error);

    // Emit to global error handler
    emitGlobalError(error, context);
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    hasError.value = false;
    errorMessage.value = null;
  };

  return {
    executeAsync,
    handleError,
    isLoading: readonly(isLoading),
    hasError: readonly(hasError),
    errorMessage: readonly(errorMessage),
    clearError,
  };
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error: Error): string {
  if (!error) {
    return "An unknown error occurred.";
  }

  if (error.name === "NetworkError" || error.message?.includes("fetch")) {
    return "Network connection error. Please check your internet connection.";
  }

  if (error.message?.includes("404")) {
    return "The requested resource was not found.";
  }

  if (error.message?.includes("403")) {
    return "You do not have permission to access this resource.";
  }

  if (error.message?.includes("500")) {
    return "Server error occurred. Please try again later.";
  }

  if (
    error.name === "ChunkLoadError" ||
    error.message?.includes("Loading chunk")
  ) {
    return "Failed to load application resources. Please refresh the page.";
  }

  return error.message || "An unexpected error occurred.";
}

/**
 * Show error notification to user
 */
function showErrorNotification(error: Error) {
  try {
    // Create a temporary notification since we can't import useNotifications here
    const notification = document.createElement("div");
    notification.className =
      "fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm";

    const message = document.createElement("p");
    message.className = "text-sm";
    message.textContent = getErrorMessage(error);

    const closeButton = document.createElement("button");
    closeButton.className =
      "absolute top-2 right-2 text-white hover:text-gray-200";
    closeButton.textContent = "×";
    closeButton.onclick = () => notification.remove();

    notification.appendChild(message);
    notification.appendChild(closeButton);
    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  } catch (notificationError) {
    console.error("Failed to show error notification:", notificationError);
  }
}

/**
 * Emit error to global error handler
 */
function emitGlobalError(error: Error, context: string) {
  window.dispatchEvent(
    new CustomEvent("vue:async-error", {
      detail: { error, context, timestamp: Date.now() },
    }),
  );
}

/**
 * Global async error handler for errors that escape component boundaries
 */
export function setupGlobalAsyncErrorHandler() {
  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));

    errorLogger.logError(error, "Unhandled Promise Rejection", {
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    // Show user notification for critical errors
    if (shouldShowNotification(error)) {
      showErrorNotification(error);
    }

    // Prevent default browser behavior for certain errors
    if (shouldPreventDefault(event.reason)) {
      event.preventDefault();
    }
  });

  // Handle custom async errors
  window.addEventListener("vue:async-error", (event: Event) => {
    const customEvent = event as CustomEvent;
    const { error, context } = customEvent.detail;
    console.error(`Async error in ${context}:`, error);
  });
}

/**
 * Check if error should show notification
 */
function shouldShowNotification(error: Error): boolean {
  const silentErrors = [
    "ChunkLoadError",
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ];

  return !silentErrors.some(
    (silent) => error.name.includes(silent) || error.message.includes(silent),
  );
}

/**
 * Check if should prevent default behavior
 */
function shouldPreventDefault(reason: any): boolean {
  if (typeof reason === "string") {
    return (
      reason.includes("ChunkLoadError") ||
      reason.includes("Loading chunk") ||
      reason.includes("AbortError")
    );
  }
  return false;
}

/**
 * Hook for lifecycle functions with async error handling
 */
export function useAsyncLifecycle() {
  const errorHandler = useAsyncErrorHandler();

  const onMountedAsync = (operation: () => Promise<void>) => {
    onMounted(async () => {
      await errorHandler.executeAsync(operation);
    });
  };

  const onBeforeMountAsync = (operation: () => Promise<void>) => {
    onBeforeMount(async () => {
      await errorHandler.executeAsync(operation);
    });
  };

  return {
    onMountedAsync,
    onBeforeMountAsync,
    ...errorHandler,
  };
}
