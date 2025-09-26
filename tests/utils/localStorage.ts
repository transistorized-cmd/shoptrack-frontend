import { vi } from "vitest";

export interface ReactiveLocalStorageMock {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  length: number;
  key: ReturnType<typeof vi.fn>;
  [key: string]: any;
}

/**
 * Creates a reactive localStorage mock that actually stores and retrieves data
 * This is needed for Vue composables that depend on localStorage persistence
 */
export function createReactiveLocalStorageMock(): ReactiveLocalStorageMock {
  // Internal storage for the mock
  const storage = new Map<string, string>();

  const mockStorage: ReactiveLocalStorageMock = {
    getItem: vi.fn((key: string) => {
      return storage.get(key) ?? null;
    }),

    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, String(value));
    }),

    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),

    clear: vi.fn(() => {
      storage.clear();
    }),

    get length() {
      return storage.size;
    },

    key: vi.fn((index: number) => {
      const keys = Array.from(storage.keys());
      return keys[index] ?? null;
    }),
  };

  // Make the mock act like a real Storage object for property access
  return new Proxy(mockStorage, {
    get(target, prop) {
      if (prop in target) {
        return target[prop as keyof ReactiveLocalStorageMock];
      }
      if (typeof prop === "string") {
        return storage.get(prop) ?? undefined;
      }
      return undefined;
    },

    set(target, prop, value) {
      if (typeof prop === "string" && !(prop in target)) {
        storage.set(prop, String(value));
        return true;
      }
      return Reflect.set(target, prop, value);
    },

    has(target, prop) {
      return prop in target || (typeof prop === "string" && storage.has(prop));
    },

    deleteProperty(target, prop) {
      if (typeof prop === "string" && storage.has(prop)) {
        storage.delete(prop);
        return true;
      }
      return Reflect.deleteProperty(target, prop);
    },

    ownKeys(target) {
      return [...Reflect.ownKeys(target), ...storage.keys()];
    },
  });
}

/**
 * Sets up reactive localStorage mock globally
 * Should be called in test setup or individual test files
 */
export function setupReactiveLocalStorage(): ReactiveLocalStorageMock {
  const mockStorage = createReactiveLocalStorageMock();

  Object.defineProperty(global, "localStorage", {
    value: mockStorage,
    writable: true,
    configurable: true,
  });

  return mockStorage;
}

/**
 * Creates a reactive sessionStorage mock (same implementation as localStorage)
 */
export function createReactiveSessionStorageMock(): ReactiveLocalStorageMock {
  return createReactiveLocalStorageMock();
}

/**
 * Sets up reactive sessionStorage mock globally
 */
export function setupReactiveSessionStorage(): ReactiveLocalStorageMock {
  const mockStorage = createReactiveSessionStorageMock();

  Object.defineProperty(global, "sessionStorage", {
    value: mockStorage,
    writable: true,
    configurable: true,
  });

  return mockStorage;
}

/**
 * Helper to reset localStorage mock to empty state
 */
export function resetLocalStorageMock() {
  if (global.localStorage && typeof global.localStorage.clear === "function") {
    global.localStorage.clear();

    // Reset mock call counts if they exist
    if (
      global.localStorage.getItem &&
      "mockClear" in global.localStorage.getItem
    ) {
      global.localStorage.getItem.mockClear();
    }
    if (
      global.localStorage.setItem &&
      "mockClear" in global.localStorage.setItem
    ) {
      global.localStorage.setItem.mockClear();
    }
    if (
      global.localStorage.removeItem &&
      "mockClear" in global.localStorage.removeItem
    ) {
      global.localStorage.removeItem.mockClear();
    }
  }
}

/**
 * Helper to populate localStorage with initial data for tests
 */
export function populateLocalStorage(data: Record<string, string>) {
  for (const [key, value] of Object.entries(data)) {
    localStorage.setItem(key, value);
  }
}
