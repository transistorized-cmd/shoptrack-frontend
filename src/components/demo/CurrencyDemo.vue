<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold mb-6">Smart Currency Display Demo</h2>

    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
      <h3 class="text-lg font-semibold mb-4">Current User Settings</h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Preferred Currency
          </label>
          <select
            v-model="selectedUserCurrency"
            class="w-full p-2 border border-gray-300 rounded-md"
            @change="updateUserCurrency"
          >
            <option v-for="currency in currencyOptions" :key="currency.code" :value="currency.code">
              {{ currency.symbol }} {{ currency.name }} ({{ currency.code }})
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold mb-4">Smart Currency Display Examples</h3>

      <div class="space-y-6">
        <!-- Same Currency Examples -->
        <div>
          <h4 class="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
            Same Currency (Receipt currency matches user preference)
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <div class="text-sm text-gray-600 dark:text-gray-400">Amount: $20.00</div>
              <div class="text-lg font-semibold">{{ formatAmountCompact(20.00, selectedUserCurrency) }}</div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <div class="text-sm text-gray-600 dark:text-gray-400">Amount: $150.50</div>
              <div class="text-lg font-semibold">{{ formatAmountCompact(150.50, selectedUserCurrency) }}</div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <div class="text-sm text-gray-600 dark:text-gray-400">Amount: $1,234.56</div>
              <div class="text-lg font-semibold">{{ formatAmountCompact(1234.56, selectedUserCurrency) }}</div>
            </div>
          </div>
        </div>

        <!-- Different Currency Examples -->
        <div>
          <h4 class="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
            Different Currency (Receipt currency differs from user preference)
          </h4>

          <!-- Unique Symbol Examples -->
          <div class="mb-4">
            <h5 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Unique Symbols (€, ¥, £, ₹)</h5>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                <div class="text-sm text-gray-600 dark:text-gray-400">EUR Receipt</div>
                <div class="text-lg font-semibold">{{ formatAmountCompact(20.00, 'EUR') }}</div>
              </div>
              <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                <div class="text-sm text-gray-600 dark:text-gray-400">GBP Receipt</div>
                <div class="text-lg font-semibold">{{ formatAmountCompact(20.00, 'GBP') }}</div>
              </div>
              <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                <div class="text-sm text-gray-600 dark:text-gray-400">JPY Receipt</div>
                <div class="text-lg font-semibold">{{ formatAmountCompact(2000, 'JPY') }}</div>
              </div>
              <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                <div class="text-sm text-gray-600 dark:text-gray-400">INR Receipt</div>
                <div class="text-lg font-semibold">{{ formatAmountCompact(1500, 'INR') }}</div>
              </div>
            </div>
          </div>

          <!-- Shared Symbol Examples -->
          <div>
            <h5 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Shared Symbols ($ currencies with currency code)</h5>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
                <div class="text-sm text-gray-600 dark:text-gray-400">USD Receipt</div>
                <div class="text-lg font-semibold">{{ formatAmountCompact(20.00, 'USD') }}</div>
                <div class="text-xs text-gray-500 mt-1">
                  {{ selectedUserCurrency === 'USD' ? 'Same as user preference' : 'Different from user preference' }}
                </div>
              </div>
              <div class="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
                <div class="text-sm text-gray-600 dark:text-gray-400">CAD Receipt</div>
                <div class="text-lg font-semibold">{{ formatAmountCompact(25.00, 'CAD') }}</div>
              </div>
              <div class="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
                <div class="text-sm text-gray-600 dark:text-gray-400">MXN Receipt</div>
                <div class="text-lg font-semibold">{{ formatAmountCompact(350.00, 'MXN') }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Requirements Examples -->
        <div>
          <h4 class="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
            Examples from Requirements
          </h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span>User: EUR, Receipt: EUR → Expected: €20.00</span>
              <span class="font-mono">{{ formatAmountCompact(20.00, 'EUR') }}</span>
            </div>
            <div class="flex justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span>User: EUR, Receipt: USD → Expected: $20.00 USD</span>
              <span class="font-mono">{{ formatCurrencyForDemo(20.00, 'USD', 'EUR') }}</span>
            </div>
            <div class="flex justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span>User: EUR, Receipt: MXN → Expected: $20.00 MXN</span>
              <span class="font-mono">{{ formatCurrencyForDemo(20.00, 'MXN', 'EUR') }}</span>
            </div>
            <div class="flex justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span>User: USD, Receipt: EUR → Expected: €20.00</span>
              <span class="font-mono">{{ formatCurrencyForDemo(20.00, 'EUR', 'USD') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useCurrencyFormat } from '@/composables/useCurrencyFormat';
import { useSettingsStore } from '@/stores/settings';
import { CURRENCY_OPTIONS } from '@/types/settings';
import { formatCurrency } from '@/utils/currencyFormat';

const settingsStore = useSettingsStore();
const { formatAmountCompact } = useCurrencyFormat();

const currencyOptions = CURRENCY_OPTIONS;
const selectedUserCurrency = ref(settingsStore.userCurrency || 'USD');

const updateUserCurrency = async () => {
  try {
    await settingsStore.updateCurrency(selectedUserCurrency.value);
  } catch (error) {
    console.error('Failed to update currency:', error);
  }
};

// Helper function for demo that allows us to override user preference
const formatCurrencyForDemo = (amount: number, receiptCurrency: string, userCurrency: string) => {
  return formatCurrency(amount, receiptCurrency, userCurrency);
};
</script>