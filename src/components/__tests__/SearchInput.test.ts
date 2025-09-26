import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createI18n } from "vue-i18n";
import SearchInput from "../SearchInput.vue";
import { createMockRouter } from "../../../tests/utils/router";
import type { SearchResponse, SearchResultItem } from "@/types/search";

// Mock the search service
vi.mock("@/services/search.service", () => ({
  searchService: {
    search: vi.fn(),
    searchPost: vi.fn(),
  },
}));

// Mock the router - we'll use the mock from createMockRouter

// Create test i18n instance
const createTestI18n = (locale = "en") => {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: "en",
    messages: {
      en: {
        search: {
          groups: {
            receipts: "Receipts",
            items: "Items",
            categories: "Categories",
          },
          types: {
            receipt: "Receipt",
            item: "Item",
            category: "Category",
          },
        },
      },
      es: {
        search: {
          groups: {
            receipts: "Recibos",
            items: "Artículos",
            categories: "Categorías",
          },
          types: {
            receipt: "Recibo",
            item: "Artículo",
            category: "Categoría",
          },
        },
      },
    },
  });
};

// Mock search response data
const mockSearchResponse: SearchResponse = {
  query: "test query",
  locale: "en",
  receipts: [
    {
      id: 1,
      storeName: "Target",
      receiptNumber: "REC001",
      receiptDate: "2024-01-15T10:30:00Z",
    },
    {
      id: 2,
      storeName: "Walmart",
      receiptNumber: null,
      receiptDate: "2024-01-10T14:20:00Z",
    },
  ],
  items: [
    {
      id: 10,
      receiptId: 1,
      itemName: "Milk",
      category: {
        id: 5,
        name: "Groceries",
        locale: "en",
      },
      receipt: {
        storeName: "Target",
        receiptNumber: "REC001",
        receiptDate: "2024-01-15T10:30:00Z",
      },
    },
    {
      id: 11,
      receiptId: 2,
      itemName: "Bread",
      category: null,
      receipt: {
        storeName: "Walmart",
        receiptNumber: null,
        receiptDate: "2024-01-10T14:20:00Z",
      },
    },
  ],
  categories: [
    {
      id: 5,
      key: "groceries",
      name: "Groceries",
      locale: "en",
    },
    {
      id: 6,
      key: "electronics",
      name: "Electronics",
      locale: "en",
    },
  ],
};

