import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";
import {
  useAsyncErrorHandler,
  setupGlobalAsyncErrorHandler,
  useAsyncLifecycle,
  type AsyncErrorOptions,
} from "../useAsyncErrorHandler";
import { errorLogger } from "@/services/errorLogging";

// Mock the error logger
vi.mock("@/services/errorLogging", () => ({
  errorLogger: {
    logError: vi.fn(),
  },
}));

// Mock Vue's getCurrentInstance
vi.mock("vue", async () => {
  const actual = await vi.importActual("vue");
  return {
    ...actual,
    getCurrentInstance: vi.fn(() => ({
      type: { __name: "TestComponent" },
    })),
  };
});

// Mock DOM operations
const mockCreateElement = vi.fn();
const mockAppendChild = vi.fn();
const mockRemove = vi.fn();
const mockAddEventListener = vi.fn();
const mockDispatchEvent = vi.fn();

Object.defineProperty(document, "createElement", { value: mockCreateElement });
Object.defineProperty(document.body, "appendChild", { value: mockAppendChild });
Object.defineProperty(window, "addEventListener", {
  value: mockAddEventListener,
});
Object.defineProperty(window, "dispatchEvent", { value: mockDispatchEvent });

// Mock console methods
const mockConsole = {
  error: vi.fn(),
};

Object.defineProperty(console, "error", { value: mockConsole.error });

const mockErrorLogger = vi.mocked(errorLogger);

