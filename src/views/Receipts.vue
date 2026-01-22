<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:items-center sm:justify-between">
      <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{{ $t('receipts.title') }}</h1>
      <div class="relative">
        <RouterLink
          v-if="!receiptLimitReached"
          to="/upload"
          class="btn btn-primary w-full sm:w-auto text-center"
        >
          {{ $t('receipts.uploadReceipt') }}
        </RouterLink>
        <button
          v-else
          :disabled="true"
          class="btn btn-primary opacity-50 cursor-not-allowed w-full sm:w-auto"
          @click="openSubscriptionModal"
        >
          {{ $t('receipts.uploadReceipt') }}
        </button>
      </div>
    </div>

    <!-- Upgrade Prompt for Receipt Limit -->
    <div
      v-if="receiptLimitReached && upgradeMessage"
      class="card border-l-4 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6"
    >
      <div class="flex items-start space-x-4">
        <div class="flex-shrink-0">
          <div class="w-10 h-10 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-amber-600 dark:text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
            {{ upgradeMessage.title }}
          </h3>
          <p class="text-amber-700 dark:text-amber-300 mb-4">
            {{ upgradeMessage.message }}
          </p>
          <div class="flex flex-col sm:flex-row gap-3">
            <button
              @click="openSubscriptionModal"
              class="btn bg-amber-600 hover:bg-amber-700 text-white border-amber-600 hover:border-amber-700 w-full sm:w-auto"
            >
              {{ upgradeMessage.actionText || $t('receipts.upgrade') }}
            </button>
            <button
              @click="receiptLimitReached = false"
              class="btn btn-secondary w-full sm:w-auto"
            >
              {{ $t('common.dismiss') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-4 sm:p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base sm:text-lg font-medium text-gray-900 dark:text-white">{{ $t('receipts.filters.title') }}</h2>
        <button
          v-if="hasActiveFilters"
          type="button"
          class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
          @click="handleClearAllFilters"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          {{ $t('receipts.filters.clearAll') }}
        </button>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label
            for="startDate"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >{{ $t('receipts.filters.startDate') }}</label
          >
          <div class="relative">
            <LocalizedDateInput
              id="startDate"
              v-model="filters.startDate"
              class="input w-full"
              :min-date="minAllowedDate"
              @change="fetchReceipts"
            />
            <button
              v-if="filters.startDate"
              type="button"
              class="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              :title="$t('receipts.filters.clearStartDate')"
              @click="handleClearFilter('startDate')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div>
          <label
            for="endDate"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >{{ $t('receipts.filters.endDate') }}</label
          >
          <div class="relative">
            <LocalizedDateInput
              id="endDate"
              v-model="filters.endDate"
              class="input w-full"
              :min-date="minAllowedDate"
              @change="fetchReceipts"
            />
            <button
              v-if="filters.endDate"
              type="button"
              class="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              :title="$t('receipts.filters.clearEndDate')"
              @click="handleClearFilter('endDate')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="col-span-full sm:col-span-2 lg:col-span-1">
          <label
            for="search"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >{{ $t('common.search') }}</label
          >
          <div class="relative">
            <input
              id="search"
              v-model="filters.search"
              type="text"
              :placeholder="$t('receipts.searchPlaceholder')"
              class="input w-full pr-8"
              @input="debouncedSearch"
            />
            <button
              v-if="filters.search"
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              :title="$t('receipts.filters.clearSearch')"
              @click="handleClearFilter('search')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
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

    <!-- Subscription Modal -->
    <SubscriptionModal
      :is-open="showSubscriptionModal"
      @close="closeSubscriptionModal"
      @subscribed="handleSubscribed"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { RouterLink } from "vue-router";
import { useTranslation } from "@/composables/useTranslation";
import { TIMEOUT } from "@/constants/app";
import { useReceiptsStore } from "@/stores/receipts";
import ReceiptCard from "@/components/receipts/ReceiptCard.vue";
import LocalizedDateInput from "@/components/common/LocalizedDateInput.vue";
import SubscriptionModal from "@/components/SubscriptionModal.vue";
import { useDebounceFn } from "@vueuse/core";
import { featureService, type FeatureMessage } from "@/services/featureService";
import { useReceiptFilterPersistence, type ReceiptFilters } from "@/composables/useFilterPersistence";

const { t, locale } = useTranslation();
const receiptsStore = useReceiptsStore();

// Format date to YYYY-MM-DD using local timezone (not UTC)
// This prevents off-by-one day issues for users in timezones like UTC+1
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Use persisted filters
const { filters, hasActiveFilters, clearFilter, clearAllFilters } = useReceiptFilterPersistence();

const receiptLimitReached = ref(false);
const upgradeMessage = ref<FeatureMessage | null>(null);
const checkingLimit = ref(false);
const showSubscriptionModal = ref(false);

// Date constraints for user's membership limits
const historyDaysLimit = ref<number | null>(null);
const minAllowedDate = computed(() => {
  if (!historyDaysLimit.value) return undefined;
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - historyDaysLimit.value);
  return formatLocalDate(minDate);
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
  // Check receipt limit after fetching receipts to show/hide upgrade prompt
  await checkReceiptLimit();
};

const debouncedSearch = useDebounceFn(fetchReceipts, TIMEOUT.DEBOUNCE_SEARCH);

// Filter clear handlers
const handleClearFilter = (key: keyof ReceiptFilters) => {
  clearFilter(key);
  fetchReceipts();
};

const handleClearAllFilters = () => {
  clearAllFilters();
  fetchReceipts();
};

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
      // Re-check limits after deletion
      await checkReceiptLimit();
    } catch (error) {
      console.error("Failed to delete receipt:", error);
    }
  }
};

const fetchUpgradeMessage = async () => {
  try {
    upgradeMessage.value = await featureService.getFeatureMessage(
      'receipt_monthly_limit',
      'upgrade_prompt',
      locale.value // Pass current locale to get localized message
    );
  } catch (error) {
    console.error("Failed to get upgrade message:", error);
    upgradeMessage.value = null;
  }
};

const checkReceiptLimit = async () => {
  if (checkingLimit.value) return;

  checkingLimit.value = true;
  try {
    const limitResult = await featureService.checkReceiptUploadLimit();

    // Show upgrade prompt if limit is reached or exceeded
    receiptLimitReached.value = limitResult.isLimitReached;

    if (limitResult.isLimitReached) {
      await fetchUpgradeMessage();
    } else {
      upgradeMessage.value = null;
    }
  } catch (error) {
    console.error("Failed to check receipt limit:", error);
  } finally {
    checkingLimit.value = false;
  }
};

const fetchHistoryLimit = async () => {
  try {
    const limitResult = await featureService.checkFeatureLimit('history_days_limit');
    historyDaysLimit.value = limitResult.limit || null;
  } catch (error) {
    console.error("Failed to get history days limit:", error);
    // Default to 30 days for free users if we can't fetch the limit
    historyDaysLimit.value = 30;
  }
};

const openSubscriptionModal = () => {
  showSubscriptionModal.value = true;
};

const closeSubscriptionModal = () => {
  showSubscriptionModal.value = false;
};

const handleSubscribed = () => {
  showSubscriptionModal.value = false;
  // Re-check limits after subscription
  checkReceiptLimit();
};

// Watch for locale changes and refetch upgrade message if limit is reached
watch(locale, async (newLocale) => {
  if (receiptLimitReached.value) {
    await fetchUpgradeMessage();
  }
});

onMounted(async () => {
  await Promise.all([
    fetchReceipts(),
    fetchHistoryLimit()
  ]);
});
</script>
