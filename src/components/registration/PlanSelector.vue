<template>
  <div class="plan-selector">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-shoptrack-600 dark:border-shoptrack-400"></div>
      <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">{{ $t('common.loading', 'Loading plans...') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div class="flex items-start">
        <svg class="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div class="ml-3">
          <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Plans Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="plan in plans"
        :key="plan.id"
        @click="selectPlan(plan)"
        class="relative border-2 rounded-lg p-6 cursor-pointer transition-all hover:shadow-lg"
        :class="selectedPlanId === plan.id ? 'border-shoptrack-600 dark:border-shoptrack-500 bg-shoptrack-50 dark:bg-shoptrack-900/20 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-shoptrack-300 dark:hover:border-shoptrack-700'"
      >
        <!-- Selection Indicator -->
        <div v-if="selectedPlanId === plan.id" class="absolute top-4 right-4">
          <svg class="h-6 w-6 text-shoptrack-600 dark:text-shoptrack-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        </div>

        <!-- Plan Name -->
        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {{ plan.name }}
        </h3>

        <!-- Plan Description -->
        <p v-if="plan.description" class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {{ plan.description }}
        </p>

        <!-- Trial Badge -->
        <div v-if="plan.allowTrial && plan.trialDays > 0" class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 mb-4">
          <svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ plan.trialDays }} {{ $t('registration.dayFreeTrial', 'day free trial') }}
        </div>

        <!-- Free Badge -->
        <div v-else-if="plan.isFree" class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 mb-4">
          <svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          {{ $t('registration.free', 'Free Forever') }}
        </div>

        <!-- Pricing Display -->
        <div v-if="!plan.isFree && getPricingForCurrency(plan)" class="mb-4">
          <div class="flex items-baseline">
            <span class="text-3xl font-bold text-gray-900 dark:text-white">
              {{ formatPrice(getPricingForCurrency(plan)!.price, getPricingForCurrency(plan)!.currency) }}
            </span>
            <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">
              / {{ getPeriodLabel(getPricingForCurrency(plan)?.periodType ? normalizePeriodType(getPricingForCurrency(plan)!.periodType) : undefined) }}
            </span>
          </div>
          <p v-if="plan.allowTrial && plan.trialDays > 0" class="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {{ $t('registration.afterTrial', 'after trial period') }}
          </p>
        </div>

        <!-- Features List -->
        <div v-if="plan.features && plan.features.length > 0" class="space-y-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div
            v-for="feature in visibleFeatures(plan)"
            :key="feature.id"
            class="flex items-start text-sm"
          >
            <svg class="h-5 w-5 text-green-500 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span class="text-gray-700 dark:text-gray-300">
              {{ formatFeature(feature) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { subscriptionService } from '@/services/subscription.service';
import { normalizePeriodType } from '@/types/subscription';
import type { PublicPlan, PlanFeature, PlanPricing } from '@/types/subscription';

const { t } = useTranslation();

const props = defineProps<{
  selectedPlanId?: number | null;
  selectedCurrency?: string;
  selectedPeriod?: 'Monthly' | 'Yearly' | 'Quarterly' | 'Biannual';
}>();

const emit = defineEmits<{
  'plan-selected': [plan: PublicPlan];
  'plans-loaded': [plans: PublicPlan[]];
}>();

const plans = ref<PublicPlan[]>([]);
const selectedPlanId = ref<number | null>(props.selectedPlanId || null);
const loading = ref(false);
const error = ref<string | null>(null);

const loadPlans = async () => {
  loading.value = true;
  error.value = null;

  try {
    const response = await subscriptionService.getPublicPlans();
    plans.value = response.plans;

    // Emit loaded plans so parent can calculate available periods
    emit('plans-loaded', plans.value);

    // Auto-select trial plan (paid plan with trial) if none selected
    if (plans.value.length > 0 && !selectedPlanId.value) {
      const trialPlan = plans.value.find(p => p.allowTrial && !p.isFree);
      selectPlan(trialPlan || plans.value[0]);
    }
  } catch (err: any) {
    console.error('Failed to load public plans:', err);
    error.value = err.response?.data?.message || t('registration.plansLoadError', 'Failed to load subscription plans');
  } finally {
    loading.value = false;
  }
};

// Get pricing for current currency and period type
const getPricingForCurrency = (plan: PublicPlan, periodType?: 'Monthly' | 'Yearly' | 'Quarterly' | 'Biannual'): PlanPricing | null => {
  if (!plan.pricing || plan.pricing.length === 0) return null;

  const currency = props.selectedCurrency || 'USD';
  const period = periodType || props.selectedPeriod || 'Monthly';

  // First try to find exact match for currency and period (normalize backend enum values)
  const exactMatch = plan.pricing.find(p => p.currency === currency && normalizePeriodType(p.periodType) === period);
  if (exactMatch) return exactMatch;

  // Fallback to any price for the currency
  const currencyMatch = plan.pricing.find(p => p.currency === currency);
  if (currencyMatch) return currencyMatch;

  // Last resort: return first available price
  return plan.pricing[0];
};

const formatPrice = (price: number, currency: string): string => {
  if (price === 0) return t('registration.free', 'Free');

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(price);
};

const getPeriodLabel = (periodType: 'Monthly' | 'Yearly' | 'Quarterly' | 'Biannual' | undefined | null): string => {
  if (!periodType) return t('registration.month', 'month');

  const labels: Record<string, string> = {
    Monthly: t('registration.month', 'month'),
    Quarterly: t('registration.quarter', 'quarter'),
    Biannual: t('registration.halfYear', '6 months'),
    Yearly: t('registration.year', 'year')
  };

  // Return the label if it exists, otherwise return the default
  return labels[periodType] || t('registration.month', 'month');
};

const formatFeature = (feature: PlanFeature): string => {
  if (feature.featureType === 'limit' && feature.limitValue !== null && feature.limitValue !== undefined) {
    return `${feature.featureName}: ${feature.limitValue} ${feature.unitType || ''}`.trim();
  }
  return feature.featureName;
};

const visibleFeatures = (plan: PublicPlan): PlanFeature[] => {
  return plan.features
    .filter(f => f.isActive && (f.featureType !== 'boolean' || f.booleanValue))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .slice(0, 5); // Show max 5 features
};

const selectPlan = (plan: PublicPlan) => {
  selectedPlanId.value = plan.id;
  emit('plan-selected', plan);
};

onMounted(() => {
  loadPlans();
});
</script>

<style scoped>
.plan-selector {
  width: 100%;
}
</style>
