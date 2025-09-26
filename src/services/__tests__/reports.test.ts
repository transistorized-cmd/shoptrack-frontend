import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reportsService } from "../reports";
import api from "../api";
import type { ReportRequest, ReportData } from "@/types/report";

// Mock the API module
vi.mock("../api", () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

describe("reportsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("generateReport", () => {
    it("should generate a report with correct API call", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "sales-summary",
        dateRange: {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        parameters: {
          includeCategories: true,
          groupByWeek: false,
        },
      };

      const mockReportData: ReportData = {
        title: "Sales Summary Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: mockRequest.dateRange,
        data: {
          totalSales: 1500.5,
          itemCount: 45,
          categories: ["Groceries", "Electronics"],
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

      mockApi.post.mockResolvedValue({
        data: mockReportData,
      });

      // Act
      const result = await reportsService.generateReport(mockRequest);

      // Assert
      expect(mockApi.post).toHaveBeenCalledTimes(1);
      expect(mockApi.post).toHaveBeenCalledWith(
        "/reports/sales-summary/generate",
        {
          dateRange: mockRequest.dateRange,
          parameters: mockRequest.parameters,
        },
      );
      expect(result).toEqual(mockReportData);
    });

    it("should handle empty parameters", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "simple-report",
        dateRange: {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        parameters: {},
      };

      const mockReportData: ReportData = {
        title: "Simple Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: mockRequest.dateRange,
        data: {},
      };

      mockApi.post.mockResolvedValue({
        data: mockReportData,
      });

      // Act
      const result = await reportsService.generateReport(mockRequest);

      // Assert
      expect(mockApi.post).toHaveBeenCalledWith(
        "/reports/simple-report/generate",
        {
          dateRange: mockRequest.dateRange,
          parameters: {},
        },
      );
      expect(result).toEqual(mockReportData);
    });

    it("should handle different plugin keys", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "expense-tracking",
        dateRange: {
          startDate: "2024-02-01",
          endDate: "2024-02-28",
        },
        parameters: {
          currency: "USD",
          includeSubcategories: true,
        },
      };

      mockApi.post.mockResolvedValue({
        data: { title: "Expense Tracking Report" },
      });

      // Act
      await reportsService.generateReport(mockRequest);

      // Assert
      expect(mockApi.post).toHaveBeenCalledWith(
        "/reports/expense-tracking/generate",
        expect.any(Object),
      );
    });

    it("should propagate API errors", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "failing-report",
        dateRange: {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        parameters: {},
      };

      const mockError = new Error("Report generation failed");
      mockApi.post.mockRejectedValue(mockError);

      // Act & Assert
      await expect(reportsService.generateReport(mockRequest)).rejects.toThrow(
        "Report generation failed",
      );
      expect(mockApi.post).toHaveBeenCalledTimes(1);
    });

    it("should handle network errors", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "network-error",
        dateRange: {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        parameters: {},
      };

      mockApi.post.mockRejectedValue(new Error("Network Error"));

      // Act & Assert
      await expect(reportsService.generateReport(mockRequest)).rejects.toThrow(
        "Network Error",
      );
    });

    it("should handle complex parameters", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "complex-report",
        dateRange: {
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        },
        parameters: {
          filters: {
            categories: ["Electronics", "Clothing"],
            priceRange: { min: 10, max: 500 },
            stores: ["Store A", "Store B"],
          },
          grouping: {
            by: "month",
            includeEmpty: false,
          },
          sorting: {
            field: "total",
            direction: "desc",
          },
        },
      };

      mockApi.post.mockResolvedValue({
        data: { title: "Complex Report" },
      });

      // Act
      await reportsService.generateReport(mockRequest);

      // Assert
      expect(mockApi.post).toHaveBeenCalledWith(
        "/reports/complex-report/generate",
        {
          dateRange: mockRequest.dateRange,
          parameters: mockRequest.parameters,
        },
      );
    });
  });

  describe("exportReport", () => {
    it("should export report as PDF with correct API call", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "sales-summary",
        dateRange: {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        parameters: {
          includeCharts: true,
        },
      };

      const mockBlob = new Blob(["PDF content"], { type: "application/pdf" });
      mockApi.post.mockResolvedValue({
        data: mockBlob,
      });

      // Act
      const result = await reportsService.exportReport(mockRequest, "pdf");

      // Assert
      expect(mockApi.post).toHaveBeenCalledTimes(1);
      expect(mockApi.post).toHaveBeenCalledWith(
        "/reports/sales-summary/export",
        {
          dateRange: mockRequest.dateRange,
          parameters: mockRequest.parameters,
        },
        {
          params: { format: "pdf" },
          responseType: "blob",
        },
      );
      expect(result).toEqual(mockBlob);
      expect(result.type).toBe("application/pdf");
    });

    it("should export report as CSV", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "data-export",
        dateRange: {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        parameters: {},
      };

      const mockBlob = new Blob(["CSV content"], { type: "text/csv" });
      mockApi.post.mockResolvedValue({
        data: mockBlob,
      });

      // Act
      const result = await reportsService.exportReport(mockRequest, "csv");

      // Assert
      expect(mockApi.post).toHaveBeenCalledWith(
        "/reports/data-export/export",
        {
          dateRange: mockRequest.dateRange,
          parameters: {},
        },
        {
          params: { format: "csv" },
          responseType: "blob",
        },
      );
      expect(result).toEqual(mockBlob);
    });

    it("should export report as Excel", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "financial-report",
        dateRange: {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        parameters: {
          includeFormulas: true,
          worksheetName: "Financial Data",
        },
      };

      const mockBlob = new Blob(["Excel content"], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      mockApi.post.mockResolvedValue({
        data: mockBlob,
      });

      // Act
      const result = await reportsService.exportReport(mockRequest, "xlsx");

      // Assert
      expect(mockApi.post).toHaveBeenCalledWith(
        "/reports/financial-report/export",
        {
          dateRange: mockRequest.dateRange,
          parameters: mockRequest.parameters,
        },
        {
          params: { format: "xlsx" },
          responseType: "blob",
        },
      );
      expect(result).toEqual(mockBlob);
    });

    it("should handle export errors", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "failing-export",
        dateRange: {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        parameters: {},
      };

      const mockError = new Error("Export failed");
      mockApi.post.mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        reportsService.exportReport(mockRequest, "pdf"),
      ).rejects.toThrow("Export failed");
      expect(mockApi.post).toHaveBeenCalledTimes(1);
    });

    it("should handle different format types", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "multi-format",
        dateRange: {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        parameters: {},
      };

      const formats = ["pdf", "csv", "xlsx", "json"];
      const mockBlob = new Blob(["content"]);

      for (const format of formats) {
        mockApi.post.mockResolvedValue({ data: mockBlob });

        // Act
        await reportsService.exportReport(mockRequest, format);

        // Assert
        expect(mockApi.post).toHaveBeenCalledWith(
          "/reports/multi-format/export",
          expect.any(Object),
          expect.objectContaining({
            params: { format },
            responseType: "blob",
          }),
        );

        vi.clearAllMocks();
      }
    });

    it("should handle large export files", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "large-dataset",
        dateRange: {
          startDate: "2023-01-01",
          endDate: "2023-12-31",
        },
        parameters: {
          includeAllTransactions: true,
          detailLevel: "full",
        },
      };

      // Simulate large file
      const largeContent = "x".repeat(10000000); // 10MB of content
      const mockBlob = new Blob([largeContent], { type: "application/pdf" });
      mockApi.post.mockResolvedValue({
        data: mockBlob,
      });

      // Act
      const result = await reportsService.exportReport(mockRequest, "pdf");

      // Assert
      expect(result).toEqual(mockBlob);
      expect(result.size).toBe(largeContent.length);
    });

    it("should handle special characters in plugin keys", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "special-chars-report",
        dateRange: {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        parameters: {},
      };

      const mockBlob = new Blob(["content"]);
      mockApi.post.mockResolvedValue({ data: mockBlob });

      // Act
      await reportsService.exportReport(mockRequest, "pdf");

      // Assert
      expect(mockApi.post).toHaveBeenCalledWith(
        "/reports/special-chars-report/export",
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe("service integration", () => {
    it("should work with generateReport and exportReport in sequence", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "integration-test",
        dateRange: {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        parameters: {},
      };

      const mockReportData: ReportData = {
        title: "Integration Test Report",
        generatedAt: "2024-01-31T10:00:00Z",
        dateRange: mockRequest.dateRange,
        data: {},
      };

      const mockBlob = new Blob(["exported content"]);

      mockApi.post.mockResolvedValueOnce({ data: mockReportData });
      mockApi.post.mockResolvedValueOnce({ data: mockBlob });

      // Act
      const reportData = await reportsService.generateReport(mockRequest);
      const exportedBlob = await reportsService.exportReport(
        mockRequest,
        "pdf",
      );

      // Assert
      expect(reportData).toEqual(mockReportData);
      expect(exportedBlob).toEqual(mockBlob);
      expect(mockApi.post).toHaveBeenCalledTimes(2);
    });
  });

  describe("edge cases", () => {
    it("should handle undefined parameters gracefully", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "undefined-params",
        dateRange: {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        parameters: undefined as any,
      };

      mockApi.post.mockResolvedValue({ data: {} });

      // Act
      await reportsService.generateReport(mockRequest);

      // Assert
      expect(mockApi.post).toHaveBeenCalledWith(
        "/reports/undefined-params/generate",
        {
          dateRange: mockRequest.dateRange,
          parameters: undefined,
        },
      );
    });

    it("should handle null date ranges", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "null-dates",
        dateRange: null as any,
        parameters: {},
      };

      mockApi.post.mockResolvedValue({ data: {} });

      // Act
      await reportsService.generateReport(mockRequest);

      // Assert
      expect(mockApi.post).toHaveBeenCalledWith(
        "/reports/null-dates/generate",
        {
          dateRange: null,
          parameters: {},
        },
      );
    });

    it("should handle empty plugin key", async () => {
      // Arrange
      const mockRequest: ReportRequest = {
        pluginKey: "",
        dateRange: {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        parameters: {},
      };

      mockApi.post.mockResolvedValue({ data: {} });

      // Act
      await reportsService.generateReport(mockRequest);

      // Assert
      expect(mockApi.post).toHaveBeenCalledWith(
        "/reports//generate",
        expect.any(Object),
      );
    });
  });
});
