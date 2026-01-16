import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useShoppingListStore } from "../shoppingList";
import { shoppingListService } from "@/services/shoppingList.service";
import type {
  ShoppingList,
  ShoppingListDetail,
  LocalShoppingList,
  LocalShoppingListItem,
  ProductSearchResult,
} from "@/types/shoppingList";

// Mock the shopping list service
vi.mock("@/services/shoppingList.service", () => ({
  shoppingListService: {
    getLists: vi.fn(),
    getList: vi.fn(),
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
    completeList: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    toggleItem: vi.fn(),
    toggleAllItems: vi.fn(),
    searchProducts: vi.fn(),
    getFavorites: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    isFavorite: vi.fn(),
  },
}));

// Mock the offline database module
vi.mock("@/offline/db", () => ({
  db: {
    shoppingLists: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([]),
        })),
      })),
    },
    shoppingListItems: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([]),
          delete: vi.fn().mockResolvedValue(undefined),
        })),
      })),
    },
    cachedProducts: {
      bulkPut: vi.fn(),
      filter: vi.fn(() => ({
        limit: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([]),
        })),
      })),
    },
  },
  generateLocalId: vi.fn(() => `local_${Date.now()}_test123`),
  getLocalLists: vi.fn().mockResolvedValue([]),
  saveLocalList: vi.fn().mockResolvedValue(undefined),
  saveLocalItem: vi.fn().mockResolvedValue(undefined),
  deleteLocalList: vi.fn().mockResolvedValue(undefined),
  deleteLocalItem: vi.fn().mockResolvedValue(undefined),
  syncListsFromServer: vi.fn().mockResolvedValue(undefined),
  cacheProducts: vi.fn().mockResolvedValue(undefined),
  searchCachedProducts: vi.fn().mockResolvedValue([]),
}));

// Mock the sync queue
vi.mock("@/offline/syncQueue", () => ({
  enqueueChange: vi.fn().mockResolvedValue(undefined),
}));

// Mock the conflict resolver
vi.mock("@/offline/conflictResolver", () => ({
  resolveLists: vi.fn((local, server) => server.map((s: ShoppingList) => ({
    ...s,
    localId: `server_${s.id}`,
    syncStatus: "synced" as const,
    lastSyncedAt: new Date().toISOString(),
  }))),
  resolveItems: vi.fn((local, server, listLocalId) => server.map((item: any, index: number) => ({
    ...item,
    localId: `item_${index}`,
    localListId: listLocalId,
    syncStatus: "synced" as const,
  }))),
}));

