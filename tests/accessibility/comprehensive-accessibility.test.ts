import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { createI18n } from 'vue-i18n';
import { categorizedDescribe, categorizedIt, TestCategory } from '../utils/categories';
import {
  testAccessibility,
  testKeyboardAccessibility,
  testAriaAccessibility,
  testFullAccessibility,
  AccessibilityTestCategories,
  accessibilityTester,
  axe,
  axeStrict
} from '../utils/accessibility';

// Create comprehensive test components for different UI patterns
const createFormComponent = () => ({
  name: 'AccessibilityTestForm',
  template: `
    <form @submit.prevent="onSubmit" aria-labelledby="form-title">
      <h2 id="form-title">User Registration Form</h2>

      <!-- Text Input with Label -->
      <div class="field-group">
        <label for="first-name">First Name</label>
        <input
          id="first-name"
          v-model="formData.firstName"
          type="text"
          required
          aria-describedby="first-name-help"
          :aria-invalid="errors.firstName ? 'true' : 'false'"
        />
        <div id="first-name-help" class="help-text">Enter your first name</div>
        <div v-if="errors.firstName" role="alert" class="error">{{ errors.firstName }}</div>
      </div>

      <!-- Email Input with Validation -->
      <div class="field-group">
        <label for="email">Email Address</label>
        <input
          id="email"
          v-model="formData.email"
          type="email"
          required
          aria-describedby="email-help"
          :aria-invalid="errors.email ? 'true' : 'false'"
        />
        <div id="email-help" class="help-text">We'll never share your email</div>
        <div v-if="errors.email" role="alert" class="error">{{ errors.email }}</div>
      </div>

      <!-- Password with Visibility Toggle -->
      <div class="field-group">
        <label for="password">Password</label>
        <div class="password-input-wrapper">
          <input
            id="password"
            v-model="formData.password"
            :type="showPassword ? 'text' : 'password'"
            required
            aria-describedby="password-help"
            :aria-invalid="errors.password ? 'true' : 'false'"
          />
          <button
            type="button"
            @click="togglePasswordVisibility"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            :aria-pressed="showPassword.toString()"
          >
            {{ showPassword ? '👁️' : '👁️‍🗨️' }}
          </button>
        </div>
        <div id="password-help" class="help-text">
          Password must be at least 8 characters long
        </div>
        <div v-if="errors.password" role="alert" class="error">{{ errors.password }}</div>
      </div>

      <!-- Select Dropdown -->
      <div class="field-group">
        <label for="country">Country</label>
        <select
          id="country"
          v-model="formData.country"
          required
          aria-describedby="country-help"
        >
          <option value="">Select a country</option>
          <option value="us">United States</option>
          <option value="ca">Canada</option>
          <option value="uk">United Kingdom</option>
          <option value="de">Germany</option>
        </select>
        <div id="country-help" class="help-text">Select your country of residence</div>
      </div>

      <!-- Checkbox Group -->
      <fieldset>
        <legend>Interests</legend>
        <div class="checkbox-group">
          <label>
            <input
              type="checkbox"
              v-model="formData.interests"
              value="technology"
            />
            Technology
          </label>
          <label>
            <input
              type="checkbox"
              v-model="formData.interests"
              value="sports"
            />
            Sports
          </label>
          <label>
            <input
              type="checkbox"
              v-model="formData.interests"
              value="music"
            />
            Music
          </label>
        </div>
      </fieldset>

      <!-- Radio Button Group -->
      <fieldset>
        <legend>Communication Preference</legend>
        <div class="radio-group">
          <label>
            <input
              type="radio"
              v-model="formData.communication"
              value="email"
              name="communication"
            />
            Email
          </label>
          <label>
            <input
              type="radio"
              v-model="formData.communication"
              value="sms"
              name="communication"
            />
            SMS
          </label>
          <label>
            <input
              type="radio"
              v-model="formData.communication"
              value="none"
              name="communication"
            />
            No communication
          </label>
        </div>
      </fieldset>

      <!-- Terms and Conditions -->
      <div class="field-group">
        <label>
          <input
            type="checkbox"
            v-model="formData.acceptTerms"
            required
            aria-describedby="terms-help"
          />
          I accept the
          <a href="/terms" target="_blank" rel="noopener noreferrer">
            Terms and Conditions
          </a>
        </label>
        <div id="terms-help" class="help-text">Required to create an account</div>
      </div>

      <!-- Submit Button -->
      <div class="form-actions">
        <button
          type="submit"
          :disabled="!isFormValid"
          :aria-describedby="!isFormValid ? 'submit-help' : undefined"
        >
          Create Account
        </button>
        <div v-if="!isFormValid" id="submit-help" class="help-text">
          Please fill in all required fields
        </div>
      </div>

      <!-- Progress Indicator -->
      <div v-if="isSubmitting" class="progress-container">
        <div
          role="progressbar"
          aria-label="Account creation progress"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="progress"
        >
          Creating account... {{ progress }}%
        </div>
      </div>

      <!-- Success/Error Messages -->
      <div v-if="submitMessage" :role="submitMessage.type === 'error' ? 'alert' : 'status'">
        {{ submitMessage.text }}
      </div>
    </form>
  `,
  setup() {
    const formData = ref({
      firstName: '',
      email: '',
      password: '',
      country: '',
      interests: [],
      communication: '',
      acceptTerms: false
    });

    const errors = ref({});
    const showPassword = ref(false);
    const isSubmitting = ref(false);
    const progress = ref(0);
    const submitMessage = ref(null);

    const isFormValid = computed(() => {
      return formData.value.firstName &&
             formData.value.email &&
             formData.value.password &&
             formData.value.country &&
             formData.value.communication &&
             formData.value.acceptTerms;
    });

    const togglePasswordVisibility = () => {
      showPassword.value = !showPassword.value;
    };

    const onSubmit = async () => {
      isSubmitting.value = true;
      progress.value = 0;

      // Simulate progress
      const interval = setInterval(() => {
        progress.value += 20;
        if (progress.value >= 100) {
          clearInterval(interval);
          isSubmitting.value = false;
          submitMessage.value = {
            type: 'success',
            text: 'Account created successfully!'
          };
        }
      }, 200);
    };

    return {
      formData,
      errors,
      showPassword,
      isSubmitting,
      progress,
      submitMessage,
      isFormValid,
      togglePasswordVisibility,
      onSubmit
    };
  }
});

