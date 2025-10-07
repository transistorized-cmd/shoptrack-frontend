<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
    <div class="max-w-md mx-auto">
      <!-- Loading State -->
      <div v-if="loading" class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-shoptrack-600 dark:border-shoptrack-400 mb-4"></div>
        <p class="text-gray-600 dark:text-gray-300">{{ $t('subscription.success.processing', 'Processing your subscription...') }}</p>
      </div>

      <!-- Success State -->
      <div v-else-if="success" class="card rounded-xl p-8 text-center">
        <svg class="h-16 w-16 text-green-500 dark:text-green-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {{ $t('subscription.success.title', 'Subscription Successful!') }}
        </h2>
        <p class="text-gray-600 dark:text-gray-300 mb-6">
          {{ $t('subscription.success.message', 'Your subscription has been activated successfully. You can now enjoy all the premium features!') }}
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <router-link
            to="/receipts"
            class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-shoptrack-600 hover:bg-shoptrack-700 dark:bg-shoptrack-700 dark:hover:bg-shoptrack-800 transition-colors"
          >
            {{ $t('subscription.success.goToReceipts', 'Go to Receipts') }}
          </router-link>
          <router-link
            to="/subscription"
            class="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {{ $t('subscription.success.viewSubscription', 'View Subscription') }}
          </router-link>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="card rounded-xl p-8 text-center border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <svg class="h-16 w-16 text-red-400 dark:text-red-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h2 class="text-2xl font-bold text-red-700 dark:text-red-300 mb-4">
          {{ $t('subscription.error.title', 'Subscription Error') }}
        </h2>
        <p class="text-red-600 dark:text-red-400 mb-6">{{ error }}</p>
        <router-link
          to="/subscription"
          class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 transition-colors"
        >
          {{ $t('subscription.error.tryAgain', 'Try Again') }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useTranslation } from '@/composables/useTranslation';
import { subscriptionService } from '@/services/subscription.service';

const route = useRoute();
const { t } = useTranslation();

const loading = ref(true);
const success = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    // Get session ID from URL
    const sessionId = route.query.session_id as string;

    if (!sessionId) {
      error.value = t('subscription.error.noSessionId', 'No session ID provided');
      loading.value = false;
      return;
    }

    // First, try to verify the checkout session directly
    // This will work even if webhooks aren't configured (development mode)
    try {
      const verificationResult = await subscriptionService.verifyCheckoutSession(sessionId);

      if (verificationResult.success && verificationResult.subscription) {
        success.value = true;
        loading.value = false;
        return;
      }

      // If verification says it's processing, wait a bit and try again
      console.log('Checkout session verified but subscription not yet created, polling...');
    } catch (verifyErr) {
      console.warn('Checkout session verification failed, falling back to polling:', verifyErr);
    }

    // If verification didn't work, poll for subscription activation
    // The webhook handler processes checkout.session.completed and creates the subscription
    let attempts = 0;
    const maxAttempts = 15; // Try for up to 15 seconds
    const pollInterval = 1000; // 1 second between attempts

    while (attempts < maxAttempts) {
      attempts++;

      try {
        // Check if subscription was created by the webhook
        const subscription = await subscriptionService.getMySubscription();

        if (subscription && subscription.status === 'active') {
          success.value = true;
          loading.value = false;
          return;
        }
      } catch (err) {
        // Continue polling if subscription not found yet
        console.log(`Polling for subscription... attempt ${attempts}/${maxAttempts}`);
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // After all attempts, show error with helpful message
    error.value = t('subscription.error.notActivated',
      'Subscription activation is taking longer than expected. This usually means the webhook hasn\'t been received yet. Please refresh the page in a few moments or contact support if the issue persists.');
  } catch (err: any) {
    console.error('Error checking subscription status:', err);
    error.value = err.response?.data?.message || t('subscription.error.verifyFailed', 'Failed to check subscription status');
  } finally {
    loading.value = false;
  }
});
</script>