describe("shoppingList store", () => {
  let store: ReturnType<typeof useShoppingListStore>;
  let mockService: typeof shoppingListService;
  let originalNavigatorOnLine: boolean;

  // Mock data
  const mockShoppingList: ShoppingList = {
    id: 1,
    name: "Weekly Groceries",
    status: "active",
    totalItems: 5,
    checkedItems: 2,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  };

  const mockLocalShoppingList: LocalShoppingList = {
    ...mockShoppingList,
    localId: "server_1",
    syncStatus: "synced",
    lastSyncedAt: "2024-01-15T10:00:00Z",
  };

  const mockShoppingLists: ShoppingList[] = [
    mockShoppingList,
    {
      id: 2,
      name: "Party Supplies",
      status: "active",
      totalItems: 10,
      checkedItems: 0,
      createdAt: "2024-01-16T10:00:00Z",
      updatedAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 3,
      name: "Last Week's List",
      status: "completed",
      totalItems: 8,
      checkedItems: 8,
      createdAt: "2024-01-10T10:00:00Z",
      updatedAt: "2024-01-12T15:00:00Z",
      completedAt: "2024-01-12T15:00:00Z",
    },
  ];

  const mockShoppingListDetail: ShoppingListDetail = {
    ...mockShoppingList,
    categories: [
      {
        category: "Dairy",
        emoji: "🥛",
        allUnchecked: false,
        itemCount: 2,
        items: [
          {
            id: 1,
            productId: 101,
            name: "Milk",
            emoji: "🥛",
            category: "Dairy",
            quantity: 2,
            isChecked: false,
            sortOrder: 0,
          },
          {
            id: 2,
            productId: 102,
            name: "Cheese",
            emoji: "🧀",
            category: "Dairy",
            quantity: 1,
            isChecked: true,
            checkedAt: "2024-01-15T11:00:00Z",
            sortOrder: 1,
          },
        ],
      },
      {
        category: "Bakery",
        emoji: "🍞",
        allUnchecked: true,
        itemCount: 1,
        items: [
          {
            id: 3,
            productId: 103,
            name: "Bread",
            emoji: "🍞",
            category: "Bakery",
            quantity: 1,
            isChecked: false,
            sortOrder: 0,
          },
        ],
      },
    ],
  };

  const mockLocalItem: LocalShoppingListItem = {
    id: 1,
    localId: "item_1",
    localListId: "server_1",
    productId: 101,
    name: "Milk",
    emoji: "🥛",
    category: "Dairy",
    quantity: 2,
    isChecked: false,
    sortOrder: 0,
    syncStatus: "synced",
  };

  const mockProductSearchResult: ProductSearchResult = {
    id: 101,
    itemNameOriginal: "Milk",
    nombre: "Leche",
    emoji: "🥛",
    tagUuid: "04:E1:5A:6A:94:08:91",
    category: "Dairy",
    hasNfc: true,
    isFavorite: true,
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useShoppingListStore();
    mockService = shoppingListService as any;

    // Store original navigator.onLine
    originalNavigatorOnLine = navigator.onLine;

    // Mock navigator.onLine to be true by default
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
      writable: true,
    });

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore navigator.onLine
    Object.defineProperty(navigator, "onLine", {
      value: originalNavigatorOnLine,
      configurable: true,
      writable: true,
    });
    vi.resetAllMocks();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      expect(store.lists).toEqual([]);
      expect(store.currentList).toBeNull();
      expect(store.currentLocalList).toBeNull();
      expect(store.currentItems).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.searchResults).toEqual([]);
      expect(store.searchLoading).toBe(false);
    });
  });

  describe("computed properties", () => {
    beforeEach(() => {
      store.lists = mockShoppingLists.map((l, i) => ({
        ...l,
        localId: `server_${l.id}`,
        syncStatus: "synced" as const,
        lastSyncedAt: "2024-01-15T10:00:00Z",
      }));
    });

    it("should compute hasLists correctly", () => {
      expect(store.hasLists).toBe(true);

      store.lists = [];
      expect(store.hasLists).toBe(false);
    });

    it("should compute activeLists correctly", () => {
      expect(store.activeLists).toHaveLength(2);
      expect(store.activeLists.every((l) => l.status === "active")).toBe(true);
    });

    it("should compute activeListCount correctly", () => {
      expect(store.activeListCount).toBe(2);
    });

    it("should compute completedLists correctly", () => {
      expect(store.completedLists).toHaveLength(1);
      expect(store.completedLists[0].status).toBe("completed");
    });

    it("should compute firstActiveList correctly", () => {
      expect(store.firstActiveList).not.toBeNull();
      expect(store.firstActiveList?.status).toBe("active");
    });

    it("should return null for firstActiveList when no active lists", () => {
      store.lists = store.lists.map((l) => ({
        ...l,
        status: "completed" as const,
      }));
      expect(store.firstActiveList).toBeNull();
    });
  });

  describe("categorizedItems computed", () => {
    beforeEach(() => {
      store.currentItems = [
        {
          id: 1,
          localId: "item_1",
          localListId: "server_1",
          productId: 101,
          name: "Milk",
          emoji: "🥛",
          category: "Dairy",
          quantity: 2,
          isChecked: false,
          sortOrder: 0,
          syncStatus: "synced",
        },
        {
          id: 2,
          localId: "item_2",
          localListId: "server_1",
          productId: 102,
          name: "Cheese",
          emoji: "🧀",
          category: "Dairy",
          quantity: 1,
          isChecked: true,
          checkedAt: "2024-01-15T11:00:00Z",
          sortOrder: 1,
          syncStatus: "synced",
        },
        {
          id: 3,
          localId: "item_3",
          localListId: "server_1",
          productId: 103,
          name: "Bread",
          emoji: "🍞",
          category: "Bakery",
          quantity: 1,
          isChecked: false,
          sortOrder: 0,
          syncStatus: "synced",
        },
      ];
    });

    it("should group items by category", () => {
      const categorized = store.categorizedItems;
      expect(categorized).toHaveLength(2);

      const categories = categorized.map((c) => c.category);
      expect(categories).toContain("Dairy");
      expect(categories).toContain("Bakery");
    });

    it("should set correct item counts per category", () => {
      const categorized = store.categorizedItems;
      const dairy = categorized.find((c) => c.category === "Dairy");
      const bakery = categorized.find((c) => c.category === "Bakery");

      expect(dairy?.itemCount).toBe(2);
      expect(bakery?.itemCount).toBe(1);
    });

    it("should correctly identify allUnchecked for categories", () => {
      const categorized = store.categorizedItems;
      const dairy = categorized.find((c) => c.category === "Dairy");
      const bakery = categorized.find((c) => c.category === "Bakery");

      expect(dairy?.allUnchecked).toBe(false); // Has one checked item
      expect(bakery?.allUnchecked).toBe(true); // All unchecked
    });

    it("should sort categories alphabetically", () => {
      const categorized = store.categorizedItems;
      // Categories are sorted alphabetically regardless of checked status
      expect(categorized[0].category).toBe("Bakery");
      expect(categorized[1].category).toBe("Dairy");
    });

    it("should return empty array when no items", () => {
      store.currentItems = [];
      expect(store.categorizedItems).toEqual([]);
    });

    it("should use 'Other' category for items without category", () => {
      store.currentItems = [
        {
          id: 1,
          localId: "item_1",
          localListId: "server_1",
          productId: 101,
          name: "Unknown Item",
          isChecked: false,
          sortOrder: 0,
          syncStatus: "synced",
        },
      ];

      const categorized = store.categorizedItems;
      expect(categorized[0].category).toBe("Other");
    });
  });

  describe("fetchLists", () => {
    it("should fetch lists from server when online", async () => {
      const { getLocalLists, syncListsFromServer } = await import("@/offline/db");
      const { resolveLists } = await import("@/offline/conflictResolver");

      (getLocalLists as any).mockResolvedValue([]);
      mockService.getLists.mockResolvedValue(mockShoppingLists);

      await store.fetchLists(true);

      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(mockService.getLists).toHaveBeenCalled();
      expect(resolveLists).toHaveBeenCalled();
      expect(syncListsFromServer).toHaveBeenCalled();
    });

    it("should use local data when offline", async () => {
      const { getLocalLists } = await import("@/offline/db");

      Object.defineProperty(navigator, "onLine", { value: false });

      const localLists: LocalShoppingList[] = [mockLocalShoppingList];
      (getLocalLists as any).mockResolvedValue(localLists);

      await store.fetchLists();

      expect(store.lists).toEqual(localLists);
      expect(store.isOfflineMode).toBe(true);
      expect(mockService.getLists).not.toHaveBeenCalled();
    });

    it("should handle fetch error gracefully", async () => {
      const { getLocalLists } = await import("@/offline/db");
      (getLocalLists as any).mockResolvedValue([mockLocalShoppingList]);
      mockService.getLists.mockRejectedValue(new Error("Network error"));

      await store.fetchLists(true);

      expect(store.loading).toBe(false);
      expect(store.error).toBe("Network error");
      expect(store.isOfflineMode).toBe(true);
    });

    it("should set loading state during fetch", async () => {
      const { getLocalLists } = await import("@/offline/db");
      (getLocalLists as any).mockResolvedValue([]);
      mockService.getLists.mockResolvedValue([]);

      let loadingDuringFetch = false;
      const fetchPromise = store.fetchLists();

      // Check loading state immediately after starting fetch
      loadingDuringFetch = store.loading;

      await fetchPromise;

      expect(loadingDuringFetch).toBe(true);
      expect(store.loading).toBe(false);
    });
  });

  describe("createList", () => {
    it("should create a new list optimistically", async () => {
      const { generateLocalId, saveLocalList } = await import("@/offline/db");
      const { enqueueChange } = await import("@/offline/syncQueue");

      (generateLocalId as any).mockReturnValue("local_123_test");

      const newList = await store.createList("New Shopping List");

      expect(newList.name).toBe("New Shopping List");
      expect(newList.localId).toBe("local_123_test");
      expect(newList.status).toBe("active");
      expect(newList.syncStatus).toBe("pending");
      expect(newList.totalItems).toBe(0);
      expect(newList.checkedItems).toBe(0);

      expect(saveLocalList).toHaveBeenCalled();
      expect(enqueueChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "create",
          entityType: "list",
          entityId: "local_123_test",
          payload: { name: "New Shopping List" },
        })
      );

      // List should be added to the beginning
      expect(store.lists[0]).toEqual(newList);
    });
  });

  describe("updateList", () => {
    beforeEach(() => {
      store.lists = [mockLocalShoppingList];
    });

    it("should update a list optimistically", async () => {
      const { saveLocalList } = await import("@/offline/db");
      const { enqueueChange } = await import("@/offline/syncQueue");

      const result = await store.updateList("server_1", { name: "Updated Name" });

      expect(result?.name).toBe("Updated Name");
      expect(result?.syncStatus).toBe("pending");
      expect(store.lists[0].name).toBe("Updated Name");

      expect(saveLocalList).toHaveBeenCalled();
      expect(enqueueChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "update",
          entityType: "list",
          payload: { name: "Updated Name" },
        })
      );
    });

    it("should not update if list not found", async () => {
      const result = await store.updateList("nonexistent", { name: "Test" });

      expect(result).toBeUndefined();
      expect(store.lists[0].name).toBe("Weekly Groceries");
    });
  });

  describe("deleteList", () => {
    beforeEach(() => {
      store.lists = [mockLocalShoppingList];
    });

    it("should delete a list optimistically", async () => {
      const { deleteLocalList } = await import("@/offline/db");
      const { enqueueChange } = await import("@/offline/syncQueue");

      await store.deleteList("server_1");

      expect(store.lists).toHaveLength(0);
      expect(deleteLocalList).toHaveBeenCalledWith("server_1");
      expect(enqueueChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "delete",
          entityType: "list",
          entityId: "server_1",
        })
      );
    });

    it("should not enqueue sync for unsaved lists", async () => {
      const { enqueueChange } = await import("@/offline/syncQueue");

      store.lists = [
        {
          ...mockLocalShoppingList,
          id: 0,
          localId: "local_new",
          syncStatus: "pending",
        },
      ];

      await store.deleteList("local_new");

      expect(store.lists).toHaveLength(0);
      expect(enqueueChange).not.toHaveBeenCalled();
    });
  });

  describe("addItem", () => {
    beforeEach(() => {
      store.lists = [mockLocalShoppingList];
      store.currentLocalList = mockLocalShoppingList;
      store.currentItems = [];
    });

    it("should add an item to the list optimistically", async () => {
      const { generateLocalId, saveLocalItem } = await import("@/offline/db");
      const { enqueueChange } = await import("@/offline/syncQueue");

      (generateLocalId as any).mockReturnValue("item_new_123");

      const newItem = await store.addItem("server_1", mockProductSearchResult, 2);

      expect(newItem.name).toBe("Leche");
      expect(newItem.productId).toBe(101);
      expect(newItem.quantity).toBe(2);
      expect(newItem.isChecked).toBe(true); // Default to needs to be bought
      expect(newItem.syncStatus).toBe("pending");

      expect(store.currentItems).toHaveLength(1);
      expect(store.currentItems[0].name).toBe("Leche");
      expect(store.currentItems[0].productId).toBe(101);
      expect(store.lists[0].totalItems).toBe(6);
      expect(store.lists[0].checkedItems).toBe(3);

      expect(saveLocalItem).toHaveBeenCalled();
      expect(enqueueChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "create",
          entityType: "item",
          payload: { productId: 101, quantity: 2 },
        })
      );
    });

    it("should throw error if list not found", async () => {
      await expect(
        store.addItem("nonexistent", mockProductSearchResult)
      ).rejects.toThrow("List not found");
    });
  });

  describe("toggleItem", () => {
    beforeEach(() => {
      store.lists = [mockLocalShoppingList];
      store.currentLocalList = mockLocalShoppingList;
      store.currentItems = [{ ...mockLocalItem, isChecked: false }];
    });

    it("should toggle item from unchecked to checked", async () => {
      const { saveLocalItem } = await import("@/offline/db");
      const { enqueueChange } = await import("@/offline/syncQueue");

      const result = await store.toggleItem("server_1", "item_1");

      expect(result?.isChecked).toBe(true);
      expect(result?.checkedAt).toBeDefined();
      expect(result?.syncStatus).toBe("pending");

      expect(store.lists[0].checkedItems).toBe(3);

      expect(saveLocalItem).toHaveBeenCalled();
      expect(enqueueChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "toggle",
          entityType: "item",
          entityId: "item_1",
        })
      );
    });

    it("should toggle item from checked to unchecked", async () => {
      store.currentItems = [{ ...mockLocalItem, isChecked: true }];

      const result = await store.toggleItem("server_1", "item_1");

      expect(result?.isChecked).toBe(false);
      expect(result?.checkedAt).toBeUndefined();
      expect(store.lists[0].checkedItems).toBe(1);
    });

    it("should not toggle if item not found", async () => {
      const result = await store.toggleItem("server_1", "nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("removeItem", () => {
    beforeEach(() => {
      store.lists = [mockLocalShoppingList];
      store.currentItems = [mockLocalItem];
    });

    it("should remove an item from the list", async () => {
      const { deleteLocalItem } = await import("@/offline/db");
      const { enqueueChange } = await import("@/offline/syncQueue");

      await store.removeItem("server_1", "item_1");

      expect(store.currentItems).toHaveLength(0);
      expect(store.lists[0].totalItems).toBe(4);

      expect(deleteLocalItem).toHaveBeenCalledWith("item_1");
      expect(enqueueChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "delete",
          entityType: "item",
          entityId: "item_1",
        })
      );
    });

    it("should update checked count when removing checked item", async () => {
      store.currentItems = [{ ...mockLocalItem, isChecked: true }];

      await store.removeItem("server_1", "item_1");

      expect(store.lists[0].checkedItems).toBe(1);
    });
  });

  describe("searchProducts", () => {
    it("should search products online and cache results", async () => {
      const { cacheProducts } = await import("@/offline/db");
      mockService.searchProducts.mockResolvedValue([mockProductSearchResult]);

      await store.searchProducts("milk");

      expect(store.searchLoading).toBe(false);
      expect(store.searchResults).toEqual([mockProductSearchResult]);
      expect(mockService.searchProducts).toHaveBeenCalledWith({ q: "milk" });
      expect(cacheProducts).toHaveBeenCalledWith([mockProductSearchResult]);
    });

    it("should use cached results when offline", async () => {
      const { searchCachedProducts } = await import("@/offline/db");
      Object.defineProperty(navigator, "onLine", { value: false });

      (searchCachedProducts as any).mockResolvedValue([mockProductSearchResult]);

      await store.searchProducts("milk");

      expect(store.searchResults).toEqual([mockProductSearchResult]);
      expect(mockService.searchProducts).not.toHaveBeenCalled();
      expect(searchCachedProducts).toHaveBeenCalledWith("milk");
    });

    it("should fallback to cached results on network error", async () => {
      const { searchCachedProducts } = await import("@/offline/db");
      mockService.searchProducts.mockRejectedValue(new Error("Network error"));
      (searchCachedProducts as any).mockResolvedValue([mockProductSearchResult]);

      await store.searchProducts("milk");

      expect(store.error).toBe("Network error");
      expect(store.searchResults).toEqual([mockProductSearchResult]);
    });
  });

  describe("clearSearch", () => {
    it("should clear search results", () => {
      store.searchResults = [mockProductSearchResult];

      store.clearSearch();

      expect(store.searchResults).toEqual([]);
    });
  });

  describe("clearCurrentList", () => {
    it("should clear current list state", () => {
      store.currentList = mockShoppingListDetail;
      store.currentLocalList = mockLocalShoppingList;
      store.currentItems = [mockLocalItem];

      store.clearCurrentList();

      expect(store.currentList).toBeNull();
      expect(store.currentLocalList).toBeNull();
      expect(store.currentItems).toEqual([]);
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      store.error = "Test error";

      store.clearError();

      expect(store.error).toBeNull();
    });
  });

  describe("addFavoritesToList", () => {
    beforeEach(() => {
      store.lists = [mockLocalShoppingList];
      store.currentLocalList = mockLocalShoppingList;
      store.currentItems = [];
    });

    it("should add favorites to the list", async () => {
      const { generateLocalId, cacheProducts } = await import("@/offline/db");
      mockService.getFavorites.mockResolvedValue([mockProductSearchResult]);
      (generateLocalId as any).mockReturnValue("item_fav_123");

      const result = await store.addFavoritesToList("server_1");

      expect(result).toEqual({ added: 1, skipped: 0 });
      expect(mockService.getFavorites).toHaveBeenCalled();
      expect(cacheProducts).toHaveBeenCalledWith([mockProductSearchResult]);
    });

    it("should skip already existing items", async () => {
      const { generateLocalId } = await import("@/offline/db");
      store.currentItems = [{ ...mockLocalItem, productId: 101 }];
      mockService.getFavorites.mockResolvedValue([mockProductSearchResult]);
      (generateLocalId as any).mockReturnValue("item_fav_123");

      const result = await store.addFavoritesToList("server_1");

      expect(result).toEqual({ added: 0, skipped: 1 });
    });

    it("should return zeros when no favorites", async () => {
      mockService.getFavorites.mockResolvedValue([]);

      const result = await store.addFavoritesToList("server_1");

      expect(result).toEqual({ added: 0, skipped: 0 });
    });

    it("should use cached favorites when offline", async () => {
      const { db } = await import("@/offline/db");
      Object.defineProperty(navigator, "onLine", { value: false });

      (db.cachedProducts.filter as any).mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ ...mockProductSearchResult, isFavorite: true }]),
      });

      const result = await store.addFavoritesToList("server_1");

      expect(mockService.getFavorites).not.toHaveBeenCalled();
    });

    it("should handle errors and set loading to false", async () => {
      mockService.getFavorites.mockRejectedValue(new Error("Network error"));

      await expect(store.addFavoritesToList("server_1")).rejects.toThrow();

      expect(store.loading).toBe(false);
      expect(store.error).toBe("Network error");
    });
  });

  describe("offline/online transitions", () => {
    it("should set isOfflineMode when going offline", async () => {
      const { getLocalLists } = await import("@/offline/db");
      (getLocalLists as any).mockResolvedValue([mockLocalShoppingList]);

      Object.defineProperty(navigator, "onLine", { value: false });

      await store.fetchLists();

      expect(store.isOfflineMode).toBe(true);
    });

    it("should clear isOfflineMode when online and fetch succeeds", async () => {
      const { getLocalLists, syncListsFromServer } = await import("@/offline/db");
      (getLocalLists as any).mockResolvedValue([]);
      mockService.getLists.mockResolvedValue([]);

      await store.fetchLists(true);

      expect(store.isOfflineMode).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should set error on fetch failure", async () => {
      const { getLocalLists } = await import("@/offline/db");
      (getLocalLists as any).mockResolvedValue([]);
      mockService.getLists.mockRejectedValue(new Error("API Error"));

      await store.fetchLists(true);

      expect(store.error).toBe("API Error");
    });

    it("should handle non-Error exceptions", async () => {
      const { getLocalLists } = await import("@/offline/db");
      (getLocalLists as any).mockResolvedValue([]);
      mockService.getLists.mockRejectedValue("String error");

      await store.fetchLists(true);

      expect(store.error).toBe("Failed to fetch lists");
    });
  });
});
