<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 2" :key="i" class="animate-pulse">
        <div class="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
          <div class="flex items-center space-x-4 flex-1">
            <div class="h-8 w-12 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
              <div class="h-3 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!paymentMethods || paymentMethods.length === 0" class="text-center py-8">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
      <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">{{ $t('billing.noPaymentMethods') }}</p>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-500">{{ $t('billing.noPaymentMethodsDescription') }}</p>
    </div>

    <!-- Payment Methods List -->
    <div v-else class="space-y-3">
      <div
        v-for="method in paymentMethods"
        :key="method.id"
        class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <!-- Card Info -->
        <div class="flex items-center space-x-4 flex-1">
          <!-- Card Icon -->
          <div class="flex-shrink-0">
            <component
              :is="getCardIcon(method.brand)"
              class="h-8 w-12 text-gray-600 dark:text-gray-400"
            />
          </div>

          <!-- Card Details -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-2">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ formatCardBrand(method.brand) }} •••• {{ method.last4 }}
              </p>
              <span
                v-if="method.isDefault"
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
              >
                {{ $t('billing.defaultPaymentMethod') }}
              </span>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ $t('billing.expiresOn', { month: method.expiryMonth, year: method.expiryYear }) }}
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center space-x-2 ml-4">
          <button
            v-if="!method.isDefault"
            @click="$emit('set-default', method.id)"
            class="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-600 dark:border-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            {{ $t('billing.setAsDefault') }}
          </button>
          <button
            @click="$emit('remove', method.id)"
            class="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            :title="$t('billing.removePaymentMethod')"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';
import type { PaymentMethod } from '@/types/subscription';

defineProps<{
  paymentMethods: PaymentMethod[];
  loading?: boolean;
}>();

defineEmits<{
  'set-default': [paymentMethodId: number];
  'remove': [paymentMethodId: number];
}>();

function formatCardBrand(brand?: string): string {
  if (!brand) return 'Card';

  const brandMap: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay'
  };

  return brandMap[brand.toLowerCase()] || brand;
}

function getCardIcon(brand?: string) {
  const iconClass = "h-full w-full";

  // Generic card icon as fallback
  const genericCard = () => h('svg', {
    class: iconClass,
    fill: 'none',
    viewBox: '0 0 48 32',
    stroke: 'currentColor'
  }, [
    h('rect', {
      x: 1,
      y: 1,
      width: 46,
      height: 30,
      rx: 4,
      'stroke-width': 2
    }),
    h('line', {
      x1: 1,
      y1: 11,
      x2: 47,
      y2: 11,
      'stroke-width': 2
    })
  ]);

  // You can add specific brand icons here if needed
  // For now, using generic card icon
  return genericCard;
}
</script>
