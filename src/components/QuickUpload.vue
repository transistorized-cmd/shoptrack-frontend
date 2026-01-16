<template>
  <!-- Quick Upload Section -->
  <div class="card p-6 mb-8">
    <!-- Plugin Header -->
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center">
        <div
          class="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl"
          style="background-color: #3B82F6"
        >
          📤
        </div>
        <div class="ml-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            {{ $t('upload.quickUpload.title') }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ $t('upload.quickUpload.description') }}
          </p>
        </div>
      </div>

      <span
        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
      >
        {{ $t('upload.quickUpload.autoDetect') }}
      </span>
    </div>

    <!-- Plugin Details -->
    <div class="mb-6 space-y-2 text-sm text-gray-600 dark:text-gray-400">
      <div class="flex items-center">
        <span class="w-4 h-4 mr-2">📁</span>
        <span>{{ $t('upload.quickUpload.supportedFormats') }}</span>
      </div>
      <div class="flex items-center">
        <span class="w-4 h-4 mr-2">🤖</span>
        <span>{{ $t('upload.quickUpload.automaticDetection') }}</span>
      </div>
      <div class="flex items-center">
        <span class="w-4 h-4 mr-2">🔒</span>
        <span>{{ $t('upload.quickUpload.securityScanning') }}</span>
      </div>
    </div>

    <form data-element-type="quick-upload-form">
      <!-- File Drop Zone -->
      <div
        class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
        :class="{
          'border-blue-500 bg-blue-50 dark:bg-blue-900/20': isDragging,
          'border-green-500 bg-green-50 dark:bg-green-900/20': selectedFile,
        }"
        data-element-type="drop-zone"
        ref="dropZoneRef"
      >
        <input
          ref="quickFileInput"
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.csv"
          class="hidden"
          data-element-type="file-input"
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
            {{ $t('upload.quickUpload.dropFileHere') }}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ $t('upload.quickUpload.autoProcessDescription') }}
          </p>
        </div>

        <div v-else class="space-y-2">
          <div class="mx-auto h-12 w-12 text-green-500 mb-2">📄</div>
          <p class="text-lg font-medium text-gray-900 dark:text-gray-100">
            {{ selectedFile.name }}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ $t('upload.quickUpload.fileSize', { size: formatSize(selectedFile.size) }) }}
          </p>
          <button
            type="button"
            class="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            data-element-type="remove-file-btn"
          >
            {{ $t('upload.quickUpload.remove') }}
          </button>
        </div>
      </div>

      <!-- Validation Errors -->
      <div
        v-if="
          showValidationErrors &&
          fileValidationResult &&
          !fileValidationResult.isValid
        "
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
            <p class="font-medium text-red-900 mb-1">{{ $t('upload.fileValidationFailed') }}</p>
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
              {{ uploadLimitResult.message?.title || $t('upload.limitReached.title', 'Upload Limit Reached') }}
            </p>
            <p class="text-sm text-orange-800 dark:text-orange-300 mb-3">
              {{ uploadLimitResult.message?.message || $t('upload.limitReached.message', 'You have reached your monthly upload limit.') }}
            </p>
            <div class="text-xs text-orange-700 dark:text-orange-400 mb-3">
              {{ $t('upload.limitReached.usage', 'Usage: {usage} of {limit}', {
                usage: uploadLimitResult.usage,
                limit: uploadLimitResult.limit || 0
              }) }}
            </div>
            <div class="flex items-center space-x-3">
              <button
                v-if="uploadLimitResult.message?.actionUrl"
                data-element-type="action-url-btn"
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-orange-700 bg-orange-100 hover:bg-orange-200 dark:bg-orange-800 dark:text-orange-200 dark:hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                {{ uploadLimitResult.message.actionText || $t('upload.limitReached.upgrade', 'Upgrade Plan') }}
              </button>
              <button
                data-element-type="clear-limit-btn"
                class="text-xs text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300"
              >
                {{ $t('upload.limitReached.dismiss', 'Dismiss') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Validation Warnings -->
      <div
        v-if="
          fileValidationResult &&
          fileValidationResult.warnings.length > 0 &&
          fileValidationResult.isValid
        "
        class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
      >
        <div class="flex items-start">
          <svg
            class="w-5 h-5 text-yellow-600 mt-0.5 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          <div class="flex-1">
            <p class="font-medium text-yellow-900 mb-1">{{ $t('upload.quickUpload.securityWarnings') }}</p>
            <ul class="text-sm text-yellow-700 space-y-1">
              <li
                v-for="warning in fileValidationResult.warnings"
                :key="warning"
              >
                • {{ warning }}
              </li>
            </ul>
          </div>
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
            :style="{ backgroundColor: detectedPlugin.color }"
          />
          <div>
            <p class="font-medium text-blue-900">
              {{ $t('upload.quickUpload.willUse', { pluginName: detectedPlugin.pluginName }) }}
            </p>
            <p class="text-sm text-blue-700">
              {{ detectedPlugin.pluginDescription }}
            </p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between mt-6">
        <button
          type="submit"
          formnovalidate
          :disabled="!selectedFile || quickUploading"
          class="btn btn-primary disabled:opacity-50"
          data-element-type="submit-btn"
        >
          {{
            quickUploading ? $t('upload.quickUpload.processing') : $t('upload.quickUpload.processFile')
          }}
        </button>

        <div v-if="selectedFile" class="flex space-x-2">
          <button
            type="button"
            class="btn btn-secondary"
            data-element-type="clear-file-btn"
          >
            {{ $t('upload.quickUpload.clear') }}
          </button>
        </div>
      </div>
    </form>

    <!-- Active Jobs Display -->
    <div v-if="hasActiveJobs" class="card p-6 mt-8">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {{ $t('upload.quickUpload.activeJobs') || 'Processing Files' }}
      </h3>
      
      <div class="space-y-3">
        <div
          v-for="job in activeJobs"
          :key="job.jobId"
          class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
        >
          <div class="flex items-center space-x-3">
            <!-- Status Icon -->
            <div class="flex-shrink-0">
              <div
                v-if="job.status?.status === 'processing'"
                class="w-4 h-4 bg-blue-500 rounded-full animate-pulse"
              />
              <div
                v-else-if="job.status?.status === 'completed'"
                class="w-4 h-4 bg-green-500 rounded-full"
              />
              <div
                v-else-if="job.status?.status === 'failed'"
                class="w-4 h-4 bg-red-500 rounded-full"
              />
              <div
                v-else
                class="w-4 h-4 bg-yellow-500 rounded-full"
              />
            </div>
            
            <!-- Job Info -->
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ job.status?.filename || 'Processing...' }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {{ job.status?.status || 'pending' }} • {{ getJobDuration(job.jobId) }}
              </p>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="flex items-center space-x-2">
            <RouterLink
              v-if="job.status?.status === 'completed' && getReceiptId(job)"
              :to="`/receipts/${getReceiptId(job)}`"
              class="text-xs px-3 py-1.5 bg-shoptrack-500 text-white rounded hover:bg-shoptrack-600 transition-colors inline-flex items-center"
            >
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {{ $t('common.view') }}
            </RouterLink>
            <RouterLink
              v-else-if="job.status?.status === 'completed'"
              to="/receipts"
              class="text-xs px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors inline-flex items-center"
            >
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {{ $t('upload.quickUpload.viewReceipts') }}
            </RouterLink>
            <button
              v-if="job.status?.status === 'failed'"
              :data-job-id="job.jobId"
              data-element-type="retry-job-btn"
              class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {{ $t('upload.quickUpload.retry') || 'Retry' }}
            </button>
            <button
              v-if="job.status?.status === 'pending' || job.status?.status === 'processing'"
              :data-job-id="job.jobId"
              data-element-type="cancel-job-btn"
              class="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              {{ $t('upload.quickUpload.cancel') || 'Cancel' }}
            </button>
            <button
              v-if="job.status?.status === 'completed' || job.status?.status === 'failed'"
              :data-job-id="job.jobId"
              data-element-type="remove-job-btn"
              class="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              {{ $t('upload.quickUpload.remove') || 'Remove' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Result -->
    <div v-if="uploadResult" class="card p-6 mt-8">
      <h3
        class="text-lg font-medium mb-4"
        :class="uploadResult.success ? 'text-green-900 dark:text-green-400' : 'text-red-900 dark:text-red-400'"
      >
        {{ uploadResult.success ? $t('upload.quickUpload.uploadSuccessful') : $t('upload.quickUpload.uploadFailed') }}
      </h3>

      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">{{ uploadResult.message }}</p>

        <div
          v-if="uploadResult.success && uploadResult.receipt && 'filename' in uploadResult.receipt"
          class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
        >
          <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            {{ $t('upload.quickUpload.receiptDetails') }}
          </h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500 dark:text-gray-400">{{ $t('upload.quickUpload.filename') }}</span>
              <span class="ml-1 text-gray-900 dark:text-gray-100">{{
                uploadResult.receipt.filename
              }}</span>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">{{ $t('upload.quickUpload.itemsFound') }}</span>
              <span class="ml-1 text-gray-900 dark:text-gray-100">{{
                uploadResult.receipt.totalItemsDetected
              }}</span>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">{{ $t('upload.quickUpload.successfullyParsed') }}</span>
              <span class="ml-1 text-gray-900 dark:text-gray-100">{{
                uploadResult.receipt.successfullyParsed
              }}</span>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">{{ $t('upload.quickUpload.status') }}</span>
              <span class="ml-1 text-gray-900 dark:text-gray-100 capitalize">{{
                uploadResult.receipt.processingStatus
              }}</span>
            </div>
          </div>
        </div>

        <div v-if="uploadResult.errors && uploadResult.errors.length > 0">
          <h4 class="text-sm font-medium text-red-900 dark:text-red-400 mb-2">{{ $t('upload.quickUpload.errors') }}</h4>
          <ul class="list-disc list-inside space-y-1 text-sm text-red-800 dark:text-red-300">
            <li v-for="error in uploadResult.errors" :key="error">
              {{ error }}
            </li>
          </ul>
        </div>

        <div class="flex justify-end space-x-3">
          <button
            class="btn btn-secondary"
            data-element-type="upload-another-btn"
          >
            {{ $t('upload.quickUpload.uploadAnother') }}
          </button>
          <RouterLink
            v-if="uploadResult.success && uploadResult.receipt && 'id' in uploadResult.receipt && uploadResult.receipt.id"
            :to="`/receipts/${uploadResult.receipt.id}`"
            class="btn btn-primary"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {{ $t('receipts.receiptDetail.title') }}
          </RouterLink>
          <RouterLink
            v-if="uploadResult.success && (!uploadResult.receipt || !('id' in uploadResult.receipt) || !uploadResult.receipt.id)"
            to="/receipts"
            class="btn btn-primary"
          >
            {{ $t('upload.quickUpload.viewReceipts') }}
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Score Notification Modal -->
    <ScoreNotificationModal
      v-if="scoreNotification"
      :notification="scoreNotification"
      :show="showScoreNotification"
      @dismiss="handleScoreNotificationDismiss"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { RouterLink } from "vue-router";
import { useTranslation } from "@/composables/useTranslation";
import { FILE_SIZE } from "@/constants/app";
import { pluginsService, type PluginDetectionResult } from "@/services/plugins";
import { useAsyncJobs } from "@/composables/useAsyncJobs";
import { useJobNotifications } from "@/composables/useJobNotifications";
import { featureService, type FeatureLimitCheckResult } from "@/services/featureService";
import { analyticsService } from "@/services/analytics";
import type { AsyncUploadResult, ReceiptPlugin } from "@/types/plugin";
import type { ScoreNotification } from "@/types/scoreNotification";
import { createScoreNotification } from "@/types/scoreNotification";
import ScoreNotificationModal from "./ScoreNotificationModal.vue";
import {
  validateFile,
  formatFileSize as formatSize,
  type FileValidationResult,
} from "@/utils/fileValidation";

// i18n
const { locale } = useTranslation();

// Quick upload state
const selectedFile = ref<File | null>(null);
const quickFileInput = ref<HTMLInputElement>();
const dropZoneRef = ref<HTMLElement>();
const isDragging = ref(false);
const quickUploading = ref(false);
const detectedPlugin = ref<PluginDetectionResult | null>(null);
const uploadResult = ref<AsyncUploadResult | null>(null);
const availablePlugins = ref<ReceiptPlugin[]>([]);
const fileValidationResult = ref<FileValidationResult | null>(null);
const showValidationErrors = ref(false);
const uploadLimitResult = ref<FeatureLimitCheckResult | null>(null);
const showLimitReached = ref(false);

// Score notification state
const scoreNotification = ref<ScoreNotification | null>(null);
const showScoreNotification = ref(false);
const previousScore = ref<number | null>(null);

// Async job management
const { 
  uploadFileAsync, 
  activeJobs, 
  hasActiveJobs, 
  isJobActive, 
  cancelJob, 
  retryJob, 
  removeJob, 
  getJobDuration 
} = useAsyncJobs();
const { initialize: initializeNotifications } = useJobNotifications();

// Quick upload methods
const handleQuickFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    await processSelectedFile(target.files[0]);
  }
};

