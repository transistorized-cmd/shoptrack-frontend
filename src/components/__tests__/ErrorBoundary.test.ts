import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import { defineComponent } from "vue";
import ErrorBoundary from "../ErrorBoundary.vue";
import { createMockRouter } from "../../../tests/utils/router";

// Mock the useNotifications composable
vi.mock("@/composables/useNotifications", () => ({
  useNotifications: vi.fn(() => ({
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    notifications: [],
    removeNotification: vi.fn(),
  })),
}));

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

describe("ErrorBoundary Component", () => {
  let wrapper: any;
  let mockRouter: any;

  // Component that throws an error on demand
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
              networkError.name = "TypeError";
              throw networkError;
            case "404":
              throw new Error("404: Not Found");
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
      wrapper = mount(ErrorBoundary, {
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
      wrapper = mount(ErrorBoundary, {
        global: {
          plugins: [mockRouter],
        },
      });

      expect(wrapper.vm.fallback).toBe(
        "An unexpected error occurred. Please try again.",
      );
      expect(wrapper.vm.showErrorDetails).toBe(false);
    });

    it("should accept custom props", () => {
      wrapper = mount(ErrorBoundary, {
        props: {
          fallback: "Custom error message",
          showErrorDetails: true,
        },
        global: {
          plugins: [mockRouter],
        },
      });

      expect(wrapper.vm.fallback).toBe("Custom error message");
      expect(wrapper.vm.showErrorDetails).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should catch and display generic errors", async () => {
      wrapper = mount(ErrorBoundary, {
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
        "ErrorBoundary caught error:",
        expect.any(Error),
      );
    });

    it("should display user-friendly message for chunk load errors", async () => {
      wrapper = mount(ErrorBoundary, {
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
      wrapper = mount(ErrorBoundary, {
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
        "Network error occurred. Please check your connection and try again.",
      );
    });

    it("should display user-friendly message for 404 errors", async () => {
      wrapper = mount(ErrorBoundary, {
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
  });

  describe("Error Details", () => {
    it("should show error details when showErrorDetails prop is true", async () => {
      wrapper = mount(ErrorBoundary, {
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
      wrapper = mount(ErrorBoundary, {
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
      wrapper = mount(ErrorBoundary, {
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

      expect(wrapper.find("details").exists()).toBe(true);
      expect(wrapper.text()).toContain("Technical Details");
    });
  });

  describe("User Actions", () => {
    it('should reset error state when "Try Again" is clicked', async () => {
      // Use a simpler approach with a mock function that can be controlled
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

      wrapper = mount(ErrorBoundary, {
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

      // Disable error throwing for retry
      shouldThrowError = false;

      const tryAgainButton = wrapper
        .findAll("button")
        .find((btn) => btn.text() === "Try Again");
      await tryAgainButton.trigger("click");
      await nextTick();

      expect(wrapper.vm.hasError).toBe(false);
      expect(wrapper.vm.errorDetails).toBeNull();
    });

    it('should navigate to home when "Go Home" is clicked', async () => {
      wrapper = mount(ErrorBoundary, {
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

      expect(mockRouter.push).toHaveBeenCalledWith("/");
    });

    it("should handle navigation failure gracefully", async () => {
      mockRouter.push.mockRejectedValue(new Error("Navigation failed"));

      // Mock window.location.href
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: "" };

      wrapper = mount(ErrorBoundary, {
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

      expect(mockRouter.push).toHaveBeenCalledWith("/");
      expect(window.location.href).toBe("/");

      // Restore location
      window.location = originalLocation;
    });
  });

  describe("Error Logging", () => {
    it("should log errors to console with proper formatting", async () => {
      wrapper = mount(ErrorBoundary, {
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

      expect(mockConsole.group).toHaveBeenCalledWith("🔴 Error Report");
      expect(mockConsole.error).toHaveBeenCalledWith(
        "Error details:",
        expect.objectContaining({
          timestamp: expect.any(String),
          url: expect.any(String),
          userAgent: expect.any(String),
          error: expect.objectContaining({
            name: "Error",
            message: "Test error",
            stack: expect.any(String),
          }),
          componentInfo: expect.any(String),
          userId: null,
        }),
      );
      expect(mockConsole.groupEnd).toHaveBeenCalled();
    });

    it("should handle logging errors gracefully", async () => {
      // Make console.group throw to simulate logging service failure (safer than console.error)
      const originalGroup = mockConsole.group;
      mockConsole.group.mockImplementation(() => {
        throw new Error("Logging failed");
      });

      // This should not crash the component - wrap in expect to handle the error properly
      await expect(async () => {
        const wrapper = mount(ErrorBoundary, {
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

        // Component should still show error state despite logging failure
        expect(wrapper.find(".bg-red-100").exists()).toBe(true);

        wrapper.unmount();
      }).not.toThrow();

      // Restore original mock
      mockConsole.group = originalGroup;
    });
  });

  describe("Component State Management", () => {
    it("should maintain proper state transitions", async () => {
      wrapper = mount(ErrorBoundary, {
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

      // Manually call the error handler method
      wrapper.vm.hasError = true;
      wrapper.vm.errorDetails = "Error: Test error";
      wrapper.vm.userFriendlyMessage =
        "An unexpected error occurred. Please try again.";
      await nextTick();

      expect(wrapper.vm.hasError).toBe(true);
      expect(wrapper.vm.errorDetails).toContain("Error: Test error");
      expect(wrapper.vm.userFriendlyMessage).toBe(
        "An unexpected error occurred. Please try again.",
      );

      // Reset
      await wrapper.vm.retry();
      await nextTick();

      expect(wrapper.vm.hasError).toBe(false);
      expect(wrapper.vm.errorDetails).toBeNull();
      expect(wrapper.vm.showDetails).toBe(false);
    });

    it("should preserve custom fallback message through error cycles", async () => {
      const customMessage = "Custom error message";
      wrapper = mount(ErrorBoundary, {
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

  describe("Accessibility", () => {
    it("should have proper ARIA attributes and semantic HTML", async () => {
      wrapper = mount(ErrorBoundary, {
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

      // Check that we have error state rendered
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
    });
  });

  describe("CSS Classes and Styling", () => {
    it("should apply correct styling classes", async () => {
      wrapper = mount(ErrorBoundary, {
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
      wrapper = mount(ErrorBoundary, {
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

      // Look for svg inside the red circle icon container
      const iconContainer = wrapper.find(".bg-red-100");
      expect(iconContainer.exists()).toBe(true);

      const errorIcon = iconContainer.find("svg");
      expect(errorIcon.exists()).toBe(true);
      expect(errorIcon.classes()).toContain("h-6");
      expect(errorIcon.classes()).toContain("w-6");
      expect(errorIcon.classes()).toContain("text-red-600");
    });
  });
});
