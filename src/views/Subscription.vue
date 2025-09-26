<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="mb-6">
        <router-link
          to="/profile"
          class="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
        >
          <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          {{ $t('subscription.backToProfile', 'Back to profile') }}
        </router-link>
      </div>
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">
          {{ $t('subscription.title', 'Choose Your Plan') }}
        </h1>
        <p class="text-xl text-gray-600 max-w-3xl mx-auto">
          {{ $t('subscription.subtitle', 'Select the perfect plan for your receipt management needs') }}
        </p>
      </div>

      <!-- Current Subscription Status -->
      <div v-if="currentSubscription" class="mb-8">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-lg font-medium text-blue-900">
                {{ $t('subscription.current', 'Current Plan') }}
              </h3>
              <div class="mt-2 text-sm text-blue-700">
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
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">{{ $t('common.loading', 'Loading...') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <svg class="h-8 w-8 text-red-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p class="text-red-700">{{ error }}</p>
          <button 
            @click="loadPlans"
            class="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            {{ $t('common.retry', 'Retry') }}
          </button>
        </div>
      </div>

      <!-- Subscription Plans -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="bg-white rounded-lg shadow-lg overflow-hidden border-2 transition-all duration-200 hover:shadow-xl"
          :class="{
            'border-blue-500 ring-2 ring-blue-200': plan.code === 'free',
            'border-gray-200': plan.code !== 'free'
          }"
        >
          <!-- Plan Header -->
          <div class="px-6 py-8">
            <div class="text-center">
              <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ plan.name }}</h3>
              <p v-if="plan.description" class="text-gray-600 mb-4">{{ plan.description }}</p>
              
              <!-- Price -->
              <div class="mb-6">
                <span class="text-4xl font-bold text-gray-900">
                  ${{ plan.monthlyPrice.toFixed(2) }}
                </span>
                <span class="text-gray-600 ml-2">/month</span>
                <div v-if="plan.yearlyPrice > 0" class="text-sm text-gray-500 mt-1">
                  ${{ plan.yearlyPrice.toFixed(2) }}/year (save {{ Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100) }}%)
                </div>
              </div>

              <!-- Subscribe Button -->
              <button
                @click="subscribeToPlan(plan)"
                :disabled="subscribing || isCurrentPlan(plan)"
                class="w-full py-3 px-4 rounded-md font-medium transition-colors"
                :class="{
                  'bg-blue-600 text-white hover:bg-blue-700': !isCurrentPlan(plan) && !subscribing,
                  'bg-gray-300 text-gray-500 cursor-not-allowed': subscribing,
                  'bg-green-100 text-green-700 cursor-default': isCurrentPlan(plan)
                }"
              >
                <span v-if="subscribing && selectedPlanId === plan.id">
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
          <div class="px-6 pb-8">
            <h4 class="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wide">
              {{ $t('subscription.features', 'Features') }}
            </h4>
            <ul class="space-y-3">
              <li
                v-for="feature in plan.features"
                :key="feature.id"
                class="flex items-start"
              >
                <svg 
                  v-if="feature.booleanValue === true || feature.limitValue"
                  class="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5"
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <svg 
                  v-else
                  class="flex-shrink-0 h-5 w-5 text-gray-400 mt-0.5"
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span class="ml-3 text-sm text-gray-700">
                  {{ feature.featureName }}
                  <span v-if="feature.limitValue" class="text-gray-500">
                    ({{ feature.limitValue }} {{ feature.unitType || 'items' }})
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Success Message -->
      <div v-if="successMessage" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-md mx-4">
          <div class="text-center">
            <svg class="h-12 w-12 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">
              {{ $t('subscription.success.title', 'Subscription Successful!') }}
            </h3>
            <p class="text-gray-600 mb-4">{{ successMessage }}</p>
            <button
              @click="successMessage = null"
              class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              {{ $t('common.close', 'Close') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { subscriptionService } from '@/services/subscription.service';
import type { SubscriptionPlan, UserSubscription } from '@/types/subscription';

const { t } = useI18n();

// Reactive state
const plans = ref<SubscriptionPlan[]>([]);
const currentSubscription = ref<UserSubscription | null>(null);
const loading = ref(true);
const subscribing = ref(false);
const selectedPlanId = ref<number | null>(null);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// Computed properties
const isCurrentPlan = computed(() => (plan: SubscriptionPlan) => {
  return currentSubscription.value?.subscriptionPlanId === plan.id;
});

// Methods
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
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

    const subscriptionRequest = {
      subscriptionPlanId: plan.id,
      billingInterval: 'monthly' as const,
      startTrial: plan.allowTrial
    };

    const newSubscription = await subscriptionService.subscribe(subscriptionRequest);
    currentSubscription.value = newSubscription;
    
    successMessage.value = t('subscription.success.message', 
      `Successfully subscribed to ${plan.name}! You can now enjoy all the features included in this plan.`
    );
  } catch (err: any) {
    console.error('Failed to subscribe:', err);
    error.value = err.response?.data?.message || t('subscription.error.subscribeFailed', 'Failed to subscribe to plan');
  } finally {
    subscribing.value = false;
    selectedPlanId.value = null;
  }
};

// Lifecycle
onMounted(() => {
  loadPlans();
});
</script>
