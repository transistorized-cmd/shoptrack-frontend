import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useNetwork, useIntervalFn } from "@vueuse/core";

export type ConnectionQuality = "good" | "moderate" | "poor" | "offline";

export function useOnlineStatus() {
  const { isOnline: networkOnline, effectiveType } = useNetwork();

  const isOnline = ref(navigator.onLine);
  const wasOffline = ref(false);
  const justCameOnline = ref(false);
  const lastOnlineCheck = ref<Date | null>(null);

  // Connection quality based on effective connection type
  const connectionQuality = computed<ConnectionQuality>(() => {
    if (!isOnline.value) return "offline";

    // effectiveType can be 'slow-2g', '2g', '3g', '4g'
    switch (effectiveType.value) {
      case "4g":
        return "good";
      case "3g":
        return "moderate";
      case "2g":
      case "slow-2g":
        return "poor";
      default:
        // Unknown or not supported - assume good if online
        return isOnline.value ? "good" : "offline";
    }
  });

  // Whether we should attempt to sync (online and reasonable connection)
  const shouldSync = computed(() => {
    return (
      isOnline.value &&
      (connectionQuality.value === "good" ||
        connectionQuality.value === "moderate")
    );
  });

  // Update online status
  const updateOnlineStatus = () => {
    const newStatus = navigator.onLine && networkOnline.value;

    if (!isOnline.value && newStatus) {
      // Just came online
      justCameOnline.value = true;
      setTimeout(() => {
        justCameOnline.value = false;
      }, 5000); // Reset after 5 seconds
    }

    wasOffline.value = !isOnline.value;
    isOnline.value = newStatus;
    lastOnlineCheck.value = new Date();
  };

  // Periodic check for online status (every 30 seconds)
  const { pause: pauseCheck, resume: resumeCheck } = useIntervalFn(
    updateOnlineStatus,
    30000
  );

  // Event handlers
  const handleOnline = () => {
    updateOnlineStatus();
  };

  const handleOffline = () => {
    updateOnlineStatus();
  };

  onMounted(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    updateOnlineStatus();
  });

  onUnmounted(() => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    pauseCheck();
  });

  // Watch for network library changes
  watch(networkOnline, () => {
    updateOnlineStatus();
  });

  return {
    isOnline,
    wasOffline,
    justCameOnline,
    connectionQuality,
    shouldSync,
    lastOnlineCheck,
    forceCheck: updateOnlineStatus,
  };
}
