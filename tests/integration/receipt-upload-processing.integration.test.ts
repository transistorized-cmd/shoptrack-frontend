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
import { usePluginStore } from '../../src/stores/plugins';

// Mock API adapter
const mockAxios = new MockAdapter(axios);

// Create realistic mock components for upload and processing flow
const createUploadMockComponent = () => ({
  name: 'UploadView',
  template: `
    <div class="upload-view" data-testid="upload-view">
      <div class="upload-header">
        <h1>Upload Receipt</h1>
        <div class="upload-status" :class="uploadStatus" data-testid="upload-status">
          {{ uploadStatusText }}
        </div>
      </div>

      <!-- File Upload Area -->
      <div
        class="upload-dropzone"
        :class="{ 'drag-over': isDragOver, 'uploading': isUploading }"
        @drop="handleDrop"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        data-testid="upload-dropzone"
      >
        <input
          type="file"
          ref="fileInput"
          @change="handleFileSelect"
          accept=".jpg,.jpeg,.png,.pdf"
          multiple
          data-testid="file-input"
        />
        <div class="upload-prompt">
          <p v-if="!isUploading">Drop files here or click to browse</p>
          <p v-else>Uploading {{ uploadProgress }}%</p>
        </div>
      </div>

      <!-- Plugin Selection -->
      <div class="plugin-selection" v-if="availablePlugins.length > 0" data-testid="plugin-selection">
        <h3>Processing Plugins</h3>
        <div class="plugin-list">
          <div
            v-for="plugin in availablePlugins"
            :key="plugin.id"
            class="plugin-item"
            :class="{ 'selected': selectedPlugins.includes(plugin.id) }"
            @click="togglePlugin(plugin.id)"
            :data-testid="'plugin-' + plugin.id"
          >
            <div class="plugin-info">
              <h4>{{ plugin.name }}</h4>
              <p>{{ plugin.description }}</p>
            </div>
            <div class="plugin-status">
              <span v-if="plugin.isActive" class="status-active">Active</span>
              <span v-else class="status-inactive">Inactive</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Upload Queue -->
      <div class="upload-queue" v-if="uploadQueue.length > 0" data-testid="upload-queue">
        <h3>Upload Queue</h3>
        <div
          v-for="(item, index) in uploadQueue"
          :key="index"
          class="queue-item"
          :data-testid="'queue-item-' + index"
        >
          <div class="file-info">
            <span class="file-name">{{ item.file.name }}</span>
            <span class="file-size">{{ formatFileSize(item.file.size) }}</span>
          </div>
          <div class="processing-status">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: item.progress + '%' }"></div>
            </div>
            <span class="status-text">{{ item.status }}</span>
          </div>
          <button
            @click="removeFromQueue(index)"
            class="remove-btn"
            :data-testid="'remove-' + index"
            :disabled="item.status === 'processing'"
          >
            Remove
          </button>
        </div>
      </div>

      <!-- Processing Results -->
      <div class="processing-results" v-if="processingResults.length > 0" data-testid="processing-results">
        <h3>Processing Results</h3>
        <div
          v-for="(result, index) in processingResults"
          :key="index"
          class="result-item"
          :class="result.status"
          :data-testid="'result-' + index"
        >
          <div class="result-header">
            <span class="file-name">{{ result.fileName }}</span>
            <span class="result-status">{{ result.status }}</span>
          </div>

          <div v-if="result.status === 'success'" class="result-data">
            <div class="extracted-data">
              <h4>Extracted Data</h4>
              <div class="data-grid">
                <div class="data-item">
                  <label>Store:</label>
                  <span>{{ result.data.storeName || 'Not detected' }}</span>
                </div>
                <div class="data-item">
                  <label>Date:</label>
                  <span>{{ result.data.date || 'Not detected' }}</span>
                </div>
                <div class="data-item">
                  <label>Total:</label>
                  <span>{{ result.data.total || 'Not detected' }}</span>
                </div>
                <div class="data-item">
                  <label>Items:</label>
                  <span>{{ result.data.items?.length || 0 }} items</span>
                </div>
              </div>
            </div>

            <div class="plugin-results" v-if="result.pluginResults?.length > 0">
              <h4>Plugin Processing</h4>
              <div
                v-for="pluginResult in result.pluginResults"
                :key="pluginResult.pluginId"
                class="plugin-result"
              >
                <div class="plugin-name">{{ pluginResult.pluginName }}</div>
                <div class="plugin-status" :class="pluginResult.status">
                  {{ pluginResult.status }}
                </div>
                <div v-if="pluginResult.data" class="plugin-data">
                  {{ JSON.stringify(pluginResult.data, null, 2) }}
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="result.status === 'error'" class="error-details">
            <h4>Error Details</h4>
            <p>{{ result.error.message }}</p>
            <button
              @click="retryProcessing(result.fileName)"
              class="retry-btn"
              :data-testid="'retry-' + index"
            >
              Retry
            </button>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="upload-actions" data-testid="upload-actions">
        <button
          @click="startProcessing"
          :disabled="uploadQueue.length === 0 || isProcessing"
          class="process-btn"
          data-testid="process-btn"
        >
          {{ isProcessing ? 'Processing...' : 'Start Processing' }}
        </button>

        <button
          @click="clearQueue"
          :disabled="isProcessing"
          class="clear-btn"
          data-testid="clear-btn"
        >
          Clear Queue
        </button>

        <button
          @click="saveAllResults"
          :disabled="processingResults.filter(r => r.status === 'success').length === 0"
          class="save-btn"
          data-testid="save-btn"
        >
          Save All Results
        </button>
      </div>
    </div>
  `,
  setup() {
    const authStore = useAuthStore();
    const receiptsStore = useReceiptsStore();
    const pluginStore = usePluginStore();

    // Reactive state
    const isDragOver = ref(false);
    const isUploading = ref(false);
    const isProcessing = ref(false);
    const uploadProgress = ref(0);
    const uploadStatus = ref('idle');
    const selectedPlugins = ref<string[]>([]);
    const uploadQueue = ref<any[]>([]);
    const processingResults = ref<any[]>([]);

    // Computed
    const uploadStatusText = computed(() => {
      switch (uploadStatus.value) {
        case 'idle': return 'Ready to upload';
        case 'uploading': return 'Uploading files...';
        case 'processing': return 'Processing receipts...';
        case 'complete': return 'Processing complete';
        case 'error': return 'Upload failed';
        default: return 'Ready';
      }
    });

    const availablePlugins = computed(() => pluginStore.plugins || []);

    // Methods
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      isDragOver.value = true;
    };

    const handleDragLeave = () => {
      isDragOver.value = false;
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      isDragOver.value = false;
      const files = Array.from(e.dataTransfer?.files || []);
      addFilesToQueue(files);
    };

    const handleFileSelect = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = Array.from(target.files || []);
      addFilesToQueue(files);
    };

    const addFilesToQueue = (files: File[]) => {
      const validFiles = files.filter(file => {
        const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        return validTypes.includes(file.type) && file.size <= maxSize;
      });

      const queueItems = validFiles.map(file => ({
        file,
        progress: 0,
        status: 'pending'
      }));

      uploadQueue.value.push(...queueItems);
    };

    const togglePlugin = (pluginId: string) => {
      const index = selectedPlugins.value.indexOf(pluginId);
      if (index > -1) {
        selectedPlugins.value.splice(index, 1);
      } else {
        selectedPlugins.value.push(pluginId);
      }
    };

    const removeFromQueue = (index: number) => {
      uploadQueue.value.splice(index, 1);
    };

    const clearQueue = () => {
      uploadQueue.value = [];
      processingResults.value = [];
    };

    const startProcessing = async () => {
      if (uploadQueue.value.length === 0) return;

      isProcessing.value = true;
      uploadStatus.value = 'processing';

      try {
        for (let i = 0; i < uploadQueue.value.length; i++) {
          const item = uploadQueue.value[i];
          item.status = 'uploading';

          // Simulate upload progress
          for (let progress = 0; progress <= 100; progress += 10) {
            item.progress = progress;
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          item.status = 'processing';

          // Process file
          const result = await processFile(item.file);
          processingResults.value.push(result);

          item.status = 'complete';
        }

        uploadStatus.value = 'complete';
      } catch (error) {
        uploadStatus.value = 'error';
        console.error('Processing failed:', error);
      } finally {
        isProcessing.value = false;
      }
    };

    const processFile = async (file: File): Promise<any> => {
      // Simulate API call for file processing
      const formData = new FormData();
      formData.append('file', file);
      formData.append('plugins', JSON.stringify(selectedPlugins.value));

      try {
        const response = await axios.post('/api/receipts/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        return {
          fileName: file.name,
          status: 'success',
          data: response.data.extractedData,
          pluginResults: response.data.pluginResults
        };
      } catch (error: any) {
        return {
          fileName: file.name,
          status: 'error',
          error: { message: error.message || 'Processing failed' }
        };
      }
    };

    const retryProcessing = async (fileName: string) => {
      const file = uploadQueue.value.find(item => item.file.name === fileName)?.file;
      if (file) {
        const result = await processFile(file);
        const index = processingResults.value.findIndex(r => r.fileName === fileName);
        if (index > -1) {
          processingResults.value[index] = result;
        }
      }
    };

    const saveAllResults = async () => {
      const successResults = processingResults.value.filter(r => r.status === 'success');
      try {
        await receiptsStore.saveProcessedReceipts(successResults);
        // Clear successful results from queue
        uploadQueue.value = uploadQueue.value.filter(item =>
          !successResults.some(result => result.fileName === item.file.name)
        );
        processingResults.value = processingResults.value.filter(r => r.status !== 'success');
      } catch (error) {
        console.error('Failed to save results:', error);
      }
    };

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Initialize plugins on mount
    onMounted(async () => {
      await pluginStore.loadPlugins();
    });

    return {
      isDragOver,
      isUploading,
      isProcessing,
      uploadProgress,
      uploadStatus,
      uploadStatusText,
      selectedPlugins,
      uploadQueue,
      processingResults,
      availablePlugins,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleFileSelect,
      togglePlugin,
      removeFromQueue,
      clearQueue,
      startProcessing,
      retryProcessing,
      saveAllResults,
      formatFileSize
    };
  }
});

