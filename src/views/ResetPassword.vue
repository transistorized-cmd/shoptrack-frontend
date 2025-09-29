<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
    <!-- Theme Toggle -->
    <div class="absolute top-4 right-4 z-10">
      <ThemeToggle simple />
    </div>
    
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div>
        <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-shoptrack-100 dark:bg-shoptrack-800">
          <svg class="h-6 w-6 text-shoptrack-600 dark:text-shoptrack-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m0 0v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2m6 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2m6 0H9" />
          </svg>
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {{ passwordReset ? $t('auth.passwordUpdated') : $t('auth.resetPasswordTitle') }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
          {{ passwordReset 
            ? $t('auth.passwordUpdatedDescription')
            : $t('auth.resetPasswordDescription')
          }}
        </p>
      </div>

      <!-- Success Message -->
      <div v-if="passwordReset" class="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400 dark:text-green-300" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800 dark:text-green-200">
              {{ $t('auth.passwordResetSuccessful') }}
            </h3>
            <div class="mt-2 text-sm text-green-700 dark:text-green-300">
              <p>{{ $t('auth.passwordResetSuccessDetails') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error && !passwordReset" class="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
              {{ $t('auth.passwordResetFailed') }}
            </h3>
            <div class="mt-2 text-sm text-red-700 dark:text-red-300">
              <ul v-if="authStore.error?.details" class="list-disc list-inside space-y-1">
                <li v-for="(messages, field) in authStore.error.details" :key="field">
                  <span class="capitalize">{{ field }}</span>: {{ messages.join(', ') }}
                </li>
              </ul>
              <p v-else>{{ error }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Invalid Token Warning -->
      <div v-if="invalidToken" class="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-yellow-400 dark:text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {{ $t('auth.invalidOrExpiredLink') }}
            </h3>
            <div class="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
              <p>{{ $t('auth.invalidLinkDescription') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form v-if="!passwordReset && !invalidToken" class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div class="space-y-4">
          <!-- Password -->
          <div class="relative">
            <label for="password" class="sr-only">{{ $t('auth.newPassword') }}</label>
            <input
              id="password"
              v-model="form.password"
              name="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              required
              class="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-shoptrack-500 focus:border-shoptrack-500 dark:focus:ring-shoptrack-400 dark:focus:border-shoptrack-400 focus:z-10 sm:text-sm transition-colors"
              :class="{
                'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500': passwordError
              }"
              :placeholder="$t('auth.newPassword')"
              :disabled="loading"
              @input="validatePassword"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center"
              @click="showPassword = !showPassword"
            >
              <svg
                v-if="showPassword"
                class="h-5 w-5 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M9.878 9.878l4.242 4.242M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg
                v-else
                class="h-5 w-5 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>

          <!-- Password Strength Indicator -->
          <div v-if="form.password" class="space-y-2">
            <div class="flex items-center space-x-2">
              <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  class="h-2 rounded-full transition-all duration-300"
                  :class="passwordStrengthClass"
                  :style="{ width: passwordStrengthPercentage + '%' }"
                ></div>
              </div>
              <span class="text-xs text-gray-600 dark:text-gray-400">{{ passwordStrengthText }}</span>
            </div>
            <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li :class="{ 'text-green-600 dark:text-green-400': hasMinLength }">
                ✓ {{ $t('auth.passwordRequirements.atLeast8Characters') }}
              </li>
              <li :class="{ 'text-green-600 dark:text-green-400': hasUppercase }">
                ✓ {{ $t('auth.passwordRequirements.containsUppercase') }}
              </li>
              <li :class="{ 'text-green-600 dark:text-green-400': hasLowercase }">
                ✓ {{ $t('auth.passwordRequirements.containsLowercase') }}  
              </li>
              <li :class="{ 'text-green-600 dark:text-green-400': hasNumber }">
                ✓ {{ $t('auth.passwordRequirements.containsNumber') }}
              </li>
              <li :class="{ 'text-green-600 dark:text-green-400': hasSpecialChar }">
                ✓ {{ $t('auth.passwordRequirements.containsSpecialChar') }}
              </li>
            </ul>
          </div>

          <!-- Confirm Password -->
          <div class="relative">
            <label for="confirm-password" class="sr-only">{{ $t('auth.confirmNewPassword') }}</label>
            <input
              id="confirm-password"
              v-model="form.confirmPassword"
              name="confirm-password"
              :type="showConfirmPassword ? 'text' : 'password'"
              autocomplete="new-password"
              required
              class="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-shoptrack-500 focus:border-shoptrack-500 dark:focus:ring-shoptrack-400 dark:focus:border-shoptrack-400 focus:z-10 sm:text-sm transition-colors"
              :class="{
                'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500': confirmPasswordError,
                'border-green-300 dark:border-green-600 focus:ring-green-500 focus:border-green-500': form.confirmPassword && !confirmPasswordError
              }"
              :placeholder="$t('auth.confirmNewPassword')"
              :disabled="loading"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <svg
                v-if="showConfirmPassword"
                class="h-5 w-5 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M9.878 9.878l4.242 4.242M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg
                v-else
                class="h-5 w-5 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <p v-if="confirmPasswordError" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ confirmPasswordError }}</p>
          </div>
        </div>

        <div>
          <button
            type="submit"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-shoptrack-600 hover:bg-shoptrack-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-shoptrack-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
            :disabled="loading || !isFormValid"
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
                class="h-5 w-5 text-shoptrack-500 group-hover:text-shoptrack-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2z" clip-rule="evenodd" />
              </svg>
            </span>
            {{ loading ? $t('auth.updatingPassword') : $t('auth.updatePassword') }}
          </button>
        </div>
      </form>

      <!-- Action buttons for success/error states -->
      <div v-if="passwordReset || invalidToken" class="space-y-4">
        <button
          type="button"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-shoptrack-600 hover:bg-shoptrack-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-shoptrack-500 transition-colors duration-300"
          @click="router.push('/login')"
        >
          {{ passwordReset ? $t('auth.continueToSignIn') : $t('auth.backToSignIn') }}
        </button>
        
        <button
          v-if="invalidToken"
          type="button"
          class="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-shoptrack-500 transition-colors duration-300"
          @click="router.push('/forgot-password')"
        >
          {{ $t('auth.requestNewLink') }}
        </button>
      </div>

      <!-- Back to login link -->
      <div v-if="!passwordReset && !invalidToken" class="text-center">
        <router-link 
          to="/login" 
          class="font-medium text-shoptrack-600 dark:text-shoptrack-400 hover:text-shoptrack-500 dark:hover:text-shoptrack-300 transition-colors duration-300"
        >
          ← {{ $t('auth.backToSignIn') }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTranslation } from '@/composables/useTranslation';
import { useAuthStore } from '@/stores/auth';
import ThemeToggle from '@/components/ThemeToggle.vue';
import type { ResetPasswordRequest } from '@/types/auth';

const router = useRouter();
const route = useRoute();
const { t } = useTranslation();
const authStore = useAuthStore();

const showPassword = ref(false);
const showConfirmPassword = ref(false);
const loading = ref(false);
const passwordReset = ref(false);
const invalidToken = ref(false);

const form = reactive<ResetPasswordRequest>({
  email: '',
  token: '',
  password: '',
  confirmPassword: '',
});

// Extract token and email from URL parameters
onMounted(() => {
  const token = route.query.token as string;
  const email = route.query.email as string;
  
  if (!token || !email) {
    invalidToken.value = true;
    return;
  }
  
  form.token = token;
  form.email = email;
});

// Validation computed properties
const hasMinLength = computed(() => form.password.length >= 8);
const hasUppercase = computed(() => /[A-Z]/.test(form.password));
const hasLowercase = computed(() => /[a-z]/.test(form.password));
const hasNumber = computed(() => /\d/.test(form.password));
const hasSpecialChar = computed(() => /[!@#$%^&*(),.?":{}|<>]/.test(form.password));

const passwordStrength = computed(() => {
  const checks = [
    hasMinLength.value,
    hasUppercase.value,
    hasLowercase.value,
    hasNumber.value,
    hasSpecialChar.value,
  ];
  return checks.filter(Boolean).length;
});

const passwordStrengthPercentage = computed(() => (passwordStrength.value / 5) * 100);

const passwordStrengthText = computed(() => {
  const strength = passwordStrength.value;
  if (strength === 0) return t('auth.passwordStrength.veryWeak');
  if (strength === 1) return t('auth.passwordStrength.weak');
  if (strength === 2) return t('auth.passwordStrength.fair');
  if (strength === 3) return t('auth.passwordStrength.good');
  if (strength === 4) return t('auth.passwordStrength.strong');
  return t('auth.passwordStrength.veryStrong');
});

const passwordStrengthClass = computed(() => {
  const strength = passwordStrength.value;
  if (strength <= 1) return 'bg-red-500';
  if (strength === 2) return 'bg-yellow-500';
  if (strength === 3) return 'bg-blue-500';
  if (strength >= 4) return 'bg-green-500';
  return 'bg-gray-300';
});

const passwordError = computed(() => {
  if (!form.password) return '';
  return passwordStrength.value >= 3 ? '' : 'Password must meet minimum requirements';
});

const confirmPasswordError = computed(() => {
  if (!form.confirmPassword) return '';
  return form.password === form.confirmPassword ? '' : 'Passwords do not match';
});

const isFormValid = computed(() => {
  return (
    form.password &&
    !passwordError.value &&
    form.confirmPassword &&
    !confirmPasswordError.value &&
    form.token &&
    form.email
  );
});

const error = computed(() => authStore.error?.message || null);

function validatePassword() {
  // This function is called on input to trigger reactivity
}

async function handleSubmit() {
  if (!isFormValid.value) return;
  
  loading.value = true;
  
  const response = await authStore.resetPassword(form);
  
  if (response.success) {
    passwordReset.value = true;
  } else if (response.message?.includes('invalid') || response.message?.includes('expired')) {
    invalidToken.value = true;
  }
  
  loading.value = false;
}

// Clear errors when form changes
watch([() => form.password, () => form.confirmPassword], () => {
  authStore.clearError();
});
</script>

<style scoped>
/* Additional styles can be added here if needed */
</style>
