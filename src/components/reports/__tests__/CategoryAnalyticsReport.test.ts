import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createMockRouter } from "../../../../tests/utils/router";
import CategoryAnalyticsReport from "../CategoryAnalyticsReport.vue";

const mockData = {
  totalSpending: 1234.56,
  totalTransactions: 42,
  averageTransaction: 29.39,
  categories: [
    {
      name: "Groceries",
      amount: 800.25,
      transactions: 15,
      percentage: 65.2,
    },
    {
      name: "Restaurants",
      amount: 234.31,
      transactions: 12,
      percentage: 19.1,
    },
    {
      name: "Shopping",
      amount: 200.0,
      transactions: 15,
      percentage: 16.2,
    },
  ],
  monthlyTrend: [
    { month: "Jan", amount: 400.5 },
    { month: "Feb", amount: 350.75 },
    { month: "Mar", amount: 483.31 },
  ],
};

describe("CategoryAnalyticsReport Component", () => {
  const createWrapper = (data = mockData) => {
    const { mockRouter } = createMockRouter();
    return mount(CategoryAnalyticsReport, {
      props: { data },
      global: {
        plugins: [mockRouter],
      },
    });
  };

  describe("Summary Statistics", () => {
    it("should render total spending correctly", () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain("Total Spending");
      expect(wrapper.text()).toContain("$1234.56");
    });

    it("should render total transactions correctly", () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain("Transactions");
      expect(wrapper.text()).toContain("42");
    });

    it("should render average transaction correctly", () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain("Avg Transaction");
      expect(wrapper.text()).toContain("$29.39");
    });

    it("should render categories count correctly", () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain("Categories");
      expect(wrapper.text()).toContain("3");
    });

    it("should handle null/undefined values gracefully", () => {
      const emptyData = {
        totalSpending: null,
        totalTransactions: null,
        averageTransaction: undefined,
        categories: null,
      };
      const wrapper = createWrapper(emptyData);

      expect(wrapper.text()).toContain("$0.00");
      expect(wrapper.text()).toContain("0");
    });

    it("should handle missing properties gracefully", () => {
      const wrapper = createWrapper({});

      expect(wrapper.text()).toContain("$0.00");
      expect(wrapper.text()).toContain("0");
    });
  });

  describe("Categories Breakdown", () => {
    it("should render categories breakdown when data exists", () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain("Categories Breakdown");
      expect(wrapper.text()).toContain("View detailed analytics →");
    });

    it("should render each category correctly", () => {
      const wrapper = createWrapper();

      mockData.categories.forEach((category) => {
        expect(wrapper.text()).toContain(category.name);
        expect(wrapper.text()).toContain(`${category.percentage}%`);
        expect(wrapper.text()).toContain(
          `${category.transactions} transactions`,
        );
        expect(wrapper.text()).toContain(`$${category.amount.toFixed(2)}`);
      });
    });

    it("should render progress bars with correct widths", () => {
      const wrapper = createWrapper();

      const progressBars = wrapper.findAll(".bg-shoptrack-600");
      expect(progressBars).toHaveLength(mockData.categories.length);

      progressBars.forEach((bar, index) => {
        const expectedWidth = `${mockData.categories[index].percentage}%`;
        expect(bar.attributes("style")).toContain(`width: ${expectedWidth}`);
      });
    });

    it("should make category items clickable", () => {
      const wrapper = createWrapper();

      const categoryItems = wrapper.findAll(
        ".bg-gray-50.rounded-lg.hover\\:bg-gray-100",
      );
      expect(categoryItems).toHaveLength(mockData.categories.length);

      categoryItems.forEach((item) => {
        expect(item.classes()).toContain("cursor-pointer");
      });
    });

    it("should not render categories section when no categories", () => {
      const dataWithoutCategories = { ...mockData, categories: [] };
      const wrapper = createWrapper(dataWithoutCategories);

      expect(wrapper.text()).not.toContain("Categories Breakdown");
      expect(wrapper.text()).toContain("No category data available");
    });

    it("should not render categories section when categories is null", () => {
      const dataWithoutCategories = { ...mockData, categories: null };
      const wrapper = createWrapper(dataWithoutCategories);

      expect(wrapper.text()).not.toContain("Categories Breakdown");
      expect(wrapper.text()).toContain("No category data available");
    });

    it("should handle categories with null amount gracefully", () => {
      const dataWithNullAmount = {
        ...mockData,
        categories: [
          {
            name: "Test Category",
            amount: null,
            transactions: 5,
            percentage: 10,
          },
        ],
      };
      const wrapper = createWrapper(dataWithNullAmount);

      expect(wrapper.text()).toContain("Test Category");
      expect(wrapper.text()).toContain("transactions$"); // null?.toFixed(2) renders as empty after $
    });
  });

  describe("Monthly Trend", () => {
    it("should render monthly trend when data exists", () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain("Monthly Trend");
    });

    it("should render each month correctly", () => {
      const wrapper = createWrapper();

      mockData.monthlyTrend.forEach((month) => {
        expect(wrapper.text()).toContain(month.month);
        expect(wrapper.text()).toContain(`$${month.amount.toFixed(2)}`);
      });
    });

    it("should not render monthly trend when no data", () => {
      const dataWithoutTrend = { ...mockData, monthlyTrend: [] };
      const wrapper = createWrapper(dataWithoutTrend);

      expect(wrapper.text()).not.toContain("Monthly Trend");
    });

    it("should not render monthly trend when data is null", () => {
      const dataWithoutTrend = { ...mockData, monthlyTrend: null };
      const wrapper = createWrapper(dataWithoutTrend);

      expect(wrapper.text()).not.toContain("Monthly Trend");
    });

    it("should handle months with null amount gracefully", () => {
      const dataWithNullAmount = {
        ...mockData,
        monthlyTrend: [{ month: "Test", amount: null }],
      };
      const wrapper = createWrapper(dataWithNullAmount);

      expect(wrapper.text()).toContain("Test");
      expect(wrapper.text()).toContain("Test $"); // null?.toFixed(2) renders as empty after $
    });
  });

  describe("Navigation and Routing", () => {
    it("should render router link to detailed analytics", () => {
      const wrapper = createWrapper();

      const link = wrapper.find('a[href="/analytics/categories"]');
      expect(link.exists()).toBe(true);
      expect(link.text()).toContain("View detailed analytics");
    });

    it("should navigate to detailed analytics on category click", async () => {
      const { mockRouter } = createMockRouter();
      const wrapper = mount(CategoryAnalyticsReport, {
        props: { data: mockData },
        global: {
          plugins: [mockRouter],
        },
      });

      const firstCategory = wrapper.find(
        ".bg-gray-50.rounded-lg.hover\\:bg-gray-100",
      );
      await firstCategory.trigger("click");

      expect(mockRouter.push).toHaveBeenCalledWith("/analytics/categories");
    });
  });

  describe("No Data State", () => {
    it("should show no data message when categories array is empty", () => {
      const emptyData = { ...mockData, categories: [] };
      const wrapper = createWrapper(emptyData);

      expect(wrapper.text()).toContain(
        "No category data available for the selected period",
      );
    });

    it("should show no data message when categories is null", () => {
      const nullData = { ...mockData, categories: null };
      const wrapper = createWrapper(nullData);

      expect(wrapper.text()).toContain(
        "No category data available for the selected period",
      );
    });

    it("should show no data message when categories is undefined", () => {
      const undefinedData = { ...mockData, categories: undefined };
      const wrapper = createWrapper(undefinedData);

      expect(wrapper.text()).toContain(
        "No category data available for the selected period",
      );
    });
  });

  describe("Responsive Design", () => {
    it("should have correct CSS classes for responsive layout", () => {
      const wrapper = createWrapper();

      // Summary stats grid
      const statsGrid = wrapper.find(".grid.grid-cols-2.lg\\:grid-cols-4");
      expect(statsGrid.exists()).toBe(true);

      // Monthly trend grid
      const trendGrid = wrapper.find(
        ".grid.grid-cols-1.gap-3.sm\\:grid-cols-3.lg\\:grid-cols-6",
      );
      expect(trendGrid.exists()).toBe(true);
    });
  });

  describe("CSS Classes and Styling", () => {
    it("should have correct styling classes for summary cards", () => {
      const wrapper = createWrapper();

      const summaryCards = wrapper.findAll(".bg-white.p-4.rounded-lg.border");
      expect(summaryCards).toHaveLength(4);
    });

    it("should have correct styling for category items", () => {
      const wrapper = createWrapper();

      const categoryItems = wrapper.findAll(
        ".bg-gray-50.rounded-lg.hover\\:bg-gray-100",
      );
      expect(categoryItems).toHaveLength(mockData.categories.length);

      categoryItems.forEach((item) => {
        expect(item.classes()).toContain("transition-colors");
        expect(item.classes()).toContain("cursor-pointer");
      });
    });

    it("should have shoptrack brand color for progress bars and amounts", () => {
      const wrapper = createWrapper();

      const progressBars = wrapper.findAll(".bg-shoptrack-600");
      expect(progressBars).toHaveLength(mockData.categories.length);

      const brandColorAmounts = wrapper.findAll(".text-shoptrack-600");
      expect(brandColorAmounts.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle completely empty data object", () => {
      const wrapper = createWrapper({});

      expect(wrapper.text()).toContain("$0.00");
      expect(wrapper.text()).toContain("0");
      expect(wrapper.text()).toContain("No category data available");
    });

    it("should handle categories with zero percentage", () => {
      const dataWithZeroPercentage = {
        ...mockData,
        categories: [
          { name: "Zero Category", amount: 0, transactions: 0, percentage: 0 },
        ],
      };
      const wrapper = createWrapper(dataWithZeroPercentage);

      expect(wrapper.text()).toContain("Zero Category");
      expect(wrapper.text()).toContain("0%");
      expect(wrapper.text()).toContain("$0.00");
    });

    it("should handle very large numbers correctly", () => {
      const dataWithLargeNumbers = {
        totalSpending: 9999999.99,
        totalTransactions: 999999,
        averageTransaction: 1000.5,
        categories: [
          {
            name: "Large Category",
            amount: 9999999.99,
            transactions: 999999,
            percentage: 100,
          },
        ],
      };
      const wrapper = createWrapper(dataWithLargeNumbers);

      expect(wrapper.text()).toContain("$9999999.99");
      expect(wrapper.text()).toContain("999999");
      expect(wrapper.text()).toContain("$1000.50");
    });
  });
});
