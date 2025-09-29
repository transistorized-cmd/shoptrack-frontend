import { createApp } from "vue";
import { createPinia } from "pinia";
import "./assets/styles/main.css";
import "./styles/mobile-optimizations.css";
import App from "./App.vue";
import router from "./router";
// Conditional i18n import - use production-safe version in production
import i18n from "./i18n";
import { productionSafeI18n } from "./i18n/productionSafe";
import { initializePlugins } from "./plugins";
// CSRF token management removed - using pure cookie authentication
import ErrorBoundary from "./components/ErrorBoundary.vue";
import EnhancedErrorBoundary from "./components/EnhancedErrorBoundary.vue";
import { errorLogger } from "./services/errorLogging";
import { setupDIContainer } from "./core/di/setup";
import { setupGlobalAsyncErrorHandler } from "./composables/useAsyncErrorHandler";
import { useAuthStore } from "@/stores/auth";
import { useCategoriesStore } from "@/stores/categories";
import { useCsrfToken } from "@/composables/useCsrfToken";
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

  // Initialize CSRF protection first (required for authenticated requests)
  try {
    const { initializeCsrf } = useCsrfToken()
    await initializeCsrf()
    console.info("CSRF protection initialized")
  } catch (error: any) {
    // CSRF token initialization can fail if user is not authenticated
    // This is expected behavior for unauthenticated users
    console.info("CSRF token initialization deferred - will initialize after login")
  }

  const app = createApp(App);
  const pinia = createPinia();
  const setDevtools = (enabled: boolean) => {
    (app.config as typeof app.config & { devtools?: boolean }).devtools = enabled;
  };

  // Browser detection for Chrome-specific features
  const isChromeBrowser = (): boolean => {
    if (typeof window === "undefined" || !window.navigator) return false;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const vendor = window.navigator.vendor?.toLowerCase() || "";

    // Check for Chrome browser (including Edge Chromium but not Safari)
    const isChrome =
      vendor.includes("google") ||
      (userAgent.includes("chrome") && !userAgent.includes("safari")) ||
      userAgent.includes("crios"); // Chrome on iOS

    // Exclude browsers that might falsely report as Chrome
    const isNotSafari =
      !userAgent.includes("safari") || userAgent.includes("chrome");
    const isNotFirefox = !userAgent.includes("firefox");

    return isChrome && isNotSafari && isNotFirefox;
  };

  // Configure Vue DevTools based on environment and browser
  if (import.meta.env.PROD) {
    const isChrome = isChromeBrowser();

    if (isChrome) {
      // Enable DevTools for Chrome in production
      setDevtools(true);

      if (typeof window !== "undefined") {
        // Enable production DevTools for Chrome
        (window as any).__VUE_PROD_DEVTOOLS__ = true;

        // Ensure the DevTools hook is properly initialized for Chrome
        if (!(window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__) {
          (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__ = {
            enabled: true,
            events: new Map(),
            on(event: string, fn: Function) {
              if (!this.events.has(event)) {
                this.events.set(event, []);
              }
              this.events.get(event)?.push(fn);
            },
            off(event: string, fn: Function) {
              const fns = this.events.get(event);
              if (fns) {
                const index = fns.indexOf(fn);
                if (index > -1) {
                  fns.splice(index, 1);
                }
              }
            },
            emit(event: string, ...args: any[]) {
              const fns = this.events.get(event);
              if (fns) {
                fns.forEach((fn: Function) => fn(...args));
              }
            },
          };
        }

        console.info(
          "[App] Vue DevTools enabled in production for Chrome browser",
        );
      }
    } else {
      // Disable DevTools for non-Chrome browsers in production
      setDevtools(false);

      if (typeof window !== "undefined") {
        (window as any).__VUE_PROD_DEVTOOLS__ = false;
        console.info(
          "[App] Vue DevTools disabled in production for non-Chrome browser",
        );
      }
    }
  } else if (import.meta.env.DEV) {
    // Always enable DevTools in development
    setDevtools(true);
    console.info("[App] Vue DevTools enabled in development mode");
  }

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

  // Conditional i18n setup - use vue-i18n in development, production-safe in production
  try {
    if (import.meta.env.PROD) {
      // Production: Use CSP-safe implementation
      console.info("[i18n] Initializing production-safe i18n...");
      console.info(
        "[i18n] productionSafeI18n available:",
        !!productionSafeI18n,
      );
      console.info(
        "[i18n] productionSafeI18n.t available:",
        typeof productionSafeI18n.t,
      );
      console.info(
        "[i18n] Current locale:",
        productionSafeI18n.getCurrentLocale(),
      );

      // Test a translation to ensure it's working
      const testTranslation = productionSafeI18n.t("common.loading");
      console.info(
        "[i18n] Test translation (common.loading):",
        testTranslation,
      );

      app.config.globalProperties.$t =
        productionSafeI18n.t as typeof app.config.globalProperties.$t;
      app.provide("i18n", productionSafeI18n);
      console.info("[i18n] ✅ Production-safe i18n configured successfully");
    } else {
      // Development: Use full vue-i18n
      app.use(i18n);
      console.info("[i18n] ✅ Vue-i18n configured successfully");
    }
  } catch (error) {
    console.error("[i18n] ❌ Failed to configure i18n:", error);
    // Provide a fallback
    app.config.globalProperties.$t = (key: string) => key;
    app.provide("i18n", {
      t: (key: string) => key,
      getCurrentLocale: () => "en",
      setLocale: () => {},
      locale: "en",
    });
  }

  // Install Memory Monitoring Plugin
  // This will automatically initialize memory monitoring in production-ready mode
  app.use(memoryMonitoringPlugin, {
    autoStart: true,
    registerAllStores: true,
    showWidget: import.meta.env.MODE === "development",
  });

  // Initialize authentication after pinia and router are set up
  try {
    const authStore = useAuthStore();

    // Set up session expired callback to automatically redirect to login
    authStore.setOnSessionExpiredCallback(() => {
      console.info("Session expired - redirecting to login");
      router.push({
        path: "/login",
        query: { redirect: router.currentRoute.value.fullPath },
      });
    });

    await authStore.initialize();
    console.info("Authentication system initialized");
  } catch (error: any) {
    // Don't treat 401 errors as critical - they're expected when user is not logged in
    if (error?.response?.status === 401 || error?.status === 401) {
      console.info(
        "User not authenticated during app initialization - this is expected",
      );
    } else {
      console.error("Failed to initialize authentication system:", error);
      // Only show user notification for non-authentication errors
      if (shouldShowErrorNotification(error)) {
        showErrorToUser(error);
      }
    }
  }

  // Preload categories and settings only if user is authenticated
  try {
    const authStore = useAuthStore();
    if (authStore.isAuthenticated) {
      // Preload categories
      const categoriesStore = useCategoriesStore();
      await categoriesStore.fetchAllLocales(
        availableLocales.map((l) => l.code),
      );
      console.info(
        "Categories preloaded for locales:",
        availableLocales.map((l) => l.code).join(", "),
      );

      // Initialize user data (settings, language)
      await authStore.initializeUserData();
    } else {
      console.info(
        "Skipping categories and settings preload - user not authenticated",
      );
    }
  } catch (error) {
    console.error("Failed to preload categories and settings:", error);
  }

  // Register ErrorBoundary components globally
  app.component("ErrorBoundary", ErrorBoundary);
  app.component("EnhancedErrorBoundary", EnhancedErrorBoundary);

  // Make error logger globally available for plugins and external code
  if (typeof window !== "undefined") {
    (window as any).shopTrackErrorLogger = errorLogger;
  }

  // Mount the Vue application
  const appElement = document.getElementById("app");

  if (!appElement) {
    console.error("[Main] #app element not found! Cannot mount Vue app.");
    return;
  }

  try {
    app.mount("#app");
    console.info("[Main] Vue app mounted successfully");
  } catch (error) {
    console.error("[Main] Failed to mount Vue app:", error);
    // Create a fallback message
    appElement.innerHTML =
      '<div style="padding: 20px; color: red;">Failed to load application. Check console for details.</div>';
  }
};

// Application initialization

// Function to start the application when DOM is ready
const startApp = () => {
  initializeApp().catch((error) => {
    console.error("[Main] Failed to initialize application:", error);

    // Show error to user if app fails to initialize
    const appElement = document.getElementById("app");
    if (appElement) {
      appElement.innerHTML = `
        <div style="padding: 20px; background: #fee; border: 1px solid #f00; margin: 20px; border-radius: 8px;">
          <h2 style="color: #c00; margin: 0 0 10px 0;">Application Failed to Load</h2>
          <p style="margin: 0; color: #600;">An error occurred during application initialization. Please check the console for details.</p>
          <details style="margin-top: 10px;">
            <summary style="cursor: pointer; color: #600;">Technical Details</summary>
            <pre style="background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px; overflow: auto; font-size: 12px;">${error.toString()}</pre>
          </details>
        </div>
      `;
    }
  });
};

// Wait for DOM to be ready before starting the application
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApp);
} else {
  startApp();
}