// Main test app component
const createTestApp = () => ({
  name: 'TestApp',
  template: `
    <div class="test-app">
      <router-view />
    </div>
  `,
  setup() {
    const authStore = useAuthStore();

    onMounted(() => {
      // Simulate authenticated user
      authStore.setUser({
        id: 'test-user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isVerified: true
      });
    });

    return {};
  }
});

categorizedDescribe('Receipt Upload and Processing Flow Integration Tests', CategoryCombos.INTEGRATION_VIEW, () => {
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
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/upload', component: createUploadMockComponent() },
        { path: '/receipts', component: { template: '<div>Receipts</div>' } }
      ]
    });

    // Setup i18n
    i18n = createI18n({
      locale: 'en',
      messages: {
        en: {
          upload: {
            title: 'Upload Receipt',
            dropzone: 'Drop files here or click to browse'
          }
        }
      }
    });

    // Setup API mocks
    mockAxios.reset();

    // Mock plugin loading
    mockAxios.onGet('/api/plugins').reply(200, {
      plugins: [
        {
          id: 'ocr-plugin',
          name: 'OCR Plugin',
          description: 'Extract text from images',
          isActive: true
        },
        {
          id: 'category-plugin',
          name: 'Category Plugin',
          description: 'Categorize receipt items',
          isActive: true
        },
        {
          id: 'merchant-plugin',
          name: 'Merchant Plugin',
          description: 'Identify merchant information',
          isActive: false
        }
      ]
    });

    // Mock successful upload and processing
    mockAxios.onPost('/api/receipts/upload').reply(200, {
      success: true,
      extractedData: {
        storeName: 'Test Store',
        date: '2024-01-15',
        total: '$25.99',
        items: [
          { name: 'Item 1', price: '$10.99', category: 'Food' },
          { name: 'Item 2', price: '$15.00', category: 'Household' }
        ]
      },
      pluginResults: [
        {
          pluginId: 'ocr-plugin',
          pluginName: 'OCR Plugin',
          status: 'success',
          data: { confidence: 0.95, textBlocks: 15 }
        },
        {
          pluginId: 'category-plugin',
          pluginName: 'Category Plugin',
          status: 'success',
          data: { categorizedItems: 2, confidence: 0.88 }
        }
      ]
    });

    // Mock save processed receipts
    mockAxios.onPost('/api/receipts/batch').reply(200, {
      success: true,
      saved: 1,
      receipts: [{ id: 'receipt-123', status: 'processed' }]
    });

    await router.push('/upload');
    await router.isReady();
  });

  afterEach(() => {
    wrapper?.unmount();
    mockAxios.reset();
    vi.clearAllMocks();
  });

  categorizedIt('should complete full upload to processing workflow',
    [TestCategory.INTEGRATION, TestCategory.CRITICAL],
    withPerformance(async () => {
      // Mount the test app
      wrapper = mount(createTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Verify upload view is rendered
      expect(wrapper.find('[data-testid="upload-view"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="upload-dropzone"]').exists()).toBe(true);

      // Verify plugins are loaded and displayed
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for plugin loading

      expect(wrapper.find('[data-testid="plugin-selection"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="plugin-ocr-plugin"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="plugin-category-plugin"]').exists()).toBe(true);

      // Select plugins for processing
      await wrapper.find('[data-testid="plugin-ocr-plugin"]').trigger('click');
      await wrapper.find('[data-testid="plugin-category-plugin"]').trigger('click');

      // Create test file
      const testFile = new File(['test receipt content'], 'test-receipt.jpg', {
        type: 'image/jpeg'
      });

      // Simulate file selection
      const fileInput = wrapper.find('[data-testid="file-input"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [testFile],
        writable: false
      });
      await fileInput.trigger('change');
      await wrapper.vm.$nextTick();

      // Verify file is added to queue
      expect(wrapper.find('[data-testid="upload-queue"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="queue-item-0"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('test-receipt.jpg');

      // Start processing
      const processBtn = wrapper.find('[data-testid="process-btn"]');
      expect(processBtn.exists()).toBe(true);
      expect(processBtn.element.disabled).toBe(false);

      await processBtn.trigger('click');
      await wrapper.vm.$nextTick();

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      await wrapper.vm.$nextTick();

      // Verify processing results are displayed
      expect(wrapper.find('[data-testid="processing-results"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="result-0"]').exists()).toBe(true);

      // Verify extracted data is displayed
      const resultElement = wrapper.find('[data-testid="result-0"]');
      expect(resultElement.text()).toContain('Test Store');
      expect(resultElement.text()).toContain('$25.99');
      expect(resultElement.text()).toContain('2 items');

      // Verify plugin results are displayed
      expect(resultElement.text()).toContain('OCR Plugin');
      expect(resultElement.text()).toContain('Category Plugin');
      expect(resultElement.text()).toContain('success');

      // Save all results
      const saveBtn = wrapper.find('[data-testid="save-btn"]');
      expect(saveBtn.exists()).toBe(true);
      expect(saveBtn.element.disabled).toBe(false);

      await saveBtn.trigger('click');
      await wrapper.vm.$nextTick();

      // Verify API calls were made correctly
      expect(mockAxios.history.post).toHaveLength(2);
      expect(mockAxios.history.post[0].url).toBe('/api/receipts/upload');
      expect(mockAxios.history.post[1].url).toBe('/api/receipts/batch');
    }, 5000, TestCategory.MEDIUM)
  );

  categorizedIt('should handle file validation and errors',
    [TestCategory.INTEGRATION, TestCategory.ERROR_HANDLING],
    withPerformance(async () => {
      wrapper = mount(createTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Test invalid file type
      const invalidFile = new File(['test content'], 'test.txt', {
        type: 'text/plain'
      });

      const fileInput = wrapper.find('[data-testid="file-input"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [invalidFile],
        writable: false
      });
      await fileInput.trigger('change');
      await wrapper.vm.$nextTick();

      // Verify invalid file is not added to queue
      expect(wrapper.find('[data-testid="upload-queue"]').exists()).toBe(false);

      // Test file size limit
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg'
      });

      Object.defineProperty(fileInput.element, 'files', {
        value: [largeFile],
        writable: false
      });
      await fileInput.trigger('change');
      await wrapper.vm.$nextTick();

      // Verify large file is not added to queue
      expect(wrapper.find('[data-testid="upload-queue"]').exists()).toBe(false);
    }, 2000, TestCategory.FAST)
  );

  categorizedIt('should handle processing errors and retry functionality',
    [TestCategory.INTEGRATION, TestCategory.ERROR_HANDLING],
    withPerformance(async () => {
      // Mock failed upload
      mockAxios.onPost('/api/receipts/upload').reply(500, {
        error: 'Processing failed: Invalid file format'
      });

      wrapper = mount(createTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Add valid file
      const testFile = new File(['test content'], 'test.jpg', {
        type: 'image/jpeg'
      });

      const fileInput = wrapper.find('[data-testid="file-input"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [testFile],
        writable: false
      });
      await fileInput.trigger('change');
      await wrapper.vm.$nextTick();

      // Start processing
      await wrapper.find('[data-testid="process-btn"]').trigger('click');
      await wrapper.vm.$nextTick();

      // Wait for processing to complete with error
      await new Promise(resolve => setTimeout(resolve, 1000));
      await wrapper.vm.$nextTick();

      // Verify error result is displayed
      expect(wrapper.find('[data-testid="processing-results"]').exists()).toBe(true);
      const resultElement = wrapper.find('[data-testid="result-0"]');
      expect(resultElement.classes()).toContain('error');
      expect(resultElement.text()).toContain('Error Details');

      // Test retry functionality
      mockAxios.reset();
      mockAxios.onPost('/api/receipts/upload').reply(200, {
        success: true,
        extractedData: { storeName: 'Retry Store', total: '$10.00' },
        pluginResults: []
      });

      const retryBtn = wrapper.find('[data-testid="retry-0"]');
      expect(retryBtn.exists()).toBe(true);
      await retryBtn.trigger('click');
      await wrapper.vm.$nextTick();

      // Wait for retry to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      await wrapper.vm.$nextTick();

      // Verify success result after retry
      expect(resultElement.classes()).toContain('success');
      expect(resultElement.text()).toContain('Retry Store');
    }, 3000, TestCategory.MEDIUM)
  );

  categorizedIt('should handle drag and drop file upload',
    [TestCategory.INTEGRATION, TestCategory.USER_INTERACTION],
    withPerformance(async () => {
      wrapper = mount(createTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      const dropzone = wrapper.find('[data-testid="upload-dropzone"]');

      // Test drag over
      await dropzone.trigger('dragover');
      expect(dropzone.classes()).toContain('drag-over');

      // Test drag leave
      await dropzone.trigger('dragleave');
      expect(dropzone.classes()).not.toContain('drag-over');

      // Test file drop
      const testFile = new File(['test content'], 'dropped.png', {
        type: 'image/png'
      });

      const dropEvent = new Event('drop') as any;
      dropEvent.dataTransfer = {
        files: [testFile]
      };

      await dropzone.trigger('drop', dropEvent);
      await wrapper.vm.$nextTick();

      // Verify file is added to queue
      expect(wrapper.find('[data-testid="upload-queue"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('dropped.png');
    }, 1000, TestCategory.FAST)
  );

  categorizedIt('should manage upload queue operations',
    [TestCategory.INTEGRATION, TestCategory.QUEUE_MANAGEMENT],
    withPerformance(async () => {
      wrapper = mount(createTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Add multiple files
      const file1 = new File(['content1'], 'file1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['content2'], 'file2.png', { type: 'image/png' });

      const fileInput = wrapper.find('[data-testid="file-input"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [file1, file2],
        writable: false
      });
      await fileInput.trigger('change');
      await wrapper.vm.$nextTick();

      // Verify both files are in queue
      expect(wrapper.find('[data-testid="queue-item-0"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="queue-item-1"]').exists()).toBe(true);

      // Remove one file from queue
      await wrapper.find('[data-testid="remove-1"]').trigger('click');
      await wrapper.vm.$nextTick();

      // Verify file is removed
      expect(wrapper.find('[data-testid="queue-item-1"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="queue-item-0"]').exists()).toBe(true);

      // Clear entire queue
      await wrapper.find('[data-testid="clear-btn"]').trigger('click');
      await wrapper.vm.$nextTick();

      // Verify queue is empty
      expect(wrapper.find('[data-testid="upload-queue"]').exists()).toBe(false);
    }, 1500, TestCategory.FAST)
  );

  categorizedIt('should integrate with plugin system correctly',
    [TestCategory.INTEGRATION, TestCategory.PLUGINS],
    withPerformance(async () => {
      wrapper = mount(createTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for plugin loading

      // Verify plugins are loaded
      expect(wrapper.find('[data-testid="plugin-selection"]').exists()).toBe(true);

      // Test plugin selection
      const ocrPlugin = wrapper.find('[data-testid="plugin-ocr-plugin"]');
      const categoryPlugin = wrapper.find('[data-testid="plugin-category-plugin"]');
      const merchantPlugin = wrapper.find('[data-testid="plugin-merchant-plugin"]');

      expect(ocrPlugin.exists()).toBe(true);
      expect(categoryPlugin.exists()).toBe(true);
      expect(merchantPlugin.exists()).toBe(true);

      // Verify plugin status display
      expect(ocrPlugin.text()).toContain('Active');
      expect(categoryPlugin.text()).toContain('Active');
      expect(merchantPlugin.text()).toContain('Inactive');

      // Select plugins
      await ocrPlugin.trigger('click');
      await categoryPlugin.trigger('click');

      expect(ocrPlugin.classes()).toContain('selected');
      expect(categoryPlugin.classes()).toContain('selected');

      // Add file and process with selected plugins
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = wrapper.find('[data-testid="file-input"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [testFile],
        writable: false
      });
      await fileInput.trigger('change');
      await wrapper.find('[data-testid="process-btn"]').trigger('click');
      await wrapper.vm.$nextTick();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      await wrapper.vm.$nextTick();

      // Verify plugin results are shown
      const results = wrapper.find('[data-testid="processing-results"]');
      expect(results.text()).toContain('OCR Plugin');
      expect(results.text()).toContain('Category Plugin');
      expect(results.text()).not.toContain('Merchant Plugin'); // Not selected
    }, 3000, TestCategory.MEDIUM)
  );
});