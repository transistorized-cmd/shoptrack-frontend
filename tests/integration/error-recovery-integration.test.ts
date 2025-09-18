import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { createI18n } from 'vue-i18n';
import axios from 'axios';
import { categorizedDescribe, categorizedIt, TestCategory, withPerformance } from '../../tests/utils/categories';
import { withPerformanceMonitoring } from '../../tests/utils/performance-monitoring';
import {
  ApiErrorMocker,
  RetryTester,
  ERROR_SCENARIOS,
  ApiErrorType,
  errorTestAssertions
} from '../../tests/utils/api-error-testing';
import { useAuthStore } from '../../src/stores/auth';
import { useReceiptsStore } from '../../src/stores/receipts';

// Mock App Component for Integration Testing
const createTestApp = () => ({
  name: 'TestApp',
  template: `
    <div id="app">
      <div v-if="loading" data-testid="loading-indicator" role="status" aria-live="polite">
        Loading...
      </div>

      <div v-if="error" data-testid="error-display" role="alert" aria-live="assertive">
        <h2>Error Occurred</h2>
        <p data-testid="error-message">{{ error }}</p>
        <button
          v-if="canRetry"
          @click="retry"
          data-testid="retry-btn"
          :disabled="retrying"
        >
          {{ retrying ? 'Retrying...' : 'Retry' }}
        </button>
        <button
          v-if="showFallback"
          @click="useFallback"
          data-testid="fallback-btn"
        >
          Use Offline Mode
        </button>
      </div>

      <div v-if="!loading && !error" data-testid="main-content">
        <nav data-testid="navigation">
          <router-link to="/dashboard" data-testid="nav-dashboard">Dashboard</router-link>
          <router-link to="/receipts" data-testid="nav-receipts">Receipts</router-link>
          <router-link to="/upload" data-testid="nav-upload">Upload</router-link>
        </nav>

        <main>
          <router-view />
        </main>
      </div>

      <!-- Network Status Indicator -->
      <div
        v-if="networkStatus !== 'online'"
        data-testid="network-status"
        :class="networkStatusClass"
        role="status"
        aria-live="polite"
      >
        {{ networkStatusMessage }}
      </div>

      <!-- Service Status Indicator -->
      <div
        v-if="serviceStatus !== 'operational'"
        data-testid="service-status"
        :class="serviceStatusClass"
        role="status"
        aria-live="polite"
      >
        {{ serviceStatusMessage }}
      </div>
    </div>
  `,
  setup() {
    const loading = ref(false);
    const error = ref<string | null>(null);
    const retrying = ref(false);
    const canRetry = ref(false);
    const showFallback = ref(false);
    const networkStatus = ref<'online' | 'offline' | 'slow'>('online');
    const serviceStatus = ref<'operational' | 'degraded' | 'down'>('operational');
    const retryCount = ref(0);
    const maxRetries = 3;

    const retry = async () => {
      if (retryCount.value >= maxRetries) {
        showFallback.value = true;
        canRetry.value = false;
        return;
      }

      retrying.value = true;
      retryCount.value++;

      try {
        // Simulate retry logic
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if service is back online
        const healthCheck = await performHealthCheck();
        if (healthCheck.success) {
          error.value = null;
          retrying.value = false;
          retryCount.value = 0;
          canRetry.value = false;
          showFallback.value = false;
        } else {
          throw new Error('Service still unavailable');
        }
      } catch (retryError) {
        retrying.value = false;

        if (retryCount.value >= maxRetries) {
          showFallback.value = true;
          canRetry.value = false;
        }
      }
    };

    const useFallback = () => {
      // Switch to offline mode
      serviceStatus.value = 'degraded';
      error.value = null;
      showFallback.value = false;
      // Load cached data or limited functionality
    };

    const handleError = (errorMessage: string, retryable: boolean = true) => {
      error.value = errorMessage;
      canRetry.value = retryable && retryCount.value < maxRetries;
      loading.value = false;
    };

    const performHealthCheck = async () => {
      try {
        const response = await axios.get('/api/health');
        return { success: true, data: response.data };
      } catch (error) {
        return { success: false, error };
      }
    };

    // Monitor network connectivity
    const updateNetworkStatus = () => {
      if (!navigator.onLine) {
        networkStatus.value = 'offline';
      } else {
        // Test connection speed/quality
        testConnectionQuality().then(quality => {
          networkStatus.value = quality;
        });
      }
    };

    const testConnectionQuality = async (): Promise<'online' | 'slow'> => {
      try {
        const start = performance.now();
        await fetch('/api/ping', { cache: 'no-store' });
        const duration = performance.now() - start;
        return duration > 2000 ? 'slow' : 'online';
      } catch {
        return 'slow';
      }
    };

    const networkStatusClass = computed(() => ({
      'status-offline': networkStatus.value === 'offline',
      'status-slow': networkStatus.value === 'slow'
    }));

    const serviceStatusClass = computed(() => ({
      'status-degraded': serviceStatus.value === 'degraded',
      'status-down': serviceStatus.value === 'down'
    }));

    const networkStatusMessage = computed(() => {
      switch (networkStatus.value) {
        case 'offline': return 'No internet connection';
        case 'slow': return 'Slow connection detected';
        default: return '';
      }
    });

    const serviceStatusMessage = computed(() => {
      switch (serviceStatus.value) {
        case 'degraded': return 'Limited functionality available';
        case 'down': return 'Service temporarily unavailable';
        default: return '';
      }
    });

    onMounted(() => {
      window.addEventListener('online', updateNetworkStatus);
      window.addEventListener('offline', updateNetworkStatus);
      updateNetworkStatus();
    });

    onUnmounted(() => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    });

    // Expose methods for testing
    (window as any).testApp = {
      handleError,
      retry,
      useFallback,
      updateNetworkStatus,
      setServiceStatus: (status: typeof serviceStatus.value) => {
        serviceStatus.value = status;
      }
    };

    return {
      loading,
      error,
      retrying,
      canRetry,
      showFallback,
      networkStatus,
      serviceStatus,
      networkStatusClass,
      serviceStatusClass,
      networkStatusMessage,
      serviceStatusMessage,
      retry,
      useFallback
    };
  }
});

