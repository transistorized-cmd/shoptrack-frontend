<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 py-6 px-4 sm:py-12 sm:px-6 lg:px-8 transition-colors duration-300">
    <!-- Theme Toggle -->
    <div class="absolute top-4 right-4 z-10">
      <ThemeToggle simple />
    </div>

    <div class="max-w-md w-full space-y-6 sm:space-y-8">
      <!-- Header -->
      <div>
        <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-shoptrack-100 dark:bg-shoptrack-800">
          <svg class="h-6 w-6 text-shoptrack-600 dark:text-shoptrack-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 class="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
          {{ t('auth.signIn') }}
        </h2>
        <p class="mt-2 text-center text-sm sm:text-base text-gray-600 dark:text-gray-300">
          {{ t('common.or') }}
          <router-link to="/register" class="font-medium text-shoptrack-600 hover:text-shoptrack-500 dark:text-shoptrack-400 dark:hover:text-shoptrack-300">
            {{ t('auth.createAccount') }}
          </router-link>
        </p>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
              {{ t('common.error') }}
            </h3>
            <div class="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>{{ translatedError }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Session Expired Notice -->
      <div v-if="authStore.sessionExpired" class="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-yellow-400 dark:text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-yellow-700 dark:text-yellow-300">
              {{ t('auth.sessionExpired') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Login Form - Stable DOM structure for password managers -->
      <form
        id="login-form"
        class="mt-6 sm:mt-8 space-y-6"
        method="post"
        action="/login"
        @submit="handleFormSubmission"
        novalidate
      >
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="email" class="sr-only">{{ t('auth.email') }}</label>
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="username"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-3 sm:px-4 sm:py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-t-md focus:outline-none focus:ring-shoptrack-500 focus:border-shoptrack-500 dark:focus:ring-shoptrack-400 dark:focus:border-shoptrack-400 focus:z-10 text-base sm:text-sm transition-colors"
              :placeholder="t('auth.email')"
              :disabled="loading"
            />
          </div>
          <div class="relative">
            <label for="password" class="sr-only">{{ t('auth.password') }}</label>
            <input
              id="password"
              name="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-3 pr-12 sm:px-4 sm:py-2 sm:pr-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-b-md focus:outline-none focus:ring-shoptrack-500 focus:border-shoptrack-500 dark:focus:ring-shoptrack-400 dark:focus:border-shoptrack-400 focus:z-10 text-base sm:text-sm transition-colors"
              :placeholder="t('auth.password')"
              :disabled="loading"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 sm:pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              @click="showPassword = !showPassword"
            >
              <svg
                v-if="showPassword"
                class="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M9.878 9.878l4.242 4.242M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg
                v-else
                class="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:items-center sm:justify-between">
          <div class="flex items-center">
            <input
              id="remember-me"
              name="remember"
              type="checkbox"
              class="h-4 w-4 text-shoptrack-600 focus:ring-shoptrack-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded transition-colors"
            />
            <label for="remember-me" class="ml-2 block text-sm sm:text-sm text-gray-900 dark:text-gray-100">
              {{ t('auth.rememberMe') }}
            </label>
          </div>

          <div class="text-sm text-center sm:text-right">
            <router-link to="/forgot-password" class="font-medium text-shoptrack-600 hover:text-shoptrack-500 dark:text-shoptrack-400 dark:hover:text-shoptrack-300">
              {{ t('auth.forgotPassword') }}
            </router-link>
          </div>
        </div>

        <div>
          <button
            type="submit"
            class="group relative w-full flex justify-center py-3 px-4 sm:py-2 border border-transparent text-base sm:text-sm font-medium rounded-md text-white bg-shoptrack-600 hover:bg-shoptrack-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-shoptrack-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            :disabled="loading"
          >
            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg
                v-if="loading"
                class="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg
                v-else
                class="h-5 w-5 text-blue-500 group-hover:text-blue-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2z" clip-rule="evenodd" />
              </svg>
            </span>
            {{ loading ? t('auth.signingIn') : t('auth.signIn') }}
          </button>
        </div>

        <!-- Divider -->
        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400">{{ t('auth.continueWith') }}</span>
            </div>
          </div>

          <!-- OAuth Buttons -->
          <div class="mt-6 space-y-3">
            <!-- Passkey Login (Priority) -->
            <!-- Passkey Login Button -->
            <button
              v-if="webauthn.isSupported"
              type="button"
              class="w-full inline-flex justify-center items-center py-3 px-4 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-base sm:text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 transition-colors"
              :disabled="isPasskeyDisabled"
              @click="handlePasskeyLogin"
            >
              <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 10v2h2v-2H6zm0 4v2h2v-2H6zm4-4v2h2v-2h-2zm0 4v2h2v-2h-2zm4-4v2h2v-2h-2zm0 4v2h2v-2h-2zm2-10V2H4v2h12zm0 2H4v12h12V6zM2 2v20h20V2H2z"/>
              </svg>
              {{ webauthn.loading.value ? t('auth.authenticating') : t('auth.signInWithPasskey') }}
            </button>

            <!-- TODO: Implement Google and Apple OAuth login
                 Requirements:
                 - Google: Google Cloud Console setup, OAuth 2.0 credentials, redirect URIs
                 - Apple: Apple Developer Account ($99/year), Service ID, private key (.p8)
                 - Backend: OAuth middleware configuration, callback endpoints
                 - Frontend: OAuth libraries, redirect handling
            -->
          </div>
        </div>
      </form>

      <!-- Security Notice -->
      <div class="mt-4 text-center text-xs sm:text-xs text-gray-500 dark:text-gray-400 px-2">
        <p class="leading-relaxed">
          {{ t('auth.iAgreeToThe') }}
          <a href="/terms" class="text-shoptrack-600 dark:text-shoptrack-400 hover:text-shoptrack-500 dark:hover:text-shoptrack-300 transition-colors underline">{{ t('auth.termsOfService') }}</a>
          {{ t('auth.and') }}
          <a href="/privacy" class="text-shoptrack-600 dark:text-shoptrack-400 hover:text-shoptrack-500 dark:hover:text-shoptrack-300 transition-colors underline">{{ t('auth.privacyPolicy') }}</a>
        </p>
        <p class="mt-2 leading-relaxed">
          {{ t('auth.securityNoticeRegistration') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useWebAuthn } from '@/composables/useWebAuthn';
import { useOAuth } from '@/composables/useOAuth';
import { useTranslation } from '@/composables/useTranslation';
import { translateError } from '@/utils/errorTranslation';
import ThemeToggle from '@/components/ThemeToggle.vue';
import type { LoginRequest } from '@/types/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const webauthn = useWebAuthn();
const oauth = useOAuth();
const { t } = useTranslation();

const showPassword = ref(false);
const loading = ref(false);
const formRef = ref<HTMLFormElement>();
const submitInProgress = ref(false);

// Clear any existing errors immediately
authStore.clearError();
oauth.clearError();
webauthn.clearError();

const error = computed(() => {
  return authStore.error?.message || 
         oauth.error.value || 
         webauthn.error.value || 
         null;
});

const translatedError = computed(() => {
  if (!error.value) return null;
  return translateError(error.value);
});

// Computed property for passkey button disabled state
const isPasskeyDisabled = computed(() => {
  return loading.value || webauthn.loading.value;
});

// Enhanced form submission handling for password manager compatibility
async function handleFormSubmission(event: Event) {
  event.preventDefault();
  
  if (submitInProgress.value) return;
  submitInProgress.value = true;
  
  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const remember = formData.get('remember') === 'on';
  
  if (!email || !password) {
    submitInProgress.value = false;
    return;
  }
  
  loading.value = true;
  
  try {
    // Critical: Allow password managers to detect form submission attempt
    // Brief delay to let password managers register the form submission event
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const response = await authStore.login({ 
      email, 
      password, 
      rememberMe: remember 
    });
    
    if (response.success) {
      // Success signal for password managers - they need time to detect successful authentication
      await handleLoginSuccess(email, password);
      
      // Navigate after password manager detection
      const redirect = route.query.redirect as string;
      if (redirect && redirect.startsWith('/')) {
        await router.push(redirect);
      } else {
        await router.push('/');
      }
    } else {
      // Show error but don't clear form immediately - let password managers see the failure
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (err) {
    console.error('Login failed:', err);
  } finally {
    loading.value = false;
    submitInProgress.value = false;
  }
}

// Handle successful login with CSP-safe password manager integration
async function handleLoginSuccess(email: string, password: string) {
  // 1. Use form-based credential storage instead of PasswordCredential API
  // This approach is CSP-safe and works with most password managers
  try {
    // Create a hidden form element to signal password managers
    const form = document.createElement('form');
    form.style.display = 'none';
    form.method = 'post';
    form.action = '/login';

    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.name = 'email';
    emailInput.value = email;
    emailInput.autocomplete = 'username';

    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.name = 'password';
    passwordInput.value = password;
    passwordInput.autocomplete = 'current-password';

    form.appendChild(emailInput);
    form.appendChild(passwordInput);
    document.body.appendChild(form);

    // Signal successful authentication to password managers
    // Most password managers detect this pattern
    await new Promise(resolve => setTimeout(resolve, 50));

    // Clean up the form
    document.body.removeChild(form);
  } catch (error) {
    console.debug('Password manager integration failed:', error);
  }

  // 2. Critical timing for password manager detection
  // Password managers look for successful authentication signals
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Handle OAuth/Passkey login (keep as AJAX)
async function handleAjaxLogin(email: string, password: string, rememberMe: boolean) {
  loading.value = true;
  
  const response = await authStore.login({ email, password, rememberMe });
  
  if (response.success) {
    const redirect = route.query.redirect as string;
    if (redirect && redirect.startsWith('/')) {
      await router.push(redirect);
    } else {
      await router.push('/');
    }
  }
  
  loading.value = false;
  return response;
}

// Handle Passkey login
async function handlePasskeyLogin() {
  try {
    const passkeyRequest = await webauthn.loginWithPasskey();
    if (!passkeyRequest) return;
    
    const response = await authStore.loginWithPasskey(passkeyRequest);
    
    if (response.success) {
      const redirect = route.query.redirect as string;
      if (redirect && redirect.startsWith('/')) {
        await router.push(redirect);
      } else {
        await router.push('/');
      }
    }
  } finally {
    // Ensure webauthn loading state is reset
    webauthn.resetState();
  }
}

// Handle Google OAuth
async function handleGoogleLogin() {
  const response = await oauth.loginWithGoogle();
  
  if (response.success) {
    const redirect = route.query.redirect as string;
    if (redirect && redirect.startsWith('/')) {
      await router.push(redirect);
    } else {
      await router.push('/');
    }
  }
}

// Handle Apple OAuth
async function handleAppleLogin() {
  const response = await oauth.loginWithApple();
  
  if (response.success) {
    const redirect = route.query.redirect as string;
    if (redirect && redirect.startsWith('/')) {
      await router.push(redirect);
    } else {
      await router.push('/');
    }
  }
}

// Initialize password manager compatibility
onMounted(() => {
  authStore.clearError();
  oauth.clearError();
  webauthn.clearError();
  webauthn.resetState(); // Ensure loading state is false
  
  // Check for error from form submission
  if (route.query.error) {
    authStore.setError({
      code: 'FORM_LOGIN_ERROR',
      message: route.query.error as string
    });
  }
  
  // If user is already authenticated, redirect them
  if (authStore.isAuthenticated) {
    const redirect = route.query.redirect as string;
    if (redirect && redirect.startsWith('/')) {
      router.push(redirect);
    } else {
      router.push('/');
    }
  }
  
  // Ensure form is detectable by password managers
  initializePasswordManagerSupport();
});

// Initialize password manager support
function initializePasswordManagerSupport() {
  nextTick(() => {
    const form = document.getElementById('login-form');
    if (form) {
      // Trigger DOM mutation event for password managers that use MutationObserver
      const event = new Event('DOMContentLoaded', { bubbles: true });
      document.dispatchEvent(event);
      
      // Add form to global window object for password manager detection
      (window as any).__loginForm = form;
    }
  });
}
</script>

<style scoped>
/* Additional styles can be added here if needed */
</style>