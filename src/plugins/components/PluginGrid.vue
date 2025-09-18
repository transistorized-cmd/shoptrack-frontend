<template>
  <!-- Plugin Selection Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
    <BasePlugin
      v-for="pluginConfig in plugins"
      :key="pluginConfig.plugin.id"
      :plugin="pluginConfig.plugin"
    />
  </div>

  <!-- File Type Reference -->
  <div class="bg-gray-50 rounded-lg p-6">
    <h3 class="text-lg font-semibold text-gray-800 mb-4">
      Supported File Types
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="(pluginConfigs, fileType) in fileTypeMap"
        :key="fileType"
        class="flex items-center justify-between p-3 bg-white rounded border"
      >
        <span class="font-mono text-sm uppercase font-medium">{{
          fileType
        }}</span>
        <div class="flex space-x-1">
          <div
            v-for="config in pluginConfigs"
            :key="config.plugin.id"
            class="w-3 h-3 rounded-full"
            :style="{ backgroundColor: config.plugin.color }"
            :title="config.plugin.name"
          />
        </div>
      </div>
    </div>
    <p class="text-xs text-gray-500 mt-3">
      Each colored dot represents a plugin that can process that file type.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import BasePlugin from "./BasePlugin.vue";
import { usePluginRegistry } from "../../composables/usePluginRegistry";

// Use the DI-based plugin registry
const { plugins, getFileTypePluginMap } = usePluginRegistry();

const fileTypeMap = computed(() => {
  return getFileTypePluginMap();
});
</script>
