import { ref } from "vue";
import { TIMEOUT } from "@/constants/app";

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

const notifications = ref<Notification[]>([]);
const MAX_NOTIFICATIONS = 5;

let notificationId = 0;

export const useNotifications = () => {
  const addNotification = (
    type: Notification["type"],
    title: string,
    message?: string,
    options?: {
      duration?: number;
      persistent?: boolean;
    },
  ) => {
    const id = `notification-${++notificationId}`;
    const notification: Notification = {
      id,
      type,
      title,
      message,
      duration: options?.duration ?? TIMEOUT.NOTIFICATION_DEFAULT,
      persistent: options?.persistent ?? false,
    };

    notifications.value.push(notification);

    // If we exceed max notifications, remove the oldest one
    if (notifications.value.length > MAX_NOTIFICATIONS) {
      const oldestNotification = notifications.value[0];
      removeNotification(oldestNotification.id);
    }

    // Auto-remove after duration unless persistent
    if (
      !notification.persistent &&
      notification.duration &&
      notification.duration > 0
    ) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }

    return id;
  };

  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
  };

  const clearAllNotifications = () => {
    notifications.value = [];
  };

  // Convenience methods
  const success = (
    title: string,
    message?: string,
    options?: { duration?: number; persistent?: boolean },
  ) => addNotification("success", title, message, options);

  const error = (
    title: string,
    message?: string,
    options?: { duration?: number; persistent?: boolean },
  ) => addNotification("error", title, message, options);

  const warning = (
    title: string,
    message?: string,
    options?: { duration?: number; persistent?: boolean },
  ) => addNotification("warning", title, message, options);

  const info = (
    title: string,
    message?: string,
    options?: { duration?: number; persistent?: boolean },
  ) => addNotification("info", title, message, options);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    success,
    error,
    warning,
    info,
  };
};
