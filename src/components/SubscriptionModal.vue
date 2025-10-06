<template>
  <!-- Modal Overlay -->
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    @click="closeModal"
  >
    <!-- Modal Content -->
    <div
      class="card rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
      @click.stop
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ $t('subscription.title', 'Choose Your Plan') }}
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {{ $t('subscription.subtitle', 'Select the perfect plan for your receipt management needs') }}
          </p>
        </div>
        <button
          @click="closeModal"
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          :aria-label="$t('common.close', 'Close')"
        >
          <svg class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
        <!-- Current Subscription Status -->
        <div v-if="currentSubscription" class="mb-6">
          <div class="card rounded-xl p-4 border border-shoptrack-200 dark:border-shoptrack-700 bg-shoptrack-50 dark:bg-shoptrack-900/20">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-shoptrack-600 dark:text-shoptrack-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-base font-medium text-shoptrack-900 dark:text-shoptrack-100">
                  {{ $t('subscription.current', 'Current Plan') }}
                </h3>
                <div class="mt-1 text-sm text-shoptrack-700 dark:text-shoptrack-300">
                  <p>
                    <strong>{{ currentSubscription.plan?.name }}</strong> -
                    {{ $t('subscription.status.' + currentSubscription.status, currentSubscription.status) }}
                  </p>
                  <p v-if="currentSubscription.nextBillingDate" class="mt-1">
                    {{ $t('subscription.nextBilling', 'Next billing') }}:
                    {{ formatDate(currentSubscription.nextBillingDate) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-shoptrack-600 dark:border-shoptrack-400"></div>
          <p class="mt-2 text-gray-600 dark:text-gray-300">{{ $t('common.loading', 'Loading...') }}</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-8">
          <div class="card rounded-xl p-6 max-w-md mx-auto border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <svg class="h-8 w-8 text-red-400 dark:text-red-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p class="text-red-700 dark:text-red-300 mb-4">{{ error }}</p>
            <button
              @click="loadPlans"
              class="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {{ $t('common.retry', 'Retry') }}
            </button>
          </div>
        </div>

        <!-- Subscription Plans -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="plan in plans"
            :key="plan.id"
            class="card rounded-xl overflow-hidden border-2 transition-all duration-200 hover:shadow-lg"
            :class="{
              'border-shoptrack-500 ring-2 ring-shoptrack-200 dark:ring-shoptrack-800': plan.code === 'free',
              'border-gray-200 dark:border-gray-700': plan.code !== 'free'
            }"
          >
            <!-- Plan Header -->
            <div class="px-4 py-6">
              <div class="text-center">
                <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">{{ plan.name }}</h3>
                <p v-if="plan.description" class="text-gray-600 dark:text-gray-300 mb-4 text-sm">{{ plan.description }}</p>

                <!-- Price -->
                <div class="mb-4">
                  <span class="text-3xl font-bold text-gray-900 dark:text-white">
                    ${{ plan.monthlyPrice.toFixed(2) }}
                  </span>
                  <span class="text-gray-600 dark:text-gray-400 ml-1 text-sm">/month</span>
                  <div v-if="plan.yearlyPrice > 0" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ${{ plan.yearlyPrice.toFixed(2) }}/year (save {{ Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100) }}%)
                  </div>
                </div>

                <!-- Subscribe Button -->
                <button
                  @click="subscribeToPlan(plan)"
                  :disabled="subscribing || isCurrentPlan(plan)"
                  class="w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors"
                  :class="{
                    'bg-shoptrack-600 text-white hover:bg-shoptrack-700 dark:bg-shoptrack-700 dark:hover:bg-shoptrack-800': !isCurrentPlan(plan) && !subscribing,
                    'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed': subscribing,
                    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 cursor-default border border-green-200 dark:border-green-800': isCurrentPlan(plan)
                  }"
                >
                  <span v-if="subscribing && selectedPlanId === plan.id" class="flex items-center justify-center">
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {{ $t('subscription.subscribing', 'Subscribing...') }}
                  </span>
                  <span v-else-if="isCurrentPlan(plan)">
                    {{ $t('subscription.currentPlan', 'Current Plan') }}
                  </span>
                  <span v-else>
                    {{ $t('subscription.subscribe', 'Subscribe') }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Features List -->
            <div class="px-4 pb-6 border-t border-gray-100 dark:border-gray-700 pt-4">
              <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wide">
                {{ $t('subscription.features', 'Features') }}
              </h4>
              <ul class="space-y-2">
                <li
                  v-for="feature in plan.features"
                  :key="feature.id"
                  class="flex items-start"
                >
                  <svg
                    v-if="feature.booleanValue === true || feature.limitValue"
                    class="flex-shrink-0 h-4 w-4 text-green-500 dark:text-green-400 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg
                    v-else
                    class="flex-shrink-0 h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span class="ml-2 text-xs text-gray-700 dark:text-gray-300">
                    {{ feature.featureName }}
                    <span v-if="feature.limitValue" class="text-gray-500 dark:text-gray-400">
                      ({{ feature.limitValue }} {{ feature.unitType || 'items' }})
                    </span>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Success Modal -->
      <div v-if="successMessage" class="absolute inset-0 bg-white dark:bg-gray-800 flex items-center justify-center">
        <div class="text-center p-6">
          <svg class="h-12 w-12 text-green-500 dark:text-green-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {{ $t('subscription.success.title', 'Subscription Successful!') }}
          </h3>
          <p class="text-gray-600 dark:text-gray-300 mb-4">{{ successMessage }}</p>
          <button
            @click="handleSuccessClose"
            class="bg-shoptrack-600 hover:bg-shoptrack-700 dark:bg-shoptrack-700 dark:hover:bg-shoptrack-800 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {{ $t('common.close', 'Close') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { useDateLocalization } from '@/composables/useDateLocalization';
import { subscriptionService } from '@/services/subscription.service';
import type { SubscriptionPlan, UserSubscription } from '@/types/subscription';

const { t } = useTranslation();
const { formatDate: formatDateSafe } = useDateLocalization();

// Props
interface Props {
  isOpen: boolean;
}

const props = defineProps<Props>();

// Emits
interface Emits {
  (e: 'close'): void;
  (e: 'subscribed'): void;
}

const emit = defineEmits<Emits>();

// Reactive state
const plans = ref<SubscriptionPlan[]>([]);
const currentSubscription = ref<UserSubscription | null>(null);
const loading = ref(false);
const subscribing = ref(false);
const selectedPlanId = ref<number | null>(null);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// Computed properties
const isCurrentPlan = computed(() => (plan: SubscriptionPlan) => {
  return currentSubscription.value?.plan?.code === plan.code;
});

// Methods
const formatDate = (dateString: string) => {
  return formatDateSafe(dateString);
};

const closeModal = () => {
  emit('close');
};

const loadPlans = async () => {
  try {
    loading.value = true;
    error.value = null;

    const [plansData, subscriptionData] = await Promise.all([
      subscriptionService.getAvailablePlans(),
      subscriptionService.getMySubscription()
    ]);

    plans.value = plansData;
    currentSubscription.value = subscriptionData;
  } catch (err: any) {
    console.error('Failed to load subscription data:', err);
    error.value = err.response?.data?.message || t('subscription.error.loadFailed', 'Failed to load subscription plans');
  } finally {
    loading.value = false;
  }
};

const subscribeToPlan = async (plan: SubscriptionPlan) => {
  if (subscribing.value || isCurrentPlan.value(plan)) return;

  try {
    subscribing.value = true;
    selectedPlanId.value = plan.id;
    error.value = null;

    // Check if it's a free plan
    const isFree = plan.monthlyPrice <= 0 && plan.yearlyPrice <= 0;

    // Check if user already has a subscription
    const hasExistingSubscription = currentSubscription.value &&
                                     currentSubscription.value.id > 0 &&
                                     currentSubscription.value.status === 'active';

    if (isFree) {
      // Free plans can be assigned directly
      if (hasExistingSubscription) {
        // User has existing subscription - use UPDATE endpoint
        const updateRequest = {
          newPlanCode: plan.code,
          newBillingInterval: 'monthly' as const
        };
        const result = await subscriptionService.updateSubscription(updateRequest);
        if (!result.success || !result.subscription) {
          throw new Error(result.errorMessage || 'Failed to update subscription');
        }
        currentSubscription.value = result.subscription;
      } else {
        // No existing subscription - use CREATE endpoint
        const createRequest = {
          planCode: plan.code,
          billingInterval: 'monthly' as const
        };
        const result = await subscriptionService.subscribe(createRequest);
        if (!result.success || !result.subscription) {
          throw new Error(result.errorMessage || 'Failed to create subscription');
        }
        currentSubscription.value = result.subscription;
      }

      successMessage.value = t('subscription.success.message',
        `Successfully subscribed to ${plan.name}! You can now enjoy all the features included in this plan.`
      );

      emit('subscribed');

      subscribing.value = false;
      selectedPlanId.value = null;
    } else {
      // Paid plans require Stripe Checkout Session
      const successUrl = `${window.location.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/subscription`;

      const checkoutSession = await subscriptionService.createCheckoutSession(
        plan.code,
        'monthly',
        successUrl,
        cancelUrl
      );

      // Redirect to Stripe Checkout (modal will close automatically on redirect, don't set loading to false)
      window.location.href = checkoutSession.sessionUrl;
    }
  } catch (err: any) {
    console.error('Failed to subscribe:', err);
    error.value = err.response?.data?.message || t('subscription.error.subscribeFailed', 'Failed to subscribe to plan');
    subscribing.value = false;
    selectedPlanId.value = null;
  }
};

const handleSuccessClose = () => {
  successMessage.value = null;
  closeModal();
};

// Watch for modal open state
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && plans.value.length === 0) {
    loadPlans();
  }
});
</script>
