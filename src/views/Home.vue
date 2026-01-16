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
                {{ t('home.receiptsThisMonth') }}
              </dt>
              <dd class="text-lg font-medium text-gray-900 dark:text-white">
                {{ receiptsThisMonth }}
              </dd>
              <dd class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {{ t('home.receiptsLastMonth') }}: {{ receiptsLastMonth }}
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
              <span class="text-white font-semibold">💰</span>
            </div>
          </div>
          <div class="ml-5 w-0 flex-1">
            <dl>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {{ t('home.totalSpentThisMonth') }}
              </dt>
              <dd class="text-lg font-medium text-gray-900 dark:text-white">
                ${{ totalSpentThisMonth.toFixed(2) }}
              </dd>
              <dd class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {{ t('home.spentLastMonth') }}: ${{ totalSpentLastMonth.toFixed(2) }}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex flex-col h-full">
          <div class="flex items-center mb-3">
            <div class="flex-shrink-0">
              <div
                class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center"
              >
                <span class="text-white font-semibold">📊</span>
              </div>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                {{ t('home.topCategories') }}
              </h3>
            </div>
          </div>
          <div v-if="topCategories.length > 0" class="space-y-2 flex-1">
            <div
              v-for="(category, index) in topCategories"
              :key="category.category"
              class="flex items-center justify-between"
            >
              <div class="flex items-center space-x-2 flex-1 min-w-0">
                <span class="text-xs font-semibold text-gray-400 dark:text-gray-500">
                  {{ index + 1 }}.
                </span>
                <span class="text-sm font-medium text-gray-900 dark:text-white truncate capitalize">
                  {{ category.category }}
                </span>
              </div>
              <div class="text-right ml-2">
                <div class="text-sm font-bold text-gray-900 dark:text-white">
                  ${{ category.totalAmount.toFixed(2) }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ category.percentage.toFixed(1) }}%
                </div>
              </div>
            </div>
          </div>
          <div v-else class="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
            {{ t('home.noDataThisMonth') }}
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex flex-col h-full">
          <div class="flex items-center mb-3">
            <div class="flex-shrink-0">
              <div
                class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center"
              >
                <span class="text-white font-semibold">⏱️</span>
              </div>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                {{ t('home.spendingPace') }}
              </h3>
            </div>
          </div>

          <div v-if="spendingPace.hasSpending" class="flex-1">
            <!-- Daily Average -->
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              ${{ spendingPace.dailyAverage.toFixed(2) }}<span class="text-base font-normal text-gray-500 dark:text-gray-400">/day</span>
            </div>

            <!-- Days Remaining -->
            <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ spendingPace.daysRemaining }} {{ spendingPace.daysRemaining === 1 ? t('home.dayRemaining') : t('home.daysRemaining') }}
            </div>

            <!-- Projected Total -->
            <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600 dark:text-gray-300">{{ t('home.projected') }}:</span>
                <span class="text-lg font-semibold text-gray-900 dark:text-white">
                  ${{ spendingPace.projectedTotal.toFixed(2) }}
                </span>
              </div>

              <!-- Pace Comparison -->
              <div v-if="Math.abs(spendingPace.paceChange) > 5" class="mt-2 text-xs">
                <span :class="spendingPace.paceChange > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'">
                  {{ spendingPace.paceChange > 0 ? '↑' : '↓' }}
                  {{ Math.abs(spendingPace.paceChange).toFixed(1) }}%
                  {{ spendingPace.paceChange > 0 ? t('home.fasterThanLastMonth') : t('home.slowerThanLastMonth') }}
                </span>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="mt-3">
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  class="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                  :style="{ width: `${Math.min(spendingPace.progressPercent, 100)}%` }"
                />
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ Math.round(spendingPace.progressPercent) }}% {{ t('home.throughTheMonth') }}
              </div>
            </div>

            <!-- Early estimate warning -->
            <div v-if="spendingPace.isEarlyEstimate" class="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center">
              <span class="mr-1">ℹ️</span>
              <span>{{ t('home.earlyEstimate') }}</span>
            </div>
          </div>

          <div v-else class="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm py-4">
            {{ t('home.noSpendingYet') }}
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

    <!-- Shopping List Widget -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ShoppingListWidget />
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
                    ? formatDateSafe(receipt.receiptDate)
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
import { onMounted, computed, ref } from "vue";
import { useTranslation } from "@/composables/useTranslation";
import { useDateLocalization } from "@/composables/useDateLocalization";
import { RouterLink } from "vue-router";
import { useReceiptsStore } from "@/stores/receipts";
import { usePluginsStore } from "@/stores/plugins";
import ShoppingListWidget from "@/components/shopping-list/ShoppingListWidget.vue";
import api from "@/services/api";

const receiptsStore = useReceiptsStore();
const pluginsStore = usePluginsStore();
const { t } = useTranslation();
const { formatDate: formatDateSafe } = useDateLocalization();

const recentReceipts = computed(() => receiptsStore.receipts.slice(0, 5));

// Monthly data from backend analytics (respects subscription limits)
const monthlySpendingThisMonth = ref(0);
const monthlySpendingLastMonth = ref(0);
const monthlyReceiptsThisMonth = ref(0);
const monthlyReceiptsLastMonth = ref(0);

// Top 3 categories for current month
interface TopCategory {
  category: string;
  totalAmount: number;
  percentage: number;
}
const topCategories = ref<TopCategory[]>([]);

