<template>
  <div class="space-y-6">
    <!-- Price Trends -->
    <div v-if="data.itemTrends && data.itemTrends.length > 0">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">{{ $t('priceTrends.title') }}</h3>
      <div class="space-y-6">
        <div
          v-for="item in data.itemTrends"
          :key="item.itemName"
          class="card p-6"
        >
          <!-- Item Header -->
          <div class="flex items-center justify-between mb-4">
            <div>
              <h4 class="text-lg font-medium text-gray-900 dark:text-white">
                {{ item.itemName }}
              </h4>
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                {{ getLocalizedCategoryName(item) }}
              </span>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('priceTrendsReport.averagePrice') }}</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white">
                ${{ item.overallAveragePrice?.toFixed(2) }}
              </p>
            </div>
          </div>

          <!-- Price Statistics -->
          <div class="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div class="text-center">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                ${{ item.minPrice?.toFixed(2) }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('priceTrendsReport.minPrice') }}</p>
            </div>
            <div class="text-center">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                ${{ item.maxPrice?.toFixed(2) }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('priceTrendsReport.maxPrice') }}</p>
            </div>
            <div class="text-center">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ item.priceVolatility?.toFixed(1) }}%
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('priceTrendsReport.volatility') }}</p>
            </div>
            <div class="text-center">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ item.totalTransactions }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('priceTrendsReport.transactions') }}</p>
            </div>
          </div>

          <!-- Price Chart -->
          <div
            v-if="item.priceHistory && item.priceHistory.length > 1"
            class="mb-6"
          >
            <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {{ $t('priceTrendsReport.priceTrendChart') }}
            </h5>
            <div class="bg-white dark:bg-gray-700 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <SimpleLineChart
                :data="getChartData(item)"
                :options="chartOptions"
                :height="200"
                @chart:render="onChartRender"
              />
            </div>
          </div>

          <!-- Price History -->
          <div v-if="item.priceHistory && item.priceHistory.length > 0">
            <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ $t('priceTrendsReport.priceHistory') }}
            </h5>
            <div class="space-y-2">
              <div
                v-for="(pricePoint, index) in item.priceHistory"
                :key="index"
                class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <div class="flex items-center space-x-4">
                  <span class="text-sm text-gray-600 dark:text-gray-300">{{
                    formatDate(pricePoint.date)
                  }}</span>
                  <span class="text-sm text-gray-500 dark:text-gray-400"
                    >{{ $t('priceTrendsReport.transactionCount', { count: pricePoint.transactionCount }) }}</span
                  >
                </div>
                <div class="flex items-center space-x-4">
                  <div class="text-right">
                    <span class="text-sm font-medium text-gray-900 dark:text-white"
                      >${{ pricePoint.averagePrice?.toFixed(2) }}</span
                    >
                    <span
                      v-if="pricePoint.minPrice !== pricePoint.maxPrice"
                      class="text-xs text-gray-500 dark:text-gray-400 block"
                    >
                      ${{ pricePoint.minPrice?.toFixed(2) }} - ${{
                        pricePoint.maxPrice?.toFixed(2)
                      }}
                    </span>
                  </div>
                  <div class="text-right min-w-[60px]">
                    <span
                      class="text-sm font-medium"
                      :class="
                        getPriceChangeClass(
                          calculatePercentageChange(item.priceHistory, index),
                        )
                      "
                    >
                      {{
                        formatPercentageChange(
                          calculatePercentageChange(item.priceHistory, index),
                        )
                      }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Data State -->
    <div
      v-if="!data.itemTrends || data.itemTrends.length === 0"
      class="text-center py-8"
    >
      <p class="text-gray-500 dark:text-gray-400">
        {{ $t('priceTrendsReport.noDataForPeriod') }}
      </p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">
        {{ $t('priceTrendsReport.multipleTransactionsNeeded') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useDark } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import { useDateLocalization } from "@/composables/useDateLocalization";
import { useCategoriesStore } from "@/stores/categories";
import { getCurrentLocale } from "@/i18n";
import SimpleLineChart from "@/components/charts/SimpleLineChart.vue";
import type { ChartOptions } from "chart.js";

defineProps<{
  data: any;
}>();

// Chart references for cleanup
const chartRefs = ref<any[]>([]);
const chartInstances = ref<any[]>([]);

// Dark mode detection
const isDark = useDark();

// Internationalization
const { t } = useI18n();

// Date localization
const { formatDate } = useDateLocalization();

// Categories store for localized names
const categoriesStore = useCategoriesStore();

// Function to get localized category name from the new format
const getLocalizedCategoryName = (item: any) => {
  // First try to use the new categoryInfo object if available
  if (item.categoryInfo && item.categoryInfo.id) {
    const localizedName = categoriesStore.getName(item.categoryInfo.id, getCurrentLocale());
    return localizedName || item.categoryInfo.name || item.category || 'Uncategorized';
  }

  // Fallback to the old logic for backward compatibility
  if (item.category) {
    const category = categoriesStore.byLocale[getCurrentLocale()]?.find(c => c.name === item.category);
    if (category) {
      const localizedName = categoriesStore.getName(category.id, getCurrentLocale());
      return localizedName || item.category;
    }
    return item.category;
  }

  return 'Uncategorized';
};

// Handle chart render event
const onChartRender = (chart: any) => {
  if (chart) {
    chartInstances.value.push(chart);
  }
};

// Cleanup function
onUnmounted(() => {
  // Clean up chart instances
  chartInstances.value.forEach((chart) => {
    try {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    } catch (error) {
      console.warn('Error destroying chart:', error);
    }
  });
  
  chartRefs.value = [];
  chartInstances.value = [];
});

// formatDate is now provided by useDateLocalization composable

const calculatePercentageChange = (
  priceHistory: any[],
  currentIndex: number,
) => {
  if (currentIndex === 0) {
    return null; // First entry has no previous day to compare to
  }

  const previousPrice = priceHistory[currentIndex - 1].averagePrice;
  const currentPrice = priceHistory[currentIndex].averagePrice;

  if (!previousPrice || previousPrice === 0) return 0;

  return ((currentPrice - previousPrice) / previousPrice) * 100;
};

const formatPercentageChange = (percentage: number | null) => {
  if (percentage === null) return "-"; // Only for the first entry
  if (percentage === 0) return "0.0%";
  const sign = percentage > 0 ? "+" : "";
  return `${sign}${percentage.toFixed(1)}%`;
};

const getPriceChangeClass = (percentage: number | null) => {
  if (percentage === null || percentage === 0) return "text-gray-500 dark:text-gray-400";
  return percentage > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400";
};

// Memoized chart configuration
const chartOptions = computed<ChartOptions<"line">>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: "index" as const,
  },
  scales: {
    x: {
      title: {
        display: true,
        text: t('priceTrendsReport.chartDateLabel'),
        color: isDark.value ? "#D1D5DB" : "#374151", // gray-300 in dark, gray-700 in light
      },
      ticks: {
        color: isDark.value ? "#9CA3AF" : "#6B7280", // gray-400 in dark, gray-500 in light
      },
      grid: {
        color: isDark.value ? "#374151" : "#F3F4F6", // gray-700 in dark, gray-100 in light
      },
    },
    y: {
      title: {
        display: true,
        text: t('priceTrendsReport.chartPriceLabel'),
        color: isDark.value ? "#D1D5DB" : "#374151", // gray-300 in dark, gray-700 in light
      },
      ticks: {
        color: isDark.value ? "#9CA3AF" : "#6B7280", // gray-400 in dark, gray-500 in light
      },
      beginAtZero: false,
      grid: {
        color: isDark.value ? "#374151" : "#F3F4F6", // gray-700 in dark, gray-100 in light
      },
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: isDark.value ? "rgba(17, 24, 39, 0.95)" : "rgba(255, 255, 255, 0.95)", // gray-900 in dark, white in light
      titleColor: isDark.value ? "#F9FAFB" : "#111827", // gray-50 in dark, gray-900 in light
      bodyColor: isDark.value ? "#D1D5DB" : "#374151", // gray-300 in dark, gray-700 in light
      borderColor: isDark.value ? "#4B5563" : "#D1D5DB", // gray-600 in dark, gray-300 in light
      borderWidth: 1,
      callbacks: {
        label: function (context) {
          return `$${context.parsed.y.toFixed(2)}`;
        },
      },
    },
  },
  elements: {
    point: {
      radius: 3,
      hoverRadius: 5,
      borderWidth: 2,
    },
    line: {
      tension: 0.2,
      borderWidth: 2,
    },
  },
  // Performance optimizations
  animation: {
    duration: 500,
  },
  datasets: {
    line: {
      pointHoverRadius: 6,
    },
  },
}));

