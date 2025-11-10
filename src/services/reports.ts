import api from "./api";
import type { ReportData, ReportRequest } from "@/types/report";

interface ReportJobResponse {
  jobId: string;
  status: string;
  pluginKey: string;
  message: string;
  estimatedCompletionSeconds: number;
  cacheKey: string;
}

interface JobStatus {
  id: string;
  status: string;
  result?: any;
  error?: string;
}

export const reportsService = {
  async generateReport(request: ReportRequest, onProgress?: (status: string) => void): Promise<ReportData> {
    const response = await api.post(`/reports/${request.pluginKey}/generate`, {
      dateRange: request.dateRange,
      parameters: request.parameters,
    });

    // Check if response is 202 Accepted (job created) or 200 OK (cache hit)
    if (response.status === 202) {
      // Job created - need to poll for completion
      const jobResponse: ReportJobResponse = response.data;
      onProgress?.('Job created, waiting for completion...');

      // Poll for job completion
      const result = await this.pollForJobCompletion(jobResponse.jobId, onProgress);

      // Fetch the cached result
      const cachedResponse = await api.get(`/reports/result/${jobResponse.cacheKey}`);
      return cachedResponse.data;
    }

    // Cache hit - return data immediately
    return response.data;
  },

  async pollForJobCompletion(jobId: string, onProgress?: (status: string) => void): Promise<void> {
    const maxAttempts = 60; // 60 attempts = 1 minute max
    const pollInterval = 1000; // 1 second between polls

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const jobStatus = await this.getJobStatus(jobId);

      onProgress?.(`Job status: ${jobStatus.status} (attempt ${attempt + 1}/${maxAttempts})`);

      if (jobStatus.status === 'completed') {
        onProgress?.('Report generated successfully!');
        return;
      }

      if (jobStatus.status === 'failed') {
        throw new Error(jobStatus.error || 'Job failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Job completion timeout - report is taking longer than expected');
  },

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await api.get(`/reports/job/${jobId}`);
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
