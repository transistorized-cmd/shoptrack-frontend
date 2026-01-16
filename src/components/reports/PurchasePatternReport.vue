<template>
  <div class="space-y-6">
    <!-- Summary Statistics -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <div class="bg-white p-4 rounded-lg border">
        <p class="text-sm font-medium text-gray-500">Total Patterns</p>
        <p class="text-2xl font-bold text-gray-900">
          {{ summary?.totalPatterns || 0 }}
        </p>
      </div>
      <div class="bg-white p-4 rounded-lg border border-green-200">
        <p class="text-sm font-medium text-green-600">📈 Accelerating</p>
        <p class="text-2xl font-bold text-green-700">
          {{ summary?.acceleratingPatterns || 0 }}
        </p>
      </div>
      <div class="bg-white p-4 rounded-lg border border-blue-200">
        <p class="text-sm font-medium text-blue-600">📊 Stable</p>
        <p class="text-2xl font-bold text-blue-700">
          {{ summary?.stablePatterns || 0 }}
        </p>
      </div>
      <div class="bg-white p-4 rounded-lg border border-orange-200">
        <p class="text-sm font-medium text-orange-600">📉 Slowing</p>
        <p class="text-2xl font-bold text-orange-700">
          {{ summary?.slowingPatterns || 0 }}
        </p>
      </div>
      <div class="bg-white p-4 rounded-lg border border-gray-200">
        <p class="text-sm font-medium text-gray-500">⏳ Insufficient Data</p>
        <p class="text-2xl font-bold text-gray-700">
          {{ summary?.insufficientDataPatterns || 0 }}
        </p>
      </div>
    </div>

    <!-- Notifications Panel -->
    <div
      v-if="summary?.unreadNotifications && summary.unreadNotifications > 0"
      class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5"
    >
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            🔔 Pattern Notifications
            <span
              v-if="summary.highSeverityNotifications > 0"
              class="ml-2 px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full"
            >
              {{ summary.highSeverityNotifications }} High Priority
            </span>
          </h3>
          <p class="text-sm text-gray-600 mb-3">
            You have {{ summary.unreadNotifications }} unread notification{{
              summary.unreadNotifications > 1 ? "s" : ""
            }}
            about your purchase patterns
          </p>

          <!-- Latest Notifications -->
          <div
            v-if="summary.latestNotifications && summary.latestNotifications.length > 0"
            class="space-y-2"
          >
            <div
              v-for="notification in summary.latestNotifications.slice(0, 3)"
              :key="notification.id"
              class="bg-white rounded-lg p-3 border"
              :class="{
                'border-red-300': notification.severity === 'high',
                'border-yellow-300': notification.severity === 'medium',
                'border-blue-300': notification.severity === 'low'
              }"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <p class="font-medium text-gray-900 text-sm">
                    {{ notification.title }}
                  </p>
                  <p class="text-xs text-gray-600 mt-1">
                    {{ notification.message }}
                  </p>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ formatDate(notification.createdAt) }}
                  </p>
                </div>
                <span
                  class="ml-2 px-2 py-1 text-xs font-medium rounded-full"
                  :class="{
                    'bg-red-100 text-red-700': notification.severity === 'high',
                    'bg-yellow-100 text-yellow-700': notification.severity === 'medium',
                    'bg-blue-100 text-blue-700': notification.severity === 'low'
                  }"
                >
                  {{ notification.severity }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg border">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Filter by Trend
          </label>
          <select
            v-model="filters.trend"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-shoptrack-500 focus:border-shoptrack-500"
          >
            <option value="">All Trends</option>
            <option value="accelerating">📈 Accelerating</option>
            <option value="stable">📊 Stable</option>
            <option value="slowing">📉 Slowing</option>
            <option value="insufficient_data">⏳ Insufficient Data</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Min Confidence
          </label>
          <input
            v-model.number="filters.minConfidence"
            type="range"
            min="0"
            max="1"
            step="0.1"
            class="w-full"
          />
          <p class="text-xs text-gray-500 mt-1">
            {{ (filters.minConfidence * 100).toFixed(0) }}%
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Search Item
          </label>
          <input
            v-model="filters.itemName"
            type="text"
            placeholder="Item name..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-shoptrack-500 focus:border-shoptrack-500"
          />
        </div>

        <div class="flex items-end">
          <button
            @click="resetFilters"
            class="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Top Confidence Patterns -->
    <div v-if="summary?.topConfidencePatterns && summary.topConfidencePatterns.length > 0">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
        🎯 Highest Confidence Patterns
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="pattern in summary.topConfidencePatterns"
          :key="pattern.id"
          class="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200"
        >
          <h4 class="font-semibold text-gray-900 mb-2">{{ pattern.itemName }}</h4>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Confidence:</span>
              <span class="font-bold text-green-700">
                {{ (pattern.confidenceScore * 100).toFixed(0) }}%
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Purchases:</span>
              <span class="font-medium text-gray-900">{{ pattern.purchaseCount }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Avg Days:</span>
              <span class="font-medium text-gray-900">
                {{ pattern.averageDaysBetween?.toFixed(1) }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Trend:</span>
              <span
                class="font-medium"
                :class="getTrendColorClass(pattern.trend)"
              >
                {{ getTrendIcon(pattern.trend) }} {{ pattern.trend }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recently Changed Patterns -->
    <div
      v-if="summary?.recentlyChangedPatterns && summary.recentlyChangedPatterns.length > 0"
    >
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
        🔄 Recently Changed Patterns
      </h3>
      <div class="space-y-3">
        <div
          v-for="pattern in summary.recentlyChangedPatterns"
          :key="pattern.id"
          class="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <h4 class="font-semibold text-gray-900">{{ pattern.itemName }}</h4>
              <p class="text-sm text-gray-600 mt-1">
                Updated {{ formatDate(pattern.updatedAt) }}
              </p>
            </div>
            <div class="text-right">
              <span
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                :class="getTrendBadgeClass(pattern.trend)"
              >
                {{ getTrendIcon(pattern.trend) }} {{ pattern.trend }}
              </span>
              <p class="text-xs text-gray-500 mt-1">
                Confidence: {{ (pattern.confidenceScore * 100).toFixed(0) }}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- All Patterns List -->
    <div v-if="filteredPatterns && filteredPatterns.length > 0">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">
          📊 All Purchase Patterns ({{ filteredPatterns.length }})
        </h3>

        <!-- Sort Controls -->
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
          <button
            @click="setSortBy('daysAway')"
            class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
            :class="sortBy === 'daysAway'
              ? 'bg-shoptrack-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
          >
            Days Away
            <span v-if="sortBy === 'daysAway'">
              {{ sortOrder === 'asc' ? '↑' : '↓' }}
            </span>
          </button>
          <button
            @click="setSortBy('confidence')"
            class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
            :class="sortBy === 'confidence'
              ? 'bg-shoptrack-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
          >
            Confidence
            <span v-if="sortBy === 'confidence'">
              {{ sortOrder === 'asc' ? '↑' : '↓' }}
            </span>
          </button>
          <button
            @click="setSortBy('product')"
            class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
            :class="sortBy === 'product'
              ? 'bg-shoptrack-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
          >
            Product
            <span v-if="sortBy === 'product'">
              {{ sortOrder === 'asc' ? '↑' : '↓' }}
            </span>
          </button>
          <button
            @click="setSortBy('category')"
            class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
            :class="sortBy === 'category'
              ? 'bg-shoptrack-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
          >
            Category
            <span v-if="sortBy === 'category'">
              {{ sortOrder === 'asc' ? '↑' : '↓' }}
            </span>
          </button>
          <button
            @click="setSortBy('purchases')"
            class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
            :class="sortBy === 'purchases'
              ? 'bg-shoptrack-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
          >
            Purchases
            <span v-if="sortBy === 'purchases'">
              {{ sortOrder === 'asc' ? '↑' : '↓' }}
            </span>
          </button>
        </div>
      </div>

      <div class="space-y-3">
        <div
          v-for="pattern in filteredPatterns"
          :key="pattern.id"
          class="bg-white p-5 rounded-lg border hover:shadow-md transition-shadow"
        >
          <!-- Pattern Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h4 class="text-lg font-semibold text-gray-900">
                {{ pattern.itemName }}
              </h4>
              <p v-if="pattern.categoryName" class="text-sm text-gray-600">
                Category: {{ pattern.categoryName }}
              </p>
            </div>
            <div class="text-right">
              <span
                class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium"
                :class="getTrendBadgeClass(pattern.trend)"
              >
                {{ getTrendIcon(pattern.trend) }} {{ pattern.trend }}
              </span>
              <p class="text-xs text-gray-500 mt-1">
                Confidence: {{ (pattern.confidenceScore * 100).toFixed(0) }}%
              </p>
            </div>
          </div>

          <!-- Pattern Statistics -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div class="bg-gray-50 p-3 rounded-lg">
              <p class="text-xs font-medium text-gray-500">Total Purchases</p>
              <p class="text-lg font-bold text-gray-900">{{ pattern.purchaseCount }}</p>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg">
              <p class="text-xs font-medium text-gray-500">Avg Days Between</p>
              <p class="text-lg font-bold text-gray-900">
                {{ pattern.averageDaysBetween?.toFixed(1) }}
              </p>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg">
              <p class="text-xs font-medium text-gray-500">Median Days</p>
              <p class="text-lg font-bold text-gray-900">
                {{ pattern.medianDaysBetween?.toFixed(1) }}
              </p>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg">
              <p class="text-xs font-medium text-gray-500">Std Deviation</p>
              <p class="text-lg font-bold text-gray-900">
                {{ pattern.stdDevDaysBetween?.toFixed(1) }}
              </p>
            </div>
          </div>

          <!-- Expected Next Purchase -->
          <div
            v-if="pattern.expectedNextPurchase && pattern.daysUntilNextExpected !== null"
            class="bg-blue-50 border border-blue-200 rounded-lg p-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-blue-900">
                  Expected Next Purchase
                </p>
                <p class="text-xs text-blue-700 mt-1">
                  {{ formatDate(pattern.expectedNextPurchase) }}
                </p>
              </div>
              <div class="text-right">
                <p
                  class="text-2xl font-bold"
                  :class="{
                    'text-red-600': pattern.daysUntilNextExpected < 0,
                    'text-orange-600':
                      pattern.daysUntilNextExpected >= 0 &&
                      pattern.daysUntilNextExpected <= 3,
                    'text-blue-600': pattern.daysUntilNextExpected > 3
                  }"
                >
                  {{ pattern.daysUntilNextExpected }}
                </p>
                <p class="text-xs text-blue-700">days away</p>
              </div>
            </div>
          </div>

          <!-- Purchase History -->
          <div class="mt-4">
            <p class="text-xs font-medium text-gray-500 mb-2">Purchase History</p>
            <div class="flex items-center justify-between text-xs text-gray-600">
              <span>First: {{ formatDate(pattern.firstPurchaseDate) }}</span>
              <span>Latest: {{ formatDate(pattern.lastPurchaseDate) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Patterns State -->
    <div
      v-if="!filteredPatterns || filteredPatterns.length === 0"
      class="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
    >
      <div class="text-6xl mb-4">📊</div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No Patterns Found</h3>
      <p class="text-gray-600 mb-4">
        {{ filters.trend || filters.itemName || filters.minConfidence > 0
          ? 'No patterns match your current filters. Try adjusting the filters.'
          : 'Start uploading receipts to detect purchase patterns. Patterns require at least 5 purchases of the same item.'
        }}
      </p>
      <button
        v-if="filters.trend || filters.itemName || filters.minConfidence > 0"
        @click="resetFilters"
        class="px-4 py-2 bg-shoptrack-600 text-white rounded-lg hover:bg-shoptrack-700 transition-colors"
      >
        Reset Filters
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

interface PurchasePatternDto {
  id: number;
  itemName: string;
  itemNameNormalized: string;
  categoryId: number | null;
  categoryName: string | null;
  purchaseCount: number;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  averageDaysBetween: number;
  medianDaysBetween: number;
  stdDevDaysBetween: number;
  minDaysBetween: number;
  maxDaysBetween: number;
  recentPeriodAvg: number | null;
  olderPeriodAvg: number | null;
  trendPValue: number | null;
  trendEffectSize: number | null;
  last3PurchasesAvg: number | null;
  expectedNextPurchase: string | null;
  daysUntilNextExpected: number | null;
  trend: string;
  confidenceScore: number;
  createdAt: string;
  updatedAt: string;
}

interface PatternNotificationDto {
  id: number;
  patternId: number;
  itemName: string;
  notificationType: string;
  severity: string;
  title: string;
  message: string;
  actualDays: number | null;
  expectedDays: number | null;
  deviationPercentage: number | null;
  statisticalSignificance: number | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface PurchasePatternSummaryDto {
  totalPatterns: number;
  acceleratingPatterns: number;
  slowingPatterns: number;
  stablePatterns: number;
  insufficientDataPatterns: number;
  topConfidencePatterns: PurchasePatternDto[];
  recentlyChangedPatterns: PurchasePatternDto[];
  unreadNotifications: number;
  highSeverityNotifications: number;
  latestNotifications: PatternNotificationDto[];
}

const props = defineProps<{
  data: {
    summary: PurchasePatternSummaryDto;
    patterns: PurchasePatternDto[];
  };
}>();

// Filters and Sorting
const filters = ref({
  trend: "",
  minConfidence: 0,
  itemName: ""
});

const sortBy = ref<string>("daysAway");
const sortOrder = ref<"asc" | "desc">("asc");

// Computed
const summary = computed(() => props.data?.summary);
const patterns = computed(() => props.data?.patterns || []);

const filteredPatterns = computed(() => {
  let result = patterns.value;

  // Apply filters
  if (filters.value.trend) {
    result = result.filter((p) => p.trend === filters.value.trend);
  }

  if (filters.value.minConfidence > 0) {
    result = result.filter((p) => p.confidenceScore >= filters.value.minConfidence);
  }

  if (filters.value.itemName) {
    const search = filters.value.itemName.toLowerCase();
    result = result.filter((p) => p.itemName.toLowerCase().includes(search));
  }

  // Apply sorting
  const sorted = [...result].sort((a, b) => {
    let compareValue = 0;

    switch (sortBy.value) {
      case "daysAway":
        const aDays = a.daysUntilNextExpected ?? 999999;
        const bDays = b.daysUntilNextExpected ?? 999999;
        compareValue = aDays - bDays;
        break;
      case "confidence":
        compareValue = a.confidenceScore - b.confidenceScore;
        break;
      case "product":
        compareValue = a.itemName.localeCompare(b.itemName);
        break;
      case "category":
        const aCat = a.categoryName || "";
        const bCat = b.categoryName || "";
        compareValue = aCat.localeCompare(bCat);
        break;
      case "purchases":
        compareValue = a.purchaseCount - b.purchaseCount;
        break;
      default:
        compareValue = 0;
    }

    return sortOrder.value === "asc" ? compareValue : -compareValue;
  });

  return sorted;
});

// Methods
function resetFilters() {
  filters.value = {
    trend: "",
    minConfidence: 0,
    itemName: ""
  };
}

function setSortBy(field: string) {
  if (sortBy.value === field) {
    // Toggle order if same field
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    // New field, default to ascending
    sortBy.value = field;
    sortOrder.value = "asc";
  }
}

function getTrendIcon(trend: string): string {
  switch (trend) {
    case "accelerating":
      return "📈";
    case "stable":
      return "📊";
    case "slowing":
      return "📉";
    case "insufficient_data":
      return "⏳";
    default:
      return "❓";
  }
}

function getTrendColorClass(trend: string): string {
  switch (trend) {
    case "accelerating":
      return "text-green-600";
    case "stable":
      return "text-blue-600";
    case "slowing":
      return "text-orange-600";
    case "insufficient_data":
      return "text-gray-600";
    default:
      return "text-gray-600";
  }
}

function getTrendBadgeClass(trend: string): string {
  switch (trend) {
    case "accelerating":
      return "bg-green-100 text-green-700 border border-green-200";
    case "stable":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "slowing":
      return "bg-orange-100 text-orange-700 border border-orange-200";
    case "insufficient_data":
      return "bg-gray-100 text-gray-700 border border-gray-200";
    default:
      return "bg-gray-100 text-gray-700 border border-gray-200";
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

  return date.toLocaleDateString();
}
</script>
