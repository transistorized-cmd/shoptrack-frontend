import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  nfcProductsService,
  type NfcProductDto,
  type CreateNfcProductDto,
  type UpdateNfcProductDto,
  type ItemSuggestionDto,
} from "../nfcProducts";
import api from "../api";

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

describe("NfcProductsService", () => {
  let mockApi: typeof api;

  // Mock data
  const mockNfcProduct: NfcProductDto = {
    id: 1,
    itemNameOriginal: "Milk",
    nombre: "Leche",
    emoji: "🥛",
    tagUuid: "04:E1:5A:6A:94:08:91",
    category: "Dairy",
    activo: true,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  };

  const mockNfcProducts: NfcProductDto[] = [
    mockNfcProduct,
    {
      id: 2,
      itemNameOriginal: "Bread",
      nombre: "Pan",
      emoji: "🍞",
      tagUuid: "04:E1:5A:6A:94:08:92",
      category: "Bakery",
      activo: true,
      createdAt: "2024-01-16T10:00:00Z",
      updatedAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 3,
      itemNameOriginal: "Cheese",
      nombre: "Queso",
      emoji: "🧀",
      tagUuid: null,
      category: "Dairy",
      activo: false,
      createdAt: "2024-01-17T10:00:00Z",
      updatedAt: "2024-01-17T10:00:00Z",
    },
  ];

  const mockItemSuggestions: ItemSuggestionDto[] = [
    { itemName: "Milk", category: "Dairy", count: 15 },
    { itemName: "Organic Milk", category: "Dairy", count: 8 },
    { itemName: "Chocolate Milk", category: "Dairy", count: 5 },
  ];

  beforeEach(() => {
    mockApi = api as any;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getAll", () => {
    it("should get all NFC products without filter", async () => {
      mockApi.get.mockResolvedValue({ data: mockNfcProducts });

      const result = await nfcProductsService.getAll();

      expect(mockApi.get).toHaveBeenCalledWith("/nfcproducts", { params: {} });
      expect(result).toEqual(mockNfcProducts);
      expect(result).toHaveLength(3);
    });

    it("should get only active NFC products when activo is true", async () => {
      const activeProducts = mockNfcProducts.filter((p) => p.activo);
      mockApi.get.mockResolvedValue({ data: activeProducts });

      const result = await nfcProductsService.getAll(true);

      expect(mockApi.get).toHaveBeenCalledWith("/nfcproducts", {
        params: { activo: true },
      });
      expect(result).toEqual(activeProducts);
      expect(result).toHaveLength(2);
    });

    it("should get only inactive NFC products when activo is false", async () => {
      const inactiveProducts = mockNfcProducts.filter((p) => !p.activo);
      mockApi.get.mockResolvedValue({ data: inactiveProducts });

      const result = await nfcProductsService.getAll(false);

      expect(mockApi.get).toHaveBeenCalledWith("/nfcproducts", {
        params: { activo: false },
      });
      expect(result).toEqual(inactiveProducts);
      expect(result).toHaveLength(1);
    });

    it("should handle empty results", async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      const result = await nfcProductsService.getAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it("should handle API errors", async () => {
      const apiError = new Error("Network error");
      mockApi.get.mockRejectedValue(apiError);

      await expect(nfcProductsService.getAll()).rejects.toThrow("Network error");
    });
  });

  describe("getById", () => {
    it("should get NFC product by ID", async () => {
      mockApi.get.mockResolvedValue({ data: mockNfcProduct });

      const result = await nfcProductsService.getById(1);

      expect(mockApi.get).toHaveBeenCalledWith("/nfcproducts/1");
      expect(result).toEqual(mockNfcProduct);
      expect(result.id).toBe(1);
    });

    it("should handle not found error", async () => {
      const notFoundError = {
        response: { status: 404, data: { message: "Product not found" } },
      };
      mockApi.get.mockRejectedValue(notFoundError);

      await expect(nfcProductsService.getById(999)).rejects.toEqual(
        notFoundError
      );
    });
  });

  describe("getByTagUuid", () => {
    it("should get NFC product by tag UUID", async () => {
      mockApi.get.mockResolvedValue({ data: mockNfcProduct });

      const result = await nfcProductsService.getByTagUuid(
        "04:E1:5A:6A:94:08:91"
      );

      expect(mockApi.get).toHaveBeenCalledWith(
        "/nfcproducts/by-tag/04%3AE1%3A5A%3A6A%3A94%3A08%3A91"
      );
      expect(result).toEqual(mockNfcProduct);
    });

    it("should properly encode special characters in tag UUID", async () => {
      mockApi.get.mockResolvedValue({ data: mockNfcProduct });

      await nfcProductsService.getByTagUuid("tag:with/special&chars");

      expect(mockApi.get).toHaveBeenCalledWith(
        "/nfcproducts/by-tag/tag%3Awith%2Fspecial%26chars"
      );
    });

    it("should handle not found for unknown tag", async () => {
      const notFoundError = {
        response: { status: 404, data: { message: "Tag not found" } },
      };
      mockApi.get.mockRejectedValue(notFoundError);

      await expect(
        nfcProductsService.getByTagUuid("unknown-tag")
      ).rejects.toEqual(notFoundError);
    });
  });

  describe("create", () => {
    it("should create a new NFC product with all fields", async () => {
      const createData: CreateNfcProductDto = {
        itemNameOriginal: "Coffee",
        nombre: "Café",
        emoji: "☕",
        tagUuid: "04:E1:5A:6A:94:08:99",
        category: "Beverages",
        activo: true,
      };

      const createdProduct: NfcProductDto = {
        id: 4,
        ...createData,
        tagUuid: createData.tagUuid!,
        category: createData.category!,
        activo: createData.activo!,
        createdAt: "2024-01-18T10:00:00Z",
        updatedAt: "2024-01-18T10:00:00Z",
      };

      mockApi.post.mockResolvedValue({ data: createdProduct });

      const result = await nfcProductsService.create(createData);

      expect(mockApi.post).toHaveBeenCalledWith("/nfcproducts", createData);
      expect(result).toEqual(createdProduct);
      expect(result.id).toBe(4);
    });

    it("should create NFC product with minimal required fields", async () => {
      const minimalData: CreateNfcProductDto = {
        itemNameOriginal: "Water",
        nombre: "Agua",
      };

      const createdProduct: NfcProductDto = {
        id: 5,
        itemNameOriginal: "Water",
        nombre: "Agua",
        emoji: "",
        tagUuid: null,
        category: null,
        activo: true,
        createdAt: "2024-01-18T10:00:00Z",
        updatedAt: "2024-01-18T10:00:00Z",
      };

      mockApi.post.mockResolvedValue({ data: createdProduct });

      const result = await nfcProductsService.create(minimalData);

      expect(mockApi.post).toHaveBeenCalledWith("/nfcproducts", minimalData);
      expect(result).toEqual(createdProduct);
    });

    it("should handle validation errors", async () => {
      const invalidData: CreateNfcProductDto = {
        itemNameOriginal: "",
        nombre: "",
      };

      const validationError = {
        response: {
          status: 400,
          data: { message: "Item name is required" },
        },
      };

      mockApi.post.mockRejectedValue(validationError);

      await expect(nfcProductsService.create(invalidData)).rejects.toEqual(
        validationError
      );
    });
  });

  describe("update", () => {
    it("should update an NFC product", async () => {
      const updateData: UpdateNfcProductDto = {
        nombre: "Leche Entera",
        emoji: "🥛",
      };

      const updatedProduct: NfcProductDto = {
        ...mockNfcProduct,
        nombre: "Leche Entera",
        updatedAt: "2024-01-18T12:00:00Z",
      };

      mockApi.put.mockResolvedValue({ data: updatedProduct });

      const result = await nfcProductsService.update(1, updateData);

      expect(mockApi.put).toHaveBeenCalledWith("/nfcproducts/1", updateData);
      expect(result.nombre).toBe("Leche Entera");
    });

    it("should update only specific fields", async () => {
      const partialUpdate: UpdateNfcProductDto = {
        activo: false,
      };

      const updatedProduct: NfcProductDto = {
        ...mockNfcProduct,
        activo: false,
        updatedAt: "2024-01-18T12:00:00Z",
      };

      mockApi.put.mockResolvedValue({ data: updatedProduct });

      const result = await nfcProductsService.update(1, partialUpdate);

      expect(mockApi.put).toHaveBeenCalledWith("/nfcproducts/1", partialUpdate);
      expect(result.activo).toBe(false);
    });

    it("should handle not found on update", async () => {
      const notFoundError = {
        response: { status: 404, data: { message: "Product not found" } },
      };

      mockApi.put.mockRejectedValue(notFoundError);

      await expect(
        nfcProductsService.update(999, { nombre: "Test" })
      ).rejects.toEqual(notFoundError);
    });
  });

  describe("delete", () => {
    it("should delete an NFC product", async () => {
      mockApi.delete.mockResolvedValue({});

      await nfcProductsService.delete(1);

      expect(mockApi.delete).toHaveBeenCalledWith("/nfcproducts/1");
    });

    it("should handle not found on delete", async () => {
      const notFoundError = {
        response: { status: 404, data: { message: "Product not found" } },
      };

      mockApi.delete.mockRejectedValue(notFoundError);

      await expect(nfcProductsService.delete(999)).rejects.toEqual(
        notFoundError
      );
    });

    it("should complete without returning data", async () => {
      mockApi.delete.mockResolvedValue({ data: null });

      const result = await nfcProductsService.delete(1);

      expect(result).toBeUndefined();
    });
  });

  describe("toggle", () => {
    it("should toggle NFC product active status", async () => {
      const toggledProduct: NfcProductDto = {
        ...mockNfcProduct,
        activo: false,
        updatedAt: "2024-01-18T12:00:00Z",
      };

      mockApi.patch.mockResolvedValue({ data: toggledProduct });

      const result = await nfcProductsService.toggle(1);

      expect(mockApi.patch).toHaveBeenCalledWith("/nfcproducts/1/toggle");
      expect(result.activo).toBe(false);
    });

    it("should toggle inactive product to active", async () => {
      const inactiveProduct = { ...mockNfcProducts[2] };
      const toggledProduct: NfcProductDto = {
        ...inactiveProduct,
        activo: true,
        updatedAt: "2024-01-18T12:00:00Z",
      };

      mockApi.patch.mockResolvedValue({ data: toggledProduct });

      const result = await nfcProductsService.toggle(3);

      expect(result.activo).toBe(true);
    });

    it("should handle not found on toggle", async () => {
      const notFoundError = {
        response: { status: 404, data: { message: "Product not found" } },
      };

      mockApi.patch.mockRejectedValue(notFoundError);

      await expect(nfcProductsService.toggle(999)).rejects.toEqual(
        notFoundError
      );
    });
  });

  describe("getItemSuggestions", () => {
    it("should get item suggestions without search query", async () => {
      mockApi.get.mockResolvedValue({ data: mockItemSuggestions });

      const result = await nfcProductsService.getItemSuggestions();

      expect(mockApi.get).toHaveBeenCalledWith("/nfcproducts/item-suggestions", {
        params: {},
      });
      expect(result).toEqual(mockItemSuggestions);
    });

    it("should get item suggestions with search query", async () => {
      const filteredSuggestions = [mockItemSuggestions[0]];
      mockApi.get.mockResolvedValue({ data: filteredSuggestions });

      const result = await nfcProductsService.getItemSuggestions("Milk");

      expect(mockApi.get).toHaveBeenCalledWith("/nfcproducts/item-suggestions", {
        params: { search: "Milk" },
      });
      expect(result).toEqual(filteredSuggestions);
    });

    it("should handle empty search results", async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      const result = await nfcProductsService.getItemSuggestions("xyz");

      expect(result).toEqual([]);
    });

    it("should not include search param for empty string", async () => {
      mockApi.get.mockResolvedValue({ data: mockItemSuggestions });

      await nfcProductsService.getItemSuggestions("");

      expect(mockApi.get).toHaveBeenCalledWith("/nfcproducts/item-suggestions", {
        params: {},
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle network timeout", async () => {
      const timeoutError = new Error("timeout of 15000ms exceeded");
      timeoutError.name = "AxiosError";
      mockApi.get.mockRejectedValue(timeoutError);

      await expect(nfcProductsService.getAll()).rejects.toThrow(
        "timeout of 15000ms exceeded"
      );
    });

    it("should handle server errors (5xx)", async () => {
      const serverError = {
        response: {
          status: 500,
          data: { message: "Internal server error" },
        },
      };
      mockApi.get.mockRejectedValue(serverError);

      await expect(nfcProductsService.getAll()).rejects.toEqual(serverError);
    });

    it("should handle unauthorized errors", async () => {
      const unauthorizedError = {
        response: {
          status: 401,
          data: { message: "Unauthorized" },
        },
      };
      mockApi.get.mockRejectedValue(unauthorizedError);

      await expect(nfcProductsService.getById(1)).rejects.toEqual(
        unauthorizedError
      );
    });
  });
});