// Use backend analytics data for receipt count (respects subscription limits)
const receiptsThisMonth = computed(() => monthlyReceiptsThisMonth.value);

// Use backend analytics data for total spent (respects subscription limits)
const totalSpentThisMonth = computed(() => monthlySpendingThisMonth.value);

// Use backend analytics data for last month receipts (respects subscription limits)
const receiptsLastMonth = computed(() => monthlyReceiptsLastMonth.value);

// Use backend analytics data for last month (respects subscription limits)
const totalSpentLastMonth = computed(() => monthlySpendingLastMonth.value);

// Spending Pace Calculator
const spendingPace = computed(() => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const daysElapsed = Math.floor((now.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysRemaining = lastDay.getDate() - now.getDate();
  const totalDays = lastDay.getDate();

  const dailyAvg = monthlySpendingThisMonth.value / daysElapsed;
  const projected = dailyAvg * totalDays;

  // Calculate progress percentage
  const progressPercent = (daysElapsed / totalDays) * 100;

  // Compare to last month
  const lastMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  const lastMonthDailyAvg = lastMonthDays > 0 ? monthlySpendingLastMonth.value / lastMonthDays : 0;
  const paceChange = lastMonthDailyAvg > 0 ? ((dailyAvg - lastMonthDailyAvg) / lastMonthDailyAvg) * 100 : 0;

  return {
    dailyAverage: dailyAvg,
    daysRemaining: daysRemaining,
    projectedTotal: projected,
    paceChange: paceChange,
    progressPercent: progressPercent,
    isEarlyEstimate: daysElapsed <= 3,
    hasSpending: monthlySpendingThisMonth.value > 0,
  };
});

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

// Fetch monthly spending and receipt count data from backend
const fetchMonthlySpending = async () => {
  try {
    // Get current month date range
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDateThisMonth = firstDayThisMonth.toISOString().split('T')[0];
    const endDateThisMonth = now.toISOString().split('T')[0];

    // Get last month date range
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startDateLastMonth = firstDayLastMonth.toISOString().split('T')[0];
    const endDateLastMonth = lastDayLastMonth.toISOString().split('T')[0];

    // Fetch this month's spending data from analytics API
    const thisMonthAnalyticsParams = new URLSearchParams({
      startDate: startDateThisMonth,
      endDate: endDateThisMonth,
    });
    const thisMonthAnalyticsResponse = await api.get(`/analytics/categories?${thisMonthAnalyticsParams}`);
    const thisMonthData = Array.isArray(thisMonthAnalyticsResponse.data)
      ? thisMonthAnalyticsResponse.data
      : thisMonthAnalyticsResponse.data?.data || [];

    // Calculate total spending for this month
    monthlySpendingThisMonth.value = thisMonthData.reduce(
      (sum: number, cat: { totalAmount: number }) => sum + cat.totalAmount,
      0
    );

    // Get top 3 categories by spending for current month
    topCategories.value = thisMonthData
      .slice(0, 3) // Already sorted by totalAmount descending from backend
      .map((cat: { category: string; totalAmount: number; percentage: number }) => ({
        category: cat.category,
        totalAmount: cat.totalAmount,
        percentage: cat.percentage,
      }));

    // Fetch this month's receipt count from receipts API (respects subscription limits)
    const thisMonthReceiptsParams = new URLSearchParams({
      startDate: startDateThisMonth,
      endDate: endDateThisMonth,
      pageSize: '1', // We only need the totalCount from pagination metadata
    });
    const thisMonthReceiptsResponse = await api.get(`/receipts?${thisMonthReceiptsParams}`);
    monthlyReceiptsThisMonth.value = thisMonthReceiptsResponse.data?.totalCount || 0;

    // Fetch last month's spending data from analytics API
    const lastMonthAnalyticsParams = new URLSearchParams({
      startDate: startDateLastMonth,
      endDate: endDateLastMonth,
    });
    const lastMonthAnalyticsResponse = await api.get(`/analytics/categories?${lastMonthAnalyticsParams}`);
    const lastMonthData = Array.isArray(lastMonthAnalyticsResponse.data)
      ? lastMonthAnalyticsResponse.data
      : lastMonthAnalyticsResponse.data?.data || [];

    // Calculate total spending for last month
    monthlySpendingLastMonth.value = lastMonthData.reduce(
      (sum: number, cat: { totalAmount: number }) => sum + cat.totalAmount,
      0
    );

    // Fetch last month's receipt count from receipts API (respects subscription limits)
    const lastMonthReceiptsParams = new URLSearchParams({
      startDate: startDateLastMonth,
      endDate: endDateLastMonth,
      pageSize: '1', // We only need the totalCount from pagination metadata
    });
    const lastMonthReceiptsResponse = await api.get(`/receipts?${lastMonthReceiptsParams}`);
    monthlyReceiptsLastMonth.value = lastMonthReceiptsResponse.data?.totalCount || 0;
  } catch (error) {
    console.error('Error fetching monthly spending data:', error);
    // Fallback to 0 on error
    monthlySpendingThisMonth.value = 0;
    monthlySpendingLastMonth.value = 0;
    monthlyReceiptsThisMonth.value = 0;
    monthlyReceiptsLastMonth.value = 0;
    topCategories.value = [];
  }
};

onMounted(async () => {
  await Promise.all([
    receiptsStore.fetchReceipts({ pageSize: 10 }),
    pluginsStore.fetchAllPlugins(),
    fetchMonthlySpending(),
  ]);
});
</script>