const handleQuickFileDrop = async (event: DragEvent) => {
  isDragging.value = false;
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    await processSelectedFile(event.dataTransfer.files[0]);
  }
};

const processSelectedFile = async (file: File) => {
  // Reset validation state
  fileValidationResult.value = null;
  showValidationErrors.value = false;

  // Validate file first
  const validation = await validateFile(file, {
    maxSizeBytes: FILE_SIZE.DEFAULT_MAX_SIZE_BYTES,
    allowedExtensions: [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".pdf",
      ".csv",
    ],
    checkFileSignature: true,
    strictMode: true,
  });

  fileValidationResult.value = validation;

  if (!validation.isValid) {
    showValidationErrors.value = true;
    // Clear file selection if validation fails
    selectedFile.value = null;
    if (quickFileInput.value) {
      quickFileInput.value.value = "";
    }
    return;
  }

  // File is valid, proceed with selection
  selectedFile.value = file;
  await detectPluginForFile(file);
};

const clearQuickFile = () => {
  selectedFile.value = null;
  detectedPlugin.value = null;
  fileValidationResult.value = null;
  showValidationErrors.value = false;
  if (quickFileInput.value) {
    quickFileInput.value.value = "";
  }
};

const handleRemoveSelectedFile = (event: MouseEvent) => {
  event.stopPropagation();
  clearQuickFile();
};