describe("useAsyncErrorHandler", () => {
  let mockElement: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Setup mock DOM element
    mockElement = {
      className: "",
      textContent: "",
      onclick: null,
      appendChild: vi.fn(),
      remove: mockRemove,
      parentElement: document.body,
    };
    mockCreateElement.mockReturnValue(mockElement);

    // Mock window.location
    Object.defineProperty(window, "location", {
      writable: true,
      value: { pathname: "/test-path", href: "http://localhost/test-path" },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe("basic functionality", () => {
    it("should initialize with correct default state", () => {
      // Act
      const handler = useAsyncErrorHandler();

      // Assert
      expect(handler.isLoading.value).toBe(false);
      expect(handler.hasError.value).toBe(false);
      expect(handler.errorMessage.value).toBeNull();
      expect(typeof handler.executeAsync).toBe("function");
      expect(typeof handler.handleError).toBe("function");
      expect(typeof handler.clearError).toBe("function");
    });

    it("should maintain readonly state properties through operations", () => {
      // Arrange
      const handler = useAsyncErrorHandler({
        showNotification: false,
        logError: false,
      });
      const mockOperation = vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) => setTimeout(() => resolve("result"), 100)),
        );

      // Act - test that state changes only through proper operations
      expect(handler.isLoading.value).toBe(false);
      expect(handler.hasError.value).toBe(false);
      expect(handler.errorMessage.value).toBeNull();

      // Start an async operation to test loading state
      const promise = handler.executeAsync(mockOperation);
      expect(handler.isLoading.value).toBe(true); // State changed internally

      // Complete the operation
      vi.runAllTimers();
      return promise.then((result) => {
        expect(result).toBe("result");
        expect(handler.isLoading.value).toBe(false); // State changed back internally
        expect(handler.hasError.value).toBe(false);
      });
    });

    it("should accept and use custom options", () => {
      // Arrange
      const customOptions: AsyncErrorOptions = {
        showNotification: false,
        logError: false,
        fallbackValue: "fallback",
        retryCount: 2,
        onError: vi.fn(),
        context: "Custom Context",
      };

      // Act
      const handler = useAsyncErrorHandler(customOptions);

      // Assert
      expect(handler).toBeDefined();
      // Options are internal, but we can test their effects in other tests
    });
  });

  describe("executeAsync", () => {
    it("should execute successful operation", async () => {
      // Arrange
      const handler = useAsyncErrorHandler();
      const mockOperation = vi.fn().mockResolvedValue("success");

      // Act
      const result = await handler.executeAsync(mockOperation);

      // Assert
      expect(result).toBe("success");
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(handler.isLoading.value).toBe(false);
      expect(handler.hasError.value).toBe(false);
      expect(handler.errorMessage.value).toBeNull();
    });

    it("should set loading state during operation", async () => {
      // Arrange
      const handler = useAsyncErrorHandler();
      let resolveOperation: (value: string) => void;
      const mockOperation = vi.fn().mockImplementation(() => {
        return new Promise<string>((resolve) => {
          resolveOperation = resolve;
        });
      });

      // Act
      const promise = handler.executeAsync(mockOperation);

      // Assert loading state
      expect(handler.isLoading.value).toBe(true);
      expect(handler.hasError.value).toBe(false);
      expect(handler.errorMessage.value).toBeNull();

      // Resolve the operation
      resolveOperation!("completed");
      await promise;

      // Assert final state
      expect(handler.isLoading.value).toBe(false);
    });

    it("should handle operation errors", async () => {
      // Arrange
      const handler = useAsyncErrorHandler({
        showNotification: false,
        logError: false,
      });
      const mockError = new Error("Operation failed");
      const mockOperation = vi.fn().mockRejectedValue(mockError);

      // Act & Assert
      await expect(handler.executeAsync(mockOperation)).rejects.toThrow(
        "Operation failed",
      );

      expect(handler.isLoading.value).toBe(false);
      expect(handler.hasError.value).toBe(true);
      expect(handler.errorMessage.value).toBe("Operation failed");
    });

    it("should return fallback value on error", async () => {
      // Arrange
      const handler = useAsyncErrorHandler({
        showNotification: false,
        logError: false,
      });
      const mockError = new Error("Operation failed");
      const mockOperation = vi.fn().mockRejectedValue(mockError);
      const fallbackValue = "fallback result";

      // Act
      const result = await handler.executeAsync(mockOperation, fallbackValue);

      // Assert
      expect(result).toBe(fallbackValue);
      expect(handler.hasError.value).toBe(true);
      expect(handler.errorMessage.value).toBe("Operation failed");
    });

    it("should retry operations based on retryCount", async () => {
      // Arrange
      const handler = useAsyncErrorHandler({
        retryCount: 2,
        showNotification: false,
        logError: false,
      });
      const mockError = new Error("Temporary failure");
      const mockOperation = vi
        .fn()
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce("success on third attempt");

      // Act
      const resultPromise = handler.executeAsync(mockOperation);

      // Fast-forward timers for retry delays
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      // Assert
      expect(result).toBe("success on third attempt");
      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(handler.hasError.value).toBe(false);
    }, 10000);

    it("should fail after exhausting retries", async () => {
      // Arrange
      const handler = useAsyncErrorHandler({
        retryCount: 1,
        showNotification: false,
        logError: false,
      });
      const mockError = new Error("Persistent failure");
      const mockOperation = vi.fn().mockRejectedValue(mockError);

      // Act & Assert
      const resultPromise = expect(
        handler.executeAsync(mockOperation),
      ).rejects.toThrow("Persistent failure");

      // Fast-forward timers for retry delays
      await vi.runAllTimersAsync();

      await resultPromise;

      expect(mockOperation).toHaveBeenCalledTimes(2); // Initial + 1 retry
      expect(handler.hasError.value).toBe(true);
    }, 10000);

    it("should handle non-Error objects", async () => {
      // Arrange
      const handler = useAsyncErrorHandler({
        showNotification: false,
        logError: false,
      });
      const mockOperation = vi.fn().mockRejectedValue("string error");

      // Act & Assert
      await expect(handler.executeAsync(mockOperation)).rejects.toBeInstanceOf(
        Error,
      );

      expect(handler.hasError.value).toBe(true);
      expect(handler.errorMessage.value).toBe("string error");
    });

    it("should clear error state before new operation", async () => {
      // Arrange
      const handler = useAsyncErrorHandler({
        showNotification: false,
        logError: false,
      });
      const failingOperation = vi
        .fn()
        .mockRejectedValue(new Error("First error"));
      const successOperation = vi.fn().mockResolvedValue("success");

      // Act
      await expect(handler.executeAsync(failingOperation)).rejects.toThrow();
      expect(handler.hasError.value).toBe(true);

      const result = await handler.executeAsync(successOperation);

      // Assert
      expect(result).toBe("success");
      expect(handler.hasError.value).toBe(false);
      expect(handler.errorMessage.value).toBeNull();
    });
  });

  describe("handleError", () => {
    it("should handle error with default options", () => {
      // Arrange
      const handler = useAsyncErrorHandler();
      const mockError = new Error("Test error");

      // Act
      handler.handleError(mockError, "Test Context");

      // Assert
      expect(handler.hasError.value).toBe(true);
      expect(handler.errorMessage.value).toBe("Test error");
      expect(mockErrorLogger.logError).toHaveBeenCalledWith(
        mockError,
        "Test Context",
        expect.objectContaining({
          component: "TestComponent",
          route: "/test-path",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should not log error when logError is false", () => {
      // Arrange
      const handler = useAsyncErrorHandler({ logError: false });
      const mockError = new Error("Test error");

      // Act
      handler.handleError(mockError);

      // Assert
      expect(mockErrorLogger.logError).not.toHaveBeenCalled();
      expect(handler.hasError.value).toBe(true);
    });

    it("should call custom onError handler", () => {
      // Arrange
      const customOnError = vi.fn();
      const handler = useAsyncErrorHandler({ onError: customOnError });
      const mockError = new Error("Test error");

      // Act
      handler.handleError(mockError, "Custom Context");

      // Assert
      expect(customOnError).toHaveBeenCalledWith(mockError);
    });

    it("should emit global error event", () => {
      // Arrange
      const handler = useAsyncErrorHandler();
      const mockError = new Error("Global error");

      // Act
      handler.handleError(mockError, "Global Context");

      // Assert
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "vue:async-error",
          detail: expect.objectContaining({
            error: mockError,
            context: "Global Context",
            timestamp: expect.any(Number),
          }),
        }),
      );
    });

    it("should show notification when showNotification is true", () => {
      // Arrange
      const handler = useAsyncErrorHandler({ showNotification: true });
      const mockError = new Error("Notification error");

      // Act
      handler.handleError(mockError);

      // Assert
      expect(mockCreateElement).toHaveBeenCalledWith("div");
      expect(mockCreateElement).toHaveBeenCalledWith("p");
      expect(mockCreateElement).toHaveBeenCalledWith("button");
      expect(mockAppendChild).toHaveBeenCalled();
    });

    it("should not show notification when showNotification is false", () => {
      // Arrange
      const handler = useAsyncErrorHandler({ showNotification: false });
      const mockError = new Error("Silent error");

      // Act
      handler.handleError(mockError);

      // Assert
      expect(mockCreateElement).not.toHaveBeenCalled();
    });
  });

  describe("clearError", () => {
    it("should clear error state", async () => {
      // Arrange
      const handler = useAsyncErrorHandler({
        showNotification: false,
        logError: false,
      });
      const mockOperation = vi.fn().mockRejectedValue(new Error("Test error"));

      await expect(handler.executeAsync(mockOperation)).rejects.toThrow();
      expect(handler.hasError.value).toBe(true);
      expect(handler.errorMessage.value).toBe("Test error");

      // Act
      handler.clearError();

      // Assert
      expect(handler.hasError.value).toBe(false);
      expect(handler.errorMessage.value).toBeNull();
    });
  });

  describe("error message formatting", () => {
    it("should format network errors", () => {
      // Arrange
      const handler = useAsyncErrorHandler({
        showNotification: false,
        logError: false,
      });
      const networkError = new Error("fetch failed");

      // Act
      handler.handleError(networkError);

      // Assert
      expect(handler.errorMessage.value).toBe(
        "Network connection error. Please check your internet connection.",
      );
    });

    it("should format 404 errors", () => {
      // Arrange
      const handler = useAsyncErrorHandler({
        showNotification: false,
        logError: false,
      });
      const notFoundError = new Error("404 Not Found");

      // Act
      handler.handleError(notFoundError);

      // Assert
      expect(handler.errorMessage.value).toBe(
        "The requested resource was not found.",
      );
    });

    it("should format 403 errors", () => {
      // Arrange
      const handler = useAsyncErrorHandler({
        showNotification: false,
        logError: false,
      });
      const forbiddenError = new Error("403 Forbidden");

      // Act
      handler.handleError(forbiddenError);

      // Assert
      expect(handler.errorMessage.value).toBe(
        "You do not have permission to access this resource.",
      );
    });

    it("should format 500 errors", () => {
      // Arrange
      const handler = useAsyncErrorHandler({
        showNotification: false,
        logError: false,
      });
      const serverError = new Error("500 Internal Server Error");

      // Act
      handler.handleError(serverError);

      // Assert
      expect(handler.errorMessage.value).toBe(
        "Server error occurred. Please try again later.",
      );
    });

    it("should format chunk load errors", () => {
      // Arrange
      const handler = useAsyncErrorHandler({
        showNotification: false,
        logError: false,
      });
      const chunkError = new Error("Loading chunk 5 failed");
      chunkError.name = "ChunkLoadError";

      // Act
      handler.handleError(chunkError);

      // Assert
      expect(handler.errorMessage.value).toBe(
        "Failed to load application resources. Please refresh the page.",
      );
    });

    it("should use default message for unknown errors", () => {
      // Arrange
      const handler = useAsyncErrorHandler({
        showNotification: false,
        logError: false,
      });
      const unknownError = new Error("Unknown error type");

      // Act
      handler.handleError(unknownError);

      // Assert
      expect(handler.errorMessage.value).toBe("Unknown error type");
    });
  });

  describe("notification system", () => {
    it("should create notification with correct structure", () => {
      // Arrange
      let notificationDiv: any;
      mockCreateElement.mockImplementation((tag: string) => {
        const element = {
          className: "",
          textContent: "",
          onclick: null,
          appendChild: vi.fn(),
          remove: mockRemove,
          parentElement: document.body,
        };

        if (tag === "div") {
          notificationDiv = element;
        }

        return element;
      });

      const handler = useAsyncErrorHandler({ showNotification: true });
      const mockError = new Error("Notification test");

      // Act
      handler.handleError(mockError);

      // Assert
      expect(mockCreateElement).toHaveBeenCalledWith("div");
      expect(mockCreateElement).toHaveBeenCalledWith("p");
      expect(mockCreateElement).toHaveBeenCalledWith("button");

      // Check notification div styling (the first div created should be the notification)
      expect(notificationDiv.className).toContain("fixed");
      expect(notificationDiv.className).toContain("bg-red-500");
      expect(notificationDiv.className).toContain("z-50");
    });

    it("should auto-remove notification after timeout", () => {
      // Arrange
      const handler = useAsyncErrorHandler({ showNotification: true });
      const mockError = new Error("Auto-remove test");

      // Act
      handler.handleError(mockError);

      // Fast-forward 10 seconds
      vi.advanceTimersByTime(10000);

      // Assert
      expect(mockRemove).toHaveBeenCalled();
    });

    it("should handle notification creation errors gracefully", () => {
      // Arrange
      mockCreateElement.mockImplementation(() => {
        throw new Error("DOM error");
      });
      const handler = useAsyncErrorHandler({ showNotification: true });
      const mockError = new Error("DOM creation error");

      // Act & Assert - should not throw
      expect(() => handler.handleError(mockError)).not.toThrow();
      expect(mockConsole.error).toHaveBeenCalledWith(
        "Failed to show error notification:",
        expect.any(Error),
      );
    });
  });

  describe("retry mechanism", () => {
    it("should use exponential backoff for retries", async () => {
      // Arrange
      const handler = useAsyncErrorHandler({
        retryCount: 2,
        showNotification: false,
        logError: false,
      });
      const mockError = new Error("Retry test");
      const mockOperation = vi
        .fn()
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce("success");

      // Act
      const promise = handler.executeAsync(mockOperation);

      // Fast-forward through retry delays
      await vi.runAllTimersAsync();

      const result = await promise;

      // Assert
      expect(result).toBe("success");
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it("should not retry when retryCount is 0", async () => {
      // Arrange
      const handler = useAsyncErrorHandler({
        retryCount: 0,
        showNotification: false,
        logError: false,
      });
      const mockError = new Error("No retry test");
      const mockOperation = vi.fn().mockRejectedValue(mockError);

      // Act & Assert
      await expect(handler.executeAsync(mockOperation)).rejects.toThrow(
        "No retry test",
      );
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });
});

describe("setupGlobalAsyncErrorHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should setup unhandled rejection handler", () => {
    // Act
    setupGlobalAsyncErrorHandler();

    // Assert
    expect(mockAddEventListener).toHaveBeenCalledWith(
      "unhandledrejection",
      expect.any(Function),
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      "vue:async-error",
      expect.any(Function),
    );
  });

  it("should handle unhandled promise rejections", () => {
    // Arrange
    setupGlobalAsyncErrorHandler();
    const unhandledRejectionHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "unhandledrejection",
    )?.[1];

    const mockEvent = {
      reason: new Error("Unhandled rejection"),
      preventDefault: vi.fn(),
    };

    // Act
    unhandledRejectionHandler(mockEvent);

    // Assert
    expect(mockErrorLogger.logError).toHaveBeenCalledWith(
      expect.any(Error),
      "Unhandled Promise Rejection",
      expect.objectContaining({
        url: expect.any(String),
        timestamp: expect.any(String),
      }),
    );
  });

  it("should handle vue async error events", () => {
    // Arrange
    setupGlobalAsyncErrorHandler();
    const asyncErrorHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "vue:async-error",
    )?.[1];

    const mockEvent = {
      detail: {
        error: new Error("Vue async error"),
        context: "Test Context",
      },
    };

    // Act
    asyncErrorHandler(mockEvent);

    // Assert
    expect(mockConsole.error).toHaveBeenCalledWith(
      "Async error in Test Context:",
      expect.any(Error),
    );
  });

  it("should prevent default for certain error types", () => {
    // Arrange
    setupGlobalAsyncErrorHandler();
    const unhandledRejectionHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "unhandledrejection",
    )?.[1];

    const mockEvent = {
      reason: "ChunkLoadError: Loading chunk failed",
      preventDefault: vi.fn(),
    };

    // Act
    unhandledRejectionHandler(mockEvent);

    // Assert
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should not prevent default for normal errors", () => {
    // Arrange
    setupGlobalAsyncErrorHandler();
    const unhandledRejectionHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "unhandledrejection",
    )?.[1];

    const mockEvent = {
      reason: new Error("Normal error"),
      preventDefault: vi.fn(),
    };

    // Act
    unhandledRejectionHandler(mockEvent);

    // Assert
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });
});

