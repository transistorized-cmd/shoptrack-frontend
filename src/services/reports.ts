import api from "./api";
import type { ReportData, ReportRequest } from "@/types/report";

export const reportsService = {
  async generateReport(request: ReportRequest): Promise<ReportData> {
    const response = await api.post(`/reports/${request.pluginKey}/generate`, {
      dateRange: request.dateRange,
      parameters: request.parameters,
    });
    return response.data;
  },

  async exportReport(request: ReportRequest, format: string): Promise<Blob> {
    const response = await api.post(
      `/reports/${request.pluginKey}/export`,
      {
        dateRange: request.dateRange,
        parameters: request.parameters,
      },
      {
        params: { format },
        responseType: "blob",
      },
    );
    return response.data;
  },
};
