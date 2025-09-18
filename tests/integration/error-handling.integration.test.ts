import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { createI18n } from 'vue-i18n';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { categorizedDescribe, categorizedIt, TestCategory, CategoryCombos, withPerformance } from '../utils/categories';
import { useAuthStore } from '../../src/stores/auth';
import { useReceiptsStore } from '../../src/stores/receipts';
import { useReportsStore } from '../../src/stores/reports';

// Mock API adapter
const mockAxios = new MockAdapter(axios);

// Create comprehensive error boundary component
const createErrorBoundaryComponent = () => ({
  name: 'ErrorBoundary',
  template: `
    <div class="error-boundary" data-testid="error-boundary">
      <div v-if="hasError" class="error-display" data-testid="error-display">
        <div class="error-header">
          <h2>{{ errorTitle }}</h2>
          <div class="error-type" :class="errorType" data-testid="error-type">
            {{ errorType }}
          </div>
        </div>

        <div class="error-details" data-testid="error-details">
          <div class="error-message">
            <strong>Message:</strong> {{ errorMessage }}
          </div>

          <div v-if="errorCode" class="error-code">
            <strong>Code:</strong> {{ errorCode }}
          </div>

          <div v-if="errorContext" class="error-context">
            <strong>Context:</strong> {{ errorContext }}
          </div>

          <div v-if="errorStack && showDetails" class="error-stack">
            <strong>Stack Trace:</strong>
            <pre>{{ errorStack }}</pre>
          </div>
        </div>

        <div class="error-actions" data-testid="error-actions">
          <button
            @click="retryOperation"
            :disabled="isRetrying"
            class="retry-btn"
            data-testid="retry-btn"
          >
            {{ isRetrying ? 'Retrying...' : 'Retry' }}
          </button>

          <button
            @click="goBack"
            class="back-btn"
            data-testid="back-btn"
          >
            Go Back
          </button>

          <button
            @click="goHome"
            class="home-btn"
            data-testid="home-btn"
          >
            Go Home
          </button>

          <button
            @click="toggleDetails"
            class="details-btn"
            data-testid="details-btn"
          >
            {{ showDetails ? 'Hide' : 'Show' }} Details
          </button>

          <button
            @click="reportError"
            class="report-btn"
            data-testid="report-btn"
          >
            Report Issue
          </button>
        </div>

        <div v-if="retryAttempts > 0" class="retry-info" data-testid="retry-info">
          Retry attempts: {{ retryAttempts }}/{{ maxRetries }}
        </div>
      </div>

      <div v-else class="error-boundary-content">
        <slot />
      </div>

      <!-- Network Status Indicator -->
      <div
        v-if="!isOnline"
        class="offline-indicator"
        data-testid="offline-indicator"
      >
        <span class="offline-icon">⚠️</span>
        <span>You are currently offline</span>
      </div>

      <!-- Loading States -->
      <div
        v-if="isLoading"
        class="loading-overlay"
        data-testid="loading-overlay"
      >
        <div class="loading-spinner"></div>
        <div class="loading-text">{{ loadingMessage }}</div>
      </div>

      <!-- Global Error Toast -->
      <div
        v-if="globalError"
        class="error-toast"
        :class="globalError.severity"
        data-testid="error-toast"
      >
        <div class="toast-content">
          <span class="toast-icon">{{ getErrorIcon(globalError.severity) }}</span>
          <span class="toast-message">{{ globalError.message }}</span>
        </div>
        <button
          @click="dismissGlobalError"
          class="toast-dismiss"
          data-testid="dismiss-toast"
        >
          ×
        </button>
      </div>
    </div>
  `,
  props: {
    fallbackComponent: {
      type: Object,
      default: null
    }
  },
  setup(props) {
    const router = useRouter();
    const authStore = useAuthStore();

    // Error state
    const hasError = ref(false);
    const errorType = ref('');
    const errorTitle = ref('');
    const errorMessage = ref('');
    const errorCode = ref('');
    const errorContext = ref('');
    const errorStack = ref('');
    const showDetails = ref(false);
    const isRetrying = ref(false);
    const retryAttempts = ref(0);
    const maxRetries = ref(3);
    const retryCallback = ref<(() => Promise<void>) | null>(null);

    // Global state
    const isOnline = ref(navigator.onLine);
    const isLoading = ref(false);
    const loadingMessage = ref('');
    const globalError = ref<any>(null);

    // Error categories
    const ERROR_TYPES = {
      NETWORK: 'network',
      AUTHENTICATION: 'authentication',
      VALIDATION: 'validation',
      SERVER: 'server',
      CLIENT: 'client',
      PERMISSION: 'permission',
      NOT_FOUND: 'not-found',
      TIMEOUT: 'timeout',
      RATE_LIMIT: 'rate-limit'
    };

    // Methods
    const handleError = (error: any, context?: string) => {
      console.error('Error caught by boundary:', error);

      hasError.value = true;
      errorContext.value = context || '';
      errorStack.value = error.stack || '';

      // Categorize error
      categorizeError(error);
    };

    const categorizeError = (error: any) => {
      if (error.response) {
        // HTTP errors
        const status = error.response.status;

        switch (status) {
          case 401:
            errorType.value = ERROR_TYPES.AUTHENTICATION;
            errorTitle.value = 'Authentication Required';
            errorMessage.value = 'Please log in to continue';
            errorCode.value = '401';
            break;
          case 403:
            errorType.value = ERROR_TYPES.PERMISSION;
            errorTitle.value = 'Access Denied';
            errorMessage.value = 'You do not have permission to access this resource';
            errorCode.value = '403';
            break;
          case 404:
            errorType.value = ERROR_TYPES.NOT_FOUND;
            errorTitle.value = 'Resource Not Found';
            errorMessage.value = 'The requested resource could not be found';
            errorCode.value = '404';
            break;
          case 422:
            errorType.value = ERROR_TYPES.VALIDATION;
            errorTitle.value = 'Validation Error';
            errorMessage.value = error.response.data?.message || 'Invalid data provided';
            errorCode.value = '422';
            break;
          case 429:
            errorType.value = ERROR_TYPES.RATE_LIMIT;
            errorTitle.value = 'Too Many Requests';
            errorMessage.value = 'Please wait before making more requests';
            errorCode.value = '429';
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            errorType.value = ERROR_TYPES.SERVER;
            errorTitle.value = 'Server Error';
            errorMessage.value = 'An internal server error occurred';
            errorCode.value = status.toString();
            break;
          default:
            errorType.value = ERROR_TYPES.SERVER;
            errorTitle.value = 'HTTP Error';
            errorMessage.value = error.response.data?.message || `HTTP ${status} Error`;
            errorCode.value = status.toString();
        }
      } else if (error.code === 'NETWORK_ERROR') {
        errorType.value = ERROR_TYPES.NETWORK;
        errorTitle.value = 'Network Error';
        errorMessage.value = 'Unable to connect to the server';
        errorCode.value = 'NETWORK_ERROR';
      } else if (error.code === 'ECONNABORTED') {
        errorType.value = ERROR_TYPES.TIMEOUT;
        errorTitle.value = 'Request Timeout';
        errorMessage.value = 'The request took too long to complete';
        errorCode.value = 'TIMEOUT';
      } else {
        errorType.value = ERROR_TYPES.CLIENT;
        errorTitle.value = 'Application Error';
        errorMessage.value = error.message || 'An unexpected error occurred';
        errorCode.value = error.code || 'UNKNOWN';
      }
    };

    const retryOperation = async () => {
      if (retryAttempts.value >= maxRetries.value) {
        showGlobalError('Maximum retry attempts reached', 'error');
        return;
      }

      isRetrying.value = true;
      retryAttempts.value++;

      try {
        if (retryCallback.value) {
          await retryCallback.value();
          clearError();
        } else {
          // Default retry: reload the page or refresh data
          window.location.reload();
        }
      } catch (error) {
        console.error('Retry failed:', error);
        if (retryAttempts.value >= maxRetries.value) {
          showGlobalError('All retry attempts failed', 'error');
        }
      } finally {
        isRetrying.value = false;
      }
    };

    const clearError = () => {
      hasError.value = false;
      errorType.value = '';
      errorTitle.value = '';
      errorMessage.value = '';
      errorCode.value = '';
      errorContext.value = '';
      errorStack.value = '';
      showDetails.value = false;
      retryAttempts.value = 0;
      retryCallback.value = null;
    };

    const goBack = () => {
      router.back();
    };

    const goHome = () => {
      router.push('/');
    };

    const toggleDetails = () => {
      showDetails.value = !showDetails.value;
    };

    const reportError = () => {
      // In a real app, this would send error details to an error reporting service
      const errorReport = {
        type: errorType.value,
        message: errorMessage.value,
        code: errorCode.value,
        context: errorContext.value,
        stack: errorStack.value,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userId: authStore.user?.id
      };

      console.log('Error reported:', errorReport);
      showGlobalError('Error report sent successfully', 'success');
    };

    const showGlobalError = (message: string, severity: 'error' | 'warning' | 'success' = 'error') => {
      globalError.value = { message, severity };

      // Auto-dismiss after 5 seconds for success/warning
      if (severity !== 'error') {
        setTimeout(() => {
          globalError.value = null;
        }, 5000);
      }
    };

    const dismissGlobalError = () => {
      globalError.value = null;
    };

    const getErrorIcon = (severity: string) => {
      switch (severity) {
        case 'error': return '❌';
        case 'warning': return '⚠️';
        case 'success': return '✅';
        default: return '❌';
      }
    };

    const setLoading = (loading: boolean, message = '') => {
      isLoading.value = loading;
      loadingMessage.value = message;
    };

    const setRetryCallback = (callback: () => Promise<void>) => {
      retryCallback.value = callback;
    };

    // Network status monitoring
    const handleOnline = () => {
      isOnline.value = true;
      showGlobalError('Connection restored', 'success');
    };

    const handleOffline = () => {
      isOnline.value = false;
      showGlobalError('No internet connection', 'warning');
    };

    // Lifecycle
    onMounted(() => {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Global error handler
      window.addEventListener('error', (event) => {
        handleError(event.error, 'Global Error Handler');
      });

      // Unhandled promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        handleError(event.reason, 'Unhandled Promise Rejection');
      });
    });

    onUnmounted(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    });

    return {
      hasError,
      errorType,
      errorTitle,
      errorMessage,
      errorCode,
      errorContext,
      errorStack,
      showDetails,
      isRetrying,
      retryAttempts,
      maxRetries,
      isOnline,
      isLoading,
      loadingMessage,
      globalError,
      handleError,
      retryOperation,
      clearError,
      goBack,
      goHome,
      toggleDetails,
      reportError,
      showGlobalError,
      dismissGlobalError,
      getErrorIcon,
      setLoading,
      setRetryCallback
    };
  }
});

