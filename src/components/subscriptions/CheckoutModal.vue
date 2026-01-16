<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-900">
          {{ $t('subscriptions.checkout') }}
        </h2>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Plan Summary -->
        <div class="bg-shoptrack-50 rounded-lg p-4 mb-6">
          <h3 class="font-semibold text-gray-900 mb-2">{{ plan.name }}</h3>
          <div class="flex justify-between items-baseline">
            <span class="text-2xl font-bold text-shoptrack-600">
              {{ formatPrice(getPriceForPeriod(plan.prices, 'USD', billingInterval === 'monthly' ? 'Monthly' : 'Yearly')) }}
            </span>
            <span class="text-gray-600">
              / {{ billingInterval === 'monthly' ? $t('subscriptions.month') : $t('subscriptions.year') }}
            </span>
          </div>
          <p v-if="billingInterval === 'yearly'" class="text-sm text-green-600 mt-1">
            {{ $t('subscriptions.save20Percent') }}
          </p>
        </div>

        <!-- Steps -->
        <div class="mb-6">
          <div class="flex items-center mb-4">
            <div
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center mr-3',
                currentStep >= 1 ? 'bg-shoptrack-600 text-white' : 'bg-gray-200 text-gray-600'
              ]"
            >
              1
            </div>
            <span :class="currentStep >= 1 ? 'text-gray-900 font-medium' : 'text-gray-500'">
              {{ $t('subscriptions.paymentMethod') }}
            </span>
          </div>
          <div class="flex items-center">
            <div
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center mr-3',
                currentStep >= 2 ? 'bg-shoptrack-600 text-white' : 'bg-gray-200 text-gray-600'
              ]"
            >
              2
            </div>
            <span :class="currentStep >= 2 ? 'text-gray-900 font-medium' : 'text-gray-500'">
              {{ $t('subscriptions.confirmSubscription') }}
            </span>
          </div>
        </div>

        <!-- Step 1: Payment Method -->
        <div v-show="currentStep === 1">
          <!-- Existing Payment Methods -->
          <div v-if="paymentMethods.length > 0" class="mb-6">
            <h4 class="font-medium text-gray-900 mb-3">{{ $t('subscriptions.existingPaymentMethods') }}</h4>
            <div class="space-y-2">
              <label
                v-for="method in paymentMethods"
                :key="method.id"
                class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                :class="selectedPaymentMethodId === method.id ? 'border-shoptrack-600 bg-shoptrack-50' : 'border-gray-200'"
              >
                <input
                  type="radio"
                  :value="method.id"
                  v-model="selectedPaymentMethodId"
                  class="mr-3"
                />
                <div class="flex-1">
                  <div class="flex items-center">
                    <span class="font-medium">{{ method.brand }} •••• {{ method.last4 }}</span>
                    <span v-if="method.isDefault" class="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {{ $t('subscriptions.default') }}
                    </span>
                  </div>
                  <span class="text-sm text-gray-600">
                    {{ $t('subscriptions.expires') }} {{ method.expiryMonth }}/{{ method.expiryYear }}
                  </span>
                </div>
              </label>
            </div>
          </div>

          <!-- Add New Payment Method -->
          <div>
            <div class="flex items-center mb-3">
              <input
                type="radio"
                :value="null"
                v-model="selectedPaymentMethodId"
                id="new-card"
                class="mr-2"
              />
              <label for="new-card" class="font-medium text-gray-900 cursor-pointer">
                {{ paymentMethods.length > 0 ? $t('subscriptions.addNewCard') : $t('subscriptions.addPaymentMethod') }}
              </label>
            </div>

            <div v-show="selectedPaymentMethodId === null" class="mt-4">
              <!-- Stripe Card Element -->
              <div
                id="card-element"
                class="p-3 border border-gray-300 rounded-lg"
              ></div>
              <p v-if="stripeError" class="text-red-600 text-sm mt-2">{{ stripeError }}</p>
            </div>
          </div>

          <!-- Navigation -->
          <div class="flex justify-between mt-6">
            <button
              @click="$emit('close')"
              class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              @click="handlePaymentMethodNext"
              :disabled="processing"
              class="px-6 py-2 bg-shoptrack-600 text-white rounded-lg hover:bg-shoptrack-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <span v-if="!processing">{{ $t('common.next') }}</span>
              <span v-else class="flex items-center">
                <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ $t('common.processing') }}
              </span>
            </button>
          </div>
        </div>

        <!-- Step 2: Confirm -->
        <div v-show="currentStep === 2">
          <div class="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 class="font-medium text-gray-900 mb-3">{{ $t('subscriptions.orderSummary') }}</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">{{ $t('subscriptions.plan') }}:</span>
                <span class="font-medium">{{ plan.name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">{{ $t('subscriptions.billingInterval') }}:</span>
                <span class="font-medium">{{ $t(`subscriptions.${billingInterval}`) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">{{ $t('subscriptions.paymentMethod') }}:</span>
                <span class="font-medium">
                  {{ selectedPaymentMethod ? `${selectedPaymentMethod.brand} •••• ${selectedPaymentMethod.last4}` : $t('subscriptions.newCard') }}
                </span>
              </div>
              <div class="border-t pt-2 mt-2 flex justify-between text-base">
                <span class="font-medium text-gray-900">{{ $t('subscriptions.total') }}:</span>
                <span class="font-bold text-shoptrack-600">
                  {{ formatPrice(getPriceForPeriod(plan.prices, 'USD', billingInterval === 'monthly' ? 'Monthly' : 'Yearly')) }}
                </span>
              </div>
            </div>
          </div>

          <p class="text-sm text-gray-600 mb-6">
            {{ $t('subscriptions.confirmationMessage') }}
          </p>

          <!-- Navigation -->
          <div class="flex justify-between">
            <button
              @click="currentStep = 1"
              class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {{ $t('common.back') }}
            </button>
            <button
              @click="handleConfirmSubscription"
              :disabled="processing"
              class="px-6 py-2 bg-shoptrack-600 text-white rounded-lg hover:bg-shoptrack-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <span v-if="!processing">{{ $t('subscriptions.confirmSubscribe') }}</span>
              <span v-else class="flex items-center">
                <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ $t('common.processing') }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { useStripePayment } from '@/composables/useStripePayment';
import subscriptionService from '@/services/subscriptionService';
import { getPriceForPeriod } from '@/types/subscription';
import type { SubscriptionPlan, PaymentMethod } from '@/types/subscription';

const props = defineProps<{
  plan: SubscriptionPlan;
  billingInterval: 'monthly' | 'yearly';
}>();

const emit = defineEmits<{
  close: [];
  success: [];
}>();

const { t } = useTranslation();
const {
  mountCardElement,
  collectPaymentMethod,
  error: stripeError,
  isLoading: stripeLoading,
  cleanup
} = useStripePayment();

const currentStep = ref(1);
const paymentMethods = ref<PaymentMethod[]>([]);
const selectedPaymentMethodId = ref<number | null>(null);
const newPaymentMethodId = ref<string | null>(null);
const processing = ref(false);

const selectedPaymentMethod = computed(() => {
  if (selectedPaymentMethodId.value === null) return null;
  return paymentMethods.value.find(pm => pm.id === selectedPaymentMethodId.value) || null;
});

const formatPrice = (price: number): string => {
  if (price === 0) return t('subscriptions.free');
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(price);
};

const loadPaymentMethods = async () => {
  try {
    paymentMethods.value = await subscriptionService.getPaymentMethods();

    // Select default payment method if exists
    const defaultMethod = paymentMethods.value.find(pm => pm.isDefault);
    if (defaultMethod) {
      selectedPaymentMethodId.value = defaultMethod.id;
    } else if (paymentMethods.value.length > 0) {
      selectedPaymentMethodId.value = paymentMethods.value[0].id;
    }
  } catch (err) {
    console.error('Failed to load payment methods:', err);
  }
};

const handlePaymentMethodNext = async () => {
  processing.value = true;

  try {
    // If using new card, collect payment method
    if (selectedPaymentMethodId.value === null) {
      const paymentMethodId = await collectPaymentMethod();

      if (!paymentMethodId) {
        // Error already set in stripeError
        processing.value = false;
        return;
      }

      newPaymentMethodId.value = paymentMethodId;
    }

    currentStep.value = 2;
  } catch (err: any) {
    stripeError.value = err.message || t('subscriptions.paymentMethodError');
  } finally {
    processing.value = false;
  }
};

const handleConfirmSubscription = async () => {
  processing.value = true;

  try {
    const result = await subscriptionService.createSubscription({
      planCode: props.plan.code,
      billingInterval: props.billingInterval,
      paymentMethodId: newPaymentMethodId.value || undefined
    });

    if (result.success) {
      emit('success');
    } else {
      alert(result.errorMessage || t('subscriptions.subscriptionError'));
    }
  } catch (err: any) {
    alert(err.response?.data?.message || t('subscriptions.subscriptionError'));
  } finally {
    processing.value = false;
  }
};

onMounted(async () => {
  await loadPaymentMethods();

  // Mount Stripe card element if no payment methods
  if (paymentMethods.value.length === 0) {
    selectedPaymentMethodId.value = null;
    setTimeout(() => {
      mountCardElement('card-element');
    }, 100);
  }
});

// Cleanup on unmount
onBeforeUnmount(() => {
  cleanup();
});
</script>
