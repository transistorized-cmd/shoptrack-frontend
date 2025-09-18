import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import QuickUpload from "../QuickUpload.vue";
import { pluginsService } from "@/services/plugins";
import { validateFile } from "@/utils/fileValidation";
import { createMockRouter } from "../../../tests/utils/router";
import { useAsyncJobs } from "@/composables/useAsyncJobs";

// Mock dependencies
vi.mock("@/services/plugins", () => ({
  pluginsService: {
    getAllPlugins: vi.fn(),
    detectPlugin: vi.fn(),
    uploadWithAutoDetection: vi.fn(),
  },
}));

const mockUploadFileAsync = vi.fn();

vi.mock("@/composables/useAsyncJobs", () => ({
  useAsyncJobs: () => ({
    uploadFileAsync: mockUploadFileAsync,
    activeJobs: [],
    hasActiveJobs: false,
    isJobActive: vi.fn().mockReturnValue(false),
    cancelJob: vi.fn(),
    retryJob: vi.fn(),
  }),
}));

vi.mock("@/utils/fileValidation", () => ({
  validateFile: vi.fn(),
  formatFileSize: vi.fn((bytes) => `${bytes} bytes`),
}));

vi.mock("@/constants/app", () => ({
  FILE_SIZE: {
    DEFAULT_MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
    KB: 1024,
  },
}));

// No need for RouterLink mock when using real router

