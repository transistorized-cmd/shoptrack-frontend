<template>
  <div
    v-if="hasError"
    class="min-h-screen flex items-center justify-center bg-gray-50"
  >
    <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
      <div class="mb-6">
        <div
          class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100"
        >
          <svg
            class="h-6 w-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
      </div>

      <h3 class="text-lg font-medium text-gray-900 mb-2">
        Something went wrong
      </h3>

      <p class="text-sm text-gray-500 mb-6">
        {{ userFriendlyMessage }}
      </p>

      <!-- Error type indicator -->
      <div v-if="errorType" class="mb-4">
        <span 
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
          :class="getErrorTypeClass(errorType)"
        >
          {{ errorType }}
        </span>
      </div>

      <div v-if="showDetails && errorDetails" class="mb-6 text-left">
        <details class="text-xs">
          <summary
            class="cursor-pointer text-gray-600 hover:text-gray-800 mb-2"
          >
            Technical Details
          </summary>
          <pre
            class="bg-gray-100 p-3 rounded text-red-600 overflow-auto max-h-32"
            >{{ errorDetails }}</pre
          >
        </details>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          @click="retry"
        >
          Try Again
        </button>

        <button
          class="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          @click="goHome"
        >
          Go Home
        </button>

        <button
          v-if="!showDetails"
          class="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-md hover:bg-gray-200"
          @click="showDetails = true"
        >
          Show Details
        </button>
      </div>

      <!-- Retry count indicator -->
      <div v-if="retryCount > 0" class="mt-4 text-xs text-gray-500">
        Retry attempt: {{ retryCount }}
      </div>
    </div>
  </div>

  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import { getErrorTypeClass } from '@/utils/uiHelpers';

interface Props {
  fallback?: string;
  showErrorDetails?: boolean;
  maxRetries?: number;
  captureAsync?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  fallback: "An unexpected error occurred. Please try again.",
  showErrorDetails: false,
  maxRetries: 3,
  captureAsync: true,
});

const router = useRouter();

const hasError = ref(false);
const errorDetails = ref<string | null>(null);
const showDetails = ref(props.showErrorDetails);
const userFriendlyMessage = ref(props.fallback);
const errorType = ref<string | null>(null);
const retryCount = ref(0);

let asyncErrorHandler: ((event: Event) => void) | null = null;

onMounted(() => {
  if (props.captureAsync) {
    // Set up async error capture
    asyncErrorHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { error, context } = customEvent.detail;
      handleError(error, 'Async Error', context || 'Unknown async context');
    };
    
    window.addEventListener('vue:async-error', asyncErrorHandler);
  }
});

onUnmounted(() => {
  if (asyncErrorHandler) {
    window.removeEventListener('vue:async-error', asyncErrorHandler);
  }
});

// Capture errors from child components
onErrorCaptured((error: Error, instance, info) => {
  handleError(error, 'Component Error', info);
  return false; // Prevent propagation
});

const handleError = (error: Error, type: string, info: string) => {
  console.error(`${type} caught by ErrorBoundary:`, error);
  console.error("Error info:", info);

  hasError.value = true;
  errorType.value = type;
  errorDetails.value = `${error.name}: ${error.message}\n\nStack:\n${error.stack}\n\nContext:\n${info}`;

  // Set user-friendly message based on error type and characteristics
  userFriendlyMessage.value = getUserFriendlyMessage(error, type);

  // Log error to external service
  logErrorToService(error, type, info);
};

const getUserFriendlyMessage = (error: Error, type: string): string => {
  // Authentication errors - don't show generic error for expected auth failures
  if (error.message.includes("401") || error.message.includes("Unauthorized")) {
    return "Your session has expired. Please log in again.";
  }

  // Network/API errors
  if (error.name === 'NetworkError' || error.message.includes('fetch')) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }

  // Chunk loading errors (common in SPAs)
  if (error.name === "ChunkLoadError" || error.message.includes("Loading chunk")) {
    return "Failed to load application resources. Please refresh the page.";
  }

  // HTTP status errors
  if (error.message.includes("404") || error.message.includes("Not Found")) {
    return "The requested resource was not found.";
  }

  if (error.message.includes("403") || error.message.includes("Forbidden")) {
    return "You don't have permission to access this resource.";
  }

  if (error.message.includes("500") || error.message.includes("Internal Server Error")) {
    return "Server error occurred. Please try again later.";
  }

  // Async errors specific messages
  if (type === 'Async Error') {
    return "An error occurred while loading data. Please try refreshing the page.";
  }

  // Plugin-related errors
  if (error.message.includes("plugin") || error.message.includes("Plugin")) {
    return "A plugin error occurred. The page may still work, but some features might be unavailable.";
  }

  // Default message
  return props.fallback;
};



const retry = () => {
  if (retryCount.value >= props.maxRetries) {
    userFriendlyMessage.value = `Maximum retry attempts (${props.maxRetries}) reached. Please refresh the page.`;
    return;
  }

  retryCount.value++;
  hasError.value = false;
  errorDetails.value = null;
  showDetails.value = props.showErrorDetails;
  errorType.value = null;
  userFriendlyMessage.value = props.fallback;

  // Force a re-render
  nextTick(() => {
    // Component will re-render and try again
  });
};

const goHome = () => {
  hasError.value = false;
  retryCount.value = 0;

  // If this is an authentication error, redirect to login instead of home
  if (errorType.value === 'Component Error' &&
      (errorDetails.value?.includes('401') || errorDetails.value?.includes('Unauthorized'))) {
    router.push("/login").catch((err) => {
      console.error("Failed to navigate to login:", err);
      window.location.href = "/login";
    });
  } else {
    router.push("/").catch((err) => {
      console.error("Failed to navigate to home:", err);
      // If navigation fails, reload the page
      window.location.href = "/";
    });
  }
};

const logErrorToService = (error: Error, type: string, info: string) => {
  try {
    const errorReport = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      errorType: type,
      retryCount: retryCount.value,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      contextInfo: info,
      userId: null, // Could be filled from auth context
    };

    // Send to error logging service
    // This could be integrated with services like Sentry, LogRocket, etc.
    console.group("🔴 Enhanced Error Report");
    console.error("Error details:", errorReport);
    console.groupEnd();

    // Example: Send to external service
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorReport)
    // }).catch(console.error);

  } catch (loggingError) {
    console.error("Failed to log error:", loggingError);
  }
};
</script>