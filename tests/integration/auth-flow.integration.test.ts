import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { mount, VueWrapper } from '@vue/test-utils'
import MockAdapter from 'axios-mock-adapter'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { authService } from '@/services/auth.service'
import { csrfManager } from '@/composables/useCsrfToken'
import router from '@/router'
import type { User, AuthResponse, LoginRequest, RegisterRequest, UpdateProfileRequest } from '@/types/auth'

// Mock language settings service
vi.mock('@/services/languageSettings.service', () => ({
  languageSettingsService: {
    initializeFromUserSettings: vi.fn().mockResolvedValue(undefined)
  }
}))

// Mock CSRF manager
const mockCsrfManager = {
  getToken: vi.fn().mockResolvedValue('mock-csrf-token'),
  invalidateToken: vi.fn(),
  initialize: vi.fn().mockResolvedValue(undefined)
}

vi.mock('@/composables/useCsrfToken', () => ({
  csrfManager: mockCsrfManager
}))

// Mock all view components
const createMockComponent = (name: string, requiresAuth = false) => ({
  name,
  template: `
    <div class="${name.toLowerCase()}-view" data-testid="${name.toLowerCase()}-view">
      <h1>${name}</h1>
      ${requiresAuth ? '<div data-testid="auth-content">Protected Content</div>' : '<div data-testid="public-content">Public Content</div>'}
      <div data-testid="user-display" v-if="user">Welcome, {{ user.firstName }}!</div>
    </div>
  `,
  setup() {
    if (requiresAuth) {
      const authStore = useAuthStore()
      return { user: authStore.user }
    }
    return { user: null }
  }
})

vi.mock('@/views/Home.vue', () => ({ default: createMockComponent('Home', true) }))
vi.mock('@/views/Login.vue', () => ({ default: createMockComponent('Login', false) }))
vi.mock('@/views/Register.vue', () => ({ default: createMockComponent('Register', false) }))
vi.mock('@/views/ForgotPassword.vue', () => ({ default: createMockComponent('ForgotPassword', false) }))
vi.mock('@/views/ResetPassword.vue', () => ({ default: createMockComponent('ResetPassword', false) }))
vi.mock('@/views/VerifyEmail.vue', () => ({ default: createMockComponent('VerifyEmail', false) }))
vi.mock('@/views/Profile.vue', () => ({ default: createMockComponent('Profile', true) }))
vi.mock('@/views/Receipts.vue', () => ({ default: createMockComponent('Receipts', true) }))
vi.mock('@/views/NotFound.vue', () => ({ default: createMockComponent('NotFound', false) }))

// Test app component
const AuthTestApp = {
  template: `
    <div id="app">
      <nav data-testid="navbar">
        <div v-if="authStore.isAuthenticated" data-testid="authenticated-nav">
          <span data-testid="user-name">{{ authStore.user?.firstName }} {{ authStore.user?.lastName }}</span>
          <button @click="handleLogout" data-testid="logout-btn">Logout</button>
        </div>
        <div v-else data-testid="unauthenticated-nav">
          <router-link to="/login" data-testid="login-link">Login</router-link>
          <router-link to="/register" data-testid="register-link">Register</router-link>
        </div>
      </nav>

      <main data-testid="main-content">
        <div v-if="authStore.loading" data-testid="loading">Loading...</div>
        <div v-if="authStore.error" data-testid="auth-error">{{ authStore.error.message }}</div>
        <router-view v-slot="{ Component }" :key="$route.fullPath">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  `,
  setup() {
    const authStore = useAuthStore()

    const handleLogout = async () => {
      await authStore.logout()
    }

    return {
      authStore,
      handleLogout
    }
  }
}