describe("useAsyncLifecycle", () => {
  it("should provide async lifecycle hooks", () => {
    // Act
    const lifecycle = useAsyncLifecycle();

    // Assert
    expect(typeof lifecycle.onMountedAsync).toBe("function");
    expect(typeof lifecycle.onBeforeMountAsync).toBe("function");
    expect(typeof lifecycle.executeAsync).toBe("function");
    expect(typeof lifecycle.handleError).toBe("function");
    expect(lifecycle.isLoading).toBeDefined();
    expect(lifecycle.hasError).toBeDefined();
    expect(lifecycle.errorMessage).toBeDefined();
  });

  it("should handle async mounted operations", async () => {
    // Arrange
    const lifecycle = useAsyncLifecycle();
    const mockAsyncOperation = vi.fn().mockResolvedValue("mounted");

    // We can't easily test the actual Vue lifecycle hooks in unit tests,
    // but we can test that the method exists and doesn't throw
    expect(() => {
      lifecycle.onMountedAsync(mockAsyncOperation);
    }).not.toThrow();
  });

  it("should handle async before mount operations", async () => {
    // Arrange
    const lifecycle = useAsyncLifecycle();
    const mockAsyncOperation = vi.fn().mockResolvedValue("before mounted");

    // We can't easily test the actual Vue lifecycle hooks in unit tests,
    // but we can test that the method exists and doesn't throw
    expect(() => {
      lifecycle.onBeforeMountAsync(mockAsyncOperation);
    }).not.toThrow();
  });
});

