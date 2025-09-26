import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useReportsStore } from "../reports";
import { reportsService } from "@/services/reports";
import type { ReportData, ReportRequest } from "@/types/report";

// Mock the reports service
vi.mock("@/services/reports", () => ({
  reportsService: {
    generateReport: vi.fn(),
    exportReport: vi.fn(),
  },
}));

// Mock DOM APIs
const mockCreateElement = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

Object.defineProperty(document, "createElement", { value: mockCreateElement });
Object.defineProperty(document.body, "appendChild", { value: mockAppendChild });
Object.defineProperty(document.body, "removeChild", { value: mockRemoveChild });
Object.defineProperty(window, "URL", {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
});

// Mock console methods
const mockConsole = {
  error: vi.fn(),
};

Object.defineProperty(console, "error", { value: mockConsole.error });

const mockReportsService = vi.mocked(reportsService);

describe("useReportsStore", () => {
  let store: ReturnType<typeof useReportsStore>;

  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia());
    store = useReportsStore();
    vi.clearAllMocks();

    // Setup default DOM mocks
    const mockLink = {
      href: "",
      download: "",
      click: mockClick,
    };
    mockCreateElement.mockReturnValue(mockLink);
    mockCreateObjectURL.mockReturnValue("mock-blob-url");
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      expect(store.reports).toBeInstanceOf(Map);
      expect(store.reports.size).toBe(0);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.currentReport).toBeNull();
    });
  });

  describe("generateReport", () => {
    it("should generate report successfully", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "sales-summary",
        dateRange: {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        parameters: {
          includeCategories: true,
        },
      };

      const mockReportData: ReportData = {
        title: "Sales Summary Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: mockRequest.dateRange,
        data: {
          totalSales: 1500.5,
          itemCount: 45,
        },
        chartData: {
          labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
          datasets: [
            {
              label: "Sales",
              data: [400, 300, 500, 300.5],
            },
          ],
        },
      };

      mockReportsService.generateReport.mockResolvedValue(mockReportData);

      // Act
      const result = await store.generateReport(mockRequest);

      // Assert
      expect(mockReportsService.generateReport).toHaveBeenCalledTimes(1);
      expect(mockReportsService.generateReport).toHaveBeenCalledWith(
        mockRequest,
      );
      expect(result).toEqual(mockReportData);
      expect(store.currentReport).toEqual(mockReportData);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();

      // Check that report was cached
      const cachedReport = store.getCachedReport(mockRequest);
      expect(cachedReport).toEqual(mockReportData);
      expect(store.reports.size).toBe(1);
    });

    it("should set loading state during report generation", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "test",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const mockReportData: ReportData = {
        title: "Test Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: mockRequest.dateRange,
        data: {},
      };

      let resolvePromise: (value: ReportData) => void;
      const pendingPromise = new Promise<ReportData>((resolve) => {
        resolvePromise = resolve;
      });

      mockReportsService.generateReport.mockReturnValue(pendingPromise);

      // Act
      const reportPromise = store.generateReport(mockRequest);

      // Assert loading state
      expect(store.loading).toBe(true);
      expect(store.error).toBeNull();

      // Resolve the promise
      resolvePromise!(mockReportData);
      await reportPromise;

      // Assert final state
      expect(store.loading).toBe(false);
      expect(store.currentReport).toEqual(mockReportData);
    });

    it("should handle report generation errors", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "failing-report",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const mockError = new Error("Report generation failed");
      mockReportsService.generateReport.mockRejectedValue(mockError);

      // Act & Assert
      await expect(store.generateReport(mockRequest)).rejects.toThrow(
        "Report generation failed",
      );

      expect(store.loading).toBe(false);
      expect(store.error).toBe("Report generation failed");
      expect(store.currentReport).toBeNull();
      expect(mockConsole.error).toHaveBeenCalledWith(
        "Error generating report:",
        mockError,
      );
      expect(store.reports.size).toBe(0); // No caching on error
    });

    it("should handle non-Error objects", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "string-error",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      mockReportsService.generateReport.mockRejectedValue(
        "String error message",
      );

      // Act & Assert
      await expect(store.generateReport(mockRequest)).rejects.toThrow(
        "String error message",
      );

      expect(store.error).toBe("Failed to generate report");
      expect(mockConsole.error).toHaveBeenCalledWith(
        "Error generating report:",
        "String error message",
      );
    });

    it("should generate correct cache key for different requests", async () => {
      // Arrange
      const requests: ReportRequest[] = [
        {
          pluginKey: "sales-summary",
          dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
          parameters: { includeCategories: true },
        },
        {
          pluginKey: "expense-tracking",
          dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
          parameters: { includeCategories: true },
        },
        {
          pluginKey: "sales-summary",
          dateRange: { startDate: "2024-02-01", endDate: "2024-02-28" },
          parameters: { includeCategories: true },
        },
        {
          pluginKey: "sales-summary",
          dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
          parameters: { includeCategories: false },
        },
      ];

      const mockReportData: ReportData = {
        title: "Test Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        data: {},
      };

      mockReportsService.generateReport.mockResolvedValue(mockReportData);

      // Act
      for (const request of requests) {
        await store.generateReport(request);
      }

      // Assert
      expect(store.reports.size).toBe(4); // All requests should have different cache keys
      expect(mockReportsService.generateReport).toHaveBeenCalledTimes(4);

      // Each request should be retrievable from cache
      for (const request of requests) {
        const cachedReport = store.getCachedReport(request);
        expect(cachedReport).toEqual(mockReportData);
      }
    });

    it("should reuse cached reports for identical requests", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "cached-report",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: { test: true },
      };

      const mockReportData: ReportData = {
        title: "Cached Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: mockRequest.dateRange,
        data: {},
      };

      mockReportsService.generateReport.mockResolvedValue(mockReportData);

      // Act
      const result1 = await store.generateReport(mockRequest);

      // Generate same report again
      const result2 = await store.generateReport(mockRequest);

      // Assert
      expect(result1).toEqual(mockReportData);
      expect(result2).toEqual(mockReportData);
      expect(mockReportsService.generateReport).toHaveBeenCalledTimes(2); // Store doesn't auto-use cache in generateReport
      expect(store.reports.size).toBe(1); // Same cache key, so only one entry
    });

    it("should clear error state on successful generation", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "error-clear-test",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      // First, set an error state
      store.error = "Previous error";

      const mockReportData: ReportData = {
        title: "Success Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: mockRequest.dateRange,
        data: {},
      };

      mockReportsService.generateReport.mockResolvedValue(mockReportData);

      // Act
      await store.generateReport(mockRequest);

      // Assert
      expect(store.error).toBeNull(); // Error should be cleared
      expect(store.currentReport).toEqual(mockReportData);
    });
  });

  describe("exportReport", () => {
    it("should export report as PDF successfully", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "export-test",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const mockBlob = new Blob(["PDF content"], { type: "application/pdf" });
      mockReportsService.exportReport.mockResolvedValue(mockBlob);

      // Act
      await store.exportReport(mockRequest, "pdf");

      // Assert
      expect(mockReportsService.exportReport).toHaveBeenCalledTimes(1);
      expect(mockReportsService.exportReport).toHaveBeenCalledWith(
        mockRequest,
        "pdf",
      );
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();

      // Check DOM operations
      expect(mockCreateElement).toHaveBeenCalledWith("a");
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("mock-blob-url");

      // Check link attributes
      const mockLink = mockCreateElement.mock.results[0].value;
      expect(mockLink.href).toBe("mock-blob-url");
      expect(mockLink.download).toBe("export-test-report.pdf");
    });

    it("should export report in different formats", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "multi-format",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const formats = [
        { format: "pdf", mimeType: "application/pdf" },
        { format: "csv", mimeType: "text/csv" },
        {
          format: "xlsx",
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        { format: "json", mimeType: "application/json" },
      ];

      for (const { format, mimeType } of formats) {
        const mockBlob = new Blob(["content"], { type: mimeType });
        mockReportsService.exportReport.mockResolvedValue(mockBlob);

        // Act
        await store.exportReport(mockRequest, format);

        // Assert
        expect(mockReportsService.exportReport).toHaveBeenCalledWith(
          mockRequest,
          format,
        );

        const mockLink =
          mockCreateElement.mock.results[
            mockCreateElement.mock.results.length - 1
          ].value;
        expect(mockLink.download).toBe(`multi-format-report.${format}`);

        vi.clearAllMocks();
        mockCreateElement.mockReturnValue({
          href: "",
          download: "",
          click: mockClick,
        });
        mockCreateObjectURL.mockReturnValue("mock-blob-url");
      }
    });

    it("should set loading state during export", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "loading-test",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const mockBlob = new Blob(["content"]);
      let resolvePromise: (value: Blob) => void;
      const pendingPromise = new Promise<Blob>((resolve) => {
        resolvePromise = resolve;
      });

      mockReportsService.exportReport.mockReturnValue(pendingPromise);

      // Act
      const exportPromise = store.exportReport(mockRequest, "pdf");

      // Assert loading state
      expect(store.loading).toBe(true);
      expect(store.error).toBeNull();

      // Resolve the promise
      resolvePromise!(mockBlob);
      await exportPromise;

      // Assert final state
      expect(store.loading).toBe(false);
    });

    it("should handle export errors", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "failing-export",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const mockError = new Error("Export failed");
      mockReportsService.exportReport.mockRejectedValue(mockError);

      // Act & Assert
      await expect(store.exportReport(mockRequest, "pdf")).rejects.toThrow(
        "Export failed",
      );

      expect(store.loading).toBe(false);
      expect(store.error).toBe("Export failed");
      expect(mockConsole.error).toHaveBeenCalledWith(
        "Error exporting report:",
        mockError,
      );

      // Ensure no DOM operations were performed
      expect(mockCreateElement).not.toHaveBeenCalled();
      expect(mockCreateObjectURL).not.toHaveBeenCalled();
    });

    it("should handle non-Error objects in export", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "string-error-export",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      mockReportsService.exportReport.mockRejectedValue("Export string error");

      // Act & Assert
      await expect(store.exportReport(mockRequest, "pdf")).rejects.toThrow(
        "Export string error",
      );

      expect(store.error).toBe("Failed to export report");
      expect(mockConsole.error).toHaveBeenCalledWith(
        "Error exporting report:",
        "Export string error",
      );
    });

    it("should clear error state before export", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "error-clear-export",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      // Set previous error
      store.error = "Previous export error";

      const mockBlob = new Blob(["content"]);
      mockReportsService.exportReport.mockResolvedValue(mockBlob);

      // Act
      await store.exportReport(mockRequest, "pdf");

      // Assert
      expect(store.error).toBeNull();
    });

    it("should handle special characters in plugin key for filename", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "special-chars/plugin:name",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const mockBlob = new Blob(["content"]);
      mockReportsService.exportReport.mockResolvedValue(mockBlob);

      // Act
      await store.exportReport(mockRequest, "pdf");

      // Assert
      const mockLink = mockCreateElement.mock.results[0].value;
      expect(mockLink.download).toBe("special-chars/plugin:name-report.pdf");
      // The browser will sanitize the filename automatically
    });
  });

  describe("getCachedReport", () => {
    it("should retrieve cached report correctly", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "cached-test",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: { cached: true },
      };

      const mockReportData: ReportData = {
        title: "Cached Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: mockRequest.dateRange,
        data: {},
      };

      mockReportsService.generateReport.mockResolvedValue(mockReportData);

      // First generate the report to cache it
      await store.generateReport(mockRequest);

      // Act
      const cachedReport = store.getCachedReport(mockRequest);

      // Assert
      expect(cachedReport).toEqual(mockReportData);
    });

    it("should return undefined for non-cached report", () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "not-cached",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      // Act
      const cachedReport = store.getCachedReport(mockRequest);

      // Assert
      expect(cachedReport).toBeUndefined();
    });

    it("should distinguish between different cache keys", async () => {
      // Arrange
      const request1: ReportRequest = {
        pluginKey: "test-1",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const request2: ReportRequest = {
        pluginKey: "test-2",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const reportData1: ReportData = {
        title: "Report 1",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: request1.dateRange,
        data: { id: 1 },
      };

      const reportData2: ReportData = {
        title: "Report 2",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: request2.dateRange,
        data: { id: 2 },
      };

      mockReportsService.generateReport
        .mockResolvedValueOnce(reportData1)
        .mockResolvedValueOnce(reportData2);

      // Generate both reports
      await store.generateReport(request1);
      await store.generateReport(request2);

      // Act & Assert
      expect(store.getCachedReport(request1)).toEqual(reportData1);
      expect(store.getCachedReport(request2)).toEqual(reportData2);
      expect(store.reports.size).toBe(2);
    });
  });

  describe("clearCache", () => {
    it("should clear all cached reports", async () => {
      // Arrange
      const mockRequests: ReportRequest[] = [
        {
          pluginKey: "report-1",
          dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
          parameters: {},
        },
        {
          pluginKey: "report-2",
          dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
          parameters: {},
        },
      ];

      const mockReportData: ReportData = {
        title: "Test Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        data: {},
      };

      mockReportsService.generateReport.mockResolvedValue(mockReportData);

      // Generate multiple reports to cache them
      for (const request of mockRequests) {
        await store.generateReport(request);
      }

      expect(store.reports.size).toBe(2);

      // Act
      store.clearCache();

      // Assert
      expect(store.reports.size).toBe(0);
      for (const request of mockRequests) {
        expect(store.getCachedReport(request)).toBeUndefined();
      }
    });

    it("should not affect other state when clearing cache", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "state-test",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const mockReportData: ReportData = {
        title: "State Test Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: mockRequest.dateRange,
        data: {},
      };

      mockReportsService.generateReport.mockResolvedValue(mockReportData);

      await store.generateReport(mockRequest);
      store.error = "Test error";

      // Act
      store.clearCache();

      // Assert
      expect(store.reports.size).toBe(0);
      expect(store.currentReport).toEqual(mockReportData); // Should not be affected
      expect(store.error).toBe("Test error"); // Should not be affected
      expect(store.loading).toBe(false); // Should not be affected
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      // Arrange
      store.error = "Test error message";

      // Act
      store.clearError();

      // Assert
      expect(store.error).toBeNull();
    });

    it("should not affect other state when clearing error", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "error-test",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const mockReportData: ReportData = {
        title: "Error Test Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: mockRequest.dateRange,
        data: {},
      };

      mockReportsService.generateReport.mockResolvedValue(mockReportData);

      await store.generateReport(mockRequest);
      store.error = "Test error";

      // Act
      store.clearError();

      // Assert
      expect(store.error).toBeNull();
      expect(store.currentReport).toEqual(mockReportData); // Should not be affected
      expect(store.reports.size).toBe(1); // Should not be affected
      expect(store.loading).toBe(false); // Should not be affected
    });
  });

  describe("clearCurrentReport", () => {
    it("should clear current report", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "current-test",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const mockReportData: ReportData = {
        title: "Current Test Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: mockRequest.dateRange,
        data: {},
      };

      mockReportsService.generateReport.mockResolvedValue(mockReportData);

      await store.generateReport(mockRequest);
      expect(store.currentReport).toEqual(mockReportData);

      // Act
      store.clearCurrentReport();

      // Assert
      expect(store.currentReport).toBeNull();
    });

    it("should not affect other state when clearing current report", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "current-clear-test",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const mockReportData: ReportData = {
        title: "Current Clear Test Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: mockRequest.dateRange,
        data: {},
      };

      mockReportsService.generateReport.mockResolvedValue(mockReportData);

      await store.generateReport(mockRequest);
      store.error = "Test error";

      // Act
      store.clearCurrentReport();

      // Assert
      expect(store.currentReport).toBeNull();
      expect(store.reports.size).toBe(1); // Cache should not be affected
      expect(store.getCachedReport(mockRequest)).toEqual(mockReportData);
      expect(store.error).toBe("Test error"); // Should not be affected
      expect(store.loading).toBe(false); // Should not be affected
    });
  });

  describe("store integration", () => {
    it("should handle multiple operations in sequence", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "integration-test",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const mockReportData: ReportData = {
        title: "Integration Test Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: mockRequest.dateRange,
        data: {},
      };

      const mockBlob = new Blob(["export content"]);

      mockReportsService.generateReport.mockResolvedValue(mockReportData);
      mockReportsService.exportReport.mockResolvedValue(mockBlob);

      // Act
      const reportData = await store.generateReport(mockRequest);
      const cachedReport = store.getCachedReport(mockRequest);
      await store.exportReport(mockRequest, "pdf");
      store.clearError();
      store.clearCurrentReport();

      // Assert
      expect(reportData).toEqual(mockReportData);
      expect(cachedReport).toEqual(mockReportData);
      expect(store.error).toBeNull();
      expect(store.currentReport).toBeNull();
      expect(store.reports.size).toBe(1); // Cache should still contain the report

      expect(mockReportsService.generateReport).toHaveBeenCalledTimes(1);
      expect(mockReportsService.exportReport).toHaveBeenCalledTimes(1);
    });

    it("should handle concurrent operations", async () => {
      // Arrange
      const requests: ReportRequest[] = [
        {
          pluginKey: "concurrent-1",
          dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
          parameters: {},
        },
        {
          pluginKey: "concurrent-2",
          dateRange: { startDate: "2024-02-01", endDate: "2024-02-28" },
          parameters: {},
        },
        {
          pluginKey: "concurrent-3",
          dateRange: { startDate: "2024-03-01", endDate: "2024-03-31" },
          parameters: {},
        },
      ];

      const mockReportData: ReportData = {
        title: "Concurrent Test Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        data: {},
      };

      mockReportsService.generateReport.mockResolvedValue(mockReportData);

      // Act
      const promises = requests.map((request) => store.generateReport(request));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toEqual(mockReportData);
      });
      expect(store.reports.size).toBe(3); // All should be cached with different keys
      expect(mockReportsService.generateReport).toHaveBeenCalledTimes(3);
    });

    it("should maintain state consistency across operations", async () => {
      // Arrange
      const successRequest: ReportRequest = {
        pluginKey: "success",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const failRequest: ReportRequest = {
        pluginKey: "fail",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const mockReportData: ReportData = {
        title: "Success Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: successRequest.dateRange,
        data: {},
      };

      mockReportsService.generateReport
        .mockResolvedValueOnce(mockReportData)
        .mockRejectedValueOnce(new Error("Generation failed"));

      // Act & Assert
      // Successful generation
      const successResult = await store.generateReport(successRequest);
      expect(successResult).toEqual(mockReportData);
      expect(store.error).toBeNull();
      expect(store.currentReport).toEqual(mockReportData);

      // Failed generation
      await expect(store.generateReport(failRequest)).rejects.toThrow(
        "Generation failed",
      );
      expect(store.error).toBe("Generation failed");
      expect(store.currentReport).toBeNull(); // Should be cleared on error

      // Cache should only contain successful report
      expect(store.reports.size).toBe(1);
      expect(store.getCachedReport(successRequest)).toEqual(mockReportData);
      expect(store.getCachedReport(failRequest)).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle empty plugin key", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const mockReportData: ReportData = {
        title: "Empty Plugin Key Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: mockRequest.dateRange,
        data: {},
      };

      mockReportsService.generateReport.mockResolvedValue(mockReportData);

      // Act
      const result = await store.generateReport(mockRequest);

      // Assert
      expect(result).toEqual(mockReportData);
      expect(store.getCachedReport(mockRequest)).toEqual(mockReportData);
    });

    it("should handle complex nested parameters in cache key", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "complex-params",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {
          filters: {
            categories: ["A", "B"],
            priceRange: { min: 10, max: 100 },
          },
          nested: {
            deep: {
              value: "test",
            },
          },
          array: [1, 2, 3],
        },
      };

      const mockReportData: ReportData = {
        title: "Complex Params Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: mockRequest.dateRange,
        data: {},
      };

      mockReportsService.generateReport.mockResolvedValue(mockReportData);

      // Act
      const result = await store.generateReport(mockRequest);

      // Assert
      expect(result).toEqual(mockReportData);
      expect(store.getCachedReport(mockRequest)).toEqual(mockReportData);
    });

    it("should handle null and undefined values in parameters", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "null-params",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {
          nullValue: null,
          undefinedValue: undefined,
          emptyString: "",
          zeroValue: 0,
          falseValue: false,
        },
      };

      const mockReportData: ReportData = {
        title: "Null Params Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: mockRequest.dateRange,
        data: {},
      };

      mockReportsService.generateReport.mockResolvedValue(mockReportData);

      // Act
      const result = await store.generateReport(mockRequest);

      // Assert
      expect(result).toEqual(mockReportData);
      expect(store.getCachedReport(mockRequest)).toEqual(mockReportData);
    });

    it("should handle DOM operations failure gracefully", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "dom-failure",
        dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" },
        parameters: {},
      };

      const mockBlob = new Blob(["content"]);
      mockReportsService.exportReport.mockResolvedValue(mockBlob);

      // Mock DOM operations to fail
      mockCreateElement.mockImplementation(() => {
        throw new Error("DOM operation failed");
      });

      // Act & Assert
      await expect(store.exportReport(mockRequest, "pdf")).rejects.toThrow(
        "DOM operation failed",
      );
      expect(store.error).toBe("DOM operation failed");
    });
  });
});
