<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="text-center sm:text-left">
      <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{{ $t('reports.title') }}</h1>
      <p class="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
        {{ $t('reports.subtitle') }}
      </p>
    </div>

    <!-- Report Plugins -->
    <div class="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
      <div
        v-for="plugin in localizedReportPlugins"
        :key="plugin.key"
        class="card p-6"
      >
        <!-- Plugin Header -->
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
          <div class="flex items-center flex-1">
            <div
              class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-white text-lg sm:text-xl flex-shrink-0"
              :style="{ backgroundColor: plugin.color }"
            >
              {{ plugin.icon }}
            </div>
            <div class="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 class="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                {{ plugin.name }}
              </h3>
              <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{{ plugin.description }}</p>
            </div>
          </div>

          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 flex-shrink-0 self-start sm:self-auto"
          >
            {{ plugin.category }}
          </span>
        </div>

        <!-- Plugin Details -->
        <div class="mb-6 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div class="flex items-center">
            <span class="w-4 h-4 mr-2">📅</span>
            <span>{{
              plugin.requiresDateRange
                ? $t('reports.dateRangeRequired')
                : $t('reports.noDateRangeRequired')
            }}</span>
          </div>
          <div class="flex items-center">
            <span class="w-4 h-4 mr-2">📊</span>
            <span>{{
              plugin.supportsExport ? $t('reports.exportSupported') : $t('reports.viewOnly')
            }}</span>
          </div>
          <div
            v-if="plugin.supportedExportFormats && plugin.supportedExportFormats.length > 0"
            class="flex items-center"
          >
            <span class="w-4 h-4 mr-2">💾</span>
            <span
              >{{ $t('reports.formats') }}:
              {{ plugin.supportedExportFormats.join(", ").toUpperCase() }}</span
            >
          </div>
        </div>

        <!-- Date Range Selection (if required) -->
        <div v-if="plugin.requiresDateRange" class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >{{ $t('reports.dateRange') }}</label
            >
            <button
              v-if="hasActiveFilter(plugin.key)"
              type="button"
              class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
              @click="handleClearDateRange(plugin.key)"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              {{ $t('reports.clearDates') }}
            </button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="relative">
              <LocalizedDateInput
                :model-value="getDateRange(plugin.key).startDate"
                :min-date="getMinDateForPlugin(plugin)"
                :max-date="getMaxDateForPlugin(plugin)"
                class="input text-sm"
                @update:model-value="
                  handleUpdateDateRange(
                    plugin.key,
                    'startDate',
                    $event,
                  )
                "
              />
              <button
                v-if="getDateRange(plugin.key).startDate"
                type="button"
                class="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                :title="$t('reports.clearStartDate')"
                @click="handleClearDateField(plugin.key, 'startDate')"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="relative">
              <LocalizedDateInput
                :model-value="getDateRange(plugin.key).endDate"
                :min-date="getMinDateForPlugin(plugin)"
                :max-date="getMaxDateForPlugin(plugin)"
                class="input text-sm"
                @update:model-value="
                  handleUpdateDateRange(
                    plugin.key,
                    'endDate',
                    $event,
                  )
                "
              />
              <button
                v-if="getDateRange(plugin.key).endDate"
                type="button"
                class="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                :title="$t('reports.clearEndDate')"
                @click="handleClearDateField(plugin.key, 'endDate')"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Premium Feature Notice -->
        <div v-if="plugin.isPremiumFeature && !plugin.isAccessible" class="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-amber-800 dark:text-amber-200">Premium Feature</h3>
              <div class="mt-1 text-sm text-amber-700 dark:text-amber-300">
                {{ plugin.accessMessage || 'This feature requires a premium subscription.' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <button
            :disabled="
              !plugin.isAccessible ||
              (plugin.requiresDateRange && !isDateRangeValid(plugin.key))
            "
            class="btn disabled:opacity-50 w-full sm:w-auto"
            :class="plugin.isAccessible ? 'btn-primary' : 'btn-secondary'"
            @click="generateReport(plugin)"
          >
            <span v-if="!plugin.isAccessible">
              🔒 {{ $t('reports.upgradeRequired') }}
            </span>
            <span v-else>
              {{
                loadingReports[plugin.key] ? $t('reports.generating') : $t('reports.generateReport')
              }}
            </span>
          </button>

          <div v-if="plugin.supportsExport && plugin.supportedExportFormats && plugin.isAccessible" class="flex flex-wrap gap-2 justify-center sm:justify-end">
            <button
              v-for="format in plugin.supportedExportFormats"
              :key="format"
              :disabled="!currentReports[plugin.key]"
              class="btn btn-secondary disabled:opacity-50 text-sm px-3 py-1.5"
              @click="exportReport(plugin, format)"
            >
              {{ format.toUpperCase() }}
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loadingReports[plugin.key]" class="mt-4 text-center py-4">
          <div class="inline-flex items-center space-x-2 text-sm text-gray-500">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
            <span>{{ $t('reports.generatingPlugin', { plugin: plugin.name.toLowerCase() }) }}</span>
          </div>
        </div>

        <!-- Report Data (for plugins that don't redirect) -->
        <div
          v-else-if="
            currentReports[plugin.key] &&
            !['category-analytics', 'price-trends', 'purchase-patterns', 'prediction-insights'].includes(plugin.key)
          "
          class="mt-6 space-y-4"
        >
          <div class="border-t border-gray-200 dark:border-gray-600 pt-4">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {{ currentReports[plugin.key].title }}
            </h4>

            <!-- Purchase Pattern Report Component -->
            <PurchasePatternReport
              v-if="plugin.key === 'purchase-patterns'"
              :data="currentReports[plugin.key].data as any"
            />

            <!-- Generic data display for other report types -->
            <div v-else class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <pre class="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{{
                JSON.stringify(currentReports[plugin.key].data, null, 2)
              }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="localizedReportPlugins.length === 0"
      class="text-center py-12"
    >
      <div class="text-gray-500 mb-4">{{ $t('reports.noPluginsAvailable') }}</div>
      <p class="text-sm text-gray-400">
        {{ $t('reports.pluginsWillAppearWhenEnabled') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useTranslation } from "@/composables/useTranslation";
import { usePluginsStore } from "@/stores/plugins";
import { useReportsStore } from "@/stores/reports";
import { usePluginLocalization } from "@/composables/usePluginLocalization";
import { useReportFilterPersistence } from "@/composables/useFilterPersistence";
import LocalizedDateInput from "@/components/common/LocalizedDateInput.vue";
import CategoryAnalyticsReport from "@/components/reports/CategoryAnalyticsReport.vue";
import PriceTrendsReport from "@/components/reports/PriceTrendsReport.vue";
import PurchasePatternReport from "@/components/reports/PurchasePatternReport.vue";
import type { ReportPlugin } from "@/types/plugin";
import type { ReportData, DateRange } from "@/types/report";

const router = useRouter();
const { locale } = useTranslation();
const pluginsStore = usePluginsStore();
const reportsStore = useReportsStore();
const { localizePlugins } = usePluginLocalization();

// Use persisted date ranges
const {
  dateRanges,
  getDateRange,
  setDateRange,
  hasActiveFilter,
  clearDateRange,
  clearDateField,
} = useReportFilterPersistence();

const loadingReports = reactive<Record<string, boolean>>({});
const currentReports = reactive<Record<string, ReportData>>({});

// Format date to YYYY-MM-DD using local timezone (not UTC)
// This prevents off-by-one day issues for users in timezones like UTC+1
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Computed property to get localized plugins
const localizedReportPlugins = computed(() => {
  const plugins = pluginsStore.enabledReportPlugins || [];
  return localizePlugins(plugins);
});

// Handler for updating date range (uses persisted storage)
const handleUpdateDateRange = (
  pluginKey: string,
  field: "startDate" | "endDate",
  value: string,
) => {
  setDateRange(pluginKey, { [field]: value });
};

// Handler for clearing entire date range for a plugin
const handleClearDateRange = (pluginKey: string) => {
  clearDateRange(pluginKey);
};

// Handler for clearing a single date field
const handleClearDateField = (pluginKey: string, field: "startDate" | "endDate") => {
  clearDateField(pluginKey, field);
};

const isDateRangeValid = (pluginKey: string) => {
  const range = getDateRange(pluginKey);
  return (
    range &&
    range.startDate &&
    range.endDate &&
    range.startDate <= range.endDate
  );
};

const getMinDateForPlugin = (plugin: ReportPlugin) => {
  // For plugins with history limits, restrict dates to the limit
  if (plugin.historyLimitDays && plugin.historyLimitDays > 0) {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - plugin.historyLimitDays);
    return formatLocalDate(limitDate);
  }
  return undefined;
};

const getMaxDateForPlugin = (plugin: ReportPlugin) => {
  // Generally, don't allow future dates for reports
  return formatLocalDate(new Date());
};

const generateReport = async (plugin: ReportPlugin) => {
  const dateRange = getDateRange(plugin.key);

  // For category analytics, redirect to detailed analytics view
  if (plugin.key === "category-analytics") {
    const query: Record<string, string> = {};

    if (dateRange.startDate) {
      query.startDate = dateRange.startDate;
    }
    if (dateRange.endDate) {
      query.endDate = dateRange.endDate;
    }

    router.push({
      path: "/analytics/categories",
      query,
    });
    return;
  }

  // For price trends, redirect to dedicated price trends view
  if (plugin.key === "price-trends") {
    const query: Record<string, string> = {};

    if (dateRange.startDate) {
      query.startDate = dateRange.startDate;
    }
    if (dateRange.endDate) {
      query.endDate = dateRange.endDate;
    }

    router.push({
      path: "/analytics/price-trends",
      query,
    });
    return;
  }

  // For purchase patterns, redirect to dedicated purchase patterns view
  if (plugin.key === "purchase-patterns") {
    router.push({
      path: "/analytics/purchase-patterns",
    });
    return;
  }

  // For prediction insights, redirect to dedicated predictions view
  if (plugin.key === "prediction-insights") {
    router.push({
      path: "/analytics/predictions",
    });
    return;
  }

  loadingReports[plugin.key] = true;

  try {
    const request = {
      pluginKey: plugin.key,
      dateRange: plugin.requiresDateRange ? dateRange : undefined,
      parameters: {},
    };

    const reportData = await reportsStore.generateReport(request);
    currentReports[plugin.key] = reportData;
  } catch (error) {
    console.error("Failed to generate report:", error);
  } finally {
    loadingReports[plugin.key] = false;
  }
};

const exportReport = async (plugin: ReportPlugin, format: string) => {
  try {
    const dateRange = getDateRange(plugin.key);
    const request = {
      pluginKey: plugin.key,
      dateRange: plugin.requiresDateRange ? dateRange : undefined,
      parameters: {},
    };

    await reportsStore.exportReport(request, format);
  } catch (error) {
    console.error("Failed to export report:", error);
  }
};

// Initialize default date ranges (only for plugins that don't have persisted values)
const initializeDefaultDateRanges = () => {
  localizedReportPlugins.value.forEach((plugin) => {
    if (plugin.requiresDateRange) {
      // Check if there are already persisted values
      const existingRange = getDateRange(plugin.key);
      if (existingRange.startDate || existingRange.endDate) {
        // Already has persisted values, skip initialization
        return;
      }

      const endDate = new Date();
      let startDate = new Date();

      // If there's a history limit, respect it
      if (plugin.historyLimitDays && plugin.historyLimitDays > 0) {
        // Set start date to the limit or 30 days ago, whichever is more recent
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - plugin.historyLimitDays);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setMonth(thirtyDaysAgo.getMonth() - 1);

        // Use the more recent date (closer to today)
        startDate = limitDate > thirtyDaysAgo ? limitDate : thirtyDaysAgo;
      } else {
        // Default to 1 month ago
        startDate.setMonth(endDate.getMonth() - 1);
      }

      setDateRange(plugin.key, {
        startDate: formatLocalDate(startDate),
        endDate: formatLocalDate(endDate),
      });
    }
  });
};

// Watch for locale changes and refetch plugins to get updated access messages
watch(locale, async (newLocale) => {
  await pluginsStore.fetchAllPlugins();
});

onMounted(async () => {
  await pluginsStore.fetchAllPlugins();
  initializeDefaultDateRanges();
});
</script>