describe("QuickUpload Component", () => {
  let wrapper: any;
  const mockPluginsService = pluginsService as jest.Mocked<
    typeof pluginsService
  >;
  const mockValidateFile = validateFile as Mock;
  const mockUseAsyncJobs = vi.mocked(useAsyncJobs);

  const mockPlugins = [
    {
      id: "generic-receipt",
      name: "Generic Receipt",
      fileTypes: ["jpg", "png", "pdf"],
      maxFileSize: 10 * 1024 * 1024,
    },
    {
      id: "amazon-orders",
      name: "Amazon Orders",
      fileTypes: ["csv"],
      maxFileSize: 5 * 1024 * 1024,
    },
  ];

  const createFile = (name: string, type: string, size: number = 1000) => {
    return new File(["test content"], name, { type, lastModified: Date.now() });
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful plugin loading by default
    mockPluginsService.getAllPlugins.mockResolvedValue({
      receiptPlugins: mockPlugins,
      reportPlugins: [],
    });

    // Mock successful file validation by default
    mockValidateFile.mockResolvedValue({
      isValid: true,
      warnings: [],
      errors: [],
    });

    // Mock successful plugin detection by default
    mockPluginsService.detectPlugin.mockResolvedValue({
      success: true,
      plugin: mockPlugins[0],
      confidence: 0.9,
    });

    const { mockRouter } = createMockRouter();

    wrapper = mount(QuickUpload, {
      global: {
        plugins: [mockRouter],
        mocks: {
          $t: (key: string, params?: any) => {
            // Simple mock translation function
            const translations: Record<string, string> = {
              "upload.quickUpload.title": "Quick Upload",
              "upload.quickUpload.description":
                "Upload and process receipts instantly",
              "upload.quickUpload.autoDetect": "Auto-detect",
              "upload.quickUpload.supportedFormats": "PDF, Images, CSV files",
              "upload.quickUpload.automaticDetection":
                "Automatic plugin detection",
              "upload.quickUpload.securityScanning":
                "Security scanning enabled",
              "upload.quickUpload.dropFileHere": "Drop your file here",
              "upload.quickUpload.autoProcessDescription":
                "We'll automatically detect the best processor",
              "upload.quickUpload.fileSize": `Size: ${params?.size || "N/A"}`,
              "upload.quickUpload.remove": "Remove",
              "upload.quickUpload.clear": "Clear",
              "upload.quickUpload.processing": "Processing...",
              "upload.quickUpload.processFile": "Process File",
              "upload.quickUpload.uploadSuccessful": "Upload Successful",
              "upload.quickUpload.uploadFailed": "Upload Failed",
              "upload.quickUpload.uploadAnother": "Upload Another",
              "upload.quickUpload.viewReceipts": "View Receipts",
              "upload.fileValidationFailed": "File validation failed",
              "upload.quickUpload.errors": "Errors",
              "upload.quickUpload.receiptDetails": "Receipt Details",
              "upload.quickUpload.filename": "Filename:",
              "upload.quickUpload.itemsFound": "Items Found:",
              "upload.quickUpload.successfullyParsed": "Successfully Parsed:",
              "upload.quickUpload.status": "Status:",
            };
            return translations[key] || key;
          },
        },
      },
    });
  });

  describe("Initial State", () => {
    it("should render the component with correct initial UI", () => {
      expect(wrapper.find("h3").text()).toBe("Quick Upload");
      expect(wrapper.find("form").exists()).toBe(true);
      expect(wrapper.find('input[type="file"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="upload-button"]')).toBeDefined();
    });

    it("should load plugins on mount", async () => {
      await nextTick();
      expect(mockPluginsService.getAllPlugins).toHaveBeenCalled();
    });

    it("should have correct file input attributes", () => {
      const fileInput = wrapper.find('input[type="file"]');
      expect(fileInput.attributes("accept")).toBe(
        ".jpg,.jpeg,.png,.gif,.webp,.pdf,.csv",
      );
      expect(fileInput.attributes("required")).toBeDefined();
      expect(fileInput.classes()).toContain("hidden");
    });

    it("should show initial upload state", () => {
      expect(wrapper.text()).toContain("Drop your file here");
      expect(wrapper.text()).toContain(
        "We'll automatically detect the best processor",
      );
    });
  });

  describe("File Selection", () => {
    it("should handle file selection from input", async () => {
      const file = createFile("test-receipt.jpg", "image/jpeg");
      const fileInput = wrapper.find('input[type="file"]');

      // Mock the file input files property
      Object.defineProperty(fileInput.element, "files", {
        value: [file],
        writable: false,
      });

      await fileInput.trigger("change");
      await nextTick();

      expect(mockValidateFile).toHaveBeenCalledWith(
        file,
        expect.objectContaining({
          maxSizeBytes: 10 * 1024 * 1024,
          allowedExtensions: expect.arrayContaining([
            ".jpg",
            ".jpeg",
            ".png",
            ".pdf",
            ".csv",
          ]),
          checkFileSignature: true,
          strictMode: true,
        }),
      );
    });

    it("should show selected file information", async () => {
      const file = createFile("test-receipt.pdf", "application/pdf", 5000);

      // Simulate successful file processing
      await wrapper.vm.processSelectedFile(file);
      await nextTick();

      expect(wrapper.text()).toContain("test-receipt.pdf");
      expect(wrapper.vm.selectedFile?.name).toBe(file.name);
      expect(wrapper.vm.selectedFile?.size).toBe(file.size);
    });

    it("should handle file clearing", async () => {
      const file = createFile("test-receipt.jpg", "image/jpeg");

      await wrapper.vm.processSelectedFile(file);
      await nextTick();

      // File should be shown
      expect(wrapper.text()).toContain("test-receipt.jpg");

      // Clear the file
      await wrapper.vm.clearQuickFile();
      await nextTick();

      // File should be cleared
      expect(wrapper.text()).toContain("Drop your file here");
    });
  });

  describe("Drag and Drop", () => {
    it("should handle drag events correctly", async () => {
      const dropZone = wrapper.find(".border-dashed");

      // Test dragover
      await dropZone.trigger("dragover");
      expect(wrapper.vm.isDragging).toBe(true);

      // Test dragleave
      await dropZone.trigger("dragleave");
      expect(wrapper.vm.isDragging).toBe(false);

      // Test dragenter
      await dropZone.trigger("dragenter");
      expect(wrapper.vm.isDragging).toBe(true);
    });

    it("should handle file drop", async () => {
      const file = createFile("dropped-receipt.png", "image/png");
      const dropZone = wrapper.find(".border-dashed");

      const dropEvent = new Event("drop") as any;
      dropEvent.dataTransfer = {
        files: [file],
      };

      await dropZone.trigger("drop", dropEvent);
      await nextTick();

      expect(wrapper.vm.isDragging).toBe(false);
      expect(mockValidateFile).toHaveBeenCalledWith(file, expect.any(Object));
    });

    it("should show drag state styling", async () => {
      const dropZone = wrapper.find(".border-dashed");

      // Simulate drag state
      wrapper.vm.isDragging = true;
      await nextTick();

      expect(dropZone.classes()).toContain("border-blue-500");
      expect(dropZone.classes()).toContain("bg-blue-50");
    });
  });

  describe("File Validation", () => {
    it("should show validation errors for invalid files", async () => {
      const file = createFile("invalid-file.txt", "text/plain");

      mockValidateFile.mockResolvedValue({
        isValid: false,
        errors: ["Invalid file type", "File too large"],
        warnings: [],
      });

      await wrapper.vm.processSelectedFile(file);
      await nextTick();

      expect(wrapper.text()).toContain("File validation failed");
      expect(wrapper.text()).toContain("Invalid file type");
      expect(wrapper.text()).toContain("File too large");
      expect(wrapper.vm.selectedFile).toBeNull();
    });

    it("should show validation warnings for valid files with warnings", async () => {
      const file = createFile("warning-file.jpg", "image/jpeg");

      mockValidateFile.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: ["File size is large", "Unusual file extension"],
      });

      await wrapper.vm.processSelectedFile(file);
      await nextTick();

      expect(wrapper.vm.selectedFile).toEqual(file);
      // Warnings should be shown but not prevent selection
    });

    it("should prevent upload of invalid files", async () => {
      // Set up invalid validation result
      wrapper.vm.fileValidationResult = {
        isValid: false,
        errors: ["Invalid file"],
        warnings: [],
      };
      wrapper.vm.selectedFile = createFile("invalid.txt", "text/plain");

      await wrapper.vm.handleQuickUpload();

      expect(wrapper.vm.showValidationErrors).toBe(true);
      expect(mockUploadFileAsync).not.toHaveBeenCalled();
    });
  });

  describe("Plugin Detection", () => {
    it("should detect plugin for selected file", async () => {
      const file = createFile("receipt.pdf", "application/pdf");
      const mockDetectionResult = {
        success: true,
        plugin: mockPlugins[0],
        confidence: 0.9,
      };

      mockPluginsService.detectPlugin.mockResolvedValue(mockDetectionResult);

      await wrapper.vm.processSelectedFile(file);
      await nextTick();

      expect(mockPluginsService.detectPlugin).toHaveBeenCalledWith(
        file,
        mockPlugins,
      );
      expect(wrapper.vm.detectedPlugin).toEqual(mockDetectionResult);
    });

    it("should handle plugin detection failure gracefully", async () => {
      const file = createFile("receipt.unknown", "application/octet-stream");

      mockPluginsService.detectPlugin.mockRejectedValue(
        new Error("No suitable plugin found"),
      );

      await wrapper.vm.processSelectedFile(file);
      await nextTick();

      expect(wrapper.vm.detectedPlugin).toBeNull();
    });
  });

  describe("File Upload", () => {
    beforeEach(async () => {
      const file = createFile("test-receipt.pdf", "application/pdf");
      await wrapper.vm.processSelectedFile(file);
      await nextTick();
    });

    it("should handle successful upload", async () => {
      const mockJobId = "job-123";
      mockUploadFileAsync.mockResolvedValue(mockJobId);

      await wrapper.vm.handleQuickUpload();
      await nextTick();

      expect(mockUploadFileAsync).toHaveBeenCalledWith(
        expect.any(File),
        expect.objectContaining({
          priority: 10,
          onUploadProgress: expect.any(Function),
        })
      );
    });

    it("should handle upload failure", async () => {
      mockUploadFileAsync.mockRejectedValue(new Error("Upload failed"));

      await wrapper.vm.handleQuickUpload();
      await nextTick();

      // Verify the async job was called
      expect(mockUploadFileAsync).toHaveBeenCalledWith(
        expect.any(File),
        expect.objectContaining({
          priority: 10,
          onUploadProgress: expect.any(Function),
        })
      );
    });

    it("should handle upload exception", async () => {
      mockUploadFileAsync.mockRejectedValue(new Error("Network connection failed"));

      await wrapper.vm.handleQuickUpload();
      await nextTick();

      // Verify the async job was called
      expect(mockUploadFileAsync).toHaveBeenCalledWith(
        expect.any(File),
        expect.objectContaining({
          priority: 10,
          onUploadProgress: expect.any(Function),
        })
      );
    });

    it("should show loading state during upload", async () => {
      const jobId = "job-123";
      const uploadPromise = new Promise((resolve) => {
        setTimeout(() => resolve(jobId), 100);
      });

      mockUploadFileAsync.mockReturnValue(uploadPromise as any);

      const uploadPromiseExecution = wrapper.vm.handleQuickUpload();
      await nextTick();

      // Should show loading state
      expect(wrapper.vm.quickUploading).toBe(true);

      await uploadPromiseExecution;

      // Should clear loading state
      expect(wrapper.vm.quickUploading).toBe(false);
    });
  });

  describe("UI Interactions", () => {
    it("should disable upload button when no file selected", () => {
      const uploadButton = wrapper.find('button[type="submit"]');
      expect(uploadButton.attributes("disabled")).toBeDefined();
    });

    it("should enable upload button when file is selected", async () => {
      const file = createFile("test.pdf", "application/pdf");
      await wrapper.vm.processSelectedFile(file);
      await nextTick();

      const uploadButton = wrapper.find('button[type="submit"]');
      expect(uploadButton.attributes("disabled")).toBeUndefined();
    });

    it("should disable upload button during upload", async () => {
      const file = createFile("test.pdf", "application/pdf");
      await wrapper.vm.processSelectedFile(file);
      wrapper.vm.quickUploading = true;
      await nextTick();

      const uploadButton = wrapper.find('button[type="submit"]');
      expect(uploadButton.attributes("disabled")).toBeDefined();
    });

    it("should show correct button text during upload", async () => {
      const file = createFile("test.pdf", "application/pdf");
      await wrapper.vm.processSelectedFile(file);
      await nextTick();

      let uploadButton = wrapper.find('button[type="submit"]');
      expect(uploadButton.text()).toBe("Process File");

      wrapper.vm.quickUploading = true;
      await nextTick();

      uploadButton = wrapper.find('button[type="submit"]');
      expect(uploadButton.text()).toBe("Processing...");
    });

    it("should handle click on drop zone to open file dialog", async () => {
      const fileInputSpy = vi.fn();
      wrapper.vm.quickFileInput = { click: fileInputSpy };

      const dropZone = wrapper.find(".border-dashed");
      await dropZone.trigger("click");

      expect(fileInputSpy).toHaveBeenCalled();
    });
  });

  describe("Upload Results", () => {
    it("should show success result with receipt details", async () => {
      const successResult = {
        success: true,
        message: "Upload completed successfully",
        receipt: {
          filename: "receipt.pdf",
          totalItemsDetected: 10,
          successfullyParsed: 8,
          processingStatus: "completed",
        },
        items: [],
        isDuplicate: false,
      };

      wrapper.vm.uploadResult = successResult;
      await nextTick();

      expect(wrapper.text()).toContain("Upload Successful");
      expect(wrapper.text()).toContain("receipt.pdf");
      expect(wrapper.text()).toContain("10"); // totalItemsDetected
      expect(wrapper.text()).toContain("8"); // successfullyParsed
      expect(wrapper.text()).toContain("completed");
      expect(wrapper.find('a[href="/receipts"]').exists()).toBe(true);
    });

    it("should clear upload result and file when requested", async () => {
      const file = createFile("test.pdf", "application/pdf");
      await wrapper.vm.processSelectedFile(file);
      wrapper.vm.uploadResult = { success: true, message: "Done" };
      await nextTick();

      await wrapper.vm.clearUploadResult();
      await nextTick();

      expect(wrapper.vm.uploadResult).toBeNull();
      expect(wrapper.vm.selectedFile).toBeNull();
    });
  });

  describe("Utility Functions", () => {
    it("should format file size correctly", () => {
      // These tests now use the imported formatSize function which is mocked
      expect(wrapper.vm.formatSize(0)).toBe("0 bytes");
      expect(wrapper.vm.formatSize(1024)).toBe("1024 bytes");
      expect(wrapper.vm.formatSize(1048576)).toBe("1048576 bytes");
      expect(wrapper.vm.formatSize(1073741824)).toBe("1073741824 bytes");
    });

    it("should format partial file sizes", () => {
      expect(wrapper.vm.formatSize(1536)).toBe("1536 bytes"); // 1.5 KB
      expect(wrapper.vm.formatSize(2621440)).toBe("2621440 bytes"); // 2.5 MB
    });
  });

  describe("Error Handling", () => {
    it("should handle plugin loading failure gracefully", async () => {
      mockPluginsService.getAllPlugins.mockRejectedValue(
        new Error("Network error"),
      );

      // Re-mount component to trigger onMounted
      wrapper.unmount();
      const { mockRouter: newMockRouter } = createMockRouter();
      wrapper = mount(QuickUpload, {
        global: {
          plugins: [newMockRouter],
          mocks: { $t: (key: string) => key },
        },
      });

      await nextTick();

      // Component should still render even if plugins fail to load
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.availablePlugins).toEqual([]);
    });
  });
});