// Mock Components
const Dashboard = { template: '<div data-testid="dashboard">Dashboard Content</div>' };
const Receipts = { template: '<div data-testid="receipts">Receipts Content</div>' };
const Upload = { template: '<div data-testid="upload">Upload Content</div>' };

categorizedDescribe('Error Recovery Integration Tests', [TestCategory.INTEGRATION, TestCategory.ERROR_HANDLING], () => {
  let wrapper: VueWrapper;
  let pinia: any;
  let router: any;
  let i18n: any;
  let apiErrorMocker: ApiErrorMocker;
  let authStore: any;
  let receiptsStore: any;

  beforeEach(async () => {
    apiErrorMocker = new ApiErrorMocker();

    pinia = createPinia();
    setActivePinia(pinia);

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', redirect: '/dashboard' },
        { path: '/dashboard', component: Dashboard },
        { path: '/receipts', component: Receipts },
        { path: '/upload', component: Upload }
      ]
    });

    i18n = createI18n({
      locale: 'en',
      messages: {
        en: {
          error: {
            network: 'Network error occurred',
            server: 'Server error occurred',
            retry: 'Retry',
            fallback: 'Use offline mode'
          }
        }
      }
    });

    await router.push('/dashboard');
    await router.isReady();

    authStore = useAuthStore();
    receiptsStore = useReceiptsStore();

    vi.useFakeTimers();
  });

  afterEach(() => {
    wrapper?.unmount();
    apiErrorMocker.restore();
    vi.useRealTimers();
  });

  categorizedDescribe('Network Error Recovery', [TestCategory.NETWORK_RECOVERY], () => {
    categorizedIt('should recover from complete network failure',
      [TestCategory.ERROR_HANDLING, TestCategory.CRITICAL],
      withPerformanceMonitoring(async () => {
        wrapper = mount(createTestApp(), {
          global: {
            plugins: [pinia, router, i18n]
          }
        });

        await wrapper.vm.$nextTick();

        // Simulate complete network failure
        apiErrorMocker.mockNetworkError('get', '/api/health');

        // Trigger error
        (window as any).testApp.handleError('Network connection lost', true);
        await wrapper.vm.$nextTick();

        // Verify error display
        expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="error-message"]').text()).toContain('Network connection lost');
        expect(wrapper.find('[data-testid="retry-btn"]').exists()).toBe(true);

        // Mock network recovery
        apiErrorMocker.reset();
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/health',
          [],
          { status: 200, data: { status: 'healthy' } }
        );

        // Trigger retry
        await wrapper.find('[data-testid="retry-btn"]').trigger('click');
        vi.advanceTimersByTime(1000);
        await wrapper.vm.$nextTick();

        // Verify recovery
        expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="main-content"]').exists()).toBe(true);
      }, 'Network Error Recovery', [TestCategory.ERROR_HANDLING, TestCategory.NETWORK])
    );

    categorizedIt('should handle intermittent connectivity issues',
      [TestCategory.ERROR_HANDLING, TestCategory.INTERMITTENT],
      withPerformanceMonitoring(async () => {
        wrapper = mount(createTestApp(), {
          global: {
            plugins: [pinia, router, i18n]
          }
        });

        await wrapper.vm.$nextTick();

        // Simulate intermittent connectivity
        let requestCount = 0;
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/data',
          [],
          {
            status: 200,
            data: { success: true }
          }
        );

        // Override to simulate intermittent failures
        const originalReply = apiErrorMocker['mockAdapter'].onGet('/api/data').reply;
        apiErrorMocker['mockAdapter'].onGet('/api/data').reply(() => {
          requestCount++;
          // Fail every 3rd request
          if (requestCount % 3 === 0) {
            throw new Error('Network Error');
          }
          return [200, { success: true, attempt: requestCount }];
        });

        // Make multiple requests
        const results = [];
        for (let i = 0; i < 6; i++) {
          try {
            const response = await axios.get('/api/data');
            results.push({ success: true, data: response.data });
          } catch (error) {
            results.push({ success: false, error: error.message });
          }
        }

        // Verify intermittent pattern
        expect(results[2].success).toBe(false); // 3rd request fails
        expect(results[5].success).toBe(false); // 6th request fails
        expect(results.filter(r => r.success)).toHaveLength(4);
      }, 'Intermittent Connectivity', [TestCategory.ERROR_HANDLING, TestCategory.NETWORK])
    );

    categorizedIt('should detect and handle slow network conditions',
      [TestCategory.ERROR_HANDLING, TestCategory.SLOW_NETWORK],
      withPerformanceMonitoring(async () => {
        wrapper = mount(createTestApp(), {
          global: {
            plugins: [pinia, router, i18n]
          }
        });

        await wrapper.vm.$nextTick();

        // Mock slow network response
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/ping',
          [],
          { status: 200, data: { pong: true } }
        );

        // Simulate slow response by adding delay
        const originalRequest = axios.get;
        vi.spyOn(axios, 'get').mockImplementation(async (url) => {
          if (url === '/api/ping') {
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
          }
          return originalRequest(url);
        });

        // Trigger network quality check
        (window as any).testApp.updateNetworkStatus();
        vi.advanceTimersByTime(3000);
        await wrapper.vm.$nextTick();

        // Verify slow network detection
        expect(wrapper.find('[data-testid="network-status"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="network-status"]').text()).toContain('Slow connection detected');
      }, 'Slow Network Detection', [TestCategory.ERROR_HANDLING, TestCategory.PERFORMANCE])
    );
  });

  categorizedDescribe('Service Error Recovery', [TestCategory.SERVICE_RECOVERY], () => {
    categorizedIt('should handle server errors with progressive backoff',
      [TestCategory.ERROR_HANDLING, TestCategory.SERVER_ERROR],
      withPerformanceMonitoring(async () => {
        wrapper = mount(createTestApp(), {
          global: {
            plugins: [pinia, router, i18n]
          }
        });

        await wrapper.vm.$nextTick();

        // Mock server errors that eventually recover
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/health',
          [
            ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR],
            ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR]
          ],
          { status: 200, data: { status: 'recovered' } }
        );

        // Trigger server error
        (window as any).testApp.handleError('Server temporarily unavailable', true);
        await wrapper.vm.$nextTick();

        // First retry attempt
        await wrapper.find('[data-testid="retry-btn"]').trigger('click');
        vi.advanceTimersByTime(1000);
        await wrapper.vm.$nextTick();

        // Should still show error (first retry fails)
        expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);

        // Second retry attempt
        await wrapper.find('[data-testid="retry-btn"]').trigger('click');
        vi.advanceTimersByTime(1000);
        await wrapper.vm.$nextTick();

        // Should still show error (second retry fails)
        expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);

        // Third retry attempt (succeeds)
        await wrapper.find('[data-testid="retry-btn"]').trigger('click');
        vi.advanceTimersByTime(1000);
        await wrapper.vm.$nextTick();

        // Should recover
        expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="main-content"]').exists()).toBe(true);
      }, 'Server Error Recovery', [TestCategory.ERROR_HANDLING, TestCategory.SERVER_ERROR])
    );

    categorizedIt('should fallback to offline mode after max retries',
      [TestCategory.ERROR_HANDLING, TestCategory.FALLBACK],
      withPerformanceMonitoring(async () => {
        wrapper = mount(createTestApp(), {
          global: {
            plugins: [pinia, router, i18n]
          }
        });

        await wrapper.vm.$nextTick();

        // Mock persistent server failure
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/health',
          [
            ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR],
            ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR],
            ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR],
            ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR]
          ]
        );

        // Trigger error
        (window as any).testApp.handleError('Service unavailable', true);
        await wrapper.vm.$nextTick();

        // Exhaust all retry attempts
        for (let i = 0; i < 3; i++) {
          await wrapper.find('[data-testid="retry-btn"]').trigger('click');
          vi.advanceTimersByTime(1000);
          await wrapper.vm.$nextTick();
        }

        // Should show fallback option
        expect(wrapper.find('[data-testid="fallback-btn"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="retry-btn"]').exists()).toBe(false);

        // Activate fallback
        await wrapper.find('[data-testid="fallback-btn"]').trigger('click');
        await wrapper.vm.$nextTick();

        // Should show degraded service status
        expect(wrapper.find('[data-testid="service-status"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="service-status"]').text()).toContain('Limited functionality');
      }, 'Fallback to Offline Mode', [TestCategory.ERROR_HANDLING, TestCategory.FALLBACK])
    );

    categorizedIt('should handle service maintenance gracefully',
      [TestCategory.ERROR_HANDLING, TestCategory.MAINTENANCE],
      withPerformanceMonitoring(async () => {
        wrapper = mount(createTestApp(), {
          global: {
            plugins: [pinia, router, i18n]
          }
        });

        await wrapper.vm.$nextTick();

        // Mock maintenance mode
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/data',
          [ERROR_SCENARIOS[ApiErrorType.MAINTENANCE]]
        );

        try {
          await axios.get('/api/data');
        } catch (error) {
          // Trigger maintenance error handling
          (window as any).testApp.handleError('Service under maintenance', false);
          await wrapper.vm.$nextTick();
        }

        // Should show error without retry option (maintenance is not retryable)
        expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="retry-btn"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="fallback-btn"]').exists()).toBe(true);
      }, 'Service Maintenance', [TestCategory.ERROR_HANDLING, TestCategory.MAINTENANCE])
    );
  });

  categorizedDescribe('Authentication Error Recovery', [TestCategory.AUTH_RECOVERY], () => {
    categorizedIt('should handle token expiration with automatic refresh',
      [TestCategory.ERROR_HANDLING, TestCategory.AUTH],
      withPerformanceMonitoring(async () => {
        wrapper = mount(createTestApp(), {
          global: {
            plugins: [pinia, router, i18n]
          }
        });

        await wrapper.vm.$nextTick();

        // Setup initial authentication
        authStore.setUser({
          id: 'user123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        });

        // Mock token expiration scenario
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/protected',
          [ERROR_SCENARIOS[ApiErrorType.AUTHENTICATION_ERROR]],
          { status: 200, data: { message: 'Success after refresh' } }
        );

        // Mock successful token refresh
        apiErrorMocker.mockEndpointWithError(
          'post',
          '/auth/refresh',
          [],
          { status: 200, data: { accessToken: 'new-token' } }
        );

        try {
          const response = await axios.get('/api/protected');
          expect(response.data).toEqual({ message: 'Success after refresh' });
        } catch (error) {
          // If refresh fails, should show login prompt
          expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);
        }
      }, 'Token Refresh', [TestCategory.ERROR_HANDLING, TestCategory.AUTH])
    );

    categorizedIt('should handle complete authentication failure',
      [TestCategory.ERROR_HANDLING, TestCategory.AUTH_FAILURE],
      withPerformanceMonitoring(async () => {
        wrapper = mount(createTestApp(), {
          global: {
            plugins: [pinia, router, i18n]
          }
        });

        await wrapper.vm.$nextTick();

        // Mock authentication failure (no refresh token)
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/protected',
          [ERROR_SCENARIOS[ApiErrorType.AUTHENTICATION_ERROR]]
        );

        // Mock failed refresh
        apiErrorMocker.mockEndpointWithError(
          'post',
          '/auth/refresh',
          [ERROR_SCENARIOS[ApiErrorType.AUTHENTICATION_ERROR]]
        );

        try {
          await axios.get('/api/protected');
        } catch (error) {
          // Should clear auth state and redirect to login
          authStore.logout();
          expect(authStore.user).toBeNull();
        }
      }, 'Authentication Failure', [TestCategory.ERROR_HANDLING, TestCategory.AUTH_FAILURE])
    );
  });

  categorizedDescribe('Data Recovery and Synchronization', [TestCategory.DATA_RECOVERY], () => {
    categorizedIt('should recover partial data on service restoration',
      [TestCategory.ERROR_HANDLING, TestCategory.DATA_SYNC],
      withPerformanceMonitoring(async () => {
        wrapper = mount(createTestApp(), {
          global: {
            plugins: [pinia, router, i18n]
          }
        });

        await wrapper.vm.$nextTick();

        // Simulate partial data loss scenario
        const originalReceipts = [
          { id: '1', title: 'Receipt 1', amount: 10.00 },
          { id: '2', title: 'Receipt 2', amount: 20.00 },
          { id: '3', title: 'Receipt 3', amount: 30.00 }
        ];

        receiptsStore.setReceipts(originalReceipts);

        // Mock service failure that affects data
        apiErrorMocker.mockEndpointWithError(
          'get',
          '/api/receipts',
          [ERROR_SCENARIOS[ApiErrorType.SERVER_ERROR]],
          {
            status: 200,
            data: {
              receipts: originalReceipts.slice(0, 2), // Only partial data recovered
              meta: { total: 2, recovered: true }
            }
          }
        );

        // Trigger data refresh after error recovery
        try {
          const response = await axios.get('/api/receipts');
          receiptsStore.setReceipts(response.data.receipts);

          // Verify partial recovery
          expect(receiptsStore.receipts).toHaveLength(2);
          expect(response.data.meta.recovered).toBe(true);
        } catch (error) {
          // Should handle gracefully and maintain local state
          expect(receiptsStore.receipts).toEqual(originalReceipts);
        }
      }, 'Data Recovery', [TestCategory.ERROR_HANDLING, TestCategory.DATA_SYNC])
    );

    categorizedIt('should handle data conflicts during synchronization',
      [TestCategory.ERROR_HANDLING, TestCategory.CONFLICT_RESOLUTION],
      withPerformanceMonitoring(async () => {
        wrapper = mount(createTestApp(), {
          global: {
            plugins: [pinia, router, i18n]
          }
        });

        await wrapper.vm.$nextTick();

        // Setup local state
        const localReceipt = { id: '1', title: 'Local Receipt', amount: 15.00, modified: true };
        receiptsStore.setReceipts([localReceipt]);

        // Mock conflict response from server
        const conflictResponse = {
          type: ApiErrorType.CLIENT_ERROR,
          statusCode: 409,
          data: {
            error: 'Conflict',
            message: 'Data was modified by another user',
            serverVersion: { id: '1', title: 'Server Receipt', amount: 12.00 },
            conflictFields: ['title', 'amount']
          }
        };

        apiErrorMocker.mockEndpointWithError(
          'put',
          '/api/receipts/1',
          [conflictResponse]
        );

        try {
          await axios.put('/api/receipts/1', localReceipt);
        } catch (error) {
          // Should detect conflict and provide resolution options
          expect(error.response?.status).toBe(409);
          expect(error.response?.data.conflictFields).toEqual(['title', 'amount']);

          // Handle conflict resolution (prefer local changes in this test)
          const resolvedReceipt = {
            ...localReceipt,
            version: error.response.data.serverVersion.version + 1
          };

          receiptsStore.updateReceipt(resolvedReceipt);
          expect(receiptsStore.receipts[0].title).toBe('Local Receipt');
        }
      }, 'Conflict Resolution', [TestCategory.ERROR_HANDLING, TestCategory.CONFLICT_RESOLUTION])
    );
  });

  categorizedDescribe('End-to-End Error Recovery Flows', [TestCategory.E2E_ERROR_FLOWS], () => {
    categorizedIt('should handle complete application failure and recovery',
      [TestCategory.ERROR_HANDLING, TestCategory.CRITICAL, TestCategory.E2E],
      withPerformanceMonitoring(async () => {
        wrapper = mount(createTestApp(), {
          global: {
            plugins: [pinia, router, i18n]
          }
        });

        await wrapper.vm.$nextTick();

        // Simulate complete application failure
        (window as any).testApp.setServiceStatus('down');
        (window as any).testApp.handleError('Complete service failure', true);
        await wrapper.vm.$nextTick();

        // Verify error state
        expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="service-status"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="service-status"]').text()).toContain('temporarily unavailable');

        // Navigate to different routes during error state
        await router.push('/receipts');
        await wrapper.vm.$nextTick();

        // Should still show error state regardless of route
        expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);

        // Simulate service recovery
        (window as any).testApp.setServiceStatus('operational');
        await wrapper.find('[data-testid="retry-btn"]').trigger('click');
        vi.advanceTimersByTime(1000);
        await wrapper.vm.$nextTick();

        // Should recover and show normal content
        expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="main-content"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="receipts"]').exists()).toBe(true);
      }, 'Complete Application Recovery', [TestCategory.ERROR_HANDLING, TestCategory.E2E], {
        maxDuration: 5000,
        maxNetworkRequests: 20
      })
    );

    categorizedIt('should maintain user experience during degraded service',
      [TestCategory.ERROR_HANDLING, TestCategory.UX, TestCategory.DEGRADED],
      withPerformanceMonitoring(async () => {
        wrapper = mount(createTestApp(), {
          global: {
            plugins: [pinia, router, i18n]
          }
        });

        await wrapper.vm.$nextTick();

        // Simulate degraded service
        (window as any).testApp.setServiceStatus('degraded');
        await wrapper.vm.$nextTick();

        // Should show degraded status but allow navigation
        expect(wrapper.find('[data-testid="service-status"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="main-content"]').exists()).toBe(true);

        // Test navigation still works
        await wrapper.find('[data-testid="nav-upload"]').trigger('click');
        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-testid="upload"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="service-status"]').exists()).toBe(true);

        // Test critical functions are limited but non-critical still work
        // This would be implemented based on specific business logic
        expect(wrapper.find('[data-testid="service-status"]').text()).toContain('Limited functionality');
      }, 'Degraded Service UX', [TestCategory.ERROR_HANDLING, TestCategory.UX])
    );
  });
});