import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import PriceTrendsReport from "../PriceTrendsReport.vue";

// Mock vue-i18n
vi.mock("vue-i18n", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
      locale: { value: "en" },
    }),
  };
});

// Create a test i18n instance for global $t
import { createI18n } from "vue-i18n";
const createTestI18n = (locale = "en") => {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: "en",
    messages: {
      en: {
        priceTrends: {
          title: "Price Trends",
          noData: "No price trend data available for the selected period",
          tryDifferentFilters:
            "Try adjusting your filters or selecting a different time period.",
        },
        priceTrendsReport: {
          noDataForPeriod:
            "No price trend data available for the selected period",
          multipleTransactionsNeeded:
            "Items need multiple purchase transactions to show trends",
          averagePrice: "Average Price",
          minPrice: "Min Price",
          maxPrice: "Max Price",
          volatility: "Volatility",
          transactions: "Transactions",
          priceTrendChart: "Price Trend Chart",
          priceHistory: "Price History",
          transactionCount: "{count} transactions",
          chartDateLabel: "Date",
          chartPriceLabel: "Price",
        },
      },
      es: {},
    },
    globalInjection: true,
  });
};

// Mock the SimpleLineChart component
vi.mock("@/components/charts/SimpleLineChart.vue", () => ({
  default: {
    name: "SimpleLineChart",
    props: ["data", "options", "height"],
    emits: ["chart:render"],
    template: '<div class="mock-chart" />',
  },
}));

// Mock @vueuse/core
vi.mock("@vueuse/core", () => ({
  useDark: () => ({
    value: false,
  }),
}));

// Mock categories store
vi.mock("@/stores/categories", () => ({
  useCategoriesStore: () => ({
    getName: vi.fn((id: number, locale: string) => {
      const categoryNames = {
        1: { en: "Beverages", es: "Bebidas" },
        2: { en: "Dairy", es: "Lácteos" },
      };
      return categoryNames[id]?.[locale] || `Category ${id}`;
    }),
    byLocale: {
      en: [
        { id: 1, name: "Beverages" },
        { id: 2, name: "Dairy" },
      ],
      es: [
        { id: 1, name: "Bebidas" },
        { id: 2, name: "Lácteos" },
      ],
    },
  }),
}));

// Mock i18n getCurrentLocale
vi.mock("@/i18n", () => ({
  getCurrentLocale: () => "en",
}));

const mockItemTrends = [
  {
    itemName: "Premium Coffee",
    category: "Beverages", // Keep for backward compatibility
    categoryInfo: {
      id: 1,
      key: "beverages",
      name: "Beverages",
      parentId: null,
      icon: "☕",
      color: "#8B5CF6",
      sortOrder: 1,
    },
    overallAveragePrice: 4.25,
    minPrice: 3.5,
    maxPrice: 5.0,
    priceVolatility: 15.2,
    totalTransactions: 8,
    priceHistory: [
      {
        date: "2024-01-01T00:00:00Z",
        averagePrice: 3.5,
        minPrice: 3.5,
        maxPrice: 3.5,
        transactionCount: 1,
        category: "Beverages",
        categoryInfo: {
          id: 1,
          key: "beverages",
          name: "Beverages",
          parentId: null,
          icon: "☕",
          color: "#8B5CF6",
          sortOrder: 1,
        },
      },
      {
        date: "2024-01-05T00:00:00Z",
        averagePrice: 4.0,
        minPrice: 3.75,
        maxPrice: 4.25,
        transactionCount: 3,
        category: "Beverages",
        categoryInfo: {
          id: 1,
          key: "beverages",
          name: "Beverages",
          parentId: null,
          icon: "☕",
          color: "#8B5CF6",
          sortOrder: 1,
        },
      },
      {
        date: "2024-01-10T00:00:00Z",
        averagePrice: 4.75,
        minPrice: 4.5,
        maxPrice: 5.0,
        transactionCount: 4,
        category: "Beverages",
        categoryInfo: {
          id: 1,
          key: "beverages",
          name: "Beverages",
          parentId: null,
          icon: "☕",
          color: "#8B5CF6",
          sortOrder: 1,
        },
      },
    ],
  },
  {
    itemName: "Organic Milk",
    category: "Dairy", // Keep for backward compatibility
    categoryInfo: {
      id: 2,
      key: "dairy",
      name: "Dairy",
      parentId: null,
      icon: "🥛",
      color: "#10B981",
      sortOrder: 2,
    },
    overallAveragePrice: 3.8,
    minPrice: 3.6,
    maxPrice: 4.0,
    priceVolatility: 5.3,
    totalTransactions: 6,
    priceHistory: [
      {
        date: "2024-01-02T00:00:00Z",
        averagePrice: 3.6,
        minPrice: 3.6,
        maxPrice: 3.6,
        transactionCount: 2,
        category: "Dairy",
        categoryInfo: {
          id: 2,
          key: "dairy",
          name: "Dairy",
          parentId: null,
          icon: "🥛",
          color: "#10B981",
          sortOrder: 2,
        },
      },
      {
        date: "2024-01-08T00:00:00Z",
        averagePrice: 4.0,
        minPrice: 3.8,
        maxPrice: 4.0,
        transactionCount: 4,
        category: "Dairy",
        categoryInfo: {
          id: 2,
          key: "dairy",
          name: "Dairy",
          parentId: null,
          icon: "🥛",
          color: "#10B981",
          sortOrder: 2,
        },
      },
    ],
  },
];

