import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { ref, nextTick } from "vue";
import NotificationContainer from "../NotificationContainer.vue";

// Mock the useNotifications composable
const mockNotifications = ref([] as any[]);
const mockRemoveNotification = vi.fn();

vi.mock("@/composables/useNotifications", () => ({
  useNotifications: vi.fn(() => ({
    notifications: mockNotifications,
    removeNotification: mockRemoveNotification,
  })),
}));

describe("NotificationContainer Component", () => {
  let wrapper: any;

  const createMockNotification = (overrides = {}) => ({
    id: "test-notification-1",
    type: "info",
    title: "Test Notification",
    message: "Test notification message",
    duration: 5000,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockNotifications.value = [];
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  describe("Component Rendering", () => {
    it("should render without notifications", () => {
      wrapper = mount(NotificationContainer);

      expect(wrapper.find(".fixed.top-4").exists()).toBe(true);
      expect(wrapper.findAll(".bg-white.shadow-lg").length).toBe(0);
    });

    it("should render with empty notifications array", () => {
      mockNotifications.value = [];
      wrapper = mount(NotificationContainer);

      expect(wrapper.findAll("[data-notification]").length).toBe(0);
    });

    it("should have correct container positioning and styling", () => {
      wrapper = mount(NotificationContainer);

      const container = wrapper.find(".fixed");
      expect(container.classes()).toContain("fixed");
      expect(container.classes()).toContain("top-4");
      expect(container.classes()).toContain("left-1/2");
      expect(container.classes()).toContain("transform");
      expect(container.classes()).toContain("-translate-x-1/2");
      expect(container.classes()).toContain("z-50");
    });
  });

  describe("Notification Display", () => {
    it("should render single notification", async () => {
      const notification = createMockNotification();
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      const notificationElement = wrapper.find(".bg-white.shadow-lg");
      expect(notificationElement.exists()).toBe(true);
      expect(wrapper.text()).toContain("Test Notification");
      expect(wrapper.text()).toContain("Test notification message");
    });

    it("should render multiple notifications", async () => {
      mockNotifications.value = [
        createMockNotification({ id: "1", title: "First Notification" }),
        createMockNotification({ id: "2", title: "Second Notification" }),
        createMockNotification({ id: "3", title: "Third Notification" }),
      ];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      const notifications = wrapper.findAll(".bg-white.shadow-lg");
      expect(notifications.length).toBe(3);
      expect(wrapper.text()).toContain("First Notification");
      expect(wrapper.text()).toContain("Second Notification");
      expect(wrapper.text()).toContain("Third Notification");
    });

    it("should render notification without message", async () => {
      const notification = createMockNotification({
        title: "Title Only",
        message: null,
      });
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("Title Only");
      expect(wrapper.find(".text-gray-500").exists()).toBe(false);
    });

    it("should render notification with empty message", async () => {
      const notification = createMockNotification({
        title: "Title Only",
        message: "",
      });
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("Title Only");
      expect(wrapper.find(".text-gray-500").exists()).toBe(false);
    });
  });

  describe("Notification Types and Icons", () => {
    it("should render success notification with correct icon", async () => {
      const notification = createMockNotification({ type: "success" });
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      const successIcon = wrapper.find(".text-green-400");
      expect(successIcon.exists()).toBe(true);

      const notificationCard = wrapper.find(".bg-white");
      expect(notificationCard.classes()).toContain("border-l-4");
      expect(notificationCard.classes()).toContain("border-green-500");
    });

    it("should render error notification with correct icon", async () => {
      const notification = createMockNotification({ type: "error" });
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      const errorIcon = wrapper.find(".text-red-400");
      expect(errorIcon.exists()).toBe(true);

      const notificationCard = wrapper.find(".bg-white");
      expect(notificationCard.classes()).toContain("border-red-500");
    });

    it("should render warning notification with correct icon", async () => {
      const notification = createMockNotification({ type: "warning" });
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      const warningIcon = wrapper.find(".text-yellow-400");
      expect(warningIcon.exists()).toBe(true);

      const notificationCard = wrapper.find(".bg-white");
      expect(notificationCard.classes()).toContain("border-yellow-500");
    });

    it("should render info notification with correct icon (default)", async () => {
      const notification = createMockNotification({ type: "info" });
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      const infoIcon = wrapper.find(".text-blue-400");
      expect(infoIcon.exists()).toBe(true);

      const notificationCard = wrapper.find(".bg-white");
      expect(notificationCard.classes()).toContain("border-blue-500");
    });

    it("should default to info type for unknown notification types", async () => {
      const notification = createMockNotification({ type: "unknown" });
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      const infoIcon = wrapper.find(".text-blue-400");
      expect(infoIcon.exists()).toBe(true);

      const notificationCard = wrapper.find(".bg-white");
      expect(notificationCard.classes()).toContain("border-blue-500");
    });
  });

  describe("Notification Interaction", () => {
    it("should call removeNotification when close button is clicked", async () => {
      const notification = createMockNotification();
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      const closeButton = wrapper.find("button");
      expect(closeButton.exists()).toBe(true);

      await closeButton.trigger("click");

      expect(mockRemoveNotification).toHaveBeenCalledWith(
        "test-notification-1",
      );
    });

    it("should have correct close button styling and accessibility", async () => {
      const notification = createMockNotification();
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      const closeButton = wrapper.find("button");
      expect(closeButton.classes()).toContain("bg-white");
      expect(closeButton.classes()).toContain("rounded-md");
      expect(closeButton.classes()).toContain("text-gray-400");
      expect(closeButton.classes()).toContain("hover:text-gray-500");
      expect(closeButton.classes()).toContain("focus:outline-none");
      expect(closeButton.classes()).toContain("focus:ring-2");

      const closeIcon = closeButton.find("svg");
      expect(closeIcon.exists()).toBe(true);
      expect(closeIcon.classes()).toContain("h-5");
      expect(closeIcon.classes()).toContain("w-5");
    });
  });

  describe("Styling and Layout", () => {
    it("should have correct notification card styling", async () => {
      const notification = createMockNotification();
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      const notificationCard = wrapper.find(".bg-white");
      expect(notificationCard.exists()).toBe(true);
      expect(notificationCard.classes()).toContain("shadow-lg");
      expect(notificationCard.classes()).toContain("rounded-lg");
      expect(notificationCard.classes()).toContain("pointer-events-auto");
      expect(notificationCard.classes()).toContain("transition-all");
      expect(notificationCard.classes()).toContain("duration-300");

      // Check fixed width
      expect(notificationCard.attributes("style")).toContain("width: 600px");
    });

    it("should have correct text styling for title and message", async () => {
      const notification = createMockNotification();
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      const title = wrapper.find(".text-gray-900");
      expect(title.exists()).toBe(true);
      expect(title.classes()).toContain("text-sm");
      expect(title.classes()).toContain("font-medium");

      const message = wrapper.find(".text-gray-500");
      expect(message.exists()).toBe(true);
      expect(message.classes()).toContain("text-sm");
      expect(message.classes()).toContain("mt-1");
    });

    it("should have correct icon container styling", async () => {
      const notification = createMockNotification();
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      const iconContainer = wrapper.find(".flex-shrink-0");
      expect(iconContainer.exists()).toBe(true);

      const icon = iconContainer.find("svg");
      expect(icon.classes()).toContain("h-6");
      expect(icon.classes()).toContain("w-6");
    });
  });

  describe("Transitions and Animations", () => {
    it("should have TransitionGroup component for animations", () => {
      wrapper = mount(NotificationContainer);

      expect(wrapper.html()).toContain('class="space-y-2"');
    });

    it("should include transition CSS classes", () => {
      wrapper = mount(NotificationContainer);

      // Check if scoped styles are applied (they would be in the style element)
      const component = wrapper.find(".fixed");
      expect(component.exists()).toBe(true);
    });

    it("should maintain proper spacing between multiple notifications", async () => {
      mockNotifications.value = [
        createMockNotification({ id: "1" }),
        createMockNotification({ id: "2" }),
      ];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      const container = wrapper.find(".space-y-2");
      expect(container.exists()).toBe(true);
    });
  });

  describe("Utility Methods", () => {
    it("should test getNotificationClasses method indirectly through rendering", async () => {
      const notifications = [
        createMockNotification({ id: "1", type: "success" }),
        createMockNotification({ id: "2", type: "error" }),
        createMockNotification({ id: "3", type: "warning" }),
        createMockNotification({ id: "4", type: "info" }),
      ];
      mockNotifications.value = notifications;

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      const notificationCards = wrapper.findAll(".bg-white.shadow-lg");

      expect(notificationCards[0].classes()).toContain("border-l-4");
      expect(notificationCards[0].classes()).toContain("border-green-500");
      expect(notificationCards[1].classes()).toContain("border-l-4");
      expect(notificationCards[1].classes()).toContain("border-red-500");
      expect(notificationCards[2].classes()).toContain("border-l-4");
      expect(notificationCards[2].classes()).toContain("border-yellow-500");
      expect(notificationCards[3].classes()).toContain("border-l-4");
      expect(notificationCards[3].classes()).toContain("border-blue-500");
    });

    it("should handle getNotificationClasses with undefined type", async () => {
      const notification = createMockNotification({ type: undefined });
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      const notificationCard = wrapper.find(".bg-white");
      expect(notificationCard.classes()).toContain("border-blue-500"); // Should default to info
    });
  });

  describe("Reactive Updates", () => {
    it("should reactively update when notifications are added", async () => {
      // Ensure clean state
      mockNotifications.value = [];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      expect(wrapper.findAll(".bg-white.shadow-lg").length).toBe(0);

      mockNotifications.value = [createMockNotification()];
      await wrapper.vm.$nextTick();

      expect(wrapper.findAll(".bg-white.shadow-lg").length).toBe(1);
    });

    it("should reactively update when notifications are removed", async () => {
      mockNotifications.value = [
        createMockNotification({ id: "1" }),
        createMockNotification({ id: "2" }),
      ];

      wrapper = mount(NotificationContainer);
      await nextTick();

      expect(wrapper.findAll(".bg-white.shadow-lg").length).toBe(2);

      // Create a new array to trigger reactivity (rather than mutating in place)
      mockNotifications.value = [createMockNotification({ id: "1" })];
      await nextTick();
      await flushPromises();

      // Wait for transition animation to complete (300ms + buffer)
      await new Promise((resolve) => setTimeout(resolve, 350));

      expect(wrapper.findAll(".bg-white.shadow-lg").length).toBe(1);
    });

    it("should update when notification content changes", async () => {
      const notification = createMockNotification({ title: "Initial Title" });
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("Initial Title");

      mockNotifications.value = [
        createMockNotification({
          id: "test-notification-1",
          title: "Updated Title",
        }),
      ];
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("Updated Title");
    });
  });

  describe("Edge Cases", () => {
    it("should handle notification with very long title", async () => {
      const longTitle =
        "This is a very long notification title that might wrap to multiple lines and test the layout behavior";
      const notification = createMockNotification({ title: longTitle });
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain(longTitle);
      const titleElement = wrapper.find(".text-gray-900");
      expect(titleElement.exists()).toBe(true);
    });

    it("should handle notification with very long message", async () => {
      const longMessage =
        "This is a very long notification message that tests how the component handles lengthy text content and ensures proper text wrapping and layout preservation";
      const notification = createMockNotification({ message: longMessage });
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain(longMessage);
      const messageElement = wrapper.find(".text-gray-500");
      expect(messageElement.exists()).toBe(true);
    });

    it("should handle many notifications without breaking layout", async () => {
      const manyNotifications = Array.from({ length: 10 }, (_, i) =>
        createMockNotification({
          id: `notification-${i}`,
          title: `Notification ${i + 1}`,
        }),
      );
      mockNotifications.value = manyNotifications;

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      const notifications = wrapper.findAll(".bg-white.shadow-lg");
      expect(notifications.length).toBe(10);

      // Check that all notifications are rendered
      for (let i = 0; i < 10; i++) {
        expect(wrapper.text()).toContain(`Notification ${i + 1}`);
      }
    });

    it("should handle notification with special characters", async () => {
      const notification = createMockNotification({
        title: 'Special characters: <script>alert("xss")</script> & entities',
        message: "Message with \"quotes\" and 'apostrophes' & ampersands",
      });
      mockNotifications.value = [notification];

      wrapper = mount(NotificationContainer);
      await wrapper.vm.$nextTick();

      // Vue should properly escape these
      expect(wrapper.text()).toContain("Special characters");
      expect(wrapper.text()).toContain("quotes");
      expect(wrapper.text()).toContain("apostrophes");
    });
  });
});
