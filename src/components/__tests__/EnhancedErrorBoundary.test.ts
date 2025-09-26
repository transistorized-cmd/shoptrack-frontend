import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import { defineComponent } from "vue";
import EnhancedErrorBoundary from "../EnhancedErrorBoundary.vue";
import { createMockRouter } from "../../../tests/utils/router";

// Mock console methods to avoid noise in tests
const mockConsole = {
  error: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn(),
};

// Mock window.location
Object.defineProperty(window, "location", {
  value: {
    href: "http://localhost:3000/test",
    assign: vi.fn(),
  },
  writable: true,
});

describe("EnhancedErrorBoundary Component", () => {
  let wrapper: any;
  let mockRouter: any;

  // Component that throws different types of errors
  const ErrorThrowingComponent = defineComponent({
    props: {
      shouldError: {
        type: Boolean,
        default: false,
      },
      errorType: {
        type: String,
        default: "generic",
      },
    },
    setup(props) {
      const throwError = () => {
        if (props.shouldError) {
          switch (props.errorType) {
            case "chunk":
              const chunkError = new Error("Loading chunk 0 failed");
              chunkError.name = "ChunkLoadError";
              throw chunkError;
            case "network":
              const networkError = new Error("fetch failed");
              networkError.name = "NetworkError";
              throw networkError;
            case "404":
              throw new Error("404: Not Found");
            case "403":
              throw new Error("403: Forbidden");
            case "500":
              throw new Error("500: Internal Server Error");
            case "plugin":
              throw new Error("Plugin initialization failed");
            default:
              throw new Error("Test error");
          }
        }
      };

      throwError();

      return { throwError };
    },
    template: "<div>Working component</div>",
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods
    global.console.error = mockConsole.error;
    global.console.group = mockConsole.group;
    global.console.groupEnd = mockConsole.groupEnd;

    const { mockRouter: router } = createMockRouter();
    mockRouter = router;
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    vi.restoreAllMocks();
  });

  describe("Normal Operation", () => {
    it("should render children when there are no errors", () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: '<div data-testid="child">Child content</div>',
        },
      });

      expect(wrapper.find('[data-testid="child"]').exists()).toBe(true);
      expect(wrapper.find(".bg-red-100").exists()).toBe(false);
    });

    it("should have correct default props", () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
      });

      expect(wrapper.vm.fallback).toBe(
        "An unexpected error occurred. Please try again.",
      );
      expect(wrapper.vm.showErrorDetails).toBe(false);
      expect(wrapper.vm.maxRetries).toBe(3);
      expect(wrapper.vm.captureAsync).toBe(true);
    });

    it("should accept custom props", () => {
      wrapper = mount(EnhancedErrorBoundary, {
        props: {
          fallback: "Custom error message",
          showErrorDetails: true,
          maxRetries: 5,
          captureAsync: false,
        },
        global: {
          plugins: [mockRouter],
        },
      });

      expect(wrapper.vm.fallback).toBe("Custom error message");
      expect(wrapper.vm.showErrorDetails).toBe(true);
      expect(wrapper.vm.maxRetries).toBe(5);
      expect(wrapper.vm.captureAsync).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should catch and display generic errors", async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template: '<ErrorThrowingComponent :should-error="true" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      expect(wrapper.find(".bg-red-100").exists()).toBe(true);
      expect(wrapper.text()).toContain("Something went wrong");
      expect(wrapper.text()).toContain(
        "An unexpected error occurred. Please try again.",
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        "Component Error caught by ErrorBoundary:",
        expect.any(Error),
      );
    });

    it("should display user-friendly message for chunk load errors", async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template:
              '<ErrorThrowingComponent :should-error="true" error-type="chunk" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      expect(wrapper.text()).toContain(
        "Failed to load application resources. Please refresh the page.",
      );
    });

    it("should display user-friendly message for network errors", async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template:
              '<ErrorThrowingComponent :should-error="true" error-type="network" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      expect(wrapper.text()).toContain(
        "Unable to connect to the server. Please check your internet connection and try again.",
      );
    });

    it("should display user-friendly message for 404 errors", async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template:
              '<ErrorThrowingComponent :should-error="true" error-type="404" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      expect(wrapper.text()).toContain("The requested resource was not found.");
    });

    it("should display user-friendly message for 403 errors", async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template:
              '<ErrorThrowingComponent :should-error="true" error-type="403" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      expect(wrapper.text()).toContain(
        "You don't have permission to access this resource.",
      );
    });

    it("should display user-friendly message for 500 errors", async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template:
              '<ErrorThrowingComponent :should-error="true" error-type="500" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      expect(wrapper.text()).toContain(
        "Server error occurred. Please try again later.",
      );
    });

    it("should display user-friendly message for plugin errors", async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template:
              '<ErrorThrowingComponent :should-error="true" error-type="plugin" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      expect(wrapper.text()).toContain(
        "A plugin error occurred. The page may still work, but some features might be unavailable.",
      );
    });
  });

  describe("Error Type Indicators", () => {
    it("should display error type badge for component errors", async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template: '<ErrorThrowingComponent :should-error="true" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      const errorTypeBadge = wrapper.find(".bg-red-100.text-red-800");
      expect(errorTypeBadge.exists()).toBe(true);
      expect(errorTypeBadge.text()).toBe("Component Error");
    });

    it("should apply correct CSS classes for different error types", () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
      });

      // Test getErrorTypeClass method
      expect(wrapper.vm.getErrorTypeClass("Async Error")).toContain(
        "bg-orange-100 text-orange-800",
      );
      expect(wrapper.vm.getErrorTypeClass("Component Error")).toContain(
        "bg-red-100 text-red-800",
      );
      expect(wrapper.vm.getErrorTypeClass("Network Error")).toContain(
        "bg-blue-100 text-blue-800",
      );
      expect(wrapper.vm.getErrorTypeClass("Unknown")).toContain(
        "bg-gray-100 text-gray-800",
      );
    });
  });

  describe("Error Details", () => {
    it("should show error details when showErrorDetails prop is true", async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        props: {
          showErrorDetails: true,
        },
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template: '<ErrorThrowingComponent :should-error="true" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      expect(wrapper.find("details").exists()).toBe(true);
      expect(wrapper.text()).toContain("Technical Details");
    });

    it('should show "Show Details" button when showErrorDetails is false', async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        props: {
          showErrorDetails: false,
        },
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template: '<ErrorThrowingComponent :should-error="true" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      const showDetailsButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Show Details"));
      expect(showDetailsButton).toBeTruthy();
    });

    it('should toggle error details when "Show Details" button is clicked', async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        props: {
          showErrorDetails: false,
        },
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template: '<ErrorThrowingComponent :should-error="true" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      const showDetailsButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Show Details"));
      expect(showDetailsButton).toBeTruthy();
      expect(wrapper.find("details").exists()).toBe(false);

      await showDetailsButton.trigger("click");
      await nextTick();

      expect(wrapper.find("details").exists()).toBe(true);
      expect(wrapper.text()).toContain("Technical Details");
    });
  });

  describe("Retry Mechanism", () => {
    it('should reset error state when "Try Again" is clicked within retry limit', async () => {
      let shouldThrowError = true;
      const MockErrorComponent = defineComponent({
        setup() {
          const throwError = () => {
            if (shouldThrowError) {
              throw new Error("Test error for retry");
            }
          };
          throwError();
          return {};
        },
        template: "<div>Working component</div>",
      });

      wrapper = mount(EnhancedErrorBoundary, {
        props: {
          maxRetries: 3,
        },
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: MockErrorComponent,
        },
      });

      await nextTick();
      await flushPromises();

      expect(wrapper.find(".bg-red-100").exists()).toBe(true);
      expect(wrapper.vm.retryCount).toBe(0);

      // Disable error throwing for retry
      shouldThrowError = false;

      const tryAgainButton = wrapper
        .findAll("button")
        .find((btn) => btn.text() === "Try Again");
      await tryAgainButton.trigger("click");
      await nextTick();

      expect(wrapper.vm.hasError).toBe(false);
      expect(wrapper.vm.retryCount).toBe(1);
      expect(wrapper.vm.errorDetails).toBeNull();
    });

    it("should show retry count indicator", async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
      });

      // Manually set retry count to test indicator
      wrapper.vm.retryCount = 2;
      wrapper.vm.hasError = true;
      await nextTick();

      expect(wrapper.text()).toContain("Retry attempt: 2");
    });

    it("should prevent retries beyond maxRetries limit", async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        props: {
          maxRetries: 2,
        },
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template: '<ErrorThrowingComponent :should-error="true" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      // Simulate reaching max retries
      wrapper.vm.retryCount = 2;
      await nextTick();

      const tryAgainButton = wrapper
        .findAll("button")
        .find((btn) => btn.text() === "Try Again");
      await tryAgainButton.trigger("click");

      expect(wrapper.vm.hasError).toBe(true);
      expect(wrapper.text()).toContain(
        "Maximum retry attempts (2) reached. Please refresh the page.",
      );
    });
  });

  describe("Navigation", () => {
    it.skip('should navigate to home when "Go Home" is clicked', async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template: '<ErrorThrowingComponent :should-error="true" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      // Verify the error state is set initially
      expect(wrapper.vm.hasError).toBe(true);

      const goHomeButton = wrapper
        .findAll("button")
        .find((btn) => btn.text() === "Go Home");
      expect(goHomeButton).toBeTruthy();

      // Call the goHome method directly to test the logic
      await wrapper.vm.goHome();

      // Wait for any async operations to complete
      await nextTick();
      await flushPromises();

      expect(mockRouter.push).toHaveBeenCalledWith("/");
      expect(wrapper.vm.hasError).toBe(false);
      expect(wrapper.vm.retryCount).toBe(0);
    });

    it("should handle navigation failure gracefully", async () => {
      mockRouter.push.mockRejectedValue(new Error("Navigation failed"));

      // Mock window.location.href
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: "" };

      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template: '<ErrorThrowingComponent :should-error="true" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      const goHomeButton = wrapper
        .findAll("button")
        .find((btn) => btn.text() === "Go Home");
      await goHomeButton.trigger("click");
      await flushPromises();

      expect(mockRouter.push).toHaveBeenCalledWith("/");
      expect(window.location.href).toBe("/");

      // Restore location
      window.location = originalLocation;
    });
  });

  describe("Async Error Handling", () => {
    it("should set up async error listeners when captureAsync is true", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      wrapper = mount(EnhancedErrorBoundary, {
        props: {
          captureAsync: true,
        },
        global: {
          plugins: [mockRouter],
        },
      });

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "vue:async-error",
        expect.any(Function),
      );

      addEventListenerSpy.mockRestore();
    });

    it("should not set up async error listeners when captureAsync is false", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      wrapper = mount(EnhancedErrorBoundary, {
        props: {
          captureAsync: false,
        },
        global: {
          plugins: [mockRouter],
        },
      });

      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        "vue:async-error",
        expect.any(Function),
      );

      addEventListenerSpy.mockRestore();
    });

    it("should handle async errors when received", async () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      wrapper = mount(EnhancedErrorBoundary, {
        props: {
          captureAsync: true,
        },
        global: {
          plugins: [mockRouter],
        },
      });

      // Simulate async error event
      const asyncError = new Error("Async operation failed");
      const asyncErrorEvent = new CustomEvent("vue:async-error", {
        detail: {
          error: asyncError,
          context: "Data loading operation",
        },
      });

      window.dispatchEvent(asyncErrorEvent);
      await nextTick();

      expect(wrapper.vm.hasError).toBe(true);
      expect(wrapper.vm.errorType).toBe("Async Error");
      expect(wrapper.text()).toContain(
        "An error occurred while loading data. Please try refreshing the page.",
      );

      // Cleanup should remove listeners
      wrapper.unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "vue:async-error",
        expect.any(Function),
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe("Error Logging", () => {
    it("should log errors to console with proper formatting", async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template: '<ErrorThrowingComponent :should-error="true" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      expect(mockConsole.group).toHaveBeenCalledWith(
        "🔴 Enhanced Error Report",
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        "Error details:",
        expect.objectContaining({
          timestamp: expect.any(String),
          url: expect.any(String),
          userAgent: expect.any(String),
          errorType: "Component Error",
          retryCount: 0,
          error: expect.objectContaining({
            name: "Error",
            message: "Test error",
            stack: expect.any(String),
          }),
          contextInfo: expect.any(String),
          userId: null,
        }),
      );
      expect(mockConsole.groupEnd).toHaveBeenCalled();
    });

    it("should handle logging errors gracefully", async () => {
      const originalGroup = mockConsole.group;
      mockConsole.group.mockImplementation(() => {
        throw new Error("Logging failed");
      });

      // This should not crash the component
      await expect(async () => {
        const wrapper = mount(EnhancedErrorBoundary, {
          global: {
            plugins: [mockRouter],
          },
          slots: {
            default: {
              components: { ErrorThrowingComponent },
              template: '<ErrorThrowingComponent :should-error="true" />',
            },
          },
        });

        await nextTick();

        expect(wrapper.find(".bg-red-100").exists()).toBe(true);
        wrapper.unmount();
      }).not.toThrow();

      mockConsole.group = originalGroup;
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes and semantic HTML", async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template: '<ErrorThrowingComponent :should-error="true" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      expect(wrapper.find(".bg-red-100").exists()).toBe(true);

      // Check heading structure
      expect(wrapper.find("h3").exists()).toBe(true);
      expect(wrapper.find("h3").classes()).toContain("text-lg");

      // Check main buttons have focus styles
      const tryAgainButton = wrapper
        .findAll("button")
        .find((btn) => btn.text() === "Try Again");
      expect(tryAgainButton.classes()).toContain("focus:outline-none");
      expect(tryAgainButton.classes()).toContain("focus:ring-2");

      const goHomeButton = wrapper
        .findAll("button")
        .find((btn) => btn.text() === "Go Home");
      expect(goHomeButton.classes()).toContain("focus:outline-none");
      expect(goHomeButton.classes()).toContain("focus:ring-2");

      // Check details element for progressive disclosure
      if (wrapper.find("details").exists()) {
        expect(wrapper.find("summary").exists()).toBe(true);
      }
    });
  });

  describe("CSS Classes and Styling", () => {
    it("should apply correct styling classes", async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template: '<ErrorThrowingComponent :should-error="true" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      // Check main container classes
      const container = wrapper.find(".min-h-screen");
      expect(container.exists()).toBe(true);
      expect(container.classes()).toContain("flex");
      expect(container.classes()).toContain("items-center");
      expect(container.classes()).toContain("justify-center");

      // Check card classes
      const card = wrapper.find(".bg-white.rounded-lg.shadow-lg");
      expect(card.exists()).toBe(true);

      // Check icon container
      const iconContainer = wrapper.find(".bg-red-100");
      expect(iconContainer.exists()).toBe(true);
      expect(iconContainer.classes()).toContain("rounded-full");
    });

    it("should show appropriate error icon", async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: {
            components: { ErrorThrowingComponent },
            template: '<ErrorThrowingComponent :should-error="true" />',
          },
        },
      });

      await nextTick();
      await flushPromises();

      const iconContainer = wrapper.find(".bg-red-100");
      expect(iconContainer.exists()).toBe(true);

      const errorIcon = iconContainer.find("svg");
      expect(errorIcon.exists()).toBe(true);
      expect(errorIcon.classes()).toContain("h-6");
      expect(errorIcon.classes()).toContain("w-6");
      expect(errorIcon.classes()).toContain("text-red-600");
    });
  });

  describe("Component State Management", () => {
    it("should maintain proper state transitions", async () => {
      wrapper = mount(EnhancedErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
        slots: {
          default: "<div>Normal content</div>",
        },
      });

      // Initial state
      expect(wrapper.vm.hasError).toBe(false);
      expect(wrapper.vm.errorDetails).toBeNull();
      expect(wrapper.vm.showDetails).toBe(false);
      expect(wrapper.vm.retryCount).toBe(0);

      // Simulate error state
      wrapper.vm.hasError = true;
      wrapper.vm.errorDetails = "Error: Test error";
      wrapper.vm.errorType = "Component Error";
      wrapper.vm.retryCount = 1;
      await nextTick();

      expect(wrapper.vm.hasError).toBe(true);
      expect(wrapper.vm.errorDetails).toContain("Error: Test error");
      expect(wrapper.vm.errorType).toBe("Component Error");
      expect(wrapper.vm.retryCount).toBe(1);

      // Reset
      await wrapper.vm.retry();
      await nextTick();

      expect(wrapper.vm.hasError).toBe(false);
      expect(wrapper.vm.errorDetails).toBeNull();
      expect(wrapper.vm.showDetails).toBe(false);
      expect(wrapper.vm.errorType).toBeNull();
    });

    it("should preserve custom fallback message through error cycles", async () => {
      const customMessage = "Custom error message";
      wrapper = mount(EnhancedErrorBoundary, {
        props: {
          fallback: customMessage,
        },
        global: {
          plugins: [mockRouter],
        },
      });

      // Manually trigger error state
      wrapper.vm.hasError = true;
      wrapper.vm.userFriendlyMessage = customMessage;
      await nextTick();

      expect(wrapper.vm.userFriendlyMessage).toBe(customMessage);

      // Reset and check message is restored
      await wrapper.vm.retry();
      await nextTick();

      expect(wrapper.vm.userFriendlyMessage).toBe(customMessage);
    });
  });
});
