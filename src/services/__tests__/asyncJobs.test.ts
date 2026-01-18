import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { asyncJobsService } from "../asyncJobs";
import api, { apiWithTimeout } from "../api";
import { errorLogger } from "../errorLogging";
import { csrfManager } from "@/composables/useCsrfToken";

// Mock the dependencies
vi.mock("../api", () => {
  const mockPost = vi.fn();
  const mockGet = vi.fn();
  const mockDelete = vi.fn();
  const mockPatch = vi.fn();

  return {
    default: {
      post: mockPost,
      get: mockGet,
      delete: mockDelete,
      patch: mockPatch,
    },
    apiWithTimeout: {
      fast: {
        get: mockGet,
        post: mockPost,
        delete: mockDelete,
        patch: mockPatch,
      },
      standardUpload: {
        post: mockPost,
      },
    },
  };
});

vi.mock("../errorLogging", () => ({
  errorLogger: {
    logApiError: vi.fn(),
  },
}));

describe("AsyncJobs Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("uploadAsync", () => {
    it("should upload file and return job result", async () => {
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      const expectedResponse = {
        data: {
          jobId: "test-job-123",
          statusEndpoint: "/jobs/test-job-123",
        },
      };

      const mockPost = apiWithTimeout.standardUpload.post as any;
      mockPost.mockResolvedValue(expectedResponse);
      const mockGetToken = csrfManager.getToken as any;
      mockGetToken.mockResolvedValue("csrf-token-123");

      const result = await asyncJobsService.uploadAsync(mockFile, {
        priority: 5,
        webhookUrl: "https://example.com/webhook",
        sessionId: "test-session",
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/upload/async",
        expect.any(FormData),
        {
          headers: { "X-Session-Id": "test-session", "X-CSRF-TOKEN": "csrf-token-123" },
          onUploadProgress: undefined,
        },
      );

      expect(result).toEqual(expectedResponse.data);
    });

    it("should handle upload errors and log them", async () => {
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      const mockError = new Error("Upload failed");

      const mockPost = apiWithTimeout.standardUpload.post as any;
      mockPost.mockRejectedValue(mockError);
      const mockGetToken = csrfManager.getToken as any;
      mockGetToken.mockResolvedValue("csrf-token-123");

      await expect(asyncJobsService.uploadAsync(mockFile)).rejects.toThrow(
        "Upload failed",
      );
      expect(errorLogger.logApiError).toHaveBeenCalledWith(
        mockError,
        "/upload/async",
      );
    });

    it("should include progress callback when provided", async () => {
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      const progressCallback = vi.fn();
      const expectedResponse = { data: { jobId: "test-job-123" } };

      const mockPost = apiWithTimeout.standardUpload.post as any;
      mockPost.mockResolvedValue(expectedResponse);
      const mockGetToken = csrfManager.getToken as any;
      mockGetToken.mockResolvedValue("csrf-token-123");

      await asyncJobsService.uploadAsync(mockFile, {
        onUploadProgress: progressCallback,
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/upload/async",
        expect.any(FormData),
        {
          headers: { "X-CSRF-TOKEN": "csrf-token-123" },
          onUploadProgress: progressCallback,
        },
      );
    });
  });

  describe("getJobStatus", () => {
    it("should fetch job status successfully", async () => {
      const jobId = "test-job-123";
      const expectedStatus = {
        id: jobId,
        status: "processing",
        filename: "test.pdf",
        progress: 50,
      };

      const mockGet = apiWithTimeout.fast.get as any;
      mockGet.mockResolvedValue({ data: expectedStatus });

      const result = await asyncJobsService.getJobStatus(jobId);

      expect(mockGet).toHaveBeenCalledWith(`/jobs/${jobId}`);
      expect(result).toEqual(expectedStatus);
    });

    it("should handle job status fetch errors", async () => {
      const jobId = "test-job-123";
      const mockError = new Error("Job not found");

      const mockGet = apiWithTimeout.fast.get as any;
      mockGet.mockRejectedValue(mockError);

      await expect(asyncJobsService.getJobStatus(jobId)).rejects.toThrow(
        "Job not found",
      );
      expect(errorLogger.logApiError).toHaveBeenCalledWith(
        mockError,
        `/jobs/${jobId}`,
      );
    });
  });

  describe("cancelJob", () => {
    it("should cancel job successfully", async () => {
      const jobId = "test-job-123";

      const mockDelete = apiWithTimeout.fast.delete as any;
      mockDelete.mockResolvedValue({});

      await asyncJobsService.cancelJob(jobId);

      expect(mockDelete).toHaveBeenCalledWith(`/jobs/${jobId}`);
    });

    it("should handle job cancellation errors", async () => {
      const jobId = "test-job-123";
      const mockError = new Error("Cancellation failed");

      const mockDelete = apiWithTimeout.fast.delete as any;
      mockDelete.mockRejectedValue(mockError);

      await expect(asyncJobsService.cancelJob(jobId)).rejects.toThrow(
        "Cancellation failed",
      );
      expect(errorLogger.logApiError).toHaveBeenCalledWith(
        mockError,
        `/jobs/${jobId}`,
      );
    });
  });

  describe("retryJob", () => {
    it("should retry job successfully", async () => {
      const jobId = "test-job-123";

      const mockPost = apiWithTimeout.fast.post as any;
      mockPost.mockResolvedValue({});

      await asyncJobsService.retryJob(jobId);

      expect(mockPost).toHaveBeenCalledWith(`/jobs/${jobId}/retry`);
    });

    it("should handle job retry errors", async () => {
      const jobId = "test-job-123";
      const mockError = new Error("Retry failed");

      const mockPost = apiWithTimeout.fast.post as any;
      mockPost.mockRejectedValue(mockError);

      await expect(asyncJobsService.retryJob(jobId)).rejects.toThrow(
        "Retry failed",
      );
      expect(errorLogger.logApiError).toHaveBeenCalledWith(
        mockError,
        `/jobs/${jobId}/retry`,
      );
    });
  });

  describe("getNotifications", () => {
    it("should fetch notifications with default parameters", async () => {
      const expectedNotifications = {
        notifications: [
          {
            id: "notif-1",
            jobId: "job-1",
            title: "Job Complete",
            message: "Your file has been processed",
            isRead: false,
          },
        ],
        unreadCount: 1,
        totalCount: 1,
      };

      const mockGet = apiWithTimeout.fast.get as any;
      mockGet.mockResolvedValue({ data: expectedNotifications });

      const result = await asyncJobsService.getNotifications();

      expect(mockGet).toHaveBeenCalledWith("/notifications");
      expect(result).toEqual(expectedNotifications);
    });

    it("should fetch notifications with custom options", async () => {
      const options = {
        unreadOnly: true,
        limit: 10,
        offset: 5,
      };

      const mockGet = apiWithTimeout.fast.get as any;
      mockGet.mockResolvedValue({
        data: { notifications: [], unreadCount: 0 },
      });

      await asyncJobsService.getNotifications(options);

      expect(mockGet).toHaveBeenCalledWith(
        "/notifications?unreadOnly=true&limit=10&offset=5",
      );
    });

    it("should handle notification fetch errors", async () => {
      const mockError = new Error("Fetch failed");

      const mockGet = apiWithTimeout.fast.get as any;
      mockGet.mockRejectedValue(mockError);

      await expect(asyncJobsService.getNotifications()).rejects.toThrow(
        "Fetch failed",
      );
      expect(errorLogger.logApiError).toHaveBeenCalledWith(
        mockError,
        "/notifications",
      );
    });
  });

  describe("getUnreadCount", () => {
    it("should fetch unread notification count", async () => {
      const expectedCount = { count: 5 };

      const mockGet = apiWithTimeout.fast.get as any;
      mockGet.mockResolvedValue({ data: expectedCount });

      const result = await asyncJobsService.getUnreadCount();

      expect(mockGet).toHaveBeenCalledWith("/notifications/unread-count");
      expect(result).toEqual(expectedCount);
    });

    it("should handle unread count fetch errors", async () => {
      const mockError = new Error("Count fetch failed");

      const mockGet = apiWithTimeout.fast.get as any;
      mockGet.mockRejectedValue(mockError);

      await expect(asyncJobsService.getUnreadCount()).rejects.toThrow(
        "Count fetch failed",
      );
      expect(errorLogger.logApiError).toHaveBeenCalledWith(
        mockError,
        "/notifications/unread-count",
      );
    });
  });

  describe("markNotificationRead", () => {
    it("should mark notification as read", async () => {
      const notificationId = "notif-123";

      const mockPatch = apiWithTimeout.fast.patch as any;
      mockPatch.mockResolvedValue({});

      await asyncJobsService.markNotificationRead(notificationId);

      expect(mockPatch).toHaveBeenCalledWith(
        `/notifications/${notificationId}/read`,
      );
    });

    it("should handle mark as read errors", async () => {
      const notificationId = "notif-123";
      const mockError = new Error("Mark read failed");

      const mockPatch = apiWithTimeout.fast.patch as any;
      mockPatch.mockRejectedValue(mockError);

      await expect(
        asyncJobsService.markNotificationRead(notificationId),
      ).rejects.toThrow("Mark read failed");
      expect(errorLogger.logApiError).toHaveBeenCalledWith(
        mockError,
        `/notifications/${notificationId}/read`,
      );
    });
  });

  describe("markAllNotificationsRead", () => {
    it("should mark all notifications as read", async () => {
      const mockPatch = apiWithTimeout.fast.patch as any;
      mockPatch.mockResolvedValue({});

      await asyncJobsService.markAllNotificationsRead();

      expect(mockPatch).toHaveBeenCalledWith("/notifications/mark-all-read");
    });

    it("should handle mark all as read errors", async () => {
      const mockError = new Error("Mark all read failed");

      const mockPatch = apiWithTimeout.fast.patch as any;
      mockPatch.mockRejectedValue(mockError);

      await expect(asyncJobsService.markAllNotificationsRead()).rejects.toThrow(
        "Mark all read failed",
      );
      expect(errorLogger.logApiError).toHaveBeenCalledWith(
        mockError,
        "/notifications/mark-all-read",
      );
    });
  });

  describe("getJobMetrics", () => {
    it("should fetch job metrics with default parameters", async () => {
      const expectedMetrics = {
        avgProcessingTime: 125.5,
        successRate: 0.95,
        totalJobs: 100,
      };

      const mockGet = apiWithTimeout.fast.get as any;
      mockGet.mockResolvedValue({ data: expectedMetrics });

      const result = await asyncJobsService.getJobMetrics();

      expect(mockGet).toHaveBeenCalledWith("/jobs/metrics");
      expect(result).toEqual(expectedMetrics);
    });

    it("should fetch job metrics with date range", async () => {
      const options = {
        from: "2024-01-01",
        to: "2024-01-31",
      };

      const mockGet = apiWithTimeout.fast.get as any;
      mockGet.mockResolvedValue({ data: {} });

      await asyncJobsService.getJobMetrics(options);

      expect(mockGet).toHaveBeenCalledWith(
        "/jobs/metrics?from=2024-01-01&to=2024-01-31",
      );
    });

    it("should handle metrics fetch errors", async () => {
      const mockError = new Error("Metrics fetch failed");

      const mockGet = apiWithTimeout.fast.get as any;
      mockGet.mockRejectedValue(mockError);

      await expect(asyncJobsService.getJobMetrics()).rejects.toThrow(
        "Metrics fetch failed",
      );
      expect(errorLogger.logApiError).toHaveBeenCalledWith(
        mockError,
        "/jobs/metrics",
      );
    });
  });

  describe("FormData creation", () => {
    it("should correctly append file and options to FormData", async () => {
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });

      // Create a spy for FormData methods
      const appendSpy = vi.spyOn(FormData.prototype, "append");

      const mockPost = apiWithTimeout.standardUpload.post as any;
      mockPost.mockResolvedValue({ data: { jobId: "test-job" } });

      await asyncJobsService.uploadAsync(mockFile, {
        priority: 8,
        webhookUrl: "https://example.com/webhook",
      });

      expect(appendSpy).toHaveBeenCalledWith("file", mockFile);
      expect(appendSpy).toHaveBeenCalledWith("priority", "8");
      expect(appendSpy).toHaveBeenCalledWith(
        "webhook",
        "https://example.com/webhook",
      );

      appendSpy.mockRestore();
    });
  });
});
vi.mock("@/composables/useCsrfToken", () => ({
  csrfManager: {
    getToken: vi.fn(),
  },
}));
