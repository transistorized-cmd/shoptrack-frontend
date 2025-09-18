import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { createI18n } from 'vue-i18n';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { categorizedDescribe, categorizedIt, TestCategory, CategoryCombos } from '../utils/categories';
import {
  testAccessibility,
  testKeyboardAccessibility,
  testAriaAccessibility,
  testFullAccessibility,
  AccessibilityTestCategories,
  accessibilityTester,
  axe
} from '../utils/accessibility';
import { useAuthStore } from '../../src/stores/auth';
import { useReceiptsStore } from '../../src/stores/receipts';

// Mock API adapter
const mockAxios = new MockAdapter(axios);

// Create comprehensive test app with full user flows
const createAccessibleTestApp = () => ({
  name: 'AccessibleTestApp',
  template: `
    <div class="app" id="app">
      <!-- Skip links for keyboard navigation -->
      <div class="skip-links">
        <a href="#main-navigation" class="skip-link">Skip to navigation</a>
        <a href="#main-content" class="skip-link">Skip to main content</a>
      </div>

      <!-- Application header -->
      <header role="banner" class="app-header">
        <div class="header-content">
          <h1 class="app-title">
            <router-link to="/" aria-label="ShopTrack home">
              ShopTrack
            </router-link>
          </h1>

          <!-- Main navigation -->
          <nav id="main-navigation" role="navigation" aria-label="Main navigation">
            <ul class="nav-menu">
              <li>
                <router-link
                  to="/"
                  :aria-current="$route.path === '/' ? 'page' : undefined"
                  data-testid="nav-home"
                >
                  Dashboard
                </router-link>
              </li>
              <li>
                <router-link
                  to="/receipts"
                  :aria-current="$route.path === '/receipts' ? 'page' : undefined"
                  data-testid="nav-receipts"
                >
                  Receipts
                </router-link>
              </li>
              <li>
                <router-link
                  to="/upload"
                  :aria-current="$route.path === '/upload' ? 'page' : undefined"
                  data-testid="nav-upload"
                >
                  Upload
                </router-link>
              </li>
              <li>
                <router-link
                  to="/reports"
                  :aria-current="$route.path === '/reports' ? 'page' : undefined"
                  data-testid="nav-reports"
                >
                  Reports
                </router-link>
              </li>
            </ul>
          </nav>

          <!-- User menu -->
          <div class="user-menu">
            <button
              @click="toggleUserMenu"
              :aria-expanded="showUserMenu.toString()"
              aria-haspopup="true"
              aria-controls="user-menu-dropdown"
              aria-label="User menu"
              data-testid="user-menu-toggle"
            >
              <span class="user-avatar" aria-hidden="true">👤</span>
              {{ user?.firstName }} {{ user?.lastName }}
            </button>

            <div
              v-show="showUserMenu"
              id="user-menu-dropdown"
              role="menu"
              aria-labelledby="user-menu-toggle"
              class="user-menu-dropdown"
            >
              <a href="/profile" role="menuitem" data-testid="user-profile">Profile</a>
              <a href="/settings" role="menuitem" data-testid="user-settings">Settings</a>
              <button
                @click="logout"
                role="menuitem"
                data-testid="user-logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Breadcrumb navigation -->
      <nav aria-label="Breadcrumb" class="breadcrumb-nav" v-if="breadcrumbs.length > 1">
        <ol class="breadcrumb">
          <li v-for="(crumb, index) in breadcrumbs" :key="index">
            <router-link
              v-if="index < breadcrumbs.length - 1"
              :to="crumb.path"
            >
              {{ crumb.name }}
            </router-link>
            <span v-else aria-current="page">{{ crumb.name }}</span>
          </li>
        </ol>
      </nav>

      <!-- Main content area -->
      <main id="main-content" role="main" class="main-content">
        <div class="content-wrapper">
          <!-- Page title -->
          <h2 v-if="pageTitle" class="page-title">{{ pageTitle }}</h2>

          <!-- Loading state -->
          <div
            v-if="isLoading"
            class="loading-container"
            role="status"
            aria-live="polite"
            data-testid="loading-indicator"
          >
            <div class="loading-spinner" aria-hidden="true"></div>
            <span class="loading-text">{{ loadingMessage }}</span>
          </div>

          <!-- Error messages -->
          <div
            v-if="errorMessage"
            role="alert"
            class="error-message"
            data-testid="error-message"
          >
            <h3 class="error-title">Error</h3>
            <p>{{ errorMessage }}</p>
            <button @click="clearError" class="error-dismiss">
              Dismiss
            </button>
          </div>

          <!-- Success messages -->
          <div
            v-if="successMessage"
            role="status"
            aria-live="polite"
            class="success-message"
            data-testid="success-message"
          >
            {{ successMessage }}
          </div>

          <!-- Dynamic content based on route -->
          <div class="page-content">
            <component :is="currentPageComponent" />
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer role="contentinfo" class="app-footer">
        <div class="footer-content">
          <nav aria-label="Footer navigation">
            <ul class="footer-links">
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/terms">Terms of Service</a></li>
              <li><a href="/help">Help</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </nav>
          <p class="copyright">&copy; 2024 ShopTrack. All rights reserved.</p>
        </div>
      </footer>

      <!-- Live region for announcements -->
      <div
        id="announcements"
        aria-live="assertive"
        aria-atomic="true"
        class="sr-only"
      >
        {{ announcement }}
      </div>
    </div>
  `,
  setup() {
    const route = useRoute();
    const router = useRouter();
    const authStore = useAuthStore();
    const receiptsStore = useReceiptsStore();

    // State
    const showUserMenu = ref(false);
    const isLoading = ref(false);
    const loadingMessage = ref('');
    const errorMessage = ref('');
    const successMessage = ref('');
    const announcement = ref('');

    // Computed
    const user = computed(() => authStore.user);

    const pageTitle = computed(() => {
      const routeTitles = {
        '/': 'Dashboard',
        '/receipts': 'Receipts',
        '/upload': 'Upload Receipt',
        '/reports': 'Reports'
      };
      return routeTitles[route.path] || 'ShopTrack';
    });

    const breadcrumbs = computed(() => {
      const crumbs = [{ name: 'Dashboard', path: '/' }];

      if (route.path === '/receipts') {
        crumbs.push({ name: 'Receipts', path: '/receipts' });
      } else if (route.path === '/upload') {
        crumbs.push({ name: 'Upload', path: '/upload' });
      } else if (route.path === '/reports') {
        crumbs.push({ name: 'Reports', path: '/reports' });
      }

      return crumbs;
    });

    const currentPageComponent = computed(() => {
      switch (route.path) {
        case '/':
          return DashboardComponent;
        case '/receipts':
          return ReceiptsComponent;
        case '/upload':
          return UploadComponent;
        case '/reports':
          return ReportsComponent;
        default:
          return NotFoundComponent;
      }
    });

    // Methods
    const toggleUserMenu = () => {
      showUserMenu.value = !showUserMenu.value;
    };

    const logout = async () => {
      showUserMenu.value = false;
      await authStore.logout();
      announce('You have been logged out');
      router.push('/login');
    };

    const clearError = () => {
      errorMessage.value = '';
    };

    const setLoading = (loading: boolean, message = 'Loading...') => {
      isLoading.value = loading;
      loadingMessage.value = message;
      if (loading) {
        announce(message);
      }
    };

    const showError = (message: string) => {
      errorMessage.value = message;
      announce(`Error: ${message}`);
    };

    const showSuccess = (message: string) => {
      successMessage.value = message;
      announce(message);
      setTimeout(() => {
        successMessage.value = '';
      }, 5000);
    };

    const announce = (message: string) => {
      announcement.value = message;
      setTimeout(() => {
        announcement.value = '';
      }, 1000);
    };

    // Close user menu on escape key
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showUserMenu.value) {
        showUserMenu.value = false;
      }
    };

    // Close user menu when clicking outside
    const handleClickOutside = (event: Event) => {
      const userMenu = document.querySelector('.user-menu');
      if (userMenu && !userMenu.contains(event.target as Node)) {
        showUserMenu.value = false;
      }
    };

    onMounted(() => {
      document.addEventListener('keydown', handleKeydown);
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('click', handleClickOutside);
    });

    // Provide methods to child components
    provide('setLoading', setLoading);
    provide('showError', showError);
    provide('showSuccess', showSuccess);
    provide('announce', announce);

    return {
      showUserMenu,
      isLoading,
      loadingMessage,
      errorMessage,
      successMessage,
      announcement,
      user,
      pageTitle,
      breadcrumbs,
      currentPageComponent,
      toggleUserMenu,
      logout,
      clearError
    };
  }
});