// Memoized chart data generation
const getChartData = computed(() => {
  const chartDataCache = new Map();

  return (item: any) => {
    // Use item name as cache key
    const cacheKey = `${item.itemName}-${item.priceHistory?.length || 0}`;

    if (chartDataCache.has(cacheKey)) {
      return chartDataCache.get(cacheKey);
    }

    if (!item.priceHistory || item.priceHistory.length === 0) {
      const emptyData = { labels: [], datasets: [] };
      chartDataCache.set(cacheKey, emptyData);
      return emptyData;
    }

    const labels = item.priceHistory.map((point: any) =>
      formatDate(point.date),
    );
    const prices = item.priceHistory.map((point: any) => point.averagePrice);

    const chartData = {
      labels,
      datasets: [
        {
          label: item.itemName,
          data: prices,
          borderColor: isDark.value ? "#60A5FA" : "#0EA5E9", // blue-400 in dark, blue-500 in light
          backgroundColor: isDark.value ? "rgba(96, 165, 250, 0.1)" : "rgba(14, 165, 233, 0.1)", // blue-400/blue-500 with opacity
          borderWidth: 2,
          fill: false,
          pointBackgroundColor: isDark.value ? "#60A5FA" : "#0EA5E9", // blue-400 in dark, blue-500 in light
          pointBorderColor: isDark.value ? "#3B82F6" : "#0284C7", // blue-500 in dark, blue-600 in light
          pointBorderWidth: 2,
          // Performance optimizations
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.2,
        },
      ],
    };

    chartDataCache.set(cacheKey, chartData);
    return chartData;
  };
});
</script>