const detectPluginForFile = async (file: File) => {
  try {
    const result = await pluginsService.detectPlugin(
      file,
      availablePlugins.value,
    );
    detectedPlugin.value = result.success ? result : null;
  } catch (error) {
    console.error("Plugin detection failed:", error);
    detectedPlugin.value = null;
  }
};

// NUCLEAR OPTION: Imperative drag event handlers to completely bypass _withMods
// These are attached via addEventListener to avoid Vue template compilation issues
let dragEventHandlers: {
  handleDragOver: (event: DragEvent) => void;
  handleDragEnter: (event: DragEvent) => void;
  handleDragLeave: (event: DragEvent) => void;
  handleDrop: (event: DragEvent) => void;
} | null = null;

const setupDragHandlers = () => {
  if (!dropZoneRef.value) return;

  // Create handlers that bypass Vue's _withMods completely
  const handleDragOver = (event: DragEvent) => {
    try {
      event.preventDefault();
      event.stopPropagation();
      isDragging.value = true;
    } catch (error) {
      console.warn('Drag over error (non-blocking):', error);
    }
  };

  const handleDragEnter = (event: DragEvent) => {
    try {
      event.preventDefault();
      event.stopPropagation();
      isDragging.value = true;
    } catch (error) {
      console.warn('Drag enter error (non-blocking):', error);
    }
  };

  const handleDragLeave = (event: DragEvent) => {
    try {
      event.preventDefault();
      event.stopPropagation();

      // Only set isDragging to false if we're leaving the entire drop zone
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;

      // If cursor is still within the drop zone boundaries, keep dragging state
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        isDragging.value = false;
      }
    } catch (error) {
      console.warn('Drag leave error (non-blocking):', error);
      // Failsafe: always clear dragging state on error
      isDragging.value = false;
    }
  };

  const handleDrop = (event: DragEvent) => {
    try {
      handleQuickFileDrop(event);
    } catch (error) {
      console.warn('Drop error (non-blocking):', error);
    }
  };

  // Store handlers for cleanup
  dragEventHandlers = { handleDragOver, handleDragEnter, handleDragLeave, handleDrop };

  // Attach event listeners directly to DOM (bypasses Vue template compilation)
  const element = dropZoneRef.value;
  element.addEventListener('dragover', handleDragOver);
  element.addEventListener('dragenter', handleDragEnter);
  element.addEventListener('dragleave', handleDragLeave);
  element.addEventListener('drop', handleDrop);

  console.log('✅ Drag handlers attached via DOM (bypassing _withMods)');
};

