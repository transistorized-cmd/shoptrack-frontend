import Dexie, { type Table } from "dexie";
import type {
  LocalShoppingList,
  LocalShoppingListItem,
  PendingChange,
  ProductSearchResult,
} from "@/types/shoppingList";

export class ShopTrackDB extends Dexie {
  shoppingLists!: Table<LocalShoppingList, string>;
  shoppingListItems!: Table<LocalShoppingListItem, string>;
  syncQueue!: Table<PendingChange, string>;
  cachedProducts!: Table<ProductSearchResult, number>;

  constructor() {
    super("ShopTrackDB");

    this.version(1).stores({
      // Primary key: localId
      // Indexes: id (server ID), userId, status, syncStatus
      shoppingLists: "localId, id, status, syncStatus, updatedAt",

      // Primary key: localId
      // Indexes: id (server ID), localListId, category, syncStatus
      shoppingListItems:
        "localId, id, localListId, category, syncStatus, productId",

      // Primary key: id
      // Indexes: entityType, timestamp, retryCount
      syncQueue: "id, entityType, timestamp, retryCount",

      // Primary key: id (product ID)
      // Indexes for search
      cachedProducts: "id, nombre, category",
    });
  }
}

export const db = new ShopTrackDB();

// Helper functions for generating local IDs
export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Helper to check if an ID is a local (not yet synced) ID
export function isLocalId(id: string | number): boolean {
  return typeof id === "string" && id.startsWith("local_");
}

// Clear all offline data (for logout)
export async function clearOfflineData(): Promise<void> {
  await Promise.all([
    db.shoppingLists.clear(),
    db.shoppingListItems.clear(),
    db.syncQueue.clear(),
    db.cachedProducts.clear(),
  ]);
}

// Get lists from IndexedDB
export async function getLocalLists(): Promise<LocalShoppingList[]> {
  return db.shoppingLists.orderBy("updatedAt").reverse().toArray();
}

// Get single list with items from IndexedDB
export async function getLocalListWithItems(
  localId: string
): Promise<{ list: LocalShoppingList; items: LocalShoppingListItem[] } | null> {
  const list = await db.shoppingLists.get(localId);
  if (!list) return null;

  const items = await db.shoppingListItems
    .where("localListId")
    .equals(localId)
    .toArray();

  return { list, items };
}

// Helper to convert reactive objects to plain objects for IndexedDB storage
function toPlainObject<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Save list to IndexedDB
export async function saveLocalList(list: LocalShoppingList): Promise<void> {
  await db.shoppingLists.put(toPlainObject(list));
}

// Save item to IndexedDB
export async function saveLocalItem(
  item: LocalShoppingListItem
): Promise<void> {
  await db.shoppingListItems.put(toPlainObject(item));
}

// Delete list and its items from IndexedDB
export async function deleteLocalList(localId: string): Promise<void> {
  await db.transaction("rw", [db.shoppingLists, db.shoppingListItems], async () => {
    await db.shoppingLists.delete(localId);
    await db.shoppingListItems.where("localListId").equals(localId).delete();
  });
}

// Delete item from IndexedDB
export async function deleteLocalItem(localId: string): Promise<void> {
  await db.shoppingListItems.delete(localId);
}

// Sync server data to IndexedDB (replaces local data)
export async function syncListsFromServer(
  serverLists: LocalShoppingList[]
): Promise<void> {
  await db.transaction("rw", db.shoppingLists, async () => {
    // Remove lists that no longer exist on server (and are synced)
    const existingLists = await db.shoppingLists.toArray();
    const serverIds = new Set(serverLists.map((l) => l.id));

    for (const local of existingLists) {
      if (
        local.syncStatus === "synced" &&
        local.id &&
        !serverIds.has(local.id)
      ) {
        await db.shoppingLists.delete(local.localId);
      }
    }

    // Update/add server lists
    for (const serverList of serverLists) {
      // Check if we have a local version
      const existing = await db.shoppingLists
        .where("id")
        .equals(serverList.id)
        .first();

      if (existing) {
        // Update existing, but preserve localId
        await db.shoppingLists.put(toPlainObject({
          ...serverList,
          localId: existing.localId,
        }));
      } else {
        // Add new
        await db.shoppingLists.put(toPlainObject(serverList));
      }
    }
  });
}

// Get pending changes count
export async function getPendingChangesCount(): Promise<number> {
  return db.syncQueue.count();
}

// Cache products for offline search
export async function cacheProducts(
  products: ProductSearchResult[]
): Promise<void> {
  await db.cachedProducts.bulkPut(products.map(toPlainObject));
}

// Search cached products
export async function searchCachedProducts(
  query: string
): Promise<ProductSearchResult[]> {
  const lowercaseQuery = query.toLowerCase();
  return db.cachedProducts
    .filter((product) => product.nombre.toLowerCase().includes(lowercaseQuery))
    .limit(20)
    .toArray();
}
