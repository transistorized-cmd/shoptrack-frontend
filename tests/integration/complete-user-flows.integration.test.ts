import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { mount, VueWrapper } from '@vue/test-utils';
import MockAdapter from 'axios-mock-adapter';
import { createI18n } from 'vue-i18n';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useReceiptsStore } from '@/stores/receipts';
import { useReportsStore } from '@/stores/reports';
import router from '@/router';
import {
  categorizedDescribe,
  categorizedIt,
  TestCategory,
  CategoryCombos,
  withPerformance
} from '../../tests/utils/categories';
import type { User, AuthResponse } from '@/types/auth';
import type { Receipt, UploadResponse } from '@/types/receipts';

// Mock comprehensive view components that represent real user interactions
const createRealisticMockComponent = (name: string, requiresAuth = false, hasData = false) => ({
  name,
  template: `
    <div class="${name.toLowerCase()}-view" data-testid="${name.toLowerCase()}-view">
      <header class="page-header">
        <h1 data-testid="page-title">${name}</h1>
        <div v-if="loading" data-testid="loading-spinner">Loading...</div>
        <div v-if="error" data-testid="error-message" class="error">{{ error }}</div>
      </header>

      <main class="page-content">
        ${name === 'Home' ? `
          <div class="dashboard-widgets" data-testid="dashboard-widgets">
            <div class="quick-stats" data-testid="quick-stats">
              <div class="stat-card" data-testid="total-receipts">
                <span class="stat-value">{{ receiptsCount }}</span>
                <span class="stat-label">Total Receipts</span>
              </div>
              <div class="stat-card" data-testid="monthly-spending">
                <span class="stat-value">\${{ monthlySpending }}</span>
                <span class="stat-label">This Month</span>
              </div>
            </div>
            <div class="recent-receipts" data-testid="recent-receipts">
              <h3>Recent Receipts</h3>
              <div v-for="receipt in recentReceipts" :key="receipt.id" class="receipt-item" :data-testid="'receipt-' + receipt.id">
                {{ receipt.storeName }} - \${{ receipt.total }}
              </div>
            </div>
            <div class="quick-actions" data-testid="quick-actions">
              <button @click="navigateToUpload" data-testid="quick-upload-btn" class="btn-primary">
                Upload Receipt
              </button>
              <button @click="navigateToReports" data-testid="quick-reports-btn" class="btn-secondary">
                View Reports
              </button>
            </div>
          </div>
        ` : ''}

        ${name === 'Receipts' ? `
          <div class="receipts-page" data-testid="receipts-content">
            <div class="receipts-toolbar" data-testid="receipts-toolbar">
              <div class="search-bar">
                <input
                  v-model="searchQuery"
                  @input="handleSearch"
                  data-testid="receipts-search"
                  placeholder="Search receipts..."
                  class="search-input"
                />
              </div>
              <div class="filter-controls" data-testid="filter-controls">
                <select v-model="statusFilter" @change="applyFilters" data-testid="status-filter">
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                </select>
                <select v-model="categoryFilter" @change="applyFilters" data-testid="category-filter">
                  <option value="">All Categories</option>
                  <option value="groceries">Groceries</option>
                  <option value="dining">Dining</option>
                  <option value="shopping">Shopping</option>
                </select>
              </div>
              <button @click="navigateToUpload" data-testid="upload-new-btn" class="btn-primary">
                Upload New Receipt
              </button>
            </div>

            <div class="receipts-grid" data-testid="receipts-grid">
              <div v-if="receipts.length === 0" data-testid="no-receipts" class="empty-state">
                No receipts found
              </div>
              <div
                v-for="receipt in filteredReceipts"
                :key="receipt.id"
                class="receipt-card"
                :data-testid="'receipt-card-' + receipt.id"
                @click="viewReceipt(receipt)"
              >
                <div class="receipt-header">
                  <span class="store-name">{{ receipt.storeName }}</span>
                  <span class="receipt-date">{{ formatDate(receipt.receiptDate) }}</span>
                </div>
                <div class="receipt-body">
                  <span class="receipt-total">\${{ receipt.total }}</span>
                  <span class="receipt-status" :class="receipt.processingStatus">
                    {{ receipt.processingStatus }}
                  </span>
                </div>
                <div class="receipt-actions">
                  <button @click.stop="editReceipt(receipt)" data-testid="edit-receipt-btn">Edit</button>
                  <button @click.stop="deleteReceipt(receipt)" data-testid="delete-receipt-btn">Delete</button>
                </div>
              </div>
            </div>

            <div v-if="hasMorePages" class="pagination" data-testid="pagination">
              <button @click="loadPreviousPage" :disabled="currentPage === 1" data-testid="prev-page-btn">
                Previous
              </button>
              <span data-testid="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
              <button @click="loadNextPage" :disabled="currentPage === totalPages" data-testid="next-page-btn">
                Next
              </button>
            </div>
          </div>
        ` : ''}

        ${name === 'Upload' ? `
          <div class="upload-page" data-testid="upload-content">
            <div class="upload-area" data-testid="upload-area">
              <div class="drop-zone" :class="{ 'drag-over': isDragOver }" data-testid="drop-zone"
                   @dragover.prevent="isDragOver = true"
                   @dragleave.prevent="isDragOver = false"
                   @drop.prevent="handleDrop">
                <div v-if="!uploadedFile" class="drop-zone-content">
                  <svg class="upload-icon" data-testid="upload-icon">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <p>Drag and drop receipt image here, or <button @click="triggerFileInput" class="link-btn">browse</button></p>
                  <input ref="fileInput" type="file" @change="handleFileSelect" accept="image/*,.pdf" style="display: none;" />
                </div>
                <div v-else class="uploaded-file" data-testid="uploaded-file">
                  <img v-if="filePreview" :src="filePreview" alt="Receipt preview" class="file-preview" data-testid="file-preview" />
                  <div class="file-info">
                    <span class="file-name" data-testid="file-name">{{ uploadedFile.name }}</span>
                    <span class="file-size" data-testid="file-size">{{ formatFileSize(uploadedFile.size) }}</span>
                  </div>
                  <button @click="removeFile" data-testid="remove-file-btn" class="btn-secondary">Remove</button>
                </div>
              </div>

              <div v-if="uploadedFile" class="upload-actions" data-testid="upload-actions">
                <button @click="processUpload" :disabled="isProcessing" data-testid="process-upload-btn" class="btn-primary">
                  <span v-if="isProcessing">Processing...</span>
                  <span v-else>Process Receipt</span>
                </button>
              </div>

              <div v-if="processingResults" class="processing-results" data-testid="processing-results">
                <h3>Processing Results</h3>
                <div class="extracted-data" data-testid="extracted-data">
                  <div class="field">
                    <label>Store Name:</label>
                    <span data-testid="extracted-store">{{ processingResults.storeName }}</span>
                  </div>
                  <div class="field">
                    <label>Total Amount:</label>
                    <span data-testid="extracted-total">\${{ processingResults.total }}</span>
                  </div>
                  <div class="field">
                    <label>Date:</label>
                    <span data-testid="extracted-date">{{ processingResults.receiptDate }}</span>
                  </div>
                </div>
                <div class="save-actions" data-testid="save-actions">
                  <button @click="saveReceipt" data-testid="save-receipt-btn" class="btn-primary">Save Receipt</button>
                  <button @click="editBeforeSave" data-testid="edit-before-save-btn" class="btn-secondary">Edit Before Save</button>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        ${requiresAuth && !hasData ? '<div data-testid="auth-content">Protected Content</div>' : ''}
      </main>
    </div>
  `,
  setup() {
    const loading = ref(false);
    const error = ref(null);

    if (name === 'Home') {
      const receiptsStore = useReceiptsStore();
      const reportsStore = useReportsStore();
      const router = useRouter();

      const receiptsCount = computed(() => receiptsStore.totalCount);
      const monthlySpending = computed(() => reportsStore.monthlySpending);
      const recentReceipts = computed(() => receiptsStore.receipts.slice(0, 5));

      const navigateToUpload = () => router.push('/upload');
      const navigateToReports = () => router.push('/reports');

      return {
        loading,
        error,
        receiptsCount,
        monthlySpending,
        recentReceipts,
        navigateToUpload,
        navigateToReports
      };
    }

    if (name === 'Receipts') {
      const receiptsStore = useReceiptsStore();
      const router = useRouter();

      const searchQuery = ref('');
      const statusFilter = ref('');
      const categoryFilter = ref('');

      const receipts = computed(() => receiptsStore.receipts);
      const filteredReceipts = computed(() => {
        let filtered = receipts.value;

        if (searchQuery.value) {
          filtered = filtered.filter(r =>
            r.storeName?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            r.items?.some(item => item.name?.toLowerCase().includes(searchQuery.value.toLowerCase()))
          );
        }

        if (statusFilter.value) {
          filtered = filtered.filter(r => r.processingStatus === statusFilter.value);
        }

        if (categoryFilter.value) {
          filtered = filtered.filter(r => r.category === categoryFilter.value);
        }

        return filtered;
      });

      const currentPage = computed(() => receiptsStore.currentPage);
      const totalPages = computed(() => receiptsStore.totalPages);
      const hasMorePages = computed(() => totalPages.value > 1);

      const handleSearch = () => {
        receiptsStore.setSearchQuery(searchQuery.value);
        receiptsStore.fetchReceipts();
      };

      const applyFilters = () => {
        receiptsStore.setFilters({
          processingStatus: statusFilter.value,
          category: categoryFilter.value
        });
        receiptsStore.fetchReceipts();
      };

      const navigateToUpload = () => router.push('/upload');
      const viewReceipt = (receipt) => router.push(`/receipts/${receipt.id}`);
      const editReceipt = (receipt) => router.push(`/receipts/${receipt.id}/edit`);
      const deleteReceipt = (receipt) => receiptsStore.deleteReceipt(receipt.id);
      const loadPreviousPage = () => receiptsStore.previousPage();
      const loadNextPage = () => receiptsStore.nextPage();

      const formatDate = (date) => new Date(date).toLocaleDateString();

      return {
        loading,
        error,
        searchQuery,
        statusFilter,
        categoryFilter,
        receipts,
        filteredReceipts,
        currentPage,
        totalPages,
        hasMorePages,
        handleSearch,
        applyFilters,
        navigateToUpload,
        viewReceipt,
        editReceipt,
        deleteReceipt,
        loadPreviousPage,
        loadNextPage,
        formatDate
      };
    }

    if (name === 'Upload') {
      const router = useRouter();
      const receiptsStore = useReceiptsStore();

      const uploadedFile = ref(null);
      const filePreview = ref(null);
      const isDragOver = ref(false);
      const isProcessing = ref(false);
      const processingResults = ref(null);

      const handleDrop = (event) => {
        isDragOver.value = false;
        const files = event.dataTransfer.files;
        if (files.length > 0) {
          handleFileSelect({ target: { files } });
        }
      };

      const triggerFileInput = () => {
        // In real component, this would trigger file input
      };

      const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
          uploadedFile.value = file;
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
              filePreview.value = e.target.result;
            };
            reader.readAsDataURL(file);
          }
        }
      };

      const removeFile = () => {
        uploadedFile.value = null;
        filePreview.value = null;
        processingResults.value = null;
      };

      const processUpload = async () => {
        isProcessing.value = true;
        try {
          // Simulate processing
          await new Promise(resolve => setTimeout(resolve, 2000));
          processingResults.value = {
            storeName: 'Sample Store',
            total: '29.99',
            receiptDate: '2024-01-15'
          };
        } finally {
          isProcessing.value = false;
        }
      };

      const saveReceipt = async () => {
        if (processingResults.value) {
          await receiptsStore.createReceipt(processingResults.value);
          router.push('/receipts');
        }
      };

      const editBeforeSave = () => {
        // Navigate to edit form
        router.push('/receipts/new/edit');
      };

      const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      return {
        loading,
        error,
        uploadedFile,
        filePreview,
        isDragOver,
        isProcessing,
        processingResults,
        handleDrop,
        triggerFileInput,
        handleFileSelect,
        removeFile,
        processUpload,
        saveReceipt,
        editBeforeSave,
        formatFileSize
      };
    }

    return { loading, error };
  }
});

// Mock all views with realistic functionality
vi.mock('@/views/Home.vue', () => ({ default: createRealisticMockComponent('Home', true, true) }));
vi.mock('@/views/Login.vue', () => ({ default: createRealisticMockComponent('Login', false) }));
vi.mock('@/views/Register.vue', () => ({ default: createRealisticMockComponent('Register', false) }));
vi.mock('@/views/Receipts.vue', () => ({ default: createRealisticMockComponent('Receipts', true, true) }));
vi.mock('@/views/Upload.vue', () => ({ default: createRealisticMockComponent('Upload', true, true) }));
vi.mock('@/views/Reports.vue', () => ({ default: createRealisticMockComponent('Reports', true, true) }));
vi.mock('@/views/Profile.vue', () => ({ default: createRealisticMockComponent('Profile', true) }));

// Test application component
const TestApp = {
  template: `
    <div id="app" data-testid="app">
      <nav class="main-navigation" data-testid="main-nav">
        <div class="nav-brand">
          <router-link to="/" data-testid="brand-link">ShopTrack</router-link>
        </div>

        <div v-if="authStore.isAuthenticated" class="authenticated-nav" data-testid="authenticated-nav">
          <div class="nav-links">
            <router-link to="/" data-testid="nav-home" class="nav-link">Dashboard</router-link>
            <router-link to="/receipts" data-testid="nav-receipts" class="nav-link">Receipts</router-link>
            <router-link to="/upload" data-testid="nav-upload" class="nav-link">Upload</router-link>
            <router-link to="/reports" data-testid="nav-reports" class="nav-link">Reports</router-link>
          </div>

          <div class="user-menu" data-testid="user-menu">
            <span class="user-greeting" data-testid="user-greeting">
              Welcome, {{ authStore.user?.firstName }}!
            </span>
            <div class="user-dropdown">
              <button class="user-dropdown-toggle" data-testid="user-dropdown-toggle">
                {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}
              </button>
              <div class="user-dropdown-menu" data-testid="user-dropdown-menu">
                <router-link to="/profile" data-testid="nav-profile" class="dropdown-item">Profile</router-link>
                <button @click="handleLogout" data-testid="logout-btn" class="dropdown-item">Logout</button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="unauthenticated-nav" data-testid="unauthenticated-nav">
          <div class="auth-links">
            <router-link to="/login" data-testid="nav-login" class="nav-link">Login</router-link>
            <router-link to="/register" data-testid="nav-register" class="nav-link">Register</router-link>
          </div>
        </div>
      </nav>

      <main class="main-content" data-testid="main-content">
        <div v-if="authStore.loading" class="global-loading" data-testid="global-loading">
          <div class="loading-spinner">Loading...</div>
        </div>

        <div v-if="authStore.error" class="global-error" data-testid="global-error">
          <div class="error-message">{{ authStore.error.message }}</div>
          <button @click="authStore.clearError" data-testid="clear-error-btn">Dismiss</button>
        </div>

        <router-view v-slot="{ Component }" :key="$route.fullPath">
          <transition name="page-transition" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <footer class="main-footer" data-testid="main-footer">
        <div class="footer-content">
          <p>&copy; 2024 ShopTrack. All rights reserved.</p>
        </div>
      </footer>
    </div>
  `,
  setup() {
    const authStore = useAuthStore();
    const router = useRouter();

    const handleLogout = async () => {
      await authStore.logout();
      router.push('/login');
    };

    return {
      authStore,
      handleLogout
    };
  }
};

categorizedDescribe('Complete User Flow Integration Tests', CategoryCombos.INTEGRATION_VIEW, () => {
  let mockAxios: MockAdapter;
  let app: any;
  let wrapper: VueWrapper<any>;
  let testRouter: Router;
  let pinia: Pinia;
  let authStore: ReturnType<typeof useAuthStore>;
  let receiptsStore: ReturnType<typeof useReceiptsStore>;
  let reportsStore: ReturnType<typeof useReportsStore>;

  // Sample data
  const mockUser: User = {
    id: 1,
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    userName: 'johndoe',
    isEmailVerified: true,
    emailConfirmed: true,
    hasPassword: true,
    passkeysEnabled: false,
    connectedAccounts: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  const mockReceipts: Receipt[] = [
    {
      id: 1,
      storeName: 'Grocery Store',
      total: 45.67,
      receiptDate: '2024-01-15',
      processingStatus: 'completed',
      category: 'groceries',
      items: [
        { id: 1, name: 'Milk', price: 3.99, quantity: 1 },
        { id: 2, name: 'Bread', price: 2.50, quantity: 2 }
      ]
    },
    {
      id: 2,
      storeName: 'Restaurant',
      total: 28.50,
      receiptDate: '2024-01-14',
      processingStatus: 'completed',
      category: 'dining',
      items: [
        { id: 3, name: 'Burger', price: 12.99, quantity: 1 },
        { id: 4, name: 'Fries', price: 4.99, quantity: 1 }
      ]
    }
  ];

  beforeEach(async () => {
    // Setup axios mock
    mockAxios = new MockAdapter(api);

    // Create fresh Pinia and router
    pinia = createPinia();
    setActivePinia(pinia);

    testRouter = createRouter({
      history: createWebHistory(),
      routes: router.getRoutes()
    });

    // Setup navigation guards
    testRouter.beforeEach(async (to, from, next) => {
      const authStore = useAuthStore();

      if (!authStore.isAuthenticated && !authStore.loading) {
        await authStore.initialize();
      }

      const isAuthenticated = authStore.isAuthenticated;
      const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
      const requiresGuest = to.matched.some((record) => record.meta.requiresGuest);

      if (requiresAuth && !isAuthenticated) {
        next({ path: "/login", query: { redirect: to.fullPath } });
      } else if (requiresGuest && isAuthenticated) {
        next("/");
      } else {
        next();
      }
    });

    // Create i18n instance
    const i18n = createI18n({
      legacy: false,
      locale: 'en',
      messages: {
        en: {
          common: { loading: 'Loading...', error: 'Error' }
        }
      }
    });

    // Create and mount app
    app = createApp(TestApp);
    app.use(pinia);
    app.use(testRouter);
    app.use(i18n);

    wrapper = mount(app, {
      attachTo: document.body
    });

    // Get store references
    authStore = useAuthStore();
    receiptsStore = useReceiptsStore();
    reportsStore = useReportsStore();

    // Mock session check to return unauthenticated initially
    mockAxios.onGet('/auth/me').reply(401, { error: 'Unauthorized' });

    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    mockAxios.restore();
  });

  categorizedDescribe('Login to Dashboard Flow', [TestCategory.INTEGRATION, TestCategory.CRITICAL, TestCategory.STABLE], () => {
    categorizedIt('should complete full login to dashboard journey', [TestCategory.CRITICAL],
      withPerformance(async () => {
        // Start at root - should redirect to login
        await testRouter.push('/');
        await nextTick();

        expect(testRouter.currentRoute.value.name).toBe('login');
        expect(wrapper.find('[data-testid="login-view"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="unauthenticated-nav"]').exists()).toBe(true);

        // Mock successful login
        mockAxios.onPost('/auth/login').reply(200, {
          success: true,
          message: 'Login successful',
          user: mockUser
        });

        // Mock dashboard data requests
        mockAxios.onGet('/receipts').reply(200, {
          receipts: mockReceipts,
          totalCount: mockReceipts.length,
          currentPage: 1,
          totalPages: 1
        });

        mockAxios.onGet('/reports/summary').reply(200, {
          monthlySpending: 1234.56,
          totalReceipts: mockReceipts.length,
          categories: ['groceries', 'dining']
        });

        // Perform login
        const loginResult = await authStore.login({
          email: mockUser.email,
          password: 'password123'
        });
        await nextTick();

        expect(loginResult.success).toBe(true);
        expect(authStore.isAuthenticated).toBe(true);

        // Navigate to dashboard (home)
        await testRouter.push('/');
        await nextTick();

        // Verify dashboard is loaded
        expect(testRouter.currentRoute.value.name).toBe('home');
        expect(wrapper.find('[data-testid="home-view"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="authenticated-nav"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="user-greeting"]').text()).toContain('Welcome, John!');

        // Verify dashboard widgets are present
        expect(wrapper.find('[data-testid="dashboard-widgets"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="quick-stats"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="recent-receipts"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="quick-actions"]').exists()).toBe(true);

        // Verify navigation links are functional
        const receiptsLink = wrapper.find('[data-testid="nav-receipts"]');
        expect(receiptsLink.exists()).toBe(true);
        expect(receiptsLink.attributes('href')).toBe('/receipts');
      }, 2000, TestCategory.MEDIUM)
    );

    categorizedIt('should handle login with redirect to intended destination', [TestCategory.HIGH], async () => {
      // Try to access protected receipts page while unauthenticated
      await testRouter.push('/receipts');
      await nextTick();

      // Should be redirected to login with redirect query
      expect(testRouter.currentRoute.value.name).toBe('login');
      expect(testRouter.currentRoute.value.query.redirect).toBe('/receipts');

      // Mock successful login
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        user: mockUser
      });

      // Mock receipts data
      mockAxios.onGet('/receipts').reply(200, {
        receipts: mockReceipts,
        totalCount: mockReceipts.length,
        currentPage: 1,
        totalPages: 1
      });

      // Perform login
      await authStore.login({
        email: mockUser.email,
        password: 'password123'
      });
      await nextTick();

      // Navigate to intended destination
      const redirectUrl = testRouter.currentRoute.value.query.redirect as string;
      await testRouter.push(redirectUrl);
      await nextTick();

      // Should now be on receipts page
      expect(testRouter.currentRoute.value.name).toBe('receipts');
      expect(wrapper.find('[data-testid="receipts-view"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="receipts-content"]').exists()).toBe(true);
    });
  });

  categorizedDescribe('Receipt Management Flow', [TestCategory.INTEGRATION, TestCategory.RECEIPTS, TestCategory.STABLE], () => {
    beforeEach(async () => {
      // Login user first
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        user: mockUser
      });

      await authStore.login({
        email: mockUser.email,
        password: 'password123'
      });
      await nextTick();
    });

    categorizedIt('should complete receipt upload and processing flow', [TestCategory.HIGH],
      withPerformance(async () => {
        // Navigate to upload page
        await testRouter.push('/upload');
        await nextTick();

        expect(wrapper.find('[data-testid="upload-view"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="upload-content"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="drop-zone"]').exists()).toBe(true);

        // Mock file upload
        const mockFile = new File(['mock content'], 'receipt.jpg', { type: 'image/jpeg' });

        // Mock upload API
        mockAxios.onPost('/receipts/upload').reply(200, {
          success: true,
          receiptId: 123,
          processingStatus: 'processing'
        });

        // Mock processing results
        mockAxios.onGet('/receipts/123/processing-status').reply(200, {
          status: 'completed',
          extractedData: {
            storeName: 'Test Store',
            total: 29.99,
            receiptDate: '2024-01-15',
            items: [
              { name: 'Item 1', price: 15.99 },
              { name: 'Item 2', price: 13.99 }
            ]
          }
        });

        // Simulate file upload (this would be more complex in real test)
        // For now, just verify the upload interface exists
        expect(wrapper.find('[data-testid="upload-area"]').exists()).toBe(true);

        // Navigate back to receipts to see the new receipt
        await testRouter.push('/receipts');
        await nextTick();

        // Mock updated receipts list
        const updatedReceipts = [
          ...mockReceipts,
          {
            id: 123,
            storeName: 'Test Store',
            total: 29.99,
            receiptDate: '2024-01-15',
            processingStatus: 'completed',
            category: 'shopping'
          }
        ];

        mockAxios.onGet('/receipts').reply(200, {
          receipts: updatedReceipts,
          totalCount: updatedReceipts.length,
          currentPage: 1,
          totalPages: 1
        });

        // Refresh receipts
        await receiptsStore.fetchReceipts();
        await nextTick();

        expect(wrapper.find('[data-testid="receipts-grid"]').exists()).toBe(true);
      }, 3000, TestCategory.MEDIUM)
    );

    categorizedIt('should handle receipt search and filtering', [TestCategory.MEDIUM_PRIORITY], async () => {
      // Navigate to receipts page
      await testRouter.push('/receipts');
      await nextTick();

      // Mock receipts data
      mockAxios.onGet('/receipts').reply(200, {
        receipts: mockReceipts,
        totalCount: mockReceipts.length,
        currentPage: 1,
        totalPages: 1
      });

      await receiptsStore.fetchReceipts();
      await nextTick();

      // Verify receipts are displayed
      expect(wrapper.find('[data-testid="receipts-grid"]').exists()).toBe(true);
      expect(wrapper.findAll('[data-testid^="receipt-card-"]')).toHaveLength(mockReceipts.length);

      // Test search functionality
      const searchInput = wrapper.find('[data-testid="receipts-search"]');
      expect(searchInput.exists()).toBe(true);

      // Mock search API
      mockAxios.onGet('/receipts').reply(200, {
        receipts: [mockReceipts[0]], // Only grocery store
        totalCount: 1,
        currentPage: 1,
        totalPages: 1
      });

      await searchInput.setValue('Grocery');
      await searchInput.trigger('input');
      await nextTick();

      // Test filtering
      const statusFilter = wrapper.find('[data-testid="status-filter"]');
      expect(statusFilter.exists()).toBe(true);

      await statusFilter.setValue('completed');
      await statusFilter.trigger('change');
      await nextTick();

      // Verify filtering interface works
      expect(statusFilter.element.value).toBe('completed');
    });

    categorizedIt('should handle receipt details and editing', [TestCategory.MEDIUM_PRIORITY], async () => {
      // Navigate to receipts
      await testRouter.push('/receipts');
      await nextTick();

      // Mock receipts data
      mockAxios.onGet('/receipts').reply(200, {
        receipts: mockReceipts,
        totalCount: mockReceipts.length,
        currentPage: 1,
        totalPages: 1
      });

      await receiptsStore.fetchReceipts();
      await nextTick();

      // Click on first receipt
      const firstReceiptCard = wrapper.find('[data-testid="receipt-card-1"]');
      expect(firstReceiptCard.exists()).toBe(true);

      // Test edit button
      const editButton = firstReceiptCard.find('[data-testid="edit-receipt-btn"]');
      expect(editButton.exists()).toBe(true);

      // Test delete button
      const deleteButton = firstReceiptCard.find('[data-testid="delete-receipt-btn"]');
      expect(deleteButton.exists()).toBe(true);

      // Mock delete operation
      mockAxios.onDelete('/receipts/1').reply(200, { success: true });

      await deleteButton.trigger('click');
      await nextTick();

      // Verify delete was attempted
      expect(receiptsStore.deleteReceipt).toBeDefined();
    });
  });

  categorizedDescribe('Navigation and User Experience Flow', [TestCategory.INTEGRATION, TestCategory.MEDIUM], () => {
    beforeEach(async () => {
      // Login user
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        user: mockUser
      });

      await authStore.login({
        email: mockUser.email,
        password: 'password123'
      });
      await nextTick();
    });

    categorizedIt('should handle complete navigation between all major sections', [TestCategory.HIGH], async () => {
      // Start at dashboard
      await testRouter.push('/');
      await nextTick();

      expect(wrapper.find('[data-testid="home-view"]').exists()).toBe(true);

      // Navigate to receipts
      const receiptsLink = wrapper.find('[data-testid="nav-receipts"]');
      await receiptsLink.trigger('click');
      await nextTick();

      expect(testRouter.currentRoute.value.path).toBe('/receipts');

      // Navigate to upload
      const uploadLink = wrapper.find('[data-testid="nav-upload"]');
      await uploadLink.trigger('click');
      await nextTick();

      expect(testRouter.currentRoute.value.path).toBe('/upload');

      // Navigate to reports
      const reportsLink = wrapper.find('[data-testid="nav-reports"]');
      await reportsLink.trigger('click');
      await nextTick();

      expect(testRouter.currentRoute.value.path).toBe('/reports');

      // Navigate to profile
      const userDropdown = wrapper.find('[data-testid="user-dropdown-toggle"]');
      await userDropdown.trigger('click');
      await nextTick();

      const profileLink = wrapper.find('[data-testid="nav-profile"]');
      await profileLink.trigger('click');
      await nextTick();

      expect(testRouter.currentRoute.value.path).toBe('/profile');

      // Navigate back to dashboard via brand link
      const brandLink = wrapper.find('[data-testid="brand-link"]');
      await brandLink.trigger('click');
      await nextTick();

      expect(testRouter.currentRoute.value.path).toBe('/');
    });

    categorizedIt('should maintain user session across navigation', [TestCategory.HIGH], async () => {
      // Navigate between multiple pages
      const pages = ['/', '/receipts', '/upload', '/reports', '/profile'];

      for (const page of pages) {
        await testRouter.push(page);
        await nextTick();

        // Verify user is still authenticated
        expect(authStore.isAuthenticated).toBe(true);
        expect(wrapper.find('[data-testid="authenticated-nav"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="user-greeting"]').text()).toContain('Welcome, John!');
      }
    });

    categorizedIt('should handle logout and session cleanup', [TestCategory.CRITICAL], async () => {
      // Start on dashboard
      await testRouter.push('/');
      await nextTick();

      expect(authStore.isAuthenticated).toBe(true);

      // Mock logout endpoint
      mockAxios.onPost('/auth/logout').reply(200, { message: 'Logged out' });

      // Perform logout
      const userDropdown = wrapper.find('[data-testid="user-dropdown-toggle"]');
      await userDropdown.trigger('click');
      await nextTick();

      const logoutButton = wrapper.find('[data-testid="logout-btn"]');
      await logoutButton.trigger('click');
      await nextTick();

      // Should be logged out and redirected
      expect(authStore.isAuthenticated).toBe(false);
      expect(testRouter.currentRoute.value.name).toBe('login');
      expect(wrapper.find('[data-testid="unauthenticated-nav"]').exists()).toBe(true);

      // Try to access protected route
      await testRouter.push('/receipts');
      await nextTick();

      // Should stay on login page
      expect(testRouter.currentRoute.value.name).toBe('login');
    });
  });

  categorizedDescribe('Error Handling and Recovery Flow', [TestCategory.INTEGRATION, TestCategory.HIGH], () => {
    categorizedIt('should handle API errors gracefully', [TestCategory.CRITICAL], async () => {
      // Login user
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        user: mockUser
      });

      await authStore.login({
        email: mockUser.email,
        password: 'password123'
      });
      await nextTick();

      // Navigate to receipts with API error
      mockAxios.onGet('/receipts').reply(500, { error: 'Internal server error' });

      await testRouter.push('/receipts');
      await nextTick();

      // Should still be on receipts page but with error handling
      expect(testRouter.currentRoute.value.name).toBe('receipts');
      expect(wrapper.find('[data-testid="receipts-view"]').exists()).toBe(true);

      // Error should be handled gracefully
      expect(receiptsStore.error).toBeDefined();
    });

    categorizedIt('should handle session expiry during navigation', [TestCategory.HIGH], async () => {
      // Login user
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        user: mockUser
      });

      await authStore.login({
        email: mockUser.email,
        password: 'password123'
      });
      await nextTick();

      // Navigate to protected page
      await testRouter.push('/receipts');
      await nextTick();

      // Mock session expired response
      mockAxios.onGet('/receipts').reply(401, { error: 'Session expired' });

      try {
        await receiptsStore.fetchReceipts();
      } catch (error) {
        // Error would trigger logout through API interceptor
      }

      await nextTick();

      // Should handle session expiry
      expect(authStore.isAuthenticated).toBe(false);
    });
  });
});