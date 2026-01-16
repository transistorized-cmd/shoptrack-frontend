import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useIntervalFn } from "@vueuse/core";
import { useOnlineStatus } from "./useOnlineStatus";
import {
  processQueue,
  getQueueStatus,
  type SyncResult,
} from "@/offline/syncQueue";
import { getPendingChangesCount } from "@/offline/db";

const SYNC_INTERVAL = 30000; // 30 seconds

export function useOfflineSync() {
  const { isOnline, shouldSync, justCameOnline } = useOnlineStatus();

  const isSyncing = ref(false);
  const lastSyncAt = ref<Date | null>(null);
  const lastSyncResult = ref<SyncResult | null>(null);
  const pendingCount = ref(0);
  const errorCount = ref(0);
  const syncError = ref<string | null>(null);

  // Whether there are pending changes
  const hasPendingChanges = computed(() => pendingCount.value > 0);

  // Whether sync is needed
  const needsSync = computed(
    () => hasPendingChanges.value && shouldSync.value && !isSyncing.value
  );

  // Update queue status
  const updateQueueStatus = async () => {
    try {
      const status = await getQueueStatus();
      pendingCount.value = status.pendingCount;
      errorCount.value = status.errorCount;
    } catch (error) {
      console.error("Failed to get queue status:", error);
    }
  };

  // Perform sync
  const sync = async (): Promise<SyncResult | null> => {
    if (isSyncing.value || !isOnline.value) {
      return null;
    }

    isSyncing.value = true;
    syncError.value = null;

    try {
      const result = await processQueue();
      lastSyncAt.value = new Date();
      lastSyncResult.value = result;

      // Update pending count after sync
      await updateQueueStatus();

      return result;
    } catch (error) {
      syncError.value =
        error instanceof Error ? error.message : "Sync failed";
      console.error("Sync failed:", error);
      return null;
    } finally {
      isSyncing.value = false;
    }
  };

  // Periodic sync when online with pending changes
  const { pause: pauseAutoSync, resume: resumeAutoSync } = useIntervalFn(
    async () => {
      if (needsSync.value) {
        await sync();
      }
    },
    SYNC_INTERVAL,
    { immediate: false }
  );

  // Auto-sync when coming back online
  watch(justCameOnline, async (came) => {
    if (came && hasPendingChanges.value) {
      // Small delay to ensure network is stable
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await sync();
    }
  });

  // Update queue status periodically
  const { pause: pauseStatusUpdate } = useIntervalFn(
    updateQueueStatus,
    10000, // Every 10 seconds
    { immediate: true }
  );

  onMounted(async () => {
    await updateQueueStatus();
    resumeAutoSync();
  });

  onUnmounted(() => {
    pauseAutoSync();
    pauseStatusUpdate();
  });

  return {
    // State
    isSyncing,
    lastSyncAt,
    lastSyncResult,
    pendingCount,
    errorCount,
    syncError,

    // Computed
    hasPendingChanges,
    needsSync,

    // Methods
    sync,
    updateQueueStatus,
  };
}
