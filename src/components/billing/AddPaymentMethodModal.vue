<template>
  <div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <!-- Backdrop -->
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div
        class="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 transition-opacity"
        @click="$emit('close')"
      ></div>

      <!-- Center modal -->
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <!-- Modal Content -->
      <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <!-- Header -->
        <div class="px-6 pt-5 pb-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
              {{ $t('billing.addPaymentMethod') }}
            </h3>
            <button
              @click="$emit('close')"
              class="rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
            >
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="px-6 pb-6">
          <!-- Error Message -->
          <div v-if="error" class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p class="text-sm text-red-800 dark:text-red-400">{{ error }}</p>
          </div>

          <!-- Cardholder Name -->
          <div class="mb-4">
            <label for="cardholderName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ $t('billing.cardholderName') }}
            </label>
            <input
              id="cardholderName"
              v-model="cardholderName"
              type="text"
              autocomplete="cc-name"
              class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
              :placeholder="$t('billing.cardholderName')"
              :disabled="isProcessing"
            />
          </div>

          <!-- Stripe Card Element -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ $t('billing.cardNumber') }}
            </label>
            <div
              id="card-element"
              class="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            ></div>
          </div>

          <!-- Stripe branding -->
          <div class="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 mb-4">
            <svg class="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            Secured by Stripe
          </div>
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 sm:flex sm:flex-row-reverse">
          <button
            @click="handleAddPaymentMethod"
            :disabled="isProcessing || !cardholderName.trim()"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              v-if="isProcessing"
              class="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isProcessing ? $t('billing.processing') : $t('billing.addCard') }}
          </button>
          <button
            @click="$emit('close')"
            :disabled="isProcessing"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ $t('billing.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { useStripePayment } from '@/composables/useStripePayment';

const emit = defineEmits<{
  'close': [];
  'added': [];
}>();

const { t } = useTranslation();
const stripe = useStripePayment();

const cardholderName = ref('');
const isProcessing = ref(false);
const error = ref<string | null>(null);

async function handleAddPaymentMethod() {
  if (!cardholderName.value.trim()) {
    error.value = 'Please enter the cardholder name';
    return;
  }

  isProcessing.value = true;
  error.value = null;

  try {
    // Collect and confirm payment method with cardholder name
    const paymentMethodId = await stripe.collectPaymentMethod(cardholderName.value.trim());

    if (paymentMethodId) {
      emit('added');
    } else {
      error.value = stripe.error.value || 'Failed to add payment method';
    }
  } catch (err: any) {
    error.value = err.message || 'An error occurred while adding payment method';
    console.error('Add payment method error:', err);
  } finally {
    isProcessing.value = false;
  }
}

onMounted(async () => {
  // Initialize Stripe
  const initialized = await stripe.initializeStripe();

  if (initialized) {
    // Mount card element
    await stripe.mountCardElement('card-element');
  } else {
    error.value = stripe.error.value || 'Failed to initialize payment form';
  }
});

onUnmounted(() => {
  // Clean up Stripe elements
  stripe.cleanup();
});
</script>
