import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pluginsService, type PluginDetectionResult } from '../plugins'
import api, { apiWithTimeout } from '../api'
import { errorLogger } from '../errorLogging'
import type { ReceiptPlugin, ReportPlugin, PluginStatistics } from '@/types/plugin'

// Mock the API module
vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  },
  apiWithTimeout: {
    fast: {
      get: vi.fn()
    },
    claudeUpload: {
      post: vi.fn()
    },
    standardUpload: {
      post: vi.fn()
    }
  }
}))

// Mock the error logger
vi.mock('../errorLogging', () => ({
  errorLogger: {
    logApiError: vi.fn(),
    logError: vi.fn()
  }
}))

const mockApi = vi.mocked(api)
const mockApiWithTimeout = vi.mocked(apiWithTimeout)
const mockErrorLogger = vi.mocked(errorLogger)

describe('pluginsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getAllPlugins', () => {
    it('should fetch all plugins successfully', async () => {
      // Arrange
      const mockResponse = {
        receiptPlugins: [
          {
            key: 'amazon-receipts',
            name: 'Amazon Receipt Parser',
            description: 'Parses Amazon receipts',
            supportedFileTypes: ['.pdf', '.jpg', '.png'],
            color: '#FF9900',
            enabled: true
          },
          {
            key: 'generic-receipt',
            name: 'Generic Receipt Parser',
            description: 'Parses any receipt format',
            supportedFileTypes: ['.pdf', '.jpg', '.png', '.txt'],
            color: '#4CAF50',
            enabled: true
          }
        ] as ReceiptPlugin[],
        reportPlugins: [
          {
            key: 'sales-summary',
            name: 'Sales Summary Report',
            description: 'Generates sales summary reports',
            enabled: true
          },
          {
            key: 'expense-tracking',
            name: 'Expense Tracking Report',
            description: 'Tracks expenses over time',
            enabled: true
          }
        ] as ReportPlugin[]
      }

      mockApiWithTimeout.fast.get.mockResolvedValue({
        data: mockResponse
      })

      // Act
      const result = await pluginsService.getAllPlugins()

      // Assert
      expect(mockApiWithTimeout.fast.get).toHaveBeenCalledTimes(1)
      expect(mockApiWithTimeout.fast.get).toHaveBeenCalledWith('/plugins')
      expect(result).toEqual(mockResponse)
      expect(result.receiptPlugins).toHaveLength(2)
      expect(result.reportPlugins).toHaveLength(2)
    })

    it('should handle API errors and log them', async () => {
      // Arrange
      const mockError = new Error('Network error')
      mockApiWithTimeout.fast.get.mockRejectedValue(mockError)

      // Act & Assert
      await expect(pluginsService.getAllPlugins()).rejects.toThrow('Network error')
      expect(mockErrorLogger.logApiError).toHaveBeenCalledTimes(1)
      expect(mockErrorLogger.logApiError).toHaveBeenCalledWith(
        mockError,
        '/plugins'
      )
    })

    it('should handle non-Error objects', async () => {
      // Arrange
      const mockError = 'String error'
      mockApiWithTimeout.fast.get.mockRejectedValue(mockError)

      // Act & Assert
      await expect(pluginsService.getAllPlugins()).rejects.toThrow('String error')
      expect(mockErrorLogger.logApiError).toHaveBeenCalledWith(
        expect.any(Error),
        '/plugins'
      )
    })

    it('should return empty arrays when API returns empty data', async () => {
      // Arrange
      const mockResponse = {
        receiptPlugins: [],
        reportPlugins: []
      }

      mockApiWithTimeout.fast.get.mockResolvedValue({
        data: mockResponse
      })

      // Act
      const result = await pluginsService.getAllPlugins()

      // Assert
      expect(result.receiptPlugins).toEqual([])
      expect(result.reportPlugins).toEqual([])
    })
  })

  describe('getPluginStatistics', () => {
    it('should fetch plugin statistics successfully', async () => {
      // Arrange
      const mockStatistics: PluginStatistics = {
        totalPlugins: 5,
        enabledPlugins: 4,
        disabledPlugins: 1,
        receiptPluginsCount: 3,
        reportPluginsCount: 2,
        mostUsedPlugin: 'generic-receipt',
        pluginUsage: {
          'generic-receipt': 45,
          'amazon-receipts': 30,
          'sales-summary': 15
        }
      }

      mockApiWithTimeout.fast.get.mockResolvedValue({
        data: mockStatistics
      })

      // Act
      const result = await pluginsService.getPluginStatistics()

      // Assert
      expect(mockApiWithTimeout.fast.get).toHaveBeenCalledTimes(1)
      expect(mockApiWithTimeout.fast.get).toHaveBeenCalledWith('/plugins/statistics')
      expect(result).toEqual(mockStatistics)
    })

    it('should handle statistics API errors', async () => {
      // Arrange
      const mockError = new Error('Statistics unavailable')
      mockApiWithTimeout.fast.get.mockRejectedValue(mockError)

      // Act & Assert
      await expect(pluginsService.getPluginStatistics()).rejects.toThrow('Statistics unavailable')
      expect(mockErrorLogger.logApiError).toHaveBeenCalledWith(
        mockError,
        '/plugins/statistics'
      )
    })
  })

  describe('detectPlugin', () => {
    const mockAvailablePlugins: ReceiptPlugin[] = [
      {
        key: 'amazon-receipts',
        name: 'Amazon Receipt Parser',
        description: 'Parses Amazon receipts',
        supportedFileTypes: ['.pdf', '.jpg'],
        color: '#FF9900',
        enabled: true
      },
      {
        key: 'walmart-receipts',
        name: 'Walmart Receipt Parser',
        description: 'Parses Walmart receipts',
        supportedFileTypes: ['.pdf'],
        color: '#0071CE',
        enabled: true
      },
      {
        key: 'generic-receipt',
        name: 'Generic Receipt Parser',
        description: 'Parses any receipt format',
        supportedFileTypes: ['.pdf', '.jpg', '.png', '.txt'],
        color: '#4CAF50',
        enabled: true
      }
    ]

    it('should detect compatible plugin for PDF file', async () => {
      // Arrange
      const mockFile = new File(['test'], 'receipt.pdf', { type: 'application/pdf' })

      // Act
      const result = await pluginsService.detectPlugin(mockFile, mockAvailablePlugins)

      // Assert
      expect(result.success).toBe(true)
      expect(result.plugin).toBeDefined()
      expect(result.pluginKey).toBe('amazon-receipts') // Should prefer non-generic plugin
      expect(result.pluginName).toBe('Amazon Receipt Parser')
      expect(result.confidence).toBe(0.8)
      expect(result.message).toBe('Detected Amazon Receipt Parser for .pdf file')
    })

    it('should detect generic plugin when only generic supports file type', async () => {
      // Arrange
      const mockFile = new File(['test'], 'receipt.txt', { type: 'text/plain' })

      // Act
      const result = await pluginsService.detectPlugin(mockFile, mockAvailablePlugins)

      // Assert
      expect(result.success).toBe(true)
      expect(result.pluginKey).toBe('generic-receipt')
      expect(result.pluginName).toBe('Generic Receipt Parser')
    })

    it('should prefer specific plugins over generic ones', async () => {
      // Arrange
      const mockFile = new File(['test'], 'receipt.pdf', { type: 'application/pdf' })

      // Shuffle plugins to ensure sorting works
      const shuffledPlugins = [mockAvailablePlugins[2], mockAvailablePlugins[0], mockAvailablePlugins[1]]

      // Act
      const result = await pluginsService.detectPlugin(mockFile, shuffledPlugins)

      // Assert
      expect(result.success).toBe(true)
      expect(result.pluginKey).toBe('amazon-receipts') // Should still prefer non-generic
    })

    it('should handle files without extensions', async () => {
      // Arrange
      const mockFile = new File(['test'], 'receipt', { type: 'application/octet-stream' })

      // Act
      const result = await pluginsService.detectPlugin(mockFile, mockAvailablePlugins)

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toBe('No plugins support . files')
    })

    it('should handle unsupported file types', async () => {
      // Arrange
      const mockFile = new File(['test'], 'document.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })

      // Act
      const result = await pluginsService.detectPlugin(mockFile, mockAvailablePlugins)

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toBe('No plugins support .docx files')
    })

    it('should handle empty plugin list', async () => {
      // Arrange
      const mockFile = new File(['test'], 'receipt.pdf', { type: 'application/pdf' })

      // Act
      const result = await pluginsService.detectPlugin(mockFile, [])

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toBe('No plugins support .pdf files')
    })

    it('should handle case-insensitive file extensions', async () => {
      // Arrange
      const mockFile = new File(['test'], 'receipt.PDF', { type: 'application/pdf' })

      // Act
      const result = await pluginsService.detectPlugin(mockFile, mockAvailablePlugins)

      // Assert
      expect(result.success).toBe(true)
      expect(result.pluginKey).toBe('amazon-receipts')
    })

    it('should handle files with multiple dots in name', async () => {
      // Arrange
      const mockFile = new File(['test'], 'receipt.backup.2024.pdf', { type: 'application/pdf' })

      // Act
      const result = await pluginsService.detectPlugin(mockFile, mockAvailablePlugins)

      // Assert
      expect(result.success).toBe(true)
      expect(result.pluginKey).toBe('amazon-receipts')
    })

    it('should handle errors during detection', async () => {
      // Arrange
      const mockFile = new File(['test'], 'receipt.pdf', { type: 'application/pdf' })
      // Create plugins array that will cause an error when accessed
      const faultyPlugins = null as any

      // Act
      const result = await pluginsService.detectPlugin(mockFile, faultyPlugins)

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toBe('Error occurred during plugin detection')
      expect(mockErrorLogger.logError).toHaveBeenCalledWith(
        expect.any(Error),
        'Plugin Detection',
        expect.objectContaining({
          fileName: 'receipt.pdf',
          fileSize: mockFile.size,
          fileType: 'application/pdf',
          availablePluginsCount: undefined
        })
      )
    })

    it('should include all plugin information in successful detection', async () => {
      // Arrange
      const mockFile = new File(['test'], 'receipt.jpg', { type: 'image/jpeg' })

      // Act
      const result = await pluginsService.detectPlugin(mockFile, mockAvailablePlugins)

      // Assert
      expect(result.success).toBe(true)
      expect(result.plugin).toBeDefined()
      expect(result.pluginKey).toBe('amazon-receipts')
      expect(result.pluginName).toBe('Amazon Receipt Parser')
      expect(result.pluginDescription).toBe('Parses Amazon receipts')
      expect(result.color).toBe('#FF9900')
      expect(result.confidence).toBe(0.8)
    })
  })

  describe('uploadWithAutoDetection', () => {
    it('should upload file with auto detection successfully', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'receipt.pdf', { type: 'application/pdf' })
      const mockResponse = {
        success: true,
        receiptId: 'receipt-123',
        plugin: 'generic-receipt'
      }

      mockApiWithTimeout.claudeUpload.post.mockResolvedValue({
        data: mockResponse
      })

      // Act
      const result = await pluginsService.uploadWithAutoDetection(mockFile)

      // Assert
      expect(mockApiWithTimeout.claudeUpload.post).toHaveBeenCalledTimes(1)
      expect(mockApiWithTimeout.claudeUpload.post).toHaveBeenCalledWith(
        '/upload',
        expect.any(FormData),
        {
          onUploadProgress: undefined
        }
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle upload progress callback', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'receipt.pdf', { type: 'application/pdf' })
      const mockProgressCallback = vi.fn()
      const mockResponse = { success: true }

      mockApiWithTimeout.claudeUpload.post.mockResolvedValue({
        data: mockResponse
      })

      // Act
      await pluginsService.uploadWithAutoDetection(mockFile, mockProgressCallback)

      // Assert
      expect(mockApiWithTimeout.claudeUpload.post).toHaveBeenCalledWith(
        '/upload',
        expect.any(FormData),
        {
          onUploadProgress: mockProgressCallback
        }
      )
    })

    it('should handle upload errors and log them', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'receipt.pdf', { type: 'application/pdf' })
      const mockError = {
        message: 'Upload failed',
        response: { status: 500 }
      }

      mockApiWithTimeout.claudeUpload.post.mockRejectedValue(mockError)

      // Act & Assert
      await expect(pluginsService.uploadWithAutoDetection(mockFile)).rejects.toThrow()
      expect(mockErrorLogger.logApiError).toHaveBeenCalledWith(
        expect.any(Error),
        '/upload',
        500
      )
    })

    it('should create proper FormData', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'receipt.pdf', { type: 'application/pdf' })
      mockApiWithTimeout.claudeUpload.post.mockResolvedValue({ data: {} })

      // Act
      await pluginsService.uploadWithAutoDetection(mockFile)

      // Assert
      const formDataArg = mockApiWithTimeout.claudeUpload.post.mock.calls[0][1] as FormData
      expect(formDataArg).toBeInstanceOf(FormData)
      expect(formDataArg.get('file')).toBe(mockFile)
    })
  })

  describe('uploadWithSpecificPlugin', () => {
    it('should upload file with Claude plugin using Claude upload timeout', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'receipt.pdf', { type: 'application/pdf' })
      const pluginKey = 'generic-receipt'
      const mockResponse = { success: true, plugin: pluginKey }

      mockApiWithTimeout.claudeUpload.post.mockResolvedValue({
        data: mockResponse
      })

      // Act
      const result = await pluginsService.uploadWithSpecificPlugin(mockFile, pluginKey)

      // Assert
      expect(mockApiWithTimeout.claudeUpload.post).toHaveBeenCalledTimes(1)
      expect(mockApiWithTimeout.claudeUpload.post).toHaveBeenCalledWith(
        `/upload?pluginKey=${pluginKey}`,
        expect.any(FormData),
        {
          onUploadProgress: undefined
        }
      )
      expect(result).toEqual(mockResponse)
    })

    it('should upload file with receipt plugin using Claude upload timeout', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'receipt.pdf', { type: 'application/pdf' })
      const pluginKey = 'amazon-receipt-parser'
      const mockResponse = { success: true, plugin: pluginKey }

      mockApiWithTimeout.claudeUpload.post.mockResolvedValue({
        data: mockResponse
      })

      // Act
      await pluginsService.uploadWithSpecificPlugin(mockFile, pluginKey)

      // Assert
      expect(mockApiWithTimeout.claudeUpload.post).toHaveBeenCalledTimes(1)
      expect(mockApiWithTimeout.standardUpload.post).not.toHaveBeenCalled()
    })

    it('should upload file with non-Claude plugin using standard upload timeout', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'receipt.pdf', { type: 'application/pdf' })
      const pluginKey = 'walmart-parser'
      const mockResponse = { success: true, plugin: pluginKey }

      mockApiWithTimeout.standardUpload.post.mockResolvedValue({
        data: mockResponse
      })

      // Act
      const result = await pluginsService.uploadWithSpecificPlugin(mockFile, pluginKey)

      // Assert
      expect(mockApiWithTimeout.standardUpload.post).toHaveBeenCalledTimes(1)
      expect(mockApiWithTimeout.standardUpload.post).toHaveBeenCalledWith(
        `/upload?pluginKey=${pluginKey}`,
        expect.any(FormData),
        {
          onUploadProgress: undefined
        }
      )
      expect(mockApiWithTimeout.claudeUpload.post).not.toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
    })

    it('should handle upload progress with specific plugin', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'receipt.pdf', { type: 'application/pdf' })
      const pluginKey = 'custom-parser'
      const mockProgressCallback = vi.fn()

      mockApiWithTimeout.standardUpload.post.mockResolvedValue({ data: {} })

      // Act
      await pluginsService.uploadWithSpecificPlugin(mockFile, pluginKey, mockProgressCallback)

      // Assert
      expect(mockApiWithTimeout.standardUpload.post).toHaveBeenCalledWith(
        `/upload?pluginKey=${pluginKey}`,
        expect.any(FormData),
        {
          onUploadProgress: mockProgressCallback
        }
      )
    })

    it('should handle upload errors with specific plugin', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'receipt.pdf', { type: 'application/pdf' })
      const pluginKey = 'failing-plugin'
      const mockError = {
        message: 'Plugin not found',
        response: { status: 404 }
      }

      mockApiWithTimeout.standardUpload.post.mockRejectedValue(mockError)

      // Act & Assert
      await expect(
        pluginsService.uploadWithSpecificPlugin(mockFile, pluginKey)
      ).rejects.toThrow()
      expect(mockErrorLogger.logApiError).toHaveBeenCalledWith(
        expect.any(Error),
        `/upload?pluginKey=${pluginKey}`,
        404
      )
    })

    it('should correctly identify Claude plugins by key patterns', async () => {
      // Arrange
      const mockFile = new File(['test'], 'receipt.pdf', { type: 'application/pdf' })

      const claudePlugins = ['generic-parser', 'receipt-analyzer', 'generic-receipt', 'receipt-generic']
      const nonClaudePlugins = ['amazon-parser', 'walmart-scanner', 'target-reader']

      mockApiWithTimeout.claudeUpload.post.mockResolvedValue({ data: {} })
      mockApiWithTimeout.standardUpload.post.mockResolvedValue({ data: {} })

      // Act & Assert - Claude plugins
      for (const pluginKey of claudePlugins) {
        vi.clearAllMocks()
        await pluginsService.uploadWithSpecificPlugin(mockFile, pluginKey)
        expect(mockApiWithTimeout.claudeUpload.post).toHaveBeenCalledTimes(1)
        expect(mockApiWithTimeout.standardUpload.post).not.toHaveBeenCalled()
      }

      // Act & Assert - Non-Claude plugins
      for (const pluginKey of nonClaudePlugins) {
        vi.clearAllMocks()
        await pluginsService.uploadWithSpecificPlugin(mockFile, pluginKey)
        expect(mockApiWithTimeout.standardUpload.post).toHaveBeenCalledTimes(1)
        expect(mockApiWithTimeout.claudeUpload.post).not.toHaveBeenCalled()
      }
    })

    it('should handle empty plugin key', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'receipt.pdf', { type: 'application/pdf' })
      const pluginKey = ''

      mockApiWithTimeout.standardUpload.post.mockResolvedValue({ data: {} })

      // Act
      await pluginsService.uploadWithSpecificPlugin(mockFile, pluginKey)

      // Assert
      expect(mockApiWithTimeout.standardUpload.post).toHaveBeenCalledWith(
        '/upload?pluginKey=',
        expect.any(FormData),
        expect.any(Object)
      )
    })
  })

  describe('service integration', () => {
    it('should work with getAllPlugins and detectPlugin in sequence', async () => {
      // Arrange
      const mockPluginData = {
        receiptPlugins: [
          {
            key: 'amazon-receipts',
            name: 'Amazon Receipt Parser',
            supportedFileTypes: ['.pdf'],
            color: '#FF9900',
            enabled: true
          }
        ] as ReceiptPlugin[],
        reportPlugins: []
      }

      mockApiWithTimeout.fast.get.mockResolvedValue({ data: mockPluginData })

      const mockFile = new File(['test'], 'receipt.pdf', { type: 'application/pdf' })

      // Act
      const plugins = await pluginsService.getAllPlugins()
      const detection = await pluginsService.detectPlugin(mockFile, plugins.receiptPlugins)

      // Assert
      expect(plugins.receiptPlugins).toHaveLength(1)
      expect(detection.success).toBe(true)
      expect(detection.pluginKey).toBe('amazon-receipts')
    })
  })
})