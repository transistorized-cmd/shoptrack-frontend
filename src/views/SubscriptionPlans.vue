<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">
          {{ $t('subscriptions.chooseYourPlan') }}
        </h1>
        <p class="text-lg text-gray-600 max-w-2xl mx-auto">
          {{ $t('subscriptions.planDescription') }}
        </p>
      </div>

      <!-- Billing Toggle -->
      <div class="flex justify-center mb-12">
        <div class="bg-white rounded-lg p-1 shadow-sm">
          <button
            @click="billingInterval = 'monthly'"
            :class="[
              'px-6 py-2 rounded-md font-medium transition-colors',
              billingInterval === 'monthly'
                ? 'bg-shoptrack-600 text-white'
                : 'text-gray-700 hover:text-gray-900'
            ]"
          >
            {{ $t('subscriptions.monthly') }}
          </button>
          <button
            @click="billingInterval = 'yearly'"
            :class="[
              'px-6 py-2 rounded-md font-medium transition-colors',
              billingInterval === 'yearly'
                ? 'bg-shoptrack-600 text-white'
                : 'text-gray-700 hover:text-gray-900'
            ]"
          >
            {{ $t('subscriptions.yearly') }}
            <span class="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              {{ $t('subscriptions.save20') }}
            </span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-shoptrack-600"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-20">
        <p class="text-red-600 mb-4">{{ error }}</p>
        <button @click="loadPlans" class="btn-primary">
          {{ $t('common.tryAgain') }}
        </button>
      </div>

      <!-- Plans Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div
          v-for="plan in plans"
          :key="plan.id"
          :class="[
            'bg-white rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105',
            plan.code === 'premium' ? 'ring-2 ring-shoptrack-600' : ''
          ]"
        >
          <!-- Popular Badge -->
          <div v-if="plan.code === 'premium'" class="bg-shoptrack-600 text-white text-center py-2 text-sm font-semibold">
            {{ $t('subscriptions.mostPopular') }}
          </div>

          <div class="p-6">
            <!-- Plan Name -->
            <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ plan.name }}</h3>
            <p class="text-gray-600 text-sm mb-6">{{ plan.description }}</p>

            <!-- Price -->
            <div class="mb-6">
              <div class="flex items-baseline">
                <span class="text-4xl font-bold text-gray-900">
                  {{ formatPrice(billingInterval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice) }}
                </span>
                <span class="text-gray-600 ml-2">
                  / {{ billingInterval === 'monthly' ? $t('subscriptions.month') : $t('subscriptions.year') }}
                </span>
              </div>
              <p v-if="billingInterval === 'yearly'" class="text-sm text-green-600 mt-1">
                {{ $t('subscriptions.billedAnnually') }}
              </p>
            </div>

            <!-- Features -->
            <ul class="space-y-3 mb-8">
              <li
                v-for="feature in plan.features.slice(0, 5)"
                :key="feature.id"
                class="flex items-start"
              >
                <svg class="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span class="text-gray-700">
                  {{ formatFeature(feature) }}
                </span>
              </li>
            </ul>

            <!-- CTA Button -->
            <button
              @click="selectPlan(plan)"
              :disabled="isCurrentPlan(plan)"
              :class="[
                'w-full py-3 px-4 rounded-lg font-semibold transition-colors',
                isCurrentPlan(plan)
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : plan.code === 'premium'
                  ? 'bg-shoptrack-600 text-white hover:bg-shoptrack-700'
                  : plan.monthlyPrice === 0
                  ? 'bg-gray-800 text-white hover:bg-gray-900'
                  : 'bg-shoptrack-100 text-shoptrack-700 hover:bg-shoptrack-200'
              ]"
            >
              {{
                isCurrentPlan(plan)
                  ? $t('subscriptions.currentPlan')
                  : plan.monthlyPrice === 0
                  ? $t('subscriptions.getStarted')
                  : $t('subscriptions.subscribe')
              }}
            </button>
          </div>
        </div>
      </div>

      <!-- Features Comparison -->
      <div class="mt-20">
        <h2 class="text-3xl font-bold text-center text-gray-900 mb-8">
          {{ $t('subscriptions.compareFeatures') }}
        </h2>
        <!-- Feature comparison table can be added here -->
      </div>
    </div>

    <!-- Checkout Modal -->
    <CheckoutModal
      v-if="selectedPlan"
      :plan="selectedPlan"
      :billing-interval="billingInterval"
      @close="selectedPlan = null"
      @success="handleSubscriptionSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import subscriptionService from '@/services/subscriptionService';
import CheckoutModal from '@/components/subscriptions/CheckoutModal.vue';
import type { SubscriptionPlan, UserSubscription } from '@/types/subscription';

const { t } = useI18n();
const router = useRouter();

const plans = ref<SubscriptionPlan[]>([]);
const currentSubscription = ref<UserSubscription | null>(null);
const selectedPlan = ref<SubscriptionPlan | null>(null);
const billingInterval = ref<'monthly' | 'yearly'>('monthly');
const loading = ref(false);
const error = ref<string | null>(null);

const loadPlans = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Load plans
    plans.value = await subscriptionService.getAvailablePlans();

    // Load current subscription
    try {
      currentSubscription.value = await subscriptionService.getMySubscription();
    } catch (err) {
      // User might not have a subscription yet
      currentSubscription.value = null;
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || t('subscriptions.loadError');
    console.error('Failed to load plans:', err);
  } finally {
    loading.value = false;
  }
};

const formatPrice = (price: number): string => {
  if (price === 0) return t('subscriptions.free');
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(price);
};

const formatFeature = (feature: any): string => {
  if (feature.featureType === 'limit' && feature.limitValue !== null) {
    return `${feature.featureName}: ${feature.limitValue} ${feature.unitType || ''}`;
  }
  if (feature.featureType === 'boolean' && feature.booleanValue) {
    return feature.featureName;
  }
  return feature.featureName;
};

const isCurrentPlan = (plan: SubscriptionPlan): boolean => {
  if (!currentSubscription.value) return false;
  return currentSubscription.value.subscriptionPlanId === plan.id;
};

const selectPlan = (plan: SubscriptionPlan) => {
  if (isCurrentPlan(plan)) return;
  selectedPlan.value = plan;
};

const handleSubscriptionSuccess = async () => {
  selectedPlan.value = null;

  // Reload current subscription
  try {
    currentSubscription.value = await subscriptionService.getMySubscription();
  } catch (err) {
    console.error('Failed to reload subscription:', err);
  }

  // Show success message (you can use a toast notification here)
  alert(t('subscriptions.subscriptionSuccess'));
};

onMounted(() => {
  loadPlans();
});
</script>

<style scoped>
.btn-primary {
  @apply bg-shoptrack-600 text-white px-6 py-2 rounded-lg hover:bg-shoptrack-700 transition-colors;
}
</style>
