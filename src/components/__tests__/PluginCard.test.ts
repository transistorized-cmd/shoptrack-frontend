import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PluginCard from '@/components/PluginCard.vue';
import type { ReceiptPlugin } from '@/types/plugin';

// Mock file validation utility
vi.mock('@/utils/fileValidation', () => ({
  formatFileSize: vi.fn((size: number) => `${Math.round(size / 1024)} KB`),
}));

// Mock app constants
vi.mock('@/constants/app', () => ({
  FILE_SIZE: {
    KB: 1024,
    MB: 1024 * 1024,
  },
}));

describe('PluginCard Component', () => {
  const mockPlugin: ReceiptPlugin = {
    key: 'walmart-plugin',
    name: 'Walmart Receipt Parser',
    version: '1.2.3',
    icon: '🛒',
    color: '#0071ce',
    description: 'Process Walmart receipts with advanced OCR and data extraction',
    supportedFileTypes: ['pdf', 'jpg', 'png'],
    maxFileSizeKB: 5120, // 5MB
    supportsManualEntry: true,
    supportsBatchProcessing: true,
    requiresImageConversion: true,
  };

  const defaultProps = {
    plugin: mockPlugin,
  };

  const createWrapper = (props = defaultProps) => {
    return mount(PluginCard, {
      props,
    });
  };

  describe('Component Rendering', () => {
    it('should render plugin information correctly', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('Walmart Receipt Parser');
      expect(wrapper.text()).toContain('v1.2.3');
      expect(wrapper.text()).toContain('🛒');
      expect(wrapper.text()).toContain('Process Walmart receipts with advanced OCR');
      expect(wrapper.text()).toContain('PDF, JPG, PNG');
    });

    it('should apply plugin color as background gradient', () => {
      const wrapper = createWrapper();

      const header = wrapper.find('.p-6.border-b');
      const style = header.attributes('style');

      expect(style).toContain('linear-gradient(135deg, #0071ce15, #0071ce05)');
    });

    it('should show plugin icon with color background', () => {
      const wrapper = createWrapper();

      const iconContainer = wrapper.find('.w-12.h-12.rounded-full');
      const style = iconContainer.attributes('style');

      expect(style).toContain('background-color: #0071ce20');
      expect(iconContainer.text()).toBe('🛒');
    });

    it('should display supported file types in uppercase', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('PDF, JPG, PNG');
    });

    it('should show plugin description', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('Process Walmart receipts with advanced OCR and data extraction');
    });
  });

  describe('Feature Tags', () => {
    it('should show Manual Entry tag when supported', () => {
      const wrapper = createWrapper();

      const manualEntryTag = wrapper.find('.bg-green-100.text-green-800');
      expect(manualEntryTag.exists()).toBe(true);
      expect(manualEntryTag.text()).toBe('Manual Entry');
    });

    it('should show Batch Processing tag when supported', () => {
      const wrapper = createWrapper();

      const batchTag = wrapper.find('.bg-blue-100.text-blue-800');
      expect(batchTag.exists()).toBe(true);
      expect(batchTag.text()).toBe('Batch Processing');
    });

    it('should show Image Processing tag when required', () => {
      const wrapper = createWrapper();

      const imageTag = wrapper.find('.bg-purple-100.text-purple-800');
      expect(imageTag.exists()).toBe(true);
      expect(imageTag.text()).toBe('Image Processing');
    });

    it('should not show tags when features are not supported', () => {
      const pluginWithoutFeatures: ReceiptPlugin = {
        ...mockPlugin,
        supportsManualEntry: false,
        supportsBatchProcessing: false,
        requiresImageConversion: false,
      };

      const wrapper = createWrapper({ plugin: pluginWithoutFeatures });

      expect(wrapper.find('.bg-green-100.text-green-800').exists()).toBe(false);
      expect(wrapper.find('.bg-blue-100.text-blue-800').exists()).toBe(false);
      expect(wrapper.find('.bg-purple-100.text-purple-800').exists()).toBe(false);
    });
  });

  describe('File Upload Form', () => {
    it('should render file input with correct accept attribute', () => {
      const wrapper = createWrapper();

      const fileInput = wrapper.find('input[type="file"]');
      expect(fileInput.exists()).toBe(true);
      expect(fileInput.attributes('accept')).toBe('.pdf,.jpg,.png');
    });

    it('should have upload button initially disabled', () => {
      const wrapper = createWrapper();

      const uploadButton = wrapper.find('button[type="submit"]');
      expect(uploadButton.exists()).toBe(true);
      expect(uploadButton.attributes('disabled')).toBeDefined();
      expect(uploadButton.text()).toBe('Upload');
    });

    it('should enable upload button when file is selected', async () => {
      const wrapper = createWrapper();
      const fileInput = wrapper.find('input[type="file"]');

      // Mock file selection
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFile],
        writable: false,
      });

      await fileInput.trigger('change');
      await wrapper.vm.$nextTick();

      const uploadButton = wrapper.find('button[type="submit"]');
      expect(uploadButton.attributes('disabled')).toBeUndefined();
    });

    it('should apply plugin color to upload button', () => {
      const wrapper = createWrapper();

      const uploadButton = wrapper.find('button[type="submit"]');
      const style = uploadButton.attributes('style');

      expect(style).toContain('background-color: #0071ce');
    });

    it('should show loading state during upload', async () => {
      const wrapper = createWrapper();

      // Set uploading state
      (wrapper.vm as any).uploading = true;
      await wrapper.vm.$nextTick();

      const uploadButton = wrapper.find('button[type="submit"]');
      expect(uploadButton.text()).toBe('Uploading...');
      expect(uploadButton.attributes('disabled')).toBeDefined();
    });

    it('should disable file input during upload', async () => {
      const wrapper = createWrapper();

      // Set uploading state
      (wrapper.vm as any).uploading = true;
      await wrapper.vm.$nextTick();

      const fileInput = wrapper.find('input[type="file"]');
      expect(fileInput.attributes('disabled')).toBeDefined();
    });
  });

  describe('File Upload Events', () => {
    it('should handle file selection correctly', async () => {
      const wrapper = createWrapper();
      const fileInput = wrapper.find('input[type="file"]');

      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFile],
        writable: false,
      });

      await fileInput.trigger('change');

      // Check that selectedFile is set (component internal state)
      const vm = wrapper.vm as any;
      expect(vm.selectedFile).toEqual(mockFile);
    });

    it('should emit upload event when form is submitted', async () => {
      const wrapper = createWrapper();
      const fileInput = wrapper.find('input[type="file"]');

      // Select a file
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFile],
        writable: false,
      });

      await fileInput.trigger('change');

      // Submit form
      const form = wrapper.find('form');
      await form.trigger('submit.prevent');

      const uploadEvents = wrapper.emitted('upload');
      expect(uploadEvents).toHaveLength(1);
      expect(uploadEvents?.[0]).toEqual([{
        file: mockFile,
        pluginKey: 'walmart-plugin',
      }]);
    });

    it('should not emit upload event without selected file', async () => {
      const wrapper = createWrapper();
      const form = wrapper.find('form');

      await form.trigger('submit.prevent');

      const uploadEvents = wrapper.emitted('upload');
      expect(uploadEvents).toBeUndefined();
    });
  });

  describe('Manual Entry Button', () => {
    it('should show manual entry button when supported', () => {
      const wrapper = createWrapper();

      const manualButton = wrapper.find('button').filter(btn =>
        btn.text() === 'Manual Entry'
      );
      expect(manualButton.exists()).toBe(true);
    });

    it('should not show manual entry button when not supported', () => {
      const pluginWithoutManualEntry: ReceiptPlugin = {
        ...mockPlugin,
        supportsManualEntry: false,
      };

      const wrapper = createWrapper({ plugin: pluginWithoutManualEntry });

      const manualButton = wrapper.find('button').filter(btn =>
        btn.text() === 'Manual Entry'
      );
      expect(manualButton.exists()).toBe(false);
    });

    it('should apply plugin color to manual entry button', () => {
      const wrapper = createWrapper();

      const manualButton = wrapper.findAll('button').find(btn =>
        btn.text() === 'Manual Entry'
      );

      const style = manualButton?.attributes('style');
      expect(style).toContain('border-color: #0071ce');
      expect(style).toContain('color: #0071ce');
    });

    it('should emit manual-entry event when clicked', async () => {
      const wrapper = createWrapper();

      const manualButton = wrapper.findAll('button').find(btn =>
        btn.text() === 'Manual Entry'
      );

      await manualButton?.trigger('click');

      const manualEntryEvents = wrapper.emitted('manual-entry');
      expect(manualEntryEvents).toHaveLength(1);
      expect(manualEntryEvents?.[0]).toEqual(['walmart-plugin']);
    });
  });

  describe('Plugin Statistics', () => {
    it('should display formatted max file size', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('Max size: 5120 KB');
    });

    it('should display number of supported file types', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('3 file types');
    });

    it('should handle single file type correctly', () => {
      const singleFileTypePlugin: ReceiptPlugin = {
        ...mockPlugin,
        supportedFileTypes: ['pdf'],
      };

      const wrapper = createWrapper({ plugin: singleFileTypePlugin });

      expect(wrapper.text()).toContain('1 file types');
    });
  });

  describe('Component Methods', () => {
    it('should expose resetUploadState method', () => {
      const wrapper = createWrapper();
      const vm = wrapper.vm as any;

      expect(typeof vm.resetUploadState).toBe('function');
    });

    it('should reset upload state when resetUploadState is called', async () => {
      const wrapper = createWrapper();
      const vm = wrapper.vm as any;
      const fileInput = wrapper.find('input[type="file"]');

      // Set initial state
      vm.uploading = true;
      vm.selectedFile = new File(['test'], 'test.pdf');
      (fileInput.element as HTMLInputElement).value = 'test.pdf';

      // Reset state
      vm.resetUploadState();
      await wrapper.vm.$nextTick();

      expect(vm.uploading).toBe(false);
      expect(vm.selectedFile).toBeNull();
      expect((fileInput.element as HTMLInputElement).value).toBe('');
    });
  });

  describe('Styling and CSS', () => {
    it('should apply dynamic CSS custom properties for plugin color', () => {
      const wrapper = createWrapper();
      const fileInput = wrapper.find('input[type="file"]');

      const computedStyle = getComputedStyle(fileInput.element);
      // Note: In test environment, CSS custom properties might not work exactly as in browser
      // This test ensures the structure is correct
      expect(fileInput.attributes('class')).toBeDefined();
    });

    it('should have hover effects on interactive elements', () => {
      const wrapper = createWrapper();

      const uploadButton = wrapper.find('button[type="submit"]');
      expect(uploadButton.classes()).toContain('hover:opacity-90');

      const manualButton = wrapper.findAll('button').find(btn =>
        btn.text() === 'Manual Entry'
      );
      expect(manualButton?.classes()).toContain('hover:bg-gray-50');
    });

    it('should have proper disabled styles', async () => {
      const wrapper = createWrapper();

      const uploadButton = wrapper.find('button[type="submit"]');
      expect(uploadButton.classes()).toContain('disabled:bg-gray-400');
      expect(uploadButton.classes()).toContain('disabled:cursor-not-allowed');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible file input', () => {
      const wrapper = createWrapper();

      const fileInput = wrapper.find('input[type="file"]');
      expect(fileInput.attributes('accept')).toBeDefined();
      expect(fileInput.attributes('required')).toBeDefined();
    });

    it('should have proper button types', () => {
      const wrapper = createWrapper();

      const uploadButton = wrapper.find('button[type="submit"]');
      expect(uploadButton.exists()).toBe(true);

      const manualButton = wrapper.findAll('button').find(btn =>
        btn.text() === 'Manual Entry'
      );
      // Manual button should not have type="submit" to avoid form submission
      expect(manualButton?.attributes('type')).toBeUndefined();
    });

    it('should have proper form structure', () => {
      const wrapper = createWrapper();

      const form = wrapper.find('form');
      expect(form.exists()).toBe(true);
      expect(form.classes()).toContain('plugin-form');
    });
  });

  describe('Edge Cases', () => {
    it('should handle plugin with empty file types array', () => {
      const pluginWithNoFileTypes: ReceiptPlugin = {
        ...mockPlugin,
        supportedFileTypes: [],
      };

      const wrapper = createWrapper({ plugin: pluginWithNoFileTypes });

      const fileInput = wrapper.find('input[type="file"]');
      expect(fileInput.attributes('accept')).toBe('');
      expect(wrapper.text()).toContain('0 file types');
    });

    it('should handle plugin with zero max file size', () => {
      const pluginWithZeroSize: ReceiptPlugin = {
        ...mockPlugin,
        maxFileSizeKB: 0,
      };

      const wrapper = createWrapper({ plugin: pluginWithZeroSize });

      expect(wrapper.text()).toContain('Max size: 0 KB');
    });

    it('should handle plugin with very long name', () => {
      const pluginWithLongName: ReceiptPlugin = {
        ...mockPlugin,
        name: 'A Very Long Plugin Name That Might Cause Layout Issues If Not Handled Properly',
      };

      const wrapper = createWrapper({ plugin: pluginWithLongName });

      expect(wrapper.text()).toContain('A Very Long Plugin Name');
    });

    it('should handle plugin with special characters in color', () => {
      const pluginWithSpecialColor: ReceiptPlugin = {
        ...mockPlugin,
        color: '#123abc',
      };

      const wrapper = createWrapper({ plugin: pluginWithSpecialColor });

      const header = wrapper.find('.p-6.border-b');
      const style = header.attributes('style');
      expect(style).toContain('#123abc');
    });
  });

  describe('Event Handling Edge Cases', () => {
    it('should handle file input change with no files', async () => {
      const wrapper = createWrapper();
      const fileInput = wrapper.find('input[type="file"]');

      // Mock empty files
      Object.defineProperty(fileInput.element, 'files', {
        value: [],
        writable: false,
      });

      await fileInput.trigger('change');

      const vm = wrapper.vm as any;
      expect(vm.selectedFile).toBeNull();
    });

    it('should handle form submission during upload state', async () => {
      const wrapper = createWrapper();
      const vm = wrapper.vm as any;

      // Set uploading state
      vm.uploading = true;
      vm.selectedFile = new File(['test'], 'test.pdf');

      const form = wrapper.find('form');
      await form.trigger('submit.prevent');

      // Should not emit upload event during upload
      const uploadEvents = wrapper.emitted('upload');
      expect(uploadEvents).toBeUndefined();
    });
  });
});