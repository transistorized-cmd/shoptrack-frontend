import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { usePluginsStore } from "../plugins";
import type {
  ReceiptPlugin,
  ReportPlugin,
  PluginStatistics,
} from "@/types/plugin";

// Mock the plugins service
vi.mock("@/services/plugins", () => ({
  pluginsService: {
    getAllPlugins: vi.fn(),
    getPluginStatistics: vi.fn(),
  },
}));

describe("Plugins Store", () => {
  let store: ReturnType<typeof usePluginsStore>;
  let mockPluginsService: any;
  let mockReceiptPlugins: ReceiptPlugin[];
  let mockReportPlugins: ReportPlugin[];
  let mockStatistics: PluginStatistics;

  beforeEach(async () => {
    setActivePinia(createPinia());

    // Get the mocked service
    const { pluginsService } = await import("@/services/plugins");
    mockPluginsService = pluginsService as any;

    store = usePluginsStore();

    // Mock data
    mockReceiptPlugins = [
      {
        key: "pdf-plugin",
        name: "PDF Processor",
        description: "Processes PDF receipts",
        version: "1.0.0",
        icon: "📄",
        color: "#ff0000",
        supportedFileTypes: [".pdf"],
        maxFileSizeKB: 5120,
        supportsManualEntry: true,
        supportsBatchProcessing: false,
        requiresImageConversion: false,
        type: "receipt",
      },
      {
        key: "image-plugin",
        name: "Image Processor",
        description: "Processes image receipts",
        version: "1.1.0",
        icon: "🖼️",
        color: "#00ff00",
        supportedFileTypes: [".jpg", ".png", ".jpeg"],
        maxFileSizeKB: 10240,
        supportsManualEntry: false,
        supportsBatchProcessing: true,
        requiresImageConversion: true,
        type: "receipt",
      },
    ];

    mockReportPlugins = [
      {
        key: "expense-report",
        name: "Expense Reporter",
        description: "Generates expense reports",
        version: "2.0.0",
        icon: "📊",
        color: "#0000ff",
        category: "Financial",
        isEnabled: true,
        type: "report",
      },
      {
        key: "tax-report",
        name: "Tax Reporter",
        description: "Generates tax reports",
        version: "1.5.0",
        icon: "🧾",
        color: "#ff00ff",
        category: "Financial",
        isEnabled: false,
        type: "report",
      },
      {
        key: "summary-report",
        name: "Summary Reporter",
        description: "Generates summary reports",
        version: "1.0.0",
        icon: "📋",
        color: "#00ffff",
        category: "Analytics",
        isEnabled: true,
        type: "report",
      },
    ];

    mockStatistics = {
      totalPlugins: 5,
      receiptPlugins: 2,
      reportPlugins: 3,
      enabledPlugins: 3,
      disabledPlugins: 2,
      mostUsedPlugin: "pdf-plugin",
      recentlyUpdated: ["image-plugin"],
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with empty state", () => {
      expect(store.receiptPlugins).toEqual([]);
      expect(store.reportPlugins).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.supportedFileTypes).toEqual({});
      expect(store.statistics).toBeNull();
    });
  });

  describe("Computed Properties", () => {
    beforeEach(() => {
      store.receiptPlugins = mockReceiptPlugins;
      store.reportPlugins = mockReportPlugins;
    });

    it("should compute availableReceiptPlugins correctly", () => {
      expect(store.availableReceiptPlugins).toHaveLength(2);
      expect(store.availableReceiptPlugins[0].key).toBe("pdf-plugin");
      expect(store.availableReceiptPlugins[1].key).toBe("image-plugin");
    });

    it("should compute enabledReportPlugins correctly", () => {
      expect(store.enabledReportPlugins).toHaveLength(2);
      expect(store.enabledReportPlugins[0].key).toBe("expense-report");
      expect(store.enabledReportPlugins[1].key).toBe("summary-report");
    });

    it("should group plugins by category correctly", () => {
      const categories = store.pluginsByCategory;

      expect(categories["Financial"]).toHaveLength(2);
      expect(categories["Analytics"]).toHaveLength(1);
      expect(categories["Financial"][0].key).toBe("expense-report");
      expect(categories["Financial"][1].key).toBe("tax-report");
      expect(categories["Analytics"][0].key).toBe("summary-report");
    });

    it("should handle empty plugin categories", () => {
      store.reportPlugins = [];
      expect(store.pluginsByCategory).toEqual({});
    });
  });

  describe("fetchAllPlugins", () => {
    it("should fetch all plugins successfully", async () => {
      mockPluginsService.getAllPlugins.mockResolvedValue({
        receiptPlugins: mockReceiptPlugins,
        reportPlugins: mockReportPlugins,
      });

      await store.fetchAllPlugins();

      expect(mockPluginsService.getAllPlugins).toHaveBeenCalled();
      expect(store.receiptPlugins).toEqual(mockReceiptPlugins);
      expect(store.reportPlugins).toEqual(mockReportPlugins);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });

    it("should handle fetch plugins error", async () => {
      const errorMessage = "Network error";
      mockPluginsService.getAllPlugins.mockRejectedValue(
        new Error(errorMessage),
      );

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await store.fetchAllPlugins();

      expect(store.loading).toBe(false);
      expect(store.error).toBe(errorMessage);
      expect(store.receiptPlugins).toEqual([]);
      expect(store.reportPlugins).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching plugins:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it("should handle non-Error exceptions", async () => {
      mockPluginsService.getAllPlugins.mockRejectedValue("String error");

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await store.fetchAllPlugins();

      expect(store.error).toBe("Failed to fetch plugins");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching plugins:",
        "String error",
      );

      consoleSpy.mockRestore();
    });

    it("should set loading state correctly during fetch", async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockPluginsService.getAllPlugins.mockReturnValue(promise);

      const fetchPromise = store.fetchAllPlugins();

      // Should be loading
      expect(store.loading).toBe(true);

      // Resolve the promise
      resolvePromise!({
        receiptPlugins: mockReceiptPlugins,
        reportPlugins: mockReportPlugins,
      });

      await fetchPromise;

      // Should no longer be loading
      expect(store.loading).toBe(false);
    });
  });

  describe("fetchSupportedFileTypes", () => {
    it("should log that the feature is not implemented", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await store.fetchSupportedFileTypes();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Supported file types fetching not implemented yet",
      );

      consoleSpy.mockRestore();
    });
  });

  describe("fetchPluginStatistics", () => {
    it("should fetch plugin statistics successfully", async () => {
      mockPluginsService.getPluginStatistics.mockResolvedValue(mockStatistics);

      await store.fetchPluginStatistics();

      expect(mockPluginsService.getPluginStatistics).toHaveBeenCalled();
      expect(store.statistics).toEqual(mockStatistics);
    });

    it("should handle statistics fetch error", async () => {
      const error = new Error("Statistics fetch failed");
      mockPluginsService.getPluginStatistics.mockRejectedValue(error);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await store.fetchPluginStatistics();

      expect(store.statistics).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching plugin statistics:",
        error,
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Plugin Getters", () => {
    beforeEach(() => {
      store.receiptPlugins = mockReceiptPlugins;
      store.reportPlugins = mockReportPlugins;
    });

    it("should get receipt plugin by key", () => {
      const plugin = store.getReceiptPlugin("pdf-plugin");
      expect(plugin).toBeDefined();
      expect(plugin?.key).toBe("pdf-plugin");
      expect(plugin?.name).toBe("PDF Processor");
    });

    it("should return undefined for non-existent receipt plugin", () => {
      const plugin = store.getReceiptPlugin("non-existent");
      expect(plugin).toBeUndefined();
    });

    it("should get report plugin by key", () => {
      const plugin = store.getReportPlugin("expense-report");
      expect(plugin).toBeDefined();
      expect(plugin?.key).toBe("expense-report");
      expect(plugin?.name).toBe("Expense Reporter");
    });

    it("should return undefined for non-existent report plugin", () => {
      const plugin = store.getReportPlugin("non-existent");
      expect(plugin).toBeUndefined();
    });

    it("should get plugins for specific file type", () => {
      const pdfPlugins = store.getPluginsForFileType(".pdf");
      expect(pdfPlugins).toHaveLength(1);
      expect(pdfPlugins[0].key).toBe("pdf-plugin");

      const imagePlugins = store.getPluginsForFileType(".jpg");
      expect(imagePlugins).toHaveLength(1);
      expect(imagePlugins[0].key).toBe("image-plugin");

      const pngPlugins = store.getPluginsForFileType(".png");
      expect(pngPlugins).toHaveLength(1);
      expect(pngPlugins[0].key).toBe("image-plugin");
    });

    it("should return empty array for unsupported file type", () => {
      const plugins = store.getPluginsForFileType(".txt");
      expect(plugins).toEqual([]);
    });

    it("should handle case-insensitive file type matching", () => {
      const plugins = store.getPluginsForFileType(".PDF");
      expect(plugins).toHaveLength(1);
      expect(plugins[0].key).toBe("pdf-plugin");
    });
  });

  describe("Error Management", () => {
    it("should clear error state", () => {
      store.error = "Test error";
      expect(store.error).toBe("Test error");

      store.clearError();
      expect(store.error).toBeNull();
    });

    it("should clear error before successful fetch", async () => {
      store.error = "Previous error";

      mockPluginsService.getAllPlugins.mockResolvedValue({
        receiptPlugins: mockReceiptPlugins,
        reportPlugins: mockReportPlugins,
      });

      await store.fetchAllPlugins();

      expect(store.error).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty plugin arrays", () => {
      store.receiptPlugins = [];
      store.reportPlugins = [];

      expect(store.availableReceiptPlugins).toEqual([]);
      expect(store.enabledReportPlugins).toEqual([]);
      expect(store.pluginsByCategory).toEqual({});
      expect(store.getReceiptPlugin("any-key")).toBeUndefined();
      expect(store.getReportPlugin("any-key")).toBeUndefined();
      expect(store.getPluginsForFileType(".any")).toEqual([]);
    });

    it("should handle plugins with missing properties", () => {
      const incompletePlugin = {
        key: "incomplete-plugin",
        name: "Incomplete Plugin",
        type: "receipt",
        supportedFileTypes: [".test"],
      } as ReceiptPlugin;

      store.receiptPlugins = [incompletePlugin];

      expect(store.availableReceiptPlugins).toHaveLength(1);
      expect(store.getPluginsForFileType(".test")).toHaveLength(1);
    });

    it("should handle report plugins without categories", () => {
      const pluginWithoutCategory = {
        ...mockReportPlugins[0],
        category: undefined,
      } as any;

      store.reportPlugins = [pluginWithoutCategory];

      const categories = store.pluginsByCategory;
      expect(categories["undefined"]).toHaveLength(1);
    });

    it("should handle multiple plugins in same category", () => {
      const duplicateCategoryPlugin = {
        ...mockReportPlugins[2],
        key: "another-financial-plugin",
        category: "Financial",
      };

      store.reportPlugins = [...mockReportPlugins, duplicateCategoryPlugin];

      const categories = store.pluginsByCategory;
      expect(categories["Financial"]).toHaveLength(3);
      expect(categories["Analytics"]).toHaveLength(1);
    });

    it("should handle plugins with empty supportedFileTypes", () => {
      const pluginWithEmptyTypes = {
        ...mockReceiptPlugins[0],
        supportedFileTypes: [],
      };

      store.receiptPlugins = [pluginWithEmptyTypes];

      expect(store.getPluginsForFileType(".pdf")).toEqual([]);
    });
  });

  describe("Reactivity", () => {
    it("should update computed properties when state changes", () => {
      expect(store.availableReceiptPlugins).toEqual([]);

      store.receiptPlugins = [mockReceiptPlugins[0]];
      expect(store.availableReceiptPlugins).toHaveLength(1);

      store.receiptPlugins = mockReceiptPlugins;
      expect(store.availableReceiptPlugins).toHaveLength(2);
    });

    it("should update enabled plugins when report plugins change", () => {
      expect(store.enabledReportPlugins).toEqual([]);

      store.reportPlugins = [mockReportPlugins[0]]; // Enabled plugin
      expect(store.enabledReportPlugins).toHaveLength(1);

      store.reportPlugins = [mockReportPlugins[1]]; // Disabled plugin
      expect(store.enabledReportPlugins).toEqual([]);

      store.reportPlugins = mockReportPlugins; // Mix of enabled/disabled
      expect(store.enabledReportPlugins).toHaveLength(2);
    });

    it("should update categories when report plugins change", () => {
      expect(store.pluginsByCategory).toEqual({});

      store.reportPlugins = [mockReportPlugins[0]];
      expect(Object.keys(store.pluginsByCategory)).toHaveLength(1);
      expect(store.pluginsByCategory["Financial"]).toHaveLength(1);

      store.reportPlugins = mockReportPlugins;
      expect(Object.keys(store.pluginsByCategory)).toHaveLength(2);
      expect(store.pluginsByCategory["Financial"]).toHaveLength(2);
      expect(store.pluginsByCategory["Analytics"]).toHaveLength(1);
    });
  });
});