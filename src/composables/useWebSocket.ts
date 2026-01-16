import { ref, onMounted, onUnmounted, readonly } from "vue";
import {
  websocketService,
  type ConnectionState,
  type ShoppingListEventHandlers,
} from "@/services/websocket.service";
import { useAuthStore } from "@/stores/auth";

export function useWebSocket(eventHandlers?: ShoppingListEventHandlers) {
  const connectionState = ref<ConnectionState>(websocketService.state);
  const isConnected = ref(websocketService.isConnected);
  const error = ref<string | null>(null);

  let unsubscribeStateChange: (() => void) | null = null;

  const updateState = (state: ConnectionState) => {
    connectionState.value = state;
    isConnected.value = state === "connected";
  };

  const connect = async () => {
    const authStore = useAuthStore();

    // Only connect if user is authenticated
    if (!authStore.isAuthenticated) {
      error.value = "User not authenticated";
      return;
    }

    try {
      error.value = null;

      // Register event handlers before connecting
      if (eventHandlers) {
        websocketService.setEventHandlers(eventHandlers);
      }

      await websocketService.connect();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Connection failed";
      console.error("[useWebSocket] Connection error:", err);
    }
  };

  const disconnect = async () => {
    try {
      await websocketService.disconnect();
      error.value = null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Disconnect failed";
      console.error("[useWebSocket] Disconnect error:", err);
    }
  };

  const setEventHandlers = (handlers: ShoppingListEventHandlers) => {
    websocketService.setEventHandlers(handlers);
  };

  const getConnectionId = () => {
    return websocketService.getConnectionId();
  };

  onMounted(() => {
    // Subscribe to state changes
    unsubscribeStateChange = websocketService.onStateChange(updateState);

    // Update initial state
    updateState(websocketService.state);
  });

  onUnmounted(() => {
    // Unsubscribe from state changes
    if (unsubscribeStateChange) {
      unsubscribeStateChange();
    }
  });

  return {
    connectionState: readonly(connectionState),
    isConnected: readonly(isConnected),
    error: readonly(error),
    connect,
    disconnect,
    setEventHandlers,
    getConnectionId,
  };
}

// Connection status helpers for UI
export function getConnectionStatusLabel(state: ConnectionState): string {
  switch (state) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting...";
    case "reconnecting":
      return "Reconnecting...";
    case "disconnected":
      return "Disconnected";
    default:
      return "Unknown";
  }
}

export function getConnectionStatusColor(state: ConnectionState): string {
  switch (state) {
    case "connected":
      return "text-green-500";
    case "connecting":
    case "reconnecting":
      return "text-yellow-500";
    case "disconnected":
      return "text-red-500";
    default:
      return "text-gray-500";
  }
}