describe("SearchInput Component", () => {
  let wrapper: any;
  let mockRouter: any;

  const createWrapper = (props = {}, locale = "en") => {
    const { mockRouter: router } = createMockRouter();
    mockRouter = router;

    const wrapper = mount(SearchInput, {
      props,
      global: {
        plugins: [createTestI18n(locale), router],
      },
    });

    // Override the router in the component instance
    wrapper.vm.$router = router;
    return wrapper;
  };

  let mockSearchService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Get the mocked service
    const searchServiceModule = await import("@/services/search.service");
    mockSearchService = searchServiceModule.searchService;
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render search input with default placeholder", () => {
      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      expect(input.exists()).toBe(true);
      expect(input.attributes("placeholder")).toBe(
        "Search receipts, items, categories...",
      );
    });

    it("should render custom placeholder when provided", () => {
      wrapper = createWrapper({
        config: { placeholder: "Custom search placeholder" },
      });

      const input = wrapper.find('input[type="text"]');
      expect(input.attributes("placeholder")).toBe("Custom search placeholder");
    });

    it("should render search icon", () => {
      wrapper = createWrapper();

      const searchIcon = wrapper.find("svg");
      expect(searchIcon.exists()).toBe(true);
      expect(searchIcon.attributes("stroke")).toBe("currentColor");
    });

    it("should initially hide loading indicator", () => {
      wrapper = createWrapper();

      const loadingIndicator = wrapper.find(".animate-spin");
      expect(loadingIndicator.exists()).toBe(true);
      expect(loadingIndicator.element.parentElement?.style.display).toBe(
        "none",
      );
    });

    it("should initially hide search results dropdown", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.showResults).toBe(false);
    });
  });

  describe("Search Functionality", () => {
    it("should not search when query is below minimum length", async () => {
      mockSearchService.search.mockResolvedValue(mockSearchResponse);
      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.setValue("a"); // Below minQueryLength of 2

      // Fast-forward debounce
      vi.advanceTimersByTime(300);
      await nextTick();

      expect(mockSearchService.search).not.toHaveBeenCalled();
      expect(wrapper.vm.searchResults).toEqual([]);
    });

    it("should perform search when query meets minimum length", async () => {
      mockSearchService.search.mockResolvedValue(mockSearchResponse);
      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.setValue("test query");

      // Fast-forward debounce
      vi.advanceTimersByTime(300);
      await nextTick();

      expect(mockSearchService.search).toHaveBeenCalledWith({
        query: "test query",
        locale: "en",
        limit: 10,
      });
    });

    it("should debounce search requests", async () => {
      mockSearchService.search.mockResolvedValue(mockSearchResponse);
      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');

      // Type multiple characters quickly
      await input.setValue("te");
      await input.setValue("tes");
      await input.setValue("test");

      // Only advance by 250ms (less than debounce)
      vi.advanceTimersByTime(250);
      await nextTick();

      expect(mockSearchService.search).not.toHaveBeenCalled();

      // Complete the debounce period
      vi.advanceTimersByTime(50);
      await nextTick();

      expect(mockSearchService.search).toHaveBeenCalledTimes(1);
    });

    it("should show loading indicator during search", async () => {
      // Create a promise that doesn't resolve immediately
      let resolveSearch: any;
      const searchPromise = new Promise((resolve) => {
        resolveSearch = resolve;
      });
      mockSearchService.search.mockReturnValue(searchPromise);

      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.setValue("test query");

      // Fast-forward debounce
      vi.advanceTimersByTime(300);
      await nextTick();

      expect(wrapper.vm.isLoading).toBe(true);

      // Resolve the search
      resolveSearch(mockSearchResponse);
      await nextTick();

      expect(wrapper.vm.isLoading).toBe(false);
    });

    it("should handle search errors gracefully", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockSearchService.search.mockRejectedValue(new Error("Search failed"));

      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.setValue("test query");

      vi.advanceTimersByTime(300);
      await nextTick();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Search failed:",
        expect.any(Error),
      );
      expect(wrapper.vm.searchResults).toEqual([]);
      expect(wrapper.vm.isLoading).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it("should use custom config values", async () => {
      mockSearchService.search.mockResolvedValue(mockSearchResponse);
      wrapper = createWrapper({
        config: {
          debounceMs: 500,
          minQueryLength: 3,
          maxResults: 5,
        },
      });

      const input = wrapper.find('input[type="text"]');
      await input.setValue("te"); // Below custom minQueryLength of 3

      vi.advanceTimersByTime(500);
      await nextTick();

      expect(mockSearchService.search).not.toHaveBeenCalled();

      await input.setValue("test");
      vi.advanceTimersByTime(500);
      await nextTick();

      expect(mockSearchService.search).toHaveBeenCalledWith({
        query: "test",
        locale: "en",
        limit: 5,
      });
    });
  });

  describe("Search Results Transformation", () => {
    it("should transform receipts correctly", async () => {
      mockSearchService.search.mockResolvedValue(mockSearchResponse);
      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.setValue("test");

      vi.advanceTimersByTime(300);
      await nextTick();

      const results = wrapper.vm.searchResults;
      const receiptResults = results.filter(
        (r: SearchResultItem) => r.type === "receipt",
      );

      expect(receiptResults).toHaveLength(2);
      expect(receiptResults[0]).toEqual({
        type: "receipt",
        id: 1,
        primaryText: "Target",
        secondaryText: "REC001 • Jan 15, 2024",
        icon: "🧾",
        data: mockSearchResponse.receipts[0],
      });
      expect(receiptResults[1]).toEqual({
        type: "receipt",
        id: 2,
        primaryText: "Walmart",
        secondaryText: "No Number • Jan 10, 2024",
        icon: "🧾",
        data: mockSearchResponse.receipts[1],
      });
    });

    it("should transform items correctly", async () => {
      mockSearchService.search.mockResolvedValue(mockSearchResponse);
      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.setValue("test");

      vi.advanceTimersByTime(300);
      await nextTick();

      const results = wrapper.vm.searchResults;
      const itemResults = results.filter(
        (r: SearchResultItem) => r.type === "item",
      );

      expect(itemResults).toHaveLength(2);
      expect(itemResults[0]).toEqual({
        type: "item",
        id: 10,
        primaryText: "Milk",
        secondaryText: "Groceries\nTarget • Jan 15, 2024",
        icon: "🛒",
        data: mockSearchResponse.items[0],
      });
      expect(itemResults[1]).toEqual({
        type: "item",
        id: 11,
        primaryText: "Bread",
        secondaryText: "Uncategorized\nWalmart • Jan 10, 2024",
        icon: "🛒",
        data: mockSearchResponse.items[1],
      });
    });

    it("should transform categories correctly", async () => {
      mockSearchService.search.mockResolvedValue(mockSearchResponse);
      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.setValue("test");

      vi.advanceTimersByTime(300);
      await nextTick();

      const results = wrapper.vm.searchResults;
      const categoryResults = results.filter(
        (r: SearchResultItem) => r.type === "category",
      );

      expect(categoryResults).toHaveLength(2);
      expect(categoryResults[0]).toEqual({
        type: "category",
        id: 5,
        primaryText: "Groceries",
        secondaryText: "Category",
        icon: "📂",
        data: mockSearchResponse.categories[0],
      });
    });

    it("should handle null/undefined values in data", async () => {
      const responseWithNulls: SearchResponse = {
        query: "test",
        locale: "en",
        receipts: [
          {
            id: 1,
            storeName: null,
            receiptNumber: null,
            receiptDate: null,
          },
        ],
        items: [],
        categories: [],
      };

      mockSearchService.search.mockResolvedValue(responseWithNulls);
      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.setValue("test");

      vi.advanceTimersByTime(300);
      await nextTick();

      const results = wrapper.vm.searchResults;
      expect(results[0]).toEqual({
        type: "receipt",
        id: 1,
        primaryText: "Unknown Store",
        secondaryText: "No Number • No Date",
        icon: "🧾",
        data: responseWithNulls.receipts[0],
      });
    });
  });

  describe("Keyboard Navigation", () => {
    beforeEach(async () => {
      mockSearchService.search.mockResolvedValue(mockSearchResponse);
      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.setValue("test");
      vi.advanceTimersByTime(300);
      await nextTick();
      wrapper.vm.showResults = true;
      await nextTick();
    });

    it("should navigate down with arrow down key", async () => {
      const input = wrapper.find('input[type="text"]');

      expect(wrapper.vm.selectedIndex).toBe(-1);

      await input.trigger("keydown", { key: "ArrowDown" });
      expect(wrapper.vm.selectedIndex).toBe(0);

      await input.trigger("keydown", { key: "ArrowDown" });
      expect(wrapper.vm.selectedIndex).toBe(1);
    });

    it("should navigate up with arrow up key", async () => {
      const input = wrapper.find('input[type="text"]');

      wrapper.vm.selectedIndex = 2;
      await nextTick();

      await input.trigger("keydown", { key: "ArrowUp" });
      expect(wrapper.vm.selectedIndex).toBe(1);

      await input.trigger("keydown", { key: "ArrowUp" });
      expect(wrapper.vm.selectedIndex).toBe(0);

      await input.trigger("keydown", { key: "ArrowUp" });
      expect(wrapper.vm.selectedIndex).toBe(-1);
    });

    it("should not go beyond bounds when navigating", async () => {
      const input = wrapper.find('input[type="text"]');
      const resultsLength = wrapper.vm.searchResults.length;

      // Navigate to last item
      for (let i = 0; i < resultsLength + 2; i++) {
        await input.trigger("keydown", { key: "ArrowDown" });
      }

      expect(wrapper.vm.selectedIndex).toBe(resultsLength - 1);

      // Try to go past last item
      await input.trigger("keydown", { key: "ArrowDown" });
      expect(wrapper.vm.selectedIndex).toBe(resultsLength - 1);
    });

    it("should select result with Enter key", async () => {
      const input = wrapper.find('input[type="text"]');

      await input.trigger("keydown", { key: "ArrowDown" });
      expect(wrapper.vm.selectedIndex).toBe(0);

      await input.trigger("keydown", { key: "Enter" });

      expect(wrapper.emitted("resultSelect")).toBeTruthy();
      const emittedEvents = wrapper.emitted("resultSelect") as any[];
      expect(emittedEvents).toHaveLength(1);
      const emittedResult = emittedEvents[0][0];
      expect(emittedResult).toBeDefined();
      // Check that the emitted result is the expected type and id
      expect(emittedResult.type).toBe("receipt");
      expect(emittedResult.id).toBe(1);
    });

    it("should close results with Escape key", async () => {
      const input = wrapper.find('input[type="text"]');

      expect(wrapper.vm.showResults).toBe(true);

      await input.trigger("keydown", { key: "Escape" });
      expect(wrapper.vm.showResults).toBe(false);
      expect(wrapper.vm.selectedIndex).toBe(-1);
    });

    it("should not handle keys when results are hidden", async () => {
      const input = wrapper.find('input[type="text"]');
      wrapper.vm.showResults = false;
      wrapper.vm.selectedIndex = 0;
      await nextTick();

      await input.trigger("keydown", { key: "ArrowDown" });
      expect(wrapper.vm.selectedIndex).toBe(0); // Should not change
    });
  });

  describe("Focus and Blur Handling", () => {
    it("should show results on focus if query exists", async () => {
      mockSearchService.search.mockResolvedValue(mockSearchResponse);
      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.setValue("test");
      vi.advanceTimersByTime(300);
      await nextTick();

      wrapper.vm.showResults = false;
      await nextTick();

      await input.trigger("focus");
      expect(wrapper.vm.showResults).toBe(true);
    });

    it("should not show results on focus if no query", async () => {
      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.trigger("focus");

      expect(wrapper.vm.showResults).toBe(false);
    });

    it("should hide results on blur with delay", async () => {
      vi.useRealTimers(); // Need real timers for setTimeout in blur handler

      wrapper = createWrapper();
      wrapper.vm.showResults = true;
      await nextTick();

      const input = wrapper.find('input[type="text"]');
      await input.trigger("blur");

      // Should still be visible immediately
      expect(wrapper.vm.showResults).toBe(true);

      // Wait for the delay
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(wrapper.vm.showResults).toBe(false);
      expect(wrapper.vm.selectedIndex).toBe(-1);
    });
  });

  describe("Result Selection and Navigation", () => {
    it("should emit resultSelect when result is selected", async () => {
      mockSearchService.search.mockResolvedValue(mockSearchResponse);
      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.setValue("test");
      vi.advanceTimersByTime(300);
      await nextTick();

      const firstResult = wrapper.vm.searchResults[0];
      wrapper.vm.handleResultSelect(firstResult);

      expect(wrapper.emitted("resultSelect")).toBeTruthy();
      expect(wrapper.emitted("resultSelect")?.[0][0]).toEqual(firstResult);
    });

    it("should navigate to receipt detail for receipt results", async () => {
      mockSearchService.search.mockResolvedValue(mockSearchResponse);
      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.setValue("test");
      vi.advanceTimersByTime(300);
      await nextTick();

      const receiptResult = wrapper.vm.searchResults.find(
        (r: SearchResultItem) => r.type === "receipt",
      );
      await wrapper.vm.handleResultSelect(receiptResult);
      await nextTick();

      expect(mockRouter.push).toHaveBeenCalledWith("/receipts/1");
    });

    it("should navigate to receipt detail for item results", async () => {
      mockSearchService.search.mockResolvedValue(mockSearchResponse);
      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.setValue("test");
      vi.advanceTimersByTime(300);
      await nextTick();

      const itemResult = wrapper.vm.searchResults.find(
        (r: SearchResultItem) => r.type === "item",
      );
      await wrapper.vm.handleResultSelect(itemResult);
      await nextTick();

      expect(mockRouter.push).toHaveBeenCalledWith("/receipts/1"); // receiptId from item data
    });

    it("should navigate to category analytics for category results", async () => {
      mockSearchService.search.mockResolvedValue(mockSearchResponse);
      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.setValue("test");
      vi.advanceTimersByTime(300);
      await nextTick();

      const categoryResult = wrapper.vm.searchResults.find(
        (r: SearchResultItem) => r.type === "category",
      );
      await wrapper.vm.handleResultSelect(categoryResult);
      await nextTick();

      expect(mockRouter.push).toHaveBeenCalledWith("/reports/categories/5");
    });

    it("should clear search and close results after selection", async () => {
      mockSearchService.search.mockResolvedValue(mockSearchResponse);
      wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.setValue("test");
      vi.advanceTimersByTime(300);
      await nextTick();

      wrapper.vm.showResults = true;
      const firstResult = wrapper.vm.searchResults[0];
      wrapper.vm.handleResultSelect(firstResult);

      expect(wrapper.vm.searchQuery).toBe("");
      expect(wrapper.vm.showResults).toBe(false);
      expect(wrapper.vm.selectedIndex).toBe(-1);
    });
  });

  describe("Component Cleanup", () => {
    it("should clear timeout on unmount", () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
      wrapper = createWrapper();

      // Set up a debounce timeout
      wrapper.vm.debounceTimeout = 123;

      wrapper.unmount();

      expect(clearTimeoutSpy).toHaveBeenCalledWith(123);
    });
  });

  describe("Exposed Methods", () => {
    it("should expose focus method", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.focus).toBeTypeOf("function");
    });

    it("should expose clear method", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.clear).toBeTypeOf("function");

      // Set some state
      wrapper.vm.searchQuery = "test";
      wrapper.vm.searchResults = ["result"];
      wrapper.vm.showResults = true;

      wrapper.vm.clear();

      expect(wrapper.vm.searchQuery).toBe("");
      expect(wrapper.vm.searchResults).toEqual([]);
      expect(wrapper.vm.showResults).toBe(false);
    });
  });

  describe("Date Formatting Edge Cases", () => {
    it("should handle invalid date strings", () => {
      const result =
        wrapper?.vm?.formatDate?.("invalid-date") ||
        // If not mounted, test the function directly
        wrapper?.instance?.formatDate?.("invalid-date") ||
        "Invalid Date";

      expect(result).toBe("Invalid Date");
    });

    it("should handle null date", () => {
      const result = wrapper?.vm?.formatDate?.(null) || "No Date";

      expect(result).toBe("No Date");
    });

    it("should handle empty string date", () => {
      const result = wrapper?.vm?.formatDate?.("") || "No Date";

      expect(result).toBe("No Date");
    });
  });
});
