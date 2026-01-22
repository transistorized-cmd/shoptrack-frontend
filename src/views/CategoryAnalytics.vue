<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
      <div class="text-center sm:text-left">
        <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          {{ pageTitle }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
          {{ pageSubtitle }}
        </p>
      </div>

      <!-- Date Range Selector -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
        <LocalizedDateInput
          :model-value="dateRange.startDate"
          class="input text-sm w-full sm:w-auto"
          @update:model-value="updateStartDate"
        />
        <LocalizedDateInput
          :model-value="dateRange.endDate"
          class="input text-sm w-full sm:w-auto"
          @update:model-value="updateEndDate"
        />
      </div>
    </div>

    <!-- Excluded Categories Pills -->
    <div
      v-if="excludedCategories.size > 0"
      class="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
    >
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {{ $t('categoryAnalytics.excludedCategories') }}:
      </h3>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="category in Array.from(excludedCategories)"
          :key="`excluded-${category}`"
          class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"
        >
          <span class="capitalize">{{ category }}</span>
          <button
            class="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            @click="includeCategory(category)"
          >
            <svg
              class="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Breadcrumb Navigation -->
    <nav class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-4" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 sm:space-x-3 whitespace-nowrap">
        <!-- Home/Analytics Icon -->
        <li class="inline-flex items-center">
          <svg class="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
          </svg>
          <span class="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ $t('categoryAnalytics.title') }}
          </span>
        </li>

        <!-- Dynamic Breadcrumb Items -->
        <li
          v-for="(crumb, index) in breadcrumbs"
          :key="index"
          class="inline-flex items-center"
        >
          <!-- Separator -->
          <svg class="w-4 h-4 sm:w-6 sm:h-6 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clip-rule="evenodd"
            />
          </svg>

          <!-- Breadcrumb Link/Text -->
          <button
            v-if="index < breadcrumbs.length - 1"
            class="inline-flex items-center px-2 py-1 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
            @click="navigateTo(crumb.path)"
          >
            {{ crumb.label }}
          </button>
          <span
            v-else
            class="inline-flex items-center px-2 py-1 text-xs sm:text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md"
          >
            {{ crumb.label }}
          </span>
        </li>
      </ol>
    </nav>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
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
        <span>{{ $t('categoryAnalytics.loadingAnalyticsData') }}</span>
      </div>
    </div>

    <!-- Category View -->
    <div v-else-if="currentView === 'categories'">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="card p-4">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('categoryAnalytics.totalCategories') }}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ categoryData.length }}
          </p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('categoryAnalytics.totalSpending') }}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            ${{ totalSpending.toFixed(2) }}
          </p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('categoryAnalytics.totalItems') }}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalItems }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('categoryAnalytics.transactions') }}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ totalTransactions }}
          </p>
        </div>
      </div>

      <div class="space-y-3">
        <div
          v-for="category in filteredCategoryData"
          :key="category.category"
          class="relative card p-6 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 group"
        >
          <!-- Exclude Category Button -->
          <button
            class="absolute top-2 right-2 w-6 h-6 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            :title="$t('categoryAnalytics.excludeCategoryTooltip')"
            @click.stop="excludeCategory(category.category)"
          >
            <svg
              class="w-3 h-3 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <!-- Category Content (clickable) -->
          <div
            class="cursor-pointer"
            @click="drillDownToCategory(category.categoryId, category.category)"
          >
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
              <h3 class="text-base sm:text-lg font-semibold text-gray-900 dark:text-white capitalize">
                {{ category.category }}
              </h3>
              <div class="text-left sm:text-right">
                <p class="text-lg font-bold text-blue-600 dark:text-blue-400">
                  ${{ category.totalAmount.toFixed(2) }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ category.percentage }}%</p>
              </div>
            </div>

            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
              <div
                class="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${category.percentage}%` }"
              />
            </div>

            <div
              class="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 dark:text-gray-300 space-y-1 sm:space-y-0"
            >
              <span>{{ $t('categoryAnalytics.itemsCount', { count: category.totalItems }) }}</span>
              <span>{{ $t('categoryAnalytics.transactionsCount', { count: category.transactionCount }) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Items View -->
    <div v-else-if="currentView === 'items'">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="card p-4">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
            {{ $t('categoryAnalytics.itemsInCategory', { category: localizedCategoryName }) }}
          </p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ itemData.length }}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('categoryAnalytics.categorySpending') }}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            ${{ categorySpending.toFixed(2) }}
          </p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('categoryAnalytics.totalItems') }}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ categoryTotalItems }}
          </p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('categoryAnalytics.transactions') }}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ categoryTransactions }}
          </p>
        </div>
      </div>

      <div class="space-y-3">
        <div
          v-for="item in itemData"
          :key="item.itemId"
          class="cursor-pointer card p-6 hover:border-green-300 dark:hover:border-green-600 hover:shadow-md transition-all duration-200"
          @click="drillDownToItem(item.itemId, item.itemName)"
        >
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {{ item.itemName }}
            </h3>
            <div class="text-right">
              <p class="text-lg font-bold text-green-600 dark:text-green-400">
                ${{ item.totalAmount.toFixed(2) }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ item.percentage }}%</p>
            </div>
          </div>

          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
            <div
              class="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${item.percentage}%` }"
            />
          </div>

          <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>{{ $t('categoryAnalytics.itemsCount', { count: item.totalItems }) }}</span>
            <span>{{ $t('categoryAnalytics.transactionsCount', { count: item.transactionCount }) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Item Receipts View -->
    <div v-else-if="currentView === 'receipts'">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="card p-4">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
            {{ $t('categoryAnalytics.receiptsFor', { item: selectedItemName }) }}
          </p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ receiptData.length }}
          </p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('categoryAnalytics.itemSpending') }}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            ${{ itemSpending.toFixed(2) }}
          </p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('categoryAnalytics.totalQuantity') }}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ itemTotalQuantity }}
          </p>
        </div>
        <div class="card p-4">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('categoryAnalytics.avgPrice') }}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            ${{ averagePrice.toFixed(2) }}
          </p>
        </div>
      </div>

      <div class="space-y-3">
        <div
          v-for="receipt in receiptData"
          :key="`${receipt.receiptId}-${receipt.itemName}`"
          class="cursor-pointer card p-6 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all duration-200"
          @click="goToReceiptDetail(receipt.receiptId)"
        >
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ receipt.storeName }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ formatDate(receipt.receiptDate) }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold text-purple-600 dark:text-purple-400">
                ${{ receipt.totalPrice.toFixed(2) }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ receipt.quantity || 1 }} {{ receipt.unit || "item"
                }}{{ (receipt.quantity || 1) > 1 ? "s" : "" }}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>Receipt #{{ receipt.receiptId }}</span>
            <span v-if="receipt.pricePerUnit"
              >${{ receipt.pricePerUnit.toFixed(2) }} per
              {{ receipt.unit || "item" }}</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="
        !loading && currentView === 'categories' && categoryData.length === 0
      "
      class="text-center py-12"
    >
      <div class="text-gray-500 dark:text-gray-400 mb-4">{{ $t('categoryAnalytics.noCategoryData') }}</div>
      <p class="text-sm text-gray-400 dark:text-gray-500">
        {{ $t('categoryAnalytics.tryAdjustingDateRange') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useTranslation } from "@/composables/useTranslation";
import { useDateLocalization } from "@/composables/useDateLocalization";
import { useCategoriesStore } from "@/stores/categories";
import LocalizedDateInput from "@/components/common/LocalizedDateInput.vue";
import { getCurrentLocale } from "@/i18n";

import api from "@/services/api";

interface CategoryAnalytics {
  categoryId: number;
  category: string;
  totalItems: number;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
}

interface ItemAnalytics {
  itemId: number;
  itemName: string;
  category: string;
  totalItems: number;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
}

interface ItemReceipt {
  receiptId: number;
  storeName: string;
  receiptDate: string;
  itemName: string;
  quantity?: number;
  totalPrice: number;
  unit?: string;
  pricePerUnit?: number;
  purchaseDate: string;
}

interface Breadcrumb {
  label: string;
  path: string;
}

const router = useRouter();
const route = useRoute();
const { t } = useTranslation();
const categoriesStore = useCategoriesStore();
const { formatDate } = useDateLocalization();

// Utility function for capitalizing text
const capitalizeFirst = (str: string) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Format date to YYYY-MM-DD using local timezone (not UTC)
// This prevents off-by-one day issues for users in timezones like UTC+1
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper functions to read from URL query parameters
function getDateFromQuery(param: string): string | null {
  const value = route.query[param];
  if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return value;
  }
  return null;
}