// Page components with accessibility features
const DashboardComponent = {
  name: 'DashboardComponent',
  template: `
    <div class="dashboard">
      <div class="dashboard-summary">
        <h3>Recent Activity</h3>
        <div class="stats-grid" role="grid" aria-label="Dashboard statistics">
          <div class="stat-card" role="gridcell">
            <h4>Total Receipts</h4>
            <div class="stat-value" aria-describedby="receipts-desc">{{ totalReceipts }}</div>
            <div id="receipts-desc" class="stat-description">Receipts processed this month</div>
          </div>
          <div class="stat-card" role="gridcell">
            <h4>Total Spent</h4>
            <div class="stat-value" aria-describedby="spent-desc">${{ totalSpent.toFixed(2) }}</div>
            <div id="spent-desc" class="stat-description">Amount spent this month</div>
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <h3>Quick Actions</h3>
        <div class="action-buttons">
          <router-link
            to="/upload"
            class="action-button primary"
            aria-describedby="upload-desc"
          >
            Upload Receipt
          </router-link>
          <div id="upload-desc" class="action-description">
            Upload a new receipt for processing
          </div>

          <router-link
            to="/receipts"
            class="action-button secondary"
            aria-describedby="view-desc"
          >
            View All Receipts
          </router-link>
          <div id="view-desc" class="action-description">
            Browse and search your receipts
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const receiptsStore = useReceiptsStore();

    const totalReceipts = computed(() => receiptsStore.receipts.length);
    const totalSpent = computed(() =>
      receiptsStore.receipts.reduce((sum, receipt) => sum + (receipt.total || 0), 0)
    );

    return {
      totalReceipts,
      totalSpent
    };
  }
};

const ReceiptsComponent = {
  name: 'ReceiptsComponent',
  template: `
    <div class="receipts">
      <div class="receipts-header">
        <div class="search-controls">
          <label for="receipt-search">Search receipts:</label>
          <input
            id="receipt-search"
            v-model="searchQuery"
            type="search"
            placeholder="Search by store, amount, or category..."
            aria-describedby="search-help"
            data-testid="receipt-search"
          />
          <div id="search-help" class="help-text">
            Enter keywords to filter your receipts
          </div>
        </div>

        <div class="filter-controls">
          <label for="category-filter">Filter by category:</label>
          <select id="category-filter" v-model="selectedCategory">
            <option value="">All categories</option>
            <option value="food">Food</option>
            <option value="transport">Transport</option>
            <option value="shopping">Shopping</option>
            <option value="health">Health</option>
          </select>
        </div>
      </div>

      <div class="receipts-content">
        <div
          v-if="filteredReceipts.length === 0"
          class="empty-state"
          role="status"
        >
          <h3>No receipts found</h3>
          <p>{{ searchQuery ? 'Try adjusting your search criteria' : 'Upload your first receipt to get started' }}</p>
          <router-link to="/upload" class="upload-link">Upload Receipt</router-link>
        </div>

        <div v-else class="receipts-list" role="region" aria-label="Receipts list">
          <div
            class="results-summary"
            aria-live="polite"
            data-testid="results-summary"
          >
            Showing {{ filteredReceipts.length }} of {{ receipts.length }} receipts
          </div>

          <div class="receipts-grid">
            <article
              v-for="receipt in filteredReceipts"
              :key="receipt.id"
              class="receipt-card"
              :data-testid="'receipt-' + receipt.id"
            >
              <header class="receipt-header">
                <h4>{{ receipt.storeName }}</h4>
                <time :datetime="receipt.date">{{ formatDate(receipt.date) }}</time>
              </header>

              <div class="receipt-details">
                <div class="receipt-amount">${{ receipt.total.toFixed(2) }}</div>
                <div class="receipt-category">
                  <span class="category-badge">{{ receipt.category }}</span>
                </div>
              </div>

              <div class="receipt-actions">
                <button
                  @click="viewReceipt(receipt.id)"
                  :aria-label="'View receipt from ' + receipt.storeName"
                  data-testid="view-receipt"
                >
                  View
                </button>
                <button
                  @click="editReceipt(receipt.id)"
                  :aria-label="'Edit receipt from ' + receipt.storeName"
                  data-testid="edit-receipt"
                >
                  Edit
                </button>
                <button
                  @click="deleteReceipt(receipt.id)"
                  :aria-label="'Delete receipt from ' + receipt.storeName"
                  class="danger"
                  data-testid="delete-receipt"
                >
                  Delete
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const receiptsStore = useReceiptsStore();
    const { showSuccess, showError, announce } = inject('showSuccess', 'showError', 'announce');

    const searchQuery = ref('');
    const selectedCategory = ref('');

    const receipts = computed(() => receiptsStore.receipts);

    const filteredReceipts = computed(() => {
      let filtered = receipts.value;

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(receipt =>
          receipt.storeName.toLowerCase().includes(query) ||
          receipt.category.toLowerCase().includes(query) ||
          receipt.total.toString().includes(query)
        );
      }

      if (selectedCategory.value) {
        filtered = filtered.filter(receipt =>
          receipt.category.toLowerCase() === selectedCategory.value.toLowerCase()
        );
      }

      return filtered;
    });

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString();
    };

    const viewReceipt = (id: string) => {
      announce(`Viewing receipt ${id}`);
    };

    const editReceipt = (id: string) => {
      announce(`Editing receipt ${id}`);
    };

    const deleteReceipt = async (id: string) => {
      if (confirm('Are you sure you want to delete this receipt?')) {
        try {
          await receiptsStore.deleteReceipt(id);
          announce('Receipt deleted successfully');
          showSuccess('Receipt deleted successfully');
        } catch (error) {
          showError('Failed to delete receipt');
        }
      }
    };

    return {
      searchQuery,
      selectedCategory,
      receipts,
      filteredReceipts,
      formatDate,
      viewReceipt,
      editReceipt,
      deleteReceipt
    };
  }
};

