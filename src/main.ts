import { createApp } from "vue";
import { createPinia } from "pinia";
import "./assets/styles/main.css";
import "./styles/mobile-optimizations.css";
import App from "./App.vue";
import router from "./router";
import i18n from "./i18n";
import { initializePlugins } from "./plugins";
import { csrfManager } from "./composables/useCsrfToken";
import ErrorBoundary from "./components/ErrorBoundary.vue";
import EnhancedErrorBoundary from "./components/EnhancedErrorBoundary.vue";
import { errorLogger } from "./services/errorLogging";
import { setupDIContainer } from "./core/di/setup";
import { setupGlobalAsyncErrorHandler } from "./composables/useAsyncErrorHandler";
import { useAuthStore } from "@/stores/auth";
import { useCategoriesStore } from "@/stores/categories";
import { availableLocales } from "@/i18n";
import { memoryMonitoringPlugin } from "@/plugins/memoryMonitoring.plugin";

// Error handling utilities
const logGlobalError = (error: Error, context: string) => {
  errorLogger.logError(error, context).catch((loggingError) => {
    console.error("Failed to log error:", loggingError);
  });
};

const shouldShowErrorNotification = (error: Error): boolean => {
  // Don't show notifications for certain error types that are handled elsewhere
  const silentErrors = [
    "ChunkLoadError",
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ];

  return !silentErrors.some(
    (silent) => error.name.includes(silent) || error.message.includes(silent),
  );
};

const shouldPreventDefault = (reason: any): boolean => {
  // Prevent default for certain promise rejections
  if (typeof reason === "string") {
    return (
      reason.includes("ChunkLoadError") ||
      reason.includes("Loading chunk") ||
      reason.includes("AbortError")
    );
  }
  return false;
};

const showErrorToUser = (error: Error) => {
  try {
    // Create a simple notification element if notifications composable isn't available
    const notification = document.createElement("div");
    notification.className =
      "fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm";

    // Create the notification structure safely using DOM methods
    const container = document.createElement("div");
    container.className = "flex items-start";

    // Create icon container
    const iconContainer = document.createElement("div");
    iconContainer.className = "flex-shrink-0";

    // Create SVG icon safely
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "h-5 w-5");
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("viewBox", "0 0 20 20");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill-rule", "evenodd");
    path.setAttribute(
      "d",
      "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z",
    );
    path.setAttribute("clip-rule", "evenodd");

    svg.appendChild(path);
    iconContainer.appendChild(svg);

    // Create content container
    const contentContainer = document.createElement("div");
    contentContainer.className = "ml-3";

    const title = document.createElement("p");
    title.className = "text-sm font-medium";
    title.textContent = "Something went wrong";

    const description = document.createElement("p");
    description.className = "text-xs mt-1 opacity-90";
    description.textContent =
      "Please refresh the page if the problem persists.";

    contentContainer.appendChild(title);
    contentContainer.appendChild(description);

    // Create close button
    const closeButton = document.createElement("button");
    closeButton.className = "ml-auto text-white hover:text-gray-200";
    closeButton.addEventListener("click", () => {
      notification.remove();
    });

    const closeSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    closeSvg.setAttribute("class", "h-4 w-4");
    closeSvg.setAttribute("fill", "currentColor");
    closeSvg.setAttribute("viewBox", "0 0 20 20");

    const closePath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    closePath.setAttribute("fill-rule", "evenodd");
    closePath.setAttribute(
      "d",
      "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z",
    );
    closePath.setAttribute("clip-rule", "evenodd");

    closeSvg.appendChild(closePath);
    closeButton.appendChild(closeSvg);

    // Assemble the notification
    container.appendChild(iconContainer);
    container.appendChild(contentContainer);
    container.appendChild(closeButton);
    notification.appendChild(container);

    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000); // TODO: Replace with TIMEOUT.ERROR_DISPLAY from constants
  } catch (notificationError) {
    console.error("Failed to show error notification:", notificationError);
  }
};

// Initialize application systems
const initializeApp = async () => {
  // Setup dependency injection container
  setupDIContainer();

  // Setup global async error handler
  setupGlobalAsyncErrorHandler();

  // Initialize plugin system
  initializePlugins();

  // Initialize CSRF token management
  try {
    await csrfManager.initialize();
    console.info("CSRF token management initialized");
  } catch (error) {
    console.error("Failed to initialize CSRF token management:", error);
  }

  const app = createApp(App);
  const pinia = createPinia();

  // Global error handlers
  app.config.errorHandler = (err: unknown, instance, info: string) => {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Global Vue error handler:", error);
    console.error("Component instance:", instance);
    console.error("Error info:", info);

    // Log to external service
    logGlobalError(error, info);

    // Show user notification for critical errors
    if (shouldShowErrorNotification(error)) {
      showErrorToUser(error);
    }
  };

  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
    logGlobalError(new Error(event.reason), "Unhandled Promise Rejection");

    // Prevent the default browser behavior
    if (shouldPreventDefault(event.reason)) {
      event.preventDefault();
    }
  });

  // Handle other JavaScript errors
  window.addEventListener("error", (event) => {
    console.error("Global JavaScript error:", event.error);
    logGlobalError(
      event.error || new Error(event.message),
      "Global JavaScript Error",
    );
  });

  app.use(pinia);
  app.use(router);
  app.use(i18n);

  // Install Memory Monitoring Plugin
  // This will automatically initialize memory monitoring in production-ready mode
  app.use(memoryMonitoringPlugin, {
    autoStart: true, // Automatically start monitoring when app mounts
    registerAllStores: true, // Register all Pinia stores for monitoring
    showWidget: process.env.NODE_ENV === 'development', // Show widget only in development
    config: {
      // Override default configuration if needed
      monitoring: {
        interval: process.env.NODE_ENV === 'development' ? 15000 : 60000, // More frequent in dev
      }
    }
  });

  // Initialize authentication after pinia and router are set up
  try {
    const authStore = useAuthStore();

    // Set up session expired callback to automatically redirect to login
    authStore.setOnSessionExpiredCallback(() => {
      console.info("Session expired - redirecting to login");
      router.push({
        path: "/login",
        query: { redirect: router.currentRoute.value.fullPath }
      });
    });

    await authStore.initialize();
    console.info("Authentication system initialized");
  } catch (error) {
    console.error("Failed to initialize authentication system:", error);
  }

  // Preload categories for all supported locales so UI can switch languages without refetching
  try {
    const categoriesStore = useCategoriesStore();
    await categoriesStore.fetchAllLocales(availableLocales.map((l) => l.code));
    console.info("Categories preloaded for locales:", availableLocales.map((l) => l.code).join(", "));
  } catch (error) {
    console.error("Failed to preload categories:", error);
  }

  // Register ErrorBoundary components globally
  app.component("ErrorBoundary", ErrorBoundary);
  app.component("EnhancedErrorBoundary", EnhancedErrorBoundary);

  // Make error logger globally available for plugins and external code
  if (typeof window !== "undefined") {
    (window as any).shopTrackErrorLogger = errorLogger;
  }

  app.mount("#app");
};

// Start the application
initializeApp().catch((error) => {
  console.error("Failed to initialize application:", error);
});
