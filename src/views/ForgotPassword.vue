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
          {{ emailSent ? $t('auth.checkYourEmail') : $t('auth.forgotPasswordTitle') }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
          {{ emailSent 
            ? $t('auth.emailSentDescription')
            : $t('auth.forgotPasswordDescription')
          }}
        </p>
      </div>

      <!-- Success Message -->
      <div v-if="emailSent" class="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400 dark:text-green-300" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800 dark:text-green-200">
              {{ $t('auth.emailSentSuccessfully') }}
            </h3>
            <div class="mt-2 text-sm text-green-700 dark:text-green-300">
              <p>{{ $t('auth.emailSentDetails') }}</p>
              <p class="mt-2">{{ $t('auth.emailSentSpamCheck') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error && !emailSent" class="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
              {{ $t('auth.unableToSendResetEmail') }}
            </h3>
            <div class="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>{{ error }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form v-if="!emailSent" class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div>
          <label for="email-address" class="sr-only">{{ $t('auth.email') }}</label>
          <input
            id="email-address"
            v-model="email"
            name="email"
            type="email"
            autocomplete="username"
            required
            class="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-shoptrack-500 focus:border-shoptrack-500 dark:focus:ring-shoptrack-400 dark:focus:border-shoptrack-400 focus:z-10 sm:text-sm transition-colors"
            :placeholder="$t('auth.email')"
            :disabled="loading"
          />
        </div>

        <div>
          <button
            type="submit"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="loading || !email"
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
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </span>
            {{ loading ? $t('auth.sending') : $t('auth.sendResetLink') }}
          </button>
        </div>
      </form>

      <!-- Action buttons for success state -->
      <div v-if="emailSent" class="space-y-4">
        <button
          type="button"
          class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          :disabled="loading"
          @click="resendEmail"
        >
          {{ loading ? $t('auth.sending') : $t('auth.resendEmail') }}
        </button>
        
        <button
          type="button"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          @click="router.push('/login')"
        >
          {{ $t('auth.backToSignIn') }}
        </button>
      </div>

      <!-- Back to login link -->
      <div v-if="!emailSent" class="text-center">
        <router-link 
          to="/login" 
          class="font-medium text-blue-600 hover:text-blue-500"
        >
          ← {{ $t('auth.backToSignIn') }}
        </router-link>
      </div>

      <!-- Security Notice -->
      <div class="mt-8 text-center text-xs text-gray-500">
        <p>{{ $t('auth.securityNotice') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import ThemeToggle from '@/components/ThemeToggle.vue';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const loading = ref(false);
const emailSent = ref(false);

const error = computed(() => authStore.error?.message || null);

onMounted(() => {
  authStore.clearError();
});

async function handleSubmit() {
  if (!email.value) return;
  
  loading.value = true;
  
  const response = await authStore.forgotPassword({
    email: email.value,
  });
  
  if (response.success) {
    emailSent.value = true;
  }
  
  loading.value = false;
}

async function resendEmail() {
  if (!email.value) return;
  
  loading.value = true;
  
  await authStore.forgotPassword({
    email: email.value,
  });
  
  loading.value = false;
}

// Clear errors when email changes
watch(() => email.value, () => {
  authStore.clearError();
});
</script>

<style scoped>
/* Additional styles can be added here if needed */
</style>