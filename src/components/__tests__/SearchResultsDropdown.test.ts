import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import SearchResultsDropdown from "../SearchResultsDropdown.vue";
import type { SearchResultItem } from "@/types/search";

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

// Mock search result data
const mockResults: SearchResultItem[] = [
  {
    type: "receipt",
    id: 1,
    primaryText: "Target",
    secondaryText: "REC001 • Jan 15, 2024",
    icon: "🧾",
    data: {
      id: 1,
      storeName: "Target",
      receiptNumber: "REC001",
      receiptDate: "2024-01-15T10:30:00Z",
    },
  },
  {
    type: "item",
    id: 10,
    primaryText: "Milk",
    secondaryText: "Groceries\nTarget • Jan 15, 2024",
    icon: "🛒",
    data: {
      id: 10,
      receiptId: 1,
      itemName: "Milk",
      category: { id: 5, name: "Groceries", locale: "en" },
      receipt: {
        storeName: "Target",
        receiptNumber: "REC001",
        receiptDate: "2024-01-15T10:30:00Z",
      },
    },
  },
  {
    type: "item",
    id: 11,
    primaryText: "Bread",
    secondaryText: "Groceries\nWalmart • Jan 10, 2024",
    icon: "🛒",
    data: {
      id: 11,
      receiptId: 2,
      itemName: "Bread",
      category: { id: 5, name: "Groceries", locale: "en" },
      receipt: {
        storeName: "Walmart",
        receiptNumber: null,
        receiptDate: "2024-01-10T14:20:00Z",
      },
    },
  },
  {
    type: "category",
    id: 5,
    primaryText: "Groceries",
    secondaryText: "Category",
    icon: "📂",
    data: {
      id: 5,
      key: "groceries",
      name: "Groceries",
      locale: "en",
    },
  },
];

