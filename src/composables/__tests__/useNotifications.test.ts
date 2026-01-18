import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useNotifications, type Notification } from "../useNotifications";

// Mock the timeout constant
vi.mock("@/constants/app", () => ({
  TIMEOUT: {
    NOTIFICATION_DEFAULT: 5000,
  },
}));

describe("useNotifications Composable", () => {
  let notificationSystem: ReturnType<typeof useNotifications>;

  beforeEach(() => {
    vi.useFakeTimers();
    notificationSystem = useNotifications();
    notificationSystem.clearAllNotifications();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Basic Notification Management", () => {
    it("should initialize with empty notifications array", () => {
      expect(notificationSystem.notifications.value).toEqual([]);
    });

    it("should add a notification", () => {
      const id = notificationSystem.addNotification(
        "success",
        "Test Title",
        "Test Message",
      );

      expect(notificationSystem.notifications.value).toHaveLength(1);
      expect(notificationSystem.notifications.value[0]).toMatchObject({
        id,
        type: "success",
        title: "Test Title",
        message: "Test Message",
        duration: 5000,
        persistent: false, // default is false unless explicitly set
      });
    });

    it("should generate unique IDs for notifications", () => {
      const id1 = notificationSystem.addNotification("info", "First");
      const id2 = notificationSystem.addNotification("info", "Second");

      expect(id1).not.toBe(id2);
      expect(notificationSystem.notifications.value).toHaveLength(2);
    });

    it("should remove notification by ID", () => {
      const id1 = notificationSystem.addNotification("success", "First");
      const id2 = notificationSystem.addNotification("error", "Second");

      expect(notificationSystem.notifications.value).toHaveLength(2);

      notificationSystem.removeNotification(id1);

      expect(notificationSystem.notifications.value).toHaveLength(1);
      expect(notificationSystem.notifications.value[0].id).toBe(id2);
    });

    it("should handle removing non-existent notification gracefully", () => {
      notificationSystem.addNotification("info", "Test");
      const initialLength = notificationSystem.notifications.value.length;

      notificationSystem.removeNotification("non-existent-id");

      expect(notificationSystem.notifications.value).toHaveLength(
        initialLength,
      );
    });

    it("should clear all notifications", () => {
      notificationSystem.addNotification("success", "First");
      notificationSystem.addNotification("error", "Second");
      notificationSystem.addNotification("warning", "Third");

      expect(notificationSystem.notifications.value).toHaveLength(3);

      notificationSystem.clearAllNotifications();

      expect(notificationSystem.notifications.value).toEqual([]);
    });
  });

  describe("Notification Types and Options", () => {
    it("should support different notification types", () => {
      const types: Array<Notification["type"]> = [
        "success",
        "error",
        "warning",
        "info",
      ];

      types.forEach((type) => {
        const id = notificationSystem.addNotification(type, `${type} title`);
        const notification = notificationSystem.notifications.value.find(
          (n) => n.id === id,
        );

        expect(notification?.type).toBe(type);
      });

      expect(notificationSystem.notifications.value).toHaveLength(types.length);
    });

    it("should handle custom duration", () => {
      const id = notificationSystem.addNotification(
        "info",
        "Custom Duration",
        undefined,
        {
          duration: 10000,
        },
      );

      const notification = notificationSystem.notifications.value.find(
        (n) => n.id === id,
      );
      expect(notification?.duration).toBe(10000);
    });

    it("should handle persistent option", () => {
      const id = notificationSystem.addNotification(
        "warning",
        "Non-Persistent",
        undefined,
        {
          persistent: false,
        },
      );

      const notification = notificationSystem.notifications.value.find(
        (n) => n.id === id,
      );
      expect(notification?.persistent).toBe(false);
    });

    it("should use default values when options not provided", () => {
      const id = notificationSystem.addNotification("error", "Default Options");

      const notification = notificationSystem.notifications.value.find(
        (n) => n.id === id,
      );
      expect(notification).toMatchObject({
        duration: 5000,
        persistent: false, // default is false
      });
    });
  });

  describe("Auto-removal Behavior", () => {
    it("should auto-remove non-persistent notifications after duration", () => {
      const id = notificationSystem.addNotification(
        "info",
        "Auto Remove",
        undefined,
        {
          persistent: false,
          duration: 1000,
        },
      );

      expect(notificationSystem.notifications.value).toHaveLength(1);

      // Fast-forward time by 1000ms
      vi.advanceTimersByTime(1000);

      expect(notificationSystem.notifications.value).toHaveLength(0);
    });

    it("should not auto-remove persistent notifications", () => {
      notificationSystem.addNotification("success", "Persistent", undefined, {
        persistent: true,
        duration: 1000,
      });

      expect(notificationSystem.notifications.value).toHaveLength(1);

      // Fast-forward time
      vi.advanceTimersByTime(2000);

      expect(notificationSystem.notifications.value).toHaveLength(1);
    });

    it("should not auto-remove notifications with duration 0", () => {
      notificationSystem.addNotification("warning", "No Duration", undefined, {
        persistent: false,
        duration: 0,
      });

      expect(notificationSystem.notifications.value).toHaveLength(1);

      vi.advanceTimersByTime(5000);

      expect(notificationSystem.notifications.value).toHaveLength(1);
    });

    it("should not auto-remove notifications with negative duration", () => {
      notificationSystem.addNotification(
        "error",
        "Negative Duration",
        undefined,
        {
          persistent: false,
          duration: -1000,
        },
      );

      expect(notificationSystem.notifications.value).toHaveLength(1);

      vi.advanceTimersByTime(5000);

      expect(notificationSystem.notifications.value).toHaveLength(1);
    });

    it("should handle multiple auto-removal timers correctly", () => {
      const id1 = notificationSystem.addNotification(
        "info",
        "First",
        undefined,
        {
          persistent: false,
          duration: 1000,
        },
      );
      const id2 = notificationSystem.addNotification(
        "warning",
        "Second",
        undefined,
        {
          persistent: false,
          duration: 2000,
        },
      );
      const id3 = notificationSystem.addNotification(
        "error",
        "Third",
        undefined,
        {
          persistent: false,
          duration: 3000,
        },
      );

      expect(notificationSystem.notifications.value).toHaveLength(3);

      // After 1000ms, first should be removed
      vi.advanceTimersByTime(1000);
      expect(notificationSystem.notifications.value).toHaveLength(2);
      expect(
        notificationSystem.notifications.value.find((n) => n.id === id1),
      ).toBeUndefined();

      // After 2000ms total, second should be removed
      vi.advanceTimersByTime(1000);
      expect(notificationSystem.notifications.value).toHaveLength(1);
      expect(
        notificationSystem.notifications.value.find((n) => n.id === id2),
      ).toBeUndefined();

      // After 3000ms total, third should be removed
      vi.advanceTimersByTime(1000);
      expect(notificationSystem.notifications.value).toHaveLength(0);
      expect(
        notificationSystem.notifications.value.find((n) => n.id === id3),
      ).toBeUndefined();
    });
  });

  describe("Convenience Methods", () => {
    it("should provide success convenience method", () => {
      const id = notificationSystem.success("Success Title", "Success Message");

      const notification = notificationSystem.notifications.value.find(
        (n) => n.id === id,
      );
      expect(notification).toMatchObject({
        type: "success",
        title: "Success Title",
        message: "Success Message",
      });
    });

    it("should provide error convenience method", () => {
      const id = notificationSystem.error("Error Title", "Error Message");

      const notification = notificationSystem.notifications.value.find(
        (n) => n.id === id,
      );
      expect(notification).toMatchObject({
        type: "error",
        title: "Error Title",
        message: "Error Message",
      });
    });

    it("should provide warning convenience method", () => {
      const id = notificationSystem.warning("Warning Title", "Warning Message");

      const notification = notificationSystem.notifications.value.find(
        (n) => n.id === id,
      );
      expect(notification).toMatchObject({
        type: "warning",
        title: "Warning Title",
        message: "Warning Message",
      });
    });

    it("should provide info convenience method", () => {
      const id = notificationSystem.info("Info Title", "Info Message");

      const notification = notificationSystem.notifications.value.find(
        (n) => n.id === id,
      );
      expect(notification).toMatchObject({
        type: "info",
        title: "Info Title",
        message: "Info Message",
      });
    });

    it("should support options in convenience methods", () => {
      const id = notificationSystem.success("Title", "Message", {
        duration: 3000,
        persistent: false,
      });

      const notification = notificationSystem.notifications.value.find(
        (n) => n.id === id,
      );
      expect(notification).toMatchObject({
        duration: 3000,
        persistent: false,
      });
    });

    it("should work without message in convenience methods", () => {
      const id = notificationSystem.error("Error Title");

      const notification = notificationSystem.notifications.value.find(
        (n) => n.id === id,
      );
      expect(notification).toMatchObject({
        type: "error",
        title: "Error Title",
        message: undefined,
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty title", () => {
      const id = notificationSystem.addNotification("info", "");

      const notification = notificationSystem.notifications.value.find(
        (n) => n.id === id,
      );
      expect(notification?.title).toBe("");
    });

    it("should handle empty message", () => {
      const id = notificationSystem.addNotification("info", "Title", "");

      const notification = notificationSystem.notifications.value.find(
        (n) => n.id === id,
      );
      expect(notification?.message).toBe("");
    });

    it("should handle undefined message", () => {
      const id = notificationSystem.addNotification("info", "Title", undefined);

      const notification = notificationSystem.notifications.value.find(
        (n) => n.id === id,
      );
      expect(notification?.message).toBeUndefined();
    });

    it("should handle null options gracefully", () => {
      const id = notificationSystem.addNotification(
        "info",
        "Title",
        "Message",
        null as any,
      );

      const notification = notificationSystem.notifications.value.find(
        (n) => n.id === id,
      );
      expect(notification).toMatchObject({
        duration: 5000,
        persistent: false, // default is false
      });
    });

    it("should handle partial options", () => {
      const id = notificationSystem.addNotification(
        "info",
        "Title",
        "Message",
        {
          duration: 2000,
          // persistent not specified
        },
      );

      const notification = notificationSystem.notifications.value.find(
        (n) => n.id === id,
      );
      expect(notification).toMatchObject({
        duration: 2000,
        persistent: false, // default is false
      });
    });
  });

  describe("Reactivity and State Management", () => {
    it("should maintain reactive notifications array", () => {
      const initialLength = notificationSystem.notifications.value.length;

      notificationSystem.addNotification("info", "Test");
      expect(notificationSystem.notifications.value.length).toBe(
        initialLength + 1,
      );

      notificationSystem.addNotification("error", "Test 2");
      expect(notificationSystem.notifications.value.length).toBe(
        initialLength + 2,
      );
    });

    it("should maintain state across multiple useNotifications calls", () => {
      // First instance
      const system1 = useNotifications();
      system1.addNotification("success", "First System");

      // Second instance should share state
      const system2 = useNotifications();
      expect(system2.notifications.value).toHaveLength(1);
      expect(system2.notifications.value[0].title).toBe("First System");

      system2.addNotification("error", "Second System");
      expect(system1.notifications.value).toHaveLength(2);
    });
  });

  describe("Performance and Memory", () => {
    const MAX_NOTIFICATIONS = 5; // Same as implementation limit

    it("should handle large numbers of notifications", () => {
      const count = 100; // Add many, but only MAX_NOTIFICATIONS will be kept
      const ids: string[] = [];

      // Add many notifications - only last MAX_NOTIFICATIONS will remain
      for (let i = 0; i < count; i++) {
        ids.push(
          notificationSystem.addNotification("info", `Notification ${i}`),
        );
      }

      // Implementation limits to MAX_NOTIFICATIONS
      expect(notificationSystem.notifications.value).toHaveLength(MAX_NOTIFICATIONS);

      // Remove some of the remaining notifications
      const remaining = notificationSystem.notifications.value.map(n => n.id);
      for (let i = 0; i < 2; i++) {
        notificationSystem.removeNotification(remaining[i]);
      }

      expect(notificationSystem.notifications.value).toHaveLength(MAX_NOTIFICATIONS - 2);
    });

    it("should properly clean up auto-removal timers", () => {
      // Add notifications that will auto-remove (only MAX_NOTIFICATIONS will be kept)
      for (let i = 0; i < 10; i++) {
        notificationSystem.addNotification("info", `Auto ${i}`, undefined, {
          persistent: false,
          duration: 1000 + i * 100, // Staggered removal
        });
      }

      expect(notificationSystem.notifications.value).toHaveLength(MAX_NOTIFICATIONS);

      // Fast-forward enough to remove all
      vi.advanceTimersByTime(5000);

      expect(notificationSystem.notifications.value).toHaveLength(0);
    });

    it("should handle clearing notifications with pending timers", () => {
      // Add notifications with auto-removal
      notificationSystem.addNotification("info", "Auto 1", undefined, {
        persistent: false,
        duration: 5000,
      });
      notificationSystem.addNotification("info", "Auto 2", undefined, {
        persistent: false,
        duration: 10000,
      });

      expect(notificationSystem.notifications.value).toHaveLength(2);

      // Clear all before timers fire
      notificationSystem.clearAllNotifications();
      expect(notificationSystem.notifications.value).toHaveLength(0);

      // Fast-forward past when timers would have fired
      vi.advanceTimersByTime(15000);

      // Should still be empty (timers shouldn't add anything back)
      expect(notificationSystem.notifications.value).toHaveLength(0);
    });
  });
});
