<template>
  <EnhancedErrorBoundary 
    fallback="Demo component encountered an error"
    :show-error-details="true"
    :capture-async="true"
  >
    <div class="p-6 max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold mb-6">Async Error Handling Demo</h2>
      
      <div class="space-y-4">
        <!-- Loading state -->
        <div v-if="isLoading" class="text-blue-600">
          Loading data...
        </div>
        
        <!-- Error state -->
        <div v-else-if="hasError" class="bg-red-50 border border-red-200 rounded p-4">
          <p class="text-red-800">{{ errorMessage }}</p>
          <button 
            @click="clearError" 
            class="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm"
          >
            Clear Error
          </button>
        </div>
        
        <!-- Success state -->
        <div v-else class="bg-green-50 border border-green-200 rounded p-4">
          <p class="text-green-800">Data loaded successfully!</p>
        </div>
        
        <!-- Demo buttons -->
        <div class="space-x-2">
          <button 
            @click="triggerSyncError" 
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Trigger Sync Error
          </button>
          
          <button 
            @click="triggerAsyncError" 
            class="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Trigger Async Error
          </button>
          
          <button 
            @click="triggerNetworkError" 
            class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Trigger Network Error
          </button>
          
          <button 
            @click="loadDataSafely" 
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Load Data Safely
          </button>
        </div>
        
        <!-- Information section -->
        <div class="bg-blue-50 border border-blue-200 rounded p-4 text-sm">
          <h3 class="font-semibold mb-2">Error Handling Features:</h3>
          <ul class="list-disc list-inside space-y-1 text-blue-800">
            <li>Sync errors are caught by Vue's ErrorBoundary</li>
            <li>Async errors are caught by custom async handler</li>
            <li>Network errors show user-friendly messages</li>
            <li>Automatic retry with exponential backoff</li>
            <li>Global error logging and reporting</li>
          </ul>
        </div>
      </div>
    </div>
  </EnhancedErrorBoundary>
</template>

<script setup lang="ts">
import { useAsyncErrorHandler, useAsyncLifecycle } from '@/composables/useAsyncErrorHandler';

// Using the enhanced async lifecycle hooks
const { onMountedAsync, isLoading, hasError, errorMessage, clearError } = useAsyncLifecycle();

// Using the async error handler for manual operations
const asyncHandler = useAsyncErrorHandler({
  showNotification: true,
  logError: true,
  retryCount: 2,
  context: 'Demo Component'
});

// Safe async loading on mount
onMountedAsync(async () => {
  // Simulate loading data
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('Component loaded successfully');
});

// Demo functions to trigger different types of errors
const triggerSyncError = () => {
  // This will be caught by Vue's ErrorBoundary
  throw new Error('This is a synchronous error for testing');
};

const triggerAsyncError = async () => {
  // This will be caught by our async error handler
  await asyncHandler.executeAsync(async () => {
    throw new Error('This is an async error for testing');
  });
};

const triggerNetworkError = async () => {
  // Simulate a network error
  await asyncHandler.executeAsync(async () => {
    const response = await fetch('https://nonexistent-api.example.com/data');
    if (!response.ok) {
      throw new Error('Network request failed');
    }
    return response.json();
  });
};

const loadDataSafely = async () => {
  // Example of safe data loading with fallback
  const data = await asyncHandler.executeAsync(
    async () => {
      // Simulate successful API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { message: 'Data loaded successfully!' };
    },
    { message: 'Using fallback data' } // Fallback value
  );
  
  console.log('Loaded data:', data);
};
</script>