const cleanupDragHandlers = () => {
  if (!dropZoneRef.value || !dragEventHandlers) return;

  const element = dropZoneRef.value;
  element.removeEventListener('dragover', dragEventHandlers.handleDragOver);
  element.removeEventListener('dragenter', dragEventHandlers.handleDragEnter);
  element.removeEventListener('dragleave', dragEventHandlers.handleDragLeave);
  element.removeEventListener('drop', dragEventHandlers.handleDrop);

  dragEventHandlers = null;
  console.log('✅ Drag handlers cleaned up');
};

// MEGA NUCLEAR OPTION: Setup DOM event handlers using data attributes
// This completely bypasses Vue template event handlers to avoid _withMods
let domEventHandlers: {
  formSubmitHandler: (e: Event) => void;
  dropZoneClickHandler: (e: Event) => void;
  fileInputChangeHandler: (e: Event) => void;
  removeFileBtnHandler: (e: Event) => void;
  clearFileBtnHandler: (e: Event) => void;
  actionUrlBtnHandler: (e: Event) => void;
  clearLimitBtnHandler: (e: Event) => void;
  uploadAnotherBtnHandler: (e: Event) => void;
  jobActionHandler: (e: Event) => void;
} | null = null;

const setupDomEventHandlers = () => {
  console.log('🔧 Setting up MEGA nuclear option DOM event handlers (data attributes)');

  // Form submission handler
  const formSubmitHandler = (e: Event) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      handleQuickUpload();
    } catch (error) {
      console.warn('Form submit error (non-blocking):', error);
    }
  };

  // Drop zone click handler
  const dropZoneClickHandler = (e: Event) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      if (quickFileInput.value) {
        quickFileInput.value.click();
      }
    } catch (error) {
      console.warn('Drop zone click error (non-blocking):', error);
    }
  };

  // File input change handler
  const fileInputChangeHandler = (e: Event) => {
    try {
      handleQuickFileSelect(e);
    } catch (error) {
      console.warn('File input change error (non-blocking):', error);
    }
  };

  // Remove file button handler
  const removeFileBtnHandler = (e: Event) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      handleRemoveSelectedFile(e as MouseEvent);
    } catch (error) {
      console.warn('Remove file button error (non-blocking):', error);
    }
  };

  // Clear file button handler
  const clearFileBtnHandler = (e: Event) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      clearQuickFile();
    } catch (error) {
      console.warn('Clear file button error (non-blocking):', error);
    }
  };

  // Action URL button handler
  const actionUrlBtnHandler = (e: Event) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      if (uploadLimitResult.value?.message?.actionUrl) {
        openActionUrl(uploadLimitResult.value.message.actionUrl);
      }
    } catch (error) {
      console.warn('Action URL button error (non-blocking):', error);
    }
  };

  // Clear limit button handler
  const clearLimitBtnHandler = (e: Event) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      clearLimitMessage();
    } catch (error) {
      console.warn('Clear limit button error (non-blocking):', error);
    }
  };

  // Upload another button handler
  const uploadAnotherBtnHandler = (e: Event) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      clearUploadResult();
    } catch (error) {
      console.warn('Upload another button error (non-blocking):', error);
    }
  };

  // Job action handler (retry, cancel, remove)
  const jobActionHandler = (e: Event) => {
    try {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      const jobId = target.getAttribute('data-job-id');
      const actionType = target.getAttribute('data-element-type');

      if (!jobId || !actionType) return;

      if (actionType === 'retry-job-btn') {
        retryJob(jobId);
      } else if (actionType === 'cancel-job-btn') {
        cancelJob(jobId);
      } else if (actionType === 'remove-job-btn') {
        removeJob(jobId);
      }
    } catch (error) {
      console.warn('Job action error (non-blocking):', error);
    }
  };

  // Store handlers for cleanup
  domEventHandlers = {
    formSubmitHandler,
    dropZoneClickHandler,
    fileInputChangeHandler,
    removeFileBtnHandler,
    clearFileBtnHandler,
    actionUrlBtnHandler,
    clearLimitBtnHandler,
    uploadAnotherBtnHandler,
    jobActionHandler,
  };

  // Setup form submission handler
  const form = document.querySelector('[data-element-type="quick-upload-form"]');
  if (form) {
    form.addEventListener('submit', formSubmitHandler);
  }

  // Setup drop zone click handler
  const dropZone = document.querySelector('[data-element-type="drop-zone"]');
  if (dropZone) {
    dropZone.addEventListener('click', dropZoneClickHandler);
  }

  // Setup file input change handler
  const fileInput = document.querySelector('[data-element-type="file-input"]');
  if (fileInput) {
    fileInput.addEventListener('change', fileInputChangeHandler);
  }

  // Setup button handlers with delegation for dynamic elements
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const elementType = target.getAttribute('data-element-type');

    if (!elementType) return;

    switch (elementType) {
      case 'remove-file-btn':
        removeFileBtnHandler(e);
        break;
      case 'clear-file-btn':
        clearFileBtnHandler(e);
        break;
      case 'action-url-btn':
        actionUrlBtnHandler(e);
        break;
      case 'clear-limit-btn':
        clearLimitBtnHandler(e);
        break;
      case 'upload-another-btn':
        uploadAnotherBtnHandler(e);
        break;
      case 'retry-job-btn':
      case 'cancel-job-btn':
      case 'remove-job-btn':
        jobActionHandler(e);
        break;
    }
  });

  console.log('✅ MEGA nuclear option DOM event handlers setup complete');
};

