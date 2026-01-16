<script setup lang="ts">
import { ref, computed } from "vue";
import { useOnlineStatus } from "@/composables/useOnlineStatus";
import { useOfflineSync } from "@/composables/useOfflineSync";
import { useTranslation } from "@/composables/useTranslation";

const { t } = useTranslation();
const { isOnline, connectionQuality } = useOnlineStatus();
const { isSyncing, pendingCount, errorCount, lastSyncAt, lastSyncResult, syncError, sync } =
  useOfflineSync();

const showErrorDetails = ref(false);

const statusClass = computed(() => {
  if (!isOnline.value) return "bg-gray-500";
  if (errorCount.value > 0) return "bg-red-500";
  if (pendingCount.value > 0) return "bg-yellow-500";
  return "bg-green-500";
});

const statusText = computed(() => {
  if (!isOnline.value) return t("shoppingList.sync.offline");
  if (isSyncing.value) return t("shoppingList.sync.syncing");
  if (errorCount.value > 0)
    return t("shoppingList.sync.errors", { count: errorCount.value });
  if (pendingCount.value > 0)
    return t("shoppingList.sync.pending", { count: pendingCount.value });
  return t("shoppingList.sync.synced");
});

const formattedLastSync = computed(() => {
  if (!lastSyncAt.value) return null;
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "numeric",
  }).format(lastSyncAt.value);
});

// Get error messages to display
const errorMessages = computed(() => {
  const messages: string[] = [];

  // Add sync error if present
  if (syncError.value) {
    messages.push(syncError.value);
  }

  // Add errors from last sync result
  if (lastSyncResult.value?.errors?.length) {
    for (const err of lastSyncResult.value.errors) {
      messages.push(err.error);
    }
  }

  // If we have error count but no specific messages, show generic message
  if (errorCount.value > 0 && messages.length === 0) {
    messages.push(t("shoppingList.sync.errorGeneric", "Some items failed to sync"));
  }

  return messages;
});

const handleSync = async () => {
  if (isOnline.value && !isSyncing.value) {
    showErrorDetails.value = false;
    await sync();
  }
};

const toggleErrorDetails = () => {
  showErrorDetails.value = !showErrorDetails.value;
};
</script>

<template>
  <div class="relative">
    <div class="flex items-center gap-2 text-sm">
      <div class="flex items-center gap-1.5">
        <span
          class="inline-block w-2 h-2 rounded-full"
          :class="[statusClass, { 'animate-pulse': isSyncing }]"
        ></span>
        <!-- Make error status clickable to show details -->
        <button
          v-if="errorCount > 0"
          @click="toggleErrorDetails"
          class="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1"
        >
          {{ statusText }}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3.5 w-3.5 transition-transform"
            :class="{ 'rotate-180': showErrorDetails }"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        <span v-else class="text-gray-600 dark:text-gray-400">{{ statusText }}</span>
      </div>

      <button
        v-if="isOnline && (pendingCount > 0 || errorCount > 0) && !isSyncing"
        @click="handleSync"
        class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
      >
        {{ t("shoppingList.sync.syncNow") }}
      </button>

      <span
        v-if="formattedLastSync && isOnline && pendingCount === 0 && errorCount === 0"
        class="text-xs text-gray-500 dark:text-gray-500"
      >
        {{ t("shoppingList.sync.lastSync", { time: formattedLastSync }) }}
      </span>
    </div>

    <!-- Error details dropdown -->
    <div
      v-if="showErrorDetails && errorMessages.length > 0"
      class="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
    >
      <div class="p-3">
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-sm font-medium text-gray-900 dark:text-white">
            {{ t("shoppingList.sync.errorDetails", "Sync Errors") }}
          </h4>
          <button
            @click="showErrorDetails = false"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
        <ul class="space-y-1.5 max-h-40 overflow-y-auto">
          <li
            v-for="(msg, idx) in errorMessages"
            :key="idx"
            class="text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{{ msg }}</span>
          </li>
        </ul>
        <button
          v-if="isOnline && !isSyncing"
          @click="handleSync"
          class="mt-3 w-full px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded transition-colors"
        >
          {{ t("shoppingList.sync.retrySync", "Retry Sync") }}
        </button>
      </div>
    </div>
  </div>
</template>