const mockData = {
  itemTrends: mockItemTrends,
};

const mockEmptyData = {
  itemTrends: [],
};

describe("PriceTrendsReport Component", () => {
  let wrapper: any;

  const createWrapper = (data = mockData) => {
    return mount(PriceTrendsReport, {
      props: { data },
      global: {
        plugins: [createTestI18n()],
      },
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe("Component Structure", () => {
    it("should render without crashing", () => {
      wrapper = createWrapper();
      expect(wrapper.exists()).toBe(true);
    });

    it("should render price trends section when data exists", () => {
      wrapper = createWrapper();

      expect(wrapper.text()).toContain("Price Trends");
      expect(wrapper.findAll(".card.p-6")).toHaveLength(mockItemTrends.length);
    });

    it("should render no data state when no trends available", () => {
      wrapper = createWrapper(mockEmptyData);

      expect(wrapper.text()).toContain(
        "No price trend data available for the selected period",
      );
      expect(wrapper.text()).toContain(
        "Items need multiple purchase transactions to show trends",
      );
    });
  });

  describe("Item Header Display", () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it("should display item name and category", () => {
      mockItemTrends.forEach((item) => {
        expect(wrapper.text()).toContain(item.itemName);
        expect(wrapper.text()).toContain(item.category);
      });
    });

    it("should display overall average price", () => {
      mockItemTrends.forEach((item) => {
        expect(wrapper.text()).toContain(
          `$${item.overallAveragePrice.toFixed(2)}`,
        );
      });
    });

    it("should handle null average price gracefully", () => {
      const dataWithNullPrice = {
        itemTrends: [
          {
            ...mockItemTrends[0],
            overallAveragePrice: null,
          },
        ],
      };
      wrapper = createWrapper(dataWithNullPrice);

      expect(wrapper.text()).toContain("Average Price");
      expect(wrapper.text()).toContain("$"); // null?.toFixed(2) renders as undefined, so just $ shows
    });
  });

  describe("Price Statistics Display", () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it("should display min and max prices", () => {
      mockItemTrends.forEach((item) => {
        expect(wrapper.text()).toContain(`$${item.minPrice.toFixed(2)}`);
        expect(wrapper.text()).toContain(`$${item.maxPrice.toFixed(2)}`);
      });
    });

    it("should display price volatility", () => {
      mockItemTrends.forEach((item) => {
        expect(wrapper.text()).toContain(`${item.priceVolatility.toFixed(1)}%`);
      });
    });

    it("should display total transactions", () => {
      mockItemTrends.forEach((item) => {
        expect(wrapper.text()).toContain(item.totalTransactions.toString());
      });
    });

    it("should have correct labels for statistics", () => {
      expect(wrapper.text()).toContain("Min Price");
      expect(wrapper.text()).toContain("Max Price");
      expect(wrapper.text()).toContain("Volatility");
      expect(wrapper.text()).toContain("Transactions");
    });

    it("should handle null statistics gracefully", () => {
      const dataWithNullStats = {
        itemTrends: [
          {
            ...mockItemTrends[0],
            minPrice: null,
            maxPrice: null,
            priceVolatility: null,
          },
        ],
      };
      wrapper = createWrapper(dataWithNullStats);

      expect(wrapper.text()).toContain("Min Price");
      expect(wrapper.text()).toContain("Max Price");
      expect(wrapper.text()).toContain("Volatility");
    });
  });

  describe("Price Chart Display", () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it("should render charts for items with multiple price points", () => {
      const charts = wrapper.findAll(".mock-chart");

      // Should have charts for items with > 1 price history point
      const itemsWithCharts = mockItemTrends.filter(
        (item) => item.priceHistory && item.priceHistory.length > 1,
      );
      expect(charts).toHaveLength(itemsWithCharts.length);
    });

    it("should not render chart for items with single price point", () => {
      const dataWithSinglePoint = {
        itemTrends: [
          {
            ...mockItemTrends[0],
            priceHistory: [
              {
                date: "2024-01-01T00:00:00Z",
                averagePrice: 3.5,
                minPrice: 3.5,
                maxPrice: 3.5,
                transactionCount: 1,
              },
            ],
          },
        ],
      };
      wrapper = createWrapper(dataWithSinglePoint);

      const charts = wrapper.findAll(".mock-chart");
      expect(charts).toHaveLength(0);
    });

    it("should not render chart for items with no price history", () => {
      const dataWithNoHistory = {
        itemTrends: [
          {
            ...mockItemTrends[0],
            priceHistory: [],
          },
        ],
      };
      wrapper = createWrapper(dataWithNoHistory);

      const charts = wrapper.findAll(".mock-chart");
      expect(charts).toHaveLength(0);
    });

    it("should show chart title", () => {
      expect(wrapper.text()).toContain("Price Trend Chart");
    });
  });

  describe("Price History Display", () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it("should display price history section", () => {
      expect(wrapper.text()).toContain("Price History");
    });

    it("should display formatted dates", () => {
      // Check that dates are formatted (should contain month names)
      expect(wrapper.text()).toContain("Jan");
    });

    it("should display transaction counts", () => {
      mockItemTrends.forEach((item) => {
        item.priceHistory.forEach((point) => {
          expect(wrapper.text()).toContain(
            `${point.transactionCount} transactions`,
          );
        });
      });
    });

    it("should display average prices", () => {
      mockItemTrends.forEach((item) => {
        item.priceHistory.forEach((point) => {
          expect(wrapper.text()).toContain(`$${point.averagePrice.toFixed(2)}`);
        });
      });
    });

    it("should display price ranges when min and max differ", () => {
      // Find price points where min !== max
      const pointsWithRange = mockItemTrends
        .flatMap((item) => item.priceHistory)
        .filter((point) => point.minPrice !== point.maxPrice);

      pointsWithRange.forEach((point) => {
        expect(wrapper.text()).toContain(
          `$${point.minPrice.toFixed(2)} - $${point.maxPrice.toFixed(2)}`,
        );
      });
    });

    it("should not display price range when min equals max", () => {
      // The first price point has min === max
      const sameMinMaxPoint = mockItemTrends[0].priceHistory[0];
      expect(sameMinMaxPoint.minPrice).toBe(sameMinMaxPoint.maxPrice);

      // Should not show the range format
      const rangeText = `$${sameMinMaxPoint.minPrice.toFixed(2)} - $${sameMinMaxPoint.maxPrice.toFixed(2)}`;
      expect(wrapper.text()).not.toContain(rangeText);
    });
  });

  describe("Percentage Change Calculations", () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it("should show dash for first entry (no previous price)", () => {
      // First entries should show "-"
      const firstEntryElements = wrapper.findAll(".bg-gray-50")[0]; // First price history item
      expect(firstEntryElements.text()).toContain("-");
    });

    it("should calculate and display percentage changes correctly", () => {
      // Coffee: 3.50 → 4.00 = +14.3%, 4.00 → 4.75 = +18.8%
      expect(wrapper.text()).toContain("+14.3%");
      expect(wrapper.text()).toContain("+18.8%");
    });

    it("should handle zero percentage change", () => {
      const dataWithZeroChange = {
        itemTrends: [
          {
            ...mockItemTrends[0],
            priceHistory: [
              {
                date: "2024-01-01T00:00:00Z",
                averagePrice: 4.0,
                minPrice: 4.0,
                maxPrice: 4.0,
                transactionCount: 1,
              },
              {
                date: "2024-01-02T00:00:00Z",
                averagePrice: 4.0,
                minPrice: 4.0,
                maxPrice: 4.0,
                transactionCount: 1,
              },
            ],
          },
        ],
      };
      wrapper = createWrapper(dataWithZeroChange);

      expect(wrapper.text()).toContain("0.0%");
    });
  });

  describe("CSS Classes and Styling", () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it("should apply correct color classes for price increases", () => {
      const priceIncreaseElements = wrapper.findAll(".text-red-600");
      expect(priceIncreaseElements.length).toBeGreaterThan(0);
    });

    it("should apply correct styles to cards", () => {
      const cards = wrapper.findAll(".card.p-6");
      expect(cards).toHaveLength(mockItemTrends.length);
    });

    it("should apply category badge styling", () => {
      const badges = wrapper.findAll(
        ".inline-flex.items-center.px-2\\.5.py-0\\.5.rounded-full",
      );
      expect(badges).toHaveLength(mockItemTrends.length);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle undefined itemTrends", () => {
      wrapper = createWrapper({ itemTrends: undefined });

      expect(wrapper.text()).toContain("No price trend data available");
    });

    it("should handle null itemTrends", () => {
      wrapper = createWrapper({ itemTrends: null });

      expect(wrapper.text()).toContain("No price trend data available");
    });

    it("should handle empty data object", () => {
      wrapper = createWrapper({});

      expect(wrapper.text()).toContain("No price trend data available");
    });

    it("should handle items with null price history", () => {
      const dataWithNullHistory = {
        itemTrends: [
          {
            ...mockItemTrends[0],
            priceHistory: null,
          },
        ],
      };
      wrapper = createWrapper(dataWithNullHistory);

      expect(wrapper.exists()).toBe(true);
      // Should not crash and should not show chart
      expect(wrapper.findAll(".mock-chart")).toHaveLength(0);
    });

    it("should handle items with undefined price history", () => {
      const dataWithUndefinedHistory = {
        itemTrends: [
          {
            ...mockItemTrends[0],
            priceHistory: undefined,
          },
        ],
      };
      wrapper = createWrapper(dataWithUndefinedHistory);

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.findAll(".mock-chart")).toHaveLength(0);
    });

    it("should handle price points with null values", () => {
      const dataWithNullValues = {
        itemTrends: [
          {
            ...mockItemTrends[0],
            priceHistory: [
              {
                date: "2024-01-01T00:00:00Z",
                averagePrice: null,
                minPrice: null,
                maxPrice: null,
                transactionCount: 1,
              },
            ],
          },
        ],
      };
      wrapper = createWrapper(dataWithNullValues);

      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("Date Formatting", () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it("should format dates in a readable format", () => {
      // Dates should be formatted as "Jan 1, 2024" format
      expect(wrapper.text()).toMatch(/Jan \d+, \d{4}/);
    });

    it("should handle different date formats", () => {
      const dataWithDifferentDates = {
        itemTrends: [
          {
            ...mockItemTrends[0],
            priceHistory: [
              {
                date: "2024-12-25",
                averagePrice: 5.0,
                minPrice: 5.0,
                maxPrice: 5.0,
                transactionCount: 1,
              },
            ],
          },
        ],
      };
      wrapper = createWrapper(dataWithDifferentDates);

      expect(wrapper.text()).toMatch(/Dec \d+, \d{4}/);
    });
  });

  describe("Component Lifecycle", () => {
    it("should clean up chart instances on unmount", async () => {
      wrapper = createWrapper();

      // Simulate chart render events
      const chartComponent = wrapper.findComponent({ name: "SimpleLineChart" });
      if (chartComponent.exists()) {
        const mockChart = { destroy: vi.fn() };
        await chartComponent.vm.$emit("chart:render", mockChart);

        wrapper.unmount();

        expect(mockChart.destroy).toHaveBeenCalled();
      }
    });

    it("should handle chart destroy errors gracefully", async () => {
      wrapper = createWrapper();

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Simulate chart with broken destroy method
      const chartComponent = wrapper.findComponent({ name: "SimpleLineChart" });
      if (chartComponent.exists()) {
        const mockChart = {
          destroy: vi.fn(() => {
            throw new Error("Destroy failed");
          }),
        };
        await chartComponent.vm.$emit("chart:render", mockChart);

        wrapper.unmount();

        expect(consoleSpy).toHaveBeenCalledWith(
          "Error destroying chart:",
          expect.any(Error),
        );
      }

      consoleSpy.mockRestore();
    });
  });

  describe("Localization Features", () => {
    it("should use localized category names when categoryInfo is available", () => {
      wrapper = createWrapper();

      // Should display localized category names from categoryInfo
      expect(wrapper.text()).toContain("Beverages");
      expect(wrapper.text()).toContain("Dairy");
    });

    it("should fallback to category string when categoryInfo is missing", () => {
      const dataWithoutCategoryInfo = {
        itemTrends: [
          {
            ...mockItemTrends[0],
            categoryInfo: null,
            category: "Fallback Category",
          },
        ],
      };
      wrapper = createWrapper(dataWithoutCategoryInfo);

      expect(wrapper.text()).toContain("Fallback Category");
    });

    it("should show 'Uncategorized' when no category information is available", () => {
      const dataWithoutCategory = {
        itemTrends: [
          {
            ...mockItemTrends[0],
            categoryInfo: null,
            category: null,
          },
        ],
      };
      wrapper = createWrapper(dataWithoutCategory);

      expect(wrapper.text()).toContain("Uncategorized");
    });

    it("should handle categoryInfo with missing name gracefully", () => {
      const dataWithIncompleteCategoryInfo = {
        itemTrends: [
          {
            ...mockItemTrends[0],
            categoryInfo: {
              id: 1,
              key: "test",
              name: null,
            },
            category: "Backup Category",
          },
        ],
      };
      wrapper = createWrapper(dataWithIncompleteCategoryInfo);

      // Since categoryInfo has an id, the store's getName function will be called
      // and should return "Beverages" for id 1 based on our mock
      expect(wrapper.text()).toContain("Beverages");
    });
  });
});