const cleanupDomEventHandlers = () => {
  if (!domEventHandlers) return;

  // Remove specific event listeners
  const form = document.querySelector('[data-element-type="quick-upload-form"]');
  if (form) {
    form.removeEventListener('submit', domEventHandlers.formSubmitHandler);
  }

  const dropZone = document.querySelector('[data-element-type="drop-zone"]');
  if (dropZone) {
    dropZone.removeEventListener('click', domEventHandlers.dropZoneClickHandler);
  }

  const fileInput = document.querySelector('[data-element-type="file-input"]');
  if (fileInput) {
    fileInput.removeEventListener('change', domEventHandlers.fileInputChangeHandler);
  }

  // Note: Document event delegation will be cleaned up when the component unmounts
  domEventHandlers = null;
  console.log('✅ MEGA nuclear option DOM event handlers cleaned up');
};

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
    // Allow upload on error to not block users
    return true;
  }
};

const openActionUrl = (url?: string) => {
  if (!url) {
    return;
  }

  try {
    if (typeof window !== 'undefined' && typeof window.open === 'function') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    console.warn('Unable to open action URL:', error);
  }
};

const handleQuickUpload = async () => {
  if (!selectedFile.value) return;

  // Check if we have a cached validation result and it's valid
  if (!fileValidationResult.value || !fileValidationResult.value.isValid) {
    showValidationErrors.value = true;
    return;
  }

  // Check upload limits before processing
  const canUpload = await checkUploadLimit();
  if (!canUpload) {
    return;
  }

  quickUploading.value = true;
  uploadResult.value = null;

  try {
    // Fetch score BEFORE upload (silent, don't show errors)
    try {
      const scoreBeforeUpload = await analyticsService.getExpenseVisibilityScore(locale.value);
      previousScore.value = scoreBeforeUpload.totalScore;
      console.log('Score before upload:', previousScore.value);
    } catch (error) {
      console.log('Could not fetch score before upload (non-blocking):', error);
      // Don't block upload if score fetch fails
    }

    // Store filename before clearing the file
    const filename = selectedFile.value.name;

    // Use async upload with high priority for user-initiated uploads
    const jobId = await uploadFileAsync(selectedFile.value, {
      priority: 10, // High priority for immediate user uploads
      onUploadProgress: (progressEvent) => {
        console.log('Upload progress:', progressEvent);
      }
    });

    console.log('Upload started with job ID:', jobId);

    // Clear the form after successful upload initiation
    clearQuickFile();

    // Set success state for immediate feedback using stored filename
    uploadResult.value = {
      receipt: {} as any,
      items: [],
      success: true,
      message: `Upload started successfully! Processing ${filename} in the background. You'll receive a notification when it's complete.`,
      isDuplicate: false,
      errors: [],
      jobId, // Store job ID for reference
    };

    // Fetch score AFTER upload and show notification
    if (previousScore.value !== null) {
      try {
        // Wait a moment for backend to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        const scoreAfterUpload = await analyticsService.getExpenseVisibilityScore(locale.value);
        console.log('Score after upload:', scoreAfterUpload.totalScore, 'Previous:', previousScore.value);

        // Create and show notification
        scoreNotification.value = createScoreNotification(
          previousScore.value,
          scoreAfterUpload.totalScore,
          scoreAfterUpload.feedbackMessage || 'Great job tracking your expenses!'
        );
        showScoreNotification.value = true;
      } catch (error) {
        console.log('Could not fetch score after upload (non-blocking):', error);
        // Don't show notification if score fetch fails
      }
    }

  } catch (error) {
    console.error("Quick upload failed:", error);
    
    // Better error message handling
    let errorMessage = "Upload failed due to an unexpected error";
    let errorDetails: string[] = [];
    
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
      errorDetails = [error.message];
    } else if (typeof error === 'string') {
      errorMessage = error;
      errorDetails = [error];
    } else if (error && typeof error === 'object') {
      // Handle API error responses
      if ('response' in error && error.response && typeof error.response === 'object' && error.response !== null && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && error.response.data !== null && 'message' in error.response.data) {
        errorMessage = (error.response.data as any).message;
        errorDetails = [(error.response.data as any).message];
      } else if ('message' in error) {
        errorMessage = (error as any).message;
        errorDetails = [(error as any).message];
      } else {
        errorDetails = ["An unexpected error occurred during upload"];
      }
    } else {
      errorDetails = ["An unexpected error occurred during upload"];
    }
    
    uploadResult.value = {
      receipt: {} as any,
      items: [],
      success: false,
      message: errorMessage,
      isDuplicate: false,
      errors: errorDetails,
    };
  } finally {
    quickUploading.value = false;
  }
};

