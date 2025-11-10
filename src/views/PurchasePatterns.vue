<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
      <div class="text-center sm:text-left">
        <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          📈 Purchase Pattern Analysis
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
          Discover your buying habits and get insights on when to purchase items
        </p>
      </div>

      <!-- Refresh Button -->
      <button
        :disabled="loading"
        class="btn btn-primary w-full sm:w-auto"
        @click="refreshPatterns"
      >
        <svg
          v-if="loading"
          class="animate-spin h-4 w-4 mr-2"
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
        <span v-if="loading">Analyzing...</span>
        <span v-else>🔄 Refresh Patterns</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !reportData" class="text-center py-12">
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
        <span>{{ progressMessage || 'Analyzing purchase patterns...' }}</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <div class="text-red-600 dark:text-red-400 mb-2">❌ Error Loading Patterns</div>
        <p class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
        <button
          class="mt-4 btn btn-secondary"
          @click="fetchPatterns"
        >
          Try Again
        </button>
      </div>
    </div>

    <!-- Pattern Report Component -->
    <PurchasePatternReport
      v-else-if="reportData"
      :data="reportData"
    />

    <!-- Empty State (No Patterns) -->
    <div
      v-else
      class="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600"
    >
      <div class="text-6xl mb-4">📊</div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No Purchase Patterns Yet
      </h3>
      <p class="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
        Purchase patterns require at least 5 purchases of the same item to detect trends.
        Start uploading receipts to build your pattern database!
      </p>
      <button
        class="btn btn-primary"
        @click="$router.push('/receipts/upload')"
      >
        📸 Upload Receipt
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import PurchasePatternReport from "@/components/reports/PurchasePatternReport.vue";
import { useReportsStore } from "@/stores/reports";

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

interface PatternReportData {
  summary: PurchasePatternSummaryDto;
  patterns: PurchasePatternDto[];
}

const router = useRouter();
const reportsStore = useReportsStore();

const loading = ref(false);
const error = ref<string | null>(null);
const reportData = ref<PatternReportData | null>(null);
const progressMessage = ref<string>('');

async function fetchPatterns() {
  loading.value = true;
  error.value = null;
  progressMessage.value = '';

  try {
    const request = {
      pluginKey: "purchase-patterns",
      parameters: {
        trend: "all",
        minConfidence: 0,
        includeEvents: false,
        includeNotifications: true
      }
    };

    const result = await reportsStore.generateReport(request, (status: string) => {
      progressMessage.value = status;
    });

    if (result && result.data) {
      reportData.value = result.data as PatternReportData;
      progressMessage.value = '';
    } else {
      error.value = "No data returned from the server";
    }
  } catch (err: any) {
    console.error("Failed to fetch purchase patterns:", err);
    error.value = err.response?.data?.message || err.message || "Failed to load purchase patterns";
    progressMessage.value = '';
  } finally {
    loading.value = false;
  }
}

async function refreshPatterns() {
  await fetchPatterns();
}

onMounted(async () => {
  await fetchPatterns();
});
</script>
