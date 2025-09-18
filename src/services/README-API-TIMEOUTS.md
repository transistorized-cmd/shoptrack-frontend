# API Timeout Strategy

This document explains the improved timeout strategy implemented to provide better user experience.

## Problem

Previously, all API calls used a single 5-minute (300,000ms) timeout, which caused:
- Poor user experience for quick operations
- Long waits before error feedback
- Unclear loading states
- Potential browser freezing on mobile devices

## Solution

Implemented **operation-specific timeouts** based on expected operation duration:

### Timeout Categories

```typescript
export const TIMEOUT_CONFIG = {
  FAST: 5000,            // 5 seconds for quick operations
  DEFAULT: 15000,        // 15 seconds for most operations  
  CLAUDE_UPLOAD: 180000, // 3 minutes ONLY for Claude AI receipt processing
  STANDARD_UPLOAD: 30000, // 30 seconds for regular file uploads
} as const;
```

### Usage Examples

#### Quick Operations (5 seconds)
```typescript
// Plugin lists, statistics, metadata
const response = await apiWithTimeout.fast.get("/plugins");
const stats = await apiWithTimeout.fast.get("/plugins/statistics");
```

#### Claude AI Receipt Processing (3 minutes)
```typescript
// ONLY for Claude AI receipt processing - the only operation that needs 3 minutes
const response = await apiWithTimeout.claudeUpload.post("/upload", formData, {
  onUploadProgress: (event) => {
    console.log(`Upload progress: ${(event.loaded / event.total) * 100}%`);
  }
});
```

#### Standard File Uploads (30 seconds)
```typescript
// Regular file uploads without AI processing
const response = await apiWithTimeout.standardUpload.post("/files", formData);
```

#### Default Operations (15 seconds)
```typescript
// Standard CRUD operations
const response = await apiWithTimeout.default.get("/receipts");
const updated = await apiWithTimeout.default.put("/receipts/123", data);
```

### Custom Timeouts

For special cases, create custom timeout instances:

```typescript
// 45-second timeout for specific operation
const customApi = createRequestWithTimeout(45000);
const response = await customApi.post("/special-endpoint", data);
```

## Benefits

### 🚀 **Improved UX**
- **60x faster** feedback for quick operations (5s vs 5min)
- **20x faster** for standard operations (15s vs 5min)
- **3-minute timeout ONLY for Claude AI** (the only operation that truly needs it)
- All other operations get much faster feedback

### 📱 **Better Mobile Experience**
- Shorter timeouts prevent mobile browser freezing
- Better progress indication during uploads
- Responsive error handling

### 🔧 **Developer Experience** 
- Clear timeout categories make code intent obvious
- Built-in progress tracking for uploads
- Easy to customize per operation type

### 🧪 **Testing & Reliability**
- Faster test execution with appropriate timeouts
- Better error isolation and debugging
- Configurable timeouts for different environments

## Implementation Details

### Plugins Service Updates

```typescript
// Before: All operations used 5-minute timeout
await api.get("/plugins"); // 300,000ms timeout 😰

// After: Appropriate timeouts per operation
await apiWithTimeout.fast.get("/plugins");        // 10,000ms ✅
await apiWithTimeout.upload.post("/upload", data); // 120,000ms ✅
```

### Backward Compatibility

The original `api` instance is still available with the new 30-second default timeout:

```typescript
// Still works, but now uses reasonable 30s timeout
import api from '@/services/api';
const response = await api.get("/some-endpoint");
```

## Timeout Selection Guide

| Operation Type | Timeout | Use Cases |
|---------------|---------|-----------|
| **Fast** (10s) | Quick metadata, lists, validation | Plugin lists, user preferences, validation checks |
| **Default** (30s) | Standard CRUD operations | Get receipts, update items, delete records |
| **Upload** (2min) | File processing with AI | Receipt uploads, image processing, Claude analysis |
| **Analysis** (3min) | Heavy computation | Complex reports, batch processing, data analytics |

## Configuration

Timeouts can be adjusted by modifying `TIMEOUT_CONFIG` in `src/services/api.ts`:

```typescript
export const TIMEOUT_CONFIG = {
  FAST: 10000,      // Adjust for your API response times
  DEFAULT: 30000,   // Standard operations
  UPLOAD: 120000,   // File processing time
  ANALYSIS: 180000, // Heavy computation time
} as const;
```

## Error Handling

All timeout categories include the same CSRF token management, error logging, and retry logic:

```typescript
try {
  const response = await apiWithTimeout.fast.get("/plugins");
} catch (error) {
  if (error.code === 'ECONNABORTED') {
    // Timeout occurred
    showUserFriendlyMessage("Request timed out. Please try again.");
  }
}
```

## Migration

### Old Code
```typescript
import api from '@/services/api';
await api.post("/upload", formData); // 5-minute timeout!
```

### New Code  
```typescript
import { apiWithTimeout } from '@/services/api';
await apiWithTimeout.upload.post("/upload", formData); // 2-minute timeout ✅
```

This timeout strategy provides much better user experience while maintaining reliability for operations that genuinely need longer processing time.