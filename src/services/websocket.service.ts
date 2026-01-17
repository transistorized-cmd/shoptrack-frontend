import * as signalR from "@microsoft/signalr";
import type { ShoppingList, ShoppingListItem } from "@/types/shoppingList";
import { getApiBaseUrl } from "@/services/api";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

export interface ShoppingListCreatedEvent {
  listId: number;
  list: ShoppingList;
}

export interface ShoppingListUpdatedEvent {
  listId: number;
  list: ShoppingList;
}

export interface ShoppingListDeletedEvent {
  listId: number;
}

export interface ShoppingListItemAddedEvent {
  listId: number;
  itemId: number;
  item: ShoppingListItem;
}

export interface ShoppingListItemUpdatedEvent {
  listId: number;
  itemId: number;
  item: ShoppingListItem;
}

export interface ShoppingListItemToggledEvent {
  listId: number;
  itemId: number;
  isChecked: boolean;
  item: ShoppingListItem;
}

export interface ShoppingListItemDeletedEvent {
  listId: number;
  itemId: number;
}

export interface ShoppingListItemsToggledAllEvent {
  listId: number;
  isChecked: boolean;
}

type ShoppingListEventHandler<T> = (event: T) => void;

export interface ShoppingListEventHandlers {
  onListCreated?: ShoppingListEventHandler<ShoppingListCreatedEvent>;
  onListUpdated?: ShoppingListEventHandler<ShoppingListUpdatedEvent>;
  onListDeleted?: ShoppingListEventHandler<ShoppingListDeletedEvent>;
  onItemAdded?: ShoppingListEventHandler<ShoppingListItemAddedEvent>;
  onItemUpdated?: ShoppingListEventHandler<ShoppingListItemUpdatedEvent>;
  onItemToggled?: ShoppingListEventHandler<ShoppingListItemToggledEvent>;
  onItemDeleted?: ShoppingListEventHandler<ShoppingListItemDeletedEvent>;
  onItemsToggledAll?: ShoppingListEventHandler<ShoppingListItemsToggledAllEvent>;
}

class WebSocketService {
  private connection: signalR.HubConnection | null = null;
  private connectionState: ConnectionState = "disconnected";
  private stateChangeCallbacks: Set<(state: ConnectionState) => void> = new Set();
  private eventHandlers: ShoppingListEventHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseUrl: string;

  constructor() {
    // Use the same API base URL as other services for consistency
    const apiBase = getApiBaseUrl();
    this.baseUrl = `${apiBase}/hubs/shopping-lists`;
  }

  get state(): ConnectionState {
    return this.connectionState;
  }

  get isConnected(): boolean {
    return this.connectionState === "connected";
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.stateChangeCallbacks.forEach((callback) => callback(state));
  }

  onStateChange(callback: (state: ConnectionState) => void): () => void {
    this.stateChangeCallbacks.add(callback);
    // Return unsubscribe function
    return () => {
      this.stateChangeCallbacks.delete(callback);
    };
  }

  setEventHandlers(handlers: ShoppingListEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.setConnectionState("connecting");

    try {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(this.baseUrl, {
          // Use cookies for authentication (same-origin)
          withCredentials: true,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: 0, 2, 4, 8, 16, 32, 60, 60, 60... seconds
            if (retryContext.previousRetryCount >= this.maxReconnectAttempts) {
              return null; // Stop reconnecting
            }
            const delay = Math.min(
              Math.pow(2, retryContext.previousRetryCount) * 1000,
              60000
            );
            return delay;
          },
        })
        .configureLogging(
          import.meta.env.DEV ? signalR.LogLevel.Information : signalR.LogLevel.Warning
        )
        .build();

      this.setupEventHandlers();
      this.setupConnectionStateHandlers();

      await this.connection.start();
      this.setConnectionState("connected");
      this.reconnectAttempts = 0;

      console.log("[WebSocket] Connected to SignalR hub");
    } catch (error) {
      console.error("[WebSocket] Connection failed:", error);
      this.setConnectionState("disconnected");
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.connection) return;

    // Shopping list events
    this.connection.on("shopping-list:created", (event: ShoppingListCreatedEvent) => {
      console.log("[WebSocket] List created:", event);
      this.eventHandlers.onListCreated?.(event);
    });

    this.connection.on("shopping-list:updated", (event: ShoppingListUpdatedEvent) => {
      console.log("[WebSocket] List updated:", event);
      this.eventHandlers.onListUpdated?.(event);
    });

    this.connection.on("shopping-list:deleted", (event: ShoppingListDeletedEvent) => {
      console.log("[WebSocket] List deleted:", event);
      this.eventHandlers.onListDeleted?.(event);
    });

    this.connection.on("shopping-list:item-added", (event: ShoppingListItemAddedEvent) => {
      console.log("[WebSocket] Item added:", event);
      this.eventHandlers.onItemAdded?.(event);
    });

    this.connection.on("shopping-list:item-updated", (event: ShoppingListItemUpdatedEvent) => {
      console.log("[WebSocket] Item updated:", event);
      this.eventHandlers.onItemUpdated?.(event);
    });

    this.connection.on("shopping-list:item-toggled", (event: ShoppingListItemToggledEvent) => {
      console.log("[WebSocket] Item toggled:", event);
      this.eventHandlers.onItemToggled?.(event);
    });

    this.connection.on("shopping-list:item-deleted", (event: ShoppingListItemDeletedEvent) => {
      console.log("[WebSocket] Item deleted:", event);
      this.eventHandlers.onItemDeleted?.(event);
    });

    this.connection.on("shopping-list:items-toggled-all", (event: ShoppingListItemsToggledAllEvent) => {
      console.log("[WebSocket] All items toggled:", event);
      this.eventHandlers.onItemsToggledAll?.(event);
    });
  }

  private setupConnectionStateHandlers(): void {
    if (!this.connection) return;

    this.connection.onreconnecting((error) => {
      console.log("[WebSocket] Reconnecting...", error?.message);
      this.setConnectionState("reconnecting");
    });

    this.connection.onreconnected((connectionId) => {
      console.log("[WebSocket] Reconnected:", connectionId);
      this.setConnectionState("connected");
      this.reconnectAttempts = 0;
    });

    this.connection.onclose((error) => {
      console.log("[WebSocket] Connection closed:", error?.message);
      this.setConnectionState("disconnected");
    });
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      this.setConnectionState("disconnected");
      console.log("[WebSocket] Disconnected");
    }
  }

  // Get connection ID for excluding self from broadcasts
  getConnectionId(): string | null {
    return this.connection?.connectionId || null;
  }
}

// Singleton instance
export const websocketService = new WebSocketService();
