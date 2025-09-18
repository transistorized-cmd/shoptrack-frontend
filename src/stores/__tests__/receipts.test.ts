import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useReceiptsStore } from '../receipts';
import { receiptsService } from '@/services/receipts';
import type { Receipt, ReceiptQuery, PagedResult } from '@/types/receipt';
import type { ProcessingResult } from '@/types/plugin';

// Mock the receipts service
vi.mock('@/services/receipts', () => ({
  receiptsService: {
    getReceipts: vi.fn(),
    getReceipt: vi.fn(),
    uploadReceipt: vi.fn(),
    updateReceipt: vi.fn(),
    deleteReceipt: vi.fn(),
    reprocessReceipt: vi.fn(),
  }
}));

describe('receipts store', () => {
  let store: ReturnType<typeof useReceiptsStore>;
  let mockReceiptsService: typeof receiptsService;

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

  const mockPagedResult: PagedResult<Receipt> = {
    data: [mockReceipt],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1
  };

  const mockProcessingResult: ProcessingResult = {
    receipt: mockReceipt,
    items: [],
    success: true,
    message: 'Receipt processed successfully',
    isDuplicate: false,
    errors: []
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useReceiptsStore();
    mockReceiptsService = receiptsService as any;

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      expect(store.receipts).toEqual([]);
      expect(store.currentReceipt).toBeNull();
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.pagination).toEqual({
        page: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 0
      });
    });
  });

  describe('computed properties', () => {
    beforeEach(() => {
      store.receipts = [
        { ...mockReceipt, id: 1, processingStatus: 'completed' },
        { ...mockReceipt, id: 2, processingStatus: 'pending' },
        { ...mockReceipt, id: 3, processingStatus: 'pending' },
        { ...mockReceipt, id: 4, processingStatus: 'failed' }
      ];
    });

    it('should compute hasReceipts correctly', () => {
      expect(store.hasReceipts).toBe(true);

      store.receipts = [];
      expect(store.hasReceipts).toBe(false);
    });

    it('should compute pendingReceipts correctly', () => {
      expect(store.pendingReceipts).toHaveLength(2);
      expect(store.pendingReceipts.every(r => r.processingStatus === 'pending')).toBe(true);
    });

    it('should compute completedReceipts correctly', () => {
      expect(store.completedReceipts).toHaveLength(1);
      expect(store.completedReceipts[0].processingStatus).toBe('completed');
    });
  });

  describe('fetchReceipts', () => {
    it('should fetch receipts successfully', async () => {
      mockReceiptsService.getReceipts.mockResolvedValue(mockPagedResult);

      await store.fetchReceipts();

      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.receipts).toEqual([mockReceipt]);
      expect(store.pagination).toEqual({
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1
      });
      expect(mockReceiptsService.getReceipts).toHaveBeenCalledWith(undefined);
    });

    it('should fetch receipts with query parameters', async () => {
      const query: ReceiptQuery = {
        page: 2,
        pageSize: 10,
        processingStatus: 'completed',
        search: 'test'
      };

      mockReceiptsService.getReceipts.mockResolvedValue(mockPagedResult);

      await store.fetchReceipts(query);

      expect(mockReceiptsService.getReceipts).toHaveBeenCalledWith(query);
    });

    it('should handle fetch receipts error', async () => {
      const errorMessage = 'Network error';
      mockReceiptsService.getReceipts.mockRejectedValue(new Error(errorMessage));

      await store.fetchReceipts();

      expect(store.loading).toBe(false);
      expect(store.error).toBe(errorMessage);
      expect(store.receipts).toEqual([]);
    });

    it('should handle non-Error exceptions', async () => {
      mockReceiptsService.getReceipts.mockRejectedValue('String error');

      await store.fetchReceipts();

      expect(store.error).toBe('Failed to fetch receipts');
    });

    it('should set loading state correctly during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockReceiptsService.getReceipts.mockReturnValue(promise);

      const fetchPromise = store.fetchReceipts();
      expect(store.loading).toBe(true);

      resolvePromise!(mockPagedResult);
      await fetchPromise;

      expect(store.loading).toBe(false);
    });
  });

  describe('fetchReceipt', () => {
    it('should fetch single receipt successfully', async () => {
      mockReceiptsService.getReceipt.mockResolvedValue(mockReceipt);

      const result = await store.fetchReceipt(1);

      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.currentReceipt).toEqual(mockReceipt);
      expect(result).toEqual(mockReceipt);
      expect(mockReceiptsService.getReceipt).toHaveBeenCalledWith(1);
    });

    it('should handle fetch receipt error and rethrow', async () => {
      const errorMessage = 'Receipt not found';
      mockReceiptsService.getReceipt.mockRejectedValue(new Error(errorMessage));

      await expect(store.fetchReceipt(999)).rejects.toThrow(errorMessage);

      expect(store.loading).toBe(false);
      expect(store.error).toBe(errorMessage);
      expect(store.currentReceipt).toBeNull();
    });

    it('should set loading state correctly during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockReceiptsService.getReceipt.mockReturnValue(promise);

      const fetchPromise = store.fetchReceipt(1);
      expect(store.loading).toBe(true);

      resolvePromise!(mockReceipt);
      await fetchPromise;

      expect(store.loading).toBe(false);
    });
  });

  describe('uploadReceipt', () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    it('should upload receipt successfully', async () => {
      mockReceiptsService.uploadReceipt.mockResolvedValue(mockProcessingResult);

      const result = await store.uploadReceipt(mockFile);

      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.receipts[0]).toEqual(mockReceipt);
      expect(result).toEqual(mockProcessingResult);
      expect(mockReceiptsService.uploadReceipt).toHaveBeenCalledWith(mockFile, undefined);
    });

    it('should upload receipt with plugin key', async () => {
      mockReceiptsService.uploadReceipt.mockResolvedValue(mockProcessingResult);

      await store.uploadReceipt(mockFile, 'test-plugin');

      expect(mockReceiptsService.uploadReceipt).toHaveBeenCalledWith(mockFile, 'test-plugin');
    });

    it('should not add receipt to list if upload fails', async () => {
      const failedResult: ProcessingResult = {
        ...mockProcessingResult,
        success: false
      };
      mockReceiptsService.uploadReceipt.mockResolvedValue(failedResult);

      const result = await store.uploadReceipt(mockFile);

      expect(store.receipts).toEqual([]);
      expect(result).toEqual(failedResult);
    });

    it('should not add receipt to list if duplicate', async () => {
      const duplicateResult: ProcessingResult = {
        ...mockProcessingResult,
        isDuplicate: true
      };
      mockReceiptsService.uploadReceipt.mockResolvedValue(duplicateResult);

      const result = await store.uploadReceipt(mockFile);

      expect(store.receipts).toEqual([]);
      expect(result).toEqual(duplicateResult);
    });

    it('should handle upload error and rethrow', async () => {
      const errorMessage = 'Upload failed';
      mockReceiptsService.uploadReceipt.mockRejectedValue(new Error(errorMessage));

      await expect(store.uploadReceipt(mockFile)).rejects.toThrow(errorMessage);

      expect(store.loading).toBe(false);
      expect(store.error).toBe(errorMessage);
    });

    it('should add receipt to beginning of list', async () => {
      store.receipts = [{ ...mockReceipt, id: 2 }];
      mockReceiptsService.uploadReceipt.mockResolvedValue(mockProcessingResult);

      await store.uploadReceipt(mockFile);

      expect(store.receipts).toHaveLength(2);
      expect(store.receipts[0]).toEqual(mockReceipt);
      expect(store.receipts[1].id).toBe(2);
    });
  });

  describe('deleteReceipt', () => {
    beforeEach(() => {
      store.receipts = [
        { ...mockReceipt, id: 1 },
        { ...mockReceipt, id: 2 }
      ];
      store.currentReceipt = { ...mockReceipt, id: 1 };
    });

    it('should delete receipt successfully', async () => {
      mockReceiptsService.deleteReceipt.mockResolvedValue(undefined);

      await store.deleteReceipt(1);

      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.receipts).toHaveLength(1);
      expect(store.receipts[0].id).toBe(2);
      expect(store.currentReceipt).toBeNull();
      expect(mockReceiptsService.deleteReceipt).toHaveBeenCalledWith(1);
    });

    it('should not clear currentReceipt if deleting different receipt', async () => {
      mockReceiptsService.deleteReceipt.mockResolvedValue(undefined);

      await store.deleteReceipt(2);

      expect(store.receipts).toHaveLength(1);
      expect(store.receipts[0].id).toBe(1);
      expect(store.currentReceipt?.id).toBe(1);
    });

    it('should handle delete error and rethrow', async () => {
      const errorMessage = 'Delete failed';
      mockReceiptsService.deleteReceipt.mockRejectedValue(new Error(errorMessage));

      await expect(store.deleteReceipt(1)).rejects.toThrow(errorMessage);

      expect(store.loading).toBe(false);
      expect(store.error).toBe(errorMessage);
      expect(store.receipts).toHaveLength(2); // Should not remove on error
    });
  });

  describe('updateReceipt', () => {
    beforeEach(() => {
      store.receipts = [
        { ...mockReceipt, id: 1, storeName: 'Old Store' },
        { ...mockReceipt, id: 2 }
      ];
      store.currentReceipt = { ...mockReceipt, id: 1, storeName: 'Old Store' };
    });

    it('should update receipt successfully', async () => {
      const updatedReceipt = { ...mockReceipt, id: 1, storeName: 'New Store' };
      const updates = { storeName: 'New Store' };

      mockReceiptsService.updateReceipt.mockResolvedValue(updatedReceipt);

      const result = await store.updateReceipt(1, updates);

      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.receipts[0].storeName).toBe('New Store');
      expect(store.currentReceipt?.storeName).toBe('New Store');
      expect(result).toEqual(updatedReceipt);
      expect(mockReceiptsService.updateReceipt).toHaveBeenCalledWith(1, updates);
    });

    it('should not update currentReceipt if updating different receipt', async () => {
      const updatedReceipt = { ...mockReceipt, id: 2, storeName: 'New Store' };
      const updates = { storeName: 'New Store' };

      mockReceiptsService.updateReceipt.mockResolvedValue(updatedReceipt);

      await store.updateReceipt(2, updates);

      expect(store.receipts[1].storeName).toBe('New Store');
      expect(store.currentReceipt?.storeName).toBe('Old Store'); // Should not change
    });

    it('should handle receipt not found in list', async () => {
      const updatedReceipt = { ...mockReceipt, id: 999, storeName: 'New Store' };
      const updates = { storeName: 'New Store' };

      mockReceiptsService.updateReceipt.mockResolvedValue(updatedReceipt);

      const result = await store.updateReceipt(999, updates);

      expect(result).toEqual(updatedReceipt);
      expect(store.receipts).toHaveLength(2); // Should not change
    });

    it('should handle update error and rethrow', async () => {
      const errorMessage = 'Update failed';
      mockReceiptsService.updateReceipt.mockRejectedValue(new Error(errorMessage));

      await expect(store.updateReceipt(1, {})).rejects.toThrow(errorMessage);

      expect(store.loading).toBe(false);
      expect(store.error).toBe(errorMessage);
    });
  });

  describe('reprocessReceipt', () => {
    beforeEach(() => {
      store.receipts = [
        { ...mockReceipt, id: 1, processingStatus: 'failed' },
        { ...mockReceipt, id: 2 }
      ];
      store.currentReceipt = { ...mockReceipt, id: 1, processingStatus: 'failed' };
    });

    it('should reprocess receipt successfully', async () => {
      const reprocessedReceipt = { ...mockReceipt, id: 1, processingStatus: 'completed' as const };
      const reprocessResult: ProcessingResult = {
        ...mockProcessingResult,
        receipt: reprocessedReceipt
      };

      mockReceiptsService.reprocessReceipt.mockResolvedValue(reprocessResult);

      const result = await store.reprocessReceipt(1);

      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.receipts[0].processingStatus).toBe('completed');
      expect(store.currentReceipt?.processingStatus).toBe('completed');
      expect(result).toEqual(reprocessResult);
      expect(mockReceiptsService.reprocessReceipt).toHaveBeenCalledWith(1, undefined);
    });

    it('should reprocess receipt with plugin key', async () => {
      const reprocessResult: ProcessingResult = {
        ...mockProcessingResult,
        receipt: { ...mockReceipt, id: 1 }
      };

      mockReceiptsService.reprocessReceipt.mockResolvedValue(reprocessResult);

      await store.reprocessReceipt(1, 'test-plugin');

      expect(mockReceiptsService.reprocessReceipt).toHaveBeenCalledWith(1, 'test-plugin');
    });

    it('should not update receipts if reprocessing fails', async () => {
      const failedResult: ProcessingResult = {
        ...mockProcessingResult,
        success: false,
        receipt: { ...mockReceipt, id: 1 }
      };

      mockReceiptsService.reprocessReceipt.mockResolvedValue(failedResult);

      const result = await store.reprocessReceipt(1);

      expect(store.receipts[0].processingStatus).toBe('failed'); // Should not change
      expect(result).toEqual(failedResult);
    });

    it('should handle reprocess error and rethrow', async () => {
      const errorMessage = 'Reprocess failed';
      mockReceiptsService.reprocessReceipt.mockRejectedValue(new Error(errorMessage));

      await expect(store.reprocessReceipt(1)).rejects.toThrow(errorMessage);

      expect(store.loading).toBe(false);
      expect(store.error).toBe(errorMessage);
    });
  });

  describe('getReceiptDetails', () => {
    it('should get receipt details successfully', async () => {
      mockReceiptsService.getReceipt.mockResolvedValue(mockReceipt);

      const result = await store.getReceiptDetails(1);

      expect(result).toEqual(mockReceipt);
      expect(mockReceiptsService.getReceipt).toHaveBeenCalledWith(1);
    });

    it('should handle get receipt details error and rethrow', async () => {
      const errorMessage = 'Receipt not found';
      mockReceiptsService.getReceipt.mockRejectedValue(new Error(errorMessage));

      await expect(store.getReceiptDetails(999)).rejects.toThrow(errorMessage);

      expect(store.error).toBe(errorMessage);
    });
  });

  describe('utility methods', () => {
    it('should clear error', () => {
      store.error = 'Test error';

      store.clearError();

      expect(store.error).toBeNull();
    });

    it('should clear current receipt', () => {
      store.currentReceipt = mockReceipt;

      store.clearCurrentReceipt();

      expect(store.currentReceipt).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should set error to null when operations start', async () => {
      store.error = 'Previous error';
      mockReceiptsService.getReceipts.mockResolvedValue(mockPagedResult);

      await store.fetchReceipts();

      expect(store.error).toBeNull();
    });

    it('should always set loading to false after operations', async () => {
      mockReceiptsService.getReceipts.mockRejectedValue(new Error('Test error'));

      await store.fetchReceipts();

      expect(store.loading).toBe(false);
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple fetchReceipts calls', async () => {
      mockReceiptsService.getReceipts.mockResolvedValue(mockPagedResult);

      const [result1, result2] = await Promise.all([
        store.fetchReceipts(),
        store.fetchReceipts()
      ]);

      expect(mockReceiptsService.getReceipts).toHaveBeenCalledTimes(2);
      expect(store.loading).toBe(false);
    });

    it('should handle upload and fetch concurrently', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      mockReceiptsService.uploadReceipt.mockResolvedValue(mockProcessingResult);
      mockReceiptsService.getReceipts.mockResolvedValue(mockPagedResult);

      await Promise.all([
        store.uploadReceipt(mockFile),
        store.fetchReceipts()
      ]);

      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });
  });
});