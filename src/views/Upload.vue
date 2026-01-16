<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {{ $t('upload.uploadReceiptOrOrder') }}
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        {{ $t('upload.chooseBestMethod') }}
      </p>
    </div>

    <!-- Global Receipt Limit Reached Prompt -->
    <div
      v-if="globalReceiptLimitReached && globalUpgradeMessage"
      class="card border-l-4 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 mb-8"
    >
      <div class="flex items-start space-x-4">
        <div class="flex-shrink-0">
          <div class="w-10 h-10 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-amber-600 dark:text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
            {{ globalUpgradeMessage.title }}
          </h3>
          <p class="text-amber-700 dark:text-amber-300 mb-4">
            {{ globalUpgradeMessage.message }}
          </p>
          <div class="flex flex-col sm:flex-row gap-3">
            <button
              @click="openSubscriptionModal"
              class="btn bg-amber-600 hover:bg-amber-700 text-white border-amber-600 hover:border-amber-700 w-full sm:w-auto"
            >
              {{ globalUpgradeMessage.actionText || $t('receipts.upgrade') }}
            </button>
            <button
              @click="globalReceiptLimitReached = false"
              class="btn btn-secondary w-full sm:w-auto"
            >
              {{ $t('common.dismiss') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Upload Area -->
    <div v-if="!globalReceiptLimitReached" class="card p-6 mb-8">
      <!-- Header -->
      <div class="flex items-start justify-between mb-6">
        <div class="flex items-center">
          <div
            class="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl"
            style="background-color: #3B82F6"
          >
            📤
          </div>
          <div class="ml-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              Upload Receipt or Document
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Drag and drop your file or click to browse
            </p>
          </div>
        </div>
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
        >
          Auto-Detect
        </span>
      </div>

      <!-- Upload Form -->
      <form @submit.prevent="handleUpload">
        <!-- File Drop Zone -->
        <div
          @click="fileInput?.click()"
          @dragover.prevent="isDragging = true"
          @dragenter.prevent="isDragging = true"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
          class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
          :class="{
            'border-blue-500 bg-blue-50 dark:bg-blue-900/20': isDragging,
            'border-green-500 bg-green-50 dark:bg-green-900/20': selectedFile,
          }"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.csv,.xlsx,.json"
            class="hidden"
            @change="handleFileSelect"
          />

          <div v-if="!selectedFile">
            <svg
              class="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <p class="text-xl font-medium text-gray-900 dark:text-gray-300 mb-2">
              Drop your file here or click to browse
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              PDF, JPG, PNG, CSV, XLSX, JSON files supported
            </p>
          </div>

          <div v-else class="space-y-2">
            <div class="mx-auto h-12 w-12 text-green-500 mb-2">📄</div>
            <p class="text-lg font-medium text-gray-900 dark:text-gray-100">
              {{ selectedFile.name }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ formatFileSize(selectedFile.size) }}
            </p>
            <button
              type="button"
              @click.stop="clearFile"
              class="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Remove File
            </button>
          </div>
        </div>

        <!-- Auto-detected plugin info -->
        <div
          v-if="detectedPlugin"
          class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div class="flex items-center">
            <div
              class="w-3 h-3 rounded-full mr-3"
              :style="{ backgroundColor: detectedPlugin.color || '#3B82F6' }"
            />
            <div>
              <p class="font-medium text-blue-900">
                Will use: {{ detectedPlugin.pluginName || detectedPlugin.plugin?.name }}
              </p>
              <p class="text-sm text-blue-700">
                {{ detectedPlugin.pluginDescription || detectedPlugin.plugin?.description }}
              </p>
            </div>
          </div>
        </div>

        <!-- Validation Errors -->
        <div
          v-if="showValidationErrors && fileValidationResult && !fileValidationResult.isValid"
          class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <div class="flex items-start">
            <svg
              class="w-5 h-5 text-red-600 mt-0.5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
            <div class="flex-1">
              <p class="font-medium text-red-900 mb-1">File validation failed</p>
              <ul class="text-sm text-red-700 space-y-1">
                <li v-for="error in fileValidationResult.errors" :key="error">
                  • {{ error }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Upload Limit Reached -->
        <div
          v-if="showLimitReached && uploadLimitResult && !uploadLimitResult.canUse"
          class="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg"
        >
          <div class="flex items-start">
            <svg
              class="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
            <div class="flex-1">
              <p class="font-medium text-orange-900 dark:text-orange-200 mb-1">
                {{ uploadLimitResult.message?.title || 'Upload Limit Reached' }}
              </p>
              <p class="text-sm text-orange-800 dark:text-orange-300 mb-3">
                {{ uploadLimitResult.message?.message || 'You have reached your monthly upload limit.' }}
              </p>
              <div class="flex items-center space-x-3">
                <button
                  v-if="uploadLimitResult.message?.actionUrl"
                  type="button"
                  @click="openActionUrl(uploadLimitResult.message.actionUrl)"
                  class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-orange-700 bg-orange-100 hover:bg-orange-200"
                >
                  {{ uploadLimitResult.message.actionText || 'Upgrade Plan' }}
                </button>
                <button
                  type="button"
                  @click="clearLimitMessage"
                  class="text-xs text-orange-600 hover:text-orange-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="flex items-center justify-between mt-6">
          <button
            type="submit"
            :disabled="!selectedFile || uploading"
            class="btn btn-primary disabled:opacity-50"
          >
            {{ uploading ? 'Processing...' : 'Upload File' }}
          </button>

          <button
            v-if="selectedFile"
            type="button"
            @click="clearFile"
            class="btn btn-secondary"
          >
            Clear
          </button>
        </div>
      </form>
    </div>

    <!-- Upload Result -->
    <div v-if="uploadResult" class="card p-6">
      <h3
        class="text-lg font-medium mb-4"
        :class="uploadResult.success ? 'text-green-900 dark:text-green-400' : 'text-red-900 dark:text-red-400'"
      >
        {{ uploadResult.success ? 'Upload Successful!' : 'Upload Failed' }}
      </h3>

      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">{{ uploadResult.message }}</p>

        <div v-if="uploadResult.errors && uploadResult.errors.length > 0">
          <h4 class="text-sm font-medium text-red-900 dark:text-red-400 mb-2">Errors:</h4>
          <ul class="list-disc list-inside space-y-1 text-sm text-red-800 dark:text-red-300">
            <li v-for="error in uploadResult.errors" :key="error">
              {{ error }}
            </li>
          </ul>
        </div>

        <div class="flex justify-end space-x-3">
          <button
            @click="clearUploadResult"
            class="btn btn-secondary"
          >
            Upload Another
          </button>
          <RouterLink
            v-if="uploadResult.success"
            to="/receipts"
            class="btn btn-primary"
          >
            View Receipts
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Subscription Modal -->
    <SubscriptionModal
      :is-open="showSubscriptionModal"
      @close="closeSubscriptionModal"
      @subscribed="handleSubscribed"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useTranslation } from "@/composables/useTranslation";
