<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full text-center space-y-8">
      <!-- 404 Illustration -->
      <div class="mx-auto h-32 w-32 flex items-center justify-center rounded-full bg-red-100">
        <svg class="h-16 w-16 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>

      <!-- Error Message -->
      <div>
        <h1 class="text-9xl font-extrabold text-gray-900 tracking-widest">404</h1>
        <div class="bg-blue-600 px-2 text-sm rounded rotate-12 absolute">
          Page Not Found
        </div>
      </div>

      <div class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900">
          Oops! This page doesn't exist
        </h2>
        <p class="text-gray-600">
          The page you're looking for might have been removed, renamed, or is temporarily unavailable.
        </p>
      </div>

      <!-- Unauthorized Access Message -->
      <div v-if="isUnauthorizedAccess" class="rounded-md bg-yellow-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-yellow-800">
              Access Denied
            </h3>
            <div class="mt-2 text-sm text-yellow-700">
              <p>You don't have permission to access this resource, or it might belong to another user.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
        <button
          class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          @click="goHome"
        >
          <svg class="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Go to Dashboard
        </button>
        
        <button
          class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          @click="goBack"
        >
          <svg class="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Go Back
        </button>
      </div>

      <!-- Quick Links -->
      <div v-if="authStore.isAuthenticated" class="pt-8 border-t border-gray-200">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Quick Links</h3>
        <div class="grid grid-cols-2 gap-4">
          <router-link
            to="/receipts"
            class="flex items-center p-3 rounded-lg bg-white shadow hover:shadow-md transition-shadow duration-200 text-gray-700 hover:text-blue-600"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="text-sm">Receipts</span>
          </router-link>
          
          <router-link
            to="/upload"
            class="flex items-center p-3 rounded-lg bg-white shadow hover:shadow-md transition-shadow duration-200 text-gray-700 hover:text-blue-600"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span class="text-sm">Upload</span>
          </router-link>
          
          <router-link
            to="/reports"
            class="flex items-center p-3 rounded-lg bg-white shadow hover:shadow-md transition-shadow duration-200 text-gray-700 hover:text-blue-600"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span class="text-sm">Reports</span>
          </router-link>
          
          <router-link
            to="/profile"
            class="flex items-center p-3 rounded-lg bg-white shadow hover:shadow-md transition-shadow duration-200 text-gray-700 hover:text-blue-600"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span class="text-sm">Profile</span>
          </router-link>
        </div>
      </div>

      <!-- Contact Support -->
      <div class="pt-4 text-sm text-gray-500">
        <p>
          Still having trouble?
          <a href="mailto:support@shoptrack.example.com" class="text-blue-600 hover:text-blue-500 underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// Check if this might be an unauthorized access attempt
const isUnauthorizedAccess = computed(() => {
  const path = route.path;
  return (
    authStore.isAuthenticated && 
    (path.includes('/receipts/') || path.includes('/reports/') || path.includes('/analytics/'))
  );
});

function goHome() {
  if (authStore.isAuthenticated) {
    router.push('/');
  } else {
    router.push('/login');
  }
}

function goBack() {
  // Check if there's history to go back to
  if (window.history.length > 1) {
    router.go(-1);
  } else {
    goHome();
  }
}
</script>

<style scoped>
/* Custom styles for the 404 page */
.rotate-12 {
  transform: rotate(12deg);
}
</style>