const createNavigationComponent = () => ({
  name: 'AccessibilityTestNavigation',
  template: `
    <div>
      <!-- Skip Links -->
      <div class="skip-links">
        <a href="#main-content" class="skip-link">Skip to main content</a>
        <a href="#navigation" class="skip-link">Skip to navigation</a>
      </div>

      <!-- Header with Navigation -->
      <header role="banner">
        <div class="header-content">
          <h1>ShopTrack</h1>

          <!-- Main Navigation -->
          <nav id="navigation" role="navigation" aria-label="Main navigation">
            <ul>
              <li><a href="/" :aria-current="currentPage === 'home' ? 'page' : undefined">Home</a></li>
              <li>
                <button
                  @click="toggleDropdown('receipts')"
                  :aria-expanded="dropdowns.receipts.toString()"
                  aria-haspopup="true"
                  aria-controls="receipts-menu"
                >
                  Receipts
                </button>
                <ul
                  id="receipts-menu"
                  v-show="dropdowns.receipts"
                  role="menu"
                  aria-labelledby="receipts-button"
                >
                  <li role="none">
                    <a href="/receipts" role="menuitem">View All</a>
                  </li>
                  <li role="none">
                    <a href="/receipts/upload" role="menuitem">Upload</a>
                  </li>
                  <li role="none">
                    <a href="/receipts/search" role="menuitem">Search</a>
                  </li>
                </ul>
              </li>
              <li><a href="/reports">Reports</a></li>
              <li><a href="/settings">Settings</a></li>
            </ul>
          </nav>

          <!-- User Menu -->
          <div class="user-menu">
            <button
              @click="toggleDropdown('user')"
              :aria-expanded="dropdowns.user.toString()"
              aria-haspopup="true"
              aria-controls="user-menu"
              aria-label="User menu"
            >
              <img src="/avatar.jpg" alt="User avatar" />
              John Doe
            </button>
            <ul
              id="user-menu"
              v-show="dropdowns.user"
              role="menu"
              aria-labelledby="user-button"
            >
              <li role="none">
                <a href="/profile" role="menuitem">Profile</a>
              </li>
              <li role="none">
                <a href="/account" role="menuitem">Account Settings</a>
              </li>
              <li role="none">
                <button @click="logout" role="menuitem">Logout</button>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <!-- Breadcrumb Navigation -->
      <nav aria-label="Breadcrumb">
        <ol class="breadcrumb">
          <li><a href="/">Home</a></li>
          <li><a href="/receipts">Receipts</a></li>
          <li aria-current="page">Upload</li>
        </ol>
      </nav>

      <!-- Main Content -->
      <main id="main-content" role="main">
        <h2>Upload Receipt</h2>
        <p>Upload your receipts for processing and organization.</p>
      </main>

      <!-- Footer -->
      <footer role="contentinfo">
        <nav aria-label="Footer navigation">
          <ul>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/terms">Terms of Service</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </nav>
        <p>&copy; 2024 ShopTrack. All rights reserved.</p>
      </footer>
    </div>
  `,
  setup() {
    const currentPage = ref('upload');
    const dropdowns = ref({
      receipts: false,
      user: false
    });

    const toggleDropdown = (name: string) => {
      // Close other dropdowns
      Object.keys(dropdowns.value).forEach(key => {
        if (key !== name) {
          dropdowns.value[key] = false;
        }
      });
      dropdowns.value[name] = !dropdowns.value[name];
    };

    const logout = () => {
      console.log('Logging out...');
    };

    // Close dropdowns on escape key
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        Object.keys(dropdowns.value).forEach(key => {
          dropdowns.value[key] = false;
        });
      }
    };

    onMounted(() => {
      document.addEventListener('keydown', handleKeydown);
    });

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown);
    });

    return {
      currentPage,
      dropdowns,
      toggleDropdown,
      logout
    };
  }
});

