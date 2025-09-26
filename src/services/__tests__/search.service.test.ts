import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SearchService, searchService } from "../search.service";
import { apiWithTimeout } from "../api";
import type { SearchRequest, SearchResponse } from "@/types/search";

// Mock the API with timeout module
vi.mock("../api", () => ({
  apiWithTimeout: {
    fast: {
      get: vi.fn(),
      post: vi.fn(),
    },
  },
}));

// Mock console methods
const mockConsole = {
  error: vi.fn(),
};

Object.defineProperty(console, "error", { value: mockConsole.error });

const mockApiWithTimeout = vi.mocked(apiWithTimeout);

describe("SearchService", () => {
  let service: SearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SearchService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("constructor", () => {
    it("should create a new instance", () => {
      expect(service).toBeInstanceOf(SearchService);
    });
  });

  describe("search (GET method)", () => {
    it("should perform search with basic parameters", async () => {
      // Arrange
      const searchRequest: SearchRequest = {
        query: "coffee",
        locale: "en",
        limit: 10,
      };

      const mockResponse: SearchResponse = {
        receipts: [
          {
            id: "1",
            storeName: "Starbucks",
            totalAmount: 5.99,
            date: "2024-01-15",
            items: ["Coffee Latte"],
          },
        ],
        items: [
          {
            id: "1",
            name: "Coffee Beans",
            category: "Food & Beverage",
            avgPrice: 12.99,
          },
        ],
        categories: [
          {
            id: 1,
            name: "Coffee & Tea",
            key: "coffee-tea",
          },
        ],
        totalResults: 15,
        hasMore: true,
      };

      mockApiWithTimeout.fast.get.mockResolvedValue({
        data: mockResponse,
      });

      // Act
      const result = await service.search(searchRequest);

      // Assert
      expect(mockApiWithTimeout.fast.get).toHaveBeenCalledTimes(1);
      expect(mockApiWithTimeout.fast.get).toHaveBeenCalledWith("/search", {
        params: {
          query: "coffee",
          locale: "en",
          limit: 10,
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it("should handle search with minimal parameters", async () => {
      // Arrange
      const searchRequest: SearchRequest = {
        query: "test",
      };

      const mockResponse: SearchResponse = {
        receipts: [],
        items: [],
        categories: [],
        totalResults: 0,
        hasMore: false,
      };

      mockApiWithTimeout.fast.get.mockResolvedValue({
        data: mockResponse,
      });

      // Act
      const result = await service.search(searchRequest);

      // Assert
      expect(mockApiWithTimeout.fast.get).toHaveBeenCalledWith("/search", {
        params: {
          query: "test",
          locale: undefined,
          limit: undefined,
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it("should handle empty search results", async () => {
      // Arrange
      const searchRequest: SearchRequest = {
        query: "nonexistent",
        locale: "en",
        limit: 5,
      };

      const mockResponse: SearchResponse = {
        receipts: [],
        items: [],
        categories: [],
        totalResults: 0,
        hasMore: false,
      };

      mockApiWithTimeout.fast.get.mockResolvedValue({
        data: mockResponse,
      });

      // Act
      const result = await service.search(searchRequest);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(result.totalResults).toBe(0);
      expect(result.receipts).toHaveLength(0);
      expect(result.items).toHaveLength(0);
      expect(result.categories).toHaveLength(0);
    });

    it("should handle complex search results", async () => {
      // Arrange
      const searchRequest: SearchRequest = {
        query: "grocery",
        locale: "en",
        limit: 20,
      };

      const mockResponse: SearchResponse = {
        receipts: Array.from({ length: 5 }, (_, i) => ({
          id: `receipt_${i + 1}`,
          storeName: `Store ${i + 1}`,
          totalAmount: (i + 1) * 10.99,
          date: `2024-01-${15 + i}`,
          items: [`Item ${i + 1}`, `Item ${i + 2}`],
        })),
        items: Array.from({ length: 10 }, (_, i) => ({
          id: `item_${i + 1}`,
          name: `Grocery Item ${i + 1}`,
          category: "Groceries",
          avgPrice: (i + 1) * 2.99,
        })),
        categories: [
          {
            id: 1,
            name: "Groceries",
            key: "groceries",
          },
          {
            id: 2,
            name: "Food & Beverage",
            key: "food-beverage",
          },
        ],
        totalResults: 50,
        hasMore: true,
      };

      mockApiWithTimeout.fast.get.mockResolvedValue({
        data: mockResponse,
      });

      // Act
      const result = await service.search(searchRequest);

      // Assert
      expect(result.receipts).toHaveLength(5);
      expect(result.items).toHaveLength(10);
      expect(result.categories).toHaveLength(2);
      expect(result.totalResults).toBe(50);
      expect(result.hasMore).toBe(true);
    });

    it("should handle different locales", async () => {
      // Arrange
      const locales = ["en", "es", "fr", "de", "ja", "zh"];
      const mockResponse: SearchResponse = {
        receipts: [],
        items: [],
        categories: [],
        totalResults: 0,
        hasMore: false,
      };

      mockApiWithTimeout.fast.get.mockResolvedValue({ data: mockResponse });

      // Act & Assert
      for (const locale of locales) {
        const searchRequest: SearchRequest = {
          query: "test",
          locale,
          limit: 10,
        };

        await service.search(searchRequest);

        expect(mockApiWithTimeout.fast.get).toHaveBeenCalledWith("/search", {
          params: {
            query: "test",
            locale,
            limit: 10,
          },
        });

        vi.clearAllMocks();
        mockApiWithTimeout.fast.get.mockResolvedValue({ data: mockResponse });
      }
    });

    it("should handle different limit values", async () => {
      // Arrange
      const limits = [1, 5, 10, 25, 50, 100];
      const mockResponse: SearchResponse = {
        receipts: [],
        items: [],
        categories: [],
        totalResults: 0,
        hasMore: false,
      };

      mockApiWithTimeout.fast.get.mockResolvedValue({ data: mockResponse });

      // Act & Assert
      for (const limit of limits) {
        const searchRequest: SearchRequest = {
          query: "test",
          limit,
        };

        await service.search(searchRequest);

        expect(mockApiWithTimeout.fast.get).toHaveBeenCalledWith("/search", {
          params: {
            query: "test",
            locale: undefined,
            limit,
          },
        });

        vi.clearAllMocks();
        mockApiWithTimeout.fast.get.mockResolvedValue({ data: mockResponse });
      }
    });

    it("should handle special characters in search query", async () => {
      // Arrange
      const specialQueries = [
        "café & restaurant",
        "日本料理",
        "price: $10-$20",
        'items with "quotes"',
        "search/with/slashes",
        "query with % symbols",
        "items & more",
      ];

      const mockResponse: SearchResponse = {
        receipts: [],
        items: [],
        categories: [],
        totalResults: 0,
        hasMore: false,
      };

      mockApiWithTimeout.fast.get.mockResolvedValue({ data: mockResponse });

      // Act & Assert
      for (const query of specialQueries) {
        const searchRequest: SearchRequest = { query };

        await service.search(searchRequest);

        expect(mockApiWithTimeout.fast.get).toHaveBeenCalledWith("/search", {
          params: {
            query,
            locale: undefined,
            limit: undefined,
          },
        });

        vi.clearAllMocks();
        mockApiWithTimeout.fast.get.mockResolvedValue({ data: mockResponse });
      }
    });

    it("should handle API errors and log them", async () => {
      // Arrange
      const searchRequest: SearchRequest = {
        query: "failing query",
        locale: "en",
        limit: 10,
      };

      const mockError = new Error("API request failed");
      mockApiWithTimeout.fast.get.mockRejectedValue(mockError);

      // Act & Assert
      await expect(service.search(searchRequest)).rejects.toThrow(
        "Failed to perform search",
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        "Search failed:",
        mockError,
      );
      expect(mockApiWithTimeout.fast.get).toHaveBeenCalledTimes(1);
    });

    it("should handle network timeout errors", async () => {
      // Arrange
      const searchRequest: SearchRequest = {
        query: "timeout test",
        locale: "en",
      };

      const timeoutError = new Error("Timeout");
      Object.assign(timeoutError, { code: "ECONNABORTED" });
      mockApiWithTimeout.fast.get.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(service.search(searchRequest)).rejects.toThrow(
        "Failed to perform search",
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        "Search failed:",
        timeoutError,
      );
    });

    it("should handle server errors with different status codes", async () => {
      // Arrange
      const searchRequest: SearchRequest = { query: "test" };
      const serverErrors = [
        { status: 400, message: "Bad Request" },
        { status: 401, message: "Unauthorized" },
        { status: 403, message: "Forbidden" },
        { status: 404, message: "Not Found" },
        { status: 500, message: "Internal Server Error" },
      ];

      for (const error of serverErrors) {
        const apiError = new Error(error.message);
        Object.assign(apiError, { response: { status: error.status } });
        mockApiWithTimeout.fast.get.mockRejectedValue(apiError);

        // Act & Assert
        await expect(service.search(searchRequest)).rejects.toThrow(
          "Failed to perform search",
        );
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Search failed:",
          apiError,
        );

        vi.clearAllMocks();
      }
    });
  });

  describe("searchPost (POST method)", () => {
    it("should perform POST search with full request body", async () => {
      // Arrange
      const searchRequest: SearchRequest = {
        query: "complex search",
        locale: "en",
        limit: 15,
      };

      const mockResponse: SearchResponse = {
        receipts: [
          {
            id: "1",
            storeName: "Target",
            totalAmount: 25.99,
            date: "2024-01-20",
            items: ["Item 1", "Item 2"],
          },
        ],
        items: [
          {
            id: "1",
            name: "Search Item",
            category: "General",
            avgPrice: 9.99,
          },
        ],
        categories: [
          {
            id: 1,
            name: "General",
            key: "general",
          },
        ],
        totalResults: 3,
        hasMore: false,
      };

      mockApiWithTimeout.fast.post.mockResolvedValue({
        data: mockResponse,
      });

      // Act
      const result = await service.searchPost(searchRequest);

      // Assert
      expect(mockApiWithTimeout.fast.post).toHaveBeenCalledTimes(1);
      expect(mockApiWithTimeout.fast.post).toHaveBeenCalledWith(
        "/search",
        searchRequest,
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle POST search with minimal request", async () => {
      // Arrange
      const searchRequest: SearchRequest = {
        query: "minimal",
      };

      const mockResponse: SearchResponse = {
        receipts: [],
        items: [],
        categories: [],
        totalResults: 0,
        hasMore: false,
      };

      mockApiWithTimeout.fast.post.mockResolvedValue({
        data: mockResponse,
      });

      // Act
      const result = await service.searchPost(searchRequest);

      // Assert
      expect(mockApiWithTimeout.fast.post).toHaveBeenCalledWith(
        "/search",
        searchRequest,
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle POST search errors and log them", async () => {
      // Arrange
      const searchRequest: SearchRequest = {
        query: "failing POST query",
        locale: "fr",
        limit: 20,
      };

      const mockError = new Error("POST request failed");
      mockApiWithTimeout.fast.post.mockRejectedValue(mockError);

      // Act & Assert
      await expect(service.searchPost(searchRequest)).rejects.toThrow(
        "Failed to perform search",
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        "Search POST failed:",
        mockError,
      );
      expect(mockApiWithTimeout.fast.post).toHaveBeenCalledTimes(1);
    });

    it("should handle large POST request bodies", async () => {
      // Arrange
      const largeSearchRequest: SearchRequest = {
        query: "a".repeat(1000), // Very long query
        locale: "en",
        limit: 100,
      };

      const mockResponse: SearchResponse = {
        receipts: [],
        items: [],
        categories: [],
        totalResults: 0,
        hasMore: false,
      };

      mockApiWithTimeout.fast.post.mockResolvedValue({ data: mockResponse });

      // Act
      const result = await service.searchPost(largeSearchRequest);

      // Assert
      expect(mockApiWithTimeout.fast.post).toHaveBeenCalledWith(
        "/search",
        largeSearchRequest,
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle POST network errors", async () => {
      // Arrange
      const searchRequest: SearchRequest = { query: "network error test" };
      const networkError = new Error("Network Error");
      mockApiWithTimeout.fast.post.mockRejectedValue(networkError);

      // Act & Assert
      await expect(service.searchPost(searchRequest)).rejects.toThrow(
        "Failed to perform search",
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        "Search POST failed:",
        networkError,
      );
    });
  });

  describe("service integration", () => {
    it("should work with both GET and POST methods for same query", async () => {
      // Arrange
      const searchRequest: SearchRequest = {
        query: "integration test",
        locale: "en",
        limit: 10,
      };

      const mockResponse: SearchResponse = {
        receipts: [],
        items: [],
        categories: [],
        totalResults: 0,
        hasMore: false,
      };

      mockApiWithTimeout.fast.get.mockResolvedValue({ data: mockResponse });
      mockApiWithTimeout.fast.post.mockResolvedValue({ data: mockResponse });

      // Act
      const getResult = await service.search(searchRequest);
      const postResult = await service.searchPost(searchRequest);

      // Assert
      expect(getResult).toEqual(mockResponse);
      expect(postResult).toEqual(mockResponse);
      expect(mockApiWithTimeout.fast.get).toHaveBeenCalledTimes(1);
      expect(mockApiWithTimeout.fast.post).toHaveBeenCalledTimes(1);
    });

    it("should handle concurrent search requests", async () => {
      // Arrange
      const searchRequests: SearchRequest[] = [
        { query: "coffee", locale: "en", limit: 5 },
        { query: "tea", locale: "es", limit: 10 },
        { query: "food", locale: "fr", limit: 15 },
      ];

      const mockResponse: SearchResponse = {
        receipts: [],
        items: [],
        categories: [],
        totalResults: 0,
        hasMore: false,
      };

      mockApiWithTimeout.fast.get.mockResolvedValue({ data: mockResponse });

      // Act
      const promises = searchRequests.map((request) => service.search(request));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toEqual(mockResponse);
      });
      expect(mockApiWithTimeout.fast.get).toHaveBeenCalledTimes(3);
    });

    it("should handle mixed successful and failed requests", async () => {
      // Arrange
      const successRequest: SearchRequest = { query: "success" };
      const failRequest: SearchRequest = { query: "fail" };

      const mockResponse: SearchResponse = {
        receipts: [],
        items: [],
        categories: [],
        totalResults: 0,
        hasMore: false,
      };

      mockApiWithTimeout.fast.get
        .mockResolvedValueOnce({ data: mockResponse })
        .mockRejectedValueOnce(new Error("Request failed"));

      // Act & Assert
      const successResult = await service.search(successRequest);
      expect(successResult).toEqual(mockResponse);

      await expect(service.search(failRequest)).rejects.toThrow(
        "Failed to perform search",
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        "Search failed:",
        expect.any(Error),
      );
    });
  });

  describe("singleton instance", () => {
    it("should export a singleton instance", () => {
      expect(searchService).toBeInstanceOf(SearchService);
      expect(searchService).toBe(searchService); // Should be same instance
    });

    it("should have all required methods", () => {
      const methods = ["search", "searchPost"];

      for (const method of methods) {
        expect(searchService).toHaveProperty(method);
        expect(typeof (searchService as any)[method]).toBe("function");
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty query strings", async () => {
      // Arrange
      const searchRequest: SearchRequest = { query: "" };
      const mockResponse: SearchResponse = {
        receipts: [],
        items: [],
        categories: [],
        totalResults: 0,
        hasMore: false,
      };

      mockApiWithTimeout.fast.get.mockResolvedValue({ data: mockResponse });

      // Act
      const result = await service.search(searchRequest);

      // Assert
      expect(mockApiWithTimeout.fast.get).toHaveBeenCalledWith("/search", {
        params: {
          query: "",
          locale: undefined,
          limit: undefined,
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it("should handle null/undefined values in request", async () => {
      // Arrange
      const searchRequest: SearchRequest = {
        query: "test",
        locale: null as any,
        limit: undefined,
      };

      const mockResponse: SearchResponse = {
        receipts: [],
        items: [],
        categories: [],
        totalResults: 0,
        hasMore: false,
      };

      mockApiWithTimeout.fast.get.mockResolvedValue({ data: mockResponse });

      // Act
      const result = await service.search(searchRequest);

      // Assert
      expect(mockApiWithTimeout.fast.get).toHaveBeenCalledWith("/search", {
        params: {
          query: "test",
          locale: null,
          limit: undefined,
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it("should handle zero and negative limits", async () => {
      // Arrange
      const requests = [
        { query: "test", limit: 0 },
        { query: "test", limit: -1 },
        { query: "test", limit: -100 },
      ];

      const mockResponse: SearchResponse = {
        receipts: [],
        items: [],
        categories: [],
        totalResults: 0,
        hasMore: false,
      };

      mockApiWithTimeout.fast.get.mockResolvedValue({ data: mockResponse });

      // Act & Assert
      for (const request of requests) {
        await service.search(request);
        expect(mockApiWithTimeout.fast.get).toHaveBeenCalledWith("/search", {
          params: {
            query: "test",
            locale: undefined,
            limit: request.limit,
          },
        });

        vi.clearAllMocks();
        mockApiWithTimeout.fast.get.mockResolvedValue({ data: mockResponse });
      }
    });

    it("should handle very large limit values", async () => {
      // Arrange
      const searchRequest: SearchRequest = {
        query: "test",
        limit: Number.MAX_SAFE_INTEGER,
      };

      const mockResponse: SearchResponse = {
        receipts: [],
        items: [],
        categories: [],
        totalResults: 0,
        hasMore: false,
      };

      mockApiWithTimeout.fast.get.mockResolvedValue({ data: mockResponse });

      // Act
      const result = await service.search(searchRequest);

      // Assert
      expect(mockApiWithTimeout.fast.get).toHaveBeenCalledWith("/search", {
        params: {
          query: "test",
          locale: undefined,
          limit: Number.MAX_SAFE_INTEGER,
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it("should handle malformed API responses", async () => {
      // Arrange
      const searchRequest: SearchRequest = { query: "test" };

      // Test different malformed responses
      const malformedResponses = [
        { data: null },
        { data: undefined },
        { data: "invalid response" },
        { data: { invalid: "structure" } },
        { data: [] },
      ];

      for (const response of malformedResponses) {
        mockApiWithTimeout.fast.get.mockResolvedValue(response);

        // Act
        const result = await service.search(searchRequest);

        // Assert
        expect(result).toBe(response.data);

        vi.clearAllMocks();
      }
    });

    it("should handle API responses without data property", async () => {
      // Arrange
      const searchRequest: SearchRequest = { query: "test" };
      mockApiWithTimeout.fast.get.mockResolvedValue({
        status: 200,
        statusText: "OK",
        // No data property
      });

      // Act
      const result = await service.search(searchRequest);

      // Assert
      expect(result).toBeUndefined();
    });

    it("should preserve error context in error messages", async () => {
      // Arrange
      const searchRequest: SearchRequest = { query: "error test" };
      const originalError = new Error("Original error message");
      Object.assign(originalError, {
        response: {
          status: 404,
          data: { message: "Not found" },
        },
      });

      mockApiWithTimeout.fast.get.mockRejectedValue(originalError);

      // Act & Assert
      await expect(service.search(searchRequest)).rejects.toThrow(
        "Failed to perform search",
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        "Search failed:",
        originalError,
      );
    });
  });
});
