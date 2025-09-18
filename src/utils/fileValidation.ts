/**
 * Frontend File Upload Security Validation
 * Provides comprehensive client-side validation to match backend security
 */

import { FILE_SIZE } from "@/constants/app";

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedFileName: string;
  fileSize: number;
  detectedType: string;
}

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
  checkFileSignature?: boolean;
  strictMode?: boolean;
}

// File signatures (magic numbers) for common file types
const FILE_SIGNATURES: Record<
  string,
  { signature: number[]; mimeTypes: string[] }
> = {
  ".jpg": {
    signature: [0xff, 0xd8, 0xff],
    mimeTypes: ["image/jpeg", "image/jpg"],
  },
  ".jpeg": {
    signature: [0xff, 0xd8, 0xff],
    mimeTypes: ["image/jpeg", "image/jpg"],
  },
  ".png": {
    signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    mimeTypes: ["image/png"],
  },
  ".gif": {
    signature: [0x47, 0x49, 0x46, 0x38],
    mimeTypes: ["image/gif"],
  },
  ".pdf": {
    signature: [0x25, 0x50, 0x44, 0x46],
    mimeTypes: ["application/pdf"],
  },
  ".webp": {
    signature: [0x52, 0x49, 0x46, 0x46],
    mimeTypes: ["image/webp"],
  },
  ".bmp": {
    signature: [0x42, 0x4d],
    mimeTypes: ["image/bmp"],
  },
};

// Dangerous file extensions that should never be allowed
const DANGEROUS_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".pif",
  ".scr",
  ".vbs",
  ".js",
  ".jar",
  ".app",
  ".deb",
  ".pkg",
  ".dmg",
  ".sh",
  ".bash",
  ".ps1",
  ".msi",
  ".dll",
  ".sys",
  ".bin",
  ".run",
  ".action",
  ".apk",
  ".command",
  ".cpl",
  ".inf",
  ".ins",
  ".inx",
  ".isu",
  ".job",
  ".jse",
  ".lnk",
  ".mst",
  ".paf",
  ".reg",
  ".rgs",
  ".sct",
  ".shb",
  ".shs",
  ".u3p",
  ".vb",
  ".vbe",
  ".vbscript",
  ".ws",
  ".wsf",
  ".wsh",
]);

// Default allowed extensions for receipts
const DEFAULT_ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".pdf",
];

// Default allowed MIME types
const DEFAULT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/webp",
  "application/pdf",
];

// Reserved Windows filenames
const RESERVED_NAMES = [
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
];

/**
 * Main file validation function
 */
