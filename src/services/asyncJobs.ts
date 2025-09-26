import api, { apiWithTimeout } from "./api";
import { csrfManager } from "@/composables/useCsrfToken";
import { errorLogger } from "./errorLogging";

export interface AsyncJobResult {
  jobId: string;
  statusEndpoint: string;
}

export interface JobStatus {
  id: string;
  userId: number;
  jobType: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  priority: number;
  filename?: string;
  fileSize?: number;
  pluginKey?: string;
  resultData?: any;
  errorMessage?: string;
  errorDetails?: any;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progress?: number;
}

export interface JobNotification {
  id: string;
  jobId: string;
  userId: number;
  sessionId?: string;
  notificationType: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  isPersistent: boolean;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

export interface NotificationResponse {
  notifications: JobNotification[];
  unreadCount: number;
  totalCount: number;
}

export const asyncJobsService = {
  /**
   * Upload file asynchronously and get job ID
   */
  async uploadAsync(
    file: File,
    options?: {
      priority?: number;
      webhookUrl?: string;
      sessionId?: string;
      onUploadProgress?: (progressEvent: any) => void;
    },
  ): Promise<AsyncJobResult> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      if (options?.priority !== undefined) {
        formData.append("priority", options.priority.toString());
      }

      if (options?.webhookUrl) {
        formData.append("webhook", options.webhookUrl);
      }

      const headers: Record<string, string> = {};
      if (options?.sessionId) {
        headers["X-Session-Id"] = options.sessionId;
      }

      // Use standard upload timeout for async endpoint
      const response = await apiWithTimeout.standardUpload.post(
        "/upload/async",
        formData,
        {
          headers,
          onUploadProgress: options?.onUploadProgress,
        },
      );

      return response.data;
    } catch (error) {
      errorLogger.logApiError(
        error instanceof Error ? error : new Error(String(error)),
        "/upload/async",
      );
      throw error;
    }
  },

  /**
   * Get job status by ID
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    try {
      const response = await apiWithTimeout.fast.get(`/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      errorLogger.logApiError(
        error instanceof Error ? error : new Error(String(error)),
        `/jobs/${jobId}`,
      );
      throw error;
    }
  },

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    try {
      await apiWithTimeout.fast.delete(`/jobs/${jobId}`);
    } catch (error) {
      errorLogger.logApiError(
        error instanceof Error ? error : new Error(String(error)),
        `/jobs/${jobId}`,
        "DELETE",
      );
      throw error;
    }
  },

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<void> {
    try {
      await apiWithTimeout.fast.post(`/jobs/${jobId}/retry`);
    } catch (error) {
      errorLogger.logApiError(
        error instanceof Error ? error : new Error(String(error)),
        `/jobs/${jobId}/retry`,
      );
      throw error;
    }
  },

  /**
   * Get job notifications
   */
  async getNotifications(options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<NotificationResponse> {
    try {
      const params = new URLSearchParams();

      if (options?.unreadOnly) {
        params.append("unreadOnly", "true");
      }

      if (options?.limit) {
        params.append("limit", options.limit.toString());
      }

      if (options?.offset) {
        params.append("offset", options.offset.toString());
      }

      const response = await apiWithTimeout.fast.get(
        `/notifications${params.toString() ? "?" + params.toString() : ""}`,
      );

      return response.data;
    } catch (error) {
      errorLogger.logApiError(
        error instanceof Error ? error : new Error(String(error)),
        "/notifications",
      );
      throw error;
    }
  },

  /**
   * Get unread notification count (lightweight)
   */
  async getUnreadCount(): Promise<{ count: number }> {
    try {
      const response = await apiWithTimeout.fast.get(
        "/notifications/unread-count",
      );
      return response.data;
    } catch (error) {
      errorLogger.logApiError(
        error instanceof Error ? error : new Error(String(error)),
        "/notifications/unread-count",
      );
      throw error;
    }
  },

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string): Promise<void> {
    try {
      await apiWithTimeout.fast.patch(`/notifications/${notificationId}/read`);
    } catch (error) {
      errorLogger.logApiError(
        error instanceof Error ? error : new Error(String(error)),
        `/notifications/${notificationId}/read`,
      );
      throw error;
    }
  },

  /**
   * Mark multiple notifications as read
   */
  async markMultipleNotificationsRead(
    notificationIds: string[],
  ): Promise<void> {
    try {
      await apiWithTimeout.fast.patch("/notifications/mark-multiple-read", {
        notificationIds,
      });
    } catch (error) {
      errorLogger.logApiError(
        error instanceof Error ? error : new Error(String(error)),
        "/notifications/mark-multiple-read",
      );
      throw error;
    }
  },

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(): Promise<void> {
    try {
      await apiWithTimeout.fast.patch("/notifications/mark-all-read");
    } catch (error: any) {
      // If CSRF failed, refresh token and retry once
      const status = error?.response?.status;
      if ((status === 403 || status === 419) && !error?.config?._retried) {
        try {
          await csrfManager.initialize();
          const cfg = { ...(error.config || {}) };
          cfg._retried = true;
          return await apiWithTimeout.fast.patch(
            "/notifications/mark-all-read",
            undefined,
            cfg as any,
          );
        } catch (retryErr) {
          errorLogger.logApiError(
            retryErr instanceof Error ? retryErr : new Error(String(retryErr)),
            "/notifications/mark-all-read",
          );
          throw retryErr;
        }
      }

      errorLogger.logApiError(
        error instanceof Error ? error : new Error(String(error)),
        "/notifications/mark-all-read",
      );
      throw error;
    }
  },

  /**
   * Get job metrics for performance analysis
   */
  async getJobMetrics(options?: { from?: string; to?: string }): Promise<any> {
    try {
      const params = new URLSearchParams();

      if (options?.from) {
        params.append("from", options.from);
      }

      if (options?.to) {
        params.append("to", options.to);
      }

      const response = await apiWithTimeout.fast.get(
        `/jobs/metrics${params.toString() ? "?" + params.toString() : ""}`,
      );

      return response.data;
    } catch (error) {
      errorLogger.logApiError(
        error instanceof Error ? error : new Error(String(error)),
        "/jobs/metrics",
      );
      throw error;
    }
  },
};