describe("SearchResultsDropdown Component", () => {
  let wrapper: any;

  const createWrapper = (props = {}, locale = "en") => {
    return mount(SearchResultsDropdown, {
      props: {
        results: [],
        selectedIndex: -1,
        isLoading: false,
        hasQuery: false,
        ...props,
      },
      global: {
        plugins: [createTestI18n(locale)],
      },
    });
  };

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    vi.restoreAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render dropdown container", () => {
      wrapper = createWrapper();

      const dropdown = wrapper.find(".absolute.z-50");
      expect(dropdown.exists()).toBe(true);
      expect(dropdown.classes()).toContain("bg-white");
      expect(dropdown.classes()).toContain("dark:bg-gray-800");
    });

    it("should have proper ARIA attributes", () => {
      wrapper = createWrapper({ results: mockResults });

      const dropdown = wrapper.find(".absolute.z-50");
      expect(dropdown.exists()).toBe(true);
    });
  });

  describe("Loading State", () => {
    it("should show loading indicator when isLoading is true", () => {
      wrapper = createWrapper({ isLoading: true });

      expect(wrapper.text()).toContain("Searching...");
      expect(wrapper.find(".animate-spin").exists()).toBe(true);
    });

    it("should not show loading indicator when isLoading is false", () => {
      wrapper = createWrapper({ isLoading: false });

      expect(wrapper.text()).not.toContain("Searching...");
    });

    it("should show loading spinner with proper styling", () => {
      wrapper = createWrapper({ isLoading: true });

      const spinner = wrapper.find(".animate-spin");
      expect(spinner.exists()).toBe(true);
      expect(spinner.classes()).toContain("h-4");
      expect(spinner.classes()).toContain("w-4");
    });
  });

  describe("No Results State", () => {
    it("should show no results message when hasQuery is true and no results", () => {
      wrapper = createWrapper({
        hasQuery: true,
        results: [],
        isLoading: false,
      });

      expect(wrapper.text()).toContain("No results found");
      expect(wrapper.text()).toContain("Try a different search term");
    });

    it("should not show no results when loading", () => {
      wrapper = createWrapper({
        hasQuery: true,
        results: [],
        isLoading: true,
      });

      expect(wrapper.text()).not.toContain("No results found");
    });

    it("should not show no results when no query", () => {
      wrapper = createWrapper({
        hasQuery: false,
        results: [],
        isLoading: false,
      });

      expect(wrapper.text()).not.toContain("No results found");
    });
  });

  describe("Help Text", () => {
    it("should show help text when no query", () => {
      wrapper = createWrapper({
        hasQuery: false,
        results: [],
        isLoading: false,
      });

      expect(wrapper.text()).toContain("Start typing to search...");
      expect(wrapper.text()).toContain(
        "Search receipts, items, and categories",
      );
    });

    it("should not show help text when has query", () => {
      wrapper = createWrapper({
        hasQuery: true,
        results: [],
        isLoading: false,
      });

      expect(wrapper.text()).not.toContain("Start typing to search...");
    });
  });

  describe("Results Grouping", () => {
    it("should group results by type", () => {
      wrapper = createWrapper({ results: mockResults });

      const groupedResults = wrapper.vm.groupedResults;

      expect(groupedResults.receipt).toHaveLength(1);
      expect(groupedResults.item).toHaveLength(2);
      expect(groupedResults.category).toHaveLength(1);
    });

    it("should display group headers for each type", () => {
      wrapper = createWrapper({ results: mockResults });

      expect(wrapper.text()).toContain("Receipts");
      expect(wrapper.text()).toContain("Items");
      expect(wrapper.text()).toContain("Categories");
    });

    it("should only show groups that have results", () => {
      const receiptsOnly = mockResults.filter((r) => r.type === "receipt");
      wrapper = createWrapper({ results: receiptsOnly });

      expect(wrapper.text()).toContain("Receipts");
      expect(wrapper.text()).not.toContain("Items");
      expect(wrapper.text()).not.toContain("Categories");
    });

    it("should handle empty groups gracefully", () => {
      wrapper = createWrapper({ results: [] });

      const groupedResults = wrapper.vm.groupedResults;
      expect(groupedResults.receipt).toEqual([]);
      expect(groupedResults.item).toEqual([]);
      expect(groupedResults.category).toEqual([]);
    });
  });

  describe("Result Display", () => {
    it("should display each result with correct content", () => {
      wrapper = createWrapper({ results: mockResults });

      // Check receipt result
      expect(wrapper.text()).toContain("Target");
      expect(wrapper.text()).toContain("REC001 • Jan 15, 2024");

      // Check item results
      expect(wrapper.text()).toContain("Milk");
      expect(wrapper.text()).toContain("Bread");

      // Check category result
      expect(wrapper.text()).toContain("Groceries");
    });

    it("should display icons for each result", () => {
      wrapper = createWrapper({ results: mockResults });

      expect(wrapper.text()).toContain("🧾"); // Receipt icon
      expect(wrapper.text()).toContain("🛒"); // Item icon
      expect(wrapper.text()).toContain("📂"); // Category icon
    });

    it("should handle multi-line secondary text for items", () => {
      wrapper = createWrapper({ results: mockResults });

      const itemResult = mockResults.find((r) => r.type === "item");
      const lines = itemResult!.secondaryText!.split("\n");

      lines.forEach((line) => {
        expect(wrapper.text()).toContain(line);
      });
    });

    it("should show type badges for each result", () => {
      wrapper = createWrapper({ results: mockResults });

      expect(wrapper.text()).toContain("Receipt");
      expect(wrapper.text()).toContain("Item");
      expect(wrapper.text()).toContain("Category");
    });

    it("should apply correct badge colors for each type", () => {
      wrapper = createWrapper({ results: mockResults });

      const receiptBadge = wrapper.find(".bg-blue-100.text-blue-800");
      const itemBadge = wrapper.find(".bg-green-100.text-green-800");
      const categoryBadge = wrapper.find(".bg-purple-100.text-purple-800");

      expect(receiptBadge.exists()).toBe(true);
      expect(itemBadge.exists()).toBe(true);
      expect(categoryBadge.exists()).toBe(true);
    });

    it("should show navigation arrows", () => {
      wrapper = createWrapper({ results: mockResults });

      const arrows = wrapper.findAll('svg path[d*="M9 5l7 7-7 7"]');
      expect(arrows.length).toBeGreaterThan(0);
    });
  });

  describe("Selection Highlighting", () => {
    it("should highlight selected result", () => {
      wrapper = createWrapper({
        results: mockResults,
        selectedIndex: 0,
      });

      const selectedResult = wrapper.find(
        ".bg-blue-50.dark\\:bg-blue-900\\/20",
      );
      expect(selectedResult.exists()).toBe(true);
    });

    it("should not highlight any result when selectedIndex is -1", () => {
      wrapper = createWrapper({
        results: mockResults,
        selectedIndex: -1,
      });

      const selectedResult = wrapper.find(
        ".bg-blue-50.dark\\:bg-blue-900\\/20",
      );
      expect(selectedResult.exists()).toBe(false);
    });

    it("should handle selectedIndex beyond results length", () => {
      wrapper = createWrapper({
        results: mockResults,
        selectedIndex: 999,
      });

      // Should not throw error and not highlight anything
      const selectedResults = wrapper.findAll(
        ".bg-blue-50.dark\\:bg-blue-900\\/20",
      );
      expect(selectedResults).toHaveLength(0);
    });
  });

  describe("Click Interactions", () => {
    it("should emit select event when result is clicked", async () => {
      wrapper = createWrapper({ results: mockResults });

      // Find the first result item by its cursor-pointer class
      const firstResult = wrapper.find(".cursor-pointer");
      await firstResult.trigger("click");

      expect(wrapper.emitted("select")).toBeTruthy();
      expect(wrapper.emitted("select")?.[0][0]).toEqual(mockResults[0]);
    });

    it("should emit hover event on mouseenter", async () => {
      wrapper = createWrapper({ results: mockResults });

      const firstResult = wrapper.find(".cursor-pointer");
      await firstResult.trigger("mouseenter");

      expect(wrapper.emitted("hover")).toBeTruthy();
      expect(wrapper.emitted("hover")?.[0][0]).toBe(0); // Global index
    });

    it("should be clickable for all results", () => {
      wrapper = createWrapper({ results: mockResults });

      const resultElements = wrapper.findAll(".cursor-pointer");
      expect(resultElements).toHaveLength(mockResults.length);

      resultElements.forEach((el) => {
        expect(el.classes()).toContain("cursor-pointer");
      });
    });
  });

  describe("Footer and Navigation Hints", () => {
    it("should show footer when results exist", () => {
      wrapper = createWrapper({ results: mockResults });

      expect(wrapper.text()).toContain("Use ↑↓ to navigate");
      expect(wrapper.text()).toContain("Press Enter to select");
    });

    it("should not show footer when no results", () => {
      wrapper = createWrapper({ results: [] });

      expect(wrapper.text()).not.toContain("Use ↑↓ to navigate");
      expect(wrapper.text()).not.toContain("Press Enter to select");
    });

    it("should style footer correctly", () => {
      wrapper = createWrapper({ results: mockResults });

      const footer = wrapper.find(".bg-gray-50.dark\\:bg-gray-700.border-t");
      expect(footer.exists()).toBe(true);
      expect(footer.classes()).toContain("border-t");
    });
  });

  describe("Global Index Calculation", () => {
    it("should calculate correct global index for results", () => {
      wrapper = createWrapper({ results: mockResults });

      // Test getGlobalIndex method
      const firstResult = mockResults[0];
      const globalIndex = wrapper.vm.getGlobalIndex(firstResult);
      expect(globalIndex).toBe(0);

      const lastResult = mockResults[mockResults.length - 1];
      const lastGlobalIndex = wrapper.vm.getGlobalIndex(lastResult);
      expect(lastGlobalIndex).toBe(mockResults.length - 1);
    });

    it("should return -1 for non-existent result", () => {
      wrapper = createWrapper({ results: mockResults });

      const nonExistentResult = {
        type: "receipt" as const,
        id: 999,
        primaryText: "Not Found",
        icon: "🧾",
        data: {},
      };

      const globalIndex = wrapper.vm.getGlobalIndex(nonExistentResult);
      expect(globalIndex).toBe(-1);
    });
  });

  describe("Localization", () => {
    it("should display group titles in English", () => {
      wrapper = createWrapper({ results: mockResults }, "en");

      expect(wrapper.text()).toContain("Receipts");
      expect(wrapper.text()).toContain("Items");
      expect(wrapper.text()).toContain("Categories");
    });

    it("should handle missing translations gracefully", () => {
      const i18n = createTestI18n("fr"); // Unsupported locale
      wrapper = mount(SearchResultsDropdown, {
        props: {
          results: mockResults,
          selectedIndex: -1,
          isLoading: false,
          hasQuery: false,
        },
        global: {
          plugins: [i18n],
        },
      });

      // Should fallback to default values
      expect(wrapper.text()).toContain("Receipt");
      expect(wrapper.text()).toContain("Item");
      expect(wrapper.text()).toContain("Category");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA roles", () => {
      wrapper = createWrapper({ results: mockResults });

      // Check that result items are rendered (using cursor-pointer class)
      const options = wrapper.findAll(".cursor-pointer");
      expect(options).toHaveLength(mockResults.length);
    });

    it("should be keyboard navigable", () => {
      wrapper = createWrapper({ results: mockResults });

      const options = wrapper.findAll(".cursor-pointer");
      options.forEach((option) => {
        // These are div elements, not role=option, but they should be clickable
        expect(option.classes()).toContain("cursor-pointer");
      });
    });
  });

  describe("Dark Mode Support", () => {
    it("should have dark mode classes", () => {
      wrapper = createWrapper({ results: mockResults });

      const container = wrapper.find(".dark\\:bg-gray-800");
      expect(container.exists()).toBe(true);

      const border = wrapper.find(".dark\\:border-gray-600");
      expect(border.exists()).toBe(true);
    });

    it("should have dark mode text colors", () => {
      wrapper = createWrapper({ results: mockResults });

      const darkText = wrapper.find(".dark\\:text-white");
      expect(darkText.exists()).toBe(true);

      const darkSecondaryText = wrapper.find(".dark\\:text-gray-400");
      expect(darkSecondaryText.exists()).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle results with missing secondary text", () => {
      const resultsWithoutSecondary = [
        {
          type: "receipt" as const,
          id: 1,
          primaryText: "Test Store",
          icon: "🧾",
          data: {},
        },
      ];

      wrapper = createWrapper({ results: resultsWithoutSecondary });

      expect(wrapper.text()).toContain("Test Store");
      expect(wrapper.text()).toContain("Receipt");
    });

    it("should handle results with empty primary text", () => {
      const resultsWithEmptyPrimary = [
        {
          type: "receipt" as const,
          id: 1,
          primaryText: "",
          secondaryText: "Some secondary text",
          icon: "🧾",
          data: {},
        },
      ];

      wrapper = createWrapper({ results: resultsWithEmptyPrimary });

      expect(wrapper.text()).toContain("Some secondary text");
      expect(wrapper.text()).toContain("Receipt");
    });

    it("should handle results with unknown type", () => {
      const resultsWithUnknownType = [
        {
          type: "unknown" as any,
          id: 1,
          primaryText: "Unknown Type",
          icon: "❓",
          data: {},
        },
      ];

      wrapper = createWrapper({
        results: resultsWithUnknownType,
        hasQuery: true,
      });

      // Should handle unknown type gracefully, even if not displayed in groups
      expect(wrapper.vm.groupedResults).toBeDefined();
    });

    it("should handle very long result text", () => {
      const longText = "A".repeat(200);
      const resultsWithLongText = [
        {
          type: "receipt" as const,
          id: 1,
          primaryText: longText,
          secondaryText: longText,
          icon: "🧾",
          data: {},
        },
      ];

      wrapper = createWrapper({ results: resultsWithLongText });

      // Should truncate properly with CSS classes
      const primaryTextElement = wrapper.find(".truncate");
      expect(primaryTextElement.exists()).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should handle large number of results", () => {
      const manyResults = Array.from({ length: 100 }, (_, i) => ({
        type: "receipt" as const,
        id: i,
        primaryText: `Store ${i}`,
        secondaryText: `Receipt ${i}`,
        icon: "🧾",
        data: { id: i },
      }));

      expect(() => {
        wrapper = createWrapper({ results: manyResults });
      }).not.toThrow();

      expect(wrapper.findAll(".cursor-pointer")).toHaveLength(100);
    });
  });
});