// Create failing component for testing
const createFailingComponent = (errorType: string) => ({
  name: 'FailingComponent',
  template: `
    <div class="failing-component" data-testid="failing-component">
      <h3>Test Component - {{ errorType }}</h3>
      <button
        @click="triggerError"
        data-testid="trigger-error-btn"
      >
        Trigger {{ errorType }} Error
      </button>
      <div v-if="data" class="component-data">
        {{ data }}
      </div>
    </div>
  `,
  props: {
    errorType: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const data = ref(null);

    const triggerError = async () => {
      switch (props.errorType) {
        case 'network':
          throw new Error('Network connection failed');
        case 'validation':
          throw new Error('Validation failed: Invalid input data');
        case 'permission':
          const permissionError = new Error('Access denied');
          (permissionError as any).response = { status: 403 };
          throw permissionError;
        case 'server':
          const serverError = new Error('Internal server error');
          (serverError as any).response = { status: 500 };
          throw serverError;
        case 'timeout':
          const timeoutError = new Error('Request timeout');
          (timeoutError as any).code = 'ECONNABORTED';
          throw timeoutError;
        default:
          throw new Error('Unknown error type');
      }
    };

    return {
      data,
      triggerError
    };
  }
});

// Main test app
const createTestApp = () => ({
  name: 'TestApp',
  template: `
    <div class="test-app">
      <ErrorBoundary ref="errorBoundary">
        <router-view />
      </ErrorBoundary>
    </div>
  `,
  components: {
    ErrorBoundary: createErrorBoundaryComponent()
  },
  setup() {
    const errorBoundary = ref(null);

    const triggerGlobalError = (error: any) => {
      if (errorBoundary.value) {
        (errorBoundary.value as any).handleError(error);
      }
    };

    return {
      errorBoundary,
      triggerGlobalError
    };
  }
});