export async function validateFile(
  file: File,
  options: FileValidationOptions = {},
): Promise<FileValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Set default options
  const maxSizeBytes = options.maxSizeBytes || FILE_SIZE.DEFAULT_MAX_SIZE_BYTES;
  const allowedExtensions =
    options.allowedExtensions || DEFAULT_ALLOWED_EXTENSIONS;
  const allowedMimeTypes =
    options.allowedMimeTypes || DEFAULT_ALLOWED_MIME_TYPES;
  const checkFileSignature = options.checkFileSignature !== false;
  const strictMode = options.strictMode !== false;

  // Basic file checks
  if (!file) {
    errors.push("No file provided");
    return createResult(false, errors, warnings, "", 0, "unknown");
  }

  if (file.size === 0) {
    errors.push("File is empty");
    return createResult(false, errors, warnings, file.name, 0, "unknown");
  }

  // Validate file size
  if (file.size > maxSizeBytes) {
    const maxSizeMB = Math.round(maxSizeBytes / FILE_SIZE.MB);
    const fileSizeMB = Math.round(file.size / FILE_SIZE.MB);
    errors.push(
      `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
    );
  }

  // Validate filename
  const filenameValidation = validateFileName(file.name);
  if (!filenameValidation.isValid) {
    errors.push(...filenameValidation.errors);
  }
  warnings.push(...filenameValidation.warnings);

  // Get file extension
  const extension = getFileExtension(file.name).toLowerCase();

  // Check for dangerous extensions
  if (DANGEROUS_EXTENSIONS.has(extension)) {
    errors.push(`Dangerous file type detected: ${extension}`);
  }

  // Check allowed extensions
  if (!allowedExtensions.includes(extension)) {
    errors.push(
      `File type not allowed: ${extension}. Allowed types: ${allowedExtensions.join(", ")}`,
    );
  }

  // Validate MIME type
  if (strictMode && file.type) {
    if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
      warnings.push(`MIME type mismatch: ${file.type} may not be allowed`);
    }

    // Check if MIME type matches extension
    const expectedMimeTypes = FILE_SIGNATURES[extension]?.mimeTypes || [];
    if (
      expectedMimeTypes.length > 0 &&
      !expectedMimeTypes.includes(file.type.toLowerCase())
    ) {
      warnings.push(
        `MIME type (${file.type}) doesn't match file extension (${extension})`,
      );
    }
  }

  // Check file signature (magic numbers) if requested
  if (checkFileSignature && FILE_SIGNATURES[extension]) {
    const signatureValid = await verifyFileSignature(file, extension);
    if (!signatureValid) {
      errors.push(
        "File content doesn't match file extension (possible file spoofing)",
      );
    }
  }

  // Check for suspicious patterns in filename
  const suspiciousPatterns = checkSuspiciousPatterns(file.name);
  if (suspiciousPatterns.length > 0) {
    warnings.push(...suspiciousPatterns);
  }

  // Sanitize filename
  const sanitizedFileName = sanitizeFileName(file.name);

  // Detect file type
  const detectedType = detectFileType(extension, file.type);

  return createResult(
    errors.length === 0,
    errors,
    warnings,
    sanitizedFileName,
    file.size,
    detectedType,
  );
}

/**
 * Validate filename for security issues
 */
