<template>
  <div class="max-w-6xl mx-auto py-8 px-4">
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

    <!-- Quick Upload Component -->
    <QuickUpload v-if="!globalReceiptLimitReached" />

    <!-- Plugin Selection Grid -->
    <div
      v-if="availablePlugins.length > 0 && !globalReceiptLimitReached"
      class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
    >
      <div
        v-for="plugin in availablePlugins"
        :key="plugin.key"
        class="card p-6"
      >
        <!-- Plugin Header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center">
            <div
              class="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl"
              :style="{ backgroundColor: plugin.color }"
            >
              {{ plugin.icon }}
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                {{ getPluginTranslation(plugin.key, 'name') }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ getPluginTranslation(plugin.key, 'description') }}</p>
            </div>
          </div>

          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          >
            v{{ plugin.version }}
          </span>
        </div>

        <!-- Plugin Details -->
        <div class="mb-6 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div class="flex items-center">
            <span class="w-4 h-4 mr-2">📁</span>
            <span>{{ $t('upload.supports') }}: {{ plugin.supportedFileTypes.join(", ").toUpperCase() }}</span>
          </div>
          <div v-if="plugin.supportsManualEntry" class="flex items-center">
            <span class="w-4 h-4 mr-2">✍️</span>
            <span>{{ getPluginTranslation(plugin.key, 'capabilities.manualEntryAvailable') }}</span>
          </div>
          <div v-if="plugin.supportsBatchProcessing" class="flex items-center">
            <span class="w-4 h-4 mr-2">📦</span>
            <span>{{ getPluginTranslation(plugin.key, 'capabilities.batchProcessingSupported') }}</span>
          </div>
          <div v-if="plugin.requiresImageConversion" class="flex items-center">
            <span class="w-4 h-4 mr-2">🖼️</span>
            <span>{{ getPluginTranslation(plugin.key, 'capabilities.aiImageProcessing') }}</span>
          </div>
          <div class="flex items-center">
            <span class="w-4 h-4 mr-2">📏</span>
            <span>{{ getPluginTranslation(plugin.key, 'capabilities.maxSize') }}: {{ formatFileSize(plugin.maxFileSizeKB * 1024) }}</span>
          </div>
        </div>

        <!-- Plugin Actions -->
        <div class="space-y-3">
          <!-- File Upload Form -->
          <form
            class="plugin-form"
            @submit.prevent="
              handlePluginUpload({
                file: pluginFiles[plugin.key],
                pluginKey: plugin.key,
              })
            "
          >
            <div class="flex">
              <input
                type="file"
                :accept="
                  plugin.supportedFileTypes.map((ext) => `.${ext}`).join(',')
                "
                class="input text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-shoptrack-600 file:text-white hover:file:bg-shoptrack-700"
                required
                @change="(e) => handlePluginFileChange(e, plugin.key)"
              />
              <button
                type="submit"
                class="ml-3 btn btn-primary"
                :disabled="
                  !pluginFiles[plugin.key] || pluginUploading[plugin.key]
                "
              >
                <span v-if="pluginUploading[plugin.key]">{{ getPluginTranslation(plugin.key, 'actions.uploading') }}</span>
                <span v-else>{{ getPluginTranslation(plugin.key, 'actions.upload') }}</span>
              </button>
            </div>

            <!-- Validation Errors -->
            <div
              v-if="
                showValidationErrors[plugin.key] &&
                fileValidationResults[plugin.key] &&
                !fileValidationResults[plugin.key].isValid
              "
              class="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <div class="flex items-start">
                <svg
                  class="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div class="text-sm">
                  <p class="text-red-800 font-medium">
                    {{ getPluginTranslation(plugin.key, 'validation.fileValidationFailed') }}
                  </p>
                  <ul v-if="fileValidationResults[plugin.key].errors && fileValidationResults[plugin.key].errors.length > 0" class="mt-1 text-red-700 space-y-1">
                    <li
                      v-for="error in fileValidationResults[plugin.key].errors"
                      :key="error"
                    >
                      • {{ error }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Validation Warnings -->
            <div
              v-if="
                showValidationErrors[plugin.key] &&
                fileValidationResults[plugin.key] &&
                fileValidationResults[plugin.key].warnings &&
                fileValidationResults[plugin.key].warnings.length > 0
              "
              class="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              <div class="flex items-start">
                <svg
                  class="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.19 2.5 1.732 2.5z"
                  />
                </svg>
                <div class="text-sm">
                  <p class="text-yellow-800 font-medium">
                    {{ getPluginTranslation(plugin.key, 'validation.fileWarnings') }}:
                  </p>
                  <ul v-if="fileValidationResults[plugin.key].warnings && fileValidationResults[plugin.key].warnings.length > 0" class="mt-1 text-yellow-700 space-y-1">
                    <li
                      v-for="warning in fileValidationResults[plugin.key].warnings"
                      :key="warning"
                    >
                      • {{ warning }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Upload Limit Reached -->
            <div
              v-if="showLimitReached[plugin.key] && uploadLimitResults[plugin.key] && !uploadLimitResults[plugin.key].canUse"
              class="mt-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg"
            >
              <div class="flex items-start">
                <svg
                  class="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clip-rule="evenodd"
                  />
                </svg>
                <div class="text-sm flex-1">
                  <p class="text-orange-900 dark:text-orange-200 font-medium">
                    {{ uploadLimitResults[plugin.key].message?.title || $t('upload.limitReached.title', 'Upload Limit Reached') }}
                  </p>
                  <p class="text-orange-800 dark:text-orange-300 mt-1 mb-2">
                    {{ uploadLimitResults[plugin.key].message?.message || $t('upload.limitReached.message', 'You have reached your monthly upload limit.') }}
                  </p>
                  <div class="text-xs text-orange-700 dark:text-orange-400 mb-2">
                    {{ $t('upload.limitReached.usage', 'Usage: {usage} of {limit}', {
                      usage: uploadLimitResults[plugin.key].usage,
                      limit: uploadLimitResults[plugin.key].limit || 0
                    }) }}
                  </div>
                  <div class="flex items-center space-x-2">
                    <button
                      v-if="uploadLimitResults[plugin.key].message?.actionUrl"
                      @click="openActionUrl(uploadLimitResults[plugin.key].message.actionUrl)"
                      class="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-orange-700 bg-orange-100 hover:bg-orange-200 dark:bg-orange-800 dark:text-orange-200 dark:hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      {{ uploadLimitResults[plugin.key].message.actionText || $t('upload.limitReached.upgrade', 'Upgrade Plan') }}
                    </button>
                    <button
                      @click="clearPluginLimitMessage(plugin.key)"
                      class="text-xs text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300"
                    >
                      {{ $t('upload.limitReached.dismiss', 'Dismiss') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>

          <!-- Manual Entry Button -->
          <button
            v-if="plugin.supportsManualEntry"
            class="block w-full btn btn-secondary"
            @click="handleManualEntry(plugin.key)"
          >
            📝 {{ getPluginTranslation(plugin.key, 'actions.manualEntry') }}
          </button>
        </div>
      </div>
    </div>

    <!-- File Type Reference -->
    <div v-if="availablePlugins.length > 0 && !globalReceiptLimitReached" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">
        {{ $t('upload.supportedFileTypes') }}
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="(plugins, fileType) in fileTypeMap"
          :key="fileType"
          class="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded border dark:border-gray-600"
        >
          <span class="font-mono text-sm uppercase font-medium">{{
            fileType
          }}</span>
          <div class="flex space-x-1">
            <div
              v-for="plugin in plugins"
              :key="plugin.key"
              class="w-3 h-3 rounded-full plugin-dot"
              :style="{ '--plugin-color': plugin.color }"
              :title="plugin.name"
            ></div>
          </div>
        </div>
      </div>
      <p class="text-xs text-gray-500 mt-3">
        {{ $t('upload.eachColoredDot') }}
      </p>
    </div>

    <!-- Upload Result -->
    <div v-if="uploadResult" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-8">
      <h3 class="text-lg font-medium text-gray-900 mb-4">
        {{ $t('upload.uploadResult') }}
      </h3>

      <div class="space-y-4">
        <!-- Success/Error Status -->
        <div
          v-if="uploadResult.success"
          class="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg"
        >
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div v-if="'itemsDetected' in uploadResult.receipt">
              <span class="text-gray-500">{{ $t('upload.itemsDetected') }}:</span>
              <span class="ml-1 text-gray-900">{{
                uploadResult.receipt.itemsDetected
              }}</span>
            </div>
            <div v-if="'confidence' in uploadResult.receipt">
              <span class="text-gray-500">{{ $t('upload.confidence') }}:</span>
              <span class="ml-1 text-gray-900">{{
                uploadResult.receipt.confidence
              }}%</span>
            </div>
            <div>
              <span class="text-gray-500">Successfully Parsed:</span>
              <span class="ml-1 text-gray-900">{{
                uploadResult.receipt.successfullyParsed
              }}</span>
            </div>
            <div>
              <span class="text-gray-500">Status:</span>
              <span class="ml-1 text-gray-900 capitalize">{{
                uploadResult.receipt.processingStatus
              }}</span>
            </div>
          </div>
        </div>

        <div v-if="uploadResult.errors.length > 0">
          <h4 class="text-sm font-medium text-red-900 mb-2">Errors:</h4>
          <ul class="list-disc list-inside space-y-1 text-sm text-red-800">
            <li v-for="error in uploadResult.errors" :key="error">
              {{ error }}
            </li>
          </ul>
        </div>

        <div class="flex justify-end space-x-3">
          <button
            class="btn btn-secondary"
            @click="clearUploadResult"
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
import { usePluginsStore } from "@/stores/plugins";
import { useReceiptsStore } from "@/stores/receipts";
import { featureService, type FeatureLimitCheckResult, type FeatureMessage } from "@/services/featureService";
import QuickUpload from "@/components/QuickUpload.vue";
import SubscriptionModal from "@/components/SubscriptionModal.vue";
import type { ProcessingResult, ReceiptPlugin } from "@/types/plugin";
import { FILE_SIZE } from "@/constants/app";
import {
  validateFile,
  formatFileSize,
  type FileValidationResult,
} from "@/utils/fileValidation";
import { getPluginTranslations, hasPluginTranslations } from "@/i18n/plugins";
import { getCurrentLocale } from "@/i18n";

const router = useRouter();
const { t, locale } = useTranslation();
const pluginsStore = usePluginsStore();
const receiptsStore = useReceiptsStore();

// Demo plugins - will be replaced with real plugin system
const availablePlugins = ref<ReceiptPlugin[]>([
  {
    key: "generic-receipt",
    name: "Generic Receipt",
    description: "Process any type of receipt or invoice using AI",
    version: "1.2.0",
    icon: "🧾",
    color: "#3B82F6",
    supportedFileTypes: ["pdf", "jpg", "jpeg", "png"],
    supportsManualEntry: false,
    supportsBatchProcessing: false,
    requiresImageConversion: true,
    maxFileSizeKB: 10 * 1024, // 10MB
  },
  {
    key: "amazon-orders",
    name: "Amazon Orders",
    description: "Import your Amazon purchase history directly",
    version: "1.2.0",
    icon: "📦",
    color: "#FF9500",
    supportedFileTypes: ["csv", "json", "xlsx"],
    supportsManualEntry: true,
    supportsBatchProcessing: true,
    requiresImageConversion: false,
    maxFileSizeKB: 5 * 1024, // 5MB
  },
]);

// Plugin file state
const pluginFiles = ref<Record<string, File>>({});
const pluginUploading = ref<Record<string, boolean>>({});
const fileValidationResults = ref<Record<string, FileValidationResult>>({});
const showValidationErrors = ref<Record<string, boolean>>({});
const uploadLimitResults = ref<Record<string, FeatureLimitCheckResult>>({});
const showLimitReached = ref<Record<string, boolean>>({});

// General state
const uploadResult = ref<ProcessingResult | null>(null);

// Global receipt limit state
const globalReceiptLimitReached = ref(false);
const globalUpgradeMessage = ref<FeatureMessage | null>(null);
const checkingGlobalLimit = ref(false);
const showSubscriptionModal = ref(false);


// Computed properties
const fileTypeMap = computed(() => {
  const map: Record<string, ReceiptPlugin[]> = {};
  availablePlugins.value.forEach((plugin) => {
    plugin.supportedFileTypes.forEach((fileType) => {
      if (!map[fileType]) {
        map[fileType] = [];
      }
      map[fileType].push(plugin);
    });
  });
  return map;
});

// Plugin file handling
function handlePluginFileChange(event: Event, pluginKey: string) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    pluginFiles.value[pluginKey] = file;

    // Clear previous validation errors
    showValidationErrors.value[pluginKey] = false;

    // Find plugin for validation
    const plugin = availablePlugins.value.find((p) => p.key === pluginKey);
    if (plugin) {
      const validationResult = validateFile(file, plugin);
      fileValidationResults.value[pluginKey] = validationResult;

      // Show validation errors/warnings if any
      if (!validationResult.isValid || validationResult.warnings.length > 0) {
        showValidationErrors.value[pluginKey] = true;
      }
    }
  }
}

// Check upload limit for plugin
async function checkPluginUploadLimit(pluginKey: string): Promise<boolean> {
  try {
    const limitCheck = await featureService.checkReceiptUploadLimit();
    uploadLimitResults.value[pluginKey] = limitCheck;

    if (!limitCheck.canUse) {
      showLimitReached.value[pluginKey] = true;
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to check upload limit for plugin:', pluginKey, error);
    // Allow upload on error to not block users
    return true;
  }
}

// Clear limit message for plugin
function clearPluginLimitMessage(pluginKey: string) {
  showLimitReached.value[pluginKey] = false;
  uploadLimitResults.value[pluginKey] = {} as FeatureLimitCheckResult;
}

// Plugin upload handling
async function handlePluginUpload({
  file,
  pluginKey,
}: {
  file: File;
  pluginKey: string;
}) {
  if (!file) return;

  const plugin = availablePlugins.value.find((p) => p.key === pluginKey);
  if (!plugin) return;

  // Final validation check
  const validationResult = validateFile(file, plugin);
  fileValidationResults.value[pluginKey] = validationResult;

  if (!validationResult.isValid) {
    showValidationErrors.value[pluginKey] = true;
    return;
  }

  // Check upload limits before processing
  const canUpload = await checkPluginUploadLimit(pluginKey);
  if (!canUpload) {
    return;
  }

  pluginUploading.value[pluginKey] = true;

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("plugin", pluginKey);

    // Mock upload result for demo
    await new Promise((resolve) => setTimeout(resolve, 2000));

    uploadResult.value = {
      success: true,
      receipt: {
        id: Math.random().toString(36).substr(2, 9),
        fileName: file.name,
        originalFileName: file.name,
        filePath: `/uploads/${file.name}`,
        itemsDetected: Math.floor(Math.random() * 10) + 1,
        confidence: Math.floor(Math.random() * 30) + 70,
        successfullyParsed: Math.floor(Math.random() * 5) + 1,
        processingStatus: "completed",
        pluginUsed: pluginKey,
        uploadedAt: (() => {
          try {
            return new Date().toISOString();
          } catch (error) {
            console.warn('Error creating timestamp:', error);
            return Date.now().toString();
          }
        })(),
        processingTime: Math.floor(Math.random() * 5000) + 1000,
      },
      errors: [],
      warnings: [],
    };

    // Clear the form
    pluginFiles.value[pluginKey] = null as any;

    // Safely clear file input
    try {
      if (typeof document !== 'undefined' && document.querySelector) {
        const fileInput = document.querySelector(
          `input[type="file"][data-plugin="${pluginKey}"]`
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      }
    } catch (error) {
      console.warn('Could not clear file input:', error);
    }
  } catch (error) {
    console.error("Upload failed:", error);
    uploadResult.value = {
      success: false,
      receipt: null as any,
      errors: ["Upload failed. Please try again."],
      warnings: [],
    };
  } finally {
    pluginUploading.value[pluginKey] = false;
  }
}

// Manual entry handling
function handleManualEntry(pluginKey: string) {
  router.push(`/manual-entry/${pluginKey}`);
}

// Clear upload result
function clearUploadResult() {
  uploadResult.value = null;
}

// Global receipt limit functions
const fetchGlobalUpgradeMessage = async () => {
  try {
    globalUpgradeMessage.value = await featureService.getFeatureMessage(
      'receipt_monthly_limit',
      'upgrade_prompt',
      locale.value // Pass current locale to get localized message
    );
  } catch (error) {
    console.error("Failed to get global upgrade message:", error);
    globalUpgradeMessage.value = null;
  }
};

const checkGlobalReceiptLimit = async () => {
  if (checkingGlobalLimit.value) return;

  checkingGlobalLimit.value = true;
  try {
    const limitResult = await featureService.checkReceiptUploadLimit();

    // Show upgrade prompt if limit is reached or exceeded
    globalReceiptLimitReached.value = limitResult.isLimitReached;

    if (limitResult.isLimitReached) {
      await fetchGlobalUpgradeMessage();
    } else {
      globalUpgradeMessage.value = null;
    }
  } catch (error) {
    console.error("Failed to check global receipt limit:", error);
  } finally {
    checkingGlobalLimit.value = false;
  }
};

const openSubscriptionModal = () => {
  showSubscriptionModal.value = true;
};

const closeSubscriptionModal = () => {
  showSubscriptionModal.value = false;
};

const handleSubscribed = () => {
  showSubscriptionModal.value = false;
  // Re-check limits after subscription
  checkGlobalReceiptLimit();
};

// Safe window.open wrapper
const openActionUrl = (url: string) => {
  try {
    if (typeof window !== 'undefined' && window.open) {
      window.open(url, '_blank');
    } else {
      // Fallback: try to navigate in same window
      window.location.href = url;
    }
  } catch (error) {
    console.warn('Could not open action URL:', error);
    // Final fallback: copy URL to console for user
    console.log('Please visit:', url);
  }
};

// Plugin translation helper
function getPluginTranslation(pluginKey: string, translationKey: string): string {
  if (!hasPluginTranslations(pluginKey)) {
    // Fallback for plugins without translations
    return translationKey.split('.').pop() || translationKey;
  }
  
  const pluginTranslations = getPluginTranslations(pluginKey as any, getCurrentLocale());
  const keys = translationKey.split('.');
  let value: any = pluginTranslations;
  
  for (const key of keys) {
    value = value?.[key];
  }
  
  return value || translationKey.split('.').pop() || translationKey;
}

// Watch for locale changes and refetch upgrade message if limit is reached
watch(locale, async (newLocale) => {
  if (globalReceiptLimitReached.value) {
    await fetchGlobalUpgradeMessage();
  }
});

// Load plugins on mount
onMounted(async () => {
  try {
    // Fetch plugins from the store
    await pluginsStore.fetchAllPlugins();
    // Use backend plugins if available, otherwise keep demo plugins
    if (pluginsStore.availableReceiptPlugins.length > 0) {
      availablePlugins.value = pluginsStore.availableReceiptPlugins;
    }

    // Check global receipt limits
    await checkGlobalReceiptLimit();
  } catch (error) {
    console.error("Failed to load plugins, using demo data:", error);
  }
});

// Expose for testing
defineExpose({
  availablePlugins,
  pluginFiles,
  pluginUploading,
  fileValidationResults,
  showValidationErrors,
  uploadResult,
  handlePluginUpload,
  handlePluginFileChange,
  handleManualEntry,
  clearUploadResult,
});
</script>

<style scoped>
/* Plugin cards now use consistent design matching Reports view */
.plugin-dot {
  background-color: var(--plugin-color);
}
</style>