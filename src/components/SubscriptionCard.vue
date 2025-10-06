<template>
  <div class="card p-6">
    <div class="flex items-center mb-6">
      <svg class="w-6 h-6 text-green-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('subscription.title', 'Subscription') }}</h3>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">{{ $t('common.loading', 'Loading...') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
      <div class="flex">
        <svg class="h-5 w-5 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div class="ml-3">
          <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Subscription Content -->
    <div v-else>
      <!-- No Active Subscription - Prompt to Choose Plan -->
      <div v-if="!currentSubscription || currentSubscription.id === 0" class="text-center py-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 mb-4">
          <svg class="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>

        <h4 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {{ $t('subscription.noActivePlan', 'No Active Subscription') }}
        </h4>

        <p class="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
          {{ $t('subscription.choosePlanPrompt', 'Choose a plan to unlock powerful features for managing your receipts and expenses. Start with our Free plan or upgrade for advanced capabilities.') }}
        </p>

        <button
          @click="showSubscriptionModal = true"
          class="inline-flex items-center px-6 py-3 bg-shoptrack-600 hover:bg-shoptrack-700 dark:bg-shoptrack-700 dark:hover:bg-shoptrack-800 text-white font-medium rounded-lg focus:ring-2 focus:ring-shoptrack-500 focus:ring-offset-2 dark:ring-offset-gray-800 transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {{ $t('subscription.choosePlan', 'Choose a Plan') }}
        </button>
      </div>

      <!-- Current Plan (Active Subscription) -->
      <div v-else class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 mb-6">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="flex items-center mb-2">
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ currentSubscription.plan?.name || $t('subscription.freePlan', 'Free Plan') }}
              </h4>
              <span
                class="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="getStatusBadgeClass(currentSubscription.status)"
              >
                {{ $t(`subscription.status.${currentSubscription.status}`, currentSubscription.status) }}
              </span>
            </div>

            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
              {{ currentSubscription.plan?.description || $t('subscription.freeDescription', 'Basic features to get you started') }}
            </p>

            <!-- Pricing Display -->
            <div class="flex items-center text-2xl font-bold text-gray-900 dark:text-white mb-2">
              <span>${{ (currentSubscription.plan?.monthlyPrice || 0).toFixed(2) }}</span>
              <span class="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">/month</span>
            </div>

            <!-- Cancellation Warning -->
            <div v-if="currentSubscription.cancelledAt && currentSubscription.nextBillingDate" class="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div class="flex items-start">
                <svg class="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div class="flex-1">
                  <p class="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {{ $t('subscription.cancellationPending', 'Subscription Cancelled') }}
                  </p>
                  <p class="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {{ $t('subscription.accessUntil', 'You will have access until') }} {{ formatDate(currentSubscription.nextBillingDate) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Next Billing Date -->
            <div v-else-if="currentSubscription.nextBillingDate" class="text-sm text-gray-600 dark:text-gray-300">
              {{ $t('subscription.nextBilling', 'Next billing') }}:
              {{ formatDate(currentSubscription.nextBillingDate) }}
            </div>

            <!-- Trial Info -->
            <div v-else-if="currentSubscription.trialEndDate" class="text-sm text-amber-600 dark:text-amber-400">
              {{ $t('subscription.trialEnds', 'Trial ends') }}:
              {{ formatDate(currentSubscription.trialEndDate) }}
            </div>
          </div>

          <!-- Plan Actions -->
          <div class="ml-6 flex flex-col space-y-2">
            <button
              @click="showSubscriptionModal = true"
              class="px-4 py-2 bg-shoptrack-600 hover:bg-shoptrack-700 dark:bg-shoptrack-700 dark:hover:bg-shoptrack-800 text-white text-sm font-medium rounded-lg focus:ring-2 focus:ring-shoptrack-500 focus:ring-offset-2 dark:ring-offset-gray-800 transition-colors"
            >
              {{ $t('subscription.changePlan', 'Change Plan') }}
            </button>

            <button
              v-if="currentSubscription.status === 'active' && currentSubscription.plan?.monthlyPrice > 0 && !currentSubscription.cancelledAt"
              @click="showCancelDialog = true"
              class="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              {{ $t('subscription.cancel', 'Cancel') }}
            </button>
          </div>
        </div>
      </div>

      <!-- All Features (sorted by sortOrder) -->
      <div v-if="allFeaturesSorted.length" class="mb-6">
        <h5 class="text-sm font-medium text-gray-900 dark:text-white mb-4 uppercase tracking-wide">
          {{ $t('subscription.features', 'Features') }}
        </h5>

        <div class="space-y-3">
          <div
            v-for="feature in allFeaturesSorted"
            :key="feature.id"
          >
            <!-- Limit Feature -->
            <div v-if="feature.featureType === 'limit'" class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ feature.featureName }}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ featureUsage[feature.featureCode]?.usage || 0 }} / {{ feature.limitValue || '∞' }}
                </span>
              </div>

              <!-- Usage Bar -->
              <div v-if="feature.limitValue" class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  class="h-2 rounded-full transition-all duration-300"
                  :class="getUsageBarClass(featureUsage[feature.featureCode]?.usage || 0, feature.limitValue)"
                  :style="{ width: `${Math.min(((featureUsage[feature.featureCode]?.usage || 0) / feature.limitValue) * 100, 100)}%` }"
                ></div>
              </div>
            </div>

            <!-- Boolean / Access Feature -->
            <div v-else-if="isBooleanFeature(feature)" class="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <svg
                v-if="isFeatureEnabled(feature)"
                class="flex-shrink-0 h-5 w-5 text-green-500 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg
                v-else
                class="flex-shrink-0 h-5 w-5 text-gray-400 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span
                class="text-sm"
                :class="isFeatureEnabled(feature) ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'"
              >
                {{ feature.featureName }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Subscription History Link -->
      <div class="border-t border-gray-200 dark:border-gray-600 pt-4">
        <button
          @click="showSubscriptionModal = true"
          class="text-sm text-shoptrack-600 dark:text-shoptrack-400 hover:text-shoptrack-800 dark:hover:text-shoptrack-300 font-medium"
        >
          {{ $t('subscription.manageSubscription', 'Manage subscription and view billing history') }} →
        </button>
      </div>
    </div>

    <!-- Cancel Confirmation Dialog -->
    <div v-if="showCancelDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
        <div class="text-center">
          <svg class="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {{ $t('subscription.cancelTitle', 'Cancel Subscription') }}
          </h3>
          <p class="text-gray-600 dark:text-gray-300 mb-6">
            {{ $t('subscription.cancelMessage', 'Are you sure you want to cancel your subscription? You will lose access to premium features.') }}
          </p>
          <div class="flex space-x-3">
            <button
              @click="showCancelDialog = false"
              class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              {{ $t('common.cancel', 'Cancel') }}
            </button>
            <button
              @click="cancelSubscription"
              :disabled="cancelling"
              class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {{ cancelling ? $t('subscription.cancelling', 'Cancelling...') : $t('subscription.confirmCancel', 'Yes, Cancel') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Subscription Modal -->
    <SubscriptionModal
      :is-open="showSubscriptionModal"
      @close="showSubscriptionModal = false"
      @subscribed="handleSubscriptionUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { useDateLocalization } from '@/composables/useDateLocalization';
import { subscriptionService } from '@/services/subscription.service';
import { getStatusBadgeClass, getUsageBarClass } from '@/utils/uiHelpers';
import SubscriptionModal from './SubscriptionModal.vue';
import type { UserSubscription, FeatureUsage, PlanFeature } from '@/types/subscription';

const { t } = useTranslation();
const { formatDate: formatDateSafe } = useDateLocalization();

// Reactive state
const currentSubscription = ref<UserSubscription | null>(null);
const featureUsage = ref<Record<string, FeatureUsage>>({});
const loading = ref(true);
const error = ref<string | null>(null);
const showCancelDialog = ref(false);
const showSubscriptionModal = ref(false);
const cancelling = ref(false);

// Computed properties
const allFeaturesSorted = computed(() => {
  return (
    currentSubscription.value?.plan?.features?.slice().sort((a, b) => {
      const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    }) ?? []
  );
});

const isBooleanFeature = (feature: PlanFeature) =>
  feature.featureType === 'boolean' || feature.featureType === 'access';

const isFeatureEnabled = (feature: PlanFeature) => {
  if (!feature.isActive) {
    return false;
  }

  if (feature.featureType === 'boolean' || feature.featureType === 'access') {
    return feature.booleanValue !== false;
  }

  if (feature.featureType === 'limit') {
    return feature.limitValue != null && feature.limitValue > 0;
  }

  return feature.booleanValue === true;
};

// Methods
const formatDate = (dateString: string) => {
  return formatDateSafe(dateString);
};

const loadSubscriptionData = async () => {
  try {
    loading.value = true;
    error.value = null;

    const subscription = await subscriptionService.getMySubscription();

    if (subscription) {
      // User has an active subscription
      currentSubscription.value = subscription;
    } else {
      // No active subscription - set to null to show "choose plan" prompt
      console.info('No active subscription found, prompting user to choose a plan');
      currentSubscription.value = null;
    }

    // Load feature usage for limited features
    if (currentSubscription.value?.plan?.features) {
      const usagePromises = currentSubscription.value.plan.features
        .filter(f => f.featureType === 'limit')
        .map(async (feature) => {
          try {
            const usage = await subscriptionService.getFeatureUsage(feature.featureCode);
            return { featureCode: feature.featureCode, usage };
          } catch (err) {
            console.warn(`Failed to load usage for ${feature.featureCode}:`, err);
            return { featureCode: feature.featureCode, usage: { featureCode: feature.featureCode, period: 'monthly', usage: 0, limit: feature.limitValue, canUse: true } };
          }
        });

      const usageResults = await Promise.all(usagePromises);
      const usageMap: Record<string, FeatureUsage> = {};
      usageResults.forEach(result => {
        usageMap[result.featureCode] = result.usage;
      });
      featureUsage.value = usageMap;
    }
  } catch (err: any) {
    console.error('Failed to load subscription data:', err);
    error.value = err.response?.data?.message || t('subscription.error.loadFailed', 'Failed to load subscription information');
  } finally {
    loading.value = false;
  }
};

const cancelSubscription = async () => {
  try {
    cancelling.value = true;
    const result = await subscriptionService.cancelSubscription('User requested cancellation from profile page');

    if (result.success) {
      showCancelDialog.value = false;
      await loadSubscriptionData(); // Reload to show updated status
    } else {
      error.value = result.message || t('subscription.error.cancelFailed', 'Failed to cancel subscription');
    }
  } catch (err: any) {
    console.error('Failed to cancel subscription:', err);
    error.value = err.response?.data?.message || t('subscription.error.cancelFailed', 'Failed to cancel subscription');
  } finally {
    cancelling.value = false;
  }
};

const handleSubscriptionUpdate = async () => {
  showSubscriptionModal.value = false;
  await loadSubscriptionData(); // Refresh subscription data
};

// Lifecycle
onMounted(() => {
  loadSubscriptionData();
});

// Expose refresh method for parent components
defineExpose({
  refresh: loadSubscriptionData
});
</script>