// Utility methods

const clearUploadResult = () => {
  uploadResult.value = null;
  clearQuickFile();
};

const clearLimitMessage = () => {
  showLimitReached.value = false;
  uploadLimitResult.value = null;
};

// Handle score notification dismiss
const handleScoreNotificationDismiss = () => {
  showScoreNotification.value = false;
  scoreNotification.value = null;
};

// Get receipt ID from completed job
const getReceiptId = (job: any) => {
  try {
    const resultData = job.status?.resultData;
    
    if (!resultData) {
      return null;
    }
    
    // Try different possible paths for the receipt ID
    const receiptId = 
      resultData.receipt_id ||        // Backend returns snake_case
      resultData.receiptId ||         // Just in case camelCase is used
      resultData.id ||
      resultData.receipt?.id ||
      resultData.receipt?.receipt_id ||
      resultData.receipt?.receiptId ||
      resultData.data?.receipt_id ||
      resultData.data?.receiptId ||
      resultData.data?.id;
    
    return receiptId ? String(receiptId) : null;
  } catch (error) {
    console.error('Failed to extract receipt ID from job:', error);
    return null;
  }
};

// Load available plugins on mount and initialize notifications
onMounted(async () => {
  try {
    const plugins = await pluginsService.getAllPlugins();
    availablePlugins.value = plugins.receiptPlugins;
  } catch (error) {
    console.error("Failed to load plugins:", error);
  }

  // Initialize the job notification system
  initializeNotifications();

  // NUCLEAR OPTION: Setup drag handlers via DOM to bypass _withMods
  // This completely avoids Vue template compilation issues
  setupDragHandlers();

  // MEGA NUCLEAR OPTION: Setup DOM event handlers with data attributes
  // This ensures ALL event handling bypasses Vue's _withMods
  setupDomEventHandlers();
});

// Cleanup event listeners on unmount
onUnmounted(() => {
  cleanupDragHandlers();
  cleanupDomEventHandlers();
});
</script>
