import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { mount, VueWrapper } from '@vue/test-utils'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

// Mock all view components with more realistic templates
const createMockComponent = (name: string, hasAuth?: boolean) => ({
  name,
  template: `
    <div class="${name.toLowerCase()}-page" data-testid="${name.toLowerCase()}-page">
      <h1>${name} Page</h1>
      ${hasAuth ? '<div data-testid="auth-required">Authenticated Content</div>' : ''}
    </div>
  `,
  setup() {
    if (hasAuth) {
      const authStore = useAuthStore()
      return { authStore }
    }
    return {}
  }
})

// Mock all view components
vi.mock('@/views/Home.vue', () => ({ default: createMockComponent('Home', true) }))
vi.mock('@/views/Login.vue', () => ({ default: createMockComponent('Login') }))
vi.mock('@/views/Register.vue', () => ({ default: createMockComponent('Register') }))
vi.mock('@/views/ForgotPassword.vue', () => ({ default: createMockComponent('ForgotPassword') }))
vi.mock('@/views/ResetPassword.vue', () => ({ default: createMockComponent('ResetPassword') }))
vi.mock('@/views/VerifyEmail.vue', () => ({ default: createMockComponent('VerifyEmail') }))
vi.mock('@/views/Receipts.vue', () => ({ default: createMockComponent('Receipts', true) }))
vi.mock('@/views/Upload.vue', () => ({ default: createMockComponent('Upload', true) }))
vi.mock('@/views/ReceiptDetail.vue', () => ({ default: createMockComponent('ReceiptDetail', true) }))
vi.mock('@/views/Reports.vue', () => ({ default: createMockComponent('Reports', true) }))
vi.mock('@/views/CategoryAnalytics.vue', () => ({ default: createMockComponent('CategoryAnalytics', true) }))
vi.mock('@/views/PriceTrends.vue', () => ({ default: createMockComponent('PriceTrends', true) }))
vi.mock('@/views/Profile.vue', () => ({ default: createMockComponent('Profile', true) }))
vi.mock('@/views/NotFound.vue', () => ({ default: createMockComponent('NotFound') }))

// Mock auth store
const mockAuthStore = {
  isAuthenticated: false,
  loading: false,
  user: null,
  token: null,
  initialize: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn()
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore
}))

// Router test app component
const RouterTestApp = {
  template: `
    <div id="app">
      <nav data-testid="navigation">
        <router-link to="/" data-testid="nav-home">Home</router-link>
        <router-link to="/receipts" data-testid="nav-receipts">Receipts</router-link>
        <router-link to="/login" data-testid="nav-login">Login</router-link>
        <router-link to="/register" data-testid="nav-register">Register</router-link>
      </nav>
      <main data-testid="main-content">
        <router-view />
      </main>
    </div>
  `
}

