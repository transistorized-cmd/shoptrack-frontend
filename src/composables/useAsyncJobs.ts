import { ref, computed, onUnmounted } from "vue";
import {
  asyncJobsService,
  type JobStatus,
  type AsyncJobResult,
} from "@/services/asyncJobs";
import { useNotifications } from "./useNotifications";

interface JobTracker {
  jobId: string;
  status: JobStatus | null;
  polling: boolean;
  error: string | null;
  startTime: number;
}

const activeJobs = ref<Map<string, JobTracker>>(new Map());
const pollingIntervals = ref<Map<string, number>>(new Map());

// Session ID for tracking notifications across browser sessions
const sessionId = ref<string>(
  `session-${Date.now()}-${Math.random().toString(36).substring(2)}`,
);

export const useAsyncJobs = () => {
  const { success, error: notifyError, info, warning } = useNotifications();

  const isJobActive = (jobId: string) => {
    return activeJobs.value.has(jobId);
  };

  const getJob = (jobId: string) => {
    return activeJobs.value.get(jobId);
  };

  const activeJobsList = computed(() => {
    return Array.from(activeJobs.value.values());
  });

  const hasActiveJobs = computed(() => {
    return activeJobs.value.size > 0;
  });

  const completedJobsCount = computed(() => {
    return Array.from(activeJobs.value.values()).filter(
      (job) => job.status?.status === "completed",
    ).length;
  });

  const failedJobsCount = computed(() => {
    return Array.from(activeJobs.value.values()).filter(
      (job) => job.status?.status === "failed",
    ).length;
  });

  /**
   * Upload file asynchronously and start tracking
   */
  const uploadFileAsync = async (
    file: File,
    options?: {
      priority?: number;
      webhookUrl?: string;
      onUploadProgress?: (progressEvent: any) => void;
    },
  ): Promise<string> => {
    try {
      const result = await asyncJobsService.uploadAsync(file, {
        ...options,
        sessionId: sessionId.value,
      });

      // Start tracking this job
      const tracker: JobTracker = {
        jobId: result.jobId,
        status: null,
        polling: true,
        error: null,
        startTime: Date.now(),
      };

      activeJobs.value.set(result.jobId, tracker);
      startPolling(result.jobId);

      // Show initial notification
      info("Upload Started", `Processing ${file.name}...`, {
        persistent: false,
        duration: 3000,
      });

      return result.jobId;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      notifyError("Upload Failed", message);
      throw err;
    }
  };

  /**
   * Start polling for job status
   */
  const startPolling = (jobId: string, intervalMs: number = 5000) => {
    // Don't start polling if already polling
    if (pollingIntervals.value.has(jobId)) {
      return;
    }

    const pollJob = async () => {
      const tracker = activeJobs.value.get(jobId);
      if (!tracker || !tracker.polling) {
        return;
      }

      try {
        const status = await asyncJobsService.getJobStatus(jobId);
        tracker.status = status;
        tracker.error = null;

        // Handle status changes
        if (status.status === "completed") {
          handleJobCompleted(jobId, status);
        } else if (status.status === "failed") {
          handleJobFailed(jobId, status);
        } else if (status.status === "processing") {
          handleJobProcessing(jobId, status);
        }

        // Stop polling for terminal states
        if (["completed", "failed", "cancelled"].includes(status.status)) {
          stopPolling(jobId);
        }
      } catch (err) {
        console.error(`Error polling job ${jobId}:`, err);
        tracker.error = err instanceof Error ? err.message : "Polling error";

        // Continue polling on error, but with exponential backoff
        const currentInterval = pollingIntervals.value.get(jobId);
        if (currentInterval && currentInterval < 30000) {
          // Max 30 seconds
          stopPolling(jobId);
          startPolling(jobId, Math.min(currentInterval * 1.5, 30000));
        }
      }
    };

    // Initial poll
    pollJob();

    // Set up interval
    const intervalId = setInterval(pollJob, intervalMs) as unknown as number;
    pollingIntervals.value.set(jobId, intervalId);
  };

  /**
   * Stop polling for a specific job
   */
  const stopPolling = (jobId: string) => {
    const intervalId = pollingIntervals.value.get(jobId);
    if (intervalId) {
      clearInterval(intervalId);
      pollingIntervals.value.delete(jobId);
    }

    const tracker = activeJobs.value.get(jobId);
    if (tracker) {
      tracker.polling = false;
    }
  };

  /**
   * Remove job from tracking
   */
  const removeJob = (jobId: string) => {
    stopPolling(jobId);
    activeJobs.value.delete(jobId);
  };

  /**
   * Cancel a job
   */
  const cancelJob = async (jobId: string) => {
    try {
      await asyncJobsService.cancelJob(jobId);
      stopPolling(jobId);

      const tracker = activeJobs.value.get(jobId);
      if (tracker?.status) {
        tracker.status.status = "cancelled";
      }

      warning("Job Cancelled", "The upload has been cancelled.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel job";
      notifyError("Cancel Failed", message);
      throw err;
    }
  };

  /**
   * Retry a failed job
   */
  const retryJob = async (jobId: string) => {
    try {
      await asyncJobsService.retryJob(jobId);

      // Resume polling if not already polling
      const tracker = activeJobs.value.get(jobId);
      if (tracker && !tracker.polling) {
        tracker.polling = true;
        tracker.error = null;
        startPolling(jobId);
      }

      info("Job Retrying", "Attempting to process the file again...");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to retry job";
      notifyError("Retry Failed", message);
      throw err;
    }
  };

  /**
   * Handle job completion
   */
  const handleJobCompleted = (jobId: string, status: JobStatus) => {
    const processingTimeMs =
      Date.now() - (activeJobs.value.get(jobId)?.startTime || 0);
    const processingTimeSec = Math.round(processingTimeMs / 1000);

    success(
      "Processing Complete",
      `${status.filename} processed successfully in ${processingTimeSec}s`,
      { persistent: true },
    );

    // Keep the job in tracking for a while for user reference
    setTimeout(() => {
      removeJob(jobId);
    }, 30000); // Remove after 30 seconds
  };

  /**
   * Handle job failure
   */
  const handleJobFailed = (jobId: string, status: JobStatus) => {
    notifyError(
      "Processing Failed",
      status.errorMessage || `Failed to process ${status.filename}`,
      { persistent: true },
    );
  };

  /**
   * Handle job processing status
   */
  const handleJobProcessing = (jobId: string, status: JobStatus) => {
    // Could show progress updates here if needed
    // For now, just log for debugging
    console.debug(`Job ${jobId} is processing...`, status);
  };

  /**
   * Get processing duration for a job
   */
  const getJobDuration = (jobId: string): string => {
    const tracker = activeJobs.value.get(jobId);
    if (!tracker) return "0s";

    const endTime = tracker.status?.completedAt
      ? new Date(tracker.status.completedAt).getTime()
      : Date.now();

    const durationMs = endTime - tracker.startTime;
    const seconds = Math.floor(durationMs / 1000);

    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  };

  /**
   * Clear all completed and failed jobs
   */
  const clearCompletedJobs = () => {
    const toRemove: string[] = [];

    activeJobs.value.forEach((tracker, jobId) => {
      if (
        tracker.status &&
        ["completed", "failed", "cancelled"].includes(tracker.status.status)
      ) {
        toRemove.push(jobId);
      }
    });

    toRemove.forEach((jobId) => removeJob(jobId));
  };

  // Cleanup on unmount
  onUnmounted(() => {
    // Stop all polling
    pollingIntervals.value.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    pollingIntervals.value.clear();
  });

  return {
    // State
    activeJobs: activeJobsList,
    hasActiveJobs,
    completedJobsCount,
    failedJobsCount,
    sessionId: sessionId.value,

    // Actions
    uploadFileAsync,
    cancelJob,
    retryJob,
    removeJob,
    clearCompletedJobs,

    // Utils
    isJobActive,
    getJob,
    getJobDuration,
  };
};