categorizedDescribe('Error Handling Integration Tests', [TestCategory.INTEGRATION, TestCategory.ERROR_HANDLING], () => {
  let wrapper: VueWrapper;
  let pinia: any;
  let router: any;
  let i18n: any;

  beforeEach(async () => {
    // Setup fresh stores
    pinia = createPinia();
    setActivePinia(pinia);

    // Setup router
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: { template: '<div data-testid="home">Home</div>' } },
        { path: '/network-error', component: createFailingComponent('network') },
        { path: '/validation-error', component: createFailingComponent('validation') },
        { path: '/permission-error', component: createFailingComponent('permission') },
        { path: '/server-error', component: createFailingComponent('server') },
        { path: '/timeout-error', component: createFailingComponent('timeout') }
      ]
    });

    // Setup i18n
    i18n = createI18n({
      locale: 'en',
      messages: {
        en: {
          errors: {
            network: 'Network error occurred',
            server: 'Server error occurred'
          }
        }
      }
    });

    // Reset mocks
    mockAxios.reset();
    vi.clearAllMocks();

    await router.push('/');
    await router.isReady();
  });

  afterEach(() => {
    wrapper?.unmount();
    mockAxios.reset();
    vi.clearAllMocks();
  });

  categorizedIt('should handle network errors with retry functionality',
    [TestCategory.ERROR_HANDLING, TestCategory.NETWORK],
    withPerformance(async () => {
      // Mock network failure
      mockAxios.onGet('/api/data').networkError();

      wrapper = mount(createTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await router.push('/network-error');
      await wrapper.vm.$nextTick();

      // Trigger network error
      const triggerBtn = wrapper.find('[data-testid="trigger-error-btn"]');
      expect(triggerBtn.exists()).toBe(true);

      try {
        await triggerBtn.trigger('click');
      } catch (error) {
        // Error should be caught by error boundary
        wrapper.vm.triggerGlobalError(error);
      }

      await wrapper.vm.$nextTick();

      // Verify error boundary shows network error
      expect(wrapper.find('[data-testid="error-boundary"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="error-type"]').text()).toBe('client');
      expect(wrapper.text()).toContain('Network connection failed');

      // Test retry functionality
      const retryBtn = wrapper.find('[data-testid="retry-btn"]');
      expect(retryBtn.exists()).toBe(true);
      expect(retryBtn.element.disabled).toBe(false);

      // Mock successful retry
      mockAxios.reset();
      mockAxios.onGet('/api/data').reply(200, { success: true });

      await retryBtn.trigger('click');
      await wrapper.vm.$nextTick();

      // Verify retry attempt
      expect(wrapper.find('[data-testid="retry-info"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Retry attempts: 1/3');
    }, 3000, TestCategory.MEDIUM)
  );

  categorizedIt('should handle authentication errors and redirect to login',
    [TestCategory.ERROR_HANDLING, TestCategory.AUTH],
    withPerformance(async () => {
      // Mock 401 authentication error
      mockAxios.onGet('/api/protected').reply(401, {
        message: 'Authentication required'
      });

      wrapper = mount(createTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      // Simulate authentication error
      try {
        await axios.get('/api/protected');
      } catch (error) {
        wrapper.vm.triggerGlobalError(error);
      }

      await wrapper.vm.$nextTick();

      // Verify authentication error display
      expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="error-type"]').text()).toBe('authentication');
      expect(wrapper.text()).toContain('Authentication Required');
      expect(wrapper.text()).toContain('Please log in to continue');

      // Verify error actions are available
      expect(wrapper.find('[data-testid="retry-btn"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="home-btn"]').exists()).toBe(true);
    }, 2000, TestCategory.FAST)
  );

  categorizedIt('should handle validation errors with detailed messages',
    [TestCategory.ERROR_HANDLING, TestCategory.VALIDATION],
    withPerformance(async () => {
      // Mock validation error
      mockAxios.onPost('/api/validate').reply(422, {
        message: 'Validation failed',
        errors: {
          email: ['Email is required', 'Email format is invalid'],
          password: ['Password must be at least 8 characters']
        }
      });

      wrapper = mount(createTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      // Simulate validation error
      try {
        await axios.post('/api/validate', { email: '', password: '123' });
      } catch (error) {
        wrapper.vm.triggerGlobalError(error);
      }

      await wrapper.vm.$nextTick();

      // Verify validation error display
      expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="error-type"]').text()).toBe('validation');
      expect(wrapper.text()).toContain('Validation Error');
      expect(wrapper.text()).toContain('Invalid data provided');

      // Test error details toggle
      const detailsBtn = wrapper.find('[data-testid="details-btn"]');
      expect(detailsBtn.exists()).toBe(true);

      await detailsBtn.trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="error-details"]').exists()).toBe(true);
      expect(detailsBtn.text()).toContain('Hide Details');
    }, 2000, TestCategory.FAST)
  );

  categorizedIt('should handle server errors with appropriate fallbacks',
    [TestCategory.ERROR_HANDLING, TestCategory.SERVER],
    withPerformance(async () => {
      // Mock server error
      mockAxios.onGet('/api/data').reply(500, {
        message: 'Internal server error'
      });

      wrapper = mount(createTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      // Simulate server error
      try {
        await axios.get('/api/data');
      } catch (error) {
        wrapper.vm.triggerGlobalError(error);
      }

      await wrapper.vm.$nextTick();

      // Verify server error display
      expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="error-type"]').text()).toBe('server');
      expect(wrapper.text()).toContain('Server Error');
      expect(wrapper.text()).toContain('An internal server error occurred');

      // Test error reporting
      const reportBtn = wrapper.find('[data-testid="report-btn"]');
      expect(reportBtn.exists()).toBe(true);

      await reportBtn.trigger('click');
      await wrapper.vm.$nextTick();

      // Verify success toast appears
      expect(wrapper.find('[data-testid="error-toast"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Error report sent successfully');
    }, 2000, TestCategory.FAST)
  );

  categorizedIt('should handle timeout errors with appropriate messaging',
    [TestCategory.ERROR_HANDLING, TestCategory.TIMEOUT],
    withPerformance(async () => {
      // Mock timeout error
      mockAxios.onGet('/api/slow').timeout();

      wrapper = mount(createTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      // Simulate timeout error
      try {
        await axios.get('/api/slow', { timeout: 1000 });
      } catch (error) {
        wrapper.vm.triggerGlobalError(error);
      }

      await wrapper.vm.$nextTick();

      // Verify timeout error display
      expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="error-type"]').text()).toBe('timeout');
      expect(wrapper.text()).toContain('Request Timeout');
      expect(wrapper.text()).toContain('The request took too long to complete');

      // Verify navigation options
      expect(wrapper.find('[data-testid="back-btn"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="home-btn"]').exists()).toBe(true);
    }, 2000, TestCategory.FAST)
  );

  categorizedIt('should handle rate limiting errors with wait messaging',
    [TestCategory.ERROR_HANDLING, TestCategory.RATE_LIMIT],
    withPerformance(async () => {
      // Mock rate limit error
      mockAxios.onPost('/api/action').reply(429, {
        message: 'Too many requests, please try again later'
      });

      wrapper = mount(createTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      // Simulate rate limit error
      try {
        await axios.post('/api/action');
      } catch (error) {
        wrapper.vm.triggerGlobalError(error);
      }

      await wrapper.vm.$nextTick();

      // Verify rate limit error display
      expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="error-type"]').text()).toBe('rate-limit');
      expect(wrapper.text()).toContain('Too Many Requests');
      expect(wrapper.text()).toContain('Please wait before making more requests');
    }, 1500, TestCategory.FAST)
  );

  categorizedIt('should handle offline/online network status changes',
    [TestCategory.ERROR_HANDLING, TestCategory.NETWORK],
    withPerformance(async () => {
      wrapper = mount(createTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true
      });

      window.dispatchEvent(new Event('offline'));
      await wrapper.vm.$nextTick();

      // Verify offline indicator
      expect(wrapper.find('[data-testid="offline-indicator"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('You are currently offline');

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true
      });

      window.dispatchEvent(new Event('online'));
      await wrapper.vm.$nextTick();

      // Verify offline indicator is hidden and success message shown
      expect(wrapper.find('[data-testid="offline-indicator"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="error-toast"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Connection restored');
    }, 2000, TestCategory.FAST)
  );

  categorizedIt('should handle multiple retry attempts with progressive backoff',
    [TestCategory.ERROR_HANDLING, TestCategory.RETRY_LOGIC],
    withPerformance(async () => {
      // Mock persistent failure
      mockAxios.onGet('/api/retry-test').reply(500);

      wrapper = mount(createTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      // Simulate persistent error
      try {
        await axios.get('/api/retry-test');
      } catch (error) {
        wrapper.vm.triggerGlobalError(error);
      }

      await wrapper.vm.$nextTick();

      const retryBtn = wrapper.find('[data-testid="retry-btn"]');

      // First retry
      await retryBtn.trigger('click');
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Retry attempts: 1/3');

      // Second retry
      await retryBtn.trigger('click');
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Retry attempts: 2/3');

      // Third retry
      await retryBtn.trigger('click');
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Retry attempts: 3/3');

      // Fourth retry should show max attempts reached
      await retryBtn.trigger('click');
      await wrapper.vm.$nextTick();
      expect(wrapper.find('[data-testid="error-toast"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Maximum retry attempts reached');
    }, 3000, TestCategory.MEDIUM)
  );

  categorizedIt('should provide contextual error recovery options',
    [TestCategory.ERROR_HANDLING, TestCategory.USER_EXPERIENCE],
    withPerformance(async () => {
      wrapper = mount(createTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      // Simulate error with context
      const contextualError = new Error('Failed to load receipt data');
      (contextualError as any).response = { status: 404 };
      wrapper.vm.triggerGlobalError(contextualError, 'Receipt Detail View');

      await wrapper.vm.$nextTick();

      // Verify contextual information is displayed
      expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Receipt Detail View');

      // Verify all recovery options are available
      expect(wrapper.find('[data-testid="retry-btn"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="back-btn"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="home-btn"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="report-btn"]').exists()).toBe(true);

      // Test navigation options
      const homeBtn = wrapper.find('[data-testid="home-btn"]');
      await homeBtn.trigger('click');
      await wrapper.vm.$nextTick();

      expect(router.currentRoute.value.path).toBe('/');
    }, 2000, TestCategory.FAST)
  );
});