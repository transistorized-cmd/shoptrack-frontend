import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { receiptsService } from "../receipts";
import api from "../api";
import { getCurrentLocale } from "@/i18n";
import type {
  Receipt,
  ReceiptItem,
  ReceiptQuery,
  PagedResult,
} from "@/types/receipt";
import type { ProcessingResult } from "@/types/plugin";

// Import test factories
import {
  receiptFactory,
  receiptVariants,
  receiptItemFactory,
  receiptItemVariants,
  pagedResultFactory,
  processingResultFactory,
  createTestReceipt,
  axiosResponseVariants,
  axiosErrorVariants,
  mockApiCalls,
} from "../../../tests/factories";

// Mock the API module
vi.mock("../api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the i18n module
vi.mock("@/i18n", () => ({
  getCurrentLocale: vi.fn(),
}));

describe("receipts service (refactored with factories)", () => {
  let mockApi: typeof api;
  let mockGetCurrentLocale: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockApi = api as any;
    mockGetCurrentLocale = getCurrentLocale as any;
    mockGetCurrentLocale.mockReturnValue("en");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getReceipts", () => {
    it("should fetch receipts successfully", async () => {
      // Use factory to create test data
      const mockPagedResult = pagedResultFactory.build({
        items: receiptFactory.buildList(3),
        totalCount: 3,
      });

      mockApi.get.mockResolvedValue(axiosResponseVariants.ok(mockPagedResult));

      const query = { page: 1, pageSize: 20 };
      const result = await receiptsService.getReceipts(query);

      expect(result).toEqual(mockPagedResult);
      expect(mockApi.get).toHaveBeenCalledWith("/receipts", {
        params: { ...query, locale: "en" },
      });
    });

    it("should handle API error", async () => {
      // Use factory to create error response
      const errorResponse = axiosErrorVariants.serverError();
      mockApi.get.mockRejectedValue(errorResponse);

      const query = { page: 1, pageSize: 20 };

      await expect(receiptsService.getReceipts(query)).rejects.toThrow();

      expect(mockApi.get).toHaveBeenCalledWith("/receipts", {
        params: { ...query, locale: "en" },
      });
    });

    it("should include search parameters", async () => {
      // Use factory with search parameters
      const mockResults = pagedResultFactory.build({
        items: receiptFactory.buildList(2, {
          storeName: "SuperMarket",
        }),
      });

      mockApi.get.mockResolvedValue(axiosResponseVariants.ok(mockResults));

      const query = {
        page: 1,
        pageSize: 20,
        searchTerm: "SuperMarket",
        category: "Groceries",
        dateFrom: "2024-01-01",
        dateTo: "2024-01-31",
      };

      const result = await receiptsService.getReceipts(query);

      expect(result).toEqual(mockResults);
      expect(mockApi.get).toHaveBeenCalledWith("/receipts", {
        params: { ...query, locale: "en" },
      });
    });
  });

  describe("getReceipt", () => {
    it("should fetch single receipt successfully", async () => {
      // Use factory variant for completed receipt
      const mockReceipt = receiptVariants.completed();

      mockApi.get.mockResolvedValue(axiosResponseVariants.ok(mockReceipt));

      const result = await receiptsService.getReceipt(1);

      expect(result).toEqual(mockReceipt);
      expect(mockApi.get).toHaveBeenCalledWith("/receipts/1", {
        params: { locale: "en" },
      });
    });

    it("should handle receipt not found", async () => {
      // Use factory for not found error
      const notFoundError = axiosErrorVariants.notFound();
      mockApi.get.mockRejectedValue(notFoundError);

      await expect(receiptsService.getReceipt(999)).rejects.toThrow();

      expect(mockApi.get).toHaveBeenCalledWith("/receipts/999", {
        params: { locale: "en" },
      });
    });
  });

  describe("uploadReceipt", () => {
    it("should upload receipt successfully", async () => {
      // Use factory for processing result
      const mockResult = processingResultFactory.build({
        success: true,
        receiptId: 1,
        itemsDetected: 5,
        itemsParsed: 4,
      });

      mockApi.post.mockResolvedValue(axiosResponseVariants.created(mockResult));

      const file = new File(["test"], "receipt.jpg", { type: "image/jpeg" });
      const result = await receiptsService.uploadReceipt(file);

      expect(result).toEqual(mockResult);
      expect(mockApi.post).toHaveBeenCalledWith(
        "/receipts/upload",
        expect.any(FormData),
        expect.objectContaining({
          headers: { "Content-Type": "multipart/form-data" },
        }),
      );
    });

    it("should handle upload failure", async () => {
      // Use factory for upload error
      const uploadError = axiosErrorVariants.badRequest();
      mockApi.post.mockRejectedValue(uploadError);

      const file = new File(["test"], "receipt.jpg", { type: "image/jpeg" });

      await expect(receiptsService.uploadReceipt(file)).rejects.toThrow();
    });

    it("should upload with plugin detection", async () => {
      // Use factory for processing result with plugin
      const mockResult = processingResultFactory.build({
        success: true,
        receiptId: 2,
        message: "Receipt processed with ClaudePlugin",
      });

      mockApi.post.mockResolvedValue(axiosResponseVariants.created(mockResult));

      const file = new File(["test"], "receipt.jpg", { type: "image/jpeg" });
      const result = await receiptsService.uploadReceipt(
        file,
        "claude-processor",
      );

      expect(result).toEqual(mockResult);

      const formData = (mockApi.post as any).mock.calls[0][1];
      expect(formData.get("pluginId")).toBe("claude-processor");
    });
  });

  describe("updateReceipt", () => {
    it("should update receipt successfully", async () => {
      // Use factory to create updated receipt
      const originalReceipt = receiptVariants.completed();
      const updatedReceipt = {
        ...originalReceipt,
        storeName: "Updated Store Name",
        receiptDate: "2024-02-01",
      };

      mockApi.put.mockResolvedValue(axiosResponseVariants.ok(updatedReceipt));

      const updates = {
        storeName: "Updated Store Name",
        receiptDate: "2024-02-01",
      };

      const result = await receiptsService.updateReceipt(1, updates);

      expect(result).toEqual(updatedReceipt);
      expect(mockApi.put).toHaveBeenCalledWith("/receipts/1", updates);
    });

    it("should handle update validation error", async () => {
      // Use factory for validation error
      const validationError = axiosErrorVariants.badRequest();
      mockApi.put.mockRejectedValue(validationError);

      const updates = { storeName: "" }; // Invalid empty name

      await expect(receiptsService.updateReceipt(1, updates)).rejects.toThrow();
    });
  });

  describe("updateReceiptItem", () => {
    it("should update receipt item successfully", async () => {
      // Use factory variant for updated item
      const originalItem = receiptItemVariants.groceryItem();
      const updatedItem = {
        ...originalItem,
        itemName: "Updated Item Name",
        totalPrice: 15.99,
        confidence: "manual" as const,
      };

      mockApi.put.mockResolvedValue(axiosResponseVariants.ok(updatedItem));

      const updates = {
        itemName: "Updated Item Name",
        totalPrice: 15.99,
        confidence: "manual" as const,
      };

      const result = await receiptsService.updateReceiptItem(1, updates);

      expect(result).toEqual(updatedItem);
      expect(mockApi.put).toHaveBeenCalledWith("/receipt-items/1", updates);
    });

    it("should handle manual item correction", async () => {
      // Use factory for manually corrected item
      const manualItem = receiptItemVariants.manualItem();
      manualItem.itemName = "Manually Corrected Item";
      manualItem.totalPrice = 12.5;

      mockApi.put.mockResolvedValue(axiosResponseVariants.ok(manualItem));

      const updates = {
        itemName: "Manually Corrected Item",
        totalPrice: 12.5,
        confidence: "manual" as const,
        notes: "Corrected by user",
      };

      const result = await receiptsService.updateReceiptItem(1, updates);

      expect(result.confidence).toBe("manual");
      expect(result.notes).toBe("Corrected by user");
    });
  });

  describe("deleteReceipt", () => {
    it("should delete receipt successfully", async () => {
      mockApi.delete.mockResolvedValue(axiosResponseVariants.noContent());

      await receiptsService.deleteReceipt(1);

      expect(mockApi.delete).toHaveBeenCalledWith("/receipts/1");
    });

    it("should handle delete failure", async () => {
      // Use factory for delete error
      const deleteError = axiosErrorVariants.forbidden();
      mockApi.delete.mockRejectedValue(deleteError);

      await expect(receiptsService.deleteReceipt(1)).rejects.toThrow();
    });
  });

  describe("deleteReceiptItem", () => {
    it("should delete receipt item successfully", async () => {
      mockApi.delete.mockResolvedValue(axiosResponseVariants.noContent());

      await receiptsService.deleteReceiptItem(1);

      expect(mockApi.delete).toHaveBeenCalledWith("/receipt-items/1");
    });
  });

  describe("searchReceipts", () => {
    it("should search receipts by term", async () => {
      // Use factory to create search results
      const searchResults = pagedResultFactory.build({
        items: receiptFactory.buildList(2, {
          storeName: "Walmart",
        }),
        totalCount: 2,
      });

      mockApi.get.mockResolvedValue(axiosResponseVariants.ok(searchResults));

      const result = await receiptsService.searchReceipts("Walmart");

      expect(result).toEqual(searchResults);
      expect(mockApi.get).toHaveBeenCalledWith("/receipts/search", {
        params: { q: "Walmart", locale: "en" },
      });
    });

    it("should handle empty search results", async () => {
      // Use factory for empty results
      const emptyResults = pagedResultFactory.build({
        items: [],
        totalCount: 0,
      });

      mockApi.get.mockResolvedValue(axiosResponseVariants.ok(emptyResults));

      const result = await receiptsService.searchReceipts("nonexistent");

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe("getReceiptStats", () => {
    it("should fetch receipt statistics", async () => {
      // Create mock stats using factory approach
      const mockStats = {
        totalReceipts: 50,
        totalItems: 250,
        totalAmount: 1250.99,
        averageAmount: 25.02,
        mostFrequentStore: "SuperMarket",
        categoriesCount: {
          Groceries: 150,
          Electronics: 50,
          Clothing: 30,
        },
      };

      mockApi.get.mockResolvedValue(axiosResponseVariants.ok(mockStats));

      const result = await receiptsService.getReceiptStats();

      expect(result).toEqual(mockStats);
      expect(mockApi.get).toHaveBeenCalledWith("/receipts/stats", {
        params: { locale: "en" },
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      // Use factory for network error
      const networkError = axiosErrorVariants.networkError();
      mockApi.get.mockRejectedValue(networkError);

      await expect(
        receiptsService.getReceipts({ page: 1, pageSize: 20 }),
      ).rejects.toThrow("Network Error");
    });

    it("should handle timeout errors", async () => {
      // Use factory for timeout error
      const timeoutError = axiosErrorVariants.timeout();
      mockApi.post.mockRejectedValue(timeoutError);

      const file = new File(["test"], "receipt.jpg", { type: "image/jpeg" });

      await expect(receiptsService.uploadReceipt(file)).rejects.toThrow(
        "timeout of 8000ms exceeded",
      );
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle receipt with mixed confidence items", async () => {
      // Use factory to create receipt with varied confidence levels
      const { receipt, items } = createTestReceipt({
        itemCount: 5,
        receipt: { storeName: "Mixed Confidence Store" },
      });

      // Manually set different confidence levels
      items[0].confidence = "high";
      items[1].confidence = "medium";
      items[2].confidence = "low";
      items[3].confidence = "manual";
      items[4].confidence = "high";

      receipt.items = items;

      mockApi.get.mockResolvedValue(axiosResponseVariants.ok(receipt));

      const result = await receiptsService.getReceipt(1);

      expect(result.items).toHaveLength(5);
      expect(
        result.items?.filter((item) => item.confidence === "high"),
      ).toHaveLength(2);
      expect(
        result.items?.filter((item) => item.confidence === "low"),
      ).toHaveLength(1);
      expect(
        result.items?.filter((item) => item.confidence === "manual"),
      ).toHaveLength(1);
    });

    it("should handle large receipt with many items", async () => {
      // Use factory variant for large receipt
      const largeReceipt = receiptVariants.large();

      mockApi.get.mockResolvedValue(axiosResponseVariants.ok(largeReceipt));

      const result = await receiptsService.getReceipt(1);

      expect(result.totalItemsDetected).toBe(20);
      expect(result.successfullyParsed).toBe(18);
      expect(result.items).toHaveLength(18);
    });
  });
});