function getCategoryFromQuery(): string | null {
  const value = route.query.category;
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return null;
}

function getCategoryIdFromQuery(): number | null {
  const value = route.query.categoryId;
  if (typeof value === "string" && value.trim()) {
    const id = parseInt(value, 10);
    return isNaN(id) ? null : id;
  }
  return null;
}

function getItemIdFromQuery(): number | null {
  const value = route.query.itemId;
  if (typeof value === "string" && value.trim()) {
    const id = parseInt(value, 10);
    return isNaN(id) ? null : id;
  }
  return null;
}

function getInitialView(): "categories" | "items" | "receipts" {
  const category = getCategoryFromQuery();
  const categoryId = getCategoryIdFromQuery();
  const itemId = getItemIdFromQuery();

  if ((category || categoryId) && itemId) {
    return "receipts";
  } else if (category || categoryId) {
    return "items";
  }
  return "categories";
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 3); // 3 months ago
  return formatLocalDate(date);
}

function getDefaultEndDate(): string {
  return formatLocalDate(new Date());
}

function getExcludedCategoriesFromQuery(): Set<string> {
  const value = route.query.excluded;
  if (typeof value === "string" && value.trim()) {
    return new Set(value.split(",").filter((cat) => cat.trim()));
  }
  return new Set();
}