import { useAsyncJobs } from "@/composables/useAsyncJobs";
import { featureService, type FeatureLimitCheckResult, type FeatureMessage } from "@/services/featureService";
import { pluginsService, type PluginDetectionResult } from "@/services/plugins";
import SubscriptionModal from "@/components/SubscriptionModal.vue";
import type { ReceiptPlugin } from "@/types/plugin";
import { FILE_SIZE } from "@/constants/app";
import {
  validateFile,
  formatFileSize,
  type FileValidationResult,
} from "@/utils/fileValidation";

const { t, locale } = useTranslation();
const router = useRouter();
const { uploadFileAsync, activeJobs, hasActiveJobs, getJob } = useAsyncJobs();

// File upload state
const selectedFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement>();
const isDragging = ref(false);
const uploading = ref(false);

// Validation state
const fileValidationResult = ref<FileValidationResult | null>(null);
const showValidationErrors = ref(false);

// Plugin detection
const detectedPlugin = ref<PluginDetectionResult | null>(null);
const availablePlugins = ref<ReceiptPlugin[]>([]);

// Upload results - using a flexible type for async upload
interface UploadResultDisplay {
  success: boolean;
  receipt: {
    id: string | number;
    fileName: string;
    originalFileName: string;
    filePath: string;
    itemsDetected: number;
    confidence: number;
    successfullyParsed: number;
    processingStatus: string;
    pluginUsed: string;
    uploadedAt: string;
    processingTime: number;
  };
  errors: string[];
  warnings: string[];
  message?: string;
}
const uploadResult = ref<UploadResultDisplay | null>(null);

// Limit checking
const uploadLimitResult = ref<FeatureLimitCheckResult | null>(null);
const showLimitReached = ref(false);

// Global receipt limit state
const globalReceiptLimitReached = ref(false);
const globalUpgradeMessage = ref<FeatureMessage | null>(null);
const showSubscriptionModal = ref(false);

// File handling methods
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    await processSelectedFile(target.files[0]);
  }
};

const handleDrop = async (event: DragEvent) => {
  isDragging.value = false;
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    await processSelectedFile(event.dataTransfer.files[0]);
  }
};

const handleDragLeave = (event: DragEvent) => {
  // Only set isDragging to false if we're leaving the entire drop zone
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;

  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    isDragging.value = false;
  }
};

const processSelectedFile = async (file: File) => {
  // Reset states
  fileValidationResult.value = null;
  showValidationErrors.value = false;
  detectedPlugin.value = null;

  // Validate file
  const validation = await validateFile(file, {
    maxSizeBytes: FILE_SIZE.DEFAULT_MAX_SIZE_BYTES,
    allowedExtensions: [
      ".jpg", ".jpeg", ".png", ".gif", ".webp",
      ".pdf", ".csv", ".xlsx", ".json"
    ],
    checkFileSignature: true,
    strictMode: true,
  });

  fileValidationResult.value = validation;

  if (!validation.isValid) {
    showValidationErrors.value = true;
    selectedFile.value = null;
    if (fileInput.value) {
      fileInput.value.value = "";
    }
    return;
  }

  // File is valid
  selectedFile.value = file;
  await detectPluginForFile(file);
};

