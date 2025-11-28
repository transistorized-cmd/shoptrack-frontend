<template>
  <div class="space-y-6">
    <!-- Active Predictions Report -->
    <template v-if="reportType === 'active_predictions'">
      <!-- Summary Statistics -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Predictions</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ summary?.totalPredictions || 0 }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-700">
          <p class="text-sm font-medium text-green-600 dark:text-green-400">🎯 High Confidence</p>
          <p class="text-2xl font-bold text-green-700 dark:text-green-300">
            {{ summary?.highConfidencePredictions || 0 }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
          <p class="text-sm font-medium text-blue-600 dark:text-blue-400">📈 Patterns Analyzed</p>
          <p class="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {{ summary?.patternsAnalyzed || 0 }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
          <p class="text-sm font-medium text-purple-600 dark:text-purple-400">📅 Timeframe</p>
          <p class="text-lg font-bold text-purple-700 dark:text-purple-300">
            {{ summary?.timeframe || 'Next 30 days' }}
          </p>
        </div>
      </div>

      <!-- Upcoming Days Preview -->
      <div v-if="upcomingDays && upcomingDays.length > 0" class="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          📆 Upcoming Predictions by Day
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div
            v-for="day in upcomingDays"
            :key="day.date"
            class="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center"
          >
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400">
              {{ formatShortDate(day.date) }}
            </p>
            <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {{ day.count }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ day.dayOfWeek }}
            </p>
          </div>
        </div>
      </div>

      <!-- Priority Breakdown -->
      <div v-if="priorityBreakdown" class="space-y-4">
        <!-- High Priority -->
        <div v-if="priorityBreakdown.high && priorityBreakdown.high.length > 0">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
            <span class="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
            High Priority ({{ priorityBreakdown.high.length }})
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PredictionCard
              v-for="prediction in priorityBreakdown.high"
              :key="prediction.id"
              :prediction="prediction"
              priority="high"
            />
          </div>
        </div>

        <!-- Medium Priority -->
        <div v-if="priorityBreakdown.medium && priorityBreakdown.medium.length > 0">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
            <span class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
            Medium Priority ({{ priorityBreakdown.medium.length }})
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PredictionCard
              v-for="prediction in priorityBreakdown.medium"
              :key="prediction.id"
              :prediction="prediction"
              priority="medium"
            />
          </div>
        </div>

        <!-- Low Priority -->
        <div v-if="priorityBreakdown.low && priorityBreakdown.low.length > 0">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
            <span class="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
            Low Priority ({{ priorityBreakdown.low.length }})
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PredictionCard
              v-for="prediction in priorityBreakdown.low"
              :key="prediction.id"
              :prediction="prediction"
              priority="low"
            />
          </div>
        </div>
      </div>

      <!-- All Predictions List -->
      <div v-if="allPredictions && allPredictions.length > 0">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          📋 All Predictions ({{ allPredictions.length }})
        </h3>
        <div class="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Item</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Predicted Date</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Confidence</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Purchases</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Avg. Interval</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Priority</th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="prediction in allPredictions" :key="prediction.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">{{ prediction.itemName }}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">{{ prediction.categoryName }}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-900 dark:text-white">{{ formatDate(prediction.predictedDate) }}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">{{ prediction.daysUntilPrediction }} days away</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2">
                        <div
                          class="h-2 rounded-full"
                          :class="getConfidenceColor(prediction.confidenceScore)"
                          :style="{ width: `${(prediction.confidenceScore || 0) * 100}%` }"
                        ></div>
                      </div>
                      <span class="text-sm text-gray-900 dark:text-white">
                        {{ ((prediction.confidenceScore || 0) * 100).toFixed(0) }}%
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {{ prediction.purchaseCount || 0 }}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ~{{ (prediction.averageDaysBetween || 0).toFixed(0) }} days
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span
                      class="px-2 py-1 text-xs font-medium rounded-full"
                      :class="getPriorityBadgeClass(prediction.priority)"
                    >
                      {{ prediction.priority }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- No Predictions State -->
      <div
        v-if="!allPredictions || allPredictions.length === 0"
        class="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600"
      >
        <div class="text-6xl mb-4">🔮</div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No Predictions Found</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          Try adjusting your filters or wait for more purchase data to be analyzed.
        </p>
      </div>
    </template>

    <!-- Accuracy Report -->
    <template v-else-if="reportType === 'accuracy'">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Predictions</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ accuracyStats?.totalPredictions || 0 }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-700">
          <p class="text-sm font-medium text-green-600 dark:text-green-400">✓ Accurate</p>
          <p class="text-2xl font-bold text-green-700 dark:text-green-300">
            {{ accuracyStats?.accurateCount || 0 }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
          <p class="text-sm font-medium text-blue-600 dark:text-blue-400">📊 Accuracy Rate</p>
          <p class="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {{ ((accuracyStats?.overallAccuracy || 0) * 100).toFixed(1) }}%
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
          <p class="text-sm font-medium text-purple-600 dark:text-purple-400">⏱️ Avg Timing</p>
          <p class="text-2xl font-bold text-purple-700 dark:text-purple-300">
            ±{{ (accuracyStats?.averageTimingAccuracy || 0).toFixed(1) }} days
          </p>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Accuracy Analysis</h3>
        <p class="text-gray-600 dark:text-gray-400">
          Based on historical predictions, your shopping patterns are being predicted with
          <strong>{{ ((accuracyStats?.overallAccuracy || 0) * 100).toFixed(1) }}%</strong> accuracy.
          The average timing variance is
          <strong>±{{ (accuracyStats?.averageTimingAccuracy || 0).toFixed(1) }} days</strong>
          from the predicted purchase date.
        </p>
      </div>
    </template>

    <!-- New Products Report -->
    <template v-else-if="reportType === 'new_products'">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total New Products</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ newProductsSummary?.totalNewProducts || 0 }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
          <p class="text-sm font-medium text-orange-600 dark:text-orange-400">🍂 Seasonal</p>
          <p class="text-2xl font-bold text-orange-700 dark:text-orange-300">
            {{ newProductsSummary?.seasonalProducts || 0 }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
          <p class="text-sm font-medium text-purple-600 dark:text-purple-400">🧪 Experimental</p>
          <p class="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {{ newProductsSummary?.experimentalProducts || 0 }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
          <p class="text-sm font-medium text-blue-600 dark:text-blue-400">🎲 Occasional</p>
          <p class="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {{ newProductsSummary?.occasionalProducts || 0 }}
          </p>
        </div>
      </div>

      <!-- New Products List -->
      <div v-if="newProducts && newProducts.length > 0">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          🆕 Recently Discovered Products
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="product in newProducts"
            :key="product.id"
            class="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700"
          >
            <h4 class="font-semibold text-gray-900 dark:text-white mb-2">
              {{ product.itemNameNormalized }}
            </h4>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Classification:</span>
                <span
                  class="font-medium px-2 py-0.5 rounded-full text-xs"
                  :class="getClassificationBadgeClass(product.classification)"
                >
                  {{ product.classification }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Confidence:</span>
                <span class="font-medium text-gray-900 dark:text-white">
                  {{ ((product.classificationConfidence || 0) * 100).toFixed(0) }}%
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">First Seen:</span>
                <span class="font-medium text-gray-900 dark:text-white">
                  {{ formatDate(product.firstSeenDate) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import PredictionCard from "./PredictionCard.vue";

interface PredictionSnapshot {
  id: number;
  itemName: string;
  itemNameNormalized: string;
  categoryId: number | null;
  categoryName: string;
  predictedDate: string;
  confidenceScore: number | null;
  purchaseCount: number;
  averageDaysBetween: number | null;
  trend: string | null;
  lastPurchaseDate: string | null;
  daysUntilPrediction: number;
  priority: string;
}

interface UpcomingDay {
  date: string;
  dayOfWeek: string;
  predictions: PredictionSnapshot[];
  count: number;
}

interface NewProduct {
  id: number;
  itemNameNormalized: string;
  classification: string;
  classificationConfidence: number;
  firstSeenDate: string;
  category?: string;
}

const props = defineProps<{
  data: any;
  reportType: string;
}>();

// Computed properties for different report types
const summary = computed(() => props.data?.summary);
const allPredictions = computed(() => props.data?.allPredictions || []);
const priorityBreakdown = computed(() => props.data?.priorityBreakdown);
const upcomingDays = computed(() => props.data?.upcomingDays || []);
const accuracyStats = computed(() => props.data?.accuracyStats || props.data?.summary);
const newProducts = computed(() => props.data?.newProducts || []);
const newProductsSummary = computed(() => props.data?.summary);

// Methods
function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatShortDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getConfidenceColor(score: number | null): string {
  const confidence = score || 0;
  if (confidence >= 0.7) return 'bg-green-500';
  if (confidence >= 0.5) return 'bg-yellow-500';
  return 'bg-gray-400';
}

function getPriorityBadgeClass(priority: string): string {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'low':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
}

function getClassificationBadgeClass(classification: string): string {
  switch (classification) {
    case 'seasonal':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'experimental':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'occasional':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
}
</script>
