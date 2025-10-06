<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-6 sm:mb-8">
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {{ $t('billing.title') }}
        </h1>
        <p class="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {{ $t('billing.subtitle') }}
        </p>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Current Plan Section -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Subscription Info Card -->
          <div class="card p-6">
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center">
                <svg class="w-6 h-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ $t('billing.currentPlan') }}
                </h3>
              </div>
              <RouterLink
                v-if="subscription"
                to="/subscription"
                class="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {{ $t('billing.changePlan') }} →
              </RouterLink>
            </div>

            <!-- Loading State -->
            <div v-if="loadingSubscription" class="animate-pulse space-y-4">
              <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>

            <!-- Subscription Details -->
            <div v-else-if="subscription" class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-3xl font-bold text-gray-900 dark:text-white">
                  {{ subscription.plan?.name || subscription.planCode }}
                </span>
                <span
                  class="px-3 py-1 text-sm font-medium rounded-full"
                  :class="statusBadgeClass"
                >
                  {{ $t(`billing.${subscription.status}`) }}
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('billing.billingCycle') }}</p>
                  <p class="mt-1 text-base font-medium text-gray-900 dark:text-white">
                    {{ $t(`billing.${subscription.billingInterval}`) }}
                  </p>
                </div>
                <div v-if="subscription.nextBillingDate">
                  <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('billing.nextBillingDate') }}</p>
                  <p class="mt-1 text-base font-medium text-gray-900 dark:text-white">
                    {{ formatDate(subscription.nextBillingDate) }}
                  </p>
                </div>
              </div>

              <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ formatCurrency(subscription.amount, subscription.currency) }}
                  <span class="text-sm font-normal text-gray-600 dark:text-gray-400">
                    / {{ subscription.billingInterval === 'monthly' ? $t('subscriptions.month') : $t('subscriptions.year') }}
                  </span>
                </p>
              </div>
            </div>

            <!-- No Subscription State -->
            <div v-else class="text-center py-8">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="mt-4 text-gray-600 dark:text-gray-400">{{ $t('subscriptions.noActivePlan') }}</p>
              <RouterLink
                to="/subscription"
                class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                {{ $t('subscriptions.choosePlan') }}
              </RouterLink>
            </div>
          </div>

          <!-- Payment Methods Section -->
          <div class="card p-6">
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center">
                <svg class="w-6 h-6 text-green-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ $t('billing.paymentMethods') }}
                </h3>
              </div>
              <button
                @click="showAddPaymentMethodModal = true"
                class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {{ $t('billing.addPaymentMethod') }}
              </button>
            </div>

            <PaymentMethodsList
              :payment-methods="paymentMethods"
              :loading="loadingPaymentMethods"
              @set-default="handleSetDefaultPaymentMethod"
              @remove="handleRemovePaymentMethod"
            />
          </div>
        </div>

        <!-- Sidebar -->
        <div class="lg:col-span-1 space-y-6">
          <!-- Billing History (Placeholder) -->
          <div class="card p-6">
            <div class="flex items-center mb-4">
              <svg class="w-5 h-5 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ $t('billing.billingHistory') }}
              </h3>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {{ $t('billing.billingHistorySubtitle') }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-500 italic">
              {{ $t('billing.noBillingHistory') }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Payment Method Modal -->
    <AddPaymentMethodModal
      v-if="showAddPaymentMethodModal"
      @close="showAddPaymentMethodModal = false"
      @added="handlePaymentMethodAdded"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTranslation } from '@/composables/useTranslation';
import { useNotifications } from '@/composables/useNotifications';
import subscriptionService from '@/services/subscriptionService';
import PaymentMethodsList from '@/components/billing/PaymentMethodsList.vue';
import AddPaymentMethodModal from '@/components/billing/AddPaymentMethodModal.vue';
import type { UserSubscription, PaymentMethod } from '@/types/subscription';

const router = useRouter();
const { t } = useTranslation();
const { success: showSuccess, error: showError } = useNotifications();

const subscription = ref<UserSubscription | null>(null);
const paymentMethods = ref<PaymentMethod[]>([]);
const loadingSubscription = ref(false);
const loadingPaymentMethods = ref(false);
const showAddPaymentMethodModal = ref(false);

const statusBadgeClass = computed(() => {
  if (!subscription.value) return '';

  const status = subscription.value.status;
  const classes: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    trialing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    past_due: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    canceled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  };

  return classes[status] || 'bg-gray-100 text-gray-800';
});

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

async function loadSubscription() {
  loadingSubscription.value = true;
  try {
    subscription.value = await subscriptionService.getMySubscription();
  } catch (error: any) {
    console.error('Failed to load subscription:', error);
    // Don't show error if user just doesn't have a subscription
    if (error.response?.status !== 404) {
      showError(t('billing.errorLoadingSubscription'));
    }
  } finally {
    loadingSubscription.value = false;
  }
}

async function loadPaymentMethods() {
  loadingPaymentMethods.value = true;
  try {
    paymentMethods.value = await subscriptionService.getPaymentMethods();
  } catch (error) {
    console.error('Failed to load payment methods:', error);
    showError(t('billing.errorLoadingPaymentMethods'));
  } finally {
    loadingPaymentMethods.value = false;
  }
}

async function handleSetDefaultPaymentMethod(paymentMethodId: number) {
  try {
    await subscriptionService.setDefaultPaymentMethod(paymentMethodId);
    showSuccess(t('billing.paymentMethodSetAsDefault'));
    await loadPaymentMethods();
  } catch (error: any) {
    showError(error.response?.data?.message || 'Failed to set default payment method');
  }
}

async function handleRemovePaymentMethod(paymentMethodId: number) {
  const paymentMethod = paymentMethods.value.find(pm => pm.id === paymentMethodId);

  const confirmMessage = paymentMethod?.isDefault
    ? t('billing.confirmRemoveDefault')
    : t('billing.confirmRemove');

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    await subscriptionService.removePaymentMethod(paymentMethodId);
    showSuccess(t('billing.paymentMethodRemoved'));
    await loadPaymentMethods();
  } catch (error: any) {
    showError(error.response?.data?.message || 'Failed to remove payment method');
  }
}

async function handlePaymentMethodAdded() {
  showAddPaymentMethodModal.value = false;
  showSuccess(t('billing.paymentMethodAdded'));
  await loadPaymentMethods();
}

onMounted(async () => {
  await Promise.all([
    loadSubscription(),
    loadPaymentMethods()
  ]);
});
</script>