const createModalComponent = () => ({
  name: 'AccessibilityTestModal',
  template: `
    <div>
      <button @click="openModal" data-testid="open-modal">
        Open Modal
      </button>

      <!-- Modal -->
      <div
        v-if="isOpen"
        class="modal-backdrop"
        @click="closeModal"
        @keydown.esc="closeModal"
      >
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="modalTitleId"
          :aria-describedby="modalDescId"
          @click.stop
        >
          <div class="modal-header">
            <h2 :id="modalTitleId">{{ modalTitle }}</h2>
            <button
              @click="closeModal"
              aria-label="Close modal"
              class="close-button"
              data-testid="close-modal"
            >
              ×
            </button>
          </div>

          <div class="modal-content">
            <p :id="modalDescId">{{ modalDescription }}</p>

            <form @submit.prevent="handleSubmit">
              <div class="field-group">
                <label for="modal-input">Enter your name:</label>
                <input
                  id="modal-input"
                  v-model="inputValue"
                  type="text"
                  ref="firstInput"
                />
              </div>

              <div class="modal-actions">
                <button type="submit" :disabled="!inputValue.trim()">
                  Submit
                </button>
                <button type="button" @click="closeModal">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const isOpen = ref(false);
    const inputValue = ref('');
    const firstInput = ref(null);
    const previousFocus = ref(null);
    const modalTitleId = 'modal-title-' + Math.random().toString(36).substr(2, 9);
    const modalDescId = 'modal-desc-' + Math.random().toString(36).substr(2, 9);

    const modalTitle = 'User Information';
    const modalDescription = 'Please provide your information in the form below.';

    const openModal = () => {
      previousFocus.value = document.activeElement;
      isOpen.value = true;

      nextTick(() => {
        if (firstInput.value) {
          firstInput.value.focus();
        }
      });
    };

    const closeModal = () => {
      isOpen.value = false;
      inputValue.value = '';

      nextTick(() => {
        if (previousFocus.value) {
          previousFocus.value.focus();
        }
      });
    };

    const handleSubmit = () => {
      console.log('Submitted:', inputValue.value);
      closeModal();
    };

    // Trap focus within modal
    const trapFocus = (event: KeyboardEvent) => {
      if (!isOpen.value) return;

      const modal = document.querySelector('.modal');
      if (!modal) return;

      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    onMounted(() => {
      document.addEventListener('keydown', trapFocus);
    });

    onUnmounted(() => {
      document.removeEventListener('keydown', trapFocus);
    });

    return {
      isOpen,
      inputValue,
      firstInput,
      modalTitleId,
      modalDescId,
      modalTitle,
      modalDescription,
      openModal,
      closeModal,
      handleSubmit
    };
  }
});

const createDataTableComponent = () => ({
  name: 'AccessibilityTestDataTable',
  template: `
    <div class="data-table-container">
      <div class="table-header">
        <h2>Receipt Data</h2>
        <div class="table-controls">
          <label for="search">Search:</label>
          <input
            id="search"
            v-model="searchQuery"
            type="search"
            placeholder="Search receipts..."
            aria-describedby="search-help"
          />
          <div id="search-help" class="sr-only">
            Search through receipt data by store name, amount, or date
          </div>

          <label for="sort">Sort by:</label>
          <select id="sort" v-model="sortBy" @change="sortData">
            <option value="date">Date</option>
            <option value="store">Store</option>
            <option value="amount">Amount</option>
          </select>
        </div>
      </div>

      <div class="table-wrapper" role="region" aria-labelledby="table-caption" tabindex="0">
        <table role="table" aria-describedby="table-description">
          <caption id="table-caption">
            Receipt data with {{ filteredData.length }} entries
            <div id="table-description" class="table-description">
              Use arrow keys to navigate table cells, or tab to move between interactive elements
            </div>
          </caption>

          <thead>
            <tr role="row">
              <th
                role="columnheader"
                tabindex="0"
                @click="sort('date')"
                @keydown.enter="sort('date')"
                @keydown.space="sort('date')"
                :aria-sort="getSortDirection('date')"
              >
                Date
                <span aria-hidden="true">{{ getSortIcon('date') }}</span>
              </th>
              <th
                role="columnheader"
                tabindex="0"
                @click="sort('store')"
                @keydown.enter="sort('store')"
                @keydown.space="sort('store')"
                :aria-sort="getSortDirection('store')"
              >
                Store
                <span aria-hidden="true">{{ getSortIcon('store') }}</span>
              </th>
              <th
                role="columnheader"
                tabindex="0"
                @click="sort('amount')"
                @keydown.enter="sort('amount')"
                @keydown.space="sort('amount')"
                :aria-sort="getSortDirection('amount')"
              >
                Amount
                <span aria-hidden="true">{{ getSortIcon('amount') }}</span>
              </th>
              <th role="columnheader">Category</th>
              <th role="columnheader">Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(receipt, index) in filteredData"
              :key="receipt.id"
              role="row"
              :class="{ 'selected': selectedReceipt === receipt.id }"
              @click="selectReceipt(receipt.id)"
            >
              <td role="gridcell" :data-label="'Date'">
                <time :datetime="receipt.date">{{ formatDate(receipt.date) }}</time>
              </td>
              <td role="gridcell" :data-label="'Store'">{{ receipt.store }}</td>
              <td role="gridcell" :data-label="'Amount'">
                <span class="currency">${{ receipt.amount.toFixed(2) }}</span>
              </td>
              <td role="gridcell" :data-label="'Category'">
                <span class="category-badge">{{ receipt.category }}</span>
              </td>
              <td role="gridcell" :data-label="'Actions'">
                <button
                  @click.stop="editReceipt(receipt.id)"
                  :aria-label="'Edit receipt from ' + receipt.store"
                  class="action-button"
                >
                  Edit
                </button>
                <button
                  @click.stop="deleteReceipt(receipt.id)"
                  :aria-label="'Delete receipt from ' + receipt.store"
                  class="action-button danger"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-footer">
        <div class="table-info" aria-live="polite">
          Showing {{ filteredData.length }} of {{ receipts.length }} receipts
          <span v-if="selectedReceipt">
            • Receipt from {{ getSelectedReceiptStore() }} selected
          </span>
        </div>

        <nav aria-label="Table pagination" v-if="totalPages > 1">
          <button
            @click="previousPage"
            :disabled="currentPage === 1"
            aria-label="Go to previous page"
          >
            Previous
          </button>
          <span aria-current="page">Page {{ currentPage }} of {{ totalPages }}</span>
          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            aria-label="Go to next page"
          >
            Next
          </button>
        </nav>
      </div>
    </div>
  `,
  setup() {
    const searchQuery = ref('');
    const sortBy = ref('date');
    const sortDirection = ref('desc');
    const selectedReceipt = ref(null);
    const currentPage = ref(1);
    const itemsPerPage = 10;

    const receipts = ref([
      { id: 1, date: '2024-01-15', store: 'Grocery Store A', amount: 45.67, category: 'Food' },
      { id: 2, date: '2024-01-14', store: 'Gas Station', amount: 32.50, category: 'Transport' },
      { id: 3, date: '2024-01-13', store: 'Restaurant', amount: 28.90, category: 'Food' },
      { id: 4, date: '2024-01-12', store: 'Pharmacy', amount: 15.25, category: 'Health' },
      { id: 5, date: '2024-01-11', store: 'Hardware Store', amount: 67.89, category: 'Home' }
    ]);

    const filteredData = computed(() => {
      let filtered = receipts.value;

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(receipt =>
          receipt.store.toLowerCase().includes(query) ||
          receipt.amount.toString().includes(query) ||
          receipt.category.toLowerCase().includes(query)
        );
      }

      // Sort data
      filtered.sort((a, b) => {
        let aVal = a[sortBy.value];
        let bVal = b[sortBy.value];

        if (sortBy.value === 'amount') {
          aVal = parseFloat(aVal);
          bVal = parseFloat(bVal);
        }

        if (sortDirection.value === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      return filtered;
    });

    const totalPages = computed(() => {
      return Math.ceil(filteredData.value.length / itemsPerPage);
    });

    const sort = (column: string) => {
      if (sortBy.value === column) {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortBy.value = column;
        sortDirection.value = 'asc';
      }
    };

    const getSortDirection = (column: string) => {
      if (sortBy.value === column) {
        return sortDirection.value === 'asc' ? 'ascending' : 'descending';
      }
      return 'none';
    };

    const getSortIcon = (column: string) => {
      if (sortBy.value === column) {
        return sortDirection.value === 'asc' ? '↑' : '↓';
      }
      return '';
    };

    const selectReceipt = (id: number) => {
      selectedReceipt.value = selectedReceipt.value === id ? null : id;
    };

    const getSelectedReceiptStore = () => {
      const receipt = receipts.value.find(r => r.id === selectedReceipt.value);
      return receipt ? receipt.store : '';
    };

    const editReceipt = (id: number) => {
      console.log('Edit receipt:', id);
    };

    const deleteReceipt = (id: number) => {
      console.log('Delete receipt:', id);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString();
    };

    const previousPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--;
      }
    };

    const nextPage = () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++;
      }
    };

    return {
      searchQuery,
      sortBy,
      selectedReceipt,
      currentPage,
      totalPages,
      receipts,
      filteredData,
      sort,
      getSortDirection,
      getSortIcon,
      selectReceipt,
      getSelectedReceiptStore,
      editReceipt,
      deleteReceipt,
      formatDate,
      previousPage,
      nextPage
    };
  }
});

categorizedDescribe('Comprehensive Accessibility Test Suite', AccessibilityTestCategories.COMPREHENSIVE, () => {
  let pinia: any;
  let router: any;
  let i18n: any;

  beforeEach(async () => {
    pinia = createPinia();
    setActivePinia(pinia);

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/receipts', component: { template: '<div>Receipts</div>' } }
      ]
    });

    i18n = createI18n({
      locale: 'en',
      messages: { en: {} }
    });

    await router.push('/');
    await router.isReady();

    // Clear previous accessibility test results
    accessibilityTester.clearResults();
  });

  categorizedIt('should test form accessibility comprehensively',
    [TestCategory.ACCESSIBILITY, TestCategory.FORMS],
    async () => {
      const wrapper = mount(createFormComponent(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Test comprehensive form accessibility
      const results = await testFullAccessibility(wrapper, 'FormComponent', {
        profile: 'forms',
        testKeyboard: true,
        testAria: true,
        testSemantics: true
      });

      expect(results.axeResult.passed).toBe(true);
      expect(results.keyboardResult?.keyboardAccessible).toBe(true);
      expect(results.ariaResult?.passed).toBe(true);

      // Test form-specific features
      const form = wrapper.find('form');
      expect(form.attributes('aria-labelledby')).toBeTruthy();

      // Test required field indicators
      const requiredFields = wrapper.findAll('input[required]');
      requiredFields.forEach(field => {
        expect(field.attributes('aria-invalid')).toBeDefined();
      });

      // Test error message association
      const errorElements = wrapper.findAll('[role="alert"]');
      errorElements.forEach(error => {
        expect(error.attributes('role')).toBe('alert');
      });

      // Test fieldset and legend usage
      const fieldsets = wrapper.findAll('fieldset');
      fieldsets.forEach(fieldset => {
        const legend = fieldset.find('legend');
        expect(legend.exists()).toBe(true);
      });

      wrapper.unmount();
    }
  );

  categorizedIt('should test navigation accessibility comprehensively',
    [TestCategory.ACCESSIBILITY, TestCategory.NAVIGATION],
    async () => {
      const wrapper = mount(createNavigationComponent(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Test navigation accessibility
      const results = await testFullAccessibility(wrapper, 'NavigationComponent', {
        profile: 'navigation',
        testKeyboard: true,
        testAria: true,
        testSemantics: true
      });

      expect(results.axeResult.passed).toBe(true);
      expect(results.keyboardResult?.keyboardAccessible).toBe(true);
      expect(results.ariaResult?.passed).toBe(true);
      expect(results.semanticsResult?.passed).toBe(true);

      // Test landmark regions
      const main = wrapper.find('main');
      expect(main.exists()).toBe(true);
      expect(main.attributes('role')).toBe('main');

      const header = wrapper.find('header');
      expect(header.exists()).toBe(true);
      expect(header.attributes('role')).toBe('banner');

      const footer = wrapper.find('footer');
      expect(footer.exists()).toBe(true);
      expect(footer.attributes('role')).toBe('contentinfo');

      // Test navigation elements
      const navElements = wrapper.findAll('nav');
      navElements.forEach(nav => {
        expect(nav.attributes('aria-label') || nav.attributes('aria-labelledby')).toBeTruthy();
      });

      // Test dropdown menus
      const dropdownButtons = wrapper.findAll('[aria-haspopup="true"]');
      dropdownButtons.forEach(button => {
        expect(button.attributes('aria-expanded')).toBeDefined();
        expect(button.attributes('aria-controls')).toBeTruthy();
      });

      // Test skip links
      const skipLinks = wrapper.findAll('.skip-link');
      expect(skipLinks.length).toBeGreaterThan(0);

      wrapper.unmount();
    }
  );

  categorizedIt('should test modal accessibility comprehensively',
    [TestCategory.ACCESSIBILITY, TestCategory.MODAL],
    async () => {
      const wrapper = mount(createModalComponent(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Test initial state
      await testAccessibility(wrapper, 'ModalComponent');

      // Open modal
      await wrapper.find('[data-testid="open-modal"]').trigger('click');
      await wrapper.vm.$nextTick();

      // Test modal accessibility
      const modal = wrapper.find('[role="dialog"]');
      expect(modal.exists()).toBe(true);
      expect(modal.attributes('aria-modal')).toBe('true');
      expect(modal.attributes('aria-labelledby')).toBeTruthy();
      expect(modal.attributes('aria-describedby')).toBeTruthy();

      // Test focus management
      const modalInput = wrapper.find('#modal-input');
      expect(modalInput.exists()).toBe(true);

      // Test close button accessibility
      const closeButton = wrapper.find('[data-testid="close-modal"]');
      expect(closeButton.attributes('aria-label')).toBeTruthy();

      // Test keyboard interactions
      await testKeyboardAccessibility(wrapper, 'ModalComponent');

      // Test modal with open state
      const results = await testFullAccessibility(wrapper, 'ModalComponent', {
        profile: 'comprehensive'
      });

      expect(results.axeResult.passed).toBe(true);

      wrapper.unmount();
    }
  );

  categorizedIt('should test data table accessibility comprehensively',
    [TestCategory.ACCESSIBILITY, TestCategory.TABLES],
    async () => {
      const wrapper = mount(createDataTableComponent(), {
        global: {
          plugins: [pinia, router, i18n]
        }
      });

      await wrapper.vm.$nextTick();

      // Test data table accessibility
      const results = await testFullAccessibility(wrapper, 'DataTableComponent', {
        profile: 'comprehensive',
        testKeyboard: true,
        testAria: true,
        testSemantics: true
      });

      expect(results.axeResult.passed).toBe(true);
      expect(results.keyboardResult?.keyboardAccessible).toBe(true);
      expect(results.ariaResult?.passed).toBe(true);

      // Test table structure
      const table = wrapper.find('table');
      expect(table.exists()).toBe(true);
      expect(table.attributes('role')).toBe('table');

      // Test caption
      const caption = wrapper.find('caption');
      expect(caption.exists()).toBe(true);

      // Test headers
      const headers = wrapper.findAll('th');
      headers.forEach(header => {
        expect(header.attributes('role')).toBe('columnheader');
      });

      // Test sortable headers
      const sortableHeaders = wrapper.findAll('th[aria-sort]');
      sortableHeaders.forEach(header => {
        expect(['none', 'ascending', 'descending']).toContain(header.attributes('aria-sort'));
      });

      // Test table region
      const tableWrapper = wrapper.find('[role="region"]');
      expect(tableWrapper.exists()).toBe(true);
      expect(tableWrapper.attributes('aria-labelledby')).toBeTruthy();

      // Test search functionality
      const searchInput = wrapper.find('#search');
      expect(searchInput.attributes('type')).toBe('search');
      expect(searchInput.attributes('aria-describedby')).toBeTruthy();

      // Test live region for updates
      const liveRegion = wrapper.find('[aria-live]');
      expect(liveRegion.exists()).toBe(true);

      wrapper.unmount();
    }
  );

  categorizedIt('should test color contrast across all components',
    [TestCategory.ACCESSIBILITY, TestCategory.COLOR_CONTRAST],
    async () => {
      const components = [
        createFormComponent(),
        createNavigationComponent(),
        createModalComponent(),
        createDataTableComponent()
      ];

      for (const component of components) {
        const wrapper = mount(component, {
          global: {
            plugins: [pinia, router, i18n]
          }
        });

        await wrapper.vm.$nextTick();

        // Test color contrast
        const results = await axeStrict(wrapper.element, {
          rules: {
            'color-contrast': { enabled: true },
            'color-contrast-enhanced': { enabled: true }
          }
        });

        const contrastViolations = results.violations.filter(
          violation => violation.id.includes('color-contrast')
        );

        expect(contrastViolations).toHaveLength(0);

        wrapper.unmount();
      }
    }
  );

  categorizedIt('should test keyboard navigation patterns',
    [TestCategory.ACCESSIBILITY, TestCategory.KEYBOARD],
    async () => {
      const components = [
        { component: createFormComponent(), name: 'Form' },
        { component: createNavigationComponent(), name: 'Navigation' },
        { component: createDataTableComponent(), name: 'DataTable' }
      ];

      for (const { component, name } of components) {
        const wrapper = mount(component, {
          global: {
            plugins: [pinia, router, i18n]
          }
        });

        await wrapper.vm.$nextTick();

        // Test keyboard accessibility
        const keyboardResult = await accessibilityTester.testKeyboardNavigation(wrapper, {
          testEscape: true,
          testEnterSpace: true
        });

        expect(keyboardResult.keyboardAccessible).toBe(true);
        expect(keyboardResult.focusableElements.length).toBeGreaterThan(0);

        // Test tab order
        const focusableElements = wrapper.element.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        let tabIndex = 0;
        focusableElements.forEach(element => {
          const elementTabIndex = parseInt(element.getAttribute('tabindex') || '0');
          if (elementTabIndex >= 0) {
            expect(elementTabIndex).toBeGreaterThanOrEqual(tabIndex);
            tabIndex = elementTabIndex;
          }
        });

        wrapper.unmount();
      }
    }
  );

  categorizedIt('should test ARIA implementation across components',
    [TestCategory.ACCESSIBILITY, TestCategory.ARIA],
    async () => {
      const components = [
        createFormComponent(),
        createNavigationComponent(),
        createModalComponent(),
        createDataTableComponent()
      ];

      for (const component of components) {
        const wrapper = mount(component, {
          global: {
            plugins: [pinia, router, i18n]
          }
        });

        await wrapper.vm.$nextTick();

        // Test ARIA implementation
        const ariaResult = accessibilityTester.testAriaLabeling(wrapper);
        expect(ariaResult.passed).toBe(true);

        // Test specific ARIA patterns
        const elementsWithAria = wrapper.element.querySelectorAll('[aria-*]');
        elementsWithAria.forEach(element => {
          // Check for valid ARIA attributes
          const ariaAttributes = Array.from(element.attributes)
            .filter(attr => attr.name.startsWith('aria-'));

          ariaAttributes.forEach(attr => {
            expect(attr.value).toBeTruthy();
          });
        });

        wrapper.unmount();
      }
    }
  );

  categorizedIt('should generate comprehensive accessibility report',
    [TestCategory.ACCESSIBILITY, TestCategory.REPORTING],
    async () => {
      // Run tests on all components to generate comprehensive data
      const components = [
        { component: createFormComponent(), name: 'Form' },
        { component: createNavigationComponent(), name: 'Navigation' },
        { component: createModalComponent(), name: 'Modal' },
        { component: createDataTableComponent(), name: 'DataTable' }
      ];

      for (const { component, name } of components) {
        const wrapper = mount(component, {
          global: {
            plugins: [pinia, router, i18n]
          }
        });

        await wrapper.vm.$nextTick();

        await accessibilityTester.testComponent(wrapper, {
          componentName: name,
          testName: 'Comprehensive accessibility test',
          profile: 'comprehensive'
        });

        wrapper.unmount();
      }

      // Generate and validate report
      const report = accessibilityTester.generateReport();

      expect(report.totalTests).toBeGreaterThan(0);
      expect(report.passedTests).toBe(report.totalTests);
      expect(report.failedTests).toBe(0);

      // Log report for analysis
      console.log('📊 Accessibility Test Report:', report);

      // Verify report structure
      expect(report).toHaveProperty('totalTests');
      expect(report).toHaveProperty('passedTests');
      expect(report).toHaveProperty('failedTests');
      expect(report).toHaveProperty('violationsByImpact');
      expect(report).toHaveProperty('violationsByRule');
      expect(report).toHaveProperty('results');
    }
  );
});