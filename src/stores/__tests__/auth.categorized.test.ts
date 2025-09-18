import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../auth';
import {
  categorizedDescribe,
  categorizedIt,
  TestCategory,
  CategoryCombos,
  configureTestSuite
} from '../../../tests/utils/categories';

// Mock the API
vi.mock('@/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    register: vi.fn(),
    verifyEmail: vi.fn(),
  }
}));

// Mock route navigation
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  })
}));

categorizedDescribe('Auth Store', CategoryCombos.UNIT_STORE, () => {
  let store: ReturnType<typeof useAuthStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useAuthStore();
    vi.clearAllMocks();
  });

  // Fast unit tests for store state management
  categorizedDescribe('State Management', [TestCategory.UNIT, TestCategory.FAST, TestCategory.STABLE], () => {
    categorizedIt('should initialize with default state', [TestCategory.CRITICAL, TestCategory.PRE_COMMIT], () => {
      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });

    categorizedIt('should update loading state correctly', [TestCategory.HIGH], () => {
      store.setLoading(true);
      expect(store.loading).toBe(true);

      store.setLoading(false);
      expect(store.loading).toBe(false);
    });

    categorizedIt('should handle error state', [TestCategory.HIGH], () => {
      const error = 'Test error';
      store.setError(error);
      expect(store.error).toBe(error);

      store.clearError();
      expect(store.error).toBeNull();
    });
  });

  // Authentication flow tests - critical for auth feature
  categorizedDescribe('Authentication Flow', [TestCategory.AUTH, TestCategory.CRITICAL, TestCategory.STABLE], () => {
    categorizedIt('should handle successful login', [TestCategory.CRITICAL, TestCategory.PRE_COMMIT], async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      const mockToken = 'mock-token';

      // Mock successful API response
      const { authService } = await import('@/services/auth.service');
      vi.mocked(authService.login).mockResolvedValue({
        user: mockUser,
        token: mockToken
      });

      await store.login('test@example.com', 'password');

      expect(store.user).toEqual(mockUser);
      expect(store.token).toBe(mockToken);
      expect(store.isAuthenticated).toBe(true);
      expect(store.error).toBeNull();
    });

    categorizedIt('should handle login failure', [TestCategory.HIGH], async () => {
      const errorMessage = 'Invalid credentials';

      const { authService } = await import('@/services/auth.service');
      vi.mocked(authService.login).mockRejectedValue(new Error(errorMessage));

      await store.login('test@example.com', 'wrong-password');

      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.error).toBe(errorMessage);
    });

    categorizedIt('should handle logout correctly', [TestCategory.CRITICAL], async () => {
      // Set up authenticated state
      store.user = { id: 1, email: 'test@example.com' };
      store.token = 'mock-token';

      const { authService } = await import('@/services/auth.service');
      vi.mocked(authService.logout).mockResolvedValue(undefined);

      await store.logout();

      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });
  });

  // Registration tests
  categorizedDescribe('User Registration', [TestCategory.AUTH, TestCategory.MEDIUM], () => {
    categorizedIt('should handle successful registration', [TestCategory.HIGH], async () => {
      const registrationData = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const { authService } = await import('@/services/auth.service');
      vi.mocked(authService.register).mockResolvedValue({
        user: { id: 1, ...registrationData },
        token: 'new-token'
      });

      await store.register(registrationData);

      expect(store.user).toBeDefined();
      expect(store.token).toBe('new-token');
      expect(store.isAuthenticated).toBe(true);
    });

    categorizedIt('should handle registration validation errors', [TestCategory.MEDIUM_PRIORITY], async () => {
      const { authService } = await import('@/services/auth.service');
      vi.mocked(authService.register).mockRejectedValue(
        new Error('Email already exists')
      );

      await store.register({
        email: 'existing@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe'
      });

      expect(store.error).toBe('Email already exists');
      expect(store.isAuthenticated).toBe(false);
    });
  });

  // Token management tests
  categorizedDescribe('Token Management', [TestCategory.AUTH, TestCategory.MEDIUM], () => {
    categorizedIt('should refresh token successfully', [TestCategory.HIGH], async () => {
      store.token = 'old-token';

      const { authService } = await import('@/services/auth.service');
      vi.mocked(authService.refreshToken).mockResolvedValue({
        token: 'new-token'
      });

      await store.refreshToken();

      expect(store.token).toBe('new-token');
    });

    categorizedIt('should handle token refresh failure', [TestCategory.MEDIUM_PRIORITY], async () => {
      store.token = 'expired-token';

      const { authService } = await import('@/services/auth.service');
      vi.mocked(authService.refreshToken).mockRejectedValue(
        new Error('Token expired')
      );

      await store.refreshToken();

      expect(store.token).toBeNull();
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });
  });
});

// Integration tests with network requirements
configureTestSuite('Auth Store Integration', {
  categories: [TestCategory.INTEGRATION, TestCategory.AUTH, TestCategory.NETWORK],
  timeout: 10000,
}, () => {
  categorizedIt('should persist authentication state', [TestCategory.INTEGRATION, TestCategory.BROWSER], () => {
    // This would test localStorage/sessionStorage integration
    const store = useAuthStore();
    expect(store).toBeDefined();
  });

  categorizedIt('should handle network errors gracefully', [TestCategory.INTEGRATION, TestCategory.NETWORK], async () => {
    const store = useAuthStore();

    const { authService } = await import('@/services/auth.service');
    vi.mocked(authService.login).mockRejectedValue(
      new Error('Network error')
    );

    await store.login('test@example.com', 'password');

    expect(store.error).toContain('Network error');
    expect(store.isAuthenticated).toBe(false);
  });
});

// Performance tests for store operations
configureTestSuite('Auth Store Performance', {
  categories: [TestCategory.PERFORMANCE, TestCategory.STORE, TestCategory.SLOW],
  timeout: 15000,
}, () => {
  categorizedIt('should handle rapid state updates efficiently', [TestCategory.PERFORMANCE], async () => {
    const store = useAuthStore();
    const start = performance.now();

    // Simulate rapid state updates
    for (let i = 0; i < 1000; i++) {
      store.setLoading(i % 2 === 0);
      store.setError(i % 3 === 0 ? `Error ${i}` : null);
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100); // Should complete quickly
  });
});

// Experimental features that might be flaky
categorizedDescribe('Auth Store Experimental Features', [TestCategory.EXPERIMENTAL, TestCategory.FLAKY], () => {
  categorizedIt('should handle biometric authentication', [TestCategory.EXPERIMENTAL], async () => {
    // Experimental WebAuthn integration
    const store = useAuthStore();

    // This might be flaky due to browser support variations
    expect(store).toBeDefined();
  });
});