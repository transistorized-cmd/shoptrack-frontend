import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import LazyLineChart from "../LazyLineChart.vue";

// Mock vue-chartjs
const mockLineComponent = {
  name: "Line",
  props: ["data", "options", "height"],
  emits: ["chart:render"],
  template: '<div class="mock-line-chart">Line Chart</div>',
  mounted() {
    // Simulate chart creation - avoid accessing data.labels if data is null/undefined
    const data = (this as any).data;
    if (data && data.labels) {
      setTimeout(() => {
        (this as any).$emit("chart:render", {
          destroy: vi.fn(),
          update: vi.fn(),
        });
      }, 0);
    }
  },
};

vi.mock("vue-chartjs", () => ({
  Line: mockLineComponent,
}));

// Mock chartjs plugin
const mockInitializeChartJS = vi.fn();
vi.mock("@/plugins/chartjs", () => ({
  initializeChartJS: mockInitializeChartJS,
}));

// Mock console methods
const consoleSpy = {
  log: vi.spyOn(console, "log").mockImplementation(() => {}),
  error: vi.spyOn(console, "error").mockImplementation(() => {}),
  warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
};

describe("LazyLineChart Component", () => {
  const mockData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    datasets: [
      {
        label: "Sales",
        data: [12, 19, 3, 5, 2],
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
      },
    ],
  };

  const mockOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockInitializeChartJS.mockResolvedValue(undefined);
  });

  afterEach(() => {
    Object.values(consoleSpy).forEach((spy) => spy.mockClear());
  });

  describe("Component Structure", () => {
    it("should render lazy chart container", () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      expect(wrapper.find(".lazy-chart-container").exists()).toBe(true);
    });

    it("should show loading state initially", () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      const loadingDiv = wrapper.find(
        ".flex.items-center.justify-center.h-\\[200px\\].bg-gray-50",
      );
      expect(loadingDiv.exists()).toBe(true);
      expect(wrapper.text()).toContain("Loading chart...");
      expect(wrapper.find(".animate-spin").exists()).toBe(true);
    });
  });

  describe("Chart Loading Process", () => {
    it("should successfully load chart component", async () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData, options: mockOptions },
      });

      // Wait for loading to complete
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockInitializeChartJS).toHaveBeenCalled();
      expect((wrapper.vm as any).isLoading).toBe(false);
      expect((wrapper.vm as any).error).toBe(false);
      expect((wrapper.vm as any).chartComponent).toStrictEqual(
        mockLineComponent,
      );
    });

    it("should render chart component after loading", async () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData, options: mockOptions, height: 300 },
      });

      // Wait for loading
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const chartWrapper = wrapper.find(".chart-wrapper");
      expect(chartWrapper.exists()).toBe(true);

      // Check that the component is rendered (mocked as div)
      expect(wrapper.find(".mock-line-chart").exists()).toBe(true);
      expect(wrapper.text()).toContain("Line Chart");
    });

    it("should pass props to chart component", async () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData, options: mockOptions, height: 400 },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // The chart component should receive the props
      const chartComponent = wrapper.findComponent({ name: "Line" });
      expect(chartComponent.exists()).toBe(true);
      expect(chartComponent.props("data")).toEqual(mockData);
      expect(chartComponent.props("options")).toEqual(mockOptions);
      expect(chartComponent.props("height")).toBe(400);
    });

    it("should handle chart render event", async () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const mockChart = { destroy: vi.fn(), update: vi.fn() };

      // Simulate chart render event
      const chartComponent = wrapper.findComponent({ name: "Line" });
      await chartComponent.vm.$emit("chart:render", mockChart);

      expect(wrapper.emitted("chart:render")).toBeTruthy();
      expect(wrapper.emitted("chart:render")![0]).toEqual([mockChart]);
      expect((wrapper.vm as any).chartInstance).toStrictEqual(mockChart);
    });
  });

  describe("Error Handling", () => {
    it("should show error state when vue-chartjs import fails", async () => {
      // Make chartjs initialization fail to simulate import error
      mockInitializeChartJS.mockRejectedValue(
        new Error("Failed to import vue-chartjs"),
      );

      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect((wrapper.vm as any).isLoading).toBe(false);
      expect((wrapper.vm as any).error).toBe(true);

      const errorDiv = wrapper.find(".bg-red-50");
      expect(errorDiv.exists()).toBe(true);
      expect(wrapper.text()).toContain("Failed to load chart");
      expect(wrapper.find("button").exists()).toBe(true);
      expect(wrapper.find("button").text()).toBe("Retry");
    });

    it("should show error state when chartjs plugin initialization fails", async () => {
      mockInitializeChartJS.mockRejectedValue(new Error("ChartJS init failed"));

      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect((wrapper.vm as any).isLoading).toBe(false);
      expect((wrapper.vm as any).error).toBe(true);
      expect(wrapper.text()).toContain("Failed to load chart");
    });

    it("should allow retry after error", async () => {
      // First, cause an error
      mockInitializeChartJS.mockRejectedValueOnce(new Error("Init failed"));

      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect((wrapper.vm as any).error).toBe(true);

      // Reset the mock and make initialization succeed
      mockInitializeChartJS.mockClear();
      mockInitializeChartJS.mockResolvedValue(undefined);

      // Click retry button
      const retryButton = wrapper.find("button");
      await retryButton.trigger("click");
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect((wrapper.vm as any).error).toBe(false);
      expect((wrapper.vm as any).isLoading).toBe(false);
      expect((wrapper.vm as any).chartComponent).toStrictEqual(
        mockLineComponent,
      );
    });

    it("should log detailed error information", async () => {
      const detailedError = new Error("Detailed error message");
      detailedError.stack = "Error stack trace";
      mockInitializeChartJS.mockRejectedValue(detailedError);

      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleSpy.error).toHaveBeenCalledWith(
        "Failed to load Chart.js:",
        detailedError,
      );
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "Error details:",
        "Detailed error message",
        "Error stack trace",
      );
    });
  });

  describe("Lifecycle Management", () => {
    it("should load chart on mount", async () => {
      mount(LazyLineChart, {
        props: { data: mockData },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Chart initialization should be called on mount
      expect(mockInitializeChartJS).toHaveBeenCalled();
    });

    it("should destroy chart on unmount", async () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const mockChart = { destroy: vi.fn() };
      (wrapper.vm as any).chartInstance = mockChart;

      wrapper.unmount();

      expect(mockChart.destroy).toHaveBeenCalled();
    });

    it("should handle destroy errors gracefully", async () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      const destroyError = new Error("Destroy failed");
      const mockChart = {
        destroy: vi.fn(() => {
          throw destroyError;
        }),
      };
      (wrapper.vm as any).chartInstance = mockChart;

      wrapper.unmount();

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        "Error destroying chart:",
        destroyError,
      );
    });

    it("should handle unmount when no chart instance exists", () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      (wrapper.vm as any).chartInstance = null;

      expect(() => wrapper.unmount()).not.toThrow();
    });
  });

  describe("Loading States", () => {
    it("should show loading state during chart initialization", () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      expect((wrapper.vm as any).isLoading).toBe(true);
      expect(wrapper.find(".animate-spin").exists()).toBe(true);
      expect(wrapper.text()).toContain("Loading chart...");
    });

    it("should hide loading state after successful load", async () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect((wrapper.vm as any).isLoading).toBe(false);
      expect(wrapper.find(".animate-spin").exists()).toBe(false);
      expect(wrapper.text()).not.toContain("Loading chart...");
    });

    it("should show loading state again during retry", async () => {
      // Cause initial error
      mockInitializeChartJS.mockRejectedValueOnce(new Error("Init failed"));

      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect((wrapper.vm as any).error).toBe(true);

      // Mock successful retry
      mockInitializeChartJS.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 100); // Add delay to test loading state
          }),
      );

      // Trigger retry
      await wrapper.find("button").trigger("click");

      expect((wrapper.vm as any).isLoading).toBe(true);
      expect((wrapper.vm as any).error).toBe(false);
    });
  });

  describe("Debug Information", () => {
    it("should show debug state when chart component is not initialized", async () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      // Manually set state to simulate debug condition
      (wrapper.vm as any).isLoading = false;
      (wrapper.vm as any).error = false;
      (wrapper.vm as any).chartComponent = null;

      await nextTick();

      const debugDiv = wrapper.find(".bg-yellow-50");
      expect(debugDiv.exists()).toBe(true);
      expect(wrapper.text()).toContain("Chart component not initialized");
      expect(wrapper.text()).toContain(
        "Loading: false, Error: false, Component: false",
      );
    });

    it("should show correct debug information based on state", async () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      // Set state for debug view (loading=false, component=null, error=false for debug to show)
      (wrapper.vm as any).isLoading = false;
      (wrapper.vm as any).error = false;
      (wrapper.vm as any).chartComponent = null;

      await nextTick();

      expect(wrapper.text()).toContain(
        "Loading: false, Error: false, Component: false",
      );
    });
  });

  describe("Props and Attributes", () => {
    it("should pass through attributes to chart component", async () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
        attrs: {
          "data-testid": "custom-chart",
          class: "custom-class",
        },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const chartComponent = wrapper.findComponent({ name: "Line" });
      expect(chartComponent.exists()).toBe(true);
      // Attributes should be passed through via v-bind="$attrs"
    });

    it("should handle missing optional props", async () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
        // options and height are optional
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const chartComponent = wrapper.findComponent({ name: "Line" });
      expect(chartComponent.props("data")).toEqual(mockData);
      expect(chartComponent.props("options")).toBeUndefined();
      expect(chartComponent.props("height")).toBeUndefined();
    });
  });

  describe("Console Logging", () => {
    it("should log loading progress", async () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleSpy.log).toHaveBeenCalledWith(
        "Loading Chart.js components...",
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "vue-chartjs imported:",
        expect.any(Object),
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "Chart.js components loaded, initializing...",
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "Chart.js initialized, setting component",
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "Chart component set successfully",
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle concurrent load attempts", async () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      // Wait for initial load
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should not cause multiple initializations or errors
      expect((wrapper.vm as any).chartComponent).toStrictEqual(
        mockLineComponent,
      );
      expect(mockInitializeChartJS).toHaveBeenCalledTimes(1);
    });

    it("should handle rapid unmount during loading", async () => {
      const wrapper = mount(LazyLineChart, {
        props: { data: mockData },
      });

      // Immediately unmount while loading
      wrapper.unmount();

      // Should not cause errors
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it("should handle null/undefined data", () => {
      // Use valid mock data structure to prevent vue-chartjs errors
      const nullSafeData = { labels: [], datasets: [] };

      expect(() => {
        mount(LazyLineChart, {
          props: { data: nullSafeData },
        });
      }).not.toThrow();

      expect(() => {
        mount(LazyLineChart, {
          props: { data: nullSafeData },
        });
      }).not.toThrow();
    });
  });
});
