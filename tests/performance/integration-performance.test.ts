import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { createI18n } from 'vue-i18n';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import {
  categorizedDescribe,
  categorizedIt,
  TestCategory,
  CategoryCombos
} from '../utils/categories';
import {
  withPerformanceMonitoring,
  generatePerformanceReport,
  clearPerformanceMetrics,
  PerformanceThresholds
} from '../utils/performance-monitoring';

// Mock API adapter
const mockAxios = new MockAdapter(axios);

// Create performance test component with various scenarios
const createPerformanceTestComponent = (scenario: string) => ({
  name: `PerformanceTest${scenario}`,
  template: `
    <div class="performance-test" :data-testid="'performance-test-' + scenario">
      <h2>Performance Test: {{ scenario }}</h2>

      <!-- Light rendering scenario -->
      <div v-if="scenario === 'light'" class="light-scenario">
        <div v-for="n in 10" :key="n" class="item">Item {{ n }}</div>
      </div>

      <!-- Heavy rendering scenario -->
      <div v-if="scenario === 'heavy'" class="heavy-scenario">
        <div v-for="n in 1000" :key="n" class="item" :data-testid="'heavy-item-' + n">
          <div class="item-content">
            <span class="item-number">{{ n }}</span>
            <span class="item-calculated">{{ calculateValue(n) }}</span>
            <div class="item-nested">
              <div v-for="m in 5" :key="m" class="nested-item">
                {{ formatValue(n * m) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Network intensive scenario -->
      <div v-if="scenario === 'network'" class="network-scenario">
        <button @click="triggerMultipleRequests" data-testid="trigger-requests">
          Trigger Network Requests
        </button>
        <div class="request-results">
          <div v-for="(result, index) in networkResults" :key="index" class="result">
            Request {{ index + 1 }}: {{ result.status }}
          </div>
        </div>
      </div>

      <!-- Memory intensive scenario -->
      <div v-if="scenario === 'memory'" class="memory-scenario">
        <button @click="allocateMemory" data-testid="allocate-memory">
          Allocate Memory
        </button>
        <button @click="clearMemory" data-testid="clear-memory">
          Clear Memory
        </button>
        <div class="memory-info">
          Allocated objects: {{ memoryObjects.length }}
        </div>
      </div>

      <!-- Rerender intensive scenario -->
      <div v-if="scenario === 'rerender'" class="rerender-scenario">
        <button @click="triggerRerenders" data-testid="trigger-rerenders">
          Trigger Re-renders
        </button>
        <div class="counter">{{ rerenderCounter }}</div>
        <div v-for="n in rerenderItems" :key="n" class="rerender-item">
          {{ computedValue }}
        </div>
      </div>

      <!-- Interaction scenario -->
      <div v-if="scenario === 'interaction'" class="interaction-scenario">
        <input
          v-model="inputValue"
          @input="onInput"
          data-testid="interaction-input"
          placeholder="Type to trigger interactions"
        />
        <button
          v-for="n in 20"
          :key="n"
          @click="onButtonClick(n)"
          :data-testid="'interaction-btn-' + n"
          class="interaction-button"
        >
          Button {{ n }}
        </button>
        <div class="interaction-results">
          <div>Input changes: {{ inputChanges }}</div>
          <div>Button clicks: {{ buttonClicks }}</div>
        </div>
      </div>
    </div>
  `,
  props: {
    scenario: {
      type: String,
      required: true
    }
  },
  setup(props) {
    // State for different scenarios
    const networkResults = ref<any[]>([]);
    const memoryObjects = ref<any[]>([]);
    const rerenderCounter = ref(0);
    const rerenderItems = ref(10);
    const inputValue = ref('');
    const inputChanges = ref(0);
    const buttonClicks = ref(0);

    // Performance monitor reference
    const performanceMonitor = inject('performanceMonitor', null);

    // Heavy computation for testing
    const calculateValue = (n: number) => {
      // Intentionally heavy calculation
      let result = 0;
      for (let i = 0; i < 1000; i++) {
        result += Math.sqrt(n * i);
      }
      return result.toFixed(2);
    };

    const formatValue = (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    };

    // Computed value that triggers recalculation
    const computedValue = computed(() => {
      return rerenderCounter.value * Math.random();
    });

    // Network scenario methods
    const triggerMultipleRequests = async () => {
      if (performanceMonitor) {
        performanceMonitor.trackUserInteraction('network_trigger');
      }

      // Trigger 10 concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) =>
        axios.get(`/api/test-request-${i}`)
          .then(response => ({ index: i, status: 'success', data: response.data }))
          .catch(error => ({ index: i, status: 'error', error: error.message }))
      );

      try {
        const results = await Promise.all(requests);
        networkResults.value = results;
      } catch (error) {
        console.error('Network requests failed:', error);
      }
    };

    // Memory scenario methods
    const allocateMemory = () => {
      if (performanceMonitor) {
        performanceMonitor.trackUserInteraction('memory_allocate');
      }

      // Allocate large objects
      for (let i = 0; i < 1000; i++) {
        memoryObjects.value.push({
          id: i,
          data: new Array(1000).fill(Math.random()),
          timestamp: Date.now(),
          metadata: {
            created: new Date(),
            type: 'performance-test',
            index: i
          }
        });
      }
    };

    const clearMemory = () => {
      if (performanceMonitor) {
        performanceMonitor.trackUserInteraction('memory_clear');
      }

      memoryObjects.value = [];
      // Force garbage collection hint
      if (global.gc) {
        global.gc();
      }
    };

    // Rerender scenario methods
    const triggerRerenders = () => {
      if (performanceMonitor) {
        performanceMonitor.trackUserInteraction('trigger_rerenders');
      }

      // Trigger multiple rerenders
      const interval = setInterval(() => {
        rerenderCounter.value++;
        if (performanceMonitor) {
          performanceMonitor.trackRender('PerformanceTestRerender', { counter: rerenderCounter.value }, true);
        }

        if (rerenderCounter.value >= 50) {
          clearInterval(interval);
        }
      }, 10);
    };

    // Interaction scenario methods
    const onInput = () => {
      inputChanges.value++;
      if (performanceMonitor) {
        performanceMonitor.trackUserInteraction('input');
      }
    };

    const onButtonClick = (buttonNumber: number) => {
      buttonClicks.value++;
      if (performanceMonitor) {
        performanceMonitor.trackUserInteraction('click');
      }
    };

    return {
      networkResults,
      memoryObjects,
      rerenderCounter,
      rerenderItems,
      inputValue,
      inputChanges,
      buttonClicks,
      computedValue,
      calculateValue,
      formatValue,
      triggerMultipleRequests,
      allocateMemory,
      clearMemory,
      triggerRerenders,
      onInput,
      onButtonClick
    };
  }
});

