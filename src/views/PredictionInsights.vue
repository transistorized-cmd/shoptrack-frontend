<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
      <div class="text-center sm:text-left">
        <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          🔮 Purchase Predictions
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
          AI-powered insights into your future shopping patterns
        </p>
      </div>

      <!-- Refresh Button -->
      <button
        :disabled="loading"
        class="btn btn-primary w-full sm:w-auto"
        @click="refreshPredictions"
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
        <span v-else>🔄 Refresh Predictions</span>
      </button>
    </div>

    <!-- Report Type Selector -->
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Report Type
          </label>
          <select
            v-model="reportType"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-shoptrack-500 focus:border-shoptrack-500 dark:bg-gray-700 dark:text-white"
            @change="fetchPredictions"
          >
            <option value="active_predictions">🎯 Active Predictions</option>
            <option value="accuracy">📊 Prediction Accuracy</option>
            <option value="new_products">🆕 New Product Discovery</option>
          </select>
        </div>

        <div v-if="reportType === 'active_predictions'">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Days Ahead
          </label>
          <input
            v-model.number="daysAhead"
            type="number"
            min="7"
            max="90"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-shoptrack-500 focus:border-shoptrack-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div v-if="reportType === 'active_predictions'">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Min Confidence: {{ (minConfidence * 100).toFixed(0) }}%
          </label>
          <input
            v-model.number="minConfidence"
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            class="w-full"
          />
        </div>
      </div>
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
        <span>{{ progressMessage || 'Generating predictions...' }}</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <div class="text-red-600 dark:text-red-400 mb-2">❌ Error Loading Predictions</div>
        <p class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
        <button
          class="mt-4 btn btn-secondary"
          @click="fetchPredictions"
        >
          Try Again
        </button>
      </div>
    </div>

    <!-- Prediction Report Component -->
    <PredictionInsightsReport
      v-else-if="reportData"
      :data="reportData"
      :report-type="reportType"
    />

    <!-- Empty State (No Predictions) -->
    <div
      v-else
      class="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600"
    >
      <div class="text-6xl mb-4">🔮</div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No Predictions Yet
      </h3>
      <p class="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
        Predictions require purchase patterns with at least 3 purchases per item.
        Start uploading receipts to build your prediction database!
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
import PredictionInsightsReport from "@/components/reports/PredictionInsightsReport.vue";
import { useReportsStore } from "@/stores/reports";

const router = useRouter();
const reportsStore = useReportsStore();

const loading = ref(false);
const error = ref<string | null>(null);
const reportData = ref<any | null>(null);
const progressMessage = ref<string>('');

// Configuration
const reportType = ref<string>('active_predictions');
const daysAhead = ref<number>(30);
const minConfidence = ref<number>(0.3);

async function fetchPredictions() {
  loading.value = true;
  error.value = null;
  progressMessage.value = '';

  try {
    const request = {
      pluginKey: "prediction-insights",
      parameters: {
        reportType: reportType.value,
        daysAhead: daysAhead.value,
        minConfidence: minConfidence.value
      }
    };

    const result = await reportsStore.generateReport(request, (status: string) => {
      progressMessage.value = status;
    });

    if (result && result.data) {
      reportData.value = result.data;
      progressMessage.value = '';
    } else {
      error.value = "No data returned from the server";
    }
  } catch (err: any) {
    console.error("Failed to fetch predictions:", err);
    error.value = err.response?.data?.message || err.message || "Failed to load predictions";
    progressMessage.value = '';
  } finally {
    loading.value = false;
  }
}

async function refreshPredictions() {
  await fetchPredictions();
}

onMounted(async () => {
  await fetchPredictions();
});
</script>
