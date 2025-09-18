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
    </div>
  </div>

  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useNotifications } from "@/composables/useNotifications";

interface Props {
  fallback?: string;
  showErrorDetails?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  fallback: "An unexpected error occurred. Please try again.",
  showErrorDetails: false,
});

const router = useRouter();
const { error: showErrorNotification } = useNotifications();

const hasError = ref(false);
const errorDetails = ref<string | null>(null);
const showDetails = ref(props.showErrorDetails);
const userFriendlyMessage = ref(props.fallback);

// Capture errors from child components
onErrorCaptured((error: Error, instance, info) => {
  console.error("ErrorBoundary caught error:", error);
  console.error("Component instance:", instance);
  console.error("Error info:", info);

  hasError.value = true;
  errorDetails.value = `${error.name}: ${error.message}\n\nStack:\n${error.stack}\n\nComponent Info:\n${info}`;

  // Set user-friendly message based on error type
  if (
    error.name === "ChunkLoadError" ||
    error.message.includes("Loading chunk")
  ) {
    userFriendlyMessage.value =
      "Failed to load application resources. Please refresh the page.";
  } else if (error.name === "TypeError" && error.message.includes("fetch")) {
    userFriendlyMessage.value =
      "Network error occurred. Please check your connection and try again.";
  } else if (
    error.message.includes("404") ||
    error.message.includes("Not Found")
  ) {
    userFriendlyMessage.value = "The requested resource was not found.";
  } else {
    userFriendlyMessage.value = props.fallback;
  }

  // Log error to external service (if configured)
  logErrorToService(error, info);

  // Return false to prevent the error from propagating further
  return false;
});

const retry = () => {
  hasError.value = false;
  errorDetails.value = null;
  showDetails.value = props.showErrorDetails;
  userFriendlyMessage.value = props.fallback;

  // Force a re-render
  nextTick(() => {
    // Component will re-render and try again
  });
};

const goHome = () => {
  hasError.value = false;
  router.push("/").catch((err) => {
    console.error("Failed to navigate to home:", err);
    // If navigation fails, reload the page
    window.location.href = "/";
  });
};

const logErrorToService = (error: Error, info: string) => {
  try {
    // In a real app, you might send this to an error tracking service
    // like Sentry, LogRocket, or your own logging endpoint

    const errorReport = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentInfo: info,
      userId: null, // Could be filled from auth context
    };

    // Example: Send to your logging endpoint
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorReport)
    // }).catch(console.error);

    console.group("🔴 Error Report");
    console.error("Error details:", errorReport);
    console.groupEnd();
  } catch (loggingError) {
    console.error("Failed to log error:", loggingError);
  }
};
</script>
