import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { nextTick, ref, computed } from "vue";
import NotificationBadge from "../NotificationBadge.vue";
import {
  shallowMountComponent,
  mountForProps,
  testPatterns,
} from "../../../../tests/utils/mounting";

// Mock reactive values for the composable
const mockUnreadCountValue = ref(0);
const mockIsPollingValue = ref(false);
const mockHasUnreadNotifications = computed(() => mockUnreadCountValue.value > 0);
const mockStartPolling = vi.fn();

vi.mock("@/composables/useJobNotifications", () => ({
  useJobNotifications: () => ({
    unreadCount: mockUnreadCountValue,
    hasUnreadNotifications: mockHasUnreadNotifications,
    startPolling: mockStartPolling,
    isPolling: mockIsPollingValue,
  }),
}));

describe("NotificationBadge Component (Shallow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset reactive values to defaults
    mockUnreadCountValue.value = 0;
    mockIsPollingValue.value = false;
  });

  describe("Basic Rendering", () => {
    it("should render without errors", () => {
      testPatterns.shouldRender(NotificationBadge);
    });

    it("should render bell icon", () => {
      const wrapper = shallowMountComponent(NotificationBadge);

      // With shallow mounting and icon stubs, we get a stubbed icon
      const icon = wrapper.find('[data-testid="bell-icon"]');
      expect(icon.exists()).toBe(true);
    });

    it("should apply default icon classes", () => {
      const wrapper = shallowMountComponent(NotificationBadge);

      const icon = wrapper.find('[data-testid="bell-icon"]');
      expect(icon.exists()).toBe(true);
      // The stubbed icon should exist but classes are in the wrapper
      expect(wrapper.html()).toContain('w-6');
      expect(wrapper.html()).toContain('h-6');
    });
  });

  describe("Badge Visibility", () => {
    it("should not show badge when unread count is 0", () => {
      mockUnreadCountValue.value = 0;

      const wrapper = shallowMountComponent(NotificationBadge);

      const badge = wrapper.find('.absolute');
      expect(badge.exists()).toBe(false);
    });

    it("should show badge when unread count > 0", async () => {
      mockUnreadCountValue.value = 3;

      const wrapper = shallowMountComponent(NotificationBadge);
      await nextTick();

      const badge = wrapper.find('.absolute');
      expect(badge.exists()).toBe(true);
    });

    it("should display correct unread count", async () => {
      mockUnreadCountValue.value = 5;

      const wrapper = shallowMountComponent(NotificationBadge);
      await nextTick();

      expect(wrapper.text()).toContain('5');
    });

    it("should display 99+ for counts over 99", async () => {
      mockUnreadCountValue.value = 150;

      const wrapper = shallowMountComponent(NotificationBadge);
      await nextTick();

      expect(wrapper.text()).toContain('99+');
    });
  });

  describe("Interactive States", () => {
    it("should apply hover classes", () => {
      const wrapper = shallowMountComponent(NotificationBadge);

      const container = wrapper.find('.relative');
      expect(container.classes()).toContain('hover:bg-gray-100');
    });

    it("should apply focus classes", () => {
      const wrapper = shallowMountComponent(NotificationBadge);

      const container = wrapper.find('.relative');
      expect(container.classes()).toContain('focus:outline-none');
    });
  });

  describe("Props Testing", () => {
    it("should accept custom icon classes", () => {
      const customClasses = "w-8 h-8 text-blue-500";

      const wrapper = mountForProps(NotificationBadge, {
        iconClass: customClasses,
      });

      expect(wrapper.html()).toContain('w-8');
      expect(wrapper.html()).toContain('h-8');
      expect(wrapper.html()).toContain('text-blue-500');
    });

    it("should accept custom badge classes", async () => {
      mockUnreadCountValue.value = 1;

      const wrapper = mountForProps(NotificationBadge, {
        badgeClass: "bg-red-600 text-white",
      });

      await nextTick();

      expect(wrapper.html()).toContain('bg-red-600');
      expect(wrapper.html()).toContain('text-white');
    });

    it("should handle disabled state", () => {
      const wrapper = mountForProps(NotificationBadge, {
        disabled: true,
      });

      const container = wrapper.find('.relative');
      expect(container.classes()).toContain('opacity-50');
      expect(container.classes()).toContain('cursor-not-allowed');
    });
  });

  describe("Event Handling", () => {
    it("should emit click event when clicked", async () => {
      await testPatterns.shouldEmitEvent(
        NotificationBadge,
        async (wrapper) => {
          await wrapper.trigger("click");
        },
        "click"
      );
    });

    it("should not emit click when disabled", async () => {
      const wrapper = mountForProps(NotificationBadge, {
        disabled: true,
      });

      await wrapper.trigger("click");

      const emitted = wrapper.emitted();
      expect(emitted.click).toBeFalsy();
    });

    it("should emit badge-click when badge is clicked", async () => {
      mockUnreadCountValue.value = 3;

      const wrapper = shallowMountComponent(NotificationBadge);
      await nextTick();

      const badge = wrapper.find('.absolute');
      await badge.trigger("click");

      const emitted = wrapper.emitted();
      expect(emitted["badge-click"]).toBeTruthy();
    });
  });

  describe("Reactivity", () => {
    it("should update badge when unread count changes", async () => {
      const wrapper = shallowMountComponent(NotificationBadge);

      // Initially no badge
      expect(wrapper.find('.absolute').exists()).toBe(false);

      // Add unread notifications
      mockUnreadCountValue.value = 2;
      await nextTick();

      expect(wrapper.find('.absolute').exists()).toBe(true);
      expect(wrapper.text()).toContain('2');

      // Change count
      mockUnreadCountValue.value = 7;
      await nextTick();

      expect(wrapper.text()).toContain('7');

      // Remove all
      mockUnreadCountValue.value = 0;
      await nextTick();

      expect(wrapper.find('.absolute').exists()).toBe(false);
    });
  });

  describe("Polling Integration", () => {
    it("should start polling on mount", () => {
      shallowMountComponent(NotificationBadge);

      expect(mockStartPolling).toHaveBeenCalledOnce();
    });

    it("should show polling indicator when active", async () => {
      mockIsPollingValue.value = true;

      const wrapper = shallowMountComponent(NotificationBadge);
      await nextTick();

      // Look for animation classes or polling indicator
      expect(wrapper.html()).toContain('animate-pulse');
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      const wrapper = shallowMountComponent(NotificationBadge);

      const container = wrapper.find('.relative');
      expect(container.attributes('role')).toBe('button');
      expect(container.attributes('aria-label')).toBeTruthy();
    });

    it("should have proper badge ARIA attributes", async () => {
      mockUnreadCountValue.value = 5;

      const wrapper = shallowMountComponent(NotificationBadge);
      await nextTick();

      const badge = wrapper.find('.absolute');
      expect(badge.attributes('aria-live')).toBe('polite');
      expect(badge.attributes('aria-label')).toContain('5');
    });

    it("should be keyboard accessible", async () => {
      const wrapper = shallowMountComponent(NotificationBadge);

      await wrapper.trigger("keydown.enter");

      const emitted = wrapper.emitted();
      expect(emitted.click).toBeTruthy();
    });

    it("should support space key activation", async () => {
      const wrapper = shallowMountComponent(NotificationBadge);

      await wrapper.trigger("keydown.space");

      const emitted = wrapper.emitted();
      expect(emitted.click).toBeTruthy();
    });
  });

  describe("Edge Cases", () => {
    it("should handle very large numbers gracefully", async () => {
      mockUnreadCountValue.value = Number.MAX_SAFE_INTEGER;

      const wrapper = shallowMountComponent(NotificationBadge);
      await nextTick();

      // Should still show 99+
      expect(wrapper.text()).toContain('99+');
    });

    it("should handle negative numbers", async () => {
      mockUnreadCountValue.value = -1;

      const wrapper = shallowMountComponent(NotificationBadge);
      await nextTick();

      // Should not show badge for negative numbers
      expect(wrapper.find('.absolute').exists()).toBe(false);
    });

    it("should handle rapid count changes", async () => {
      const wrapper = shallowMountComponent(NotificationBadge);

      // Rapidly change values
      for (let i = 0; i < 10; i++) {
        mockUnreadCountValue.value = i;
        await nextTick();
      }

      // Should end up with final value
      expect(wrapper.text()).toContain('9');
    });
  });

  describe("Performance Benefits", () => {
    it("should not render complex icon internals with shallow mounting", () => {
      const wrapper = shallowMountComponent(NotificationBadge);

      // With stubbed icons, the HTML should be minimal
      const html = wrapper.html();
      expect(html).toContain('data-testid="bell-icon"');

      // Should not contain complex SVG path elements that a real icon would have
      expect(html).not.toContain('<path');
      expect(html).not.toContain('<g');
    });

    it("should focus on component logic rather than child rendering", () => {
      const wrapper = shallowMountComponent(NotificationBadge);

      // We can test the component's own logic and structure
      expect(wrapper.classes()).toContain('relative');

      // Without worrying about child component implementation details
      const icon = wrapper.find('[data-testid="bell-icon"]');
      expect(icon.exists()).toBe(true);
    });
  });
});