const detectPluginForFile = async (file: File) => {
  try {
    const result = await pluginsService.detectPlugin(file, availablePlugins.value);
    detectedPlugin.value = result.success ? result : null;
  } catch (error) {
    console.error("Plugin detection failed:", error);
    detectedPlugin.value = null;
  }
};

const clearFile = () => {
  selectedFile.value = null;
  detectedPlugin.value = null;
  fileValidationResult.value = null;
  showValidationErrors.value = false;
  uploadResult.value = null;
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

// Upload handling
const checkUploadLimit = async (): Promise<boolean> => {
  try {
    const limitCheck = await featureService.checkReceiptUploadLimit();
    uploadLimitResult.value = limitCheck;

    if (!limitCheck.canUse) {
      showLimitReached.value = true;
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to check upload limit:', error);
    return true; // Allow upload on error
  }
};

const handleUpload = async () => {
  if (!selectedFile.value) return;

  // Validate file again
  if (!fileValidationResult.value || !fileValidationResult.value.isValid) {
    showValidationErrors.value = true;
    return;
  }

  // Check upload limits
  const canUpload = await checkUploadLimit();
  if (!canUpload) {
    return;
  }

  uploading.value = true;
  uploadResult.value = null;

  try {
    // Use the real async upload API
    const jobId = await uploadFileAsync(selectedFile.value, {
      onUploadProgress: (progressEvent: any) => {
        // Could add progress tracking here if needed
        console.debug('Upload progress:', progressEvent);
      },
    });

    // Upload started successfully - the job is now being processed
    uploadResult.value = {
      success: true,
      receipt: {
        id: jobId,
        fileName: selectedFile.value.name,
        originalFileName: selectedFile.value.name,
        filePath: '',
        itemsDetected: 0,
        confidence: 0,
        successfullyParsed: 0,
        processingStatus: 'processing',
        pluginUsed: detectedPlugin.value?.pluginKey || 'generic',
        uploadedAt: new Date().toISOString(),
        processingTime: 0,
      },
      errors: [],
      warnings: [],
      message: `File uploaded successfully. Job ID: ${jobId}. Processing in background...`,
    };

    // Clear the form after successful upload
    clearFile();

  } catch (error) {
    console.error("Upload failed:", error);

    let errorMessage = "Upload failed due to an unexpected error";
    let errorDetails = [errorMessage];

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = [error.message];
    }

    uploadResult.value = {
      success: false,
      receipt: {
        id: '',
        fileName: selectedFile.value.name,
        originalFileName: selectedFile.value.name,
        filePath: '',
        itemsDetected: 0,
        confidence: 0,
        successfullyParsed: 0,
        processingStatus: 'failed',
        pluginUsed: 'unknown',
        uploadedAt: new Date().toISOString(),
        processingTime: 0,
      },
      errors: errorDetails,
      warnings: [],
    };
  } finally {
    uploading.value = false;
  }
};

const clearUploadResult = () => {
  uploadResult.value = null;
};

const clearLimitMessage = () => {
  showLimitReached.value = false;
  uploadLimitResult.value = null;
};

// Global limit handling
const checkGlobalReceiptLimit = async () => {
  try {
    const limitResult = await featureService.checkReceiptUploadLimit();
    globalReceiptLimitReached.value = limitResult.isLimitReached;

    if (limitResult.isLimitReached) {
      try {
        globalUpgradeMessage.value = await featureService.getFeatureMessage(
          'receipt_monthly_limit',
          'upgrade_prompt',
          locale.value
        );
      } catch (error) {
        console.error("Failed to get global upgrade message:", error);
      }
    }
  } catch (error) {
    console.error("Failed to check global receipt limit:", error);
  }
};

// Subscription modal handling
const openSubscriptionModal = () => {
  showSubscriptionModal.value = true;
};

const closeSubscriptionModal = () => {
  showSubscriptionModal.value = false;
};

const handleSubscribed = () => {
  showSubscriptionModal.value = false;
  checkGlobalReceiptLimit();
};

// Utility functions
const openActionUrl = (url: string) => {
  try {
    if (typeof window !== 'undefined' && window.open) {
      window.open(url, '_blank');
    }
  } catch (error) {
    console.warn('Could not open action URL:', error);
  }
};

// Load data on mount
onMounted(async () => {
  try {
    const plugins = await pluginsService.getAllPlugins();
    availablePlugins.value = plugins.receiptPlugins;
  } catch (error) {
    console.error("Failed to load plugins:", error);
  }

  await checkGlobalReceiptLimit();
});
</script>

<style scoped>
/* No special styles needed - using standard Tailwind */
</style>