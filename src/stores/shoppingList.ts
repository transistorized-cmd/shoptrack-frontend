import { defineStore } from "pinia";
import { ref, computed, onMounted, onUnmounted } from "vue";
import type {
  ShoppingList,
  ShoppingListDetail,
  ShoppingListItem,
  LocalShoppingList,
  LocalShoppingListItem,
  ProductSearchResult,
  ShoppingListCategoryGroup,
} from "@/types/shoppingList";
import { shoppingListService } from "@/services/shoppingList.service";
import {
  db,
  generateLocalId,
  getLocalLists,
  saveLocalList,
  saveLocalItem,
  deleteLocalList,
  deleteLocalItem,
  syncListsFromServer,
  cacheProducts,
  searchCachedProducts,
} from "@/offline/db";
import { enqueueChange } from "@/offline/syncQueue";
import { resolveLists, resolveItems } from "@/offline/conflictResolver";
import {
  websocketService,
  type ConnectionState,
  type ShoppingListCreatedEvent,
  type ShoppingListUpdatedEvent,
  type ShoppingListDeletedEvent,
  type ShoppingListItemAddedEvent,
  type ShoppingListItemUpdatedEvent,
  type ShoppingListItemToggledEvent,
  type ShoppingListItemDeletedEvent,
  type ShoppingListItemsToggledAllEvent,
} from "@/services/websocket.service";

// API response types (different from frontend types - has nested Product)
interface ApiShoppingListItem {
  id: number;
  product: {
    id: number;
    itemNameOriginal: string;
    nombre: string;
    emoji: string;
    tagUuid?: string;
    category?: string;
    hasNfc: boolean;
    isFavorite: boolean;
  };
  quantity?: number;
  isChecked: boolean;
  checkedAt?: string;
  sortOrder: number;
  lastPrice?: number;
  lastPriceDate?: string;
}

// Map API item (nested Product) to frontend ShoppingListItem (flat structure)
// Handles both API format (nested product) and already-flat format (local items)
function mapApiItemToFrontend(apiItem: ApiShoppingListItem | ShoppingListItem): ShoppingListItem {
  // Check if item already has flat structure (local item or already mapped)
  if ('name' in apiItem && typeof apiItem.name === 'string') {
    return apiItem as ShoppingListItem;
  }

  // API format with nested product
  const nestedItem = apiItem as ApiShoppingListItem;
  return {
    id: nestedItem.id,
    productId: nestedItem.product.id,
    name: nestedItem.product.nombre,
    emoji: nestedItem.product.emoji,
    category: nestedItem.product.category,
    quantity: nestedItem.quantity,
    isChecked: nestedItem.isChecked,
    checkedAt: nestedItem.checkedAt,
    sortOrder: nestedItem.sortOrder,
    lastPrice: nestedItem.lastPrice,
    lastPriceDate: nestedItem.lastPriceDate,
  };
}