const UploadComponent = {
  name: 'UploadComponent',
  template: `
    <div class="upload">
      <form @submit.prevent="handleUpload" class="upload-form">
        <div class="upload-area">
          <label for="file-input" class="upload-label">
            Choose receipt files or drag and drop
          </label>
          <input
            id="file-input"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.pdf"
            @change="handleFileSelect"
            aria-describedby="file-help"
            data-testid="file-input"
          />
          <div id="file-help" class="help-text">
            Supported formats: JPG, PNG, PDF. Maximum 10MB per file.
          </div>
        </div>

        <div v-if="selectedFiles.length > 0" class="file-list">
          <h3>Selected Files</h3>
          <ul role="list">
            <li
              v-for="(file, index) in selectedFiles"
              :key="index"
              class="file-item"
            >
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">({{ formatFileSize(file.size) }})</span>
              <button
                type="button"
                @click="removeFile(index)"
                :aria-label="'Remove ' + file.name"
                class="remove-file"
              >
                Remove
              </button>
            </li>
          </ul>
        </div>

        <div class="upload-actions">
          <button
            type="submit"
            :disabled="selectedFiles.length === 0 || isUploading"
            data-testid="upload-button"
          >
            {{ isUploading ? 'Uploading...' : 'Upload Receipts' }}
          </button>
        </div>

        <div
          v-if="isUploading"
          class="upload-progress"
          role="progressbar"
          :aria-valuenow="uploadProgress"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Upload progress"
        >
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: uploadProgress + '%' }"
            ></div>
          </div>
          <div class="progress-text">{{ uploadProgress }}% complete</div>
        </div>
      </form>
    </div>
  `,
  setup() {
    const { setLoading, showSuccess, showError, announce } = inject('setLoading', 'showSuccess', 'showError', 'announce');

    const selectedFiles = ref<File[]>([]);
    const isUploading = ref(false);
    const uploadProgress = ref(0);

    const handleFileSelect = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.files) {
        selectedFiles.value = Array.from(target.files);
        announce(`${selectedFiles.value.length} files selected`);
      }
    };

    const removeFile = (index: number) => {
      const fileName = selectedFiles.value[index].name;
      selectedFiles.value.splice(index, 1);
      announce(`${fileName} removed`);
    };

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleUpload = async () => {
      if (selectedFiles.value.length === 0) return;

      isUploading.value = true;
      uploadProgress.value = 0;
      setLoading(true, 'Uploading receipts...');

      try {
        // Simulate upload progress
        const interval = setInterval(() => {
          uploadProgress.value += 10;
          if (uploadProgress.value >= 100) {
            clearInterval(interval);
            isUploading.value = false;
            setLoading(false);
            showSuccess('Receipts uploaded successfully!');
            selectedFiles.value = [];
            uploadProgress.value = 0;
          }
        }, 200);
      } catch (error) {
        isUploading.value = false;
        setLoading(false);
        showError('Failed to upload receipts');
      }
    };

    return {
      selectedFiles,
      isUploading,
      uploadProgress,
      handleFileSelect,
      removeFile,
      formatFileSize,
      handleUpload
    };
  }
};

