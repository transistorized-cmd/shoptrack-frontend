import { ref, computed, onMounted } from "vue";
import type {
  PublicKeyCredentialCreationOptions,
  PublicKeyCredentialRequestOptions,
  PasskeyLoginRequest,
  PasskeyRegistrationRequest,
} from "@/types/auth";
import { authService } from "@/services/auth.service";

export function useWebAuthn() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isSupported = ref(false);

  // Immediately check WebAuthn support
  const supported = !!(
    window.navigator &&
    window.navigator.credentials &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === "function"
  );

  isSupported.value = supported;

  // Check WebAuthn support after component is mounted
  onMounted(() => {
    const supported = !!(
      window.navigator &&
      window.navigator.credentials &&
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential === "function"
    );

    isSupported.value = supported;

    // Ensure loading state is properly reset
    loading.value = false;
  });

  const isPlatformAuthenticatorAvailable = ref<boolean | null>(null);

  // Check platform authenticator availability on initialization
  if (isSupported.value) {
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then((available) => {
        isPlatformAuthenticatorAvailable.value = available;
      })
      .catch(() => {
        isPlatformAuthenticatorAvailable.value = false;
      });
  }

  function clearError() {
    error.value = null;
  }

  function resetState() {
    loading.value = false;
    error.value = null;
  }

  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async function registerPasskey(): Promise<PasskeyRegistrationRequest | null> {
    if (!isSupported.value) {
      error.value = "WebAuthn is not supported by this browser";
      return null;
    }

    loading.value = true;
    clearError();

    try {
      // Get creation options from server
      const options = await authService.getPasskeyCreationOptions();

      // Convert base64 strings to ArrayBuffers
      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        ...options,
        challenge: base64ToArrayBuffer(options.challenge),
        user: {
          ...options.user,
          id: new TextEncoder().encode(options.user.id),
        },
        excludeCredentials: options.excludeCredentials?.map((cred) => ({
          ...cred,
          id: base64ToArrayBuffer(cred.id),
        })),
      };

      // Create credential
      const credential = (await navigator.credentials.create({
        publicKey: publicKeyOptions,
      })) as PublicKeyCredential | null;

      if (!credential) {
        error.value = "Failed to create credential";
        return null;
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const clientDataJSON = arrayBufferToBase64(response.clientDataJSON);
      const authenticatorData = arrayBufferToBase64(response.authenticatorData);
      const publicKey = arrayBufferToBase64(response.getPublicKey()!);
      const attestationObject = arrayBufferToBase64(response.attestationObject);

      return {
        credentialId: arrayBufferToBase64(credential.rawId),
        publicKey,
        authenticatorData,
        clientDataJSON,
        attestationObject,
      };
    } catch (err: any) {
      console.error("Passkey registration failed:", err);

      if (err.name === "NotAllowedError") {
        error.value = "Passkey registration was cancelled or not allowed";
      } else if (err.name === "InvalidStateError") {
        error.value =
          "A passkey for this account already exists on this device";
      } else if (err.name === "NotSupportedError") {
        error.value = "Passkeys are not supported on this device";
      } else {
        error.value = err.message || "Failed to register passkey";
      }

      return null;
    } finally {
      loading.value = false;
    }
  }

  async function loginWithPasskey(): Promise<PasskeyLoginRequest | null> {
    if (!isSupported.value) {
      error.value = "WebAuthn is not supported by this browser";
      return null;
    }

    loading.value = true;
    clearError();

    try {
      // Get request options from server
      const options = await authService.getPasskeyRequestOptions();

      // Convert base64 strings to ArrayBuffers
      const publicKeyOptions: PublicKeyCredentialRequestOptionsInit = {
        ...options,
        challenge: base64ToArrayBuffer(options.challenge),
        allowCredentials: options.allowCredentials?.map((cred) => ({
          ...cred,
          id: base64ToArrayBuffer(cred.id),
        })),
      };

      // Get credential
      const credential = (await navigator.credentials.get({
        publicKey: publicKeyOptions,
      })) as PublicKeyCredential | null;

      if (!credential) {
        error.value = "Failed to get credential";
        return null;
      }

      const response = credential.response as AuthenticatorAssertionResponse;
      const clientDataJSON = arrayBufferToBase64(response.clientDataJSON);
      const authenticatorData = arrayBufferToBase64(response.authenticatorData);
      const signature = arrayBufferToBase64(response.signature);

      return {
        credentialId: arrayBufferToBase64(credential.rawId),
        authenticatorData,
        clientDataJSON,
        signature,
      };
    } catch (err: any) {
      console.error("Passkey login failed:", err);

      if (err.name === "NotAllowedError") {
        error.value = "Passkey authentication was cancelled or not allowed";
      } else if (err.name === "InvalidStateError") {
        error.value = "No passkey found for this account on this device";
      } else if (err.name === "NotSupportedError") {
        error.value = "Passkeys are not supported on this device";
      } else {
        error.value = err.message || "Failed to authenticate with passkey";
      }

      return null;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    isSupported,
    isPlatformAuthenticatorAvailable,
    registerPasskey,
    loginWithPasskey,
    clearError,
    resetState,
  };
}
