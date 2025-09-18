<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div>
        <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full" 
             :class="emailVerified ? 'bg-green-100' : 'bg-blue-100'">
          <!-- Success checkmark -->
          <svg v-if="emailVerified" class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <!-- Loading spinner -->
          <svg v-else-if="loading" class="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <!-- Email icon -->
          <svg v-else class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {{ getTitle() }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          {{ getMessage() }}
        </p>
      </div>

      <!-- Success Message -->
      <div v-if="emailVerified" class="rounded-md bg-green-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800">
              Email verified successfully
            </h3>
            <div class="mt-2 text-sm text-green-700">
              <p>Your email has been confirmed. You can now access all features of your account.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading Message -->
      <div v-if="loading" class="rounded-md bg-blue-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="animate-spin h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-blue-800">
              Verifying your email...
            </h3>
            <div class="mt-2 text-sm text-blue-700">
              <p>Please wait while we confirm your email address.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="rounded-md bg-red-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">
              Verification failed
            </h3>
            <div class="mt-2 text-sm text-red-700">
              <p>{{ error }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-3">
        <!-- Continue to Dashboard (if verified) -->
        <router-link 
          v-if="emailVerified"
          to="/" 
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
        >
          Continue to App
        </router-link>

        <!-- Back to Login (if failed) -->
        <router-link 
          v-else-if="error && !loading"
          to="/login" 
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Back to Login
        </router-link>

        <!-- Resend Verification (if failed) -->
        <button 
          v-if="error && !loading"
          @click="resendVerification"
          :disabled="resendLoading"
          class="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="resendLoading" class="mr-2">
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
          Resend Verification Email
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

// Reactive state
const loading = ref(false)
const emailVerified = ref(false)
const error = ref('')
const resendLoading = ref(false)

// Computed methods for dynamic content
function getTitle() {
  if (loading.value) return 'Verifying email...'
  if (emailVerified.value) return 'Email verified!'
  if (error.value) return 'Verification failed'
  return 'Email verification'
}

function getMessage() {
  if (loading.value) return 'Please wait while we verify your email address.'
  if (emailVerified.value) return 'Your email has been successfully verified. Welcome to ShopTrack!'
  if (error.value) return 'We were unable to verify your email address. The link may have expired or been used already.'
  return 'Processing your email verification request.'
}

// Verify email on component mount
onMounted(async () => {
  const token = route.query.token as string
  const email = route.query.email as string

  if (!token || !email) {
    error.value = 'Invalid verification link. Please check your email for the correct link.'
    return
  }

  loading.value = true
  
  try {
    const response = await authService.confirmEmail(token, email)
    
    if (response.success) {
      emailVerified.value = true
      // Refresh the user data in the auth store to update email confirmed status
      await authStore.initialize()
    } else {
      error.value = response.message || 'Email verification failed. Please try again.'
    }
  } catch (err: any) {
    console.error('Email verification error:', err)
    
    // Handle specific error types
    if (err.response?.status === 400) {
      error.value = 'Invalid or expired verification link. Please request a new verification email.'
    } else if (err.response?.status === 404) {
      error.value = 'User not found. Please check that you are using the correct email address.'
    } else {
      error.value = 'Unable to verify email. Please check your internet connection and try again.'
    }
  } finally {
    loading.value = false
  }
})

// Resend verification email
async function resendVerification() {
  resendLoading.value = true
  
  try {
    const response = await authService.resendEmailConfirmation()
    
    if (response.success) {
      alert('Verification email sent! Please check your inbox.')
    } else {
      alert('Failed to send verification email. Please try again.')
    }
  } catch (err) {
    console.error('Failed to resend verification:', err)
    alert('Failed to send verification email. Please try again.')
  } finally {
    resendLoading.value = false
  }
}
</script>