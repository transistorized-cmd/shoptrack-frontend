import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { categoriesService } from '../categories'
import api from '../api'
import { getCurrentLocale } from '@/i18n'
import type { CategoryDto } from '../categories'

// Mock the API module
vi.mock('../api', () => ({
  default: {
    get: vi.fn()
  }
}))

// Mock the i18n module
vi.mock('@/i18n', () => ({
  getCurrentLocale: vi.fn()
}))

const mockApi = vi.mocked(api)
const mockGetCurrentLocale = vi.mocked(getCurrentLocale)

describe('categoriesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentLocale.mockReturnValue('en')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getCategories', () => {
    it('should fetch categories with current locale when no locale provided', async () => {
      // Arrange
      const mockCategories: CategoryDto[] = [
        {
          id: 1,
          key: 'groceries',
          name: 'Groceries',
          parentId: null,
          icon: 'shopping-cart',
          color: '#4CAF50',
          sortOrder: 1
        },
        {
          id: 2,
          key: 'electronics',
          name: 'Electronics',
          parentId: null,
          icon: 'laptop',
          color: '#2196F3',
          sortOrder: 2
        },
        {
          id: 3,
          key: 'food',
          name: 'Food',
          parentId: 1,
          icon: 'utensils',
          color: '#FF9800',
          sortOrder: 3
        }
      ]

      mockApi.get.mockResolvedValue({
        data: mockCategories
      })

      // Act
      const result = await categoriesService.getCategories()

      // Assert
      expect(mockGetCurrentLocale).toHaveBeenCalledTimes(1)
      expect(mockApi.get).toHaveBeenCalledTimes(1)
      expect(mockApi.get).toHaveBeenCalledWith('/categories', {
        params: { locale: 'en' }
      })
      expect(result).toEqual(mockCategories)
    })

    it('should fetch categories with specified locale', async () => {
      // Arrange
      const mockCategories: CategoryDto[] = [
        {
          id: 1,
          key: 'comestibles',
          name: 'Comestibles',
          parentId: null,
          icon: 'shopping-cart',
          color: '#4CAF50',
          sortOrder: 1
        },
        {
          id: 2,
          key: 'electronique',
          name: 'Électronique',
          parentId: null,
          icon: 'laptop',
          color: '#2196F3',
          sortOrder: 2
        }
      ]

      mockApi.get.mockResolvedValue({
        data: mockCategories
      })

      // Act
      const result = await categoriesService.getCategories('fr')

      // Assert
      expect(mockGetCurrentLocale).not.toHaveBeenCalled() // Should not call getCurrentLocale when locale is provided
      expect(mockApi.get).toHaveBeenCalledTimes(1)
      expect(mockApi.get).toHaveBeenCalledWith('/categories', {
        params: { locale: 'fr' }
      })
      expect(result).toEqual(mockCategories)
    })

    it('should handle empty categories response', async () => {
      // Arrange
      mockApi.get.mockResolvedValue({
        data: []
      })

      // Act
      const result = await categoriesService.getCategories()

      // Assert
      expect(result).toEqual([])
      expect(mockApi.get).toHaveBeenCalledWith('/categories', {
        params: { locale: 'en' }
      })
    })

    it('should handle categories with minimal data', async () => {
      // Arrange
      const minimalCategories: CategoryDto[] = [
        {
          id: 1,
          key: 'basic',
          name: 'Basic Category',
          sortOrder: 1
        }
      ]

      mockApi.get.mockResolvedValue({
        data: minimalCategories
      })

      // Act
      const result = await categoriesService.getCategories()

      // Assert
      expect(result).toEqual(minimalCategories)
      expect(result[0].parentId).toBeUndefined()
      expect(result[0].icon).toBeUndefined()
      expect(result[0].color).toBeUndefined()
    })

    it('should handle categories with all optional fields', async () => {
      // Arrange
      const fullCategories: CategoryDto[] = [
        {
          id: 1,
          key: 'complete',
          name: 'Complete Category',
          parentId: null,
          icon: 'star',
          color: '#FFD700',
          sortOrder: 1
        },
        {
          id: 2,
          key: 'subcategory',
          name: 'Subcategory',
          parentId: 1,
          icon: 'star-half',
          color: '#FFC107',
          sortOrder: 2
        }
      ]

      mockApi.get.mockResolvedValue({
        data: fullCategories
      })

      // Act
      const result = await categoriesService.getCategories()

      // Assert
      expect(result).toEqual(fullCategories)
      expect(result[0].parentId).toBeNull()
      expect(result[0].icon).toBe('star')
      expect(result[0].color).toBe('#FFD700')
      expect(result[1].parentId).toBe(1)
    })

    it('should handle different locale formats', async () => {
      // Arrange
      const mockCategories: CategoryDto[] = [
        {
          id: 1,
          key: 'test',
          name: 'Test Category',
          sortOrder: 1
        }
      ]

      mockApi.get.mockResolvedValue({ data: mockCategories })

      const localeFormats = ['en', 'en-US', 'es', 'es-ES', 'fr-FR', 'de-DE', 'zh-CN', 'ja-JP']

      // Act & Assert
      for (const locale of localeFormats) {
        await categoriesService.getCategories(locale)
        expect(mockApi.get).toHaveBeenCalledWith('/categories', {
          params: { locale }
        })

        vi.clearAllMocks()
        mockApi.get.mockResolvedValue({ data: mockCategories })
      }
    })

    it('should handle numeric sortOrder correctly', async () => {
      // Arrange
      const categoriesWithSort: CategoryDto[] = [
        {
          id: 3,
          key: 'third',
          name: 'Third Category',
          sortOrder: 3
        },
        {
          id: 1,
          key: 'first',
          name: 'First Category',
          sortOrder: 1
        },
        {
          id: 2,
          key: 'second',
          name: 'Second Category',
          sortOrder: 2
        }
      ]

      mockApi.get.mockResolvedValue({
        data: categoriesWithSort
      })

      // Act
      const result = await categoriesService.getCategories()

      // Assert
      expect(result).toEqual(categoriesWithSort)
      expect(result[0].sortOrder).toBe(3)
      expect(result[1].sortOrder).toBe(1)
      expect(result[2].sortOrder).toBe(2)
    })

    it('should handle categories with special characters in names', async () => {
      // Arrange
      const categoriesWithSpecialChars: CategoryDto[] = [
        {
          id: 1,
          key: 'special_chars',
          name: 'Café & Résturant',
          sortOrder: 1
        },
        {
          id: 2,
          key: 'unicode',
          name: '日本料理',
          sortOrder: 2
        },
        {
          id: 3,
          key: 'symbols',
          name: 'Home & Garden 🏠',
          sortOrder: 3
        }
      ]

      mockApi.get.mockResolvedValue({
        data: categoriesWithSpecialChars
      })

      // Act
      const result = await categoriesService.getCategories()

      // Assert
      expect(result).toEqual(categoriesWithSpecialChars)
      expect(result[0].name).toBe('Café & Résturant')
      expect(result[1].name).toBe('日本料理')
      expect(result[2].name).toBe('Home & Garden 🏠')
    })

    it('should handle large category datasets', async () => {
      // Arrange
      const largeCategorySet: CategoryDto[] = Array.from({ length: 1000 }, (_, index) => ({
        id: index + 1,
        key: `category_${index + 1}`,
        name: `Category ${index + 1}`,
        parentId: index === 0 ? null : Math.floor(Math.random() * index) + 1,
        sortOrder: index + 1
      }))

      mockApi.get.mockResolvedValue({
        data: largeCategorySet
      })

      // Act
      const result = await categoriesService.getCategories()

      // Assert
      expect(result).toEqual(largeCategorySet)
      expect(result).toHaveLength(1000)
      expect(result[0].id).toBe(1)
      expect(result[999].id).toBe(1000)
    })

    it('should handle API errors', async () => {
      // Arrange
      const mockError = new Error('Failed to fetch categories')
      mockApi.get.mockRejectedValue(mockError)

      // Act & Assert
      await expect(categoriesService.getCategories()).rejects.toThrow('Failed to fetch categories')
      expect(mockApi.get).toHaveBeenCalledWith('/categories', {
        params: { locale: 'en' }
      })
    })

    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network Error')
      mockApi.get.mockRejectedValue(networkError)

      // Act & Assert
      await expect(categoriesService.getCategories('es')).rejects.toThrow('Network Error')
      expect(mockApi.get).toHaveBeenCalledWith('/categories', {
        params: { locale: 'es' }
      })
    })

    it('should handle server errors with different status codes', async () => {
      // Arrange
      const serverErrors = [
        { status: 400, message: 'Bad Request' },
        { status: 401, message: 'Unauthorized' },
        { status: 403, message: 'Forbidden' },
        { status: 404, message: 'Not Found' },
        { status: 500, message: 'Internal Server Error' },
        { status: 503, message: 'Service Unavailable' }
      ]

      for (const error of serverErrors) {
        const apiError = new Error(error.message)
        Object.assign(apiError, { response: { status: error.status } })
        mockApi.get.mockRejectedValue(apiError)

        // Act & Assert
        await expect(categoriesService.getCategories()).rejects.toThrow(error.message)

        vi.clearAllMocks()
      }
    })

    it('should handle malformed API response', async () => {
      // Arrange
      mockApi.get.mockResolvedValue({
        data: 'invalid response format'
      })

      // Act
      const result = await categoriesService.getCategories()

      // Assert
      expect(result).toBe('invalid response format')
      // The service trusts the API response format, which is typical for typed services
    })

    it('should handle null API response', async () => {
      // Arrange
      mockApi.get.mockResolvedValue({
        data: null
      })

      // Act
      const result = await categoriesService.getCategories()

      // Assert
      expect(result).toBeNull()
    })

    it('should handle undefined API response', async () => {
      // Arrange
      mockApi.get.mockResolvedValue({
        data: undefined
      })

      // Act
      const result = await categoriesService.getCategories()

      // Assert
      expect(result).toBeUndefined()
    })

    it('should use getCurrentLocale as fallback when locale parameter is empty string', async () => {
      // Arrange
      const mockCategories: CategoryDto[] = [
        {
          id: 1,
          key: 'test',
          name: 'Test',
          sortOrder: 1
        }
      ]

      mockApi.get.mockResolvedValue({ data: mockCategories })

      // Act
      const result = await categoriesService.getCategories('')

      // Assert
      expect(mockGetCurrentLocale).toHaveBeenCalledTimes(1)
      expect(mockApi.get).toHaveBeenCalledWith('/categories', {
        params: { locale: 'en' }
      })
      expect(result).toEqual(mockCategories)
    })

    it('should handle different getCurrentLocale return values', async () => {
      // Arrange
      const mockCategories: CategoryDto[] = [
        { id: 1, key: 'test', name: 'Test', sortOrder: 1 }
      ]
      mockApi.get.mockResolvedValue({ data: mockCategories })

      const locales = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'pt', 'it', 'ru', 'ar']

      // Act & Assert
      for (const locale of locales) {
        mockGetCurrentLocale.mockReturnValue(locale)

        await categoriesService.getCategories()

        expect(mockApi.get).toHaveBeenCalledWith('/categories', {
          params: { locale }
        })

        vi.clearAllMocks()
        mockApi.get.mockResolvedValue({ data: mockCategories })
      }
    })

    it('should handle edge cases with parentId values', async () => {
      // Arrange
      const categoriesWithEdgeCaseParents: CategoryDto[] = [
        {
          id: 1,
          key: 'root',
          name: 'Root Category',
          parentId: null,
          sortOrder: 1
        },
        {
          id: 2,
          key: 'zero_parent',
          name: 'Zero Parent',
          parentId: 0, // Edge case: zero as parent
          sortOrder: 2
        },
        {
          id: 3,
          key: 'negative_parent',
          name: 'Negative Parent',
          parentId: -1, // Edge case: negative parent
          sortOrder: 3
        },
        {
          id: 4,
          key: 'large_parent',
          name: 'Large Parent ID',
          parentId: 999999, // Edge case: very large parent ID
          sortOrder: 4
        }
      ]

      mockApi.get.mockResolvedValue({
        data: categoriesWithEdgeCaseParents
      })

      // Act
      const result = await categoriesService.getCategories()

      // Assert
      expect(result).toEqual(categoriesWithEdgeCaseParents)
      expect(result[0].parentId).toBeNull()
      expect(result[1].parentId).toBe(0)
      expect(result[2].parentId).toBe(-1)
      expect(result[3].parentId).toBe(999999)
    })

    it('should preserve category order as returned by API', async () => {
      // Arrange
      const unorderedCategories: CategoryDto[] = [
        { id: 5, key: 'fifth', name: 'Fifth', sortOrder: 5 },
        { id: 1, key: 'first', name: 'First', sortOrder: 1 },
        { id: 3, key: 'third', name: 'Third', sortOrder: 3 },
        { id: 2, key: 'second', name: 'Second', sortOrder: 2 },
        { id: 4, key: 'fourth', name: 'Fourth', sortOrder: 4 }
      ]

      mockApi.get.mockResolvedValue({
        data: unorderedCategories
      })

      // Act
      const result = await categoriesService.getCategories()

      // Assert
      expect(result).toEqual(unorderedCategories)
      // Should preserve API response order, not sort by sortOrder
      expect(result[0].id).toBe(5)
      expect(result[1].id).toBe(1)
      expect(result[2].id).toBe(3)
    })

    it('should handle timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Timeout')
      Object.assign(timeoutError, { code: 'ECONNABORTED' })
      mockApi.get.mockRejectedValue(timeoutError)

      // Act & Assert
      await expect(categoriesService.getCategories()).rejects.toThrow('Timeout')
    })
  })

  describe('service integration', () => {
    it('should work correctly with different locale combinations', async () => {
      // Arrange
      const enCategories: CategoryDto[] = [
        { id: 1, key: 'food', name: 'Food', sortOrder: 1 }
      ]
      const esCategories: CategoryDto[] = [
        { id: 1, key: 'food', name: 'Comida', sortOrder: 1 }
      ]

      // Act & Assert
      mockApi.get.mockResolvedValue({ data: enCategories })
      const resultEn = await categoriesService.getCategories('en')
      expect(resultEn[0].name).toBe('Food')

      mockApi.get.mockResolvedValue({ data: esCategories })
      const resultEs = await categoriesService.getCategories('es')
      expect(resultEs[0].name).toBe('Comida')

      expect(mockApi.get).toHaveBeenCalledTimes(2)
    })

    it('should handle multiple concurrent requests', async () => {
      // Arrange
      const mockCategories: CategoryDto[] = [
        { id: 1, key: 'test', name: 'Test', sortOrder: 1 }
      ]
      mockApi.get.mockResolvedValue({ data: mockCategories })

      // Act
      const promises = [
        categoriesService.getCategories('en'),
        categoriesService.getCategories('es'),
        categoriesService.getCategories('fr')
      ]

      const results = await Promise.all(promises)

      // Assert
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result).toEqual(mockCategories)
      })
      expect(mockApi.get).toHaveBeenCalledTimes(3)
    })
  })
})