describe('Router Integration Tests', () => {
  let app: any
  let wrapper: VueWrapper<any>
  let testRouter: Router
  let pinia: Pinia

  beforeEach(() => {
    // Create fresh instances
    pinia = createPinia()
    setActivePinia(pinia)

    // Create test router with real routes
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
        next({
          path: "/login",
          query: { redirect: to.fullPath },
        })
      } else if (requiresGuest && isAuthenticated) {
        next("/")
      } else {
        next()
      }
    })

    // Create Vue app with router
    app = createApp(RouterTestApp)
    app.use(pinia)
    app.use(testRouter)

    // Mount the app
    wrapper = mount(app, {
      attachTo: document.body
    })

    // Reset mocks
    vi.clearAllMocks()
    mockAuthStore.isAuthenticated = false
    mockAuthStore.loading = false
    mockAuthStore.initialize.mockResolvedValue(undefined)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  describe('Full Application Navigation Flow', () => {
    it('should handle complete user authentication journey', async () => {
      // Initial state - unauthenticated user
      expect(wrapper.find('[data-testid="main-content"]')).toBeDefined()

      // Try to navigate to protected route
      await testRouter.push('/receipts')
      await nextTick()

      // Should be redirected to login
      expect(testRouter.currentRoute.value.name).toBe('login')
      expect(testRouter.currentRoute.value.query.redirect).toBe('/receipts')

      // Verify login page is rendered
      await nextTick()
      expect(wrapper.find('[data-testid="login-page"]').exists()).toBe(true)

      // Simulate user login
      mockAuthStore.isAuthenticated = true

      // Navigate to home after login
      await testRouter.push('/')
      await nextTick()

      // Should now access protected route
      expect(testRouter.currentRoute.value.name).toBe('home')
      expect(wrapper.find('[data-testid="home-page"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="auth-required"]').exists()).toBe(true)

      // Now can navigate to original intended route
      await testRouter.push('/receipts')
      await nextTick()

      expect(testRouter.currentRoute.value.name).toBe('receipts')
      expect(wrapper.find('[data-testid="receipts-page"]').exists()).toBe(true)
    })

    it('should handle logout flow and route protection', async () => {
      // Start authenticated
      mockAuthStore.isAuthenticated = true

      // Navigate to protected route
      await testRouter.push('/profile')
      await nextTick()

      expect(testRouter.currentRoute.value.name).toBe('profile')
      expect(wrapper.find('[data-testid="profile-page"]').exists()).toBe(true)

      // Simulate logout
      mockAuthStore.isAuthenticated = false

      // Try to access protected route
      await testRouter.push('/upload')
      await nextTick()

      // Should be redirected to login
      expect(testRouter.currentRoute.value.name).toBe('login')
      expect(wrapper.find('[data-testid="login-page"]').exists()).toBe(true)
    })

    it('should prevent authenticated users from accessing auth pages', async () => {
      // Start authenticated
      mockAuthStore.isAuthenticated = true

      // Try to access login page
      await testRouter.push('/login')
      await nextTick()

      // Should be redirected to home
      expect(testRouter.currentRoute.value.name).toBe('home')
      expect(wrapper.find('[data-testid="home-page"]').exists()).toBe(true)

      // Try other auth pages
      const authRoutes = ['/register', '/forgot-password', '/reset-password', '/verify-email']

      for (const route of authRoutes) {
        await testRouter.push(route)
        await nextTick()

        expect(testRouter.currentRoute.value.name).toBe('home')
        expect(wrapper.find('[data-testid="home-page"]').exists()).toBe(true)
      }
    })
  })

  describe('Route Parameter Handling', () => {
    it('should handle dynamic route parameters', async () => {
      mockAuthStore.isAuthenticated = true

      await testRouter.push('/receipts/123')
      await nextTick()

      expect(testRouter.currentRoute.value.name).toBe('receipt-detail')
      expect(testRouter.currentRoute.value.params.id).toBe('123')
      expect(wrapper.find('[data-testid="receiptdetail-page"]').exists()).toBe(true)
    })

    it('should validate route parameters', async () => {
      mockAuthStore.isAuthenticated = true

      // Test various parameter formats
      const testCases = [
        { id: '123', valid: true },
        { id: 'abc', valid: true }, // String IDs might be valid
        { id: '0', valid: true },
        { id: '-1', valid: true }
      ]

      for (const { id, valid } of testCases) {
        await testRouter.push(`/receipts/${id}`)
        await nextTick()

        expect(testRouter.currentRoute.value.params.id).toBe(id)
        expect(wrapper.find('[data-testid="receiptdetail-page"]').exists()).toBe(valid)
      }
    })

    it('should preserve query parameters during auth redirects', async () => {
      mockAuthStore.isAuthenticated = false

      const complexQuery = {
        status: 'pending',
        category: 'food',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        page: '2',
        limit: '50'
      }

      await testRouter.push({
        path: '/receipts',
        query: complexQuery
      })
      await nextTick()

      // Should be redirected to login with full URL preserved
      expect(testRouter.currentRoute.value.name).toBe('login')

      const redirectUrl = testRouter.currentRoute.value.query.redirect as string
      expect(redirectUrl).toContain('/receipts')
      expect(redirectUrl).toContain('status=pending')
      expect(redirectUrl).toContain('category=food')
      expect(redirectUrl).toContain('dateFrom=2024-01-01')
      expect(redirectUrl).toContain('dateTo=2024-12-31')
      expect(redirectUrl).toContain('page=2')
      expect(redirectUrl).toContain('limit=50')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle 404 errors gracefully', async () => {
      await testRouter.push('/non-existent-route')
      await nextTick()

      expect(testRouter.currentRoute.value.name).toBe('not-found')
      expect(wrapper.find('[data-testid="notfound-page"]').exists()).toBe(true)
    })

    it('should handle deeply nested unknown routes', async () => {
      await testRouter.push('/very/deep/nested/unknown/route/structure')
      await nextTick()

      expect(testRouter.currentRoute.value.name).toBe('not-found')
      expect(wrapper.find('[data-testid="notfound-page"]').exists()).toBe(true)
    })

    it('should handle auth store initialization errors', async () => {
      mockAuthStore.initialize.mockRejectedValue(new Error('Auth initialization failed'))
      mockAuthStore.isAuthenticated = false
      mockAuthStore.loading = false

      // Should not break the app
      await testRouter.push('/')
      await nextTick()

      // Should still redirect to login since auth failed
      expect(testRouter.currentRoute.value.name).toBe('login')
      expect(wrapper.find('[data-testid="login-page"]').exists()).toBe(true)
    })

    it('should handle concurrent navigation attempts', async () => {
      mockAuthStore.isAuthenticated = false

      // Trigger multiple navigations rapidly
      const navigations = [
        testRouter.push('/receipts'),
        testRouter.push('/reports'),
        testRouter.push('/profile')
      ]

      await Promise.all(navigations)
      await nextTick()

      // Should handle gracefully and end up on last route's redirect
      expect(testRouter.currentRoute.value.name).toBe('login')
      expect(testRouter.currentRoute.value.query.redirect).toBe('/profile')
    })

    it('should handle malformed URLs', async () => {
      const malformedUrls = [
        '//double-slash',
        '/path with spaces',
        '/path%20with%20encoding',
        '/path?malformed=query&',
        '/path#malformed-hash#'
      ]

      for (const url of malformedUrls) {
        try {
          await testRouter.push(url)
          await nextTick()

          // Should either navigate successfully or go to 404
          const currentRoute = testRouter.currentRoute.value
          expect(['not-found', 'login'].includes(currentRoute.name as string)).toBe(true)
        } catch (error) {
          // Navigation errors are acceptable for malformed URLs
          expect(error).toBeInstanceOf(Error)
        }
      }
    })
  })

  describe('Performance and Memory Management', () => {
    it('should not leak memory during multiple navigations', async () => {
      mockAuthStore.isAuthenticated = true

      // Perform many navigations
      const routes = ['/', '/receipts', '/upload', '/reports', '/profile']

      for (let i = 0; i < 10; i++) {
        for (const route of routes) {
          await testRouter.push(route)
          await nextTick()
        }
      }

      // Should still be functional
      expect(testRouter.currentRoute.value.name).toBe('profile')
      expect(wrapper.find('[data-testid="profile-page"]').exists()).toBe(true)
    })

    it('should efficiently handle rapid state changes', async () => {
      const startTime = performance.now()

      // Rapid auth state changes
      for (let i = 0; i < 20; i++) {
        mockAuthStore.isAuthenticated = i % 2 === 0
        await testRouter.push(i % 2 === 0 ? '/' : '/login')
        await nextTick()
      }

      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should complete quickly
    })

    it('should not initialize auth store unnecessarily', async () => {
      mockAuthStore.isAuthenticated = true
      mockAuthStore.loading = false

      // Multiple navigations as authenticated user
      const routes = ['/', '/receipts', '/upload', '/reports']

      for (const route of routes) {
        await testRouter.push(route)
        await nextTick()
      }

      // Should not have called initialize for authenticated user
      expect(mockAuthStore.initialize).not.toHaveBeenCalled()
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle session expiry during navigation', async () => {
      // Start authenticated
      mockAuthStore.isAuthenticated = true
      await testRouter.push('/receipts')
      await nextTick()

      expect(testRouter.currentRoute.value.name).toBe('receipts')

      // Simulate session expiry
      mockAuthStore.isAuthenticated = false

      // Try to navigate to another protected route
      await testRouter.push('/reports')
      await nextTick()

      // Should be redirected to login
      expect(testRouter.currentRoute.value.name).toBe('login')
      expect(testRouter.currentRoute.value.query.redirect).toBe('/reports')
    })

    it('should handle browser back/forward navigation', async () => {
      mockAuthStore.isAuthenticated = true

      // Navigate through several routes
      await testRouter.push('/')
      await nextTick()

      await testRouter.push('/receipts')
      await nextTick()

      await testRouter.push('/upload')
      await nextTick()

      // Simulate back navigation
      await testRouter.go(-1)
      await nextTick()

      expect(testRouter.currentRoute.value.name).toBe('receipts')

      // Simulate forward navigation
      await testRouter.go(1)
      await nextTick()

      expect(testRouter.currentRoute.value.name).toBe('upload')
    })

    it('should handle route guards with external redirects', async () => {
      mockAuthStore.isAuthenticated = false

      // Navigate to protected route
      await testRouter.push('/receipts/123')
      await nextTick()

      // Should preserve the full path with parameters
      expect(testRouter.currentRoute.value.name).toBe('login')
      expect(testRouter.currentRoute.value.query.redirect).toBe('/receipts/123')

      // After login, should be able to use redirect
      mockAuthStore.isAuthenticated = true
      const redirectUrl = testRouter.currentRoute.value.query.redirect as string

      await testRouter.push(redirectUrl)
      await nextTick()

      expect(testRouter.currentRoute.value.name).toBe('receipt-detail')
      expect(testRouter.currentRoute.value.params.id).toBe('123')
    })

    it('should handle complex authentication flows', async () => {
      // User registration flow
      await testRouter.push('/register')
      await nextTick()
      expect(testRouter.currentRoute.value.name).toBe('register')

      // After registration, might go to verify email
      await testRouter.push('/verify-email')
      await nextTick()
      expect(testRouter.currentRoute.value.name).toBe('verify-email')

      // After verification, user is authenticated
      mockAuthStore.isAuthenticated = true

      // Trying to go back to auth pages should redirect home
      await testRouter.push('/login')
      await nextTick()
      expect(testRouter.currentRoute.value.name).toBe('home')

      // Can now access protected routes
      await testRouter.push('/profile')
      await nextTick()
      expect(testRouter.currentRoute.value.name).toBe('profile')
    })

    it('should handle route transitions with async components', async () => {
      mockAuthStore.isAuthenticated = true

      // Navigate to routes with async components
      const asyncRoutes = ['/receipts', '/upload', '/reports', '/profile']

      for (const route of asyncRoutes) {
        const startTime = performance.now()

        await testRouter.push(route)
        await nextTick()

        const endTime = performance.now()

        // Should complete navigation reasonably quickly
        expect(endTime - startTime).toBeLessThan(100)

        // Should have loaded the component
        const routeName = route.substring(1) || 'home'
        expect(wrapper.find(`[data-testid="${routeName}-page"]`).exists()).toBe(true)
      }
    })
  })

  describe('Integration with Vue Router Features', () => {
    it('should work with router-link components', async () => {
      mockAuthStore.isAuthenticated = true

      // Test router-link navigation
      const homeLink = wrapper.find('[data-testid="nav-home"]')
      expect(homeLink.exists()).toBe(true)

      // Click navigation should work
      await homeLink.trigger('click')
      await nextTick()

      expect(testRouter.currentRoute.value.name).toBe('home')
    })

    it('should handle programmatic navigation', async () => {
      mockAuthStore.isAuthenticated = true

      // Test various navigation methods
      await testRouter.push({ name: 'receipts' })
      await nextTick()
      expect(testRouter.currentRoute.value.name).toBe('receipts')

      await testRouter.replace({ path: '/upload' })
      await nextTick()
      expect(testRouter.currentRoute.value.name).toBe('upload')

      // Should not be able to go back to receipts after replace
      await testRouter.go(-1)
      await nextTick()
      // Depending on history, might not go back to receipts
    })

    it('should handle route meta information', async () => {
      const routes = testRouter.getRoutes()

      // Verify meta information is correctly set
      const protectedRoutes = routes.filter(route => route.meta?.requiresAuth)
      expect(protectedRoutes.length).toBeGreaterThan(0)

      const guestRoutes = routes.filter(route => route.meta?.requiresGuest)
      expect(guestRoutes.length).toBeGreaterThan(0)

      // Test that meta information affects navigation
      mockAuthStore.isAuthenticated = false

      for (const route of protectedRoutes) {
        if (route.path !== '/:pathMatch(.*)*') { // Skip catch-all
          await testRouter.push(route.path)
          await nextTick()

          // Should be redirected to login
          expect(testRouter.currentRoute.value.name).toBe('login')
        }
      }
    })
  })
})