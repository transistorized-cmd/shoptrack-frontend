import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import SimpleLineChart from "../SimpleLineChart.vue";

// Mock Chart.js
const mockChart = {
  destroy: vi.fn(),
  update: vi.fn(),
  resize: vi.fn(),
};

const mockChartJS = vi.fn().mockImplementation(() => mockChart);
const mockRegister = vi.fn();

// Mock components
const mockCategoryScale = vi.fn();
const mockLinearScale = vi.fn();
const mockPointElement = vi.fn();
const mockLineElement = vi.fn();
const mockLineController = vi.fn();
const mockTitle = vi.fn();
const mockTooltip = vi.fn();
const mockLegend = vi.fn();

// Mock Chart.js with dynamic import support
vi.mock("chart.js", () => ({
  Chart: Object.assign(mockChartJS, { register: mockRegister }),
  CategoryScale: mockCategoryScale,
  LinearScale: mockLinearScale,
  PointElement: mockPointElement,
  LineElement: mockLineElement,
  LineController: mockLineController,
  Title: mockTitle,
  Tooltip: mockTooltip,
  Legend: mockLegend,
}));

// Mock console.error to avoid cluttering test output
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

describe("SimpleLineChart Component", () => {
  const mockData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    datasets: [
      {
        label: "Sales",
        data: [12, 19, 3, 5, 2],
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.1,
      },
    ],
  };

  const mockOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRegister.mockClear();
    mockChartJS.mockClear();
    mockChart.destroy.mockClear();
    mockChart.update.mockClear();
    mockChart.resize.mockClear();
  });

  // Helper function to wait for async chart creation
  const waitForChartCreation = async () => {
    await nextTick();
    // Wait a bit more for the dynamic import and chart creation
    await new Promise(resolve => setTimeout(resolve, 10));
  };

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  describe("Component Rendering", () => {
    it("should render chart container with correct structure", () => {
      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData },
      });

      expect(wrapper.find(".simple-chart-container").exists()).toBe(true);
      expect(wrapper.find(".chart-canvas-container").exists()).toBe(true);
      expect(wrapper.find("canvas").exists()).toBe(true);
    });

    it("should have canvas element with ref", () => {
      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData },
      });

      const canvas = wrapper.find("canvas");
      expect(canvas.exists()).toBe(true);
      expect(canvas.element).toBeInstanceOf(HTMLCanvasElement);
    });

    it("should apply custom height when provided", async () => {
      const customHeight = 400;
      const wrapper = mount(SimpleLineChart, {
        props: {
          data: mockData,
          height: customHeight,
        },
      });

      await nextTick();

      const canvas = wrapper.find("canvas").element as HTMLCanvasElement;
      expect(canvas.style.height).toBe(`${customHeight}px`);
    });

    it("should use default height when not provided", () => {
      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData },
      });

      const canvas = wrapper.find("canvas").element as HTMLCanvasElement;
      // Default height is set by CSS (100% of container, which defaults to 200px)
      expect(canvas.style.height).toBe("");
    });
  });

  describe("Chart Creation and Lifecycle", () => {
    it("should create chart on mount with valid data", async () => {
      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData, options: mockOptions },
      });

      await waitForChartCreation();

      expect(mockRegister).toHaveBeenCalledWith(
        mockCategoryScale,
        mockLinearScale,
        mockPointElement,
        mockLineElement,
        mockLineController,
        mockTitle,
        mockTooltip,
        mockLegend,
      );
      expect(mockChartJS).toHaveBeenCalledWith(expect.any(HTMLCanvasElement), {
        type: "line",
        data: mockData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          ...mockOptions,
        },
      });
    });

    it("should emit chart:render event with chart instance", async () => {
      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData },
      });

      await waitForChartCreation();

      expect(wrapper.emitted("chart:render")).toBeTruthy();
      expect(wrapper.emitted("chart:render")![0]).toEqual([mockChart]);
    });

    it("should destroy chart on unmount", async () => {
      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData },
      });

      await waitForChartCreation();
      expect(mockChartJS).toHaveBeenCalled();

      wrapper.unmount();
      expect(mockChart.destroy).toHaveBeenCalled();
    });

    it("should not create chart if no canvas element", async () => {
      // Mock chartCanvas.value to be undefined
      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData },
      });

      // Access component instance and set canvas ref to null
      const vm = wrapper.vm as any;
      vm.chartCanvas = null;

      await vm.createChart();

      expect(mockChartJS).not.toHaveBeenCalled();
    });

    it("should not create chart if no data provided", async () => {
      const wrapper = mount(SimpleLineChart, {
        props: { data: null },
      });

      await nextTick();

      expect(mockChartJS).not.toHaveBeenCalled();
    });

    it("should destroy existing chart before creating new one", async () => {
      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData },
      });

      await waitForChartCreation();
      expect(mockChartJS).toHaveBeenCalledTimes(1);

      // Trigger chart recreation
      await wrapper.setProps({
        data: { ...mockData, labels: ["New", "Labels"] },
      });

      await waitForChartCreation();

      expect(mockChart.destroy).toHaveBeenCalled();
      expect(mockChartJS).toHaveBeenCalledTimes(2);
    });
  });

  describe("Props Handling", () => {
    it("should accept and use custom options", async () => {
      const customOptions = {
        responsive: false,
        plugins: {
          legend: {
            display: false,
          },
        },
      };

      const wrapper = mount(SimpleLineChart, {
        props: {
          data: mockData,
          options: customOptions,
        },
      });

      await waitForChartCreation();

      expect(mockChartJS).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        expect.objectContaining({
          options: {
            responsive: true, // Always responsive
            maintainAspectRatio: false, // Always false
            ...customOptions,
          },
        }),
      );
    });

    it("should merge custom options with defaults", async () => {
      const customOptions = {
        plugins: {
          title: {
            display: true,
            text: "Custom Title",
          },
        },
      };

      const wrapper = mount(SimpleLineChart, {
        props: {
          data: mockData,
          options: customOptions,
        },
      });

      await waitForChartCreation();

      expect(mockChartJS).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        expect.objectContaining({
          options: expect.objectContaining({
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: "Custom Title",
              },
            },
          }),
        }),
      );
    });

    it("should handle undefined options gracefully", async () => {
      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData },
      });

      await waitForChartCreation();

      expect(mockChartJS).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        expect.objectContaining({
          options: {
            responsive: true,
            maintainAspectRatio: false,
          },
        }),
      );
    });
  });

  describe("Data Reactivity", () => {
    it("should recreate chart when data changes", async () => {
      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData },
      });

      await waitForChartCreation();
      expect(mockChartJS).toHaveBeenCalledTimes(1);

      const newData = {
        labels: ["A", "B", "C"],
        datasets: [
          {
            label: "New Data",
            data: [10, 20, 30],
            borderColor: "red",
          },
        ],
      };

      await wrapper.setProps({ data: newData });
      await waitForChartCreation();

      expect(mockChart.destroy).toHaveBeenCalled();
      expect(mockChartJS).toHaveBeenCalledTimes(2);
      expect(mockChartJS).toHaveBeenLastCalledWith(
        expect.any(HTMLCanvasElement),
        expect.objectContaining({
          data: newData,
        }),
      );
    });

    it("should handle deep data changes", async () => {
      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData },
      });

      await waitForChartCreation();
      expect(mockChartJS).toHaveBeenCalledTimes(1);

      // Deep change to dataset
      const modifiedData = {
        ...mockData,
        datasets: [
          {
            ...mockData.datasets[0],
            data: [100, 200, 300, 400, 500],
          },
        ],
      };

      await wrapper.setProps({ data: modifiedData });
      await waitForChartCreation();

      expect(mockChart.destroy).toHaveBeenCalled();
      expect(mockChartJS).toHaveBeenCalledTimes(2);
    });

    it("should not recreate chart for same data reference", async () => {
      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData },
      });

      await waitForChartCreation();
      expect(mockChartJS).toHaveBeenCalledTimes(1);

      // Set the same data reference
      await wrapper.setProps({ data: mockData });

      // Should not destroy/recreate since it's the same reference
      expect(mockChart.destroy).not.toHaveBeenCalled();
      expect(mockChartJS).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle chart creation errors", async () => {
      const creationError = new Error("Chart creation failed");
      mockChartJS.mockImplementationOnce(() => {
        throw creationError;
      });

      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData },
      });

      await waitForChartCreation();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to create chart:",
        creationError,
      );
    });

    it("should handle destroy errors gracefully", () => {
      const destroyError = new Error("Destroy failed");
      mockChart.destroy.mockImplementationOnce(() => {
        throw destroyError;
      });

      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData },
      });

      // Should not throw when unmounting
      expect(() => wrapper.unmount()).not.toThrow();
    });
  });

  describe("Chart.js Integration", () => {
    it("should register all required Chart.js components", async () => {
      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData },
      });

      await waitForChartCreation();

      expect(mockRegister).toHaveBeenCalledWith(
        mockCategoryScale,
        mockLinearScale,
        mockPointElement,
        mockLineElement,
        mockLineController,
        mockTitle,
        mockTooltip,
        mockLegend,
      );
    });

    it("should create line chart with correct type", async () => {
      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData },
      });

      await waitForChartCreation();

      expect(mockChartJS).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        expect.objectContaining({
          type: "line",
        }),
      );
    });

    it("should pass through chart data correctly", async () => {
      const complexData = {
        labels: ["Q1", "Q2", "Q3", "Q4"],
        datasets: [
          {
            label: "Revenue",
            data: [10000, 15000, 12000, 18000],
            borderColor: "rgb(54, 162, 235)",
            backgroundColor: "rgba(54, 162, 235, 0.1)",
            fill: true,
          },
          {
            label: "Profit",
            data: [2000, 3000, 2500, 4000],
            borderColor: "rgb(255, 99, 132)",
            backgroundColor: "rgba(255, 99, 132, 0.1)",
            fill: false,
          },
        ],
      };

      const wrapper = mount(SimpleLineChart, {
        props: { data: complexData },
      });

      await waitForChartCreation();

      expect(mockChartJS).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        expect.objectContaining({
          data: complexData,
        }),
      );
    });
  });

  describe("CSS and Styling", () => {
    it("should apply correct CSS classes", () => {
      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData },
      });

      expect(wrapper.find(".simple-chart-container").exists()).toBe(true);
      expect(wrapper.find(".chart-canvas-container").exists()).toBe(true);
    });

    it("should have canvas element with proper structure", () => {
      const wrapper = mount(SimpleLineChart, {
        props: { data: mockData },
      });

      const canvas = wrapper.find("canvas").element as HTMLCanvasElement;
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      expect(canvas.tagName).toBe("CANVAS");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty data gracefully", async () => {
      const emptyData = {
        labels: [],
        datasets: [],
      };

      const wrapper = mount(SimpleLineChart, {
        props: { data: emptyData },
      });

      await waitForChartCreation();

      expect(mockChartJS).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        expect.objectContaining({
          data: emptyData,
        }),
      );
    });

    it("should handle malformed data structure", async () => {
      const malformedData = {
        // Missing required properties
        someOtherProp: "value",
      };

      const wrapper = mount(SimpleLineChart, {
        props: { data: malformedData as any },
      });

      await waitForChartCreation();

      expect(mockChartJS).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        expect.objectContaining({
          data: malformedData,
        }),
      );
    });

    it("should handle very large datasets", async () => {
      const largeData = {
        labels: Array.from({ length: 1000 }, (_, i) => `Point ${i}`),
        datasets: [
          {
            label: "Large Dataset",
            data: Array.from({ length: 1000 }, () => Math.random() * 100),
            borderColor: "blue",
          },
        ],
      };

      const wrapper = mount(SimpleLineChart, {
        props: { data: largeData },
      });

      await waitForChartCreation();

      expect(mockChartJS).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        expect.objectContaining({
          data: largeData,
        }),
      );
    });

    it("should handle zero height", async () => {
      const wrapper = mount(SimpleLineChart, {
        props: {
          data: mockData,
          height: 0,
        },
      });

      await waitForChartCreation();

      const canvas = wrapper.find("canvas").element as HTMLCanvasElement;
      // Zero height is falsy, so the component doesn't set the style
      expect(canvas.style.height).toBe("");
    });

    it("should handle negative height", async () => {
      const wrapper = mount(SimpleLineChart, {
        props: {
          data: mockData,
          height: -100,
        },
      });

      await waitForChartCreation();

      const canvas = wrapper.find("canvas").element as HTMLCanvasElement;
      expect(canvas.style.height).toBe("-100px");
    });
  });
});
