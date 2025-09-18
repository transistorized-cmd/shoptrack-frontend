<template>
  <div class="bg-white rounded-lg shadow-md overflow-hidden">
    <!-- Plugin Header -->
    <div
      class="p-6 border-b border-gray-200"
      :style="{
        background: `linear-gradient(135deg, ${plugin.gradientFrom}, ${plugin.gradientTo})`,
      }"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center mr-4"
            :style="{ backgroundColor: plugin.color + '20' }"
          >
            <span class="text-2xl">{{ plugin.icon }}</span>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-gray-900">
              {{ plugin.name }}
            </h3>
            <p class="text-sm text-gray-600">{{ plugin.version }}</p>
          </div>
        </div>
        <div class="text-xs text-gray-500">
          {{ plugin.fileTypes.map((type) => type.toUpperCase()).join(", ") }}
        </div>
      </div>
    </div>

    <!-- Plugin Content -->
    <div class="p-6">
      <p class="text-gray-700 mb-4">{{ plugin.description }}</p>

      <!-- Plugin Features -->
      <div class="flex flex-wrap gap-2 mb-4">
        <span
          v-for="feature in plugin.features"
          :key="feature"
          class="px-2 py-1 text-xs rounded-full"
          :class="getFeatureClass(feature)"
        >
          {{ feature }}
        </span>
      </div>

      <!-- Plugin Actions -->
      <div class="space-y-3">
        <!-- File Upload Form -->
        <form
          method="POST"
          :action="plugin.uploadEndpoint"
          enctype="multipart/form-data"
          class="plugin-form"
          @submit.prevent="handleFormSubmit"
        >
          <input
            type="hidden"
            name="_token"
            :value="csrfToken"
            autocomplete="off"
          />
          <div class="flex">
            <input
              type="file"
              name="file"
              :accept="acceptedFiles"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:text-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
              :class="fileInputClass"
              required
              @change="enableSubmit($event.target as HTMLInputElement)"
            />
            <button
              type="submit"
              class="ml-3 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:bg-gray-400 disabled:cursor-not-allowed"
              :style="{ backgroundColor: plugin.color }"
              disabled
            >
              Upload
            </button>
          </div>
        </form>

        <!-- Manual Entry Button -->
        <a
          v-if="plugin.hasManualEntry && plugin.manualEntryRoute"
          :href="plugin.manualEntryRoute"
          class="block w-full text-center px-4 py-2 border-2 rounded-lg hover:bg-gray-50 transition-colors"
          :style="{ borderColor: plugin.color, color: plugin.color }"
        >
          Manual Entry
        </a>
      </div>

      <!-- Plugin Stats -->
      <div class="mt-4 pt-4 border-t border-gray-200">
        <div class="flex justify-between text-xs text-gray-500">
          <span>Max size: {{ formatFileSize(plugin.maxFileSize) }}</span>
          <span>{{ plugin.fileTypes.length }} file types</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import type { IPlugin } from "../types/IPlugin";
import { FILE_SIZE } from "@/constants/app";
import { useCsrfToken } from "@/composables/useCsrfToken";
import api from "@/services/api";
import { formatFileSize } from "@/utils/fileValidation";

interface Props {
  plugin: IPlugin;
}

const props = defineProps<Props>();

// CSRF token management
const { getCsrfTokenSync } = useCsrfToken();
const csrfToken = ref("");

// Initialize CSRF token
onMounted(() => {
  csrfToken.value = getCsrfTokenSync();
});

const acceptedFiles = computed(() => {
  return props.plugin.fileTypes.map((type) => `.${type}`).join(",");
});

const fileInputClass = computed(() => {
  // Convert hex color to Tailwind-compatible classes
  if (props.plugin.color === "#10b981") {
    return "file:bg-emerald-500 file:border-emerald-500";
  } else if (props.plugin.color === "#ff9900") {
    return "file:bg-orange-500 file:border-orange-500";
  }
  return `file:bg-[${props.plugin.color}] file:border-[${props.plugin.color}]`;
});

function getFeatureClass(feature: string): string {
  const featureClasses: Record<string, string> = {
    "Image Processing": "bg-purple-100 text-purple-800",
    "Manual Entry": "bg-green-100 text-green-800",
    "Batch Processing": "bg-blue-100 text-blue-800",
    OCR: "bg-yellow-100 text-yellow-800",
    "AI Analysis": "bg-pink-100 text-pink-800",
  };

  return featureClasses[feature] || "bg-gray-100 text-gray-800";
}


function enableSubmit(input: HTMLInputElement) {
  const form = input.closest(".plugin-form");
  const button = form?.querySelector(
    'button[type="submit"]',
  ) as HTMLButtonElement;
  if (button) {
    button.disabled = !input.files?.length;
  }
}

// Handle form submission with dynamic CSRF token
async function handleFormSubmit(event: Event) {
  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);
  const fileInput = form.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;

  if (!fileInput.files?.length) {
    console.error("No file selected");
    return;
  }

  try {
    // The CSRF token will be automatically added by the API interceptor
    const response = await api.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    console.log("Upload successful:", response.data);

    // Reset form after successful upload
    form.reset();
    const submitButton = form.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    if (submitButton) {
      submitButton.disabled = true;
    }
  } catch (error) {
    console.error("Upload failed:", error);
    // You might want to show a user-friendly error message here
  }
}
</script>
