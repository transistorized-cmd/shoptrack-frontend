import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { shoppingListService } from "../shoppingList.service";
import api from "../api";
import type {
  ShoppingList,
  ShoppingListDetail,
  ShoppingListItem,
  CreateShoppingListRequest,
  UpdateShoppingListRequest,
  AddShoppingListItemRequest,
  UpdateShoppingListItemRequest,
  ProductSearchResult,
  ProductSearchQuery,
} from "@/types/shoppingList";

// Mock the API module
vi.mock("../api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("ShoppingListService", () => {
  let mockApi: typeof api;

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

  const mockShoppingListItem: ShoppingListItem = {
    id: 1,
    productId: 101,
    name: "Milk",
    emoji: "🥛",
    category: "Dairy",
    quantity: 2,
    isChecked: false,
    sortOrder: 0,
  };

  const mockShoppingListDetail: ShoppingListDetail = {
    ...mockShoppingList,
    categories: [
      {
        category: "Dairy",
        emoji: "🥛",
        allUnchecked: false,
        itemCount: 2,
        items: [
          mockShoppingListItem,
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
        itemCount: 3,
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

  const mockProductSearchResults: ProductSearchResult[] = [
    {
      id: 1,
      itemNameOriginal: "Milk",
      nombre: "Leche",
      emoji: "🥛",
      tagUuid: "04:E1:5A:6A:94:08:91",
      category: "Dairy",
      hasNfc: true,
      isFavorite: true,
    },
    {
      id: 2,
      itemNameOriginal: "Organic Milk",
      nombre: "Leche Orgánica",
      emoji: "🥛",
      category: "Dairy",
      hasNfc: false,
      isFavorite: false,
    },
  ];

  beforeEach(() => {
    mockApi = api as any;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Shopping Lists", () => {
    describe("getLists", () => {
      it("should get all shopping lists", async () => {
        mockApi.get.mockResolvedValue({ data: mockShoppingLists });

        const result = await shoppingListService.getLists();

        expect(mockApi.get).toHaveBeenCalledWith("/shopping-lists");
        expect(result).toEqual(mockShoppingLists);
        expect(result).toHaveLength(3);
      });

      it("should handle empty lists", async () => {
        mockApi.get.mockResolvedValue({ data: [] });

        const result = await shoppingListService.getLists();

        expect(result).toEqual([]);
      });

      it("should handle API errors", async () => {
        const apiError = new Error("Network error");
        mockApi.get.mockRejectedValue(apiError);

        await expect(shoppingListService.getLists()).rejects.toThrow(
          "Network error"
        );
      });
    });

    describe("getList", () => {
      it("should get a shopping list with items by ID", async () => {
        mockApi.get.mockResolvedValue({ data: mockShoppingListDetail });

        const result = await shoppingListService.getList(1);

        expect(mockApi.get).toHaveBeenCalledWith("/shopping-lists/1");
        expect(result).toEqual(mockShoppingListDetail);
        expect(result.categories).toHaveLength(2);
      });

      it("should handle not found error", async () => {
        const notFoundError = {
          response: { status: 404, data: { message: "List not found" } },
        };
        mockApi.get.mockRejectedValue(notFoundError);

        await expect(shoppingListService.getList(999)).rejects.toEqual(
          notFoundError
        );
      });
    });

    describe("createList", () => {
      it("should create a new shopping list", async () => {
        const createData: CreateShoppingListRequest = {
          name: "New Shopping List",
        };

        const createdList: ShoppingList = {
          id: 4,
          name: "New Shopping List",
          status: "active",
          totalItems: 0,
          checkedItems: 0,
          createdAt: "2024-01-18T10:00:00Z",
          updatedAt: "2024-01-18T10:00:00Z",
        };

        mockApi.post.mockResolvedValue({ data: createdList });

        const result = await shoppingListService.createList(createData);

        expect(mockApi.post).toHaveBeenCalledWith("/shopping-lists", createData);
        expect(result).toEqual(createdList);
        expect(result.status).toBe("active");
      });

      it("should handle validation errors", async () => {
        const invalidData: CreateShoppingListRequest = { name: "" };
        const validationError = {
          response: { status: 400, data: { message: "Name is required" } },
        };

        mockApi.post.mockRejectedValue(validationError);

        await expect(
          shoppingListService.createList(invalidData)
        ).rejects.toEqual(validationError);
      });
    });

    describe("updateList", () => {
      it("should update a shopping list name", async () => {
        const updateData: UpdateShoppingListRequest = {
          name: "Updated List Name",
        };

        const updatedList: ShoppingList = {
          ...mockShoppingList,
          name: "Updated List Name",
          updatedAt: "2024-01-18T12:00:00Z",
        };

        mockApi.put.mockResolvedValue({ data: updatedList });

        const result = await shoppingListService.updateList(1, updateData);

        expect(mockApi.put).toHaveBeenCalledWith("/shopping-lists/1", updateData);
        expect(result.name).toBe("Updated List Name");
      });

      it("should update a shopping list status", async () => {
        const updateData: UpdateShoppingListRequest = {
          status: "completed",
        };

        const updatedList: ShoppingList = {
          ...mockShoppingList,
          status: "completed",
          completedAt: "2024-01-18T12:00:00Z",
          updatedAt: "2024-01-18T12:00:00Z",
        };

        mockApi.put.mockResolvedValue({ data: updatedList });

        const result = await shoppingListService.updateList(1, updateData);

        expect(result.status).toBe("completed");
      });
    });

    describe("deleteList", () => {
      it("should delete a shopping list", async () => {
        mockApi.delete.mockResolvedValue({});

        await shoppingListService.deleteList(1);

        expect(mockApi.delete).toHaveBeenCalledWith("/shopping-lists/1");
      });

      it("should handle not found on delete", async () => {
        const notFoundError = {
          response: { status: 404, data: { message: "List not found" } },
        };

        mockApi.delete.mockRejectedValue(notFoundError);

        await expect(shoppingListService.deleteList(999)).rejects.toEqual(
          notFoundError
        );
      });
    });

    describe("completeList", () => {
      it("should mark a shopping list as complete", async () => {
        const completedList: ShoppingList = {
          ...mockShoppingList,
          status: "completed",
          completedAt: "2024-01-18T12:00:00Z",
          updatedAt: "2024-01-18T12:00:00Z",
        };

        mockApi.post.mockResolvedValue({ data: completedList });

        const result = await shoppingListService.completeList(1);

        expect(mockApi.post).toHaveBeenCalledWith("/shopping-lists/1/complete");
        expect(result.status).toBe("completed");
        expect(result.completedAt).toBeDefined();
      });
    });
  });

  describe("Shopping List Items", () => {
    describe("addItem", () => {
      it("should add an item to a shopping list", async () => {
        const addData: AddShoppingListItemRequest = {
          productId: 101,
          quantity: 2,
        };

        const newItem: ShoppingListItem = {
          id: 10,
          productId: 101,
          name: "Milk",
          emoji: "🥛",
          category: "Dairy",
          quantity: 2,
          isChecked: false,
          sortOrder: 5,
        };

        mockApi.post.mockResolvedValue({ data: newItem });

        const result = await shoppingListService.addItem(1, addData);

        expect(mockApi.post).toHaveBeenCalledWith(
          "/shopping-lists/1/items",
          addData
        );
        expect(result).toEqual(newItem);
      });

      it("should add an item without quantity", async () => {
        const addData: AddShoppingListItemRequest = {
          productId: 101,
        };

        const newItem: ShoppingListItem = {
          id: 10,
          productId: 101,
          name: "Milk",
          emoji: "🥛",
          category: "Dairy",
          isChecked: false,
          sortOrder: 5,
        };

        mockApi.post.mockResolvedValue({ data: newItem });

        const result = await shoppingListService.addItem(1, addData);

        expect(result.quantity).toBeUndefined();
      });
    });

    describe("updateItem", () => {
      it("should update an item's quantity", async () => {
        const updateData: UpdateShoppingListItemRequest = {
          quantity: 5,
        };

        const updatedItem: ShoppingListItem = {
          ...mockShoppingListItem,
          quantity: 5,
        };

        mockApi.put.mockResolvedValue({ data: updatedItem });

        const result = await shoppingListService.updateItem(1, 1, updateData);

        expect(mockApi.put).toHaveBeenCalledWith(
          "/shopping-lists/1/items/1",
          updateData
        );
        expect(result.quantity).toBe(5);
      });
    });

    describe("deleteItem", () => {
      it("should delete an item from a shopping list", async () => {
        mockApi.delete.mockResolvedValue({});

        await shoppingListService.deleteItem(1, 1);

        expect(mockApi.delete).toHaveBeenCalledWith("/shopping-lists/1/items/1");
      });
    });

    describe("toggleItem", () => {
      it("should toggle an item's checked state", async () => {
        const toggledItem: ShoppingListItem = {
          ...mockShoppingListItem,
          isChecked: true,
          checkedAt: "2024-01-18T12:00:00Z",
        };

        mockApi.patch.mockResolvedValue({ data: toggledItem });

        const result = await shoppingListService.toggleItem(1, 1);

        expect(mockApi.patch).toHaveBeenCalledWith(
          "/shopping-lists/1/items/1/toggle"
        );
        expect(result.isChecked).toBe(true);
        expect(result.checkedAt).toBeDefined();
      });
    });

    describe("toggleAllItems", () => {
      it("should toggle all items to checked", async () => {
        mockApi.patch.mockResolvedValue({});

        await shoppingListService.toggleAllItems(1, true);

        expect(mockApi.patch).toHaveBeenCalledWith(
          "/shopping-lists/1/items/toggle-all",
          { checked: true }
        );
      });

      it("should toggle all items to unchecked", async () => {
        mockApi.patch.mockResolvedValue({});

        await shoppingListService.toggleAllItems(1, false);

        expect(mockApi.patch).toHaveBeenCalledWith(
          "/shopping-lists/1/items/toggle-all",
          { checked: false }
        );
      });
    });
  });

  describe("Product Search", () => {
    describe("searchProducts", () => {
      it("should search products by query", async () => {
        mockApi.get.mockResolvedValue({ data: mockProductSearchResults });

        const query: ProductSearchQuery = { q: "milk" };
        const result = await shoppingListService.searchProducts(query);

        expect(mockApi.get).toHaveBeenCalledWith("/products/search", {
          params: { q: "milk" },
        });
        expect(result).toEqual(mockProductSearchResults);
      });

      it("should search products by tag UUID", async () => {
        mockApi.get.mockResolvedValue({ data: [mockProductSearchResults[0]] });

        const query: ProductSearchQuery = { tagUuid: "04:E1:5A:6A:94:08:91" };
        const result = await shoppingListService.searchProducts(query);

        expect(mockApi.get).toHaveBeenCalledWith("/products/search", {
          params: { tagUuid: "04:E1:5A:6A:94:08:91" },
        });
        expect(result).toHaveLength(1);
      });

      it("should search products by category", async () => {
        mockApi.get.mockResolvedValue({ data: mockProductSearchResults });

        const query: ProductSearchQuery = { category: "Dairy" };
        const result = await shoppingListService.searchProducts(query);

        expect(mockApi.get).toHaveBeenCalledWith("/products/search", {
          params: { category: "Dairy" },
        });
      });

      it("should filter NFC products only", async () => {
        mockApi.get.mockResolvedValue({ data: [mockProductSearchResults[0]] });

        const query: ProductSearchQuery = { hasNfc: true };
        const result = await shoppingListService.searchProducts(query);

        expect(mockApi.get).toHaveBeenCalledWith("/products/search", {
          params: { hasNfc: true },
        });
        expect(result[0].hasNfc).toBe(true);
      });

      it("should filter favorites only", async () => {
        mockApi.get.mockResolvedValue({ data: [mockProductSearchResults[0]] });

        const query: ProductSearchQuery = { favoritesOnly: true };
        const result = await shoppingListService.searchProducts(query);

        expect(mockApi.get).toHaveBeenCalledWith("/products/search", {
          params: { favoritesOnly: true },
        });
      });

      it("should combine multiple search parameters", async () => {
        mockApi.get.mockResolvedValue({ data: mockProductSearchResults });

        const query: ProductSearchQuery = {
          q: "milk",
          category: "Dairy",
          hasNfc: true,
        };
        const result = await shoppingListService.searchProducts(query);

        expect(mockApi.get).toHaveBeenCalledWith("/products/search", {
          params: { q: "milk", category: "Dairy", hasNfc: true },
        });
      });

      it("should handle empty search results", async () => {
        mockApi.get.mockResolvedValue({ data: [] });

        const query: ProductSearchQuery = { q: "nonexistent" };
        const result = await shoppingListService.searchProducts(query);

        expect(result).toEqual([]);
      });
    });
  });

  describe("Favorites", () => {
    describe("getFavorites", () => {
      it("should get all favorite products", async () => {
        const favorites = mockProductSearchResults.filter((p) => p.isFavorite);
        mockApi.get.mockResolvedValue({ data: favorites });

        const result = await shoppingListService.getFavorites();

        expect(mockApi.get).toHaveBeenCalledWith("/user/favorites");
        expect(result).toEqual(favorites);
      });

      it("should handle empty favorites", async () => {
        mockApi.get.mockResolvedValue({ data: [] });

        const result = await shoppingListService.getFavorites();

        expect(result).toEqual([]);
      });
    });

    describe("addFavorite", () => {
      it("should add a product to favorites", async () => {
        mockApi.post.mockResolvedValue({});

        await shoppingListService.addFavorite(1);

        expect(mockApi.post).toHaveBeenCalledWith("/user/favorites/1");
      });

      it("should handle duplicate favorite error", async () => {
        const duplicateError = {
          response: { status: 409, data: { message: "Already a favorite" } },
        };
        mockApi.post.mockRejectedValue(duplicateError);

        await expect(shoppingListService.addFavorite(1)).rejects.toEqual(
          duplicateError
        );
      });
    });

    describe("removeFavorite", () => {
      it("should remove a product from favorites", async () => {
        mockApi.delete.mockResolvedValue({});

        await shoppingListService.removeFavorite(1);

        expect(mockApi.delete).toHaveBeenCalledWith("/user/favorites/1");
      });

      it("should handle not found error", async () => {
        const notFoundError = {
          response: { status: 404, data: { message: "Favorite not found" } },
        };
        mockApi.delete.mockRejectedValue(notFoundError);

        await expect(shoppingListService.removeFavorite(999)).rejects.toEqual(
          notFoundError
        );
      });
    });

    describe("isFavorite", () => {
      it("should return true for a favorite product", async () => {
        mockApi.get.mockResolvedValue({ data: { isFavorite: true } });

        const result = await shoppingListService.isFavorite(1);

        expect(mockApi.get).toHaveBeenCalledWith("/user/favorites/1");
        expect(result).toBe(true);
      });

      it("should return false for a non-favorite product", async () => {
        mockApi.get.mockResolvedValue({ data: { isFavorite: false } });

        const result = await shoppingListService.isFavorite(2);

        expect(result).toBe(false);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle network timeout", async () => {
      const timeoutError = new Error("timeout of 15000ms exceeded");
      mockApi.get.mockRejectedValue(timeoutError);

      await expect(shoppingListService.getLists()).rejects.toThrow(
        "timeout of 15000ms exceeded"
      );
    });

    it("should handle server errors (5xx)", async () => {
      const serverError = {
        response: { status: 500, data: { message: "Internal server error" } },
      };
      mockApi.get.mockRejectedValue(serverError);

      await expect(shoppingListService.getLists()).rejects.toEqual(serverError);
    });

    it("should handle unauthorized errors", async () => {
      const unauthorizedError = {
        response: { status: 401, data: { message: "Unauthorized" } },
      };
      mockApi.get.mockRejectedValue(unauthorizedError);

      await expect(shoppingListService.getList(1)).rejects.toEqual(
        unauthorizedError
      );
    });
  });
});
