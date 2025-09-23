import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateFile,
  sanitizeFileName,
  formatFileSize,
  isImageFile,
  isDocumentFile,
  type FileValidationResult,
  type FileValidationOptions
} from '@/utils/fileValidation';

// Mock constants
vi.mock('@/constants/app', () => ({
  FILE_SIZE: {
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    DEFAULT_MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  },
}));

describe('File Validation Utility', () => {
  let mockConsoleError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to create mock files
  const createMockFile = (
    name: string,
    size: number = 1024,
    type: string = 'application/octet-stream',
    content?: Uint8Array
  ): File => {
    const file = new File([content || new Uint8Array(size)], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  };

  // Helper to create file with specific signature
  const createFileWithSignature = (
    name: string,
    signature: number[],
    type: string = 'application/octet-stream'
  ): File => {
    const fullContent = new Uint8Array(1024);
    signature.forEach((byte, index) => {
      fullContent[index] = byte;
    });
    return createMockFile(name, fullContent.length, type, fullContent);
  };

  describe('validateFile', () => {
    describe('Basic Validation', () => {
      it('should reject null/undefined file', async () => {
        const result = await validateFile(null as any);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('No file provided');
      });

      it('should reject empty files', async () => {
        const file = createMockFile('test.jpg', 0);
        const result = await validateFile(file);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('File is empty');
      });

      it('should accept valid files', async () => {
        // Create a proper JPEG file with valid signature
        const file = createFileWithSignature('test.jpg', [0xff, 0xd8, 0xff], 'image/jpeg');
        const result = await validateFile(file);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.fileSize).toBe(1024);
      });
    });

    describe('File Size Validation', () => {
      it('should reject files exceeding default size limit', async () => {
        const file = createMockFile('large.jpg', 20 * 1024 * 1024); // 20MB
        const result = await validateFile(file);

        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('File size (20MB) exceeds maximum');
      });

      it('should accept files within custom size limit', async () => {
        // Create a proper JPEG file with valid signature
        const content = new Uint8Array(2 * 1024 * 1024); // 2MB
        content[0] = 0xff; content[1] = 0xd8; content[2] = 0xff; // JPEG signature
        const file = createMockFile('test.jpg', content.length, 'image/jpeg', content);
        const options: FileValidationOptions = { maxSizeBytes: 5 * 1024 * 1024 }; // 5MB limit
        const result = await validateFile(file, options);

        expect(result.isValid).toBe(true);
      });

      it('should reject files exceeding custom size limit', async () => {
        const file = createMockFile('large.jpg', 6 * 1024 * 1024); // 6MB
        const options: FileValidationOptions = { maxSizeBytes: 5 * 1024 * 1024 }; // 5MB limit
        const result = await validateFile(file, options);

        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('File size (6MB) exceeds maximum allowed size (5MB)');
      });
    });

    describe('File Extension Validation', () => {
      it('should accept allowed extensions', async () => {
        const validFiles = [
          createFileWithSignature('test.jpg', [0xff, 0xd8, 0xff], 'image/jpeg'),
          createFileWithSignature('test.png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'image/png'),
          createFileWithSignature('test.pdf', [0x25, 0x50, 0x44, 0x46], 'application/pdf'),
        ];

        for (const file of validFiles) {
          const result = await validateFile(file);
          expect(result.isValid).toBe(true);
        }
      });

      it('should reject disallowed extensions', async () => {
        const file = createMockFile('test.txt', 1024, 'text/plain');
        const result = await validateFile(file);

        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('File type not allowed: .txt');
      });

      it('should respect custom allowed extensions', async () => {
        const file = createMockFile('test.txt', 1024, 'text/plain');
        const options: FileValidationOptions = { allowedExtensions: ['.txt'] };
        const result = await validateFile(file, options);

        expect(result.isValid).toBe(true);
      });

      it('should reject dangerous file extensions', async () => {
        const dangerousFiles = [
          createMockFile('malware.exe'),
          createMockFile('script.bat'),
          createMockFile('virus.scr'),
          createMockFile('trojan.vbs'),
        ];

        for (const file of dangerousFiles) {
          const result = await validateFile(file);
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.includes('Dangerous file type detected'))).toBe(true);
        }
      });
    });

    describe('MIME Type Validation', () => {
      it('should warn about MIME type mismatches in strict mode', async () => {
        const file = createMockFile('test.jpg', 1024, 'image/png'); // Wrong MIME type
        const result = await validateFile(file, { strictMode: true });

        expect(result.warnings.some(w => w.includes("MIME type (image/png) doesn't match"))).toBe(true);
      });

      it('should not validate MIME types when strict mode is disabled', async () => {
        const file = createMockFile('test.jpg', 1024, 'image/png');
        const result = await validateFile(file, { strictMode: false });

        expect(result.warnings).toHaveLength(0);
      });

      it('should accept correct MIME types', async () => {
        const file = createMockFile('test.jpg', 1024, 'image/jpeg');
        const result = await validateFile(file, { strictMode: true });

        expect(result.warnings.filter(w => w.includes('MIME type')).length).toBe(0);
      });
    });

    describe('File Signature Validation', () => {
      it('should validate JPEG file signature', async () => {
        const jpegSignature = [0xff, 0xd8, 0xff];
        const file = createFileWithSignature('test.jpg', jpegSignature, 'image/jpeg');
        const result = await validateFile(file, { checkFileSignature: true });

        expect(result.isValid).toBe(true);
      });

      it('should detect invalid file signatures', async () => {
        const invalidSignature = [0x00, 0x00, 0x00]; // Not a valid JPEG signature
        const file = createFileWithSignature('test.jpg', invalidSignature, 'image/jpeg');
        const result = await validateFile(file, { checkFileSignature: true });

        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain("File content doesn't match file extension");
      });

      it('should validate PNG file signature', async () => {
        const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        const file = createFileWithSignature('test.png', pngSignature, 'image/png');
        const result = await validateFile(file, { checkFileSignature: true });

        expect(result.isValid).toBe(true);
      });

      it('should validate PDF file signature', async () => {
        const pdfSignature = [0x25, 0x50, 0x44, 0x46]; // %PDF
        const file = createFileWithSignature('test.pdf', pdfSignature, 'application/pdf');
        const result = await validateFile(file, { checkFileSignature: true });

        expect(result.isValid).toBe(true);
      });

      it('should skip signature check when disabled', async () => {
        const invalidSignature = [0x00, 0x00, 0x00];
        const file = createFileWithSignature('test.jpg', invalidSignature, 'image/jpeg');
        const result = await validateFile(file, { checkFileSignature: false });

        expect(result.isValid).toBe(true); // Should pass because signature check is disabled
      });
    });

    describe('Filename Security', () => {
      it('should detect path traversal attempts', async () => {
        const maliciousFiles = [
          createMockFile('../../../etc/passwd.jpg'),
          createMockFile('..\\..\\windows\\system32\\file.jpg'),
          createMockFile('./local/file.jpg'),
        ];

        for (const file of maliciousFiles) {
          const result = await validateFile(file);
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.includes('path traversal'))).toBe(true);
        }
      });

      it('should detect null bytes in filename', async () => {
        const file = createMockFile('test\0.jpg');
        const result = await validateFile(file);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Filename contains null bytes');
      });

      it('should detect reserved Windows filenames', async () => {
        const reservedFiles = [
          createMockFile('CON.jpg'),
          createMockFile('PRN.png'),
          createMockFile('AUX.pdf'),
          createMockFile('COM1.gif'),
        ];

        for (const file of reservedFiles) {
          const result = await validateFile(file);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Filename uses reserved system name');
        }
      });

      it('should detect filenames that are too long', async () => {
        const longName = 'a'.repeat(300) + '.jpg';
        const file = createMockFile(longName);
        const result = await validateFile(file);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Filename is too long (max 255 characters)');
      });

      it('should detect invalid characters in filename', async () => {
        const invalidFiles = [
          createMockFile('test<script>.jpg'),
          createMockFile('test|pipe.jpg'),
          createMockFile('test"quote.jpg'),
          createMockFile('test?query.jpg'),
        ];

        for (const file of invalidFiles) {
          const result = await validateFile(file);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Filename contains invalid characters');
        }
      });

      it('should warn about hidden files', async () => {
        const file = createMockFile('.hidden.jpg');
        const result = await validateFile(file);

        expect(result.warnings).toContain('Hidden file detected');
      });

      it('should warn about multiple extensions', async () => {
        const file = createMockFile('test.txt.jpg');
        const result = await validateFile(file);

        expect(result.warnings).toContain('Multiple file extensions detected');
      });
    });

    describe('Suspicious Pattern Detection', () => {
      it('should detect URL-encoded characters', async () => {
        const file = createMockFile('test%20file.jpg');
        const result = await validateFile(file);

        expect(result.warnings).toContain('Filename contains URL-encoded characters');
      });

      it('should detect Unicode direction override characters', async () => {
        const file = createMockFile('test\u202Eexe.jpg'); // Right-to-left override
        const result = await validateFile(file);

        expect(result.warnings).toContain('Filename contains Unicode direction override characters');
      });

      it('should detect Cyrillic characters (homograph attacks)', async () => {
        const file = createMockFile('tеst.jpg'); // Contains Cyrillic 'е'
        const result = await validateFile(file);

        expect(result.warnings).toContain('Filename contains Cyrillic characters (possible homograph attack)');
      });
    });

    describe('File Type Detection', () => {
      it('should correctly detect file types', async () => {
        const testCases = [
          { file: createMockFile('test.jpg'), expected: 'JPEG Image' },
          { file: createMockFile('test.png'), expected: 'PNG Image' },
          { file: createMockFile('test.pdf'), expected: 'PDF Document' },
          { file: createMockFile('test.gif'), expected: 'GIF Image' },
          { file: createMockFile('test.unknown'), expected: 'Unknown (.unknown)' },
        ];

        for (const testCase of testCases) {
          const result = await validateFile(testCase.file);
          expect(result.detectedType).toBe(testCase.expected);
        }
      });
    });

    describe('Error Handling', () => {
      it('should handle FileReader errors gracefully', async () => {
        const file = createMockFile('test.jpg', 1024, 'image/jpeg');

        // Mock FileReader to fail
        const originalFileReader = global.FileReader;
        global.FileReader = class MockFileReader {
          readAsArrayBuffer() {
            setTimeout(() => {
              if (this.onerror) {
                this.onerror();
              }
            }, 0);
          }
        } as any;

        const result = await validateFile(file, { checkFileSignature: true });

        expect(mockConsoleError).toHaveBeenCalledWith('Error checking file signature:', expect.any(Error));
        expect(result.isValid).toBe(false);

        // Restore original FileReader
        global.FileReader = originalFileReader;
      });
    });
  });

  describe('sanitizeFileName', () => {
    it('should handle empty or null filenames', () => {
      expect(sanitizeFileName('')).toBe('unknown_file');
      expect(sanitizeFileName(null as any)).toBe('unknown_file');
    });

    it('should remove path information', () => {
      expect(sanitizeFileName('/path/to/file.jpg')).toBe('file.jpg');
      expect(sanitizeFileName('C:\\path\\to\\file.jpg')).toBe('file.jpg');
    });

    it('should replace dangerous characters', () => {
      const result = sanitizeFileName('file<>:"|?*\\/\x00test.jpg');
      // Function replaces dangerous chars with _ then collapses multiple _ to single _
      // Leading underscores are removed by the sanitizer for security
      expect(result).toBe('test.jpg');
    });

    it('should remove Unicode direction override characters', () => {
      const result = sanitizeFileName('test\u202Eexe.jpg');
      expect(result).toBe('testexe.jpg');
    });

    it('should remove multiple consecutive underscores', () => {
      const result = sanitizeFileName('test____file.jpg');
      expect(result).toBe('test_file.jpg');
    });

    it('should remove leading and trailing underscores and dots', () => {
      expect(sanitizeFileName('_test.jpg')).toBe('test.jpg');
      expect(sanitizeFileName('.test.jpg')).toBe('test.jpg');
      expect(sanitizeFileName('test.jpg_')).toBe('test.jpg');
    });

    it('should limit filename length while preserving extension', () => {
      const longName = 'a'.repeat(150) + '.jpg';
      const result = sanitizeFileName(longName);

      expect(result.length).toBeLessThanOrEqual(100);
      expect(result.endsWith('.jpg')).toBe(true);
    });

    it('should generate timestamp-based name for invalid inputs', () => {
      const result = sanitizeFileName('___');
      expect(result).toMatch(/^file_\d+$/);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1023)).toBe('1023 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle large file sizes', () => {
      expect(formatFileSize(5.5 * 1024 * 1024 * 1024)).toBe('5.5 GB');
    });

    it('should round to one decimal place', () => {
      expect(formatFileSize(1234567)).toBe('1.2 MB');
    });
  });

  describe('isImageFile', () => {
    it('should identify image files correctly', () => {
      const imageFiles = ['test.jpg', 'test.jpeg', 'test.png', 'test.gif', 'test.bmp', 'test.webp'];

      imageFiles.forEach(filename => {
        expect(isImageFile(filename)).toBe(true);
      });
    });

    it('should reject non-image files', () => {
      const nonImageFiles = ['test.pdf', 'test.txt', 'test.doc', 'test.exe'];

      nonImageFiles.forEach(filename => {
        expect(isImageFile(filename)).toBe(false);
      });
    });

    it('should be case insensitive', () => {
      expect(isImageFile('test.JPG')).toBe(true);
      expect(isImageFile('test.PNG')).toBe(true);
    });
  });

  describe('isDocumentFile', () => {
    it('should identify document files correctly', () => {
      const docFiles = ['test.pdf', 'test.doc', 'test.docx', 'test.txt', 'test.csv', 'test.html', 'test.htm'];

      docFiles.forEach(filename => {
        expect(isDocumentFile(filename)).toBe(true);
      });
    });

    it('should reject non-document files', () => {
      const nonDocFiles = ['test.jpg', 'test.png', 'test.mp3', 'test.exe'];

      nonDocFiles.forEach(filename => {
        expect(isDocumentFile(filename)).toBe(false);
      });
    });

    it('should be case insensitive', () => {
      expect(isDocumentFile('test.PDF')).toBe(true);
      expect(isDocumentFile('test.DOC')).toBe(true);
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle files without extensions', async () => {
      const file = createMockFile('README');
      const result = await validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('File type not allowed:'))).toBe(true);
    });

    it('should handle files with extension but no name', async () => {
      const file = createMockFile('.jpg');
      const result = await validateFile(file);

      expect(result.warnings).toContain('Hidden file detected');
      expect(result.sanitizedFileName).toBe('jpg'); // Sanitizer removes leading dot
    });

    it('should handle very small files', async () => {
      const file = createMockFile('test.jpg', 1);
      // Disable signature checking for very small files
      const result = await validateFile(file, { checkFileSignature: false });

      expect(result.isValid).toBe(true);
      expect(result.fileSize).toBe(1);
    });

    it('should handle files at exact size limit', async () => {
      // Create a file at exactly 10MB with valid JPEG signature
      const content = new Uint8Array(10 * 1024 * 1024); // Exactly 10MB
      content[0] = 0xff; content[1] = 0xd8; content[2] = 0xff; // JPEG signature
      const file = createMockFile('test.jpg', content.length, 'image/jpeg', content);
      const result = await validateFile(file);

      expect(result.isValid).toBe(true);
    });

    it('should return proper validation result structure', async () => {
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const result = await validateFile(file);

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('sanitizedFileName');
      expect(result).toHaveProperty('fileSize');
      expect(result).toHaveProperty('detectedType');

      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.sanitizedFileName).toBe('string');
      expect(typeof result.fileSize).toBe('number');
      expect(typeof result.detectedType).toBe('string');
    });
  });
});