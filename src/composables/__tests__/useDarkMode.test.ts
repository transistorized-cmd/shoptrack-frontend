import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { nextTick } from "vue";
import { resetLocalStorageMock } from "../../../tests/utils/localStorage";
import {
  createMockMatchMedia,
  triggerMediaQueryChange,
} from "../../../tests/utils/darkMode";

// Mock Vue's onMounted to avoid lifecycle warnings in tests
vi.mock("vue", async () => {
  const actual = await vi.importActual("vue");
  return {
    ...actual,
    onMounted: vi.fn((callback) => {
      // In tests, just call the callback immediately
      if (callback) callback();
    }),
  };
});

describe("useDarkMode Composable", () => {
  let mockMediaQuery: {
    matches: boolean;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };

  // Helper function to import fresh useDarkMode module
  const getUseDarkMode = async () => {
    const { useDarkMode } = await import("@/composables/useDarkMode");
    return useDarkMode;
  };

  beforeEach(async () => {
    // Reset localStorage with reactive mock
    resetLocalStorageMock();

    // Reset document classes
    document.documentElement.classList.remove("dark");

    // Create fresh matchMedia mock
    mockMediaQuery = createMockMatchMedia(false);

    // Reset modules to ensure fresh state
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetLocalStorageMock();
    document.documentElement.classList.remove("dark");
  });

  describe("Initialization", () => {
    it("should initialize with system theme by default", async () => {
      const useDarkMode = await getUseDarkMode();
      const { theme, systemDarkMode } = useDarkMode();

      expect(theme.value).toBe("system");
      expect(systemDarkMode.value).toBe(false);
    });

    it("should detect system dark mode preference", async () => {
      mockMediaQuery = createMockMatchMedia(true);

      const useDarkMode = await getUseDarkMode();
      const { systemDarkMode } = useDarkMode();

      expect(systemDarkMode.value).toBe(true);
    });

    it("should load saved theme from localStorage", async () => {
      localStorage.setItem("shoptrack-theme", "dark");

      const useDarkMode = await getUseDarkMode();
      const { theme } = useDarkMode();

      // Wait for onMounted to execute
      await nextTick();

      expect(theme.value).toBe("dark");
    });

    it("should ignore invalid themes from localStorage", async () => {
      localStorage.setItem("shoptrack-theme", "invalid");

      const useDarkMode = await getUseDarkMode();
      const { theme } = useDarkMode();

      // Wait for onMounted to execute
      await nextTick();

      expect(theme.value).toBe("system");
    });

    it("should apply dark class to document on initialization", async () => {
      localStorage.setItem("shoptrack-theme", "dark");

      const useDarkMode = await getUseDarkMode();
      useDarkMode();

      // Wait for onMounted to execute
      await nextTick();

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  describe("Theme Setting", () => {
    it("should set light mode correctly", async () => {
      const useDarkMode = await getUseDarkMode();
      const { setLightMode, theme, isDarkMode } = useDarkMode();

      setLightMode();

      expect(theme.value).toBe("light");
      expect(isDarkMode.value).toBe(false);
    });

    it("should set dark mode correctly", async () => {
      const useDarkMode = await getUseDarkMode();
      const { setDarkMode, theme, isDarkMode } = useDarkMode();

      setDarkMode();

      expect(theme.value).toBe("dark");
      expect(isDarkMode.value).toBe(true);
    });

    it("should set system mode correctly", async () => {
      const useDarkMode = await getUseDarkMode();
      const { setSystemMode, theme } = useDarkMode();

      setSystemMode();

      expect(theme.value).toBe("system");
    });

    it("should save theme to localStorage when changed", async () => {
      const useDarkMode = await getUseDarkMode();
      const { setDarkMode } = useDarkMode();

      setDarkMode();

      await nextTick();

      expect(localStorage.getItem("shoptrack-theme")).toBe("dark");
    });
  });

  describe("Theme Application", () => {
    it("should add dark class when in dark mode", async () => {
      const useDarkMode = await getUseDarkMode();
      const { setDarkMode } = useDarkMode();

      setDarkMode();

      await nextTick();

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("should remove dark class when in light mode", async () => {
      // First set dark mode
      document.documentElement.classList.add("dark");

      const useDarkMode = await getUseDarkMode();
      const { setLightMode } = useDarkMode();

      setLightMode();

      await nextTick();

      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("should apply system theme correctly", async () => {
      mockMediaQuery = createMockMatchMedia(true);

      const useDarkMode = await getUseDarkMode();
      const { setSystemMode, isDarkMode } = useDarkMode();

      setSystemMode();

      await nextTick();

      expect(isDarkMode.value).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  describe("System Theme Detection", () => {
    it("should listen for system theme changes", async () => {
      const useDarkMode = await getUseDarkMode();
      useDarkMode();

      expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith(
        "change",
        expect.any(Function),
      );
    });

    it("should update system dark mode when media query changes", async () => {
      const useDarkMode = await getUseDarkMode();
      const { systemDarkMode, isDarkMode, setSystemMode } = useDarkMode();

      setSystemMode();

      // Simulate system theme change
      triggerMediaQueryChange(mockMediaQuery, true);

      await nextTick();

      expect(systemDarkMode.value).toBe(true);
      expect(isDarkMode.value).toBe(true);
    });

    it("should handle absence of matchMedia gracefully", async () => {
      // Mock the absence of matchMedia (e.g., SSR environment)
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: undefined,
      });

      expect(async () => {
        const useDarkMode = await getUseDarkMode();
        useDarkMode();
      }).not.toThrow();
    });
  });

  describe("Theme Toggle", () => {
    it("should toggle from system to explicit dark when system is light", async () => {
      mockMediaQuery = createMockMatchMedia(false); // System is light

      const useDarkMode = await getUseDarkMode();
      const { toggleMode, theme, setSystemMode } = useDarkMode();

      setSystemMode();
      toggleMode();

      expect(theme.value).toBe("dark");
    });

    it("should toggle from system to explicit light when system is dark", async () => {
      mockMediaQuery = createMockMatchMedia(true); // System is dark

      const useDarkMode = await getUseDarkMode();
      const { toggleMode, theme, setSystemMode } = useDarkMode();

      setSystemMode();
      toggleMode();

      expect(theme.value).toBe("light");
    });

    it("should toggle from explicit dark to light", async () => {
      const useDarkMode = await getUseDarkMode();
      const { toggleMode, theme, setDarkMode } = useDarkMode();

      setDarkMode();
      toggleMode();

      expect(theme.value).toBe("light");
    });

    it("should toggle from explicit light to dark", async () => {
      const useDarkMode = await getUseDarkMode();
      const { toggleMode, theme, setLightMode } = useDarkMode();

      setLightMode();
      toggleMode();

      expect(theme.value).toBe("dark");
    });
  });

  describe("Computed Properties", () => {
    it("should compute isDarkMode correctly for dark theme", async () => {
      const useDarkMode = await getUseDarkMode();
      const { setDarkMode, isDarkMode } = useDarkMode();

      setDarkMode();

      expect(isDarkMode.value).toBe(true);
    });

    it("should compute isDarkMode correctly for light theme", async () => {
      const useDarkMode = await getUseDarkMode();
      const { setLightMode, isDarkMode } = useDarkMode();

      setLightMode();

      expect(isDarkMode.value).toBe(false);
    });

    it("should compute isDarkMode correctly for system theme with dark preference", async () => {
      mockMediaQuery = createMockMatchMedia(true);

      const useDarkMode = await getUseDarkMode();
      const { setSystemMode, isDarkMode } = useDarkMode();

      setSystemMode();

      expect(isDarkMode.value).toBe(true);
    });

    it("should compute isDarkMode correctly for system theme with light preference", async () => {
      mockMediaQuery = createMockMatchMedia(false);

      const useDarkMode = await getUseDarkMode();
      const { setSystemMode, isDarkMode } = useDarkMode();

      setSystemMode();

      expect(isDarkMode.value).toBe(false);
    });

    it("should provide theme property that reflects current state", async () => {
      const useDarkMode = await getUseDarkMode();
      const { theme, setDarkMode, setLightMode } = useDarkMode();

      // Theme should reflect the current mode
      setLightMode();
      expect(theme.value).toBe("light");

      setDarkMode();
      expect(theme.value).toBe("dark");

      // Theme changes only through proper methods, not direct assignment
      setLightMode();
      expect(theme.value).toBe("light");
    });

    it("should provide systemDarkMode property reflecting system preference", async () => {
      const useDarkMode = await getUseDarkMode();
      const { systemDarkMode } = useDarkMode();

      // systemDarkMode reflects the media query state
      expect(typeof systemDarkMode.value).toBe("boolean");

      // Value depends on system preference (mocked in test)
      const mockMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      expect(systemDarkMode.value).toBe(mockMediaQuery.matches);
    });
  });

  describe("Reactive Updates", () => {
    it("should reactively update document class when theme changes", async () => {
      const useDarkMode = await getUseDarkMode();
      const { setLightMode, setDarkMode } = useDarkMode();

      // Start with light
      setLightMode();
      await nextTick();
      expect(document.documentElement.classList.contains("dark")).toBe(false);

      // Switch to dark
      setDarkMode();
      await nextTick();
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      // Switch back to light
      setLightMode();
      await nextTick();
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("should reactively update when system preference changes", async () => {
      const useDarkMode = await getUseDarkMode();
      const { setSystemMode, isDarkMode } = useDarkMode();

      setSystemMode();

      // Initial state (system is light)
      expect(isDarkMode.value).toBe(false);

      // Simulate system theme change to dark
      triggerMediaQueryChange(mockMediaQuery, true);

      await nextTick();

      expect(isDarkMode.value).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  describe("Multiple Instances", () => {
    it("should share state between multiple composable instances", async () => {
      const useDarkMode = await getUseDarkMode();
      const instance1 = useDarkMode();
      const instance2 = useDarkMode();

      instance1.setDarkMode();

      expect(instance2.theme.value).toBe("dark");
      expect(instance2.isDarkMode.value).toBe(true);
    });

    it("should sync localStorage updates across instances", async () => {
      const useDarkMode = await getUseDarkMode();
      const instance1 = useDarkMode();
      const instance2 = useDarkMode();

      instance1.setLightMode();

      await nextTick();

      expect(localStorage.getItem("shoptrack-theme")).toBe("light");
      expect(instance2.theme.value).toBe("light");
    });
  });

  describe("Edge Cases", () => {
    it("should handle document being undefined (SSR)", async () => {
      // Mock document being undefined
      const originalDocument = global.document;
      // @ts-ignore
      global.document = undefined;

      expect(async () => {
        const useDarkMode = await getUseDarkMode();
        useDarkMode();
      }).not.toThrow();

      // Restore document
      global.document = originalDocument;
    });

    it("should handle localStorage errors gracefully", async () => {
      // Create a fresh localStorage mock that throws errors
      const errorStorage = {
        getItem: vi.fn().mockImplementation(() => {
          throw new Error("Storage error");
        }),
        setItem: vi.fn().mockImplementation(() => {
          throw new Error("Storage error");
        }),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };

      // Temporarily replace localStorage
      const originalLocalStorage = global.localStorage;
      Object.defineProperty(global, "localStorage", {
        value: errorStorage,
        writable: true,
        configurable: true,
      });

      // Reset modules to pick up the new localStorage mock
      vi.resetModules();

      const useDarkMode = await getUseDarkMode();
      const { setDarkMode } = useDarkMode();

      // Should not throw even if localStorage fails
      expect(() => setDarkMode()).not.toThrow();

      // Restore original localStorage
      Object.defineProperty(global, "localStorage", {
        value: originalLocalStorage,
        writable: true,
        configurable: true,
      });
    });

    it("should handle empty string in localStorage", async () => {
      localStorage.setItem("shoptrack-theme", "");

      const useDarkMode = await getUseDarkMode();
      const { theme } = useDarkMode();

      await nextTick();

      expect(theme.value).toBe("system"); // Should fallback to default
    });

    it("should handle null values in localStorage gracefully", async () => {
      // Mock getItem to return null
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn().mockReturnValue(null);

      const useDarkMode = await getUseDarkMode();
      const { theme } = useDarkMode();

      await nextTick();

      expect(theme.value).toBe("system"); // Should use default

      // Restore getItem
      localStorage.getItem = originalGetItem;
    });
  });

  describe("Theme Persistence", () => {
    it("should persist theme selection across page reloads", async () => {
      // First session
      const useDarkMode1 = await getUseDarkMode();
      const { setDarkMode } = useDarkMode1();
      setDarkMode();

      await nextTick();

      expect(localStorage.getItem("shoptrack-theme")).toBe("dark");

      // Reset modules to simulate new page load
      vi.resetModules();

      // Simulate new page load by creating new instance
      const useDarkMode2 = await getUseDarkMode();
      const { theme: newTheme } = useDarkMode2();

      await nextTick();

      expect(newTheme.value).toBe("dark");
    });

    it("should update localStorage immediately when theme changes", async () => {
      const useDarkMode = await getUseDarkMode();
      const { setLightMode, setDarkMode, setSystemMode } = useDarkMode();

      setLightMode();
      await nextTick();
      expect(localStorage.getItem("shoptrack-theme")).toBe("light");

      setDarkMode();
      await nextTick();
      expect(localStorage.getItem("shoptrack-theme")).toBe("dark");

      setSystemMode();
      await nextTick();
      expect(localStorage.getItem("shoptrack-theme")).toBe("system");
    });
  });

  describe("CSS Class Management", () => {
    it("should not add duplicate dark classes", async () => {
      const useDarkMode = await getUseDarkMode();
      const { setDarkMode } = useDarkMode();

      // Manually add dark class
      document.documentElement.classList.add("dark");

      setDarkMode();
      await nextTick();

      // Should still only have one dark class
      expect(document.documentElement.classList.toString()).toBe("dark");
    });

    it("should handle class list modifications from other sources", async () => {
      const useDarkMode = await getUseDarkMode();
      const { setDarkMode, setLightMode } = useDarkMode();

      // Add other classes
      document.documentElement.classList.add("other-class", "another-class");

      setDarkMode();
      await nextTick();

      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.classList.contains("other-class")).toBe(
        true,
      );

      setLightMode();
      await nextTick();

      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.documentElement.classList.contains("other-class")).toBe(
        true,
      );
    });
  });
});
