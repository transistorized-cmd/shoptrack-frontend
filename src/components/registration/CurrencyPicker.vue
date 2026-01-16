<template>
  <div class="currency-picker">
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      {{ $t('registration.selectCurrency') }}
    </label>

    <!-- Currency Selection -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      <button
        v-for="currency in availableCurrencies"
        :key="currency"
        @click="selectCurrency(currency)"
        type="button"
        class="flex items-center justify-center px-4 py-3 border-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-shoptrack-500 focus:ring-offset-2"
        :class="selectedCurrency === currency
          ? 'border-shoptrack-600 dark:border-shoptrack-500 bg-shoptrack-50 dark:bg-shoptrack-900/20 text-shoptrack-700 dark:text-shoptrack-300'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-shoptrack-300 dark:hover:border-shoptrack-700 hover:bg-gray-50 dark:hover:bg-gray-700'"
      >
        <span class="text-lg mr-2">{{ getCurrencySymbol(currency) }}</span>
        <span>{{ currency }}</span>
      </button>
    </div>

    <!-- No Currencies Available -->
    <div v-if="availableCurrencies.length === 0" class="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
      {{ $t('registration.noCurrenciesAvailable') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import type { PlanPricing } from '@/types/subscription';

const { t } = useTranslation();

const props = defineProps<{
  pricing: PlanPricing[];
  modelValue?: string;
  isFree?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [currency: string];
  'currency-selected': [currency: string];
}>();

const selectedCurrency = ref<string>(props.modelValue || '');

// Computed properties
const availableCurrencies = computed(() => {
  // Get unique currencies from pricing array (there will be multiple entries per currency for different periods)
  const currencies = [...new Set(props.pricing
    .filter(p => p.isActive)
    .map(p => p.currency))];
  return currencies.sort();
});

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  if (newValue && newValue !== selectedCurrency.value) {
    selectedCurrency.value = newValue;
  }
});

// Watch for available currencies changes
watch(availableCurrencies, (currencies) => {
  // Auto-select first currency if none selected
  if (currencies.length > 0 && !selectedCurrency.value) {
    selectCurrency(currencies[0]);
  }
  // Reset if selected currency is no longer available
  else if (selectedCurrency.value && !currencies.includes(selectedCurrency.value)) {
    if (currencies.length > 0) {
      selectCurrency(currencies[0]);
    } else {
      selectedCurrency.value = '';
    }
  }
}, { immediate: true });

// Methods
const selectCurrency = (currency: string) => {
  selectedCurrency.value = currency;
  emit('update:modelValue', currency);
  emit('currency-selected', currency);
};

const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$',
    NZD: 'NZ$',
    CHF: 'Fr',
    JPY: '¥',
    CNY: '¥',
    INR: '₹',
    BRL: 'R$',
    MXN: '$',
    SGD: 'S$',
    HKD: 'HK$',
    KRW: '₩',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    PLN: 'zł',
    CZK: 'Kč',
    HUF: 'Ft',
    RON: 'lei',
    ZAR: 'R',
    TRY: '₺',
    RUB: '₽',
    ILS: '₪',
    THB: '฿',
    MYR: 'RM',
    IDR: 'Rp',
    PHP: '₱',
    VND: '₫',
    ARS: '$',
    CLP: '$',
    COP: '$',
    PEN: 'S/',
  };

  return symbols[currency] || currency;
};
</script>

<style scoped>
.currency-picker {
  width: 100%;
}
</style>
