import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref, nextTick } from "vue";
import ThemeToggle from "../ThemeToggle.vue";
import { useDarkMode } from "@/composables/useDarkMode";
import {
  shallowMountComponent,
  mountForProps,
  mountForEvents,
  testPatterns,
} from "../../../tests/utils/mounting";

vi.mock("@/composables/useDarkMode");

describe("ThemeToggle Component (Shallow)", () => {
  const createMockUseDarkMode = (overrides = {}) => ({
    theme: ref("light"),
    isDarkMode: false,
    systemDarkMode: false,
    setLightMode: vi.fn(),
    setDarkMode: vi.fn(),
    setSystemMode: vi.fn(),
    toggleMode: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock document event listeners
    vi.spyOn(document, "addEventListener").mockImplementation(() => {});
    vi.spyOn(document, "removeEventListener").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render without errors", () => {
      const mockUseDarkMode = vi.mocked(useDarkMode);
      mockUseDarkMode.mockReturnValue(createMockUseDarkMode());

      testPatterns.shouldRender(ThemeToggle, {
        props: { simple: true },
      });
    });

    it("should render simple toggle button when simple prop is true", () => {
      const mockUseDarkMode = vi.mocked(useDarkMode);
      mockUseDarkMode.mockReturnValue(createMockUseDarkMode());

      const wrapper = mountForProps(ThemeToggle, { simple: true });

      expect(wrapper.find("button").exists()).toBe(true);
      expect(wrapper.find("select").exists()).toBe(false);
    });

    it("should render dropdown when simple prop is false", () => {
      const mockUseDarkMode = vi.mocked(useDarkMode);
      mockUseDarkMode.mockReturnValue(createMockUseDarkMode());

      const wrapper = mountForProps(ThemeToggle, { simple: false });

      expect(wrapper.find("select").exists()).toBe(true);
      expect(wrapper.find("button").exists()).toBe(false);
    });

    it("should apply correct classes for dark mode", () => {
      const mockUseDarkMode = vi.mocked(useDarkMode);
      mockUseDarkMode.mockReturnValue(
        createMockUseDarkMode({
          isDarkMode: true,
          theme: ref("dark"),
        })
      );

      const wrapper = shallowMountComponent(ThemeToggle, {
        props: { simple: true },
      });

      const button = wrapper.find("button");
      expect(button.exists()).toBe(true);
      // Check that dark mode styling is applied
      expect(button.classes()).toContain("text-yellow-500");
    });
  });

  describe("Props Testing", () => {
    it("should accept simple prop", () => {
      const mockUseDarkMode = vi.mocked(useDarkMode);
      mockUseDarkMode.mockReturnValue(createMockUseDarkMode());

      testPatterns.shouldAcceptProps(ThemeToggle, { simple: true });
    });

    it("should handle undefined simple prop (default to false)", () => {
      const mockUseDarkMode = vi.mocked(useDarkMode);
      mockUseDarkMode.mockReturnValue(createMockUseDarkMode());

      const wrapper = mountForProps(ThemeToggle, {});

      // Default should be dropdown mode (not simple)
      expect(wrapper.find("select").exists()).toBe(true);
    });
  });

  describe("Event Handling", () => {
    it("should emit correct calls when simple button is clicked", async () => {
      const mockToggleMode = vi.fn();
      const mockUseDarkMode = vi.mocked(useDarkMode);
      mockUseDarkMode.mockReturnValue(
        createMockUseDarkMode({
          toggleMode: mockToggleMode,
        })
      );

      await testPatterns.shouldEmitEvent(
        ThemeToggle,
        async (wrapper) => {
          const button = wrapper.find("button");
          expect(button.exists()).toBe(true);
          await button.trigger("click");
        },
        "theme-changed"
      );

      expect(mockToggleMode).toHaveBeenCalledOnce();
    });

    it("should call correct mode functions when dropdown changes", async () => {
      const mockSetLightMode = vi.fn();
      const mockSetDarkMode = vi.fn();
      const mockSetSystemMode = vi.fn();
      const mockUseDarkMode = vi.mocked(useDarkMode);

      mockUseDarkMode.mockReturnValue(
        createMockUseDarkMode({
          setLightMode: mockSetLightMode,
          setDarkMode: mockSetDarkMode,
          setSystemMode: mockSetSystemMode,
        })
      );

      const wrapper = mountForEvents(ThemeToggle, {
        props: { simple: false },
      });

      const select = wrapper.find("select");
      expect(select.exists()).toBe(true);

      // Test light mode selection
      await select.setValue("light");
      expect(mockSetLightMode).toHaveBeenCalledOnce();

      // Test dark mode selection
      await select.setValue("dark");
      expect(mockSetDarkMode).toHaveBeenCalledOnce();

      // Test system mode selection
      await select.setValue("system");
      expect(mockSetSystemMode).toHaveBeenCalledOnce();
    });
  });

  describe("Theme State Reflection", () => {
    it("should show correct button state for light theme", () => {
      const mockUseDarkMode = vi.mocked(useDarkMode);
      mockUseDarkMode.mockReturnValue(
        createMockUseDarkMode({
          theme: ref("light"),
          isDarkMode: false,
        })
      );

      const wrapper = shallowMountComponent(ThemeToggle, {
        props: { simple: true },
      });

      const button = wrapper.find("button");
      expect(button.exists()).toBe(true);

      // Should contain sun icon classes for light mode
      expect(button.html()).toContain("sun-icon");
    });

    it("should show correct button state for dark theme", () => {
      const mockUseDarkMode = vi.mocked(useDarkMode);
      mockUseDarkMode.mockReturnValue(
        createMockUseDarkMode({
          theme: ref("dark"),
          isDarkMode: true,
        })
      );

      const wrapper = shallowMountComponent(ThemeToggle, {
        props: { simple: true },
      });

      const button = wrapper.find("button");
      expect(button.exists()).toBe(true);

      // Should contain moon icon classes for dark mode
      expect(button.html()).toContain("moon-icon");
    });

    it("should show correct dropdown selection", () => {
      const mockUseDarkMode = vi.mocked(useDarkMode);
      mockUseDarkMode.mockReturnValue(
        createMockUseDarkMode({
          theme: ref("system"),
        })
      );

      const wrapper = shallowMountComponent(ThemeToggle, {
        props: { simple: false },
      });

      const select = wrapper.find("select");
      expect(select.exists()).toBe(true);
      expect(select.element.value).toBe("system");
    });
  });

  describe("Reactivity", () => {
    it("should update when theme changes", async () => {
      const themeRef = ref("light");
      const mockUseDarkMode = vi.mocked(useDarkMode);
      mockUseDarkMode.mockReturnValue(
        createMockUseDarkMode({
          theme: themeRef,
          isDarkMode: false,
        })
      );

      const wrapper = shallowMountComponent(ThemeToggle, {
        props: { simple: false },
      });

      const select = wrapper.find("select");
      expect(select.element.value).toBe("light");

      // Change theme reactively
      themeRef.value = "dark";
      await nextTick();

      expect(select.element.value).toBe("dark");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing composable gracefully", () => {
      const mockUseDarkMode = vi.mocked(useDarkMode);
      mockUseDarkMode.mockReturnValue(
        createMockUseDarkMode({
          setLightMode: undefined,
          setDarkMode: undefined,
          setSystemMode: undefined,
        })
      );

      // Should not throw when functions are undefined
      expect(() => {
        shallowMountComponent(ThemeToggle, {
          props: { simple: true },
        });
      }).not.toThrow();
    });
  });

  describe("Accessibility", () => {
    it("should have proper button attributes", () => {
      const mockUseDarkMode = vi.mocked(useDarkMode);
      mockUseDarkMode.mockReturnValue(createMockUseDarkMode());

      const wrapper = shallowMountComponent(ThemeToggle, {
        props: { simple: true },
      });

      const button = wrapper.find("button");
      expect(button.attributes("type")).toBe("button");
      expect(button.attributes("aria-label")).toBeTruthy();
    });

    it("should have proper select attributes", () => {
      const mockUseDarkMode = vi.mocked(useDarkMode);
      mockUseDarkMode.mockReturnValue(createMockUseDarkMode());

      const wrapper = shallowMountComponent(ThemeToggle, {
        props: { simple: false },
      });

      const select = wrapper.find("select");
      expect(select.attributes("aria-label")).toBeTruthy();
    });
  });
});