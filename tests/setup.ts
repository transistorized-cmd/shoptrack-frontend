import "@testing-library/jest-dom";
import { config } from "@vue/test-utils";
import { vi } from "vitest";

// Setup jest-axe for accessibility testing
import { toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage with reactive implementation
import { setupReactiveLocalStorage, setupReactiveSessionStorage } from './utils/localStorage';

setupReactiveLocalStorage();
setupReactiveSessionStorage();

// Mock fetch to prevent network requests
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  statusText: "OK",
  json: vi.fn().mockResolvedValue({}),
  text: vi.fn().mockResolvedValue(""),
  blob: vi.fn().mockResolvedValue(new Blob()),
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  headers: new Headers(),
});

// Mock XMLHttpRequest to prevent network requests
global.XMLHttpRequest = vi.fn().mockImplementation(() => ({
  open: vi.fn(),
  send: vi.fn(),
  setRequestHeader: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  status: 200,
  statusText: "OK",
  responseText: "{}",
  response: {},
  readyState: 4,
  onreadystatechange: null,
  abort: vi.fn(),
}));

// Mock axios to prevent network requests
vi.mock("axios", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
    post: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
    put: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
    delete: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
    patch: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
    create: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
      post: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
      put: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
      delete: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
      patch: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    })),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  },
  get: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
  post: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
  put: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
  delete: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
  patch: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
}));

// Mock job notifications composable to prevent API calls
vi.mock("@/composables/useJobNotifications", () => ({
  useJobNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    fetchNotifications: vi.fn().mockResolvedValue({ notifications: [] }),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    clear: vi.fn(),
    initialize: vi.fn(), // This should be 'initialize', not 'initializeNotifications'
  }),
}));

// Vue Test Utils global configuration
config.global.stubs = {
  teleport: true,
  Transition: false,
};
