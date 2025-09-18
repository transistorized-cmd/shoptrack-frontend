import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import Profile from '@/views/Profile.vue';
import { useAuthStore } from '@/stores/auth';
import { authService } from '@/services/auth.service';
import { settingsService } from '@/services/settings.service';
import { languageSettingsService } from '@/services/languageSettings.service';
import { useWebAuthn } from '@/composables/useWebAuthn';
import { useOAuth } from '@/composables/useOAuth';

// Mock services
vi.mock('@/services/auth.service', () => ({
  authService: {
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    resendEmailConfirmation: vi.fn(),
  },
}));

vi.mock('@/services/settings.service', () => ({
  settingsService: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

vi.mock('@/services/languageSettings.service', () => ({
  languageSettingsService: {
    updateLanguageSettings: vi.fn(),
  },
}));

// Mock composables
vi.mock('@/composables/useWebAuthn', () => ({
  useWebAuthn: () => ({
    isSupported: true,
    error: { value: null },
    registerPasskey: vi.fn(),
    resetState: vi.fn(),
  }),
}));

vi.mock('@/composables/useOAuth', () => ({
  useOAuth: () => ({
    connectGoogle: vi.fn(),
    connectApple: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

// Mock URL sanitizer
vi.mock('@/utils/urlSanitizer', () => ({
  safeImageUrl: vi.fn((url: string) => url),
}));

// Mock i18n setup
vi.mock('@/i18n', () => ({
  availableLocales: [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ],
  setLocale: vi.fn(),
  getCurrentLocale: vi.fn(() => 'en'),
}));

// Mock constants
vi.mock('@/types/settings', () => ({
  CURRENCY_OPTIONS: [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
  ],
}));

describe('Profile View', () => {
  let pinia: ReturnType<typeof createPinia>;
  let router: ReturnType<typeof createRouter>;
  let i18n: ReturnType<typeof createI18n>;
  let authStore: ReturnType<typeof useAuthStore>;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    userName: 'johndoe',
    profilePicture: 'https://example.com/avatar.jpg',
    createdAt: '2023-01-01T00:00:00Z',
    emailConfirmed: true,
  };

  const mockSettings = {
    display: {
      language: 'en',
      currency: 'USD',
    },
  };

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/profile', component: Profile },
        { path: '/login', component: { template: '<div>Login</div>' } },
      ],
    });

    i18n = createI18n({
      locale: 'en',
      messages: {
        en: {
          'profile.title': 'Profile Settings',
          'profile.subtitle': 'Manage your account information and preferences',
        },
      },
    });

    authStore = useAuthStore();
    authStore.user = mockUser;
    authStore.isEmailConfirmed = true;
    authStore.hasPassword = true;
    authStore.passkeysEnabled = false;

    // Reset mocks
    vi.clearAllMocks();
    (settingsService.getSettings as any).mockResolvedValue(mockSettings);
    (settingsService.updateSettings as any).mockResolvedValue({ success: true });
  });

  const createWrapper = () => {
    return mount(Profile, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          RouterLink: true,
          RouterView: true,
        },
      },
    });
  };

  describe('Component Rendering', () => {
    it('should render profile page correctly', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('h1').text()).toBe('Profile Settings');
      expect(wrapper.text()).toContain('John Doe');
      expect(wrapper.text()).toContain('test@example.com');
      expect(wrapper.text()).toContain('Email verified');
    });

    it('should show user display name correctly', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('John Doe');
    });

    it('should show email not verified when user email is not confirmed', async () => {
      authStore.isEmailConfirmed = false;
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('Email not verified');
      expect(wrapper.find('button').text()).toContain('Verify Email');
    });

    it('should show member since date', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('Member since January 2023');
    });

    it('should show profile picture when available', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const img = wrapper.find('img');
      expect(img.exists()).toBe(true);
      expect(img.attributes('src')).toBe(mockUser.profilePicture);
      expect(img.attributes('alt')).toBe("John's avatar");
    });

    it('should show default avatar when profile picture is not available', async () => {
      authStore.user = { ...mockUser, profilePicture: undefined };
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const img = wrapper.find('img');
      expect(img.exists()).toBe(false);

      const defaultAvatar = wrapper.find('svg');
      expect(defaultAvatar.exists()).toBe(true);
    });
  });

  describe('Personal Information Form', () => {
    it('should populate form with current user data', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const firstNameInput = wrapper.find('#firstName');
      const lastNameInput = wrapper.find('#lastName');
      const emailInput = wrapper.find('#email');
      const userNameInput = wrapper.find('#userName');

      expect((firstNameInput.element as HTMLInputElement).value).toBe('John');
      expect((lastNameInput.element as HTMLInputElement).value).toBe('Doe');
      expect((emailInput.element as HTMLInputElement).value).toBe('test@example.com');
      expect((userNameInput.element as HTMLInputElement).value).toBe('johndoe');
    });

    it('should handle personal information form submission successfully', async () => {
      const mockUpdateProfile = vi.fn().mockResolvedValue({ success: true });
      authStore.updateProfile = mockUpdateProfile;

      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const form = wrapper.find('form');
      await form.trigger('submit.prevent');

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        userName: 'johndoe',
        email: 'test@example.com',
      });

      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Personal information updated successfully');
    });

    it('should handle personal information update errors', async () => {
      const mockUpdateProfile = vi.fn().mockResolvedValue({
        success: false,
        message: 'Email already exists'
      });
      authStore.updateProfile = mockUpdateProfile;

      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const form = wrapper.find('form');
      await form.trigger('submit.prevent');

      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Email already exists');
    });

    it('should warn when email is changed', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const emailInput = wrapper.find('#email');
      await emailInput.setValue('newemail@example.com');

      expect(wrapper.text()).toContain('Changing your email will require re-verification');
    });
  });

  describe('Password Management', () => {
    it('should show password change form when user has password', async () => {
      authStore.hasPassword = true;
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('#currentPassword').exists()).toBe(true);
      expect(wrapper.find('#newPassword').exists()).toBe(true);
      expect(wrapper.find('#confirmPassword').exists()).toBe(true);
      expect(wrapper.text()).toContain('Change Password');
    });

    it('should show password setup form when user has no password', async () => {
      authStore.hasPassword = false;
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('#currentPassword').exists()).toBe(false);
      expect(wrapper.find('#newPassword').exists()).toBe(true);
      expect(wrapper.find('#confirmPassword').exists()).toBe(true);
      expect(wrapper.text()).toContain('Set Password');
      expect(wrapper.text()).toContain('You signed in with a social account');
    });

    it('should handle password change successfully', async () => {
      const mockChangePassword = vi.fn().mockResolvedValue({ success: true });
      authStore.changePassword = mockChangePassword;

      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      // Fill form
      await wrapper.find('#currentPassword').setValue('oldpassword');
      await wrapper.find('#newPassword').setValue('newpassword123');
      await wrapper.find('#confirmPassword').setValue('newpassword123');

      // Submit form
      const passwordForm = wrapper.findAll('form')[1]; // Second form is password form
      await passwordForm.trigger('submit.prevent');

      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Password changed successfully');
    });

    it('should validate password form correctly', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const submitButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Change Password')
      );

      expect(submitButton?.attributes('disabled')).toBeDefined();

      // Fill form with valid data
      await wrapper.find('#currentPassword').setValue('oldpassword');
      await wrapper.find('#newPassword').setValue('newpassword123');
      await wrapper.find('#confirmPassword').setValue('newpassword123');

      await wrapper.vm.$nextTick();

      const updatedSubmitButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Change Password')
      );
      expect(updatedSubmitButton?.attributes('disabled')).toBeUndefined();
    });

    it('should disable submit when passwords dont match', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      await wrapper.find('#currentPassword').setValue('oldpassword');
      await wrapper.find('#newPassword').setValue('newpassword123');
      await wrapper.find('#confirmPassword').setValue('differentpassword');

      await wrapper.vm.$nextTick();

      const submitButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Change Password')
      );
      expect(submitButton?.attributes('disabled')).toBeDefined();
    });
  });

  describe('Profile Picture Upload', () => {
    it('should handle profile picture upload successfully', async () => {
      const mockUpdateProfile = vi.fn().mockResolvedValue({ success: true });
      authStore.updateProfile = mockUpdateProfile;

      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const fileInput = wrapper.find('input[type="file"]');
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFile],
        writable: false,
      });

      await fileInput.trigger('change');

      expect(mockUpdateProfile).toHaveBeenCalledWith({ profilePicture: mockFile });

      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Profile picture updated successfully');
    });

    it('should handle profile picture upload errors', async () => {
      const mockUpdateProfile = vi.fn().mockResolvedValue({
        success: false,
        message: 'File too large'
      });
      authStore.updateProfile = mockUpdateProfile;

      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const fileInput = wrapper.find('input[type="file"]');
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFile],
        writable: false,
      });

      await fileInput.trigger('change');

      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('File too large');
    });
  });

  describe('Passkey Management', () => {
    it('should show create passkey button when passkeys are not enabled', async () => {
      authStore.passkeysEnabled = false;
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const createButton = wrapper.find('button').text().includes('Create Passkey');
      expect(createButton).toBe(true);
      expect(wrapper.text()).toContain('Set up passkeys for faster');
    });

    it('should show remove passkey button when passkeys are enabled', async () => {
      authStore.passkeysEnabled = true;
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const removeButton = wrapper.find('button').text().includes('Remove Passkey');
      expect(removeButton).toBe(true);
      expect(wrapper.text()).toContain('Passkeys are enabled on your account');
    });

    it('should handle passkey setup successfully', async () => {
      const mockWebAuthn = useWebAuthn();
      (mockWebAuthn.registerPasskey as any).mockResolvedValue({ credential: 'test' });

      const mockRegisterPasskey = vi.fn().mockResolvedValue({ success: true });
      authStore.registerPasskey = mockRegisterPasskey;

      authStore.passkeysEnabled = false;
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const createButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Create Passkey')
      );
      await createButton?.trigger('click');

      expect(mockWebAuthn.registerPasskey).toHaveBeenCalled();
      expect(mockRegisterPasskey).toHaveBeenCalledWith({ credential: 'test' });

      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Passkey set up successfully');
    });

    it('should handle passkey removal with confirmation', async () => {
      global.confirm = vi.fn().mockReturnValue(true);

      const mockRemovePasskey = vi.fn().mockResolvedValue({ success: true });
      const mockInitialize = vi.fn();
      authStore.removePasskey = mockRemovePasskey;
      authStore.initialize = mockInitialize;

      authStore.passkeysEnabled = true;
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const removeButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Remove Passkey')
      );
      await removeButton?.trigger('click');

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to remove your passkey? You will need to set it up again to use passkey authentication.'
      );
      expect(mockRemovePasskey).toHaveBeenCalled();
      expect(mockInitialize).toHaveBeenCalled();

      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Passkey removed successfully');
    });
  });

  describe('Settings Management', () => {
    it('should load user settings on mount', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      expect(settingsService.getSettings).toHaveBeenCalled();
    });

    it('should handle language change', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const languageSelect = wrapper.find('#languageSelect');
      await languageSelect.setValue('fr');

      expect(wrapper.text()).toContain('Save Settings');
    });

    it('should handle currency change', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const currencySelect = wrapper.find('#currencySelect');
      await currencySelect.setValue('EUR');

      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Save Settings');
    });

    it('should save settings successfully', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      // Make a change to trigger unsaved state
      const languageSelect = wrapper.find('#languageSelect');
      await languageSelect.setValue('fr');

      await wrapper.vm.$nextTick();

      // Find and click save button
      const saveButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Save Settings')
      );
      await saveButton?.trigger('click');

      expect(settingsService.updateSettings).toHaveBeenCalledWith({
        display: {
          language: 'fr',
          currency: 'USD'
        }
      });

      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Settings saved successfully');
    });

    it('should show all settings saved when no changes', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('All settings saved');
    });
  });

  describe('Email Confirmation', () => {
    it('should handle email confirmation resend successfully', async () => {
      const mockResendEmailConfirmation = vi.fn().mockResolvedValue({ success: true });
      authStore.resendEmailConfirmation = mockResendEmailConfirmation;
      authStore.isEmailConfirmed = false;

      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const verifyButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Verify Email')
      );
      await verifyButton?.trigger('click');

      expect(mockResendEmailConfirmation).toHaveBeenCalled();

      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Confirmation email sent');
    });

    it('should handle email confirmation errors', async () => {
      const mockResendEmailConfirmation = vi.fn().mockResolvedValue({
        success: false,
        message: 'Too many attempts'
      });
      authStore.resendEmailConfirmation = mockResendEmailConfirmation;
      authStore.isEmailConfirmed = false;

      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const verifyButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Verify Email')
      );
      await verifyButton?.trigger('click');

      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Too many attempts');
    });
  });

  describe('Logout Functionality', () => {
    it('should handle logout and redirect to login', async () => {
      const mockLogout = vi.fn();
      const mockPush = vi.fn();
      authStore.logout = mockLogout;

      // Mock router push
      const wrapper = createWrapper();
      wrapper.vm.$router.push = mockPush;
      await wrapper.vm.$nextTick();

      const signOutButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Sign Out')
      );
      await signOutButton?.trigger('click');

      expect(mockLogout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('Loading States', () => {
    it('should show loading state during operations', async () => {
      const mockUpdateProfile = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );
      authStore.updateProfile = mockUpdateProfile;

      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const form = wrapper.find('form');
      await form.trigger('submit.prevent');

      expect(wrapper.text()).toContain('Updating...');
    });

    it('should disable buttons during loading', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      // Set loading state manually for testing
      const vm = wrapper.vm as any;
      vm.loading = true;
      await wrapper.vm.$nextTick();

      const buttons = wrapper.findAll('button');
      const disabledButtons = buttons.filter(btn => btn.attributes('disabled') !== undefined);

      expect(disabledButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockUpdateProfile = vi.fn().mockRejectedValue(new Error('Network error'));
      authStore.updateProfile = mockUpdateProfile;

      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const form = wrapper.find('form');
      await form.trigger('submit.prevent');

      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Network error');
    });

    it('should clear previous messages when new operations start', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      // Set initial error state
      const vm = wrapper.vm as any;
      vm.error = 'Previous error';
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('Previous error');

      // Start new operation
      const form = wrapper.find('form');
      await form.trigger('submit.prevent');

      // Error should be cleared
      expect(wrapper.text()).not.toContain('Previous error');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const inputs = wrapper.findAll('input');
      inputs.forEach(input => {
        const id = input.attributes('id');
        if (id) {
          const label = wrapper.find(`label[for="${id}"]`);
          expect(label.exists()).toBe(true);
        }
      });
    });

    it('should have proper form structure', async () => {
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const forms = wrapper.findAll('form');
      expect(forms.length).toBeGreaterThan(0);

      forms.forEach(form => {
        expect(form.attributes('novalidate')).toBeDefined();
      });
    });
  });
});