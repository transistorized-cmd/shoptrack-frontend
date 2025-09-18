<template>
  <div
    class="card p-4 sm:p-6 hover:shadow-lg transition-shadow cursor-pointer relative"
    @click="handleCardClick"
  >
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-2 sm:space-y-0">
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white truncate">
          {{ receipt.filename }}
        </h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {{
            receipt.receiptDate ? formatDate(receipt.receiptDate) : "No date"
          }}
        </p>
      </div>

      <div class="self-start sm:ml-2 flex-shrink-0">
        <button
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 dark:hover:text-red-300 transition-colors z-10 relative"
          title="Delete receipt"
          @click.stop="$emit('delete', receipt.id)"
        >
          🗑️
        </button>
      </div>
    </div>

    <!-- Receipt Number -->
    <div v-if="receipt.receiptNumber" class="mb-3">
      <p class="text-xs text-gray-500 dark:text-gray-400">Receipt #{{ receipt.receiptNumber }}</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div class="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ receipt.totalItemsDetected }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400">Items Detected</p>
      </div>
      <div class="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ receipt.successfullyParsed }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400">Successfully Parsed</p>
      </div>
    </div>

    <!-- Items Preview -->
    <div v-if="receipt.items && receipt.items.length > 0" class="mb-4">
      <h4 class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Items</h4>
      <div class="space-y-1">
        <div
          v-for="item in receipt.items.slice(0, 3)"
          :key="item.id"
          class="flex justify-between text-xs"
        >
          <span class="text-gray-600 dark:text-gray-300 truncate pr-2">{{ item.itemName }}</span>
          <span class="text-gray-900 dark:text-white font-medium flex-shrink-0"
            >${{ item.totalPrice.toFixed(2) }}</span
          >
        </div>
        <div
          v-if="receipt.items.length > 3"
          class="text-xs text-gray-500 dark:text-gray-400 text-center pt-1"
        >
          +{{ receipt.items.length - 3 }} more items
        </div>
      </div>
    </div>

    <!-- Processing Indicator -->
    <div v-if="receipt.processingStatus === 'processing'" class="mt-3">
      <div class="flex items-center space-x-2 text-xs text-blue-600 dark:text-blue-400">
        <svg class="animate-spin h-3 w-3" viewBox="0 0 24 24">
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
        <span>Processing...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import type { Receipt } from "@/types/receipt";
import { useDateLocalization } from "@/composables/useDateLocalization";

const router = useRouter();
const { formatDate } = useDateLocalization();

const props = defineProps<{
  receipt: Receipt;
}>();

defineEmits<{
  delete: [receiptId: number];
  view: [receiptId: number];
}>();

const handleCardClick = () => {
  router.push({ name: 'receipt-detail', params: { id: props.receipt.id.toString() } });
};

</script>
