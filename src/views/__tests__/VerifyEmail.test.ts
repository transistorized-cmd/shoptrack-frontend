import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import VerifyEmail from '../VerifyEmail.vue'

// Mock dependencies
const mockAuthService = {
  confirmEmail: vi.fn(),
  resendEmailConfirmation: vi.fn()
}

const mockAuthStore = {
  initialize: vi.fn()
}

const mockRoute = {
  query: {}
}

vi.mock('@/services/auth.service', () => ({
  authService: mockAuthService
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore
}))

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute
}))

// Mock window.alert
Object.defineProperty(window, 'alert', {
  writable: true,
  value: vi.fn()
})

describe('VerifyEmail.vue', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.query = {}
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Initial State Rendering', () => {
    it('renders main container with proper layout', () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      wrapper = mount(VerifyEmail)

      const container = wrapper.find('.min-h-screen.flex.items-center.justify-center')
      expect(container.exists()).toBe(true)
      expect(container.classes()).toContain('bg-gray-50')

      const innerContainer = wrapper.find('.max-w-md.w-full.space-y-8')
      expect(innerContainer.exists()).toBe(true)
    })

    it('renders header section with icon and title', () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      wrapper = mount(VerifyEmail)

      const iconContainer = wrapper.find('.h-12.w-12')
      expect(iconContainer.exists()).toBe(true)

      const title = wrapper.find('h2')
      expect(title.exists()).toBe(true)
      expect(title.classes()).toContain('text-3xl')
      expect(title.classes()).toContain('font-extrabold')
      expect(title.classes()).toContain('text-gray-900')

      const description = wrapper.find('p.text-center.text-sm.text-gray-600')
      expect(description.exists()).toBe(true)
    })
  })

  describe('Loading State', () => {
    it('displays loading state when verification is in progress', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockImplementation(() => new Promise(() => {})) // Never resolves

      wrapper = mount(VerifyEmail)
      await nextTick()

      expect(wrapper.text()).toContain('Verifying email...')
      expect(wrapper.text()).toContain('Please wait while we verify your email address.')

      const loadingIcon = wrapper.find('.animate-spin')
      expect(loadingIcon.exists()).toBe(true)
      expect(loadingIcon.classes()).toContain('h-6')
      expect(loadingIcon.classes()).toContain('w-6')
      expect(loadingIcon.classes()).toContain('text-blue-600')

      const loadingMessage = wrapper.find('.bg-blue-50')
      expect(loadingMessage.exists()).toBe(true)
      expect(loadingMessage.text()).toContain('Verifying your email...')
      expect(loadingMessage.text()).toContain('Please wait while we confirm your email address.')
    })

    it('shows blue icon and styling during loading', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockImplementation(() => new Promise(() => {}))

      wrapper = mount(VerifyEmail)
      await nextTick()

      const iconContainer = wrapper.find('.bg-blue-100')
      expect(iconContainer.exists()).toBe(true)

      const loadingSpinner = wrapper.find('.animate-spin.text-blue-600')
      expect(loadingSpinner.exists()).toBe(true)
    })
  })

  describe('Success State', () => {
    it('displays success state after successful verification', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockResolvedValue({ success: true })

      wrapper = mount(VerifyEmail)
      await flushPromises()

      expect(wrapper.text()).toContain('Email verified!')
      expect(wrapper.text()).toContain('Your email has been successfully verified. Welcome to ShopTrack!')

      const successIcon = wrapper.find('.bg-green-100')
      expect(successIcon.exists()).toBe(true)

      const checkmark = wrapper.find('svg.text-green-600')
      expect(checkmark.exists()).toBe(true)

      const successMessage = wrapper.find('.bg-green-50')
      expect(successMessage.exists()).toBe(true)
      expect(successMessage.text()).toContain('Email verified successfully')
      expect(successMessage.text()).toContain('Your email has been confirmed. You can now access all features')
    })

    it('shows continue to app button when verification succeeds', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockResolvedValue({ success: true })

      wrapper = mount(VerifyEmail)
      await flushPromises()

      const continueButton = wrapper.find('router-link[to="/"]')
      expect(continueButton.exists()).toBe(true)
      expect(continueButton.text()).toBe('Continue to App')
      expect(continueButton.classes()).toContain('bg-green-600')
      expect(continueButton.classes()).toContain('hover:bg-green-700')
    })

    it('calls authStore.initialize after successful verification', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockResolvedValue({ success: true })

      wrapper = mount(VerifyEmail)
      await flushPromises()

      expect(mockAuthStore.initialize).toHaveBeenCalled()
    })
  })

  describe('Error State', () => {
    it('displays error state when verification fails', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockResolvedValue({
        success: false,
        message: 'Token expired'
      })

      wrapper = mount(VerifyEmail)
      await flushPromises()

      expect(wrapper.text()).toContain('Verification failed')
      expect(wrapper.text()).toContain('Token expired')

      const errorMessage = wrapper.find('.bg-red-50')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toContain('Verification failed')
      expect(errorMessage.text()).toContain('Token expired')
    })

    it('displays specific error messages for different HTTP status codes', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }

      const error400 = new Error('Bad Request')
      error400.response = { status: 400 }
      mockAuthService.confirmEmail.mockRejectedValue(error400)

      wrapper = mount(VerifyEmail)
      await flushPromises()

      expect(wrapper.text()).toContain('Invalid or expired verification link')

      wrapper.unmount()

      const error404 = new Error('Not Found')
      error404.response = { status: 404 }
      mockAuthService.confirmEmail.mockRejectedValue(error404)

      wrapper = mount(VerifyEmail)
      await flushPromises()

      expect(wrapper.text()).toContain('User not found')
    })

    it('shows back to login and resend buttons when verification fails', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockRejectedValue(new Error('Verification failed'))

      wrapper = mount(VerifyEmail)
      await flushPromises()

      const backToLoginButton = wrapper.find('router-link[to="/login"]')
      expect(backToLoginButton.exists()).toBe(true)
      expect(backToLoginButton.text()).toBe('Back to Login')
      expect(backToLoginButton.classes()).toContain('bg-blue-600')

      const resendButton = wrapper.find('button')
      expect(resendButton.exists()).toBe(true)
      expect(resendButton.text()).toBe('Resend Verification Email')
      expect(resendButton.classes()).toContain('border-gray-300')
    })
  })

  describe('Invalid Parameters', () => {
    it('shows error when token is missing', async () => {
      mockRoute.query = { email: 'test@example.com' } // Missing token

      wrapper = mount(VerifyEmail)
      await flushPromises()

      expect(wrapper.text()).toContain('Verification failed')
      expect(wrapper.text()).toContain('Invalid verification link. Please check your email for the correct link.')
    })

    it('shows error when email is missing', async () => {
      mockRoute.query = { token: 'test-token' } // Missing email

      wrapper = mount(VerifyEmail)
      await flushPromises()

      expect(wrapper.text()).toContain('Verification failed')
      expect(wrapper.text()).toContain('Invalid verification link. Please check your email for the correct link.')
    })

    it('shows error when both token and email are missing', async () => {
      mockRoute.query = {} // Both missing

      wrapper = mount(VerifyEmail)
      await flushPromises()

      expect(wrapper.text()).toContain('Verification failed')
      expect(wrapper.text()).toContain('Invalid verification link. Please check your email for the correct link.')
    })
  })

  describe('Resend Verification', () => {
    it('handles resend verification email successfully', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockRejectedValue(new Error('Token expired'))
      mockAuthService.resendEmailConfirmation.mockResolvedValue({ success: true })

      wrapper = mount(VerifyEmail)
      await flushPromises()

      const resendButton = wrapper.find('button')
      await resendButton.trigger('click')
      await flushPromises()

      expect(mockAuthService.resendEmailConfirmation).toHaveBeenCalled()
      expect(window.alert).toHaveBeenCalledWith('Verification email sent! Please check your inbox.')
    })

    it('handles resend verification email failure', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockRejectedValue(new Error('Token expired'))
      mockAuthService.resendEmailConfirmation.mockRejectedValue(new Error('Resend failed'))

      wrapper = mount(VerifyEmail)
      await flushPromises()

      const resendButton = wrapper.find('button')
      await resendButton.trigger('click')
      await flushPromises()

      expect(window.alert).toHaveBeenCalledWith('Failed to send verification email. Please try again.')
    })

    it('shows loading state while resending', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockRejectedValue(new Error('Token expired'))
      mockAuthService.resendEmailConfirmation.mockImplementation(() => new Promise(() => {})) // Never resolves

      wrapper = mount(VerifyEmail)
      await flushPromises()

      const resendButton = wrapper.find('button')
      await resendButton.trigger('click')
      await nextTick()

      expect(resendButton.text()).toContain('Resend Verification Email') // Still shows text
      expect(resendButton.attributes('disabled')).toBe('')

      const spinner = resendButton.find('.animate-spin')
      expect(spinner.exists()).toBe(true)
    })

    it('disables resend button during loading', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockRejectedValue(new Error('Token expired'))
      mockAuthService.resendEmailConfirmation.mockImplementation(() => new Promise(() => {}))

      wrapper = mount(VerifyEmail)
      await flushPromises()

      const resendButton = wrapper.find('button')
      await resendButton.trigger('click')
      await nextTick()

      expect(resendButton.attributes('disabled')).toBe('')
      expect(resendButton.classes()).toContain('disabled:opacity-50')
      expect(resendButton.classes()).toContain('disabled:cursor-not-allowed')
    })
  })

  describe('Dynamic Content Methods', () => {
    it('returns correct titles for different states', async () => {
      // Test loading state
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockImplementation(() => new Promise(() => {}))

      wrapper = mount(VerifyEmail)
      await nextTick()
      expect(wrapper.find('h2').text()).toBe('Verifying email...')

      // Test success state
      wrapper.unmount()
      mockAuthService.confirmEmail.mockResolvedValue({ success: true })
      wrapper = mount(VerifyEmail)
      await flushPromises()
      expect(wrapper.find('h2').text()).toBe('Email verified!')

      // Test error state
      wrapper.unmount()
      mockAuthService.confirmEmail.mockRejectedValue(new Error('Failed'))
      wrapper = mount(VerifyEmail)
      await flushPromises()
      expect(wrapper.find('h2').text()).toBe('Verification failed')
    })

    it('returns correct messages for different states', async () => {
      // Test loading state
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockImplementation(() => new Promise(() => {}))

      wrapper = mount(VerifyEmail)
      await nextTick()
      expect(wrapper.text()).toContain('Please wait while we verify your email address.')

      // Test success state
      wrapper.unmount()
      mockAuthService.confirmEmail.mockResolvedValue({ success: true })
      wrapper = mount(VerifyEmail)
      await flushPromises()
      expect(wrapper.text()).toContain('Your email has been successfully verified. Welcome to ShopTrack!')

      // Test error state
      wrapper.unmount()
      mockAuthService.confirmEmail.mockRejectedValue(new Error('Failed'))
      wrapper = mount(VerifyEmail)
      await flushPromises()
      expect(wrapper.text()).toContain('We were unable to verify your email address')
    })
  })

  describe('Icon State Management', () => {
    it('shows correct icon for loading state', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockImplementation(() => new Promise(() => {}))

      wrapper = mount(VerifyEmail)
      await nextTick()

      const iconContainer = wrapper.find('.bg-blue-100')
      expect(iconContainer.exists()).toBe(true)

      const loadingIcon = iconContainer.find('.animate-spin.text-blue-600')
      expect(loadingIcon.exists()).toBe(true)
    })

    it('shows correct icon for success state', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockResolvedValue({ success: true })

      wrapper = mount(VerifyEmail)
      await flushPromises()

      const iconContainer = wrapper.find('.bg-green-100')
      expect(iconContainer.exists()).toBe(true)

      const successIcon = iconContainer.find('.text-green-600')
      expect(successIcon.exists()).toBe(true)
    })

    it('shows correct icon for error state', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockRejectedValue(new Error('Failed'))

      wrapper = mount(VerifyEmail)
      await flushPromises()

      const iconContainer = wrapper.find('.bg-blue-100')
      expect(iconContainer.exists()).toBe(true)

      const emailIcon = iconContainer.find('.text-blue-600')
      expect(emailIcon.exists()).toBe(true)
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive padding and spacing', () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      wrapper = mount(VerifyEmail)

      const container = wrapper.find('.min-h-screen')
      expect(container.classes()).toContain('py-12')
      expect(container.classes()).toContain('px-4')
      expect(container.classes()).toContain('sm:px-6')
      expect(container.classes()).toContain('lg:px-8')
    })

    it('uses responsive text sizing', () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      wrapper = mount(VerifyEmail)

      const title = wrapper.find('h2')
      expect(title.classes()).toContain('text-3xl')
      expect(title.classes()).toContain('font-extrabold')

      const description = wrapper.find('p.text-center')
      expect(description.classes()).toContain('text-sm')
    })
  })

  describe('Button Styling and Behavior', () => {
    it('applies correct styling to success button', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockResolvedValue({ success: true })

      wrapper = mount(VerifyEmail)
      await flushPromises()

      const continueButton = wrapper.find('router-link[to="/"]')
      expect(continueButton.classes()).toContain('bg-green-600')
      expect(continueButton.classes()).toContain('hover:bg-green-700')
      expect(continueButton.classes()).toContain('text-white')
      expect(continueButton.classes()).toContain('font-medium')
      expect(continueButton.classes()).toContain('rounded-md')
    })

    it('applies correct styling to error state buttons', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockRejectedValue(new Error('Failed'))

      wrapper = mount(VerifyEmail)
      await flushPromises()

      const backButton = wrapper.find('router-link[to="/login"]')
      expect(backButton.classes()).toContain('bg-blue-600')
      expect(backButton.classes()).toContain('hover:bg-blue-700')

      const resendButton = wrapper.find('button')
      expect(resendButton.classes()).toContain('bg-white')
      expect(resendButton.classes()).toContain('hover:bg-gray-50')
      expect(resendButton.classes()).toContain('border-gray-300')
    })
  })

  describe('Console Logging', () => {
    it('logs error to console when verification fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      const error = new Error('Verification failed')
      mockAuthService.confirmEmail.mockRejectedValue(error)

      wrapper = mount(VerifyEmail)
      await flushPromises()

      expect(consoleSpy).toHaveBeenCalledWith('Email verification error:', error)

      consoleSpy.mockRestore()
    })

    it('logs resend error to console when resend fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockRejectedValue(new Error('Token expired'))
      const resendError = new Error('Resend failed')
      mockAuthService.resendEmailConfirmation.mockRejectedValue(resendError)

      wrapper = mount(VerifyEmail)
      await flushPromises()

      const resendButton = wrapper.find('button')
      await resendButton.trigger('click')
      await flushPromises()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to resend verification:', resendError)

      consoleSpy.mockRestore()
    })
  })

  describe('Component Lifecycle', () => {
    it('immediately starts verification on mount when parameters are valid', async () => {
      mockRoute.query = { token: 'test-token', email: 'test@example.com' }
      mockAuthService.confirmEmail.mockResolvedValue({ success: true })

      wrapper = mount(VerifyEmail)

      expect(mockAuthService.confirmEmail).toHaveBeenCalledWith('test-token', 'test@example.com')
    })

    it('does not call verification service when parameters are missing', async () => {
      mockRoute.query = {}

      wrapper = mount(VerifyEmail)
      await flushPromises()

      expect(mockAuthService.confirmEmail).not.toHaveBeenCalled()
    })
  })
})