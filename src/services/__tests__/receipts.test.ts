import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { receiptsService } from '../receipts';
import api from '../api';
import { getCurrentLocale } from '@/i18n';
import type { Receipt, ReceiptItem, ReceiptQuery, PagedResult } from '@/types/receipt';
import type { ProcessingResult } from '@/types/plugin';

// Mock the API module
vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

// Mock the i18n module
vi.mock('@/i18n', () => ({
  getCurrentLocale: vi.fn()
}));

describe('receipts service', () => {
  let mockApi: typeof api;
  let mockGetCurrentLocale: ReturnType<typeof vi.fn>;

  // Mock data
  const mockReceipt: Receipt = {
    id: 1,
    filename: 'test-receipt.jpg',
    receiptDate: '2024-01-15',
    storeName: 'Test Store',
    processingStatus: 'completed',
    totalItemsDetected: 5,
    successfullyParsed: 4,
    items: [],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z'
  };

  const mockReceiptItem: ReceiptItem = {
    id: 1,
    receiptId: 1,
    itemName: 'Test Item',
    quantity: 2,
    totalPrice: 10.99,
    category: { id: 1, name: 'Groceries', locale: 'en' },
    confidence: 'high',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z'
  };

  const mockPagedResult: PagedResult<Receipt> = {
    data: [mockReceipt],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1
  };

  const mockProcessingResult: ProcessingResult = {
    receipt: mockReceipt,
    items: [mockReceiptItem],
    success: true,
    message: 'Receipt processed successfully',
    isDuplicate: false,
    errors: []
  };

  beforeEach(() => {
    mockApi = api as any;
    mockGetCurrentLocale = getCurrentLocale as any;

    // Reset all mocks
    vi.clearAllMocks();

    // Default locale mock
    mockGetCurrentLocale.mockReturnValue('en');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getReceipts', () => {
    it('should fetch receipts with locale parameter', async () => {
      mockApi.get.mockResolvedValue({ data: mockPagedResult });

      const result = await receiptsService.getReceipts();

      expect(mockApi.get).toHaveBeenCalledWith('/receipts', {
        params: { locale: 'en' }
      });
      expect(result).toEqual(mockPagedResult);
    });

    it('should fetch receipts with query parameters and locale', async () => {
      const query: ReceiptQuery = {
        page: 2,
        pageSize: 10,
        processingStatus: 'completed',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        search: 'test'
      };

      mockApi.get.mockResolvedValue({ data: mockPagedResult });

      const result = await receiptsService.getReceipts(query);

      expect(mockApi.get).toHaveBeenCalledWith('/receipts', {
        params: {
          locale: 'en',
          page: 2,
          pageSize: 10,
          processingStatus: 'completed',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          search: 'test'
        }
      });
      expect(result).toEqual(mockPagedResult);
    });

    it('should use current locale from i18n', async () => {
      mockGetCurrentLocale.mockReturnValue('es');
      mockApi.get.mockResolvedValue({ data: mockPagedResult });

      await receiptsService.getReceipts();

      expect(mockApi.get).toHaveBeenCalledWith('/receipts', {
        params: { locale: 'es' }
      });
    });

    it('should handle empty query parameters', async () => {
      mockApi.get.mockResolvedValue({ data: mockPagedResult });

      await receiptsService.getReceipts({});

      expect(mockApi.get).toHaveBeenCalledWith('/receipts', {
        params: { locale: 'en' }
      });
    });

    it('should propagate API errors', async () => {
      const apiError = new Error('Network error');
      mockApi.get.mockRejectedValue(apiError);

      await expect(receiptsService.getReceipts()).rejects.toThrow('Network error');
    });
  });

  describe('getReceipt', () => {
    it('should fetch single receipt with locale parameter', async () => {
      mockApi.get.mockResolvedValue({ data: mockReceipt });

      const result = await receiptsService.getReceipt(1);

      expect(mockApi.get).toHaveBeenCalledWith('/receipts/1', {
        params: { locale: 'en' }
      });
      expect(result).toEqual(mockReceipt);
    });

    it('should use current locale from i18n', async () => {
      mockGetCurrentLocale.mockReturnValue('es');
      mockApi.get.mockResolvedValue({ data: mockReceipt });

      await receiptsService.getReceipt(1);

      expect(mockApi.get).toHaveBeenCalledWith('/receipts/1', {
        params: { locale: 'es' }
      });
    });

    it('should handle different receipt IDs', async () => {
      mockApi.get.mockResolvedValue({ data: { ...mockReceipt, id: 999 } });

      const result = await receiptsService.getReceipt(999);

      expect(mockApi.get).toHaveBeenCalledWith('/receipts/999', {
        params: { locale: 'en' }
      });
      expect(result.id).toBe(999);
    });

    it('should propagate API errors', async () => {
      const apiError = new Error('Receipt not found');
      mockApi.get.mockRejectedValue(apiError);

      await expect(receiptsService.getReceipt(999)).rejects.toThrow('Receipt not found');
    });
  });

  describe('createReceipt', () => {
    it('should create receipt with provided data', async () => {
      const receiptData = { filename: 'new-receipt.jpg', storeName: 'New Store' };
      mockApi.post.mockResolvedValue({ data: mockReceipt });

      const result = await receiptsService.createReceipt(receiptData);

      expect(mockApi.post).toHaveBeenCalledWith('/receipts', receiptData);
      expect(result).toEqual(mockReceipt);
    });

    it('should handle empty receipt data', async () => {
      mockApi.post.mockResolvedValue({ data: mockReceipt });

      const result = await receiptsService.createReceipt({});

      expect(mockApi.post).toHaveBeenCalledWith('/receipts', {});
      expect(result).toEqual(mockReceipt);
    });

    it('should propagate API errors', async () => {
      const apiError = new Error('Validation failed');
      mockApi.post.mockRejectedValue(apiError);

      await expect(receiptsService.createReceipt({})).rejects.toThrow('Validation failed');
    });
  });

  describe('updateReceipt', () => {
    it('should update receipt with provided data', async () => {
      const updates = { storeName: 'Updated Store', processingStatus: 'completed' as const };
      const updatedReceipt = { ...mockReceipt, ...updates };
      mockApi.put.mockResolvedValue({ data: updatedReceipt });

      const result = await receiptsService.updateReceipt(1, updates);

      expect(mockApi.put).toHaveBeenCalledWith('/receipts/1', updates);
      expect(result).toEqual(updatedReceipt);
    });

    it('should handle partial updates', async () => {
      const updates = { storeName: 'Partial Update' };
      mockApi.put.mockResolvedValue({ data: { ...mockReceipt, ...updates } });

      const result = await receiptsService.updateReceipt(1, updates);

      expect(mockApi.put).toHaveBeenCalledWith('/receipts/1', updates);
      expect(result.storeName).toBe('Partial Update');
    });

    it('should handle different receipt IDs', async () => {
      const updates = { storeName: 'Test' };
      mockApi.put.mockResolvedValue({ data: mockReceipt });

      await receiptsService.updateReceipt(999, updates);

      expect(mockApi.put).toHaveBeenCalledWith('/receipts/999', updates);
    });

    it('should propagate API errors', async () => {
      const apiError = new Error('Update failed');
      mockApi.put.mockRejectedValue(apiError);

      await expect(receiptsService.updateReceipt(1, {})).rejects.toThrow('Update failed');
    });
  });

  describe('deleteReceipt', () => {
    it('should delete receipt by ID', async () => {
      mockApi.delete.mockResolvedValue({});

      await receiptsService.deleteReceipt(1);

      expect(mockApi.delete).toHaveBeenCalledWith('/receipts/1');
    });

    it('should handle different receipt IDs', async () => {
      mockApi.delete.mockResolvedValue({});

      await receiptsService.deleteReceipt(999);

      expect(mockApi.delete).toHaveBeenCalledWith('/receipts/999');
    });

    it('should propagate API errors', async () => {
      const apiError = new Error('Delete failed');
      mockApi.delete.mockRejectedValue(apiError);

      await expect(receiptsService.deleteReceipt(1)).rejects.toThrow('Delete failed');
    });

    it('should not return anything on success', async () => {
      mockApi.delete.mockResolvedValue({});

      const result = await receiptsService.deleteReceipt(1);

      expect(result).toBeUndefined();
    });
  });

  describe('getReceiptItems', () => {
    it('should fetch receipt items by receipt ID', async () => {
      const mockItems = [mockReceiptItem];
      mockApi.get.mockResolvedValue({ data: mockItems });

      const result = await receiptsService.getReceiptItems(1);

      expect(mockApi.get).toHaveBeenCalledWith('/receipts/1/items');
      expect(result).toEqual(mockItems);
    });

    it('should handle empty items array', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      const result = await receiptsService.getReceiptItems(1);

      expect(result).toEqual([]);
    });

    it('should handle different receipt IDs', async () => {
      mockApi.get.mockResolvedValue({ data: [mockReceiptItem] });

      await receiptsService.getReceiptItems(999);

      expect(mockApi.get).toHaveBeenCalledWith('/receipts/999/items');
    });

    it('should propagate API errors', async () => {
      const apiError = new Error('Items not found');
      mockApi.get.mockRejectedValue(apiError);

      await expect(receiptsService.getReceiptItems(1)).rejects.toThrow('Items not found');
    });
  });

  describe('reprocessReceipt', () => {
    it('should reprocess receipt without plugin key', async () => {
      mockApi.post.mockResolvedValue({ data: mockProcessingResult });

      const result = await receiptsService.reprocessReceipt(1);

      expect(mockApi.post).toHaveBeenCalledWith('/receipts/1/reprocess', null, {
        params: { pluginKey: undefined }
      });
      expect(result).toEqual(mockProcessingResult);
    });

    it('should reprocess receipt with plugin key', async () => {
      mockApi.post.mockResolvedValue({ data: mockProcessingResult });

      const result = await receiptsService.reprocessReceipt(1, 'test-plugin');

      expect(mockApi.post).toHaveBeenCalledWith('/receipts/1/reprocess', null, {
        params: { pluginKey: 'test-plugin' }
      });
      expect(result).toEqual(mockProcessingResult);
    });

    it('should handle different receipt IDs', async () => {
      mockApi.post.mockResolvedValue({ data: mockProcessingResult });

      await receiptsService.reprocessReceipt(999, 'test-plugin');

      expect(mockApi.post).toHaveBeenCalledWith('/receipts/999/reprocess', null, {
        params: { pluginKey: 'test-plugin' }
      });
    });

    it('should propagate API errors', async () => {
      const apiError = new Error('Reprocess failed');
      mockApi.post.mockRejectedValue(apiError);

      await expect(receiptsService.reprocessReceipt(1)).rejects.toThrow('Reprocess failed');
    });
  });

  describe('uploadReceipt', () => {
    const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

    it('should upload receipt file without plugin key', async () => {
      mockApi.post.mockResolvedValue({ data: mockProcessingResult });

      const result = await receiptsService.uploadReceipt(mockFile);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/upload',
        expect.any(FormData),
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          params: { pluginKey: undefined }
        }
      );
      expect(result).toEqual(mockProcessingResult);
    });

    it('should upload receipt file with plugin key', async () => {
      mockApi.post.mockResolvedValue({ data: mockProcessingResult });

      const result = await receiptsService.uploadReceipt(mockFile, 'test-plugin');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/upload',
        expect.any(FormData),
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          params: { pluginKey: 'test-plugin' }
        }
      );
      expect(result).toEqual(mockProcessingResult);
    });

    it('should append file to FormData with correct field name', async () => {
      mockApi.post.mockResolvedValue({ data: mockProcessingResult });

      await receiptsService.uploadReceipt(mockFile);

      const formDataCall = mockApi.post.mock.calls[0];
      const formData = formDataCall[1] as FormData;

      expect(formData.get('file')).toEqual(mockFile);
    });

    it('should handle different file types', async () => {
      const pdfFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      mockApi.post.mockResolvedValue({ data: mockProcessingResult });

      await receiptsService.uploadReceipt(pdfFile, 'pdf-plugin');

      const formDataCall = mockApi.post.mock.calls[0];
      const formData = formDataCall[1] as FormData;

      expect(formData.get('file')).toEqual(pdfFile);
    });

    it('should propagate API errors', async () => {
      const apiError = new Error('Upload failed');
      mockApi.post.mockRejectedValue(apiError);

      await expect(receiptsService.uploadReceipt(mockFile)).rejects.toThrow('Upload failed');
    });
  });

  describe('validateFile', () => {
    const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    const mockValidationResponse = {
      valid: true,
      message: 'File is valid',
      plugin: 'image-plugin',
      fileSize: 1024,
      maxFileSize: 5242880
    };

    it('should validate file without plugin key', async () => {
      mockApi.post.mockResolvedValue({ data: mockValidationResponse });

      const result = await receiptsService.validateFile(mockFile);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/upload/validate',
        expect.any(FormData),
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          params: { pluginKey: undefined }
        }
      );
      expect(result).toEqual(mockValidationResponse);
    });

    it('should validate file with plugin key', async () => {
      mockApi.post.mockResolvedValue({ data: mockValidationResponse });

      const result = await receiptsService.validateFile(mockFile, 'test-plugin');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/upload/validate',
        expect.any(FormData),
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          params: { pluginKey: 'test-plugin' }
        }
      );
      expect(result).toEqual(mockValidationResponse);
    });

    it('should handle validation failure response', async () => {
      const invalidResponse = {
        valid: false,
        message: 'File too large',
        fileSize: 10485760,
        maxFileSize: 5242880
      };
      mockApi.post.mockResolvedValue({ data: invalidResponse });

      const result = await receiptsService.validateFile(mockFile);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('File too large');
    });

    it('should propagate API errors', async () => {
      const apiError = new Error('Validation service unavailable');
      mockApi.post.mockRejectedValue(apiError);

      await expect(receiptsService.validateFile(mockFile)).rejects.toThrow('Validation service unavailable');
    });
  });

  describe('getStoreNames', () => {
    it('should fetch store names without search parameter', async () => {
      const mockStoreNames = ['Store A', 'Store B', 'Store C'];
      mockApi.get.mockResolvedValue({ data: mockStoreNames });

      const result = await receiptsService.getStoreNames();

      expect(mockApi.get).toHaveBeenCalledWith('/receipts/store-names', {
        params: { search: undefined }
      });
      expect(result).toEqual(mockStoreNames);
    });

    it('should fetch store names with search parameter', async () => {
      const mockStoreNames = ['Store A'];
      mockApi.get.mockResolvedValue({ data: mockStoreNames });

      const result = await receiptsService.getStoreNames('Store A');

      expect(mockApi.get).toHaveBeenCalledWith('/receipts/store-names', {
        params: { search: 'Store A' }
      });
      expect(result).toEqual(mockStoreNames);
    });

    it('should handle empty results', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      const result = await receiptsService.getStoreNames('nonexistent');

      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      const apiError = new Error('Service unavailable');
      mockApi.get.mockRejectedValue(apiError);

      await expect(receiptsService.getStoreNames()).rejects.toThrow('Service unavailable');
    });
  });

  describe('getItemNames', () => {
    it('should fetch item names without search parameter', async () => {
      const mockItemNames = ['Item A', 'Item B', 'Item C'];
      mockApi.get.mockResolvedValue({ data: mockItemNames });

      const result = await receiptsService.getItemNames();

      expect(mockApi.get).toHaveBeenCalledWith('/receipts/item-names', {
        params: { search: undefined }
      });
      expect(result).toEqual(mockItemNames);
    });

    it('should fetch item names with search parameter', async () => {
      const mockItemNames = ['Item A'];
      mockApi.get.mockResolvedValue({ data: mockItemNames });

      const result = await receiptsService.getItemNames('Item A');

      expect(mockApi.get).toHaveBeenCalledWith('/receipts/item-names', {
        params: { search: 'Item A' }
      });
      expect(result).toEqual(mockItemNames);
    });

    it('should handle empty results', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      const result = await receiptsService.getItemNames('nonexistent');

      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      const apiError = new Error('Service unavailable');
      mockApi.get.mockRejectedValue(apiError);

      await expect(receiptsService.getItemNames()).rejects.toThrow('Service unavailable');
    });
  });

  describe('getCategories', () => {
    it('should fetch categories without search parameter with locale', async () => {
      const mockCategories = ['Groceries', 'Electronics', 'Clothing'];
      mockApi.get.mockResolvedValue({ data: mockCategories });

      const result = await receiptsService.getCategories();

      expect(mockApi.get).toHaveBeenCalledWith('/receipts/categories', {
        params: { search: undefined, locale: 'en' }
      });
      expect(result).toEqual(mockCategories);
    });

    it('should fetch categories with search parameter and locale', async () => {
      const mockCategories = ['Groceries'];
      mockApi.get.mockResolvedValue({ data: mockCategories });

      const result = await receiptsService.getCategories('Grocer');

      expect(mockApi.get).toHaveBeenCalledWith('/receipts/categories', {
        params: { search: 'Grocer', locale: 'en' }
      });
      expect(result).toEqual(mockCategories);
    });

    it('should use current locale from i18n', async () => {
      mockGetCurrentLocale.mockReturnValue('es');
      const mockCategories = ['Comestibles'];
      mockApi.get.mockResolvedValue({ data: mockCategories });

      const result = await receiptsService.getCategories();

      expect(mockApi.get).toHaveBeenCalledWith('/receipts/categories', {
        params: { search: undefined, locale: 'es' }
      });
      expect(result).toEqual(mockCategories);
    });

    it('should handle string array response', async () => {
      const mockCategories = ['Groceries', 'Electronics'];
      mockApi.get.mockResolvedValue({ data: mockCategories });

      const result = await receiptsService.getCategories();

      expect(result).toEqual(mockCategories);
    });

    it('should handle canonical object array response', async () => {
      const mockCategoriesObjects = [
        { raw: 'groceries', name: 'Groceries' },
        { raw: 'electronics', name: 'Electronics' }
      ];
      mockApi.get.mockResolvedValue({ data: mockCategoriesObjects });

      const result = await receiptsService.getCategories();

      expect(result).toEqual(['Groceries', 'Electronics']);
    });

    it('should handle object array with missing name (fallback to raw)', async () => {
      const mockCategoriesObjects = [
        { raw: 'groceries' },
        { name: 'Electronics' },
        { raw: 'clothing', name: 'Clothing' }
      ];
      mockApi.get.mockResolvedValue({ data: mockCategoriesObjects });

      const result = await receiptsService.getCategories();

      expect(result).toEqual(['groceries', 'Electronics', 'Clothing']);
    });

    it('should handle object array with missing both fields', async () => {
      const mockCategoriesObjects = [
        { raw: 'groceries', name: 'Groceries' },
        {},
        { raw: 'electronics', name: 'Electronics' }
      ];
      mockApi.get.mockResolvedValue({ data: mockCategoriesObjects });

      const result = await receiptsService.getCategories();

      expect(result).toEqual(['Groceries', '', 'Electronics']);
    });

    it('should handle empty array response', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      const result = await receiptsService.getCategories();

      expect(result).toEqual([]);
    });

    it('should handle non-array response', async () => {
      mockApi.get.mockResolvedValue({ data: null });

      const result = await receiptsService.getCategories();

      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      const apiError = new Error('Categories service unavailable');
      mockApi.get.mockRejectedValue(apiError);

      await expect(receiptsService.getCategories()).rejects.toThrow('Categories service unavailable');
    });
  });

  describe('getUnits', () => {
    it('should fetch units without search parameter', async () => {
      const mockUnits = ['kg', 'lb', 'oz', 'g'];
      mockApi.get.mockResolvedValue({ data: mockUnits });

      const result = await receiptsService.getUnits();

      expect(mockApi.get).toHaveBeenCalledWith('/receipts/units', {
        params: { search: undefined }
      });
      expect(result).toEqual(mockUnits);
    });

    it('should fetch units with search parameter', async () => {
      const mockUnits = ['kg', 'g'];
      mockApi.get.mockResolvedValue({ data: mockUnits });

      const result = await receiptsService.getUnits('g');

      expect(mockApi.get).toHaveBeenCalledWith('/receipts/units', {
        params: { search: 'g' }
      });
      expect(result).toEqual(mockUnits);
    });

    it('should handle empty results', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      const result = await receiptsService.getUnits('nonexistent');

      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      const apiError = new Error('Units service unavailable');
      mockApi.get.mockRejectedValue(apiError);

      await expect(receiptsService.getUnits()).rejects.toThrow('Units service unavailable');
    });
  });

  describe('updateReceiptItem', () => {
    const mockItemUpdate = {
      itemName: 'Updated Item',
      totalPrice: 15.99,
      category: { id: 2, name: 'Updated Category' }
    };

    it('should update receipt item with locale parameter', async () => {
      const updatedItem = { ...mockReceiptItem, ...mockItemUpdate };
      mockApi.put.mockResolvedValue({ data: updatedItem });

      const result = await receiptsService.updateReceiptItem(1, mockItemUpdate);

      expect(mockApi.put).toHaveBeenCalledWith('/receipts/items/1', mockItemUpdate, {
        params: { locale: 'en' }
      });
      expect(result).toEqual(updatedItem);
    });

    it('should use current locale from i18n', async () => {
      mockGetCurrentLocale.mockReturnValue('es');
      const updatedItem = { ...mockReceiptItem, ...mockItemUpdate };
      mockApi.put.mockResolvedValue({ data: updatedItem });

      const result = await receiptsService.updateReceiptItem(1, mockItemUpdate);

      expect(mockApi.put).toHaveBeenCalledWith('/receipts/items/1', mockItemUpdate, {
        params: { locale: 'es' }
      });
      expect(result).toEqual(updatedItem);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { itemName: 'Partial Update' };
      const updatedItem = { ...mockReceiptItem, ...partialUpdate };
      mockApi.put.mockResolvedValue({ data: updatedItem });

      const result = await receiptsService.updateReceiptItem(1, partialUpdate);

      expect(mockApi.put).toHaveBeenCalledWith('/receipts/items/1', partialUpdate, {
        params: { locale: 'en' }
      });
      expect(result.itemName).toBe('Partial Update');
    });

    it('should handle different item IDs', async () => {
      mockApi.put.mockResolvedValue({ data: mockReceiptItem });

      await receiptsService.updateReceiptItem(999, mockItemUpdate);

      expect(mockApi.put).toHaveBeenCalledWith('/receipts/items/999', mockItemUpdate, {
        params: { locale: 'en' }
      });
    });

    it('should propagate API errors', async () => {
      const apiError = new Error('Item update failed');
      mockApi.put.mockRejectedValue(apiError);

      await expect(receiptsService.updateReceiptItem(1, mockItemUpdate)).rejects.toThrow('Item update failed');
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle API request timeouts', async () => {
      const timeoutError = new Error('timeout of 15000ms exceeded');
      timeoutError.name = 'AxiosError';
      mockApi.get.mockRejectedValue(timeoutError);

      await expect(receiptsService.getReceipts()).rejects.toThrow('timeout of 15000ms exceeded');
    });

    it('should handle network connectivity issues', async () => {
      const networkError = new Error('Network Error');
      networkError.name = 'AxiosError';
      mockApi.get.mockRejectedValue(networkError);

      await expect(receiptsService.getReceipts()).rejects.toThrow('Network Error');
    });

    it('should handle malformed API responses', async () => {
      mockApi.get.mockResolvedValue({ data: null });

      // This should not throw but should handle gracefully
      const result = await receiptsService.getCategories();
      expect(result).toEqual([]);
    });

    it('should handle missing getCurrentLocale function', async () => {
      mockGetCurrentLocale.mockImplementation(() => {
        throw new Error('i18n not initialized');
      });

      await expect(receiptsService.getReceipts()).rejects.toThrow('i18n not initialized');
    });
  });
});