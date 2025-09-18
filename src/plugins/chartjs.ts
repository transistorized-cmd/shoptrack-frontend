/**
 * Chart.js lazy loading and configuration
 * Only loads Chart.js when actually needed by components
 */

let chartJSInstance: any = null;
let isInitialized = false;

/**
 * Lazy load and initialize Chart.js with optimal configuration
 */
export const initializeChartJS = async () => {
  if (isInitialized && chartJSInstance) {
    return chartJSInstance;
  }

  // Dynamic import of Chart.js modules
  const {
    Chart: ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
  } = await import("chart.js");

  // Register Chart.js components
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
  );

  // Configure Chart.js defaults
  setupChartDefaults(ChartJS);

  chartJSInstance = ChartJS;
  isInitialized = true;

  return ChartJS;
};

/**
 * Setup Chart.js default configuration
 */
const setupChartDefaults = (ChartJS: any) => {
  // Global Chart.js configuration
  ChartJS.defaults.responsive = true;
  ChartJS.defaults.maintainAspectRatio = false;

  // Global font settings
  ChartJS.defaults.font = {
    family: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
    size: 12,
  };

  // Global color scheme
  ChartJS.defaults.color = "#374151"; // gray-700
  ChartJS.defaults.borderColor = "#E5E7EB"; // gray-200

  // Performance optimizations
  ChartJS.defaults.animation = {
    duration: 750,
    easing: "easeOutQuart",
  };

  // Optimize interaction settings
  ChartJS.defaults.interaction = {
    intersect: false,
    mode: "nearest",
  };

  // Reduce memory usage
  ChartJS.defaults.elements = {
    ...ChartJS.defaults.elements,
    point: {
      radius: 2,
      hoverRadius: 4,
    },
    line: {
      borderWidth: 1,
    },
  };

  // Disable legend by default
  ChartJS.defaults.plugins.legend.display = false;

  // Configure tooltip defaults
  ChartJS.defaults.plugins.tooltip.backgroundColor = "rgba(17, 24, 39, 0.95)"; // gray-900 with opacity
  ChartJS.defaults.plugins.tooltip.titleColor = "#F9FAFB"; // gray-50
  ChartJS.defaults.plugins.tooltip.bodyColor = "#F3F4F6"; // gray-100
  ChartJS.defaults.plugins.tooltip.borderColor = "#6B7280"; // gray-500
  ChartJS.defaults.plugins.tooltip.borderWidth = 1;
  ChartJS.defaults.plugins.tooltip.cornerRadius = 6;
  ChartJS.defaults.plugins.tooltip.padding = 8;
};

/**
 * Get Chart.js instance (lazy load if not initialized)
 */
export const getChartJS = async () => {
  return await initializeChartJS();
};

/**
 * Check if Chart.js is already loaded
 */
export const isChartJSLoaded = () => {
  return isInitialized && chartJSInstance !== null;
};

export { chartJSInstance as ChartJS };
