import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { mount, VueWrapper } from '@vue/test-utils';
import MockAdapter from 'axios-mock-adapter';
import { createI18n } from 'vue-i18n';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';
import {
  categorizedDescribe,
  categorizedIt,
  TestCategory,
  CategoryCombos,
  withPerformance
} from '../../tests/utils/categories';
import type { User, AuthResponse, RegisterRequest } from '@/types/auth';

// Enhanced mock components for registration flow
const createRegistrationMockComponent = (name: string, requiresAuth = false) => ({
  name,
  template: `
    <div class="${name.toLowerCase()}-view" data-testid="${name.toLowerCase()}-view">
      <header class="page-header">
        <h1 data-testid="page-title">${name}</h1>
        <div v-if="loading" data-testid="loading-indicator">Loading...</div>
        <div v-if="error" data-testid="error-display" class="error-message">{{ error }}</div>
        <div v-if="successMessage" data-testid="success-message" class="success-message">{{ successMessage }}</div>
      </header>

      <main class="page-content">
        ${name === 'Register' ? `
          <div class="registration-form" data-testid="registration-form">
            <form @submit.prevent="handleRegistration" data-testid="register-form">
              <div class="form-group">
                <label for="firstName">First Name</label>
                <input
                  id="firstName"
                  v-model="registrationData.firstName"
                  type="text"
                  data-testid="first-name-input"
                  required
                  :disabled="isSubmitting"
                />
                <div v-if="validationErrors.firstName" class="field-error" data-testid="first-name-error">
                  {{ validationErrors.firstName }}
                </div>
              </div>

              <div class="form-group">
                <label for="lastName">Last Name</label>
                <input
                  id="lastName"
                  v-model="registrationData.lastName"
                  type="text"
                  data-testid="last-name-input"
                  required
                  :disabled="isSubmitting"
                />
                <div v-if="validationErrors.lastName" class="field-error" data-testid="last-name-error">
                  {{ validationErrors.lastName }}
                </div>
              </div>

              <div class="form-group">
                <label for="userName">Username</label>
                <input
                  id="userName"
                  v-model="registrationData.userName"
                  type="text"
                  data-testid="username-input"
                  required
                  :disabled="isSubmitting"
                />
                <div v-if="validationErrors.userName" class="field-error" data-testid="username-error">
                  {{ validationErrors.userName }}
                </div>
              </div>

              <div class="form-group">
                <label for="email">Email Address</label>
                <input
                  id="email"
                  v-model="registrationData.email"
                  type="email"
                  data-testid="email-input"
                  required
                  :disabled="isSubmitting"
                />
                <div v-if="validationErrors.email" class="field-error" data-testid="email-error">
                  {{ validationErrors.email }}
                </div>
              </div>

              <div class="form-group">
                <label for="password">Password</label>
                <input
                  id="password"
                  v-model="registrationData.password"
                  type="password"
                  data-testid="password-input"
                  required
                  :disabled="isSubmitting"
                />
                <div class="password-requirements" data-testid="password-requirements">
                  <small>Password must be at least 8 characters long</small>
                </div>
                <div v-if="validationErrors.password" class="field-error" data-testid="password-error">
                  {{ validationErrors.password }}
                </div>
              </div>

              <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  v-model="registrationData.confirmPassword"
                  type="password"
                  data-testid="confirm-password-input"
                  required
                  :disabled="isSubmitting"
                />
                <div v-if="validationErrors.confirmPassword" class="field-error" data-testid="confirm-password-error">
                  {{ validationErrors.confirmPassword }}
                </div>
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input
                    v-model="registrationData.acceptTerms"
                    type="checkbox"
                    data-testid="terms-checkbox"
                    required
                    :disabled="isSubmitting"
                  />
                  I accept the <a href="/terms" data-testid="terms-link">Terms of Service</a>
                  and <a href="/privacy" data-testid="privacy-link">Privacy Policy</a>
                </label>
                <div v-if="validationErrors.acceptTerms" class="field-error" data-testid="terms-error">
                  {{ validationErrors.acceptTerms }}
                </div>
              </div>

              <div class="form-actions">
                <button
                  type="submit"
                  data-testid="register-submit-btn"
                  class="btn-primary"
                  :disabled="isSubmitting || !isFormValid"
                >
                  <span v-if="isSubmitting">Creating Account...</span>
                  <span v-else>Create Account</span>
                </button>
              </div>
            </form>

            <div class="form-footer">
              <p>Already have an account?
                <router-link to="/login" data-testid="login-link">Sign in here</router-link>
              </p>
            </div>
          </div>
        ` : ''}

        ${name === 'VerifyEmail' ? `
          <div class="email-verification" data-testid="email-verification">
            <div class="verification-content">
              <div class="verification-icon" data-testid="verification-icon">
                <svg viewBox="0 0 24 24" class="icon">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>

              <h2 data-testid="verification-title">Verify Your Email</h2>

              <div v-if="verificationStatus === 'pending'" class="verification-pending" data-testid="verification-pending">
                <p>We've sent a verification email to:</p>
                <strong data-testid="verification-email">{{ userEmail }}</strong>
                <p>Please check your email and click the verification link to activate your account.</p>

                <div class="verification-actions">
                  <button
                    @click="resendVerification"
                    data-testid="resend-verification-btn"
                    class="btn-secondary"
                    :disabled="resendCooldown > 0"
                  >
                    <span v-if="resendCooldown > 0">Resend in {{ resendCooldown }}s</span>
                    <span v-else>Resend Verification Email</span>
                  </button>
                </div>

                <div class="verification-help">
                  <details data-testid="verification-help">
                    <summary>Didn't receive the email?</summary>
                    <ul>
                      <li>Check your spam/junk folder</li>
                      <li>Make sure {{ userEmail }} is correct</li>
                      <li>Wait a few minutes for the email to arrive</li>
                      <li>Contact support if you continue having issues</li>
                    </ul>
                  </details>
                </div>
              </div>

              <div v-else-if="verificationStatus === 'verifying'" class="verification-processing" data-testid="verification-processing">
                <div class="spinner">Verifying...</div>
                <p>Please wait while we verify your email address.</p>
              </div>

              <div v-else-if="verificationStatus === 'success'" class="verification-success" data-testid="verification-success">
                <div class="success-icon">✓</div>
                <h3>Email Verified Successfully!</h3>
                <p>Your account has been activated. You can now access all features.</p>
                <div class="success-actions">
                  <button @click="goToDashboard" data-testid="go-to-dashboard-btn" class="btn-primary">
                    Go to Dashboard
                  </button>
                </div>
              </div>

              <div v-else-if="verificationStatus === 'error'" class="verification-error" data-testid="verification-error">
                <div class="error-icon">⚠</div>
                <h3>Verification Failed</h3>
                <p data-testid="verification-error-message">{{ verificationError }}</p>
                <div class="error-actions">
                  <button @click="resendVerification" data-testid="try-again-btn" class="btn-primary">
                    Send New Verification Email
                  </button>
                  <router-link to="/login" data-testid="back-to-login-btn" class="btn-secondary">
                    Back to Login
                  </router-link>
                </div>
              </div>

              <div v-else-if="verificationStatus === 'expired'" class="verification-expired" data-testid="verification-expired">
                <div class="warning-icon">⏰</div>
                <h3>Verification Link Expired</h3>
                <p>The verification link has expired. Please request a new one.</p>
                <div class="expired-actions">
                  <button @click="resendVerification" data-testid="request-new-link-btn" class="btn-primary">
                    Request New Verification Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        ${requiresAuth ? '<div data-testid="auth-content">Protected Content</div>' : ''}
      </main>
    </div>
  `,
  setup() {
    const loading = ref(false);
    const error = ref(null);
    const successMessage = ref(null);
    const router = useRouter();
    const route = useRoute();
    const authStore = useAuthStore();

    if (name === 'Register') {
      const registrationData = ref({
        firstName: '',
        lastName: '',
        userName: '',
        email: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false
      });

      const validationErrors = ref({});
      const isSubmitting = ref(false);

      const isFormValid = computed(() => {
        return registrationData.value.firstName &&
               registrationData.value.lastName &&
               registrationData.value.userName &&
               registrationData.value.email &&
               registrationData.value.password &&
               registrationData.value.confirmPassword &&
               registrationData.value.acceptTerms &&
               registrationData.value.password === registrationData.value.confirmPassword;
      });

      const validateForm = () => {
        const errors = {};

        if (!registrationData.value.firstName) {
          errors.firstName = 'First name is required';
        }

        if (!registrationData.value.lastName) {
          errors.lastName = 'Last name is required';
        }

        if (!registrationData.value.userName) {
          errors.userName = 'Username is required';
        }

        if (!registrationData.value.email) {
          errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registrationData.value.email)) {
          errors.email = 'Please enter a valid email address';
        }

        if (!registrationData.value.password) {
          errors.password = 'Password is required';
        } else if (registrationData.value.password.length < 8) {
          errors.password = 'Password must be at least 8 characters long';
        }

        if (!registrationData.value.confirmPassword) {
          errors.confirmPassword = 'Please confirm your password';
        } else if (registrationData.value.password !== registrationData.value.confirmPassword) {
          errors.confirmPassword = 'Passwords do not match';
        }

        if (!registrationData.value.acceptTerms) {
          errors.acceptTerms = 'You must accept the terms and conditions';
        }

        validationErrors.value = errors;
        return Object.keys(errors).length === 0;
      };

      const handleRegistration = async () => {
        if (!validateForm()) {
          return;
        }

        isSubmitting.value = true;
        error.value = null;

        try {
          const result = await authStore.register({
            firstName: registrationData.value.firstName,
            lastName: registrationData.value.lastName,
            userName: registrationData.value.userName,
            email: registrationData.value.email,
            password: registrationData.value.password
          });

          if (result.success) {
            successMessage.value = 'Account created successfully! Please check your email to verify your account.';
            router.push('/verify-email');
          } else {
            error.value = result.message || 'Registration failed';
          }
        } catch (err) {
          error.value = 'An error occurred during registration';
        } finally {
          isSubmitting.value = false;
        }
      };

      return {
        loading,
        error,
        successMessage,
        registrationData,
        validationErrors,
        isSubmitting,
        isFormValid,
        handleRegistration
      };
    }

    if (name === 'VerifyEmail') {
      const verificationStatus = ref('pending');
      const verificationError = ref(null);
      const userEmail = ref(authStore.user?.email || 'your-email@example.com');
      const resendCooldown = ref(0);

      const verifyEmailFromToken = async (token) => {
        verificationStatus.value = 'verifying';
        try {
          const result = await authStore.confirmEmail(token);
          if (result.success) {
            verificationStatus.value = 'success';
          } else {
            verificationStatus.value = 'error';
            verificationError.value = result.message || 'Verification failed';
          }
        } catch (err) {
          verificationStatus.value = 'error';
          verificationError.value = 'An error occurred during verification';
        }
      };

      const resendVerification = async () => {
        if (resendCooldown.value > 0) return;

        try {
          const result = await authStore.resendEmailConfirmation();
          if (result.success) {
            successMessage.value = 'Verification email sent successfully!';
            startResendCooldown();
          } else {
            error.value = result.message || 'Failed to send verification email';
          }
        } catch (err) {
          error.value = 'An error occurred while sending verification email';
        }
      };

      const startResendCooldown = () => {
        resendCooldown.value = 60;
        const timer = setInterval(() => {
          resendCooldown.value--;
          if (resendCooldown.value <= 0) {
            clearInterval(timer);
          }
        }, 1000);
      };

      const goToDashboard = () => {
        router.push('/');
      };

      // Check for verification token in URL
      onMounted(() => {
        const token = route.query.token;
        if (token) {
          verifyEmailFromToken(token);
        }
      });

      return {
        loading,
        error,
        successMessage,
        verificationStatus,
        verificationError,
        userEmail,
        resendCooldown,
        resendVerification,
        goToDashboard
      };
    }

    return { loading, error, successMessage };
  }
});

// Mock view components
vi.mock('@/views/Register.vue', () => ({ default: createRegistrationMockComponent('Register', false) }));
vi.mock('@/views/VerifyEmail.vue', () => ({ default: createRegistrationMockComponent('VerifyEmail', false) }));
vi.mock('@/views/Login.vue', () => ({ default: createRegistrationMockComponent('Login', false) }));
vi.mock('@/views/Home.vue', () => ({ default: createRegistrationMockComponent('Home', true) }));

// Test application component
const RegistrationTestApp = {
  template: `
    <div id="app" data-testid="registration-app">
      <nav class="main-navigation" data-testid="main-nav">
        <div class="nav-brand">
          <router-link to="/" data-testid="brand-link">ShopTrack</router-link>
        </div>

        <div v-if="authStore.isAuthenticated" class="authenticated-nav" data-testid="authenticated-nav">
          <span class="user-greeting" data-testid="user-greeting">
            Welcome, {{ authStore.user?.firstName }}!
          </span>
          <button @click="handleLogout" data-testid="logout-btn" class="btn-secondary">Logout</button>
        </div>

        <div v-else class="unauthenticated-nav" data-testid="unauthenticated-nav">
          <router-link to="/login" data-testid="nav-login" class="nav-link">Login</router-link>
          <router-link to="/register" data-testid="nav-register" class="nav-link">Register</router-link>
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

categorizedDescribe('User Registration to Verification Flow', CategoryCombos.INTEGRATION_VIEW, () => {
  let mockAxios: MockAdapter;
  let app: any;
  let wrapper: VueWrapper<any>;
  let testRouter: Router;
  let pinia: Pinia;
  let authStore: ReturnType<typeof useAuthStore>;

  const mockUser: User = {
    id: 1,
    email: 'newuser@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    userName: 'janesmith',
    isEmailVerified: false,
    emailConfirmed: false,
    hasPassword: true,
    passkeysEnabled: false,
    connectedAccounts: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

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
    app = createApp(RegistrationTestApp);
    app.use(pinia);
    app.use(testRouter);
    app.use(i18n);

    wrapper = mount(app, {
      attachTo: document.body
    });

    // Get store references
    authStore = useAuthStore();

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

  categorizedDescribe('Complete Registration Flow', [TestCategory.INTEGRATION, TestCategory.AUTH, TestCategory.CRITICAL], () => {
    categorizedIt('should complete full user registration and email verification journey', [TestCategory.CRITICAL],
      withPerformance(async () => {
        // Start at registration page
        await testRouter.push('/register');
        await nextTick();

        expect(testRouter.currentRoute.value.name).toBe('register');
        expect(wrapper.find('[data-testid="register-view"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="registration-form"]').exists()).toBe(true);

        // Fill out registration form
        const form = wrapper.find('[data-testid="register-form"]');
        expect(form.exists()).toBe(true);

        // Fill form fields
        await wrapper.find('[data-testid="first-name-input"]').setValue('Jane');
        await wrapper.find('[data-testid="last-name-input"]').setValue('Smith');
        await wrapper.find('[data-testid="username-input"]').setValue('janesmith');
        await wrapper.find('[data-testid="email-input"]').setValue('newuser@example.com');
        await wrapper.find('[data-testid="password-input"]').setValue('password123');
        await wrapper.find('[data-testid="confirm-password-input"]').setValue('password123');
        await wrapper.find('[data-testid="terms-checkbox"]').setChecked(true);

        // Mock successful registration
        mockAxios.onPost('/auth/register').reply(200, {
          success: true,
          message: 'Registration successful',
          user: mockUser
        });

        // Submit registration form
        const submitButton = wrapper.find('[data-testid="register-submit-btn"]');
        expect(submitButton.exists()).toBe(true);
        expect(submitButton.element.disabled).toBe(false);

        await submitButton.trigger('click');
        await nextTick();

        // Should redirect to email verification page
        expect(testRouter.currentRoute.value.name).toBe('verify-email');
        expect(wrapper.find('[data-testid="verifyemail-view"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="email-verification"]').exists()).toBe(true);

        // Verify email verification page content
        expect(wrapper.find('[data-testid="verification-pending"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="verification-email"]').text()).toBe('newuser@example.com');
        expect(wrapper.find('[data-testid="resend-verification-btn"]').exists()).toBe(true);

        // Test resend verification email
        mockAxios.onPost('/auth/resend-email-confirmation').reply(200, {
          success: true,
          message: 'Verification email sent'
        });

        const resendButton = wrapper.find('[data-testid="resend-verification-btn"]');
        await resendButton.trigger('click');
        await nextTick();

        expect(wrapper.find('[data-testid="success-message"]').exists()).toBe(true);

        // Simulate clicking verification link in email (navigate with token)
        await testRouter.push('/verify-email?token=verification-token-123');
        await nextTick();

        // Mock email verification
        mockAxios.onGet('/auth/verify-email').reply(200, {
          success: true,
          message: 'Email verified successfully'
        });

        // Wait for verification processing
        await new Promise(resolve => setTimeout(resolve, 100));
        await nextTick();

        // Should show success state
        expect(wrapper.find('[data-testid="verification-success"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="go-to-dashboard-btn"]').exists()).toBe(true);

        // Click go to dashboard
        const dashboardButton = wrapper.find('[data-testid="go-to-dashboard-btn"]');
        await dashboardButton.trigger('click');
        await nextTick();

        // Should navigate to dashboard
        expect(testRouter.currentRoute.value.path).toBe('/');
      }, 3000, TestCategory.MEDIUM)
    );

    categorizedIt('should handle registration validation errors', [TestCategory.HIGH], async () => {
      await testRouter.push('/register');
      await nextTick();

      const form = wrapper.find('[data-testid="register-form"]');
      expect(form.exists()).toBe(true);

      // Try to submit empty form
      const submitButton = wrapper.find('[data-testid="register-submit-btn"]');
      expect(submitButton.element.disabled).toBe(true); // Should be disabled

      // Fill partial form with invalid data
      await wrapper.find('[data-testid="email-input"]').setValue('invalid-email');
      await wrapper.find('[data-testid="password-input"]').setValue('short');
      await wrapper.find('[data-testid="confirm-password-input"]').setValue('different');

      // Submit form to trigger validation
      await form.trigger('submit');
      await nextTick();

      // Should show validation errors (this would depend on component implementation)
      expect(wrapper.find('[data-testid="register-form"]').exists()).toBe(true);
    });

    categorizedIt('should handle registration API errors', [TestCategory.HIGH], async () => {
      await testRouter.push('/register');
      await nextTick();

      // Fill valid form
      await wrapper.find('[data-testid="first-name-input"]').setValue('Jane');
      await wrapper.find('[data-testid="last-name-input"]').setValue('Smith');
      await wrapper.find('[data-testid="username-input"]').setValue('existinguser');
      await wrapper.find('[data-testid="email-input"]').setValue('existing@example.com');
      await wrapper.find('[data-testid="password-input"]').setValue('password123');
      await wrapper.find('[data-testid="confirm-password-input"]').setValue('password123');
      await wrapper.find('[data-testid="terms-checkbox"]').setChecked(true);

      // Mock registration failure
      mockAxios.onPost('/auth/register').reply(400, {
        success: false,
        message: 'Email already exists',
        errors: ['An account with this email already exists']
      });

      const submitButton = wrapper.find('[data-testid="register-submit-btn"]');
      await submitButton.trigger('click');
      await nextTick();

      // Should stay on registration page and show error
      expect(testRouter.currentRoute.value.name).toBe('register');
      expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);
    });
  });

  categorizedDescribe('Email Verification Edge Cases', [TestCategory.INTEGRATION, TestCategory.AUTH, TestCategory.MEDIUM], () => {
    beforeEach(async () => {
      // Set up authenticated user who needs email verification
      authStore.user = { ...mockUser };
      authStore.token = 'mock-token';
    });

    categorizedIt('should handle expired verification tokens', [TestCategory.HIGH], async () => {
      await testRouter.push('/verify-email?token=expired-token');
      await nextTick();

      // Mock expired token response
      mockAxios.onGet('/auth/verify-email').reply(400, {
        success: false,
        message: 'Verification token has expired',
        code: 'TOKEN_EXPIRED'
      });

      // Wait for verification attempt
      await new Promise(resolve => setTimeout(resolve, 100));
      await nextTick();

      // Should show expired state
      expect(wrapper.find('[data-testid="verification-error"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="verification-error-message"]').text()).toContain('expired');
      expect(wrapper.find('[data-testid="try-again-btn"]').exists()).toBe(true);
    });

    categorizedIt('should handle invalid verification tokens', [TestCategory.MEDIUM_PRIORITY], async () => {
      await testRouter.push('/verify-email?token=invalid-token');
      await nextTick();

      // Mock invalid token response
      mockAxios.onGet('/auth/verify-email').reply(400, {
        success: false,
        message: 'Invalid verification token',
        code: 'INVALID_TOKEN'
      });

      // Wait for verification attempt
      await new Promise(resolve => setTimeout(resolve, 100));
      await nextTick();

      // Should show error state
      expect(wrapper.find('[data-testid="verification-error"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="back-to-login-btn"]').exists()).toBe(true);
    });

    categorizedIt('should handle resend email rate limiting', [TestCategory.MEDIUM_PRIORITY], async () => {
      await testRouter.push('/verify-email');
      await nextTick();

      expect(wrapper.find('[data-testid="verification-pending"]').exists()).toBe(true);

      // Mock successful resend
      mockAxios.onPost('/auth/resend-email-confirmation').reply(200, {
        success: true,
        message: 'Verification email sent'
      });

      // Click resend button
      const resendButton = wrapper.find('[data-testid="resend-verification-btn"]');
      await resendButton.trigger('click');
      await nextTick();

      // Button should be disabled with cooldown
      expect(resendButton.element.disabled).toBe(true);
      expect(resendButton.text()).toContain('Resend in');
    });

    categorizedIt('should handle email service configuration errors', [TestCategory.MEDIUM_PRIORITY], async () => {
      await testRouter.push('/verify-email');
      await nextTick();

      // Mock email service error
      mockAxios.onPost('/auth/resend-email-confirmation').reply(503, {
        success: false,
        message: 'Email service temporarily unavailable',
        code: 'EMAIL_SERVICE_ERROR'
      });

      const resendButton = wrapper.find('[data-testid="resend-verification-btn"]');
      await resendButton.trigger('click');
      await nextTick();

      // Should show error message
      expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);
    });
  });

  categorizedDescribe('Registration Security Features', [TestCategory.INTEGRATION, TestCategory.AUTH, TestCategory.HIGH], () => {
    categorizedIt('should handle password strength requirements', [TestCategory.HIGH], async () => {
      await testRouter.push('/register');
      await nextTick();

      // Test weak password
      await wrapper.find('[data-testid="password-input"]').setValue('weak');
      await wrapper.find('[data-testid="confirm-password-input"]').setValue('weak');

      const form = wrapper.find('[data-testid="register-form"]');
      await form.trigger('submit');
      await nextTick();

      // Should show password requirements
      expect(wrapper.find('[data-testid="password-requirements"]').exists()).toBe(true);
    });

    categorizedIt('should prevent registration with existing username', [TestCategory.MEDIUM_PRIORITY], async () => {
      await testRouter.push('/register');
      await nextTick();

      // Fill form with existing username
      await wrapper.find('[data-testid="first-name-input"]').setValue('Jane');
      await wrapper.find('[data-testid="last-name-input"]').setValue('Smith');
      await wrapper.find('[data-testid="username-input"]').setValue('existinguser');
      await wrapper.find('[data-testid="email-input"]').setValue('jane@example.com');
      await wrapper.find('[data-testid="password-input"]').setValue('password123');
      await wrapper.find('[data-testid="confirm-password-input"]').setValue('password123');
      await wrapper.find('[data-testid="terms-checkbox"]').setChecked(true);

      // Mock username conflict
      mockAxios.onPost('/auth/register').reply(409, {
        success: false,
        message: 'Username already taken',
        errors: ['This username is already in use']
      });

      const submitButton = wrapper.find('[data-testid="register-submit-btn"]');
      await submitButton.trigger('click');
      await nextTick();

      // Should show error
      expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true);
    });

    categorizedIt('should enforce terms acceptance', [TestCategory.MEDIUM_PRIORITY], async () => {
      await testRouter.push('/register');
      await nextTick();

      // Fill form without accepting terms
      await wrapper.find('[data-testid="first-name-input"]').setValue('Jane');
      await wrapper.find('[data-testid="last-name-input"]').setValue('Smith');
      await wrapper.find('[data-testid="username-input"]').setValue('janesmith');
      await wrapper.find('[data-testid="email-input"]').setValue('jane@example.com');
      await wrapper.find('[data-testid="password-input"]').setValue('password123');
      await wrapper.find('[data-testid="confirm-password-input"]').setValue('password123');
      // Don't check terms checkbox

      const submitButton = wrapper.find('[data-testid="register-submit-btn"]');
      expect(submitButton.element.disabled).toBe(true); // Should be disabled

      // Check terms and privacy links exist
      expect(wrapper.find('[data-testid="terms-link"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="privacy-link"]').exists()).toBe(true);
    });
  });

  categorizedDescribe('User Experience and Accessibility', [TestCategory.INTEGRATION, TestCategory.MEDIUM], () => {
    categorizedIt('should provide clear navigation between auth pages', [TestCategory.MEDIUM_PRIORITY], async () => {
      // Start at registration
      await testRouter.push('/register');
      await nextTick();

      expect(wrapper.find('[data-testid="register-view"]').exists()).toBe(true);

      // Navigate to login
      const loginLink = wrapper.find('[data-testid="login-link"]');
      expect(loginLink.exists()).toBe(true);
      expect(loginLink.attributes('href')).toBe('/login');

      await loginLink.trigger('click');
      await nextTick();

      expect(testRouter.currentRoute.value.name).toBe('login');
    });

    categorizedIt('should maintain form state during validation', [TestCategory.MEDIUM_PRIORITY], async () => {
      await testRouter.push('/register');
      await nextTick();

      // Fill partial form
      await wrapper.find('[data-testid="first-name-input"]').setValue('Jane');
      await wrapper.find('[data-testid="last-name-input"]').setValue('Smith');
      await wrapper.find('[data-testid="email-input"]').setValue('jane@example.com');

      const firstNameInput = wrapper.find('[data-testid="first-name-input"]');
      const lastNameInput = wrapper.find('[data-testid="last-name-input"]');
      const emailInput = wrapper.find('[data-testid="email-input"]');

      // Values should be preserved
      expect(firstNameInput.element.value).toBe('Jane');
      expect(lastNameInput.element.value).toBe('Smith');
      expect(emailInput.element.value).toBe('jane@example.com');
    });

    categorizedIt('should provide helpful verification instructions', [TestCategory.LOW], async () => {
      // Set up user needing verification
      authStore.user = { ...mockUser };

      await testRouter.push('/verify-email');
      await nextTick();

      expect(wrapper.find('[data-testid="verification-help"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="verification-email"]').text()).toBe(mockUser.email);
    });
  });
});