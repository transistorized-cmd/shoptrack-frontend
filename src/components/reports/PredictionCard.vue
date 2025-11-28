<template>
  <div
    class="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 hover:shadow-md transition-shadow"
    :class="{
      'border-l-4 border-l-red-500': priority === 'high',
      'border-l-4 border-l-yellow-500': priority === 'medium',
      'border-l-4 border-l-gray-400': priority === 'low'
    }"
  >
    <h4 class="font-semibold text-gray-900 dark:text-white mb-2 truncate" :title="prediction.itemName">
      {{ prediction.itemName }}
    </h4>
    <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">{{ prediction.categoryName || 'Uncategorized' }}</p>
    <div class="space-y-1 text-sm">
      <div class="flex justify-between">
        <span class="text-gray-600 dark:text-gray-400">Date:</span>
        <span class="font-medium text-gray-900 dark:text-white">{{ formatDate(prediction.predictedDate) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600 dark:text-gray-400">Confidence:</span>
        <span class="font-bold" :class="getConfidenceTextColor(prediction.confidenceScore)">
          {{ ((prediction.confidenceScore || 0) * 100).toFixed(0) }}%
        </span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600 dark:text-gray-400">Purchases:</span>
        <span class="font-medium text-gray-900 dark:text-white">
          {{ prediction.purchaseCount || 0 }}
        </span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600 dark:text-gray-400">Days Away:</span>
        <span
          class="font-bold"
          :class="{
            'text-red-600 dark:text-red-400': prediction.daysUntilPrediction <= 3,
            'text-orange-600 dark:text-orange-400': prediction.daysUntilPrediction > 3 && prediction.daysUntilPrediction <= 7,
            'text-blue-600 dark:text-blue-400': prediction.daysUntilPrediction > 7
          }"
        >
          {{ prediction.daysUntilPrediction }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Prediction {
  id: number;
  itemName: string;
  categoryName?: string;
  predictedDate: string;
  confidenceScore: number | null;
  purchaseCount: number;
  daysUntilPrediction: number;
}

defineProps<{
  prediction: Prediction;
  priority: 'high' | 'medium' | 'low';
}>();

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getConfidenceTextColor(score: number | null): string {
  const confidence = score || 0;
  if (confidence >= 0.7) return 'text-green-600 dark:text-green-400';
  if (confidence >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-gray-600 dark:text-gray-400';
}
</script>
