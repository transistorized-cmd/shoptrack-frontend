<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
      <div class="text-center sm:text-left">
        <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{{ $t('priceTrends.title') }}</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
          {{ $t('priceTrends.subtitle') }}
        </p>
      </div>

      <!-- Export Actions -->
      <div
        v-if="reportData && reportData.data && reportData.data.itemTrends?.length > 0"
        class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2"
      >
        <button
          :disabled="exportingFormat === 'csv'"
          class="btn btn-secondary text-sm w-full sm:w-auto"
          @click="exportData('csv')"
        >
          {{ exportingFormat === "csv" ? $t('priceTrends.exporting') : $t('priceTrends.exportCSV') }}
        </button>
        <button
          :disabled="exportingFormat === 'json'"
          class="btn btn-secondary text-sm w-full sm:w-auto"
          @click="exportData('json')"
        >
          {{ exportingFormat === "json" ? $t('priceTrends.exporting') : $t('priceTrends.exportJSON') }}
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-4 sm:p-6 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Date Range -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >{{ $t('priceTrends.startDate') }}</label
          >
          <LocalizedDateInput
            v-model="filters.startDate"
            class="input"
            @change="handleFilterChange"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >{{ $t('priceTrends.endDate') }}</label
          >
          <LocalizedDateInput
            v-model="filters.endDate"
            class="input"
            @change="handleFilterChange"
          />
        </div>

        <!-- Category Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >{{ $t('priceTrends.category') }}</label
          >
          <select
            v-model="filters.categoryId"
            class="input"
            @change="handleFilterChange"
          >
            <option value="">{{ $t('priceTrends.allCategories') }}</option>
            <option
              v-for="category in currentCategories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
        <button class="btn btn-secondary w-full sm:w-auto" @click="resetFilters">
          {{ $t('priceTrends.resetFilters') }}
        </button>
        <button
          :disabled="loading"
          class="btn btn-primary w-full sm:w-auto"
          @click="applyFilters"
        >
          {{ loading ? $t('priceTrends.loading') : $t('priceTrends.applyFilters') }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-flex items-center space-x-2 text-gray-500 dark:text-gray-400">
        <svg class="animate-spin h-6 w-6" viewBox="0 0 24 24">
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
        <span>{{ $t('priceTrends.analyzing') }}</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <p class="text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
      <button class="btn btn-primary" @click="loadData">{{ $t('priceTrends.retry') }}</button>
    </div>

    <!-- Price Trends Data -->
    <div v-else-if="reportData">
      <PriceTrendsReport :data="reportData.data" />
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <p class="text-gray-500 dark:text-gray-400 mb-4">{{ $t('priceTrends.noDataAvailable') }}</p>
      <p class="text-sm text-gray-400 dark:text-gray-500">{{ $t('priceTrends.adjustFiltersHint') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTranslation } from "@/composables/useTranslation";
import { useReportsStore } from "@/stores/reports";
import { useCategoriesStore } from "@/stores/categories";
import { getCurrentLocale } from "@/i18n";
import PriceTrendsReport from "@/components/reports/PriceTrendsReport.vue";
import LocalizedDateInput from "@/components/common/LocalizedDateInput.vue";
import type { ReportData, DateRange } from "@/types/report";

const { t } = useTranslation();

const route = useRoute();
const router = useRouter();
const reportsStore = useReportsStore();
const categoriesStore = useCategoriesStore();

// State
const loading = ref(false);
const error = ref<string | null>(null);
const exportingFormat = ref<string | null>(null);
const reportData = ref<ReportData | null>(null);

// Filters
const filters = reactive({
  startDate: "",
  endDate: "",
  categoryId: "", // Changed from category to categoryId
});

// Format date to YYYY-MM-DD using local timezone (not UTC)
// This prevents off-by-one day issues for users in timezones like UTC+1
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Computed property for current locale categories
const currentCategories = computed(() => {
  const currentLocale = getCurrentLocale();
  return categoriesStore.byLocale[currentLocale] || [];
});

// Initialize filters from URL query parameters
const initializeFiltersFromQuery = () => {
  if (route.query.startDate) {
    filters.startDate = route.query.startDate as string;
  } else {
    // Default to last 6 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 6);
    filters.startDate = formatLocalDate(startDate);
  }

  if (route.query.endDate) {
    filters.endDate = route.query.endDate as string;
  } else {
    filters.endDate = formatLocalDate(new Date());
  }

  if (route.query.categoryId) {
    filters.categoryId = route.query.categoryId as string;
  }
};

// Update URL query parameters
const updateUrlQuery = () => {
  const query: Record<string, string> = {};

  if (filters.startDate) query.startDate = filters.startDate;
  if (filters.endDate) query.endDate = filters.endDate;
  if (filters.categoryId) query.categoryId = filters.categoryId;

  router.replace({ query });
};

// Load price trends data
const loadData = async () => {
  loading.value = true;
  error.value = null;

  try {
    const dateRange: DateRange | undefined =
      filters.startDate && filters.endDate
        ? {
            startDate: filters.startDate,
            endDate: filters.endDate,
          }
        : undefined;

    const parameters: Record<string, any> = {
      locale: getCurrentLocale() // Add current locale for category localization
    };
    if (filters.categoryId) {
      parameters.categoryId = filters.categoryId;
    }

    const request = {
      pluginKey: "price-trends",
      dateRange,
      parameters,
    };

    reportData.value = await reportsStore.generateReport(request);
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to load price trends data";
    console.error("Failed to load price trends:", err);
  } finally {
    loading.value = false;
  }
};

// Export data
const exportData = async (format: string) => {
  exportingFormat.value = format;

  try {
    const dateRange: DateRange | undefined =
      filters.startDate && filters.endDate
        ? {
            startDate: filters.startDate,
            endDate: filters.endDate,
          }
        : undefined;

    const parameters: Record<string, any> = {
      locale: getCurrentLocale() // Add current locale for category localization
    };
    if (filters.categoryId) {
      parameters.categoryId = filters.categoryId;
    }

    const request = {
      pluginKey: "price-trends",
      dateRange,
      parameters,
    };

    await reportsStore.exportReport(request, format);
  } catch (err) {
    console.error(`Failed to export ${format.toUpperCase()}:`, err);
  } finally {
    exportingFormat.value = null;
  }
};

// Filter handlers
const handleFilterChange = () => {
  updateUrlQuery();
};

const applyFilters = () => {
  loadData();
};

const resetFilters = () => {
  filters.startDate = "";
  filters.endDate = "";
  filters.categoryId = "";

  // Set default date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(endDate.getMonth() - 6);
  filters.startDate = formatLocalDate(startDate);
  filters.endDate = formatLocalDate(endDate);

  updateUrlQuery();
  loadData();
};

// Initialize and load data
onMounted(async () => {
  // Fetch categories for the current locale
  await categoriesStore.fetchCategories(getCurrentLocale());

  initializeFiltersFromQuery();
  loadData();
});

// Watch for locale changes and refresh categories
watch(
  () => getCurrentLocale(),
  async (newLocale) => {
    await categoriesStore.fetchCategories(newLocale);
    // Optionally reload data if category filter is applied
    if (filters.categoryId) {
      loadData();
    }
  },
);
</script>
