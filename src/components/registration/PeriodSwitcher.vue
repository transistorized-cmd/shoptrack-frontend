<template>
  <div class="period-switcher flex justify-center">
    <div class="bg-white dark:bg-gray-700 rounded-lg p-1 shadow-sm inline-flex">
      <button
        v-for="period in availablePeriods"
        :key="period.value"
        @click="selectPeriod(period.value)"
        :class="[
          'px-4 py-2 rounded-md font-medium text-sm transition-colors',
          selectedPeriod === period.value
            ? 'bg-shoptrack-600 text-white dark:bg-shoptrack-700'
            : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
        ]"
      >
        {{ period.label }}
        <span v-if="period.savings && period.savings > 0" class="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded">
          {{ $t('subscriptions.save') }} {{ period.savings }}%
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

export interface PeriodOption {
  value: 'Monthly' | 'Yearly' | 'Quarterly' | 'Biannual';
  label: string;
  savings?: number; // Percentage savings compared to monthly
}

const props = defineProps<{
  availablePeriods: PeriodOption[];
  selectedPeriod: 'Monthly' | 'Yearly' | 'Quarterly' | 'Biannual';
}>();

const emit = defineEmits<{
  'period-selected': [period: 'Monthly' | 'Yearly' | 'Quarterly' | 'Biannual'];
}>();

const { t } = useI18n();

function selectPeriod(period: 'Monthly' | 'Yearly' | 'Quarterly' | 'Biannual') {
  emit('period-selected', period);
}
</script>

<style scoped>
.period-switcher {
  width: 100%;
}
</style>
