import { vi } from "vitest";

/**
 * Reset the useDarkMode composable module state for testing
 * This is needed because the composable uses module-level reactive variables
 */
export function resetDarkModeState() {
  // Clear any existing modules from the cache to force re-initialization
  vi.resetModules();
}

/**
 * Create a fresh mock for matchMedia that can be controlled in tests
 */
export function createMockMatchMedia(initialMatches = false) {
  const mockMediaQuery = {
    matches: initialMatches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => {
      if (query === "(prefers-color-scheme: dark)") {
        return mockMediaQuery;
      }
      return {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    }),
  });

  return mockMediaQuery;
}

/**
 * Helper to simulate media query change event
 */
export function triggerMediaQueryChange(mockMediaQuery: any, matches: boolean) {
  mockMediaQuery.matches = matches;

  // Find and call the change event listener
  const changeCall = mockMediaQuery.addEventListener.mock.calls.find(
    (call: any[]) => call[0] === "change",
  );

  if (changeCall && changeCall[1]) {
    changeCall[1]({ matches });
  }
}