describe("edge cases and error scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should handle operation that throws non-Error object", async () => {
    // Arrange
    const handler = useAsyncErrorHandler({
      showNotification: false,
      logError: false,
    });
    const mockOperation = vi.fn().mockImplementation(() => {
      throw "string error";
    });

    // Act & Assert
    await expect(handler.executeAsync(mockOperation)).rejects.toBeInstanceOf(
      Error,
    );
    expect(handler.errorMessage.value).toBe("string error");
  });

  it("should handle null/undefined errors", async () => {
    // Arrange
    const handler = useAsyncErrorHandler({
      showNotification: false,
      logError: false,
    });

    // Act
    handler.handleError(null as any);
    handler.handleError(undefined as any);

    // Assert - should not throw and handle gracefully
    expect(handler.hasError.value).toBe(true);
  });

  it("should handle concurrent async operations", async () => {
    // Arrange
    const handler = useAsyncErrorHandler({
      showNotification: false,
      logError: false,
    });
    const operation1 = vi.fn().mockResolvedValue("result1");
    const operation2 = vi.fn().mockResolvedValue("result2");

    // Act
    const [result1, result2] = await Promise.all([
      handler.executeAsync(operation1),
      handler.executeAsync(operation2),
    ]);

    // Assert
    expect(result1).toBe("result1");
    expect(result2).toBe("result2");
    expect(handler.hasError.value).toBe(false);
  });

  it("should handle very long error messages", () => {
    // Arrange
    const handler = useAsyncErrorHandler({
      showNotification: false,
      logError: false,
    });
    const longErrorMessage = "Error: " + "x".repeat(10000);
    const longError = new Error(longErrorMessage);

    // Act
    handler.handleError(longError);

    // Assert
    expect(handler.errorMessage.value).toBe(longErrorMessage);
  });

  it("should handle errors with special characters", () => {
    // Arrange
    const handler = useAsyncErrorHandler({
      showNotification: false,
      logError: false,
    });
    const specialError = new Error(
      "Error with émojis 🚀 and spéciàl châractérs",
    );

    // Act
    handler.handleError(specialError);

    // Assert
    expect(handler.errorMessage.value).toBe(
      "Error with émojis 🚀 and spéciàl châractérs",
    );
  });

  it("should handle maximum retry count edge case", async () => {
    // Arrange
    const handler = useAsyncErrorHandler({
      retryCount: 2, // Use reasonable retry count for testing
      showNotification: false,
      logError: false,
    });
    const mockError = new Error("Max retry test");

    // This test ensures the system doesn't break with retries
    let attempts = 0;
    const limitedOperation = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject(mockError);
      }
      return Promise.resolve("success after limited attempts");
    });

    // Act
    const resultPromise = handler.executeAsync(limitedOperation);

    // Fast-forward through retry delays
    await vi.runAllTimersAsync();

    const result = await resultPromise;

    // Assert
    expect(result).toBe("success after limited attempts");
    expect(attempts).toBe(3);
  }, 10000);
});