describe('Authentication Flow Integration Tests', () => {
  let mockAxios: MockAdapter
  let app: any
  let wrapper: VueWrapper<any>
  let testRouter: Router
  let pinia: Pinia
  let authStore: ReturnType<typeof useAuthStore>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  // Sample user data
  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
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
  }

  beforeEach(() => {
    // Setup axios mock
    mockAxios = new MockAdapter(api)

    // Setup console spies
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Create fresh Pinia and router
    pinia = createPinia()
    setActivePinia(pinia)

    testRouter = createRouter({
      history: createWebHistory(),
      routes: router.getRoutes()
    })

    // Copy navigation guards
    testRouter.beforeEach(async (to, from, next) => {
      const authStore = useAuthStore()

      if (!authStore.isAuthenticated && !authStore.loading) {
        await authStore.initialize()
      }

      const isAuthenticated = authStore.isAuthenticated
      const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
      const requiresGuest = to.matched.some((record) => record.meta.requiresGuest)

      if (requiresAuth && !isAuthenticated) {
        next({ path: "/login", query: { redirect: to.fullPath } })
      } else if (requiresGuest && isAuthenticated) {
        next("/")
      } else {
        next()
      }
    })

    // Create and mount app
    app = createApp(AuthTestApp)
    app.use(pinia)
    app.use(testRouter)

    wrapper = mount(app, {
      attachTo: document.body
    })

    // Get auth store reference
    authStore = useAuthStore()

    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    mockAxios.restore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('Complete Authentication Lifecycle', () => {
    it('should handle full user registration and login flow', async () => {
      // Start on homepage - should redirect to login
      await testRouter.push('/')
      await nextTick()

      expect(testRouter.currentRoute.value.name).toBe('login')
      expect(wrapper.find('[data-testid="login-view"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="unauthenticated-nav"]').exists()).toBe(true)

      // Navigate to registration
      await testRouter.push('/register')
      await nextTick()

      expect(wrapper.find('[data-testid="register-view"]').exists()).toBe(true)

      // Mock successful registration
      const registerRequest: RegisterRequest = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        userName: 'newuser'
      }

      const registerResponse: AuthResponse = {
        success: true,
        message: 'Registration successful',
        user: {
          ...mockUser,
          email: registerRequest.email,
          firstName: registerRequest.firstName!,
          lastName: registerRequest.lastName!,
          userName: registerRequest.userName!,
          isEmailVerified: false
        }
      }

      mockAxios.onPost('/auth/register').reply(200, registerResponse)

      // Perform registration through auth store
      const result = await authStore.register(registerRequest)
      await nextTick()

      expect(result.success).toBe(true)
      expect(wrapper.find('[data-testid="loading"]').exists()).toBe(false)

      // Now login with the registered user
      const loginRequest: LoginRequest = {
        email: registerRequest.email,
        password: registerRequest.password
      }

      const loginResponse: AuthResponse = {
        success: true,
        message: 'Login successful',
        user: {
          ...registerResponse.user!,
          isEmailVerified: true,
          emailConfirmed: true
        }
      }

      mockAxios.onPost('/auth/login').reply(200, loginResponse)

      const loginResult = await authStore.login(loginRequest)
      await nextTick()

      expect(loginResult.success).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.user?.email).toBe(registerRequest.email)

      // Should now show authenticated navigation
      expect(wrapper.find('[data-testid="authenticated-nav"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="user-name"]').text()).toContain('New User')
    })

    it('should handle login with redirect to intended destination', async () => {
      // Try to access protected route while unauthenticated
      await testRouter.push('/profile')
      await nextTick()

      // Should be redirected to login with redirect query
      expect(testRouter.currentRoute.value.name).toBe('login')
      expect(testRouter.currentRoute.value.query.redirect).toBe('/profile')

      // Mock successful login
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        message: 'Login successful',
        user: mockUser
      })

      const loginResult = await authStore.login({
        email: mockUser.email,
        password: 'password123'
      })
      await nextTick()

      expect(loginResult.success).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)

      // Navigate to the intended destination
      const redirectUrl = testRouter.currentRoute.value.query.redirect as string
      await testRouter.push(redirectUrl)
      await nextTick()

      expect(testRouter.currentRoute.value.name).toBe('profile')
      expect(wrapper.find('[data-testid="profile-view"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="auth-content"]').exists()).toBe(true)
    })

    it('should handle logout and clear session', async () => {
      // First, login user
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        message: 'Login successful',
        user: mockUser
      })

      await authStore.login({
        email: mockUser.email,
        password: 'password123'
      })
      await nextTick()

      expect(authStore.isAuthenticated).toBe(true)

      // Navigate to protected route
      await testRouter.push('/receipts')
      await nextTick()

      expect(testRouter.currentRoute.value.name).toBe('receipts')
      expect(wrapper.find('[data-testid="receipts-view"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="user-display"]').text()).toContain('Welcome, John!')

      // Mock logout endpoint
      mockAxios.onPost('/auth/logout').reply(200, { message: 'Logged out' })

      // Perform logout
      const logoutBtn = wrapper.find('[data-testid="logout-btn"]')
      expect(logoutBtn.exists()).toBe(true)

      await logoutBtn.trigger('click')
      await nextTick()

      // Should be logged out
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBeNull()
      expect(wrapper.find('[data-testid="unauthenticated-nav"]').exists()).toBe(true)

      // Try to access protected route again
      await testRouter.push('/profile')
      await nextTick()

      // Should redirect to login
      expect(testRouter.currentRoute.value.name).toBe('login')
    })

    it('should handle session expiry during navigation', async () => {
      // Setup authenticated user
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        user: mockUser
      })

      await authStore.login({
        email: mockUser.email,
        password: 'password123'
      })
      await nextTick()

      expect(authStore.isAuthenticated).toBe(true)

      // Navigate to protected route
      await testRouter.push('/receipts')
      await nextTick()

      expect(testRouter.currentRoute.value.name).toBe('receipts')

      // Simulate API call that returns 401 (session expired)
      mockAxios.onGet('/api/protected-data').reply(401, { error: 'Session expired' })

      try {
        await api.get('/api/protected-data')
      } catch (error) {
        // 401 error should trigger logout through API interceptor
      }

      await nextTick()

      // Should be logged out due to session expiry
      expect(authStore.isAuthenticated).toBe(false)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle login errors gracefully', async () => {
      // Navigate to login
      await testRouter.push('/login')
      await nextTick()

      // Mock failed login
      mockAxios.onPost('/auth/login').reply(400, {
        success: false,
        message: 'Invalid credentials',
        errors: ['Email or password is incorrect']
      })

      const loginResult = await authStore.login({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      })
      await nextTick()

      expect(loginResult.success).toBe(false)
      expect(authStore.error).toBeDefined()
      expect(authStore.error?.code).toBe('LOGIN_FAILED')
      expect(wrapper.find('[data-testid="auth-error"]').text()).toContain('Invalid credentials')
      expect(authStore.isAuthenticated).toBe(false)
    })

    it('should handle registration validation errors', async () => {
      await testRouter.push('/register')
      await nextTick()

      // Mock validation errors
      mockAxios.onPost('/auth/register').reply(422, {
        success: false,
        message: 'Validation failed',
        errors: [
          'Email is already taken',
          'Password must be at least 8 characters'
        ]
      })

      const registerResult = await authStore.register({
        email: 'taken@example.com',
        password: 'short',
        firstName: 'Test',
        lastName: 'User',
        userName: 'testuser'
      })
      await nextTick()

      expect(registerResult.success).toBe(false)
      expect(authStore.error).toBeDefined()
      expect(authStore.error?.code).toBe('REGISTRATION_FAILED')
      expect(wrapper.find('[data-testid="auth-error"]').exists()).toBe(true)
    })

    it('should handle network errors during authentication', async () => {
      // Mock network error
      mockAxios.onPost('/auth/login').networkError()

      const loginResult = await authStore.login({
        email: 'test@example.com',
        password: 'password123'
      })
      await nextTick()

      expect(loginResult.success).toBe(false)
      expect(authStore.error?.code).toBe('LOGIN_ERROR')
      expect(wrapper.find('[data-testid="auth-error"]').exists()).toBe(true)
    })

    it('should handle server errors gracefully', async () => {
      // Mock server error
      mockAxios.onPost('/auth/login').reply(500, { error: 'Internal server error' })

      const loginResult = await authStore.login({
        email: 'test@example.com',
        password: 'password123'
      })
      await nextTick()

      expect(loginResult.success).toBe(false)
      expect(authStore.error).toBeDefined()
      expect(consoleErrorSpy).toHaveBeenCalledWith('Login error:', expect.any(Error))
    })

    it('should handle logout errors but clear local state', async () => {
      // First login
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        user: mockUser
      })

      await authStore.login({
        email: mockUser.email,
        password: 'password123'
      })
      await nextTick()

      expect(authStore.isAuthenticated).toBe(true)

      // Mock logout error
      mockAxios.onPost('/auth/logout').reply(500, { error: 'Logout failed' })

      await authStore.logout()
      await nextTick()

      // Should still clear local state even with API error
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error))
    })
  })

  describe('Profile Management Flow', () => {
    it('should handle profile updates', async () => {
      // Login first
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        user: mockUser
      })

      await authStore.login({
        email: mockUser.email,
        password: 'password123'
      })
      await nextTick()

      // Navigate to profile
      await testRouter.push('/profile')
      await nextTick()

      expect(wrapper.find('[data-testid="profile-view"]').exists()).toBe(true)

      // Mock profile update
      const updateRequest: UpdateProfileRequest = {
        firstName: 'Jane',
        lastName: 'Smith',
        userName: 'janesmith'
      }

      const updatedUser = {
        ...mockUser,
        firstName: updateRequest.firstName!,
        lastName: updateRequest.lastName!,
        userName: updateRequest.userName!,
        updatedAt: '2024-01-02T00:00:00Z'
      }

      mockAxios.onPut('/auth/profile').reply(200, {
        success: true,
        message: 'Profile updated',
        user: updatedUser
      })

      const updateResult = await authStore.updateProfile(updateRequest)
      await nextTick()

      expect(updateResult.success).toBe(true)
      expect(authStore.user?.firstName).toBe('Jane')
      expect(authStore.user?.lastName).toBe('Smith')
      expect(wrapper.find('[data-testid="user-name"]').text()).toContain('Jane Smith')
    })

    it('should handle password change flow', async () => {
      // Login first
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        user: mockUser
      })

      await authStore.login({
        email: mockUser.email,
        password: 'password123'
      })
      await nextTick()

      // Mock password change
      mockAxios.onPost('/auth/change-password').reply(200, {
        success: true,
        message: 'Password changed successfully'
      })

      const changeResult = await authStore.changePassword({
        currentPassword: 'password123',
        newPassword: 'newpassword456'
      })
      await nextTick()

      expect(changeResult.success).toBe(true)
      expect(authStore.user?.hasPassword).toBe(true)
    })
  })

  describe('Password Reset Flow', () => {
    it('should handle complete password reset flow', async () => {
      // Start forgot password
      await testRouter.push('/forgot-password')
      await nextTick()

      expect(wrapper.find('[data-testid="forgotpassword-view"]').exists()).toBe(true)

      // Mock forgot password request
      mockAxios.onPost('/auth/forgot-password').reply(200, {
        success: true,
        message: 'Password reset email sent'
      })

      const forgotResult = await authStore.forgotPassword({
        email: 'reset@example.com'
      })
      await nextTick()

      expect(forgotResult.success).toBe(true)
      expect(forgotResult.message).toBe('Password reset email sent')

      // Navigate to reset password (simulating email link click)
      await testRouter.push('/reset-password')
      await nextTick()

      expect(wrapper.find('[data-testid="resetpassword-view"]').exists()).toBe(true)

      // Mock password reset
      mockAxios.onPost('/auth/reset-password').reply(200, {
        success: true,
        message: 'Password reset successful'
      })

      const resetResult = await authStore.resetPassword({
        token: 'reset-token-123',
        email: 'reset@example.com',
        password: 'newpassword123'
      })
      await nextTick()

      expect(resetResult.success).toBe(true)
    })

    it('should handle expired reset tokens', async () => {
      await testRouter.push('/reset-password')
      await nextTick()

      // Mock expired token
      mockAxios.onPost('/auth/reset-password').reply(400, {
        success: false,
        message: 'Reset token has expired',
        errors: ['Token is no longer valid']
      })

      const resetResult = await authStore.resetPassword({
        token: 'expired-token',
        email: 'test@example.com',
        password: 'newpassword123'
      })
      await nextTick()

      expect(resetResult.success).toBe(false)
      expect(authStore.error?.code).toBe('RESET_PASSWORD_ERROR')
      expect(wrapper.find('[data-testid="auth-error"]').text()).toContain('Reset token has expired')
    })
  })

  describe('Email Verification Flow', () => {
    it('should handle email confirmation', async () => {
      // Login with unverified email
      const unverifiedUser = { ...mockUser, isEmailVerified: false, emailConfirmed: false }

      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        user: unverifiedUser
      })

      await authStore.login({
        email: unverifiedUser.email,
        password: 'password123'
      })
      await nextTick()

      expect(authStore.isEmailConfirmed).toBe(false)

      // Navigate to verification page
      await testRouter.push('/verify-email')
      await nextTick()

      expect(wrapper.find('[data-testid="verifyemail-view"]').exists()).toBe(true)

      // Mock email confirmation
      mockAxios.onGet('/auth/verify-email').reply(200, {
        success: true,
        message: 'Email confirmed successfully'
      })

      const confirmResult = await authStore.confirmEmail('verification-token-123')
      await nextTick()

      expect(confirmResult.success).toBe(true)
      expect(authStore.user?.emailConfirmed).toBe(true)
    })

    it('should handle resend confirmation email', async () => {
      // Login with unverified email
      const unverifiedUser = { ...mockUser, isEmailVerified: false, emailConfirmed: false }

      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        user: unverifiedUser
      })

      await authStore.login({
        email: unverifiedUser.email,
        password: 'password123'
      })
      await nextTick()

      // Mock resend confirmation
      mockAxios.onPost('/auth/resend-email-confirmation').reply(200, {
        success: true,
        message: 'Confirmation email sent'
      })

      const resendResult = await authStore.resendEmailConfirmation()
      await nextTick()

      expect(resendResult.success).toBe(true)
    })

    it('should handle email service configuration errors', async () => {
      // Mock email service not configured
      mockAxios.onPost('/auth/resend-email-confirmation').reply(415, {
        error: 'Email service not configured'
      })

      const resendResult = await authStore.resendEmailConfirmation()
      await nextTick()

      expect(resendResult.success).toBe(false)
      expect(authStore.error?.message).toContain('Email service is not configured')
    })
  })

  describe('Session Management', () => {
    it('should handle session initialization on app start', async () => {
      // Mock current user check during initialization
      mockAxios.onGet('/auth/me').reply(200, mockUser)

      // Initialize auth store
      await authStore.initialize()
      await nextTick()

      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.user).toEqual(mockUser)
      expect(authStore.loading).toBe(false)
    })

    it('should handle no existing session', async () => {
      // Mock no current user
      mockAxios.onGet('/auth/me').reply(401, { error: 'Unauthorized' })

      await authStore.initialize()
      await nextTick()

      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBeNull()
      expect(authStore.loading).toBe(false)
    })

    it('should handle token refresh', async () => {
      // First login
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        user: mockUser
      })

      await authStore.login({
        email: mockUser.email,
        password: 'password123'
      })
      await nextTick()

      // Mock successful token refresh
      mockAxios.onPost('/auth/refresh-token').reply(200, {
        success: true,
        user: mockUser
      })

      const refreshSuccess = await authStore.refreshTokens()
      await nextTick()

      expect(refreshSuccess).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)
    })

    it('should handle failed token refresh', async () => {
      // First login
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        user: mockUser
      })

      await authStore.login({
        email: mockUser.email,
        password: 'password123'
      })
      await nextTick()

      // Mock failed token refresh
      mockAxios.onPost('/auth/refresh-token').reply(401, { error: 'Refresh failed' })
      mockAxios.onPost('/auth/logout').reply(200, { message: 'Logged out' })

      const refreshSuccess = await authStore.refreshTokens()
      await nextTick()

      expect(refreshSuccess).toBe(false)
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.sessionExpired).toBe(true)
    })
  })

  describe('Advanced Authentication Features', () => {
    it('should handle OAuth login flow', async () => {
      await testRouter.push('/login')
      await nextTick()

      // Mock OAuth login
      mockAxios.onPost('/auth/oauth/google').reply(200, {
        success: true,
        message: 'OAuth login successful',
        user: {
          ...mockUser,
          connectedAccounts: [
            { provider: 'google', providerId: '12345', email: mockUser.email }
          ]
        }
      })

      const oauthResult = await authStore.loginWithOAuth({
        provider: 'google',
        code: 'oauth-code-123',
        redirectUri: 'http://localhost:5173/auth/callback'
      })
      await nextTick()

      expect(oauthResult.success).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.connectedAccounts).toHaveLength(1)
    })

    it('should handle passkey registration and login', async () => {
      // First login normally
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        user: mockUser
      })

      await authStore.login({
        email: mockUser.email,
        password: 'password123'
      })
      await nextTick()

      // Mock passkey registration
      mockAxios.onPost('/passkey/register').reply(200, {
        success: true,
        message: 'Passkey registered successfully'
      })

      const passkeyRegResult = await authStore.registerPasskey({
        credential: {
          id: 'passkey-id-123',
          rawId: new ArrayBuffer(32),
          type: 'public-key',
          response: {
            attestationObject: new ArrayBuffer(256),
            clientDataJSON: new ArrayBuffer(128)
          }
        }
      })
      await nextTick()

      expect(passkeyRegResult.success).toBe(true)
      expect(authStore.user?.passkeysEnabled).toBe(true)

      // Logout and try passkey login
      mockAxios.onPost('/auth/logout').reply(200, { message: 'Logged out' })
      await authStore.logout()
      await nextTick()

      // Mock passkey login
      const passkeyUser = { ...mockUser, passkeysEnabled: true }
      mockAxios.onPost('/passkey/verify').reply(200, {
        success: true,
        user: passkeyUser
      })

      const passkeyLoginResult = await authStore.loginWithPasskey({
        credential: {
          id: 'passkey-id-123',
          rawId: new ArrayBuffer(32),
          type: 'public-key',
          response: {
            authenticatorData: new ArrayBuffer(64),
            clientDataJSON: new ArrayBuffer(128),
            signature: new ArrayBuffer(64)
          }
        }
      })
      await nextTick()

      expect(passkeyLoginResult.success).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.passkeysEnabled).toBe(true)
    })

    it('should handle two-factor authentication', async () => {
      // Mock 2FA required response to login
      mockAxios.onPost('/auth/login').reply(200, {
        success: false,
        message: 'Two-factor authentication required',
        requiresTwoFactor: true
      })

      const loginResult = await authStore.login({
        email: mockUser.email,
        password: 'password123'
      })
      await nextTick()

      expect(loginResult.success).toBe(false)
      expect(loginResult.message).toContain('Two-factor authentication required')

      // Mock 2FA verification
      mockAxios.onPost('/auth/2fa/verify').reply(200, {
        success: true,
        message: '2FA verification successful',
        user: mockUser
      })

      const twoFactorResult = await authStore.verifyTwoFactor({
        code: '123456'
      })
      await nextTick()

      expect(twoFactorResult.success).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)
    })
  })

  describe('Concurrent Operations and Edge Cases', () => {
    it('should handle concurrent login attempts', async () => {
      // Setup multiple login requests
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        user: mockUser
      })

      const loginPromises = [
        authStore.login({ email: mockUser.email, password: 'password123' }),
        authStore.login({ email: mockUser.email, password: 'password123' }),
        authStore.login({ email: mockUser.email, password: 'password123' })
      ]

      const results = await Promise.all(loginPromises)
      await nextTick()

      // All should succeed, but only one user session
      results.forEach(result => {
        expect(result.success).toBe(true)
      })
      expect(authStore.isAuthenticated).toBe(true)
    })

    it('should handle rapid authentication state changes', async () => {
      // Login
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        user: mockUser
      })

      await authStore.login({ email: mockUser.email, password: 'password123' })
      expect(authStore.isAuthenticated).toBe(true)

      // Rapid logout/login cycles
      mockAxios.onPost('/auth/logout').reply(200, { message: 'Logged out' })

      for (let i = 0; i < 5; i++) {
        await authStore.logout()
        expect(authStore.isAuthenticated).toBe(false)

        await authStore.login({ email: mockUser.email, password: 'password123' })
        expect(authStore.isAuthenticated).toBe(true)
      }

      await nextTick()

      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.user).toBeDefined()
    })

    it('should handle session expiry callback', async () => {
      const sessionExpiredSpy = vi.fn()
      authStore.setOnSessionExpiredCallback(sessionExpiredSpy)

      // Login first
      mockAxios.onPost('/auth/login').reply(200, {
        success: true,
        user: mockUser
      })

      await authStore.login({ email: mockUser.email, password: 'password123' })
      await nextTick()

      // Mock logout (simulating session expiry)
      mockAxios.onPost('/auth/logout').reply(200, { message: 'Logged out' })

      await authStore.logout()
      await nextTick()

      expect(sessionExpiredSpy).toHaveBeenCalled()
    })
  })
})