const loading = ref(false);
const currentView = ref<"categories" | "items" | "receipts">(getInitialView());
const selectedCategoryId = ref<number | null>(getCategoryIdFromQuery());
const selectedCategory = ref<string>(getCategoryFromQuery() || "");
const selectedItemId = ref<number | null>(getItemIdFromQuery());
const selectedItemName = ref<string>("");
const excludedCategories = ref<Set<string>>(getExcludedCategoriesFromQuery());

const categoryData = ref<CategoryAnalytics[]>([]);
const itemData = ref<ItemAnalytics[]>([]);
const receiptData = ref<ItemReceipt[]>([]);

const dateRange = ref({
  startDate: getDateFromQuery("startDate") || getDefaultStartDate(),
  endDate: getDateFromQuery("endDate") || getDefaultEndDate(),
});

// Get localized category name using the categories store
const localizedCategoryName = computed(() => {
  if (selectedCategoryId.value) {
    const localizedName = categoriesStore.getName(selectedCategoryId.value, getCurrentLocale());
    if (localizedName) {
      return capitalizeFirst(localizedName);
    }
  }
  // Fallback to the string version if no ID or localized name found
  return selectedCategory.value ? capitalizeFirst(selectedCategory.value) : '';
});

const breadcrumbs = computed<Breadcrumb[]>(() => {
  const crumbs: Breadcrumb[] = [];

  // Add "Categories" as first breadcrumb when we're in items or receipts view (to go back to categories list)
  if (currentView.value === 'items' || currentView.value === 'receipts') {
    crumbs.push({ label: t('categoryAnalytics.categories'), path: "categories" });
  }

  // Add category name if we're in items or receipts view
  if ((selectedCategoryId.value || selectedCategory.value) && (currentView.value === 'items' || currentView.value === 'receipts')) {
    crumbs.push({
      label: localizedCategoryName.value,
      path: "items"
    });
  }

  // Add item name if we're in receipts view
  if (selectedItemName.value && currentView.value === 'receipts') {
    crumbs.push({
      label: selectedItemName.value.charAt(0).toUpperCase() + selectedItemName.value.slice(1),
      path: "receipts"
    });
  }

  return crumbs;
});

const pageTitle = computed(() => {
  if (currentView.value === 'categories') {
    return t('categoryAnalytics.title');
  } else if (currentView.value === 'items' && (selectedCategoryId.value || selectedCategory.value)) {
    return t('categoryAnalytics.categoryTitle', {
      category: localizedCategoryName.value
    });
  } else if (currentView.value === 'receipts' && selectedItemName.value) {
    return t('categoryAnalytics.itemTitle', {
      item: selectedItemName.value.charAt(0).toUpperCase() + selectedItemName.value.slice(1)
    });
  }
  return t('categoryAnalytics.title');
});

