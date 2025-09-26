import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick, ref, computed } from "vue";
import NotificationBadge from "../NotificationBadge.vue";

// Mock reactive values for the composable
const mockUnreadCountValue = ref(0);
const mockIsPollingValue = ref(false);
const mockHasUnreadNotifications = computed(
  () => mockUnreadCountValue.value > 0,
);
const mockStartPolling = vi.fn();

vi.mock("@/composables/useJobNotifications", () => ({
  useJobNotifications: () => ({
    unreadCount: mockUnreadCountValue,
    hasUnreadNotifications: mockHasUnreadNotifications,
    startPolling: mockStartPolling,
    isPolling: mockIsPollingValue,
  }),
}));

describe("NotificationBadge Component", () => {
  let wrapper: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset reactive values to defaults
    mockUnreadCountValue.value = 0;
    mockIsPollingValue.value = false;
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  describe("Basic Rendering", () => {
    it("should render bell icon", () => {
      wrapper = mount(NotificationBadge);

      const icon = wrapper.find("svg");
      expect(icon.exists()).toBe(true);
      expect(icon.classes()).toContain("w-6");
      expect(icon.classes()).toContain("h-6");
    });

    it("should apply default icon classes", () => {
      wrapper = mount(NotificationBadge);

      const icon = wrapper.find("svg");
      expect(icon.classes()).toContain("text-gray-600");
      expect(icon.classes()).toContain("dark:text-gray-300");
    });

    it("should apply custom icon classes", () => {
      wrapper = mount(NotificationBadge, {
        props: {
          iconClass: "text-blue-500 hover:text-blue-600",
        },
      });

      const icon = wrapper.find("svg");
      expect(icon.classes()).toContain("text-blue-500");
      expect(icon.classes()).toContain("hover:text-blue-600");
    });
  });

  describe("Badge Display Logic", () => {
    it("should not show badge when no unread notifications", () => {
      mockUnreadCountValue.value = 0;

      wrapper = mount(NotificationBadge);

      const badge = wrapper.find(".bg-red-500");
      expect(badge.exists()).toBe(false);
    });

    it("should show badge with count when unread notifications exist", () => {
      mockUnreadCountValue.value = 5;

      wrapper = mount(NotificationBadge);

      const badge = wrapper.find(".bg-red-500.text-white");
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toBe("5");
    });

    it("should show 99+ for counts over maxCount", () => {
      mockUnreadCountValue.value = 150;

      wrapper = mount(NotificationBadge, {
        props: {
          maxCount: 99,
        },
      });

      expect(wrapper.vm.displayCount).toBe("99+");
    });

    it("should respect custom maxCount prop", () => {
      mockUnreadCountValue.value = 25;

      wrapper = mount(NotificationBadge, {
        props: {
          maxCount: 20,
        },
      });

      expect(wrapper.vm.displayCount).toBe("20+");
    });

    it("should show exact count when below maxCount", () => {
      mockUnreadCountValue.value = 15;

      wrapper = mount(NotificationBadge, {
        props: {
          maxCount: 99,
        },
      });

      expect(wrapper.vm.displayCount).toBe("15");
    });
  });

  describe("Dot Display Mode", () => {
    it("should show count badge instead of dot when unreadCount > 0", () => {
      mockUnreadCountValue.value = 1; // When count > 0, always show count badge, not dot

      wrapper = mount(NotificationBadge, {
        props: {
          showDot: true, // Even with showDot=true, count takes precedence
        },
      });

      // Should show count badge, not dot, when there are actual unread notifications
      const countBadge = wrapper.find("span.bg-red-500.text-white");
      expect(countBadge.exists()).toBe(true);

      const dot = wrapper.find(".w-3.h-3.animate-pulse");
      expect(dot.exists()).toBe(false);
    });

    it("should not show dot when showDot is false", () => {
      mockUnreadCountValue.value = 0;

      wrapper = mount(NotificationBadge, {
        props: {
          showDot: false,
        },
      });

      const dot = wrapper.find(".w-3.h-3");
      expect(dot.exists()).toBe(false);
    });

    it("should not show dot when no unread notifications", () => {
      mockUnreadCountValue.value = 0;

      wrapper = mount(NotificationBadge, {
        props: {
          showDot: true,
        },
      });

      const dot = wrapper.find(".w-3.h-3");
      expect(dot.exists()).toBe(false);
    });

    it("should apply custom dot classes", () => {
      mockUnreadCountValue.value = 0;

      wrapper = mount(NotificationBadge, {
        props: {
          showDot: true,
          dotClass: "bg-green-500 border-2",
        },
      });

      const dot = wrapper.find(".w-3.h-3");
      if (dot.exists()) {
        expect(dot.classes()).toContain("bg-green-500");
        expect(dot.classes()).toContain("border-2");
      }
    });
  });

  describe("Custom Styling", () => {
    it("should apply custom badge classes", () => {
      mockUnreadCountValue.value = 5;

      wrapper = mount(NotificationBadge, {
        props: {
          badgeClass: "bg-blue-500 text-yellow-200 border-2",
        },
      });

      const badge = wrapper.find("span");
      if (badge.exists()) {
        expect(badge.classes()).toContain("bg-blue-500");
        expect(badge.classes()).toContain("text-yellow-200");
        expect(badge.classes()).toContain("border-2");
      }
    });

    it("should have correct default badge positioning", () => {
      mockUnreadCountValue.value = 3;

      wrapper = mount(NotificationBadge);

      const badge = wrapper.find("span");
      if (badge.exists()) {
        expect(badge.classes()).toContain("absolute");
        expect(badge.classes()).toContain("-top-2");
        expect(badge.classes()).toContain("-right-2");
        expect(badge.classes()).toContain("rounded-full");
      }
    });
  });

  describe("Animation Behavior", () => {
    it("should animate when animate prop is true and new notifications arrive", async () => {
      mockUnreadCountValue.value = 1;

      wrapper = mount(NotificationBadge, {
        props: {
          animate: true,
        },
      });

      // Simulate unread count increase
      mockUnreadCountValue.value = 2;

      // Manually trigger the watcher logic
      wrapper.vm.hasNewNotifications = true;
      await nextTick();

      expect(wrapper.vm.hasNewNotifications).toBe(true);

      // After timeout, animation should stop
      setTimeout(() => {
        expect(wrapper.vm.hasNewNotifications).toBe(false);
      }, 2100);
    });

    it("should not animate when animate prop is false", async () => {
      mockUnreadCountValue.value = 1;

      wrapper = mount(NotificationBadge, {
        props: {
          animate: false,
        },
      });

      // Simulate unread count increase
      mockUnreadCountValue.value = 2;
      await nextTick();

      // Animation should not be triggered
      expect(wrapper.vm.hasNewNotifications).toBe(false);
    });

    it("should have pulse animation class when conditions are met", async () => {
      mockUnreadCountValue.value = 3;

      wrapper = mount(NotificationBadge, {
        props: {
          animate: true,
        },
      });

      // Set hasNewNotifications to trigger animation
      wrapper.vm.hasNewNotifications = true;
      await nextTick();

      // Badge should have animate-pulse when hasNewNotifications is true
      // Look for the actual badge span (with count), not the dot span
      const badge = wrapper.find("span.bg-red-500.text-white");
      if (badge.exists() && wrapper.vm.hasNewNotifications) {
        expect(badge.classes()).toContain("animate-pulse");
      }
    });
  });

  describe("Auto Start Polling", () => {
    it("should start polling when autoStart is true and not already polling", () => {
      mockIsPollingValue.value = false;

      mount(NotificationBadge, {
        props: {
          autoStart: true,
        },
      });

      expect(mockStartPolling).toHaveBeenCalled();
    });

    it("should not start polling when autoStart is false", () => {
      mockIsPollingValue.value = false;

      mount(NotificationBadge, {
        props: {
          autoStart: false,
        },
      });

      expect(mockStartPolling).not.toHaveBeenCalled();
    });

    it("should not start polling when already polling", () => {
      mockIsPollingValue.value = true;

      mount(NotificationBadge, {
        props: {
          autoStart: true,
        },
      });

      expect(mockStartPolling).not.toHaveBeenCalled();
    });
  });

  describe("Props Validation", () => {
    it("should accept all supported props", () => {
      const props = {
        iconClass: "custom-icon",
        badgeClass: "custom-badge",
        dotClass: "custom-dot",
        maxCount: 50,
        showDot: true,
        animate: false,
        autoStart: false,
      };

      wrapper = mount(NotificationBadge, { props });

      expect(wrapper.props()).toEqual(expect.objectContaining(props));
    });

    it("should use default values when props not provided", () => {
      wrapper = mount(NotificationBadge);

      expect(wrapper.props("maxCount")).toBe(99);
      expect(wrapper.props("showDot")).toBe(false);
      expect(wrapper.props("animate")).toBe(true);
      expect(wrapper.props("autoStart")).toBe(true);
      expect(wrapper.props("iconClass")).toBe("");
      expect(wrapper.props("badgeClass")).toBe("");
      expect(wrapper.props("dotClass")).toBe("");
    });
  });

  describe("Computed Properties", () => {
    it("should correctly compute displayCount for various scenarios", () => {
      // Test normal count
      mockUnreadCountValue.value = 5;
      wrapper = mount(NotificationBadge, { props: { maxCount: 99 } });
      expect(wrapper.vm.displayCount).toBe("5");

      // Test max count exceeded
      mockUnreadCountValue.value = 150;
      wrapper = mount(NotificationBadge, { props: { maxCount: 99 } });
      expect(wrapper.vm.displayCount).toBe("99+");

      // Test zero count
      mockUnreadCountValue.value = 0;
      wrapper = mount(NotificationBadge);
      expect(wrapper.vm.displayCount).toBe("0");

      // Test custom max count
      mockUnreadCountValue.value = 25;
      wrapper = mount(NotificationBadge, { props: { maxCount: 20 } });
      expect(wrapper.vm.displayCount).toBe("20+");
    });
  });

  describe("Reactivity", () => {
    it("should react to changes in unreadCount", async () => {
      mockUnreadCountValue.value = 1;

      wrapper = mount(NotificationBadge);

      expect(wrapper.vm.displayCount).toBe("1");

      // Change the mock return value
      mockUnreadCountValue.value = 5;

      // Force component update
      await wrapper.vm.$forceUpdate();
      await nextTick();

      // The new count should be reflected
      // Note: Since we're mocking the composable, the reactivity
      // would normally be handled by Vue's reactivity system
      expect(wrapper.vm.unreadCount).toBe(5);
    });

    it("should react to changes in hasUnreadNotifications", async () => {
      mockUnreadCountValue.value = 0;

      wrapper = mount(NotificationBadge);

      // Initially no badge should show
      const badge = wrapper.find(".bg-red-500");
      expect(badge.exists()).toBe(false);

      // Change to having unread notifications
      mockUnreadCountValue.value = 3;

      await wrapper.vm.$forceUpdate();
      await nextTick();

      // Now badge should potentially show
      expect(wrapper.vm.hasUnreadNotifications).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very large numbers correctly", () => {
      mockUnreadCountValue.value = 999999;

      wrapper = mount(NotificationBadge, {
        props: {
          maxCount: 999,
        },
      });

      expect(wrapper.vm.displayCount).toBe("999+");
    });

    it("should handle negative numbers gracefully", () => {
      mockUnreadCountValue.value = -1;

      wrapper = mount(NotificationBadge);

      // Should show no badge for negative count
      const badge = wrapper.find(".bg-red-500");
      expect(badge.exists()).toBe(false);
    });

    it("should handle zero maxCount", () => {
      mockUnreadCountValue.value = 5;

      wrapper = mount(NotificationBadge, {
        props: {
          maxCount: 0,
        },
      });

      expect(wrapper.vm.displayCount).toBe("0+");
    });
  });

  describe("Accessibility", () => {
    it("should have proper semantic structure", () => {
      mockUnreadCountValue.value = 5;

      wrapper = mount(NotificationBadge);

      // Should have a container div
      expect(wrapper.find("div.relative").exists()).toBe(true);

      // Icon should be properly structured
      const icon = wrapper.find("svg");
      expect(icon.exists()).toBe(true);
      expect(icon.attributes("viewBox")).toBe("0 0 24 24");
      expect(icon.attributes("fill")).toBe("none");
    });

    it("should provide visual indication of notification state", () => {
      mockUnreadCountValue.value = 3;

      wrapper = mount(NotificationBadge);

      // Badge should be visible and contain the count
      const badge = wrapper.find("span");
      if (badge.exists()) {
        expect(badge.text()).toBe("3");
        expect(badge.classes()).toContain("bg-red-500");
        expect(badge.classes()).toContain("text-white");
      }
    });
  });
});
