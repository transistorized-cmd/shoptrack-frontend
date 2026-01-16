import { db, generateLocalId, isLocalId } from "./db";
import type { PendingChange, LocalShoppingList, LocalShoppingListItem } from "@/types/shoppingList";
import { shoppingListService } from "@/services/shoppingList.service";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // Exponential backoff

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ changeId: string; error: string }>;
}

// Generate idempotency key for a change
export function generateIdempotencyKey(
  type: PendingChange["type"],
  entityType: PendingChange["entityType"],
  entityId: string | number
): string {
  return `${type}_${entityType}_${entityId}_${Date.now()}`;
}

// Helper to convert reactive objects to plain objects for IndexedDB storage
function toPlainObject<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Enqueue a change for sync
export async function enqueueChange(
  change: Omit<PendingChange, "id" | "timestamp" | "retryCount" | "idempotencyKey">
): Promise<void> {
  const pendingChange: PendingChange = {
    ...change,
    payload: toPlainObject(change.payload), // Ensure payload is plain object
    id: generateLocalId(),
    timestamp: Date.now(),
    retryCount: 0,
    idempotencyKey: generateIdempotencyKey(
      change.type,
      change.entityType,
      change.entityId
    ),
  };

  await db.syncQueue.put(pendingChange);
}

// Process all pending changes
export async function processQueue(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
  };

  const pendingChanges = await db.syncQueue.orderBy("timestamp").toArray();

  for (const change of pendingChanges) {
    try {
      await processChange(change);
      await db.syncQueue.delete(change.id);
      result.processed++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Increment retry count
      const newRetryCount = change.retryCount + 1;

      if (newRetryCount >= MAX_RETRIES) {
        // Mark as error and remove from queue
        await db.syncQueue.delete(change.id);

        // Update local entity sync status to error
        await markEntityAsError(change);

        result.failed++;
        result.errors.push({ changeId: change.id, error: errorMessage });
      } else {
        // Update retry count and schedule retry
        await db.syncQueue.update(change.id, { retryCount: newRetryCount });

        // Wait before next retry (will be processed in next sync cycle)
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAYS[newRetryCount - 1])
        );
      }

      result.success = false;
    }
  }

  return result;
}

// Process a single change
async function processChange(change: PendingChange): Promise<void> {
  switch (change.entityType) {
    case "list":
      await processListChange(change);
      break;
    case "item":
      await processItemChange(change);
      break;
  }
}

// Process list changes
async function processListChange(change: PendingChange): Promise<void> {
  const { type, entityId, payload } = change;

  switch (type) {
    case "create": {
      const localList = await db.shoppingLists.get(entityId as string);
      if (!localList) return;

      const serverList = await shoppingListService.createList({
        name: payload.name as string,
      });

      // Update local with server ID
      await db.shoppingLists.update(entityId as string, {
        id: serverList.id,
        syncStatus: "synced",
        lastSyncedAt: new Date().toISOString(),
      });

      // Update items with new list ID
      const items = await db.shoppingListItems
        .where("localListId")
        .equals(entityId as string)
        .toArray();

      for (const item of items) {
        if (item.id && !isLocalId(item.id.toString())) {
          // Item already synced, update its list reference if needed
          continue;
        }
        // Queue item creation with new list ID
        await enqueueChange({
          type: "create",
          entityType: "item",
          entityId: item.localId,
          parentId: serverList.id,
          payload: {
            productId: item.productId,
            quantity: item.quantity,
          },
        });
      }
      break;
    }

    case "update": {
      const localList = await db.shoppingLists.get(entityId as string);
      if (!localList || !localList.id) return;

      await shoppingListService.updateList(localList.id, payload as { name?: string; status?: "active" | "completed" | "archived" });

      await db.shoppingLists.update(entityId as string, {
        syncStatus: "synced",
        lastSyncedAt: new Date().toISOString(),
      });
      break;
    }

    case "delete": {
      const localList = await db.shoppingLists.get(entityId as string);
      if (!localList) return;

      if (localList.id) {
        await shoppingListService.deleteList(localList.id);
      }
      // Local deletion already happened optimistically
      break;
    }
  }
}

// Process item changes
async function processItemChange(change: PendingChange): Promise<void> {
  const { type, entityId, parentId, payload } = change;

  switch (type) {
    case "create": {
      const localItem = await db.shoppingListItems.get(entityId as string);
      if (!localItem) return;

      // Get the server list ID
      let serverListId = parentId as number;
      if (!serverListId) {
        const localList = await db.shoppingLists.get(localItem.localListId);
        if (!localList?.id) {
          throw new Error("Parent list not synced yet");
        }
        serverListId = localList.id;
      }

      const serverItem = await shoppingListService.addItem(serverListId, {
        productId: payload.productId as number,
        quantity: payload.quantity as number | undefined,
      });

      await db.shoppingListItems.update(entityId as string, {
        id: serverItem.id,
        syncStatus: "synced",
      });
      break;
    }

    case "update": {
      const localItem = await db.shoppingListItems.get(entityId as string);
      if (!localItem || !localItem.id) return;

      const localList = await db.shoppingLists.get(localItem.localListId);
      if (!localList?.id) return;

      await shoppingListService.updateItem(
        localList.id,
        localItem.id,
        payload as { quantity?: number }
      );

      await db.shoppingListItems.update(entityId as string, {
        syncStatus: "synced",
      });
      break;
    }

    case "delete": {
      const localItem = await db.shoppingListItems.get(entityId as string);
      if (!localItem) return;

      if (localItem.id) {
        const localList = await db.shoppingLists.get(localItem.localListId);
        if (localList?.id) {
          await shoppingListService.deleteItem(localList.id, localItem.id);
        }
      }
      break;
    }

    case "toggle": {
      const localItem = await db.shoppingListItems.get(entityId as string);
      if (!localItem || !localItem.id) return;

      const localList = await db.shoppingLists.get(localItem.localListId);
      if (!localList?.id) return;

      await shoppingListService.toggleItem(localList.id, localItem.id);

      await db.shoppingListItems.update(entityId as string, {
        syncStatus: "synced",
      });
      break;
    }
  }
}

// Mark entity as having sync error
async function markEntityAsError(change: PendingChange): Promise<void> {
  if (change.entityType === "list") {
    await db.shoppingLists.update(change.entityId as string, {
      syncStatus: "error",
    });
  } else {
    await db.shoppingListItems.update(change.entityId as string, {
      syncStatus: "error",
    });
  }
}

// Get pending changes for a specific entity
export async function getPendingChangesForEntity(
  entityType: "list" | "item",
  entityId: string | number
): Promise<PendingChange[]> {
  return db.syncQueue
    .filter(
      (change) =>
        change.entityType === entityType && change.entityId === entityId
    )
    .toArray();
}

// Clear all pending changes (for reset)
export async function clearPendingChanges(): Promise<void> {
  await db.syncQueue.clear();
}

// Get queue status
export async function getQueueStatus(): Promise<{
  pendingCount: number;
  errorCount: number;
  oldestTimestamp: number | null;
}> {
  const changes = await db.syncQueue.toArray();
  const lists = await db.shoppingLists.where("syncStatus").equals("error").count();
  const items = await db.shoppingListItems.where("syncStatus").equals("error").count();

  return {
    pendingCount: changes.length,
    errorCount: lists + items,
    oldestTimestamp: changes.length > 0 ? Math.min(...changes.map((c) => c.timestamp)) : null,
  };
}
