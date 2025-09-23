<template>
  <div class="space-y-6">
    <!-- Hero Section -->
    <div class="text-center px-4 sm:px-0">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white sm:text-4xl lg:text-5xl">
        {{ t('home.welcomeToShopTrack') }}
      </h1>
      <p class="mt-3 sm:mt-4 text-lg sm:text-xl text-gray-600 dark:text-gray-300">
        {{ t('home.intelligentReceiptTracking') }}
      </p>
    </div>

    <!-- Quick Stats -->
    <div
      v-if="!receiptsStore.loading"
      class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div class="card p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div
              class="w-8 h-8 bg-shoptrack-500 rounded-md flex items-center justify-center"
            >
              <span class="text-white font-semibold">📄</span>
            </div>
          </div>
          <div class="ml-5 w-0 flex-1">
            <dl>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {{ t('home.totalReceipts') }}
              </dt>
              <dd class="text-lg font-medium text-gray-900 dark:text-white">
                {{ receiptsStore.pagination.totalCount }}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div
              class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center"
            >
              <span class="text-white font-semibold">⏳</span>
            </div>
          </div>
          <div class="ml-5 w-0 flex-1">
            <dl>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {{ t('home.pending') }}
              </dt>
              <dd class="text-lg font-medium text-gray-900 dark:text-white">
                {{ receiptsStore.pendingReceipts.length }}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div
              class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center"
            >
              <span class="text-white font-semibold">✅</span>
            </div>
          </div>
          <div class="ml-5 w-0 flex-1">
            <dl>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {{ t('home.completed') }}
              </dt>
              <dd class="text-lg font-medium text-gray-900 dark:text-white">
                {{ receiptsStore.completedReceipts.length }}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div
              class="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center"
            >
              <span class="text-white font-semibold">🔌</span>
            </div>
          </div>
          <div class="ml-5 w-0 flex-1">
            <dl>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {{ t('home.availablePlugins') }}
              </dt>
              <dd class="text-lg font-medium text-gray-900 dark:text-white">
                {{ pluginsStore.receiptPlugins.length }}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card p-4 sm:p-6">
      <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">{{ t('home.quickActions') }}</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RouterLink
          to="/upload"
          class="flex items-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-shoptrack-400 hover:bg-shoptrack-50 dark:hover:border-shoptrack-400 dark:hover:bg-shoptrack-900/20 transition-colors group"
        >
          <div class="flex-shrink-0">
            <div
              class="w-10 h-10 bg-shoptrack-500 rounded-lg flex items-center justify-center group-hover:bg-shoptrack-600"
            >
              <span class="text-white text-lg">📤</span>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ t('home.uploadReceipt') }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('home.processNewReceipts') }}</p>
          </div>
        </RouterLink>

        <RouterLink
          to="/receipts"
          class="flex items-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-shoptrack-400 hover:bg-shoptrack-50 dark:hover:border-shoptrack-400 dark:hover:bg-shoptrack-900/20 transition-colors group"
        >
          <div class="flex-shrink-0">
            <div
              class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center group-hover:bg-blue-600"
            >
              <span class="text-white text-lg">📋</span>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ t('home.viewReceipts') }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('home.manageYourReceipts') }}</p>
          </div>
        </RouterLink>

        <RouterLink
          to="/reports"
          class="flex items-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-shoptrack-400 hover:bg-shoptrack-50 dark:hover:border-shoptrack-400 dark:hover:bg-shoptrack-900/20 transition-colors group"
        >
          <div class="flex-shrink-0">
            <div
              class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center group-hover:bg-green-600"
            >
              <span class="text-white text-lg">📊</span>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ t('home.viewReports') }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('home.analyzeYourSpending') }}</p>
          </div>
        </RouterLink>
      </div>
    </div>

    <!-- Recent Receipts -->
    <div v-if="receiptsStore.hasReceipts" class="card p-4 sm:p-6">
      <div class="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:items-center sm:justify-between mb-4">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white">{{ t('home.recentReceipts') }}</h2>
        <RouterLink
          to="/receipts"
          class="text-sm text-shoptrack-600 hover:text-shoptrack-500 dark:text-shoptrack-400 dark:hover:text-shoptrack-300 text-center sm:text-right"
        >
          {{ t('home.viewAll') }}
        </RouterLink>
      </div>
      <div class="space-y-3">
        <div
          v-for="receipt in recentReceipts"
          :key="receipt.id"
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors space-y-2 sm:space-y-0"
        >
          <div class="flex items-center flex-1 min-w-0">
            <div class="flex-shrink-0">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                :class="getStatusColor(receipt.processingStatus)"
              >
                {{ getStatusIcon(receipt.processingStatus) }}
              </div>
            </div>
            <div class="ml-3 flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                {{ receipt.filename }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{
                  receipt.receiptDate
                    ? new Date(receipt.receiptDate).toLocaleDateString()
                    : t('home.noDate')
                }}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between sm:justify-end sm:space-x-4">
            <div class="text-left sm:text-right">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ receipt.successfullyParsed }} {{ t('home.items') }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {{ receipt.processingStatus }}
              </p>
            </div>
            <div class="flex-shrink-0">
              <RouterLink
                :to="`/receipts/${receipt.id}`"
                class="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-shoptrack-500 dark:focus:ring-offset-gray-800 transition-colors"
              >
                <svg class="w-3 h-3 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span class="hidden sm:inline ml-1">{{ t('common.view') }}</span>
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="receiptsStore.loading || pluginsStore.loading"
      class="text-center py-12"
    >
      <div class="inline-flex items-center space-x-2">
        <svg
          class="animate-spin h-5 w-5 text-shoptrack-600"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span class="text-gray-500 dark:text-gray-400">{{ t('home.loading') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from "vue";
import { useTranslation } from "@/composables/useTranslation";
import { RouterLink } from "vue-router";
import { useReceiptsStore } from "@/stores/receipts";
import { usePluginsStore } from "@/stores/plugins";

const receiptsStore = useReceiptsStore();
const pluginsStore = usePluginsStore();
const { t } = useTranslation();

const recentReceipts = computed(() => receiptsStore.receipts.slice(0, 5));

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-600";
    case "pending":
      return "bg-yellow-100 text-yellow-600";
    case "processing":
      return "bg-blue-100 text-blue-600";
    case "failed":
      return "bg-red-100 text-red-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return "✓";
    case "pending":
      return "⏳";
    case "processing":
      return "⚡";
    case "failed":
      return "❌";
    default:
      return "❓";
  }
};

onMounted(async () => {
  await Promise.all([
    receiptsStore.fetchReceipts({ pageSize: 10 }),
    pluginsStore.fetchAllPlugins(),
  ]);
});
</script>