const pageSubtitle = computed(() => {
  if (currentView.value === 'categories') {
    return t('categoryAnalytics.subtitle');
  } else if (currentView.value === 'items' && (selectedCategoryId.value || selectedCategory.value)) {
    return t('categoryAnalytics.categorySubtitle', {
      category: localizedCategoryName.value
    });
  } else if (currentView.value === 'receipts' && selectedItemName.value) {
    return t('categoryAnalytics.itemSubtitle', {
      item: selectedItemName.value.charAt(0).toUpperCase() + selectedItemName.value.slice(1)
    });
  }
  return t('categoryAnalytics.subtitle');
});

const filteredCategoryData = computed(() =>
  categoryData.value.filter(
    (cat) => !excludedCategories.value.has(cat.category),
  ),
);

const totalSpending = computed(() =>
  filteredCategoryData.value.reduce((sum, cat) => sum + cat.totalAmount, 0),
);
const totalItems = computed(() =>
  filteredCategoryData.value.reduce((sum, cat) => sum + cat.totalItems, 0),
);
const totalTransactions = computed(() =>
  filteredCategoryData.value.reduce(
    (sum, cat) => sum + cat.transactionCount,
    0,
  ),
);

const categorySpending = computed(() =>
  itemData.value.reduce((sum, item) => sum + item.totalAmount, 0),
);
const categoryTotalItems = computed(() =>
  itemData.value.reduce((sum, item) => sum + item.totalItems, 0),
);
const categoryTransactions = computed(() =>
  itemData.value.reduce((sum, item) => sum + item.transactionCount, 0),
);

const itemSpending = computed(() =>
  receiptData.value.reduce((sum, receipt) => sum + receipt.totalPrice, 0),
);
const itemTotalQuantity = computed(() =>
  receiptData.value.reduce((sum, receipt) => sum + (receipt.quantity || 1), 0),
);
const averagePrice = computed(() => {
  if (receiptData.value.length === 0) return 0;
  return itemSpending.value / receiptData.value.length;
});

// formatDate is now provided by useDateLocalization composable

function extractArrayResponse<T>(payload: unknown, key: string): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const recordPayload = payload as Record<string, unknown>;

    if (Array.isArray(recordPayload[key])) {
      return recordPayload[key] as T[];
    }

    const nestedData = recordPayload.data;
    if (Array.isArray(nestedData)) {
      return nestedData as T[];
    }

    if (nestedData && typeof nestedData === "object") {
      const nestedRecord = nestedData as Record<string, unknown>;
      if (Array.isArray(nestedRecord[key])) {
        return nestedRecord[key] as T[];
      }
    }
  }

  return [];
}

async function fetchCategoryData() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (dateRange.value.startDate)
      params.append("startDate", dateRange.value.startDate);
    if (dateRange.value.endDate)
      params.append("endDate", dateRange.value.endDate);
    // Add locale parameter for localized category names
    const locale = getCurrentLocale();
    params.append("locale", locale);

    const response = await api.get(`/analytics/categories?${params}`);
    categoryData.value = extractArrayResponse<CategoryAnalytics>(
      response.data,
      "categories",
    );
  } catch (error) {
    console.error("Failed to fetch category data:", error);
  } finally {
    loading.value = false;
  }
}

async function fetchItemData(categoryId: number, category?: string) {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (categoryId) params.append("categoryId", categoryId.toString());
    if (category) params.append("category", category);
    if (dateRange.value.startDate)
      params.append("startDate", dateRange.value.startDate);
    if (dateRange.value.endDate)
      params.append("endDate", dateRange.value.endDate);
    // Add locale parameter for localized category names
    const locale = getCurrentLocale();
    params.append("locale", locale);

    const response = await api.get(
      `/analytics/categories/items?${params}`,
    );
    itemData.value = extractArrayResponse<ItemAnalytics>(response.data, "items");
  } catch (error) {
    console.error("Failed to fetch item data:", error);
  } finally {
    loading.value = false;
  }
}

async function fetchReceiptData(
  categoryId: number,
  itemId: number,
  category?: string,
) {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (categoryId) params.append("categoryId", categoryId.toString());
    if (category) params.append("category", category);
    params.append("itemId", itemId.toString());
    if (dateRange.value.startDate)
      params.append("startDate", dateRange.value.startDate);
    if (dateRange.value.endDate)
      params.append("endDate", dateRange.value.endDate);
    // Add locale parameter for localized category names
    const locale = getCurrentLocale();
    params.append("locale", locale);

    const response = await api.get(
      `/analytics/categories/items/receipts?${params}`,
    );
    receiptData.value = extractArrayResponse<ItemReceipt>(
      response.data,
      "receipts",
    );
  } catch (error) {
    console.error("Failed to fetch receipt data:", error);
  } finally {
    loading.value = false;
  }
}

