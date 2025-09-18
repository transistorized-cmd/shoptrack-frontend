import { ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import type { OAuthLoginRequest, AuthResponse } from "@/types/auth";

export function useOAuth() {
  const authStore = useAuthStore();
  const loading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  // Google OAuth setup
  async function initializeGoogleOAuth(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window.google !== "undefined") {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load Google OAuth script"));
      document.head.appendChild(script);
    });
  }

  async function loginWithGoogle(): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      await initializeGoogleOAuth();

      return new Promise((resolve) => {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: async (response: { credential: string }) => {
            try {
              const authResponse = await authStore.loginWithOAuth({
                provider: "google",
                accessToken: response.credential,
                idToken: response.credential,
              });
              resolve(authResponse);
            } catch (err: any) {
              error.value = err.message || "Google login failed";
              resolve({
                success: false,
                message: error.value || "OAuth login failed",
                errors: [error.value || "OAuth login failed"],
              });
            } finally {
              loading.value = false;
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Try popup as fallback
            window.google.accounts.oauth2
              .initTokenClient({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                scope: "openid email profile",
                callback: async (response: { access_token: string }) => {
                  try {
                    const authResponse = await authStore.loginWithOAuth({
                      provider: "google",
                      accessToken: response.access_token,
                    });
                    resolve(authResponse);
                  } catch (err: any) {
                    error.value = err.message || "Google login failed";
                    resolve({
                      success: false,
                      message: error.value || "Google login failed",
                      errors: [error.value || "Google login failed"],
                    });
                  } finally {
                    loading.value = false;
                  }
                },
              })
              .requestAccessToken();
          }
        });
      });
    } catch (err: any) {
      error.value = err.message || "Failed to initialize Google OAuth";
      loading.value = false;
      return {
        success: false,
        message: error.value || "OAuth operation failed",
        errors: [error.value || "OAuth operation failed"],
      };
    }
  }

  // Apple OAuth (Sign in with Apple)
  async function loginWithApple(): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      // Check if Apple Sign In is available
      if (typeof window.AppleID === "undefined") {
        await loadAppleScript();
      }

      return new Promise((resolve) => {
        window.AppleID.auth.init({
          clientId: import.meta.env.VITE_APPLE_CLIENT_ID,
          scope: "name email",
          redirectURI: `${window.location.origin}/auth/apple/callback`,
          usePopup: true,
        });

        window.AppleID.auth.signIn().then(
          async (response: {
            authorization: {
              code: string;
              id_token: string;
            };
            user?: {
              name: {
                firstName: string;
                lastName: string;
              };
              email: string;
            };
          }) => {
            try {
              const authResponse = await authStore.loginWithOAuth({
                provider: "apple",
                accessToken: response.authorization.code,
                idToken: response.authorization.id_token,
              });
              resolve(authResponse);
            } catch (err: any) {
              error.value = err.message || "Apple login failed";
              resolve({
                success: false,
                message: error.value || "OAuth login failed",
                errors: [error.value || "OAuth login failed"],
              });
            } finally {
              loading.value = false;
            }
          },
          (error: any) => {
            console.error("Apple Sign In error:", error);
            const errorMessage =
              error.error === "popup_closed_by_user"
                ? "Sign in was cancelled"
                : "Apple Sign In failed";

            resolve({
              success: false,
              message: errorMessage,
              errors: [errorMessage],
            });
            loading.value = false;
          },
        );
      });
    } catch (err: any) {
      error.value = err.message || "Failed to initialize Apple Sign In";
      loading.value = false;
      return {
        success: false,
        message: error.value || "OAuth operation failed",
        errors: [error.value || "OAuth operation failed"],
      };
    }
  }

  async function loadAppleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load Apple Sign In script"));
      document.head.appendChild(script);
    });
  }

  // Microsoft OAuth (optional for future expansion)
  async function loginWithMicrosoft(): Promise<AuthResponse> {
    loading.value = true;
    clearError();

    try {
      // This would integrate with Microsoft Graph SDK
      // For now, return a not implemented response
      throw new Error("Microsoft OAuth not yet implemented");
    } catch (err: any) {
      error.value = err.message || "Microsoft login failed";
      loading.value = false;
      return {
        success: false,
        message: error.value || "OAuth operation failed",
        errors: [error.value || "OAuth operation failed"],
      };
    }
  }

  return {
    loading,
    error,
    loginWithGoogle,
    loginWithApple,
    loginWithMicrosoft,
    clearError,
  };
}

// Global type declarations for external libraries
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, options: any) => void;
          disableAutoSelect: () => void;
        };
        oauth2: {
          initTokenClient: (config: any) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
    AppleID: {
      auth: {
        init: (config: any) => void;
        signIn: () => Promise<any>;
      };
    };
  }
}
