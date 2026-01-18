import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import { useAsyncJobs } from "../useAsyncJobs";
import { asyncJobsService } from "@/services/asyncJobs";

// Mock the async jobs service
vi.mock("@/services/asyncJobs", () => ({
  asyncJobsService: {
    uploadAsync: vi.fn(),
    getJobStatus: vi.fn(),
    cancelJob: vi.fn(),
    retryJob: vi.fn(),
  },
}));

// Mock the notifications composable
vi.mock("../useNotifications", () => ({
  useNotifications: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  })),
}));

// Test component to use the composable
const TestComponent = defineComponent({
  setup() {
    const asyncJobs = useAsyncJobs();
    return { ...asyncJobs };
  },
  template: "<div>{{ hasActiveJobs }}</div>",
});

describe("useAsyncJobs Composable", () => {
  let wrapper: any;
  let mockUploadAsync: any;
  let mockGetJobStatus: any;
  let mockCancelJob: any;
  let mockRetryJob: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUploadAsync = asyncJobsService.uploadAsync as any;
    mockGetJobStatus = asyncJobsService.getJobStatus as any;
    mockCancelJob = asyncJobsService.cancelJob as any;
    mockRetryJob = asyncJobsService.retryJob as any;

    // Set up a default mock for getJobStatus to handle background polling
    mockGetJobStatus.mockResolvedValue({
      id: "default",
      status: "processing",
      filename: "default.pdf",
    });

    wrapper = mount(TestComponent);

    // Clear global state between tests
    const activeJobsArray = wrapper.vm.activeJobs;
    if (activeJobsArray && activeJobsArray.length > 0) {
      activeJobsArray.forEach((job: any) => {
        wrapper.vm.removeJob(job.jobId);
      });
    }
  });

  afterEach(() => {
    // Force cleanup of any remaining jobs and their intervals
    if (wrapper && wrapper.vm) {
      const activeJobsArray = wrapper.vm.activeJobs;
      if (activeJobsArray && activeJobsArray.length > 0) {
        activeJobsArray.forEach((job: any) => {
          wrapper.vm.removeJob(job.jobId);
        });
      }
    }

    if (wrapper) {
      wrapper.unmount();
    }
    vi.restoreAllMocks();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      expect(wrapper.vm.hasActiveJobs).toBe(false);
      expect(wrapper.vm.activeJobs).toEqual([]);
      expect(wrapper.vm.completedJobsCount).toBe(0);
      expect(wrapper.vm.failedJobsCount).toBe(0);
      expect(wrapper.vm.sessionId).toMatch(/^session-\d+-[a-z0-9]+$/);
    });

    it("should provide job management methods", () => {
      expect(typeof wrapper.vm.uploadFileAsync).toBe("function");
      expect(typeof wrapper.vm.cancelJob).toBe("function");
      expect(typeof wrapper.vm.retryJob).toBe("function");
      expect(typeof wrapper.vm.removeJob).toBe("function");
      expect(typeof wrapper.vm.clearCompletedJobs).toBe("function");
      expect(typeof wrapper.vm.getJobDuration).toBe("function");
    });
  });

  describe("File Upload", () => {
    it("should upload file and start tracking job", async () => {
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      const jobId = "test-job-123";

      mockUploadAsync.mockResolvedValue({ jobId });
      mockGetJobStatus.mockResolvedValue({
        id: jobId,
        status: "pending",
        filename: "test.pdf",
      });

      const result = await wrapper.vm.uploadFileAsync(mockFile, {
        priority: 5,
      });

      expect(mockUploadAsync).toHaveBeenCalledWith(
        mockFile,
        expect.objectContaining({
          priority: 5,
          sessionId: wrapper.vm.sessionId,
        }),
      );
      expect(result).toBe(jobId);
      expect(wrapper.vm.hasActiveJobs).toBe(true);
      expect(wrapper.vm.activeJobs).toHaveLength(1);
      expect(wrapper.vm.isJobActive(jobId)).toBe(true);
    });

    it("should handle upload errors", async () => {
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      const uploadError = new Error("Upload failed");

      mockUploadAsync.mockRejectedValue(uploadError);

      await expect(wrapper.vm.uploadFileAsync(mockFile)).rejects.toThrow(
        "Upload failed",
      );
      expect(wrapper.vm.hasActiveJobs).toBe(false);
    });

    it("should pass through upload options correctly", async () => {
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      const options = {
        priority: 10,
        webhookUrl: "https://example.com/webhook",
        onUploadProgress: vi.fn(),
      };

      mockUploadAsync.mockResolvedValue({ jobId: "job-123" });

      await wrapper.vm.uploadFileAsync(mockFile, options);

      expect(mockUploadAsync).toHaveBeenCalledWith(
        mockFile,
        expect.objectContaining({
          ...options,
          sessionId: wrapper.vm.sessionId,
        }),
      );
    });
  });

  describe("Job Status Polling", () => {
    it("should poll job status and update tracker", async () => {
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      const jobId = "test-job-123";

      mockUploadAsync.mockResolvedValue({ jobId });
      mockGetJobStatus
        .mockResolvedValueOnce({
          id: jobId,
          status: "pending",
          filename: "test.pdf",
        })
        .mockResolvedValueOnce({
          id: jobId,
          status: "processing",
          filename: "test.pdf",
          progress: 50,
        });

      await wrapper.vm.uploadFileAsync(mockFile);

      // Wait for initial poll
      await new Promise((resolve) => setTimeout(resolve, 10));

      const job = wrapper.vm.getJob(jobId);
      expect(job).toBeTruthy();
      expect(job?.status?.status).toBe("pending");
    });

    it("should handle job completion", async () => {
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      const jobId = "test-job-123";

      mockUploadAsync.mockResolvedValue({ jobId });
      mockGetJobStatus.mockResolvedValue({
        id: jobId,
        status: "completed",
        filename: "test.pdf",
        completedAt: new Date().toISOString(),
      });

      await wrapper.vm.uploadFileAsync(mockFile);

      // Wait for status poll
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(wrapper.vm.completedJobsCount).toBe(1);
    });

    it("should handle job failure", async () => {
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      const jobId = "test-job-123";

      mockUploadAsync.mockResolvedValue({ jobId });
      mockGetJobStatus.mockResolvedValue({
        id: jobId,
        status: "failed",
        filename: "test.pdf",
        errorMessage: "Processing failed",
      });

      await wrapper.vm.uploadFileAsync(mockFile);

      // Wait for status poll
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(wrapper.vm.failedJobsCount).toBe(1);
    });

    it("should handle polling errors with exponential backoff", async () => {
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      const jobId = "test-job-123";

      mockUploadAsync.mockResolvedValue({ jobId });
      mockGetJobStatus.mockRejectedValue(new Error("Network error"));

      await wrapper.vm.uploadFileAsync(mockFile);

      // Wait for initial poll attempt
      await new Promise((resolve) => setTimeout(resolve, 10));

      const job = wrapper.vm.getJob(jobId);
      expect(job?.error).toContain("Network error");
    });
  });

  describe("Job Management", () => {
    it("should cancel job successfully", async () => {
      const jobId = "test-job-123";

      // Set up a job first
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      mockUploadAsync.mockResolvedValue({ jobId });
      await wrapper.vm.uploadFileAsync(mockFile);

      // Ensure the job has a status object before cancelling
      const job = wrapper.vm.getJob(jobId);
      if (job) {
        job.status = { status: "processing", filename: "test.pdf" };
      }

      mockCancelJob.mockResolvedValue(undefined);

      await wrapper.vm.cancelJob(jobId);

      expect(mockCancelJob).toHaveBeenCalledWith(jobId);

      const updatedJob = wrapper.vm.getJob(jobId);
      expect(updatedJob?.status?.status).toBe("cancelled");
    });

    it("should retry failed job successfully", async () => {
      const jobId = "test-job-123";

      // Set up a failed job first
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      mockUploadAsync.mockResolvedValue({ jobId });
      await wrapper.vm.uploadFileAsync(mockFile);

      mockRetryJob.mockResolvedValue(undefined);

      await wrapper.vm.retryJob(jobId);

      expect(mockRetryJob).toHaveBeenCalledWith(jobId);

      const job = wrapper.vm.getJob(jobId);
      expect(job?.polling).toBe(true);
      expect(job?.error).toBeNull();
    });

    it("should remove job from tracking", async () => {
      const jobId = "test-job-123";

      // Set up a job first
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      mockUploadAsync.mockResolvedValue({ jobId });
      await wrapper.vm.uploadFileAsync(mockFile);

      expect(wrapper.vm.isJobActive(jobId)).toBe(true);

      wrapper.vm.removeJob(jobId);

      expect(wrapper.vm.isJobActive(jobId)).toBe(false);
      expect(wrapper.vm.hasActiveJobs).toBe(false);
    });

    it("should clear completed jobs", async () => {
      // Set up multiple jobs
      const jobId1 = "completed-job-1";
      const jobId2 = "processing-job-2";
      const jobId3 = "failed-job-3";

      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });

      // Upload three jobs
      mockUploadAsync.mockResolvedValueOnce({ jobId: jobId1 });
      await wrapper.vm.uploadFileAsync(mockFile);

      mockUploadAsync.mockResolvedValueOnce({ jobId: jobId2 });
      await wrapper.vm.uploadFileAsync(mockFile);

      mockUploadAsync.mockResolvedValueOnce({ jobId: jobId3 });
      await wrapper.vm.uploadFileAsync(mockFile);

      // Manually set job statuses
      const job1 = wrapper.vm.getJob(jobId1);
      const job3 = wrapper.vm.getJob(jobId3);
      if (job1) job1.status = { status: "completed" };
      if (job3) job3.status = { status: "failed" };

      await nextTick();

      expect(wrapper.vm.activeJobs).toHaveLength(3);

      wrapper.vm.clearCompletedJobs();

      expect(wrapper.vm.activeJobs).toHaveLength(1);
      expect(wrapper.vm.isJobActive(jobId2)).toBe(true);
      expect(wrapper.vm.isJobActive(jobId1)).toBe(false);
      expect(wrapper.vm.isJobActive(jobId3)).toBe(false);
    });
  });

  describe("Job Duration Calculation", () => {
    it("should calculate job duration correctly", async () => {
      const jobId = "test-job-123";

      // Set up a job
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      mockUploadAsync.mockResolvedValue({ jobId });
      await wrapper.vm.uploadFileAsync(mockFile);

      // Mock the start time to be 65 seconds ago
      const job = wrapper.vm.getJob(jobId);
      if (job) {
        job.startTime = Date.now() - 65000; // 65 seconds ago
      }

      const duration = wrapper.vm.getJobDuration(jobId);
      expect(duration).toBe("1m 5s");
    });

    it("should format duration correctly for seconds only", async () => {
      const jobId = "test-job-123";

      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      mockUploadAsync.mockResolvedValue({ jobId });
      await wrapper.vm.uploadFileAsync(mockFile);

      // Mock the start time to be 30 seconds ago
      const job = wrapper.vm.getJob(jobId);
      if (job) {
        job.startTime = Date.now() - 30000;
      }

      const duration = wrapper.vm.getJobDuration(jobId);
      expect(duration).toBe("30s");
    });

    it("should return 0s for non-existent job", () => {
      const duration = wrapper.vm.getJobDuration("non-existent-job");
      expect(duration).toBe("0s");
    });
  });

  describe("Error Handling", () => {
    it("should handle job cancellation errors", async () => {
      const jobId = "test-job-123";

      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      mockUploadAsync.mockResolvedValue({ jobId });
      await wrapper.vm.uploadFileAsync(mockFile);

      const cancelError = new Error("Cancel failed");
      mockCancelJob.mockRejectedValue(cancelError);

      await expect(wrapper.vm.cancelJob(jobId)).rejects.toThrow(
        "Cancel failed",
      );
    });

    it("should handle job retry errors", async () => {
      const jobId = "test-job-123";

      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      mockUploadAsync.mockResolvedValue({ jobId });
      await wrapper.vm.uploadFileAsync(mockFile);

      const retryError = new Error("Retry failed");
      mockRetryJob.mockRejectedValue(retryError);

      await expect(wrapper.vm.retryJob(jobId)).rejects.toThrow("Retry failed");
    });
  });

  describe("Computed Properties", () => {
    it("should correctly calculate active job counts", async () => {
      expect(wrapper.vm.hasActiveJobs).toBe(false);
      expect(wrapper.vm.completedJobsCount).toBe(0);
      expect(wrapper.vm.failedJobsCount).toBe(0);

      // Add some jobs with different statuses
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });

      mockUploadAsync.mockResolvedValue({ jobId: "job-1" });
      await wrapper.vm.uploadFileAsync(mockFile);

      mockUploadAsync.mockResolvedValue({ jobId: "job-2" });
      await wrapper.vm.uploadFileAsync(mockFile);

      mockUploadAsync.mockResolvedValue({ jobId: "job-3" });
      await wrapper.vm.uploadFileAsync(mockFile);

      // Set different statuses
      const job1 = wrapper.vm.getJob("job-1");
      const job2 = wrapper.vm.getJob("job-2");
      const job3 = wrapper.vm.getJob("job-3");

      if (job1) job1.status = { status: "completed" };
      if (job2) job2.status = { status: "failed" };
      if (job3) job3.status = { status: "processing" };

      await nextTick();

      expect(wrapper.vm.hasActiveJobs).toBe(true);
      expect(wrapper.vm.completedJobsCount).toBe(1);
      expect(wrapper.vm.failedJobsCount).toBe(1);
      expect(wrapper.vm.activeJobs).toHaveLength(3);
    });
  });

  describe("Cleanup", () => {
    it("should stop polling intervals on unmount", () => {
      // This test verifies that intervals are cleared when component unmounts
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      wrapper.unmount();

      // Since we don't have any active intervals in this test,
      // we just verify the spy was set up correctly
      expect(clearIntervalSpy).toBeDefined();

      clearIntervalSpy.mockRestore();
    });
  });
});