async function drillDownToCategory(categoryId: number, category: string) {
  selectedCategoryId.value = categoryId;
  selectedCategory.value = category;
  currentView.value = "items";
  updateUrlParams();
  await fetchItemData(categoryId, category);
}

async function drillDownToItem(itemId: number, itemName: string) {
  selectedItemId.value = itemId;
  selectedItemName.value = itemName;
  currentView.value = "receipts";
  updateUrlParams();
  await fetchReceiptData(
    selectedCategoryId.value!,
    itemId,
    selectedCategory.value,
  );
}

function goToReceiptDetail(receiptId: number) {
  router.push(`/receipts/${receiptId}`);
}

function navigateTo(path: string) {
  if (path === "categories") {
    currentView.value = "categories";
    selectedCategoryId.value = null;
    selectedCategory.value = "";
    selectedItemId.value = null;
    selectedItemName.value = "";
    updateUrlParams();
  } else if (path === "items") {
    currentView.value = "items";
    selectedItemId.value = null;
    selectedItemName.value = "";
    updateUrlParams();
  }
}

function updateStartDate(value: string) {
  dateRange.value.startDate = value;
  updateUrlParams();
  fetchData();
}

function updateEndDate(value: string) {
  dateRange.value.endDate = value;
  updateUrlParams();
  fetchData();
}

function updateUrlParams() {
  const params = new URLSearchParams();

  if (dateRange.value.startDate)
    params.set("startDate", dateRange.value.startDate);
  if (dateRange.value.endDate) params.set("endDate", dateRange.value.endDate);
  if (selectedCategoryId.value)
    params.set("categoryId", selectedCategoryId.value.toString());
  if (selectedItemId.value)
    params.set("itemId", selectedItemId.value.toString());
  if (excludedCategories.value.size > 0) {
    params.set("excluded", Array.from(excludedCategories.value).join(","));
  }

  const queryString = params.toString();
  const fullPath = `/analytics/categories${queryString ? `?${queryString}` : ""}`;

  router.replace(fullPath);
}

async function fetchData() {
  if (currentView.value === "categories") {
    await fetchCategoryData();
  } else if (currentView.value === "items" && selectedCategoryId.value) {
    await fetchItemData(selectedCategoryId.value, selectedCategory.value);
  } else if (
    currentView.value === "receipts" &&
    selectedCategoryId.value &&
    selectedItemId.value
  ) {
    await fetchReceiptData(
      selectedCategoryId.value,
      selectedItemId.value,
      selectedCategory.value,
    );
  }
}

onMounted(async () => {
  // Initialize categories store for localized names
  await categoriesStore.fetchCategories(getCurrentLocale());

  // Initialize view based on URL parameters
  initializeFromUrl();
  updateUrlParams();
});

// Refresh data when locale changes
watch(() => getCurrentLocale(), async (newLocale) => {
  // Update categories with new locale for localized names
  await categoriesStore.fetchCategories(newLocale);
  fetchData();
});

function excludeCategory(category: string) {
  excludedCategories.value.add(category);
  updateUrlParams();
}

function includeCategory(category: string) {
  excludedCategories.value.delete(category);
  updateUrlParams();
}

function initializeFromUrl() {
  const category = getCategoryFromQuery();
  const categoryId = getCategoryIdFromQuery();
  const itemId = getItemIdFromQuery();

  if ((category || categoryId) && itemId) {
    // We have both category and itemId, load receipts
    selectedCategory.value = category || "";
    selectedCategoryId.value = categoryId;
    selectedItemId.value = itemId;
    currentView.value = "receipts";
    if (categoryId) {
      fetchReceiptData(categoryId, itemId, category ?? undefined);
    }
  } else if (category || categoryId) {
    // We have category, load items
    selectedCategory.value = category || "";
    selectedCategoryId.value = categoryId;
    currentView.value = "items";
    if (categoryId) {
      fetchItemData(categoryId, category ?? undefined);
    }
  } else {
    // Default view, load categories
    currentView.value = "categories";
    fetchCategoryData();
  }
}
</script>
