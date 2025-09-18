import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LanguageSettingsService, languageSettingsService } from '../languageSettings.service'
import { settingsService } from '../settings.service'
import {
  setLocale,
  getCurrentLocale,
  type LocaleCode,
  availableLocales
} from '@/i18n'
import type { UserSettings } from '@/types/settings'

// Mock the i18n module
vi.mock('@/i18n', () => ({
  setLocale: vi.fn(),
  getCurrentLocale: vi.fn(),
  availableLocales: [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' }
  ]
}))

// Mock the settings service
vi.mock('../settings.service', () => ({
  settingsService: {
    getSettings: vi.fn(),
    updateSetting: vi.fn()
  }
}))

// Mock console methods
const mockConsole = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

Object.defineProperty(console, 'info', { value: mockConsole.info })
Object.defineProperty(console, 'warn', { value: mockConsole.warn })
Object.defineProperty(console, 'error', { value: mockConsole.error })

const mockSetLocale = vi.mocked(setLocale)
const mockGetCurrentLocale = vi.mocked(getCurrentLocale)
const mockSettingsService = vi.mocked(settingsService)

describe('LanguageSettingsService', () => {
  let service: LanguageSettingsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new LanguageSettingsService()
    mockGetCurrentLocale.mockReturnValue('en')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('constructor', () => {
    it('should create a new instance', () => {
      expect(service).toBeInstanceOf(LanguageSettingsService)
    })
  })

  describe('initializeFromUserSettings', () => {
    it('should initialize language from valid user settings', async () => {
      // Arrange
      const mockSettings: UserSettings = {
        display: {
          language: 'es',
          theme: 'light',
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          timezone: 'UTC'
        }
      } as UserSettings

      mockSettingsService.getSettings.mockResolvedValue(mockSettings)

      // Act
      await service.initializeFromUserSettings()

      // Assert
      expect(mockSettingsService.getSettings).toHaveBeenCalledTimes(1)
      expect(mockSetLocale).toHaveBeenCalledWith('es')
      expect(mockConsole.info).toHaveBeenCalledWith(
        'Language initialized from user settings: es'
      )
    })

    it('should warn about invalid language and not set locale', async () => {
      // Arrange
      const mockSettings: UserSettings = {
        display: {
          language: 'invalid-lang',
          theme: 'light',
          currency: 'USD'
        }
      } as UserSettings

      mockSettingsService.getSettings.mockResolvedValue(mockSettings)

      // Act
      await service.initializeFromUserSettings()

      // Assert
      expect(mockSettingsService.getSettings).toHaveBeenCalledTimes(1)
      expect(mockSetLocale).not.toHaveBeenCalled()
      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Invalid language in user settings: invalid-lang, falling back to current locale'
      )
    })

    it('should handle null/undefined language in settings', async () => {
      // Arrange
      const mockSettings: UserSettings = {
        display: {
          language: null as any,
          theme: 'light',
          currency: 'USD'
        }
      } as UserSettings

      mockSettingsService.getSettings.mockResolvedValue(mockSettings)

      // Act
      await service.initializeFromUserSettings()

      // Assert
      expect(mockSetLocale).not.toHaveBeenCalled()
      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Invalid language in user settings: null, falling back to current locale'
      )
    })

    it('should handle settings service errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Settings service unavailable')
      mockSettingsService.getSettings.mockRejectedValue(mockError)

      // Act
      await service.initializeFromUserSettings()

      // Assert
      expect(mockSetLocale).not.toHaveBeenCalled()
      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Failed to load language from user settings, using current locale:',
        mockError
      )
    })

    it('should handle all available locales correctly', async () => {
      // Arrange
      const availableLocaleCodes = ['en', 'es', 'fr', 'de']

      for (const locale of availableLocaleCodes) {
        const mockSettings: UserSettings = {
          display: { language: locale }
        } as UserSettings

        mockSettingsService.getSettings.mockResolvedValue(mockSettings)

        // Act
        await service.initializeFromUserSettings()

        // Assert
        expect(mockSetLocale).toHaveBeenCalledWith(locale)

        vi.clearAllMocks()
      }
    })
  })

  describe('updateUserLanguagePreference', () => {
    it('should update user language preference successfully', async () => {
      // Arrange
      mockSettingsService.updateSetting.mockResolvedValue({
        success: true,
        message: 'Language updated'
      })

      // Act
      await service.updateUserLanguagePreference('fr')

      // Assert
      expect(mockSettingsService.updateSetting).toHaveBeenCalledWith('display.language', 'fr')
      expect(mockSetLocale).toHaveBeenCalledWith('fr')
      expect(mockConsole.info).toHaveBeenCalledWith('User language preference updated to: fr')
    })

    it('should handle settings service errors and re-throw', async () => {
      // Arrange
      const mockError = new Error('Failed to update setting')
      mockSettingsService.updateSetting.mockRejectedValue(mockError)

      // Act & Assert
      await expect(service.updateUserLanguagePreference('de')).rejects.toThrow('Failed to update setting')
      expect(mockSettingsService.updateSetting).toHaveBeenCalledWith('display.language', 'de')
      expect(mockSetLocale).not.toHaveBeenCalled()
      expect(mockConsole.error).toHaveBeenCalledWith('Failed to update user language preference:', mockError)
    })

    it('should update all available locale preferences correctly', async () => {
      // Arrange
      const availableLocaleCodes: LocaleCode[] = ['en', 'es', 'fr', 'de']
      mockSettingsService.updateSetting.mockResolvedValue({ success: true, message: 'Updated' })

      for (const locale of availableLocaleCodes) {
        // Act
        await service.updateUserLanguagePreference(locale)

        // Assert
        expect(mockSettingsService.updateSetting).toHaveBeenCalledWith('display.language', locale)
        expect(mockSetLocale).toHaveBeenCalledWith(locale)

        vi.clearAllMocks()
        mockSettingsService.updateSetting.mockResolvedValue({ success: true, message: 'Updated' })
      }
    })

    it('should handle network errors appropriately', async () => {
      // Arrange
      const networkError = new Error('Network timeout')
      mockSettingsService.updateSetting.mockRejectedValue(networkError)

      // Act & Assert
      await expect(service.updateUserLanguagePreference('es')).rejects.toThrow('Network timeout')
      expect(mockConsole.error).toHaveBeenCalledWith('Failed to update user language preference:', networkError)
    })
  })

  describe('getEffectiveLanguage', () => {
    it('should return user language when settings are available and valid', async () => {
      // Arrange
      const mockSettings: UserSettings = {
        display: {
          language: 'fr',
          theme: 'light',
          currency: 'EUR'
        }
      } as UserSettings

      mockSettingsService.getSettings.mockResolvedValue(mockSettings)

      // Act
      const result = await service.getEffectiveLanguage()

      // Assert
      expect(result).toBe('fr')
      expect(mockSettingsService.getSettings).toHaveBeenCalledTimes(1)
      expect(mockGetCurrentLocale).not.toHaveBeenCalled()
    })

    it('should fall back to current locale when user language is invalid', async () => {
      // Arrange
      const mockSettings: UserSettings = {
        display: {
          language: 'invalid-locale',
          theme: 'light'
        }
      } as UserSettings

      mockSettingsService.getSettings.mockResolvedValue(mockSettings)
      mockGetCurrentLocale.mockReturnValue('en')

      // Act
      const result = await service.getEffectiveLanguage()

      // Assert
      expect(result).toBe('en')
      expect(mockGetCurrentLocale).toHaveBeenCalledTimes(1)
    })

    it('should fall back to current locale when settings service fails', async () => {
      // Arrange
      mockSettingsService.getSettings.mockRejectedValue(new Error('Settings unavailable'))
      mockGetCurrentLocale.mockReturnValue('es')

      // Act
      const result = await service.getEffectiveLanguage()

      // Assert
      expect(result).toBe('es')
      expect(mockGetCurrentLocale).toHaveBeenCalledTimes(1)
    })

    it('should handle null/undefined user language gracefully', async () => {
      // Arrange
      const mockSettings: UserSettings = {
        display: {
          language: undefined as any,
          theme: 'light'
        }
      } as UserSettings

      mockSettingsService.getSettings.mockResolvedValue(mockSettings)
      mockGetCurrentLocale.mockReturnValue('de')

      // Act
      const result = await service.getEffectiveLanguage()

      // Assert
      expect(result).toBe('de')
      expect(mockGetCurrentLocale).toHaveBeenCalledTimes(1)
    })

    it('should prioritize user settings over current locale', async () => {
      // Arrange
      const mockSettings: UserSettings = {
        display: { language: 'fr' }
      } as UserSettings

      mockSettingsService.getSettings.mockResolvedValue(mockSettings)
      mockGetCurrentLocale.mockReturnValue('en') // Different from user preference

      // Act
      const result = await service.getEffectiveLanguage()

      // Assert
      expect(result).toBe('fr') // Should return user preference, not current locale
      expect(mockGetCurrentLocale).not.toHaveBeenCalled()
    })
  })

  describe('syncWithUserSettings', () => {
    it('should sync current locale with user settings when they differ', async () => {
      // Arrange
      const mockSettings: UserSettings = {
        display: {
          language: 'en',
          theme: 'light'
        }
      } as UserSettings

      mockGetCurrentLocale.mockReturnValue('fr')
      mockSettingsService.getSettings.mockResolvedValue(mockSettings)
      mockSettingsService.updateSetting.mockResolvedValue({ success: true, message: 'Synced' })

      // Act
      await service.syncWithUserSettings()

      // Assert
      expect(mockSettingsService.updateSetting).toHaveBeenCalledWith('display.language', 'fr')
      expect(mockConsole.info).toHaveBeenCalledWith('User language setting synced to current locale: fr')
    })

    it('should not update settings when current locale matches user setting', async () => {
      // Arrange
      const mockSettings: UserSettings = {
        display: {
          language: 'es',
          theme: 'light'
        }
      } as UserSettings

      mockGetCurrentLocale.mockReturnValue('es')
      mockSettingsService.getSettings.mockResolvedValue(mockSettings)

      // Act
      await service.syncWithUserSettings()

      // Assert
      expect(mockSettingsService.updateSetting).not.toHaveBeenCalled()
      expect(mockConsole.info).not.toHaveBeenCalled()
    })

    it('should handle settings service errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Settings service error')
      mockSettingsService.getSettings.mockRejectedValue(mockError)

      // Act
      await service.syncWithUserSettings()

      // Assert
      expect(mockSettingsService.updateSetting).not.toHaveBeenCalled()
      expect(mockConsole.warn).toHaveBeenCalledWith('Failed to sync language with user settings:', mockError)
    })

    it('should handle update setting errors gracefully', async () => {
      // Arrange
      const mockSettings: UserSettings = {
        display: { language: 'en' }
      } as UserSettings

      mockGetCurrentLocale.mockReturnValue('fr')
      mockSettingsService.getSettings.mockResolvedValue(mockSettings)

      const updateError = new Error('Failed to update setting')
      mockSettingsService.updateSetting.mockRejectedValue(updateError)

      // Act
      await service.syncWithUserSettings()

      // Assert
      expect(mockSettingsService.updateSetting).toHaveBeenCalledWith('display.language', 'fr')
      expect(mockConsole.warn).toHaveBeenCalledWith('Failed to sync language with user settings:', updateError)
    })

    it('should sync all available locales correctly', async () => {
      // Arrange
      const availableLocaleCodes = ['en', 'es', 'fr', 'de']

      for (const locale of availableLocaleCodes) {
        const mockSettings: UserSettings = {
          display: { language: 'en' } // Always different from current
        } as UserSettings

        mockGetCurrentLocale.mockReturnValue(locale)
        mockSettingsService.getSettings.mockResolvedValue(mockSettings)
        mockSettingsService.updateSetting.mockResolvedValue({ success: true, message: 'Updated' })

        // Act
        await service.syncWithUserSettings()

        // Assert
        expect(mockSettingsService.updateSetting).toHaveBeenCalledWith('display.language', locale)

        vi.clearAllMocks()
      }
    })
  })

  describe('isValidLocale (private method)', () => {
    it('should validate locales correctly through public methods', async () => {
      // We can't test the private method directly, but we can test its behavior
      // through public methods that use it

      // Test valid locale
      const mockSettings: UserSettings = {
        display: { language: 'fr' }
      } as UserSettings
      mockSettingsService.getSettings.mockResolvedValue(mockSettings)

      await service.initializeFromUserSettings()
      expect(mockSetLocale).toHaveBeenCalledWith('fr')

      vi.clearAllMocks()

      // Test invalid locale
      const invalidSettings: UserSettings = {
        display: { language: 'xyz' }
      } as UserSettings
      mockSettingsService.getSettings.mockResolvedValue(invalidSettings)

      await service.initializeFromUserSettings()
      expect(mockSetLocale).not.toHaveBeenCalled()
      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Invalid language in user settings: xyz, falling back to current locale'
      )
    })
  })

  describe('service integration', () => {
    it('should work correctly with multiple operations in sequence', async () => {
      // Arrange
      const mockSettings: UserSettings = {
        display: { language: 'en' }
      } as UserSettings

      mockSettingsService.getSettings.mockResolvedValue(mockSettings)
      mockSettingsService.updateSetting.mockResolvedValue({ success: true, message: 'Updated' })

      // Act
      await service.initializeFromUserSettings()
      await service.updateUserLanguagePreference('es')
      const effectiveLanguage = await service.getEffectiveLanguage()
      await service.syncWithUserSettings()

      // Assert
      expect(mockSetLocale).toHaveBeenCalledWith('en') // From initialization
      expect(mockSetLocale).toHaveBeenCalledWith('es') // From update
      expect(mockSettingsService.updateSetting).toHaveBeenCalledWith('display.language', 'es')
      expect(effectiveLanguage).toBe('en') // From mocked settings (before update)
      expect(mockSettingsService.getSettings).toHaveBeenCalledTimes(3) // Init, get effective, sync
    })

    it('should handle mixed success and failure scenarios', async () => {
      // Arrange - successful initialization, failed update
      const mockSettings: UserSettings = {
        display: { language: 'fr' }
      } as UserSettings

      mockSettingsService.getSettings.mockResolvedValue(mockSettings)
      mockSettingsService.updateSetting.mockRejectedValue(new Error('Update failed'))

      // Act & Assert
      await service.initializeFromUserSettings() // Should succeed
      expect(mockSetLocale).toHaveBeenCalledWith('fr')

      await expect(service.updateUserLanguagePreference('de')).rejects.toThrow('Update failed')
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Failed to update user language preference:',
        expect.any(Error)
      )
    })
  })

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(languageSettingsService).toBeInstanceOf(LanguageSettingsService)
      expect(languageSettingsService).toBe(languageSettingsService) // Should be same instance
    })

    it('should have all required methods', () => {
      const methods = [
        'initializeFromUserSettings',
        'updateUserLanguagePreference',
        'getEffectiveLanguage',
        'syncWithUserSettings'
      ]

      for (const method of methods) {
        expect(languageSettingsService).toHaveProperty(method)
        expect(typeof (languageSettingsService as any)[method]).toBe('function')
      }
    })
  })

  describe('edge cases', () => {
    it('should handle empty string language in settings', async () => {
      // Arrange
      const mockSettings: UserSettings = {
        display: { language: '' }
      } as UserSettings

      mockSettingsService.getSettings.mockResolvedValue(mockSettings)

      // Act
      await service.initializeFromUserSettings()

      // Assert
      expect(mockSetLocale).not.toHaveBeenCalled()
      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Invalid language in user settings: , falling back to current locale'
      )
    })

    it('should handle malformed settings objects', async () => {
      // Arrange
      const malformedSettings = { display: null } as any
      mockSettingsService.getSettings.mockResolvedValue(malformedSettings)

      // Act
      await service.initializeFromUserSettings()

      // Assert
      expect(mockSetLocale).not.toHaveBeenCalled()
      // Should handle gracefully without throwing
    })

    it('should handle concurrent operations', async () => {
      // Arrange
      const mockSettings: UserSettings = {
        display: { language: 'fr' }
      } as UserSettings

      mockSettingsService.getSettings.mockResolvedValue(mockSettings)
      mockSettingsService.updateSetting.mockResolvedValue({ success: true, message: 'Updated' })

      // Act - run multiple operations concurrently
      const promises = [
        service.initializeFromUserSettings(),
        service.getEffectiveLanguage(),
        service.syncWithUserSettings()
      ]

      await Promise.all(promises)

      // Assert - all operations should complete without errors
      expect(mockSettingsService.getSettings).toHaveBeenCalled()
      // Specific call counts may vary due to concurrency, but no errors should occur
    })

    it('should handle very long locale codes', async () => {
      // Arrange
      const longLocaleCode = 'a'.repeat(100)
      const mockSettings: UserSettings = {
        display: { language: longLocaleCode }
      } as UserSettings

      mockSettingsService.getSettings.mockResolvedValue(mockSettings)

      // Act
      await service.initializeFromUserSettings()

      // Assert
      expect(mockSetLocale).not.toHaveBeenCalled()
      expect(mockConsole.warn).toHaveBeenCalledWith(
        `Invalid language in user settings: ${longLocaleCode}, falling back to current locale`
      )
    })

    it('should handle special characters in locale codes', async () => {
      // Arrange
      const specialCharLocale = 'en-US@#$%'
      const mockSettings: UserSettings = {
        display: { language: specialCharLocale }
      } as UserSettings

      mockSettingsService.getSettings.mockResolvedValue(mockSettings)

      // Act
      await service.initializeFromUserSettings()

      // Assert
      expect(mockSetLocale).not.toHaveBeenCalled()
      expect(mockConsole.warn).toHaveBeenCalledWith(
        `Invalid language in user settings: ${specialCharLocale}, falling back to current locale`
      )
    })
  })
})