function validateFileName(fileName: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for null bytes
  if (fileName.includes("\0")) {
    errors.push("Filename contains null bytes");
  }

  // Check for path traversal attempts
  if (
    fileName.includes("..") ||
    fileName.includes("./") ||
    fileName.includes(".\\")
  ) {
    errors.push("Filename contains path traversal sequences");
  }

  // Check for extremely long names
  if (fileName.length > 255) {
    errors.push("Filename is too long (max 255 characters)");
  }

  // Check for hidden files (Unix-style)
  if (fileName.startsWith(".") && fileName !== ".htaccess") {
    warnings.push("Hidden file detected");
  }

  // Check for multiple extensions (potential bypass attempt)
  const extensionCount = (fileName.match(/\./g) || []).length;
  if (extensionCount > 1) {
    warnings.push("Multiple file extensions detected");
  }

  // Check for reserved Windows names
  const baseFileName = fileName.split(".")[0].toUpperCase();
  if (RESERVED_NAMES.includes(baseFileName)) {
    errors.push("Filename uses reserved system name");
  }

  // Check for special characters that might cause issues
  const invalidChars = /[<>:"|?*\\/\x00-\x1F]/g;
  if (invalidChars.test(fileName)) {
    errors.push("Filename contains invalid characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check file signature (magic numbers)
 */
async function verifyFileSignature(
  file: File,
  extension: string,
): Promise<boolean> {
  const signatureInfo = FILE_SIGNATURES[extension];
  if (!signatureInfo) return true; // Skip if no signature defined

  try {
    const buffer = await readFileAsArrayBuffer(
      file,
      signatureInfo.signature.length,
    );
    const bytes = new Uint8Array(buffer);

    // Check if file starts with expected signature
    for (let i = 0; i < signatureInfo.signature.length; i++) {
      if (bytes[i] !== signatureInfo.signature[i]) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error checking file signature:", error);
    return false; // Fail closed - reject if we can't verify
  }
}

/**
 * Read file as ArrayBuffer (partial read for signature checking)
 */
function readFileAsArrayBuffer(
  file: File,
  bytes: number,
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const blob = file.slice(0, bytes);

    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as ArrayBuffer"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };

    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Check for suspicious patterns in filename
 */
function checkSuspiciousPatterns(fileName: string): string[] {
  const warnings: string[] = [];

  // Check for URL-encoded characters
  if (/%[0-9a-fA-F]{2}/.test(fileName)) {
    warnings.push("Filename contains URL-encoded characters");
  }

  // Check for Unicode direction override characters
  const dangerousUnicode = [
    "\u202E", // Right-to-left override
    "\u202D", // Left-to-right override
    "\u202C", // Pop directional formatting
    "\u2066", // Left-to-right isolate
    "\u2067", // Right-to-left isolate
    "\u2068", // First strong isolate
    "\u2069", // Pop directional isolate
  ];

  for (const char of dangerousUnicode) {
    if (fileName.includes(char)) {
      warnings.push("Filename contains Unicode direction override characters");
      break;
    }
  }

  // Check for homograph attacks (similar looking characters)
  if (/[а-яА-Я]/.test(fileName)) {
    warnings.push(
      "Filename contains Cyrillic characters (possible homograph attack)",
    );
  }

  return warnings;
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return "unknown_file";

  // Remove path information
  fileName = fileName.split("/").pop() || fileName;
  fileName = fileName.split("\\").pop() || fileName;

  // Replace dangerous characters
  fileName = fileName.replace(/[<>:"|?*\\/\x00-\x1F]/g, "_");

  // Remove Unicode direction override characters
  fileName = fileName.replace(
    /[\u202E\u202D\u202C\u2066\u2067\u2068\u2069]/g,
    "",
  );

  // Remove multiple consecutive underscores
  fileName = fileName.replace(/_+/g, "_");

  // Remove leading/trailing underscores and dots
  fileName = fileName.replace(/^[_.]|[_.]$/g, "");

  // Ensure filename is not empty
  if (!fileName || fileName.length === 0) {
    return `file_${Date.now()}`;
  }

  // Limit filename length
  if (fileName.length > 100) {
    const extension = getFileExtension(fileName);
    const baseName = fileName.substring(0, 100 - extension.length - 1);
    fileName = baseName + extension;
  }

  return fileName;
}

/**
 * Get file extension including the dot
 */
function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.substring(lastDot).toLowerCase();
}

/**
 * Detect file type based on extension and MIME type
 */
function detectFileType(extension: string, mimeType: string): string {
  const typeMap: Record<string, string> = {
    ".jpg": "JPEG Image",
    ".jpeg": "JPEG Image",
    ".png": "PNG Image",
    ".gif": "GIF Image",
    ".bmp": "BMP Image",
    ".webp": "WebP Image",
    ".pdf": "PDF Document",
    ".csv": "CSV File",
    ".html": "HTML Document",
    ".htm": "HTML Document",
  };

  return typeMap[extension] || `Unknown (${extension})`;
}

/**
 * Create validation result object
 */
function createResult(
  isValid: boolean,
  errors: string[],
  warnings: string[],
  sanitizedFileName: string,
  fileSize: number,
  detectedType: string,
): FileValidationResult {
  return {
    isValid,
    errors,
    warnings,
    sanitizedFileName,
    fileSize,
    detectedType,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = FILE_SIZE.KB;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Check if file is an image
 */
export function isImageFile(fileName: string): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
  const extension = getFileExtension(fileName).toLowerCase();
  return imageExtensions.includes(extension);
}

/**
 * Check if file is a document
 */
export function isDocumentFile(fileName: string): boolean {
  const docExtensions = [
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".csv",
    ".html",
    ".htm",
  ];
  const extension = getFileExtension(fileName).toLowerCase();
  return docExtensions.includes(extension);
}
