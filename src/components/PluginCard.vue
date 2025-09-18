<template>
  <div class="bg-white rounded-lg shadow-md overflow-hidden">
    <!-- Plugin Header -->
    <div
      class="p-6 border-b border-gray-200"
      :style="{
        background: `linear-gradient(135deg, ${plugin.color}15, ${plugin.color}05)`,
      }"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center mr-4"
            :style="{ backgroundColor: `${plugin.color}20` }"
          >
            <span class="text-2xl">{{ plugin.icon }}</span>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-gray-900">
              {{ plugin.name }}
            </h3>
            <p class="text-sm text-gray-600">v{{ plugin.version }}</p>
          </div>
        </div>
        <div class="text-xs text-gray-500">
          {{ plugin.supportedFileTypes.join(", ").toUpperCase() }}
        </div>
      </div>
    </div>

    <!-- Plugin Content -->
    <div class="p-6">
      <p class="text-gray-700 mb-4">{{ plugin.description }}</p>

      <!-- Plugin Features -->
      <div class="flex flex-wrap gap-2 mb-4">
        <span
          v-if="plugin.supportsManualEntry"
          class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
        >
          Manual Entry
        </span>
        <span
          v-if="plugin.supportsBatchProcessing"
          class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
        >
          Batch Processing
        </span>
        <span
          v-if="plugin.requiresImageConversion"
          class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
        >
          Image Processing
        </span>
      </div>

      <!-- Plugin Actions -->
      <div class="space-y-3">
        <!-- File Upload Form -->
        <form class="plugin-form" @submit.prevent="uploadFile">
          <div class="flex">
            <input
              ref="fileInput"
              type="file"
              :accept="
                plugin.supportedFileTypes.map((ext) => `.${ext}`).join(',')
              "
              :class="`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:text-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50`"
              :disabled="uploading"
              required
              @change="onFileChange"
            />
            <button
              type="submit"
              class="ml-3 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:bg-gray-400 disabled:cursor-not-allowed"
              :style="{ backgroundColor: plugin.color }"
              :disabled="!selectedFile || uploading"
            >
              <span v-if="uploading">Uploading...</span>
              <span v-else>Upload</span>
            </button>
          </div>
        </form>

        <!-- Manual Entry Button -->
        <button
          v-if="plugin.supportsManualEntry"
          class="block w-full text-center px-4 py-2 border-2 rounded-lg hover:bg-gray-50 transition-colors"
          :style="{
            borderColor: plugin.color,
            color: plugin.color,
          }"
          @click="$emit('manual-entry', plugin.key)"
        >
          Manual Entry
        </button>
      </div>

      <!-- Plugin Stats -->
      <div class="mt-4 pt-4 border-t border-gray-200">
        <div class="flex justify-between text-xs text-gray-500">
          <span
            >Max size: {{ formatFileSize(plugin.maxFileSizeKB * FILE_SIZE.KB) }}</span
          >
          <span>{{ plugin.supportedFileTypes.length }} file types</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { ReceiptPlugin } from "@/types/plugin";
import { FILE_SIZE } from "@/constants/app";
import { formatFileSize } from "@/utils/fileValidation";

interface Props {
  plugin: ReceiptPlugin;
}

interface Emits {
  (e: "upload", payload: { file: File; pluginKey: string }): void;
  (e: "manual-entry", pluginKey: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const selectedFile = ref<File | null>(null);
const uploading = ref(false);
const fileInput = ref<HTMLInputElement>();

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  selectedFile.value = target.files?.[0] || null;
};

const uploadFile = () => {
  if (selectedFile.value) {
    uploading.value = true;
    emit("upload", { file: selectedFile.value, pluginKey: props.plugin.key });
  }
};


// Reset uploading state when upload completes (parent should handle this)
defineExpose({
  resetUploadState: () => {
    uploading.value = false;
    selectedFile.value = null;
    if (fileInput.value) {
      fileInput.value.value = "";
    }
  },
});
</script>

<style scoped>
/* Dynamic file input styling based on plugin color */
input[type="file"] {
  --plugin-color: v-bind("plugin.color");
}

input[type="file"]::file-selector-button {
  background-color: var(--plugin-color);
  border-color: var(--plugin-color);
  color: white;
  margin-right: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 0;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

input[type="file"]::file-selector-button:hover {
  opacity: 0.9;
}
</style>
