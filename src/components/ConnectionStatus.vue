<script setup lang="ts">
import { computed } from "vue";
import { useShoppingListStore } from "@/stores/shoppingList";
import type { ConnectionState } from "@/services/websocket.service";

const store = useShoppingListStore();

const statusConfig = computed(() => {
  const state = store.wsConnectionState as ConnectionState;
  switch (state) {
    case "connected":
      return {
        color: "bg-green-500",
        pulseColor: "bg-green-400",
        label: "Live",
        showPulse: true,
      };
    case "connecting":
      return {
        color: "bg-yellow-500",
        pulseColor: "bg-yellow-400",
        label: "Connecting",
        showPulse: true,
      };
    case "reconnecting":
      return {
        color: "bg-yellow-500",
        pulseColor: "bg-yellow-400",
        label: "Reconnecting",
        showPulse: true,
      };
    case "disconnected":
      return {
        color: "bg-gray-400",
        pulseColor: "bg-gray-300",
        label: "Offline",
        showPulse: false,
      };
    default:
      return {
        color: "bg-gray-400",
        pulseColor: "bg-gray-300",
        label: "Unknown",
        showPulse: false,
      };
  }
});
</script>

<template>
  <div
    class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
    :title="`Sync status: ${statusConfig.label}`"
  >
    <span class="relative flex h-2 w-2">
      <span
        v-if="statusConfig.showPulse"
        class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
        :class="statusConfig.pulseColor"
      ></span>
      <span
        class="relative inline-flex h-2 w-2 rounded-full"
        :class="statusConfig.color"
      ></span>
    </span>
    <span class="hidden sm:inline">{{ statusConfig.label }}</span>
  </div>
</template>