// Test app wrapper
const createPerformanceTestApp = (scenario: string) => ({
  name: 'PerformanceTestApp',
  template: `
    <div class="performance-test-app">
      <PerformanceTestComponent :scenario="scenario" />
    </div>
  `,
  components: {
    PerformanceTestComponent: createPerformanceTestComponent(scenario)
  },
  props: {
    scenario: {
      type: String,
      required: true
    }
  }
});

categorizedDescribe('Integration Test Performance Monitoring', [TestCategory.PERFORMANCE, TestCategory.INTEGRATION], () => {
  let wrapper: VueWrapper;
  let pinia: any;
  let router: any;
  let i18n: any;

  beforeEach(async () => {
    // Clear previous metrics
    clearPerformanceMetrics();

    // Setup stores
    pinia = createPinia();
    setActivePinia(pinia);

    // Setup router
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } }
      ]
    });

    // Setup i18n
    i18n = createI18n({
      locale: 'en',
      messages: { en: {} }
    });

    // Setup API mocks for network tests
    mockAxios.reset();

    // Mock API responses with varying delays
    for (let i = 0; i < 10; i++) {
      const delay = Math.random() * 100 + 50; // 50-150ms delay
      mockAxios.onGet(`/api/test-request-${i}`).reply(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve([200, { data: `response-${i}`, timestamp: Date.now() }]);
          }, delay);
        });
      });
    }

    await router.push('/');
    await router.isReady();
  });

  afterEach(() => {
    wrapper?.unmount();
    mockAxios.reset();
    vi.clearAllMocks();
  });

  categorizedIt('should monitor light rendering performance',
    [TestCategory.PERFORMANCE, TestCategory.FAST],
    withPerformanceMonitoring(async () => {
      const customThresholds: Partial<PerformanceThresholds> = {
        maxDuration: 100,
        maxMemoryUsage: 5 * 1024 * 1024, // 5MB
        maxRerenders: 2
      };

      wrapper = mount(createPerformanceTestApp('light'), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Verify component rendered correctly
      expect(wrapper.find('[data-testid="performance-test-light"]').exists()).toBe(true);
      expect(wrapper.findAll('.item')).toHaveLength(10);

      // Component should render quickly with minimal overhead
      expect(wrapper.text()).toContain('Performance Test: light');
    }, 'Light Rendering Test', [TestCategory.PERFORMANCE, TestCategory.FAST], customThresholds)
  );

  categorizedIt('should monitor heavy rendering performance with warnings',
    [TestCategory.PERFORMANCE, TestCategory.SLOW],
    withPerformanceMonitoring(async () => {
      const customThresholds: Partial<PerformanceThresholds> = {
        maxDuration: 2000,
        maxMemoryUsage: 50 * 1024 * 1024, // 50MB
        maxRerenders: 5
      };

      wrapper = mount(createPerformanceTestApp('heavy'), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Verify heavy rendering scenario
      expect(wrapper.find('[data-testid="performance-test-heavy"]').exists()).toBe(true);

      // This will likely exceed thresholds due to 1000 items with heavy calculations
      expect(wrapper.findAll('.item')).toHaveLength(1000);
    }, 'Heavy Rendering Test', [TestCategory.PERFORMANCE, TestCategory.SLOW], customThresholds)
  );

  categorizedIt('should monitor network-intensive operations',
    [TestCategory.PERFORMANCE, TestCategory.NETWORK],
    withPerformanceMonitoring(async () => {
      const customThresholds: Partial<PerformanceThresholds> = {
        maxDuration: 1000,
        maxNetworkRequests: 12, // Allow for initial + 10 test requests
        maxResponseTime: 200
      };

      wrapper = mount(createPerformanceTestApp('network'), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Trigger network requests
      const triggerBtn = wrapper.find('[data-testid="trigger-requests"]');
      expect(triggerBtn.exists()).toBe(true);

      await triggerBtn.trigger('click');

      // Wait for requests to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      await wrapper.vm.$nextTick();

      // Verify results are displayed
      expect(wrapper.findAll('.result')).toHaveLength(10);
    }, 'Network Intensive Test', [TestCategory.PERFORMANCE, TestCategory.NETWORK], customThresholds)
  );

  categorizedIt('should monitor memory allocation and cleanup',
    [TestCategory.PERFORMANCE, TestCategory.MEMORY],
    withPerformanceMonitoring(async () => {
      const customThresholds: Partial<PerformanceThresholds> = {
        maxDuration: 800,
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB for memory test
        maxRerenders: 3
      };

      wrapper = mount(createPerformanceTestApp('memory'), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Allocate memory
      const allocateBtn = wrapper.find('[data-testid="allocate-memory"]');
      await allocateBtn.trigger('click');
      await wrapper.vm.$nextTick();

      // Verify memory allocation
      expect(wrapper.text()).toContain('Allocated objects: 1000');

      // Clear memory
      const clearBtn = wrapper.find('[data-testid="clear-memory"]');
      await clearBtn.trigger('click');
      await wrapper.vm.$nextTick();

      // Verify memory is cleared
      expect(wrapper.text()).toContain('Allocated objects: 0');
    }, 'Memory Management Test', [TestCategory.PERFORMANCE, TestCategory.MEMORY], customThresholds)
  );

  categorizedIt('should monitor excessive re-rendering scenarios',
    [TestCategory.PERFORMANCE, TestCategory.RERENDER],
    withPerformanceMonitoring(async () => {
      const customThresholds: Partial<PerformanceThresholds> = {
        maxDuration: 1500,
        maxRerenders: 55, // Allow for 50 + initial renders
        maxMemoryUsage: 20 * 1024 * 1024
      };

      wrapper = mount(createPerformanceTestApp('rerender'), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Trigger excessive rerenders
      const triggerBtn = wrapper.find('[data-testid="trigger-rerenders"]');
      await triggerBtn.trigger('click');

      // Wait for rerenders to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      await wrapper.vm.$nextTick();

      // Verify rerenders occurred
      expect(wrapper.text()).toContain('50');
    }, 'Excessive Rerender Test', [TestCategory.PERFORMANCE, TestCategory.RERENDER], customThresholds)
  );

  categorizedIt('should monitor user interaction performance',
    [TestCategory.PERFORMANCE, TestCategory.USER_INTERACTION],
    withPerformanceMonitoring(async () => {
      const customThresholds: Partial<PerformanceThresholds> = {
        maxDuration: 600,
        maxRerenders: 25, // Allow for input changes
        maxMemoryUsage: 10 * 1024 * 1024
      };

      wrapper = mount(createPerformanceTestApp('interaction'), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      const input = wrapper.find('[data-testid="interaction-input"]');

      // Simulate multiple input changes
      for (let i = 0; i < 10; i++) {
        await input.setValue(`test input ${i}`);
        await wrapper.vm.$nextTick();
      }

      // Simulate multiple button clicks
      for (let i = 1; i <= 10; i++) {
        const btn = wrapper.find(`[data-testid="interaction-btn-${i}"]`);
        await btn.trigger('click');
      }

      await wrapper.vm.$nextTick();

      // Verify interactions were tracked
      expect(wrapper.text()).toContain('Input changes: 10');
      expect(wrapper.text()).toContain('Button clicks: 10');
    }, 'User Interaction Test', [TestCategory.PERFORMANCE, TestCategory.USER_INTERACTION], customThresholds)
  );

  categorizedIt('should detect performance regressions',
    [TestCategory.PERFORMANCE, TestCategory.CRITICAL],
    withPerformanceMonitoring(async () => {
      // Intentionally strict thresholds to trigger violations
      const strictThresholds: Partial<PerformanceThresholds> = {
        maxDuration: 50, // Very strict
        maxMemoryUsage: 1024 * 1024, // 1MB only
        maxNetworkRequests: 2,
        maxResponseTime: 25,
        maxRerenders: 1
      };

      try {
        wrapper = mount(createPerformanceTestApp('heavy'), {
          global: {
            plugins: [pinia, router, i18n]
          }
        });

        await wrapper.vm.$nextTick();

        // This test is expected to fail performance thresholds
        expect(wrapper.find('[data-testid="performance-test-heavy"]').exists()).toBe(true);
      } catch (error) {
        // Performance violations should be caught and reported
        expect(error.message).toContain('Performance test failed with critical violations');
      }
    }, 'Performance Regression Detection', [TestCategory.PERFORMANCE, TestCategory.CRITICAL], strictThresholds)
  );

  // Generate performance report after all tests
  afterAll(() => {
    generatePerformanceReport();
  });
});