const ReportsComponent = {
  name: 'ReportsComponent',
  template: `
    <div class="reports">
      <div class="report-filters">
        <h3>Report Filters</h3>
        <div class="filter-row">
          <label for="date-range">Date Range:</label>
          <select id="date-range" v-model="dateRange">
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="this-year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      <div class="report-content">
        <div class="chart-container" role="img" aria-labelledby="chart-title">
          <h4 id="chart-title">Spending by Category</h4>
          <div class="chart-placeholder">
            [Chart would be here with proper accessibility]
          </div>
        </div>

        <div class="report-table">
          <table role="table" aria-describedby="table-description">
            <caption>Monthly spending summary</caption>
            <div id="table-description" class="sr-only">
              Table showing spending categories and amounts
            </div>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Amount</th>
                <th scope="col">Percentage</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in reportData" :key="item.category">
                <td>{{ item.category }}</td>
                <td>${{ item.amount.toFixed(2) }}</td>
                <td>{{ item.percentage }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  setup() {
    const dateRange = ref('this-month');

    const reportData = ref([
      { category: 'Food', amount: 450.00, percentage: 45 },
      { category: 'Transport', amount: 200.00, percentage: 20 },
      { category: 'Shopping', amount: 180.00, percentage: 18 },
      { category: 'Health', amount: 120.00, percentage: 12 },
      { category: 'Other', amount: 50.00, percentage: 5 }
    ]);

    return {
      dateRange,
      reportData
    };
  }
};

const NotFoundComponent = {
  name: 'NotFoundComponent',
  template: `
    <div class="not-found" role="main">
      <h2>Page Not Found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <router-link to="/" class="home-link">Return to Dashboard</router-link>
    </div>
  `
};

categorizedDescribe('Integration Accessibility Testing', AccessibilityTestCategories.COMPREHENSIVE, () => {
  let wrapper: VueWrapper;
  let pinia: any;
  let router: any;
  let i18n: any;

  beforeEach(async () => {
    pinia = createPinia();
    setActivePinia(pinia);

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: DashboardComponent },
        { path: '/receipts', component: ReceiptsComponent },
        { path: '/upload', component: UploadComponent },
        { path: '/reports', component: ReportsComponent }
      ]
    });

    i18n = createI18n({
      locale: 'en',
      messages: { en: {} }
    });

    // Setup stores
    const authStore = useAuthStore();
    authStore.setUser({
      id: 'test-user',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      isVerified: true
    });

    const receiptsStore = useReceiptsStore();
    receiptsStore.receipts = [
      {
        id: '1',
        storeName: 'Grocery Store',
        date: '2024-01-15',
        total: 45.67,
        category: 'food'
      },
      {
        id: '2',
        storeName: 'Gas Station',
        date: '2024-01-14',
        total: 32.50,
        category: 'transport'
      }
    ];

    mockAxios.reset();
    vi.clearAllMocks();

    await router.push('/');
    await router.isReady();
  });

  afterEach(() => {
    wrapper?.unmount();
    mockAxios.reset();
  });

  categorizedIt('should maintain accessibility throughout user navigation flow',
    [TestCategory.ACCESSIBILITY, TestCategory.INTEGRATION],
    async () => {
      wrapper = mount(createAccessibleTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Test initial dashboard accessibility
      await testAccessibility(wrapper, 'Dashboard', 'comprehensive');

      // Navigate to receipts page
      await wrapper.find('[data-testid="nav-receipts"]').trigger('click');
      await router.isReady();
      await wrapper.vm.$nextTick();

      // Test receipts page accessibility
      await testAccessibility(wrapper, 'Receipts', 'comprehensive');

      // Navigate to upload page
      await wrapper.find('[data-testid="nav-upload"]').trigger('click');
      await router.isReady();
      await wrapper.vm.$nextTick();

      // Test upload page accessibility
      await testAccessibility(wrapper, 'Upload', 'forms');

      // Navigate to reports page
      await wrapper.find('[data-testid="nav-reports"]').trigger('click');
      await router.isReady();
      await wrapper.vm.$nextTick();

      // Test reports page accessibility
      await testAccessibility(wrapper, 'Reports', 'comprehensive');
    }
  );

  categorizedIt('should maintain keyboard navigation throughout the app',
    [TestCategory.ACCESSIBILITY, TestCategory.KEYBOARD],
    async () => {
      wrapper = mount(createAccessibleTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Test keyboard navigation on each page
      const pages = [
        { path: '/', testId: 'nav-home' },
        { path: '/receipts', testId: 'nav-receipts' },
        { path: '/upload', testId: 'nav-upload' },
        { path: '/reports', testId: 'nav-reports' }
      ];

      for (const page of pages) {
        await wrapper.find(`[data-testid="${page.testId}"]`).trigger('click');
        await router.isReady();
        await wrapper.vm.$nextTick();

        await testKeyboardAccessibility(wrapper, `Page ${page.path}`);
      }
    }
  );

  categorizedIt('should handle form interactions accessibly',
    [TestCategory.ACCESSIBILITY, TestCategory.FORMS],
    async () => {
      wrapper = mount(createAccessibleTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Navigate to upload page
      await wrapper.find('[data-testid="nav-upload"]').trigger('click');
      await router.isReady();
      await wrapper.vm.$nextTick();

      // Test file upload form
      const fileInput = wrapper.find('[data-testid="file-input"]');
      expect(fileInput.exists()).toBe(true);

      // Test form accessibility
      testAriaAccessibility(wrapper, 'UploadForm');

      // Test form labels and descriptions
      expect(fileInput.attributes('aria-describedby')).toBeTruthy();

      // Simulate file selection
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput.element, 'files', {
        value: [testFile],
        writable: false
      });

      await fileInput.trigger('change');
      await wrapper.vm.$nextTick();

      // Test accessibility after file selection
      await testAccessibility(wrapper, 'UploadWithFile', 'forms');

      // Test upload button
      const uploadButton = wrapper.find('[data-testid="upload-button"]');
      expect(uploadButton.element.disabled).toBe(false);

      await uploadButton.trigger('click');
      await wrapper.vm.$nextTick();

      // Test accessibility during upload state
      await testAccessibility(wrapper, 'UploadInProgress', 'forms');
    }
  );

  categorizedIt('should handle search and filter interactions accessibly',
    [TestCategory.ACCESSIBILITY, TestCategory.USER_INTERACTION],
    async () => {
      wrapper = mount(createAccessibleTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Navigate to receipts page
      await wrapper.find('[data-testid="nav-receipts"]').trigger('click');
      await router.isReady();
      await wrapper.vm.$nextTick();

      // Test search functionality
      const searchInput = wrapper.find('[data-testid="receipt-search"]');
      expect(searchInput.exists()).toBe(true);
      expect(searchInput.attributes('type')).toBe('search');
      expect(searchInput.attributes('aria-describedby')).toBeTruthy();

      // Perform search
      await searchInput.setValue('Grocery');
      await wrapper.vm.$nextTick();

      // Check that results are announced
      const resultsSummary = wrapper.find('[data-testid="results-summary"]');
      expect(resultsSummary.exists()).toBe(true);
      expect(resultsSummary.attributes('aria-live')).toBe('polite');

      // Test accessibility after search
      await testAccessibility(wrapper, 'ReceiptsWithSearch', 'comprehensive');
    }
  );

  categorizedIt('should handle error states accessibly',
    [TestCategory.ACCESSIBILITY, TestCategory.ERROR_HANDLING],
    async () => {
      wrapper = mount(createAccessibleTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Trigger an error state
      const { showError } = wrapper.vm;
      showError('Test error message');
      await wrapper.vm.$nextTick();

      // Check error message accessibility
      const errorMessage = wrapper.find('[data-testid="error-message"]');
      expect(errorMessage.exists()).toBe(true);
      expect(errorMessage.attributes('role')).toBe('alert');

      // Test accessibility with error state
      await testAccessibility(wrapper, 'AppWithError', 'comprehensive');

      // Test error dismissal
      const dismissButton = wrapper.find('.error-dismiss');
      expect(dismissButton.exists()).toBe(true);

      await dismissButton.trigger('click');
      await wrapper.vm.$nextTick();

      // Verify error is dismissed and accessibility maintained
      expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(false);
      await testAccessibility(wrapper, 'AppAfterErrorDismissal', 'comprehensive');
    }
  );

  categorizedIt('should handle loading states accessibly',
    [TestCategory.ACCESSIBILITY, TestCategory.LOADING_STATES],
    async () => {
      wrapper = mount(createAccessibleTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Trigger loading state
      const { setLoading } = wrapper.vm;
      setLoading(true, 'Loading receipts...');
      await wrapper.vm.$nextTick();

      // Check loading indicator accessibility
      const loadingIndicator = wrapper.find('[data-testid="loading-indicator"]');
      expect(loadingIndicator.exists()).toBe(true);
      expect(loadingIndicator.attributes('role')).toBe('status');
      expect(loadingIndicator.attributes('aria-live')).toBe('polite');

      // Test accessibility during loading
      await testAccessibility(wrapper, 'AppWithLoading', 'comprehensive');

      // Clear loading state
      setLoading(false);
      await wrapper.vm.$nextTick();

      // Verify loading is cleared and accessibility maintained
      expect(wrapper.find('[data-testid="loading-indicator"]').exists()).toBe(false);
      await testAccessibility(wrapper, 'AppAfterLoading', 'comprehensive');
    }
  );

  categorizedIt('should maintain focus management throughout navigation',
    [TestCategory.ACCESSIBILITY, TestCategory.FOCUS_MANAGEMENT],
    async () => {
      wrapper = mount(createAccessibleTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Test skip links
      const skipLinks = wrapper.findAll('.skip-link');
      expect(skipLinks.length).toBeGreaterThan(0);

      // Test main navigation focus
      const navLinks = wrapper.findAll('nav a, nav button');
      expect(navLinks.length).toBeGreaterThan(0);

      // Test that all interactive elements are focusable
      const focusableElements = wrapper.element.querySelectorAll(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      expect(focusableElements.length).toBeGreaterThan(0);

      // Test focus order
      let tabIndex = 0;
      focusableElements.forEach(element => {
        const elementTabIndex = parseInt(element.getAttribute('tabindex') || '0');
        if (elementTabIndex >= 0) {
          expect(elementTabIndex).toBeGreaterThanOrEqual(tabIndex);
          tabIndex = elementTabIndex;
        }
      });
    }
  );

  categorizedIt('should provide proper ARIA landmarks and structure',
    [TestCategory.ACCESSIBILITY, TestCategory.LANDMARKS],
    async () => {
      wrapper = mount(createAccessibleTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Test landmark regions
      const banner = wrapper.find('[role="banner"]');
      expect(banner.exists()).toBe(true);

      const main = wrapper.find('[role="main"]');
      expect(main.exists()).toBe(true);

      const contentinfo = wrapper.find('[role="contentinfo"]');
      expect(contentinfo.exists()).toBe(true);

      const navigation = wrapper.find('[role="navigation"]');
      expect(navigation.exists()).toBe(true);

      // Test navigation labels
      const navElements = wrapper.findAll('nav');
      navElements.forEach(nav => {
        const hasLabel = nav.attributes('aria-label') || nav.attributes('aria-labelledby');
        expect(hasLabel).toBeTruthy();
      });

      // Test heading hierarchy
      const headings = wrapper.findAll('h1, h2, h3, h4, h5, h6');
      expect(headings.length).toBeGreaterThan(0);

      let previousLevel = 0;
      headings.forEach((heading) => {
        const level = parseInt(heading.element.tagName.charAt(1));
        if (previousLevel === 0) {
          // First heading
        } else {
          expect(level).toBeLessThanOrEqual(previousLevel + 1);
        }
        previousLevel = level;
      });
    }
  );

  categorizedIt('should pass comprehensive accessibility audit across all pages',
    [TestCategory.ACCESSIBILITY, TestCategory.COMPREHENSIVE],
    async () => {
      wrapper = mount(createAccessibleTestApp(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      const pages = [
        { path: '/', testId: 'nav-home', name: 'Dashboard' },
        { path: '/receipts', testId: 'nav-receipts', name: 'Receipts' },
        { path: '/upload', testId: 'nav-upload', name: 'Upload' },
        { path: '/reports', testId: 'nav-reports', name: 'Reports' }
      ];

      for (const page of pages) {
        await wrapper.find(`[data-testid="${page.testId}"]`).trigger('click');
        await router.isReady();
        await wrapper.vm.$nextTick();

        // Run comprehensive accessibility test
        const results = await testFullAccessibility(wrapper, page.name, {
          profile: 'comprehensive',
          testKeyboard: true,
          testAria: true,
          testSemantics: true,
          testColorContrast: true
        });

        // All tests should pass
        expect(results.axeResult.passed).toBe(true);
        expect(results.keyboardResult?.keyboardAccessible).toBe(true);
        expect(results.ariaResult?.passed).toBe(true);
        expect(results.semanticsResult?.passed).toBe(true);
        expect(results.colorContrastResult?.passed).toBe(true);
      }

      // Generate comprehensive report
      const report = accessibilityTester.generateReport();
      expect(report.totalTests).toBeGreaterThan(0);
      expect(report.failedTests).toBe(0);

      console.log('🎉 Integration Accessibility Report:', report);
    }
  );
});