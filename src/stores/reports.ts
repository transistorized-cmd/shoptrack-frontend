import { defineStore } from "pinia";
import { ref } from "vue";
import type { ReportData, ReportRequest, DateRange } from "@/types/report";
import { reportsService } from "@/services/reports";

export const useReportsStore = defineStore("reports", () => {
  // State
  const reports = ref<Map<string, ReportData>>(new Map());
  const loading = ref(false);
  const error = ref<string | null>(null);
  const currentReport = ref<ReportData | null>(null);

  // Actions
  const generateReport = async (
    request: ReportRequest,
  ): Promise<ReportData> => {
    loading.value = true;
    error.value = null;

    try {
      const reportData = await reportsService.generateReport(request);

      // Cache the report
      const cacheKey = `${request.pluginKey}-${JSON.stringify(request.dateRange)}-${JSON.stringify(request.parameters)}`;
      reports.value.set(cacheKey, reportData);

      currentReport.value = reportData;
      return reportData;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to generate report";
      console.error("Error generating report:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const exportReport = async (
    request: ReportRequest,
    format: string,
  ): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const blob = await reportsService.exportReport(request, format);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${request.pluginKey}-report.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to export report";
      console.error("Error exporting report:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getCachedReport = (request: ReportRequest): ReportData | undefined => {
    const cacheKey = `${request.pluginKey}-${JSON.stringify(request.dateRange)}-${JSON.stringify(request.parameters)}`;
    return reports.value.get(cacheKey);
  };

  const clearCache = () => {
    reports.value.clear();
  };

  const clearError = () => {
    error.value = null;
  };

  const clearCurrentReport = () => {
    currentReport.value = null;
  };

  return {
    // State
    reports,
    loading,
    error,
    currentReport,

    // Actions
    generateReport,
    exportReport,
    getCachedReport,
    clearCache,
    clearError,
    clearCurrentReport,
  };
});
