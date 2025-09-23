<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4">
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        @click="closeModal"
      />

      <!-- Modal -->
      <div
        class="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between p-6 border-b border-gray-200"
        >
          <div>
            <h2 class="text-xl font-semibold text-gray-900">Receipt Details</h2>
            <p class="text-sm text-gray-500">{{ receipt.filename }}</p>
          </div>
          <button class="text-gray-400 hover:text-gray-600" @click="closeModal">
            <svg
              class="w-6 h-6"
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

        <!-- Content -->
        <div class="flex flex-col lg:flex-row max-h-[calc(90vh-140px)]">
          <!-- Image Section -->
          <div class="lg:w-1/2 p-6 border-r border-gray-200">
            <h3 class="text-lg font-medium text-gray-900 mb-4">
              Receipt Image
            </h3>
            <div class="bg-gray-100 rounded-lg overflow-hidden">
              <img
                v-if="imageUrl"
                :src="imageUrl"
                :alt="receipt.filename"
                class="w-full h-auto object-contain max-h-[500px]"
                @error="handleImageError"
              />
              <div
                v-else
                class="flex items-center justify-center h-64 text-gray-500"
              >
                <div class="text-center">
                  <svg
                    class="w-12 h-12 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p>Image not available</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Details Section -->
          <div class="lg:w-1/2 p-6 overflow-y-auto">
            <!-- Basic Info -->
            <div class="mb-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4">
                Receipt Information
              </h3>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-sm font-medium text-gray-500">Date:</span>
                  <span class="text-sm text-gray-900">
                    {{
                      receipt.receiptDate
                        ? formatDate(receipt.receiptDate)
                        : "N/A"
                    }}
                  </span>
                </div>
                <div v-if="receipt.receiptNumber" class="flex justify-between">
                  <span class="text-sm font-medium text-gray-500"
                    >Receipt #:</span
                  >
                  <span class="text-sm text-gray-900">{{
                    receipt.receiptNumber
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm font-medium text-gray-500">Status:</span>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="getStatusColor(receipt.processingStatus)"
                  >
                    {{ receipt.processingStatus }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm font-medium text-gray-500"
                    >Items Detected:</span
                  >
                  <span class="text-sm text-gray-900">{{
                    receipt.totalItemsDetected
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm font-medium text-gray-500"
                    >Successfully Parsed:</span
                  >
                  <span class="text-sm text-gray-900">{{
                    receipt.successfullyParsed
                  }}</span>
                </div>
                <div
                  v-if="receipt.imageQualityAssessment"
                  class="flex justify-between"
                >
                  <span class="text-sm font-medium text-gray-500"
                    >Image Quality:</span
                  >
                  <span class="text-sm text-gray-900">{{
                    receipt.imageQualityAssessment
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Items List -->
            <div v-if="receipt.items && receipt.items.length > 0">
              <h3 class="text-lg font-medium text-gray-900 mb-4">
                Items ({{ receipt.items.length }})
              </h3>
              <div class="space-y-2 max-h-96 overflow-y-auto">
                <div
                  v-for="item in receipt.items"
                  :key="item.id"
                  class="bg-gray-50 rounded-lg p-3"
                >
                  <div class="flex justify-between items-start mb-2">
                    <h4 class="text-sm font-medium text-gray-900">
                      {{ item.itemName }}
                    </h4>
                    <span class="text-sm font-semibold text-gray-900">
                      {{ formatAmountCompact(item.totalPrice, receipt.currency) }}
                    </span>
                  </div>
                  <div class="flex justify-between text-xs text-gray-500">
                    <span>Qty: {{ item.quantity || 1 }}</span>
                    <span>
                      Unit: {{ formatAmountCompact(item.pricePerUnit || 0, receipt.currency) }}
                    </span>
                    <span
                      v-if="(item.category?.id && categoriesStore.getName(item.category.id, locale)) || item.category?.name || item.categoryRaw || (item as any).category"
                      class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded"
                    >
                      {{ capitalizeFirst((item.category?.id && categoriesStore.getName(item.category.id, locale)) || item.category?.name || item.categoryRaw || (item as any).category) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Total -->
              <div class="mt-4 pt-4 border-t border-gray-200">
                <div class="flex justify-between items-center">
                  <span class="text-lg font-semibold text-gray-900"
                    >Total:</span
                  >
                  <span class="text-lg font-bold text-gray-900">
                    {{
                      formatAmountCompact(
                        receipt.items.reduce((sum, item) => sum + item.totalPrice, 0),
                        receipt.currency
                      )
                    }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Claude Response (Debug) -->
            <div
              v-if="receipt.claudeResponseJson && showDebugInfo"
              class="mt-6"
            >
              <h3 class="text-lg font-medium text-gray-900 mb-2">
                Claude AI Response
              </h3>
              <pre class="bg-gray-100 p-3 rounded text-xs overflow-x-auto">{{
                JSON.stringify(receipt.claudeResponseJson, null, 2)
              }}</pre>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="flex items-center justify-between p-6 border-t border-gray-200"
        >
          <button
            class="text-sm text-gray-500 hover:text-gray-700"
            @click="showDebugInfo = !showDebugInfo"
          >
            {{ showDebugInfo ? "Hide" : "Show" }} Debug Info
          </button>
          <div class="flex space-x-3">
            <button
              class="btn btn-secondary"
              @click="$emit('reprocess', receipt.id)"
            >
              🔄 Reprocess
            </button>
            <button class="btn btn-primary" @click="closeModal">Close</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { Receipt } from "@/types/receipt";
import { useDateLocalization } from "@/composables/useDateLocalization";
import { useCurrencyFormat } from "@/composables/useCurrencyFormat";
import { useCategoriesStore } from "@/stores/categories";
import { getCurrentLocale } from "@/i18n";

const props = defineProps<{
  isOpen: boolean;
  receipt: Receipt;
}>();

const emit = defineEmits<{
  close: [];
  reprocess: [receiptId: number];
}>();

const { formatDate } = useDateLocalization();
const { formatAmountCompact } = useCurrencyFormat();
const categoriesStore = useCategoriesStore();
const showDebugInfo = ref(false);
const imageUrl = ref<string | null>(null);
const locale = ref(getCurrentLocale());

// Utility function for capitalizing text
const capitalizeFirst = (str: string) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const closeModal = () => {
  emit("close");
};


const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "processing":
      return "bg-blue-100 text-blue-800";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const handleImageError = () => {
  imageUrl.value = null;
};

// Load image when modal opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen && props.receipt.id) {
      imageUrl.value = `/api/receipts/${props.receipt.id}/image`;
    } else {
      imageUrl.value = null;
    }
  },
);

// Update locale when language changes
watch(
  () => getCurrentLocale(),
  async (newLocale) => {
    locale.value = newLocale;
    // Fetch categories in the new locale to ensure localized names are available
    await categoriesStore.fetchCategories(newLocale);
  },
);
</script>
