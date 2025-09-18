import { ref, computed, onMounted, onUnmounted } from "vue";
import { asyncJobsService, type JobNotification } from "@/services/asyncJobs";
import { useNotifications } from "./useNotifications";

const jobNotifications = ref<JobNotification[]>([]);
const unreadCount = ref(0);
const isPolling = ref(false);
const pollingInterval = ref<number | null>(null);

export const useJobNotifications = () => {
  const { success, error, info, warning } = useNotifications();

  const hasUnreadNotifications = computed(() => unreadCount.value > 0);

  const unreadNotifications = computed(() =>
    jobNotifications.value.filter((n) => !n.isRead),
  );

  const persistentNotifications = computed(() =>
    jobNotifications.value.filter((n) => n.isPersistent && !n.isRead),
  );

  /**
   * Start polling for job notifications
   */
  const startPolling = (intervalMs: number = 5000) => {
    if (isPolling.value) return;

    isPolling.value = true;

    const poll = async () => {
      try {
        // Lightweight poll for unread count first
        const countResponse = await asyncJobsService.getUnreadCount();
        unreadCount.value = countResponse.count;

        // If we have unread notifications, fetch the full list
        if (countResponse.count > 0) {
          await fetchNotifications({ unreadOnly: true });
        }
      } catch (err) {
        console.error("Error polling job notifications:", err);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    pollingInterval.value = setInterval(poll, intervalMs) as unknown as number;
  };

  /**
   * Stop polling for job notifications
   */
  const stopPolling = () => {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value);
      pollingInterval.value = null;
    }
    isPolling.value = false;
  };

  /**
   * Fetch job notifications from the server
   */
  const fetchNotifications = async (options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    try {
      const response = await asyncJobsService.getNotifications(options);

      if (options?.unreadOnly) {
        // Merge with existing notifications, avoiding duplicates
        const existingIds = new Set(jobNotifications.value.map((n) => n.id));
        const newNotifications = response.notifications.filter(
          (n) => !existingIds.has(n.id),
        );
        jobNotifications.value = [
          ...jobNotifications.value,
          ...newNotifications,
        ];
      } else {
        jobNotifications.value = response.notifications;
      }

      unreadCount.value = response.unreadCount;

      // Display new notifications in the UI
      response.notifications
        .filter((n) => !n.isRead && shouldShowInUI(n))
        .forEach((notification) => {
          showNotificationInUI(notification);
        });
    } catch (err) {
      console.error("Failed to fetch job notifications:", err);
      error("Notification Error", "Failed to fetch notifications");
    }
  };

  /**
   * Determine if a job notification should be shown in the UI
   */
  const shouldShowInUI = (notification: JobNotification): boolean => {
    // Don't show if it's too old (more than 1 minute)
    const createdAt = new Date(notification.createdAt);
    const now = new Date();
    const ageMs = now.getTime() - createdAt.getTime();

    if (ageMs > 60 * 1000) {
      // 1 minute
      return false;
    }

    // Show job completion/failure notifications
    if (
      notification.notificationType === "job_completed" ||
      notification.notificationType === "job_failed"
    ) {
      return true;
    }

    return false;
  };

  /**
   * Show job notification in the UI toast system
   */
  const showNotificationInUI = (notification: JobNotification) => {
    const { title, message, notificationType, data } = notification;

    switch (notificationType) {
      case "job_completed":
        success(title, message, {
          persistent: false,
          duration: 5000,
        });
        break;

      case "job_failed":
        error(title, message, {
          persistent: true,
        });
        break;

      case "job_retry":
        warning(title, message, {
          persistent: false,
          duration: 4000,
        });
        break;

      case "job_cancelled":
        info(title, message, {
          persistent: false,
          duration: 3000,
        });
        break;

      default:
        info(title, message, {
          persistent: false,
          duration: 4000,
        });
        break;
    }
  };

  /**
   * Mark a notification as read
   */
  const markAsRead = async (notificationId: string) => {
    try {
      await asyncJobsService.markNotificationRead(notificationId);

      // Update local state
      const notification = jobNotifications.value.find(
        (n) => n.id === notificationId,
      );
      if (notification) {
        notification.isRead = true;
        notification.readAt = new Date().toISOString();
      }

      // Update unread count
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    } catch (err) {
      console.error(
        `Failed to mark notification ${notificationId} as read:`,
        err,
      );
      error("Update Failed", "Failed to mark notification as read");
    }
  };

  /**
   * Mark multiple notifications as read
   */
  const markMultipleAsRead = async (notificationIds: string[]) => {
    try {
      await asyncJobsService.markMultipleNotificationsRead(notificationIds);

      // Update local state
      const readAt = new Date().toISOString();
      let markedCount = 0;

      jobNotifications.value.forEach((notification) => {
        if (notificationIds.includes(notification.id) && !notification.isRead) {
          notification.isRead = true;
          notification.readAt = readAt;
          markedCount++;
        }
      });

      // Update unread count
      unreadCount.value = Math.max(0, unreadCount.value - markedCount);
    } catch (err) {
      console.error("Failed to mark multiple notifications as read:", err);
      error("Update Failed", "Failed to mark selected notifications as read");
    }
  };

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = async () => {
    try {
      await asyncJobsService.markAllNotificationsRead();

      // Update local state
      jobNotifications.value.forEach((notification) => {
        if (!notification.isRead) {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
        }
      });

      unreadCount.value = 0;
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      error("Update Failed", "Failed to mark all notifications as read");
    }
  };

  /**
   * Clear old notifications
   */
  const clearOldNotifications = () => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    jobNotifications.value = jobNotifications.value.filter((notification) => {
      const createdAt = new Date(notification.createdAt);
      return createdAt > oneDayAgo || !notification.isRead;
    });
  };

  /**
   * Get notification by job ID
   */
  const getNotificationsByJobId = (jobId: string) => {
    return jobNotifications.value.filter((n) => n.jobId === jobId);
  };

  /**
   * Check if there are notifications for a specific job
   */
  const hasNotificationsForJob = (jobId: string) => {
    return jobNotifications.value.some((n) => n.jobId === jobId);
  };

  /**
   * Initialize the notification system
   */
  const initialize = () => {
    // Initial fetch
    fetchNotifications({ limit: 50 });

    // Start polling for new notifications
    startPolling();

    // Clean up old notifications
    clearOldNotifications();
  };

  // Auto-initialize on mount
  onMounted(() => {
    initialize();
  });

  // Cleanup on unmount
  onUnmounted(() => {
    stopPolling();
  });

  return {
    // State
    jobNotifications,
    unreadCount,
    hasUnreadNotifications,
    unreadNotifications,
    persistentNotifications,
    isPolling,

    // Actions
    fetchNotifications,
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    clearOldNotifications,
    startPolling,
    stopPolling,
    initialize,

    // Utils
    getNotificationsByJobId,
    hasNotificationsForJob,
  };
};
