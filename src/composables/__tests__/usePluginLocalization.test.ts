import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { usePluginLocalization } from "../usePluginLocalization";
import type { ReportPlugin, ReceiptPlugin } from "@/types/plugin";

// Mock useTranslation composable
const mockT = vi.fn();
const mockLocale = ref("en");
const mockSetLocale = vi.fn();

vi.mock("@/composables/useTranslation", () => ({
  useTranslation: () => ({
    t: mockT,
    locale: mockLocale,
    setLocale: mockSetLocale,
  }),
}));

describe("usePluginLocalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockT.mockClear();
    mockSetLocale.mockClear();
    mockLocale.value = "en";
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getLocalizedPluginName", () => {
    it("should return translated name when translation exists", () => {
      // Arrange
      const plugin: ReceiptPlugin = {
        key: "pdf-receipt",
        name: "PDF Receipt Parser",
        description: "Parse PDF receipts",
        version: "1.0.0",
        supportedFileTypes: ["pdf"],
        maxFileSizeKB: 1024,
        icon: "file-pdf",
        color: "#FF0000",
        supportsManualEntry: false,
        supportsBatchProcessing: true,
        requiresImageConversion: false,
        type: "receipt",
      };

      mockT.mockImplementation((key: string) => {
        if (key === "plugins.pdf-receipt.name") {
          return "Analizador de Recibos PDF";
        }
        return key;
      });

      // Act
      const { getLocalizedPluginName } = usePluginLocalization();
      const result = getLocalizedPluginName(plugin);

      // Assert
      expect(mockT).toHaveBeenCalledWith("plugins.pdf-receipt.name");
      expect(result).toBe("Analizador de Recibos PDF");
    });

    it("should fallback to original name when translation does not exist", () => {
      // Arrange
      const plugin: ReportPlugin = {
        key: "sales-report",
        name: "Sales Report",
        description: "Generate sales reports",
        version: "2.1.0",
        icon: "chart-bar",
        color: "#00FF00",
        category: "analytics",
        priority: 1,
        requiresDateRange: true,
        supportsExport: true,
        supportedExportFormats: ["pdf", "csv"],
        isEnabled: true,
        prerequisites: [],
        type: "report",
      };

      // Mock t to return the key itself (indicating no translation)
      mockT.mockImplementation((key: string) => key);

      // Act
      const { getLocalizedPluginName } = usePluginLocalization();
      const result = getLocalizedPluginName(plugin);

      // Assert
      expect(mockT).toHaveBeenCalledWith("plugins.sales-report.name");
      expect(result).toBe("Sales Report");
    });

    it("should handle empty plugin name", () => {
      // Arrange
      const plugin: ReceiptPlugin = {
        key: "empty-name",
        name: "",
        description: "Test plugin",
        version: "1.0.0",
        supportedFileTypes: ["txt"],
        maxFileSizeKB: 512,
        icon: "file",
        color: "#0000FF",
        supportsManualEntry: true,
        supportsBatchProcessing: false,
        requiresImageConversion: false,
        type: "receipt",
      };

      mockT.mockImplementation((key: string) => key);

      // Act
      const { getLocalizedPluginName } = usePluginLocalization();
      const result = getLocalizedPluginName(plugin);

      // Assert
      expect(result).toBe("");
    });

    it("should handle plugin keys with special characters", () => {
      // Arrange
      const plugin: ReportPlugin = {
        key: "plugin-with.special_chars",
        name: "Special Plugin",
        description: "Plugin with special characters",
        version: "1.0.0",
        icon: "star",
        color: "#FF00FF",
        category: "special",
        priority: 5,
        requiresDateRange: false,
        supportsExport: false,
        supportedExportFormats: [],
        isEnabled: true,
        prerequisites: [],
        type: "report",
      };

      mockT.mockImplementation((key: string) => {
        if (key === "plugins.plugin-with.special_chars.name") {
          return "Plugin Especial";
        }
        return key;
      });

      // Act
      const { getLocalizedPluginName } = usePluginLocalization();
      const result = getLocalizedPluginName(plugin);

      // Assert
      expect(mockT).toHaveBeenCalledWith(
        "plugins.plugin-with.special_chars.name",
      );
      expect(result).toBe("Plugin Especial");
    });

    it("should handle undefined or null translation results", () => {
      // Arrange
      const plugin: ReceiptPlugin = {
        key: "test-plugin",
        name: "Test Plugin",
        description: "Test description",
        version: "1.0.0",
        supportedFileTypes: ["txt"],
        maxFileSizeKB: 1024,
        icon: "test",
        color: "#000000",
        supportsManualEntry: true,
        supportsBatchProcessing: true,
        requiresImageConversion: false,
        type: "receipt",
      };

      // Mock t to return the translation key (indicating no translation found)
      // Since the composable checks if translated !== translationKey
      mockT.mockImplementation((key: string) => key);

      // Act
      const { getLocalizedPluginName } = usePluginLocalization();
      const result = getLocalizedPluginName(plugin);

      // Assert
      expect(result).toBe("Test Plugin");
    });
  });

  describe("getLocalizedPluginDescription", () => {
    it("should return translated description when translation exists", () => {
      // Arrange
      const plugin: ReportPlugin = {
        key: "monthly-report",
        name: "Monthly Report",
        description: "Generate monthly reports",
        version: "1.5.0",
        icon: "calendar",
        color: "#FFFF00",
        category: "reports",
        priority: 2,
        requiresDateRange: true,
        supportsExport: true,
        supportedExportFormats: ["pdf"],
        isEnabled: true,
        prerequisites: [],
        type: "report",
      };

      mockT.mockImplementation((key: string) => {
        if (key === "plugins.monthly-report.description") {
          return "Generar reportes mensuales";
        }
        return key;
      });

      // Act
      const { getLocalizedPluginDescription } = usePluginLocalization();
      const result = getLocalizedPluginDescription(plugin);

      // Assert
      expect(mockT).toHaveBeenCalledWith("plugins.monthly-report.description");
      expect(result).toBe("Generar reportes mensuales");
    });

    it("should fallback to original description when translation does not exist", () => {
      // Arrange
      const plugin: ReceiptPlugin = {
        key: "image-receipt",
        name: "Image Receipt",
        description: "Process image receipts",
        version: "1.0.0",
        supportedFileTypes: ["jpg", "png"],
        maxFileSizeKB: 2048,
        icon: "image",
        color: "#00FFFF",
        supportsManualEntry: false,
        supportsBatchProcessing: true,
        requiresImageConversion: true,
        type: "receipt",
      };

      mockT.mockImplementation((key: string) => key);

      // Act
      const { getLocalizedPluginDescription } = usePluginLocalization();
      const result = getLocalizedPluginDescription(plugin);

      // Assert
      expect(mockT).toHaveBeenCalledWith("plugins.image-receipt.description");
      expect(result).toBe("Process image receipts");
    });

    it("should handle empty plugin description", () => {
      // Arrange
      const plugin: ReportPlugin = {
        key: "empty-desc",
        name: "Empty Description Plugin",
        description: "",
        version: "1.0.0",
        icon: "empty",
        color: "#808080",
        category: "test",
        priority: 0,
        requiresDateRange: false,
        supportsExport: false,
        supportedExportFormats: [],
        isEnabled: false,
        prerequisites: [],
        type: "report",
      };

      mockT.mockImplementation((key: string) => key);

      // Act
      const { getLocalizedPluginDescription } = usePluginLocalization();
      const result = getLocalizedPluginDescription(plugin);

      // Assert
      expect(result).toBe("");
    });

    it("should handle long descriptions", () => {
      // Arrange
      const longDescription =
        "This is a very long plugin description that contains multiple sentences and provides detailed information about the plugin functionality and capabilities.";
      const plugin: ReceiptPlugin = {
        key: "long-desc",
        name: "Long Description Plugin",
        description: longDescription,
        version: "1.0.0",
        supportedFileTypes: ["pdf", "txt"],
        maxFileSizeKB: 5120,
        icon: "file-text",
        color: "#FFA500",
        supportsManualEntry: true,
        supportsBatchProcessing: true,
        requiresImageConversion: false,
        type: "receipt",
      };

      const translatedDescription =
        "Esta es una descripción muy larga del plugin que contiene múltiples oraciones y proporciona información detallada sobre la funcionalidad y capacidades del plugin.";

      mockT.mockImplementation((key: string) => {
        if (key === "plugins.long-desc.description") {
          return translatedDescription;
        }
        return key;
      });

      // Act
      const { getLocalizedPluginDescription } = usePluginLocalization();
      const result = getLocalizedPluginDescription(plugin);

      // Assert
      expect(result).toBe(translatedDescription);
    });
  });

  describe("localizePlugin", () => {
    it("should return localized receipt plugin", () => {
      // Arrange
      const plugin: ReceiptPlugin = {
        key: "csv-receipt",
        name: "CSV Receipt",
        description: "Parse CSV receipts",
        version: "1.2.0",
        supportedFileTypes: ["csv"],
        maxFileSizeKB: 1024,
        icon: "file-csv",
        color: "#00AA00",
        supportsManualEntry: true,
        supportsBatchProcessing: true,
        requiresImageConversion: false,
        type: "receipt",
      };

      mockT.mockImplementation((key: string) => {
        if (key === "plugins.csv-receipt.name") {
          return "Recibo CSV";
        }
        if (key === "plugins.csv-receipt.description") {
          return "Analizar recibos CSV";
        }
        return key;
      });

      // Act
      const { localizePlugin } = usePluginLocalization();
      const result = localizePlugin(plugin);

      // Assert
      expect(result.name).toBe("Recibo CSV");
      expect(result.description).toBe("Analizar recibos CSV");
      expect(result.key).toBe("csv-receipt");
      expect(result.version).toBe("1.2.0");
      expect(result.supportedFileTypes).toEqual(["csv"]);
      expect(result.type).toBe("receipt");
    });

    it("should return localized report plugin", () => {
      // Arrange
      const plugin: ReportPlugin = {
        key: "expense-report",
        name: "Expense Report",
        description: "Generate expense reports",
        version: "2.0.0",
        icon: "receipt",
        color: "#AA0000",
        category: "financial",
        priority: 3,
        requiresDateRange: true,
        supportsExport: true,
        supportedExportFormats: ["pdf", "excel"],
        isEnabled: true,
        prerequisites: ["receipts"],
        type: "report",
      };

      mockT.mockImplementation((key: string) => {
        if (key === "plugins.expense-report.name") {
          return "Reporte de Gastos";
        }
        if (key === "plugins.expense-report.description") {
          return "Generar reportes de gastos";
        }
        return key;
      });

      // Act
      const { localizePlugin } = usePluginLocalization();
      const result = localizePlugin(plugin);

      // Assert
      expect(result.name).toBe("Reporte de Gastos");
      expect(result.description).toBe("Generar reportes de gastos");
      expect(result.category).toBe("financial");
      expect(result.priority).toBe(3);
      expect(result.supportedExportFormats).toEqual(["pdf", "excel"]);
      expect(result.type).toBe("report");
    });

    it("should preserve original properties when no translation exists", () => {
      // Arrange
      const plugin: ReceiptPlugin = {
        key: "untranslated",
        name: "Untranslated Plugin",
        description: "No translation available",
        version: "1.0.0",
        supportedFileTypes: ["txt"],
        maxFileSizeKB: 512,
        icon: "file",
        color: "#666666",
        supportsManualEntry: false,
        supportsBatchProcessing: false,
        requiresImageConversion: false,
        type: "receipt",
      };

      mockT.mockImplementation((key: string) => key);

      // Act
      const { localizePlugin } = usePluginLocalization();
      const result = localizePlugin(plugin);

      // Assert
      expect(result).toEqual(plugin);
      expect(result.name).toBe("Untranslated Plugin");
      expect(result.description).toBe("No translation available");
    });

    it("should handle plugin with minimal properties", () => {
      // Arrange
      const plugin: ReportPlugin = {
        key: "minimal",
        name: "Minimal Plugin",
        description: "Minimal description",
        version: "0.1.0",
        icon: "dot",
        color: "#000000",
        category: "misc",
        priority: 10,
        requiresDateRange: false,
        supportsExport: false,
        supportedExportFormats: [],
        isEnabled: false,
        prerequisites: [],
        type: "report",
      };

      mockT.mockImplementation((key: string) => {
        if (key === "plugins.minimal.name") {
          return "Plugin Mínimo";
        }
        if (key === "plugins.minimal.description") {
          return "Descripción mínima";
        }
        return key;
      });

      // Act
      const { localizePlugin } = usePluginLocalization();
      const result = localizePlugin(plugin);

      // Assert
      expect(result.name).toBe("Plugin Mínimo");
      expect(result.description).toBe("Descripción mínima");
      expect(result.supportedExportFormats).toEqual([]);
      expect(result.prerequisites).toEqual([]);
      expect(result.isEnabled).toBe(false);
    });

    it("should maintain object immutability", () => {
      // Arrange
      const plugin: ReceiptPlugin = {
        key: "immutable-test",
        name: "Original Name",
        description: "Original Description",
        version: "1.0.0",
        supportedFileTypes: ["txt"],
        maxFileSizeKB: 1024,
        icon: "file",
        color: "#123456",
        supportsManualEntry: true,
        supportsBatchProcessing: false,
        requiresImageConversion: false,
        type: "receipt",
      };

      mockT.mockImplementation((key: string) => {
        if (key === "plugins.immutable-test.name") {
          return "Translated Name";
        }
        if (key === "plugins.immutable-test.description") {
          return "Translated Description";
        }
        return key;
      });

      // Act
      const { localizePlugin } = usePluginLocalization();
      const result = localizePlugin(plugin);

      // Assert
      expect(plugin.name).toBe("Original Name"); // Original unchanged
      expect(plugin.description).toBe("Original Description"); // Original unchanged
      expect(result.name).toBe("Translated Name"); // Result has translation
      expect(result.description).toBe("Translated Description"); // Result has translation
      expect(result).not.toBe(plugin); // Different object references
    });
  });

  describe("localizePlugins", () => {
    it("should localize array of receipt plugins", () => {
      // Arrange
      const plugins: ReceiptPlugin[] = [
        {
          key: "plugin1",
          name: "Plugin One",
          description: "First plugin",
          version: "1.0.0",
          supportedFileTypes: ["pdf"],
          maxFileSizeKB: 1024,
          icon: "file-pdf",
          color: "#FF0000",
          supportsManualEntry: false,
          supportsBatchProcessing: true,
          requiresImageConversion: false,
          type: "receipt",
        },
        {
          key: "plugin2",
          name: "Plugin Two",
          description: "Second plugin",
          version: "2.0.0",
          supportedFileTypes: ["csv"],
          maxFileSizeKB: 512,
          icon: "file-csv",
          color: "#00FF00",
          supportsManualEntry: true,
          supportsBatchProcessing: false,
          requiresImageConversion: false,
          type: "receipt",
        },
      ];

      mockT.mockImplementation((key: string) => {
        const translations: Record<string, string> = {
          "plugins.plugin1.name": "Plugin Uno",
          "plugins.plugin1.description": "Primer plugin",
          "plugins.plugin2.name": "Plugin Dos",
          "plugins.plugin2.description": "Segundo plugin",
        };
        return translations[key] || key;
      });

      // Act
      const { localizePlugins } = usePluginLocalization();
      const result = localizePlugins(plugins);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Plugin Uno");
      expect(result[0].description).toBe("Primer plugin");
      expect(result[1].name).toBe("Plugin Dos");
      expect(result[1].description).toBe("Segundo plugin");
      expect(result[0].key).toBe("plugin1");
      expect(result[1].key).toBe("plugin2");
    });

    it("should localize array of report plugins", () => {
      // Arrange
      const plugins: ReportPlugin[] = [
        {
          key: "report1",
          name: "Sales Report",
          description: "Generate sales report",
          version: "1.0.0",
          icon: "chart-line",
          color: "#0000FF",
          category: "sales",
          priority: 1,
          requiresDateRange: true,
          supportsExport: true,
          supportedExportFormats: ["pdf"],
          isEnabled: true,
          prerequisites: [],
          type: "report",
        },
        {
          key: "report2",
          name: "Expense Report",
          description: "Generate expense report",
          version: "2.0.0",
          icon: "chart-bar",
          color: "#FFFF00",
          category: "expenses",
          priority: 2,
          requiresDateRange: false,
          supportsExport: false,
          supportedExportFormats: [],
          isEnabled: false,
          prerequisites: ["receipts"],
          type: "report",
        },
      ];

      mockT.mockImplementation((key: string) => {
        const translations: Record<string, string> = {
          "plugins.report1.name": "Reporte de Ventas",
          "plugins.report1.description": "Generar reporte de ventas",
          "plugins.report2.name": "Reporte de Gastos",
          "plugins.report2.description": "Generar reporte de gastos",
        };
        return translations[key] || key;
      });

      // Act
      const { localizePlugins } = usePluginLocalization();
      const result = localizePlugins(plugins);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Reporte de Ventas");
      expect(result[0].description).toBe("Generar reporte de ventas");
      expect(result[1].name).toBe("Reporte de Gastos");
      expect(result[1].description).toBe("Generar reporte de gastos");
      expect(result[0].category).toBe("sales");
      expect(result[1].category).toBe("expenses");
    });

    it("should handle empty plugin array", () => {
      // Arrange
      const plugins: ReceiptPlugin[] = [];

      // Act
      const { localizePlugins } = usePluginLocalization();
      const result = localizePlugins(plugins);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(mockT).not.toHaveBeenCalled();
    });

    it("should handle mixed plugins with some translations missing", () => {
      // Arrange
      const plugins: ReportPlugin[] = [
        {
          key: "translated-plugin",
          name: "Translated Plugin",
          description: "Has translation",
          version: "1.0.0",
          icon: "check",
          color: "#00AA00",
          category: "test",
          priority: 1,
          requiresDateRange: false,
          supportsExport: true,
          supportedExportFormats: ["json"],
          isEnabled: true,
          prerequisites: [],
          type: "report",
        },
        {
          key: "untranslated-plugin",
          name: "Untranslated Plugin",
          description: "No translation",
          version: "1.0.0",
          icon: "x",
          color: "#AA0000",
          category: "test",
          priority: 2,
          requiresDateRange: true,
          supportsExport: false,
          supportedExportFormats: [],
          isEnabled: false,
          prerequisites: [],
          type: "report",
        },
      ];

      mockT.mockImplementation((key: string) => {
        if (key === "plugins.translated-plugin.name") {
          return "Plugin Traducido";
        }
        if (key === "plugins.translated-plugin.description") {
          return "Tiene traducción";
        }
        return key;
      });

      // Act
      const { localizePlugins } = usePluginLocalization();
      const result = localizePlugins(plugins);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Plugin Traducido");
      expect(result[0].description).toBe("Tiene traducción");
      expect(result[1].name).toBe("Untranslated Plugin"); // Falls back to original
      expect(result[1].description).toBe("No translation"); // Falls back to original
    });

    it("should preserve array immutability", () => {
      // Arrange
      const plugins: ReceiptPlugin[] = [
        {
          key: "test-plugin",
          name: "Test Plugin",
          description: "Test description",
          version: "1.0.0",
          supportedFileTypes: ["txt"],
          maxFileSizeKB: 1024,
          icon: "file",
          color: "#123456",
          supportsManualEntry: true,
          supportsBatchProcessing: false,
          requiresImageConversion: false,
          type: "receipt",
        },
      ];

      mockT.mockImplementation((key: string) => {
        if (key === "plugins.test-plugin.name") {
          return "Plugin de Prueba";
        }
        return key;
      });

      // Act
      const { localizePlugins } = usePluginLocalization();
      const result = localizePlugins(plugins);

      // Assert
      expect(plugins[0].name).toBe("Test Plugin"); // Original unchanged
      expect(result[0].name).toBe("Plugin de Prueba"); // Result has translation
      expect(result).not.toBe(plugins); // Different array references
      expect(result[0]).not.toBe(plugins[0]); // Different object references
    });

    it("should handle large plugin arrays efficiently", () => {
      // Arrange
      const plugins: ReceiptPlugin[] = Array.from(
        { length: 100 },
        (_, index) => ({
          key: `plugin-${index}`,
          name: `Plugin ${index}`,
          description: `Description ${index}`,
          version: "1.0.0",
          supportedFileTypes: ["txt"],
          maxFileSizeKB: 1024,
          icon: "file",
          color: `#${index.toString(16).padStart(6, "0")}`,
          supportsManualEntry: index % 2 === 0,
          supportsBatchProcessing: index % 3 === 0,
          requiresImageConversion: index % 4 === 0,
          type: "receipt",
        }),
      );

      mockT.mockImplementation((key: string) => key);

      // Act
      const { localizePlugins } = usePluginLocalization();
      const result = localizePlugins(plugins);

      // Assert
      expect(result).toHaveLength(100);
      expect(mockT).toHaveBeenCalledTimes(200); // 100 names + 100 descriptions
      result.forEach((plugin, index) => {
        expect(plugin.name).toBe(`Plugin ${index}`);
        expect(plugin.description).toBe(`Description ${index}`);
        expect(plugin.key).toBe(`plugin-${index}`);
      });
    });
  });

  describe("integration tests", () => {
    it("should work with different localization scenarios", () => {
      // Arrange
      const receiptPlugin: ReceiptPlugin = {
        key: "pdf-processor",
        name: "PDF Processor",
        description: "Process PDF files",
        version: "1.0.0",
        supportedFileTypes: ["pdf"],
        maxFileSizeKB: 2048,
        icon: "file-pdf",
        color: "#FF0000",
        supportsManualEntry: false,
        supportsBatchProcessing: true,
        requiresImageConversion: false,
        type: "receipt",
      };

      const reportPlugin: ReportPlugin = {
        key: "analytics-report",
        name: "Analytics Report",
        description: "Generate analytics",
        version: "2.0.0",
        icon: "chart-line",
        color: "#00FF00",
        category: "analytics",
        priority: 1,
        requiresDateRange: true,
        supportsExport: true,
        supportedExportFormats: ["pdf", "csv"],
        isEnabled: true,
        prerequisites: [],
        type: "report",
      };

      mockT.mockImplementation((key: string) => {
        const translations: Record<string, string> = {
          "plugins.pdf-processor.name": "Procesador PDF",
          "plugins.pdf-processor.description": "Procesar archivos PDF",
          "plugins.analytics-report.name": "Reporte de Análisis",
          "plugins.analytics-report.description": "Generar análisis",
        };
        return translations[key] || key;
      });

      // Act
      const {
        getLocalizedPluginName,
        getLocalizedPluginDescription,
        localizePlugin,
        localizePlugins,
      } = usePluginLocalization();

      // Assert individual functions
      expect(getLocalizedPluginName(receiptPlugin)).toBe("Procesador PDF");
      expect(getLocalizedPluginDescription(receiptPlugin)).toBe(
        "Procesar archivos PDF",
      );
      expect(getLocalizedPluginName(reportPlugin)).toBe("Reporte de Análisis");
      expect(getLocalizedPluginDescription(reportPlugin)).toBe(
        "Generar análisis",
      );

      // Assert localizePlugin function
      const localizedReceipt = localizePlugin(receiptPlugin);
      const localizedReport = localizePlugin(reportPlugin);

      expect(localizedReceipt.name).toBe("Procesador PDF");
      expect(localizedReceipt.description).toBe("Procesar archivos PDF");
      expect(localizedReport.name).toBe("Reporte de Análisis");
      expect(localizedReport.description).toBe("Generar análisis");

      // Assert localizePlugins function
      const localizedPlugins = localizePlugins([receiptPlugin, reportPlugin]);
      expect(localizedPlugins).toHaveLength(2);
      expect(localizedPlugins[0].name).toBe("Procesador PDF");
      expect(localizedPlugins[1].name).toBe("Reporte de Análisis");
    });

    it("should handle i18n function errors gracefully", () => {
      // Arrange
      const plugin: ReceiptPlugin = {
        key: "error-test",
        name: "Error Test Plugin",
        description: "Test error handling",
        version: "1.0.0",
        supportedFileTypes: ["txt"],
        maxFileSizeKB: 1024,
        icon: "file",
        color: "#000000",
        supportsManualEntry: true,
        supportsBatchProcessing: false,
        requiresImageConversion: false,
        type: "receipt",
      };

      // Mock t to throw an error
      mockT.mockImplementation(() => {
        throw new Error("Translation error");
      });

      // Act & Assert
      const { getLocalizedPluginName, getLocalizedPluginDescription } =
        usePluginLocalization();

      expect(() => getLocalizedPluginName(plugin)).toThrow("Translation error");
      expect(() => getLocalizedPluginDescription(plugin)).toThrow(
        "Translation error",
      );
    });

    it("should maintain consistent behavior across all functions", () => {
      // Arrange
      const plugins: (ReceiptPlugin | ReportPlugin)[] = [
        {
          key: "consistent-test-1",
          name: "Consistent Test 1",
          description: "First consistent test",
          version: "1.0.0",
          supportedFileTypes: ["txt"],
          maxFileSizeKB: 1024,
          icon: "file",
          color: "#111111",
          supportsManualEntry: true,
          supportsBatchProcessing: false,
          requiresImageConversion: false,
          type: "receipt",
        },
        {
          key: "consistent-test-2",
          name: "Consistent Test 2",
          description: "Second consistent test",
          version: "2.0.0",
          icon: "chart",
          color: "#222222",
          category: "test",
          priority: 1,
          requiresDateRange: false,
          supportsExport: true,
          supportedExportFormats: ["json"],
          isEnabled: true,
          prerequisites: [],
          type: "report",
        },
      ];

      mockT.mockImplementation((key: string) => {
        const translations: Record<string, string> = {
          "plugins.consistent-test-1.name": "Prueba Consistente 1",
          "plugins.consistent-test-1.description": "Primera prueba consistente",
          "plugins.consistent-test-2.name": "Prueba Consistente 2",
          "plugins.consistent-test-2.description": "Segunda prueba consistente",
        };
        return translations[key] || key;
      });

      // Act
      const {
        getLocalizedPluginName,
        getLocalizedPluginDescription,
        localizePlugin,
        localizePlugins,
      } = usePluginLocalization();

      // Assert consistent behavior
      plugins.forEach((plugin, index) => {
        const individualName = getLocalizedPluginName(plugin);
        const individualDescription = getLocalizedPluginDescription(plugin);
        const localizedSingle = localizePlugin(plugin);
        const localizedFromArray = localizePlugins([plugin])[0];

        expect(individualName).toBe(`Prueba Consistente ${index + 1}`);
        expect(individualDescription).toBe(
          `${index === 0 ? "Primera" : "Segunda"} prueba consistente`,
        );
        expect(localizedSingle.name).toBe(individualName);
        expect(localizedSingle.description).toBe(individualDescription);
        expect(localizedFromArray.name).toBe(individualName);
        expect(localizedFromArray.description).toBe(individualDescription);
      });

      // Assert batch localization
      const localizedAll = localizePlugins(plugins);
      expect(localizedAll).toHaveLength(2);
      expect(localizedAll[0].name).toBe("Prueba Consistente 1");
      expect(localizedAll[1].name).toBe("Prueba Consistente 2");
    });
  });
});