export const useShoppingListStore = defineStore("shoppingList", () => {
  // State
  const lists = ref<LocalShoppingList[]>([]);
  const currentList = ref<ShoppingListDetail | null>(null);
  const currentLocalList = ref<LocalShoppingList | null>(null);
  const currentItems = ref<LocalShoppingListItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isOfflineMode = ref(!navigator.onLine);
  const searchResults = ref<ProductSearchResult[]>([]);
  const searchLoading = ref(false);

  // WebSocket state
  const wsConnectionState = ref<ConnectionState>("disconnected");
  const wsConnected = ref(false);
  let wsStateUnsubscribe: (() => void) | null = null;

  // Computed
  const hasLists = computed(() => lists.value.length > 0);

  const activeLists = computed(() =>
    lists.value.filter((l) => l.status === "active")
  );

  const activeListCount = computed(() => activeLists.value.length);

  const completedLists = computed(() =>
    lists.value.filter((l) => l.status === "completed")
  );

  const firstActiveList = computed(() => activeLists.value[0] || null);

  // Current list items grouped by category
  const categorizedItems = computed<ShoppingListCategoryGroup[]>(() => {
    if (!currentItems.value.length) return [];

    const grouped = new Map<string, LocalShoppingListItem[]>();

    for (const item of currentItems.value) {
      const category = item.category || "Other";
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(item);
    }

    const result: ShoppingListCategoryGroup[] = [];
    for (const [category, items] of grouped) {
      const sortedItems = items.sort((a, b) => a.sortOrder - b.sortOrder);
      result.push({
        category,
        emoji: items[0]?.emoji || "📦",
        allUnchecked: items.every((i) => !i.isChecked),
        itemCount: items.length,
        items: sortedItems.map((item) => ({
          id: item.id,
          productId: item.productId,
          name: item.name,
          emoji: item.emoji,
          category: item.category,
          quantity: item.quantity,
          isChecked: item.isChecked,
          checkedAt: item.checkedAt,
          sortOrder: item.sortOrder,
          lastPrice: item.lastPrice,
          lastPriceDate: item.lastPriceDate,
        })),
      });
    }

    // Sort categories alphabetically (stable order - no jumping when items are checked)
    return result.sort((a, b) => a.category.localeCompare(b.category));
  });

  // Actions

  // Fetch all lists (from server if online, from IndexedDB otherwise)
  const fetchLists = async (forceNetwork = false) => {
    loading.value = true;
    error.value = null;

    try {
      // First, load from IndexedDB for immediate display
      const localData = await getLocalLists();
      lists.value = localData;

      // If online and forced or first load, sync from server
      if (navigator.onLine && (forceNetwork || localData.length === 0)) {
        const serverLists = await shoppingListService.getLists();

        // Convert to local format
        const serverLocalLists: LocalShoppingList[] = serverLists.map((s) => ({
          ...s,
          localId: `server_${s.id}`,
          syncStatus: "synced" as const,
          lastSyncedAt: new Date().toISOString(),
        }));

        // Resolve conflicts and merge
        const resolved = resolveLists(localData, serverLists);
        lists.value = resolved;

        // Sync to IndexedDB
        await syncListsFromServer(serverLocalLists);
      }

      isOfflineMode.value = !navigator.onLine;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch lists";
      console.error("Error fetching lists:", err);

      // If network error, use local data
      if (lists.value.length === 0) {
        const localData = await getLocalLists();
        lists.value = localData;
      }
      isOfflineMode.value = true;
    } finally {
      loading.value = false;
    }
  };

  // Fetch single list with items
  const fetchList = async (listIdOrLocalId: number | string) => {
    loading.value = true;
    error.value = null;

    try {
      // If lists haven't been loaded yet, load them first
      if (lists.value.length === 0) {
        const localData = await getLocalLists();
        lists.value = localData;
      }

      // Find local list first
      let localList = lists.value.find(
        (l) =>
          l.localId === listIdOrLocalId ||
          l.id === (typeof listIdOrLocalId === "number" ? listIdOrLocalId : parseInt(listIdOrLocalId, 10))
      );

      // If still not found and online, try fetching from server by ID
      if (!localList && navigator.onLine) {
        const listId = typeof listIdOrLocalId === "number"
          ? listIdOrLocalId
          : parseInt(listIdOrLocalId, 10);

        if (!isNaN(listId)) {
          try {
            const serverList = await shoppingListService.getList(listId);

            // Create a local entry for this server list
            localList = {
              ...serverList,
              localId: `server_${serverList.id}`,
              syncStatus: "synced" as const,
              lastSyncedAt: new Date().toISOString(),
            };

            // Add to lists and save to IndexedDB
            lists.value.push(localList);
            await saveLocalList(localList);
          } catch {
            // Server fetch failed, list truly doesn't exist
          }
        }
      }

      if (!localList) {
        throw new Error("List not found");
      }

      currentLocalList.value = localList;

      // Load items from IndexedDB
      const localItems = await db.shoppingListItems
        .where("localListId")
        .equals(localList.localId)
        .toArray();

      currentItems.value = localItems;

      // If online and has server ID, fetch latest from server
      if (navigator.onLine && localList.id) {
        const serverList = await shoppingListService.getList(localList.id);

        currentList.value = serverList;

        // Update local list with server data
        const updatedLocal: LocalShoppingList = {
          ...localList,
          ...serverList,
          localId: localList.localId,
          syncStatus: "synced",
          lastSyncedAt: new Date().toISOString(),
        };
        currentLocalList.value = updatedLocal;
        await saveLocalList(updatedLocal);

        // Map server items to local format (flatten nested Product structure)
        const serverItems: ShoppingListItem[] = serverList.categories.flatMap(
          (cat) => cat.items.map((item) => mapApiItemToFrontend(item as ApiShoppingListItem | ShoppingListItem))
        );

        const resolvedItems = resolveItems(
          localItems,
          serverItems,
          localList.localId
        );
        currentItems.value = resolvedItems;

        // Save resolved items to IndexedDB
        for (const item of resolvedItems) {
          await saveLocalItem(item);
        }
      }

      isOfflineMode.value = !navigator.onLine;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch list";
      console.error("Error fetching list:", err);
      isOfflineMode.value = true;
    } finally {
      loading.value = false;
    }
  };

  // Create new list (optimistic)
  const createList = async (name: string) => {
    error.value = null;

    const localId = generateLocalId();
    const now = new Date().toISOString();

    // Create optimistic local list
    const newList: LocalShoppingList = {
      id: 0, // Will be set by server
      localId,
      name,
      status: "active",
      totalItems: 0,
      checkedItems: 0,
      createdAt: now,
      updatedAt: now,
      syncStatus: "pending",
    };

    // Add to local state immediately
    lists.value.unshift(newList);

    // Save to IndexedDB
    await saveLocalList(newList);

    // Queue sync
    await enqueueChange({
      type: "create",
      entityType: "list",
      entityId: localId,
      payload: { name },
    });

    return newList;
  };

  // Update list
  const updateList = async (
    localId: string,
    updates: { name?: string; status?: "active" | "completed" | "archived" }
  ) => {
    error.value = null;

    const index = lists.value.findIndex((l) => l.localId === localId);
    if (index === -1) return;

    const list = lists.value[index];
    const updatedList: LocalShoppingList = {
      ...list,
      ...updates,
      updatedAt: new Date().toISOString(),
      syncStatus: "pending",
    };

    // Update local state
    lists.value[index] = updatedList;

    // Save to IndexedDB
    await saveLocalList(updatedList);

    // Queue sync
    await enqueueChange({
      type: "update",
      entityType: "list",
      entityId: localId,
      payload: updates,
    });

    return updatedList;
  };

  // Delete list (optimistic)
  const deleteList = async (localId: string) => {
    error.value = null;

    const list = lists.value.find((l) => l.localId === localId);
    if (!list) return;

    // Remove from local state
    lists.value = lists.value.filter((l) => l.localId !== localId);

    // Remove from IndexedDB
    await deleteLocalList(localId);

    // Queue sync (only if it was synced to server)
    if (list.id) {
      await enqueueChange({
        type: "delete",
        entityType: "list",
        entityId: localId,
        payload: {},
      });
    }
  };

  // Add item to list (optimistic)
  const addItem = async (
    listLocalId: string,
    product: ProductSearchResult,
    quantity?: number
  ) => {
    error.value = null;

    const list = lists.value.find((l) => l.localId === listLocalId);
    if (!list) throw new Error("List not found");

    const localId = generateLocalId();
    const newItem: LocalShoppingListItem = {
      id: 0, // Will be set by server
      localId,
      localListId: listLocalId,
      productId: product.id,
      name: product.nombre,
      emoji: product.emoji,
      category: product.category,
      quantity,
      isChecked: true, // Default: needs to be bought
      sortOrder: currentItems.value.length,
      syncStatus: "pending",
    };

    // Add to current items if viewing this list
    if (currentLocalList.value?.localId === listLocalId) {
      currentItems.value.push(newItem);
      // Also update currentLocalList counts
      currentLocalList.value = {
        ...currentLocalList.value,
        totalItems: currentLocalList.value.totalItems + 1,
        checkedItems: currentLocalList.value.checkedItems + 1,
      };
    }

    // Update list item count
    const listIndex = lists.value.findIndex((l) => l.localId === listLocalId);
    if (listIndex !== -1) {
      lists.value[listIndex] = {
        ...lists.value[listIndex],
        totalItems: lists.value[listIndex].totalItems + 1,
        checkedItems: lists.value[listIndex].checkedItems + 1,
      };
    }

    // Save to IndexedDB
    await saveLocalItem(newItem);

    // Queue sync
    await enqueueChange({
      type: "create",
      entityType: "item",
      entityId: localId,
      parentId: list.id || undefined,
      payload: { productId: product.id, quantity },
    });

    return newItem;
  };

  // Add custom item (creates product if needed, then adds to list)
  const addCustomItem = async (
    listLocalId: string,
    itemName: string,
    quantity?: number
  ) => {
    error.value = null;

    try {
      // Create/normalize the product first (this will create it if it doesn't exist)
      const product = await shoppingListService.createProduct(itemName);

      // Now add the item using the existing addItem function
      return await addItem(listLocalId, product, quantity);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to add custom item";
      throw err;
    }
  };

  // Toggle item (optimistic)
  const toggleItem = async (listLocalId: string, itemLocalId: string) => {
    error.value = null;

    const itemIndex = currentItems.value.findIndex(
      (i) => i.localId === itemLocalId
    );
    if (itemIndex === -1) return;

    const item = currentItems.value[itemIndex];
    const now = new Date().toISOString();

    const updatedItem: LocalShoppingListItem = {
      ...item,
      isChecked: !item.isChecked,
      checkedAt: !item.isChecked ? now : undefined,
      syncStatus: "pending",
    };

    // Update local state
    currentItems.value[itemIndex] = updatedItem;

    // Update list counts
    const listIndex = lists.value.findIndex((l) => l.localId === listLocalId);
    if (listIndex !== -1) {
      const delta = updatedItem.isChecked ? 1 : -1;
      lists.value[listIndex] = {
        ...lists.value[listIndex],
        checkedItems: lists.value[listIndex].checkedItems + delta,
      };
    }

    // Also update currentLocalList if it's the current list
    if (currentLocalList.value?.localId === listLocalId) {
      const delta = updatedItem.isChecked ? 1 : -1;
      currentLocalList.value = {
        ...currentLocalList.value,
        checkedItems: currentLocalList.value.checkedItems + delta,
      };
    }

    // Save to IndexedDB
    await saveLocalItem(updatedItem);

    // Queue sync
    await enqueueChange({
      type: "toggle",
      entityType: "item",
      entityId: itemLocalId,
      payload: {},
    });

    return updatedItem;
  };

  // Toggle all items (optimistic)
  const toggleAllItems = async (listLocalId: string, checked: boolean) => {
    error.value = null;

    const now = new Date().toISOString();
    let checkedCount = 0;

    // Update all items
    for (let i = 0; i < currentItems.value.length; i++) {
      const item = currentItems.value[i];

      // Skip if already in desired state
      if (item.isChecked === checked) {
        if (checked) checkedCount++;
        continue;
      }

      const updatedItem: LocalShoppingListItem = {
        ...item,
        isChecked: checked,
        checkedAt: checked ? now : undefined,
        syncStatus: "pending",
      };

      // Update local state
      currentItems.value[i] = updatedItem;
      if (checked) checkedCount++;

      // Save to IndexedDB
      await saveLocalItem(updatedItem);

      // Queue sync
      await enqueueChange({
        type: "toggle",
        entityType: "item",
        entityId: item.localId,
        payload: {},
      });
    }

    // Update list counts
    const listIndex = lists.value.findIndex((l) => l.localId === listLocalId);
    if (listIndex !== -1) {
      lists.value[listIndex] = {
        ...lists.value[listIndex],
        checkedItems: checkedCount,
      };
    }

    // Also update currentLocalList
    if (currentLocalList.value) {
      currentLocalList.value = {
        ...currentLocalList.value,
        checkedItems: checkedCount,
      };
    }
  };

  // Delete item (optimistic)
  const removeItem = async (listLocalId: string, itemLocalId: string) => {
    error.value = null;

    const item = currentItems.value.find((i) => i.localId === itemLocalId);
    if (!item) return;

    // Remove from local state
    currentItems.value = currentItems.value.filter(
      (i) => i.localId !== itemLocalId
    );

    // Update list counts
    const listIndex = lists.value.findIndex((l) => l.localId === listLocalId);
    if (listIndex !== -1) {
      lists.value[listIndex] = {
        ...lists.value[listIndex],
        totalItems: lists.value[listIndex].totalItems - 1,
        checkedItems: item.isChecked
          ? lists.value[listIndex].checkedItems - 1
          : lists.value[listIndex].checkedItems,
      };
    }

    // Also update currentLocalList if it's the current list
    if (currentLocalList.value?.localId === listLocalId) {
      currentLocalList.value = {
        ...currentLocalList.value,
        totalItems: currentLocalList.value.totalItems - 1,
        checkedItems: item.isChecked
          ? currentLocalList.value.checkedItems - 1
          : currentLocalList.value.checkedItems,
      };
    }

    // Remove from IndexedDB
    await deleteLocalItem(itemLocalId);

    // Queue sync (only if it was synced)
    if (item.id) {
      await enqueueChange({
        type: "delete",
        entityType: "item",
        entityId: itemLocalId,
        payload: {},
      });
    }
  };

  // Search products
  const searchProducts = async (query: string) => {
    searchLoading.value = true;
    error.value = null;

    try {
      if (navigator.onLine) {
        const results = await shoppingListService.searchProducts({ q: query });
        searchResults.value = results;

        // Cache results for offline use
        await cacheProducts(results);
      } else {
        // Search cached products
        searchResults.value = await searchCachedProducts(query);
      }
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to search products";

      // Fallback to cached
      searchResults.value = await searchCachedProducts(query);
    } finally {
      searchLoading.value = false;
    }
  };

  // Clear search results
  const clearSearch = () => {
    searchResults.value = [];
  };

  // Toggle favorite status for a product
  const toggleFavorite = async (productId: number, currentState: boolean) => {
    try {
      if (currentState) {
        await shoppingListService.removeFavorite(productId);
      } else {
        await shoppingListService.addFavorite(productId);
      }

      // Update search results if product is in there
      const product = searchResults.value.find((p) => p.id === productId);
      if (product) {
        product.isFavorite = !currentState;
      }

      // Update cached products
      if (navigator.onLine) {
        const cachedProduct = await db.cachedProducts.get(productId);
        if (cachedProduct) {
          await db.cachedProducts.update(productId, {
            isFavorite: !currentState,
          });
        }
      }

      return !currentState;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to toggle favorite";
      throw err;
    }
  };

  // Clear current list
  const clearCurrentList = () => {
    currentList.value = null;
    currentLocalList.value = null;
    currentItems.value = [];
  };

  // Clear error
  const clearError = () => {
    error.value = null;
  };

  // Add all favorites to list (Quick Start)
  const addFavoritesToList = async (listLocalId: string) => {
    error.value = null;
    loading.value = true;

    try {
      // Fetch favorites from server or cache
      let favorites: ProductSearchResult[] = [];

      if (navigator.onLine) {
        favorites = await shoppingListService.getFavorites();
        // Cache for offline use
        if (favorites.length > 0) {
          await cacheProducts(favorites);
        }
      } else {
        // Try to get cached favorites
        const cached = await db.cachedProducts
          .filter((p) => p.isFavorite)
          .toArray();
        favorites = cached;
      }

      if (favorites.length === 0) {
        return { added: 0, skipped: 0 };
      }

      // Get existing items in the list to avoid duplicates
      const existingProductIds = new Set(
        currentItems.value.map((item) => item.productId)
      );

      let added = 0;
      let skipped = 0;

      for (const product of favorites) {
        if (existingProductIds.has(product.id)) {
          skipped++;
          continue;
        }

        await addItem(listLocalId, product);
        added++;
      }

      return { added, skipped };
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to add favorites";
      console.error("Error adding favorites:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // WebSocket event handlers
  const handleListCreated = async (event: ShoppingListCreatedEvent) => {
    // Check if we already have this list (local optimistic create)
    const existingIndex = lists.value.findIndex((l) => l.id === event.listId);
    if (existingIndex !== -1) {
      // Update existing with server data
      lists.value[existingIndex] = {
        ...lists.value[existingIndex],
        ...event.list,
        syncStatus: "synced",
        lastSyncedAt: new Date().toISOString(),
      };
    } else {
      // New list from another client
      const newList: LocalShoppingList = {
        ...event.list,
        localId: `server_${event.listId}`,
        syncStatus: "synced",
        lastSyncedAt: new Date().toISOString(),
      };
      lists.value.unshift(newList);
      await saveLocalList(newList);
    }
  };

  const handleListUpdated = async (event: ShoppingListUpdatedEvent) => {
    const index = lists.value.findIndex((l) => l.id === event.listId);
    if (index !== -1) {
      lists.value[index] = {
        ...lists.value[index],
        ...event.list,
        syncStatus: "synced",
        lastSyncedAt: new Date().toISOString(),
      };
      await saveLocalList(lists.value[index]);
    }

    // Update currentLocalList if it's the same list
    if (currentLocalList.value?.id === event.listId) {
      currentLocalList.value = {
        ...currentLocalList.value,
        ...event.list,
        syncStatus: "synced",
        lastSyncedAt: new Date().toISOString(),
      };
    }
  };

  const handleListDeleted = async (event: ShoppingListDeletedEvent) => {
    const list = lists.value.find((l) => l.id === event.listId);
    if (list) {
      lists.value = lists.value.filter((l) => l.id !== event.listId);
      await deleteLocalList(list.localId);
    }

    // Clear current list if it was deleted
    if (currentLocalList.value?.id === event.listId) {
      clearCurrentList();
    }
  };

  const handleItemAdded = async (event: ShoppingListItemAddedEvent) => {
    // Only update if we're viewing this list
    if (currentLocalList.value?.id !== event.listId) return;

    // Map from API format (nested Product) to frontend format (flat)
    const mappedItem = mapApiItemToFrontend(event.item as ApiShoppingListItem | ShoppingListItem);

    // Check if we already have this item (local optimistic create)
    const existingIndex = currentItems.value.findIndex((i) => i.id === event.itemId);
    if (existingIndex !== -1) {
      // Update existing with server data
      currentItems.value[existingIndex] = {
        ...currentItems.value[existingIndex],
        ...mappedItem,
        syncStatus: "synced",
      };
    } else {
      // New item from another client
      const newItem: LocalShoppingListItem = {
        ...mappedItem,
        localId: `server_${event.itemId}`,
        localListId: currentLocalList.value.localId,
        syncStatus: "synced",
      };
      currentItems.value.push(newItem);
      await saveLocalItem(newItem);

      // Update list counts
      if (currentLocalList.value) {
        currentLocalList.value = {
          ...currentLocalList.value,
          totalItems: currentLocalList.value.totalItems + 1,
          checkedItems: mappedItem.isChecked
            ? currentLocalList.value.checkedItems + 1
            : currentLocalList.value.checkedItems,
        };
      }
    }
  };

  const handleItemUpdated = async (event: ShoppingListItemUpdatedEvent) => {
    if (currentLocalList.value?.id !== event.listId) return;

    // Map from API format (nested Product) to frontend format (flat)
    const mappedItem = mapApiItemToFrontend(event.item as ApiShoppingListItem | ShoppingListItem);

    const index = currentItems.value.findIndex((i) => i.id === event.itemId);
    if (index !== -1) {
      currentItems.value[index] = {
        ...currentItems.value[index],
        ...mappedItem,
        syncStatus: "synced",
      };
      await saveLocalItem(currentItems.value[index]);
    }
  };

  const handleItemToggled = async (event: ShoppingListItemToggledEvent) => {
    console.log("[ShoppingListStore] handleItemToggled received:", {
      eventListId: event.listId,
      eventItemId: event.itemId,
      currentListId: currentLocalList.value?.id,
      isMatch: currentLocalList.value?.id === event.listId,
    });

    if (currentLocalList.value?.id !== event.listId) return;

    const index = currentItems.value.findIndex((i) => i.id === event.itemId);
    console.log("[ShoppingListStore] Item index found:", index, "looking for item id:", event.itemId);
    if (index !== -1) {
      const previousChecked = currentItems.value[index].isChecked;
      currentItems.value[index] = {
        ...currentItems.value[index],
        isChecked: event.isChecked,
        checkedAt: event.item.checkedAt,
        syncStatus: "synced",
      };
      await saveLocalItem(currentItems.value[index]);

      // Update list counts if changed
      if (previousChecked !== event.isChecked && currentLocalList.value) {
        const delta = event.isChecked ? 1 : -1;
        currentLocalList.value = {
          ...currentLocalList.value,
          checkedItems: currentLocalList.value.checkedItems + delta,
        };
      }
    }
  };

  const handleItemDeleted = async (event: ShoppingListItemDeletedEvent) => {
    if (currentLocalList.value?.id !== event.listId) return;

    const item = currentItems.value.find((i) => i.id === event.itemId);
    if (item) {
      currentItems.value = currentItems.value.filter((i) => i.id !== event.itemId);
      await deleteLocalItem(item.localId);

      // Update list counts
      if (currentLocalList.value) {
        currentLocalList.value = {
          ...currentLocalList.value,
          totalItems: currentLocalList.value.totalItems - 1,
          checkedItems: item.isChecked
            ? currentLocalList.value.checkedItems - 1
            : currentLocalList.value.checkedItems,
        };
      }
    }
  };

  const handleItemsToggledAll = async (event: ShoppingListItemsToggledAllEvent) => {
    if (currentLocalList.value?.id !== event.listId) return;

    const now = new Date().toISOString();

    // Update all items
    for (let i = 0; i < currentItems.value.length; i++) {
      currentItems.value[i] = {
        ...currentItems.value[i],
        isChecked: event.isChecked,
        checkedAt: event.isChecked ? now : undefined,
        syncStatus: "synced",
      };
      await saveLocalItem(currentItems.value[i]);
    }

    // Update list counts
    if (currentLocalList.value) {
      currentLocalList.value = {
        ...currentLocalList.value,
        checkedItems: event.isChecked ? currentLocalList.value.totalItems : 0,
      };
    }
  };

  // Initialize WebSocket connection
  const initWebSocket = async () => {
    // Subscribe to connection state changes
    wsStateUnsubscribe = websocketService.onStateChange((state) => {
      wsConnectionState.value = state;
      wsConnected.value = state === "connected";
    });

    // Set up event handlers
    websocketService.setEventHandlers({
      onListCreated: handleListCreated,
      onListUpdated: handleListUpdated,
      onListDeleted: handleListDeleted,
      onItemAdded: handleItemAdded,
      onItemUpdated: handleItemUpdated,
      onItemToggled: handleItemToggled,
      onItemDeleted: handleItemDeleted,
      onItemsToggledAll: handleItemsToggledAll,
    });

    try {
      await websocketService.connect();
    } catch (err) {
      console.error("[ShoppingListStore] WebSocket connection failed:", err);
      // Fallback to polling mode - no action needed, polling continues
    }
  };

  // Disconnect WebSocket
  const disconnectWebSocket = async () => {
    if (wsStateUnsubscribe) {
      wsStateUnsubscribe();
      wsStateUnsubscribe = null;
    }
    await websocketService.disconnect();
  };

  return {
    // State
    lists,
    currentList,
    currentLocalList,
    currentItems,
    loading,
    error,
    isOfflineMode,
    searchResults,
    searchLoading,
    wsConnectionState,
    wsConnected,

    // Computed
    hasLists,
    activeLists,
    activeListCount,
    completedLists,
    firstActiveList,
    categorizedItems,

    // Actions
    fetchLists,
    fetchList,
    createList,
    updateList,
    deleteList,
    addItem,
    addCustomItem,
    toggleItem,
    toggleAllItems,
    removeItem,
    searchProducts,
    clearSearch,
    toggleFavorite,
    clearCurrentList,
    clearError,
    addFavoritesToList,
    initWebSocket,
    disconnectWebSocket,
  };
});
