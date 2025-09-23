<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:items-center sm:justify-between">
      <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{{ $t('receipts.title') }}</h1>
      <RouterLink to="/upload" class="btn btn-primary w-full sm:w-auto text-center">
        {{ $t('receipts.uploadReceipt') }}
      </RouterLink>
    </div>

    <!-- Filters -->
    <div class="card p-4 sm:p-6">
      <h2 class="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4 sm:hidden">{{ $t('receipts.filters.title') }}</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label
            for="status"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >{{ $t('receipts.filters.status') }}</label
          >
          <select
            id="status"
            v-model="filters.processingStatus"
            class="input w-full"
            @change="fetchReceipts"
          >
            <option value="">{{ $t('receipts.filters.allStatuses') }}</option>
            <option value="pending">{{ $t('receipts.status.pending') }}</option>
            <option value="processing">{{ $t('receipts.status.processing') }}</option>
            <option value="completed">{{ $t('receipts.status.completed') }}</option>
            <option value="failed">{{ $t('receipts.status.failed') }}</option>
          </select>
        </div>

        <div>
          <label
            for="startDate"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >{{ $t('receipts.filters.startDate') }}</label
          >
          <LocalizedDateInput
            id="startDate"
            v-model="filters.startDate"
            class="input w-full"
            @change="fetchReceipts"
          />
        </div>

        <div>
          <label
            for="endDate"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >{{ $t('receipts.filters.endDate') }}</label
          >
          <LocalizedDateInput
            id="endDate"
            v-model="filters.endDate"
            class="input w-full"
            @change="fetchReceipts"
          />
        </div>

        <div class="col-span-full sm:col-span-2 lg:col-span-1">
          <label
            for="search"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >{{ $t('common.search') }}</label
          >
          <input
            id="search"
            v-model="filters.search"
            type="text"
            :placeholder="$t('receipts.searchPlaceholder')"
            class="input w-full"
            @input="debouncedSearch"
          />
        </div>
      </div>
    </div>

    <!-- Receipts Grid -->
    <div v-if="receiptsStore.loading" class="text-center py-12">
      <div class="inline-flex items-center space-x-2">
        <svg
          class="animate-spin h-5 w-5 text-shoptrack-600"
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
        <span class="text-gray-500 dark:text-gray-400">{{ $t('receipts.loadingReceipts') }}</span>
      </div>
    </div>

    <div v-else-if="receiptsStore.error" class="text-center py-12">
      <div class="text-red-600 dark:text-red-400">{{ receiptsStore.error }}</div>
      <button class="btn btn-secondary mt-4" @click="fetchReceipts">
        {{ $t('receipts.tryAgain') }}
      </button>
    </div>

    <div v-else-if="!receiptsStore.hasReceipts" class="text-center py-12">
      <div class="text-gray-500 dark:text-gray-400 mb-4">{{ $t('receipts.noReceiptsMessage') }}</div>
      <RouterLink to="/upload" class="btn btn-primary"
        >{{ $t('receipts.uploadFirstReceipt') }}</RouterLink
      >
    </div>

    <div v-else class="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      <ReceiptCard
        v-for="receipt in receiptsStore.receipts"
        :key="receipt.id"
        :receipt="receipt"
        @delete="handleDelete"
      />
    </div>

    <!-- Pagination -->
    <div
      v-if="receiptsStore.pagination.totalPages > 1"
      class="card p-4"
    >
      <div class="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:items-center sm:justify-between">
        <div class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center sm:text-left">
          {{ $t('receipts.showingResults', {
            start: (receiptsStore.pagination.page - 1) * receiptsStore.pagination.pageSize + 1,
            end: Math.min(
              receiptsStore.pagination.page * receiptsStore.pagination.pageSize,
              receiptsStore.pagination.totalCount
            ),
            total: receiptsStore.pagination.totalCount
          }) }}
        </div>

        <div class="flex items-center justify-center space-x-2 sm:space-x-4">
          <button
            :disabled="receiptsStore.pagination.page <= 1"
            class="btn btn-secondary disabled:opacity-50 text-sm px-4 py-2 min-w-[44px] flex items-center justify-center"
            @click="previousPage"
          >
            <span class="sm:hidden text-lg">‹</span>
            <span class="hidden sm:inline">{{ $t('receipts.previous') }}</span>
          </button>

          <span class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md">
            {{ $t('receipts.page', {
              current: receiptsStore.pagination.page,
              total: receiptsStore.pagination.totalPages
            }) }}
          </span>

          <button
            :disabled="
              receiptsStore.pagination.page >= receiptsStore.pagination.totalPages
            "
            class="btn btn-secondary disabled:opacity-50 text-sm px-4 py-2 min-w-[44px] flex items-center justify-center"
            @click="nextPage"
          >
            <span class="sm:hidden text-lg">›</span>
            <span class="hidden sm:inline">{{ $t('receipts.next') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { useTranslation } from "@/composables/useTranslation";
import { TIMEOUT } from "@/constants/app";
import { useReceiptsStore } from "@/stores/receipts";
import ReceiptCard from "@/components/receipts/ReceiptCard.vue";
import LocalizedDateInput from "@/components/common/LocalizedDateInput.vue";
import { useDebounceFn } from "@vueuse/core";

const { t } = useTranslation();
const receiptsStore = useReceiptsStore();

const filters = ref({
  processingStatus: "",
  startDate: "",
  endDate: "",
  search: "",
});

const fetchReceipts = async () => {
  const query = {
    page: receiptsStore.pagination.page,
    pageSize: receiptsStore.pagination.pageSize,
    ...Object.fromEntries(
      Object.entries(filters.value).filter(([_, value]) => value !== ""),
    ),
  };

  await receiptsStore.fetchReceipts(query);
};

const debouncedSearch = useDebounceFn(fetchReceipts, TIMEOUT.DEBOUNCE_SEARCH);

const nextPage = async () => {
  if (receiptsStore.pagination.page < receiptsStore.pagination.totalPages) {
    receiptsStore.pagination.page++;
    await fetchReceipts();
  }
};

const previousPage = async () => {
  if (receiptsStore.pagination.page > 1) {
    receiptsStore.pagination.page--;
    await fetchReceipts();
  }
};

const handleDelete = async (receiptId: number) => {
  if (confirm(t('receipts.deleteConfirm'))) {
    try {
      await receiptsStore.deleteReceipt(receiptId);
    } catch (error) {
      console.error("Failed to delete receipt:", error);
    }
  }
};

onMounted(() => {
  fetchReceipts();
});
</script>
