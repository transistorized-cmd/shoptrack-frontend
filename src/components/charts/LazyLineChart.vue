<template>
  <div class="lazy-chart-container">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center h-[200px] bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div class="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
        <div class="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
        <span class="text-sm">Loading chart...</span>
      </div>
    </div>
    
    <!-- Chart container -->
    <div v-else-if="chartComponent" class="chart-wrapper">
      <component 
        :is="chartComponent" 
        :data="data" 
        :options="options" 
        :height="height"
        v-bind="$attrs"
        @chart:render="onChartRender"
      />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="flex items-center justify-center h-[200px] bg-red-50 dark:bg-red-900/20 rounded-lg">
      <div class="text-center">
        <p class="text-sm text-red-600 dark:text-red-400">Failed to load chart</p>
        <button 
          @click="loadChart" 
          class="mt-2 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline"
        >
          Retry
        </button>
      </div>
    </div>

    <!-- Debug info -->
    <div v-else class="flex items-center justify-center h-[200px] bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
      <div class="text-center">
        <p class="text-sm text-yellow-600 dark:text-yellow-400">Chart component not initialized</p>
        <p class="text-xs text-gray-500 mt-1">Loading: {{ isLoading }}, Error: {{ error }}, Component: {{ !!chartComponent }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineEmits } from 'vue';
import type { ChartOptions } from 'chart.js';

defineProps<{
  data: any;
  options?: ChartOptions<'line'>;
  height?: number;
}>();

const emit = defineEmits<{
  'chart:render': [chart: any];
}>();

const isLoading = ref(true);
const error = ref(false);
const chartComponent = ref<any>(null);
const chartInstance = ref<any>(null);

const loadChart = async () => {
  isLoading.value = true;
  error.value = false;
  
  try {
    console.log('Loading Chart.js components...');
    
    // Try simpler import approach
    const vueChartjs = await import('vue-chartjs');
    console.log('vue-chartjs imported:', vueChartjs);
    
    const chartjsPlugin = await import('@/plugins/chartjs');
    console.log('chartjs plugin imported:', chartjsPlugin);

    console.log('Chart.js components loaded, initializing...');

    // Initialize Chart.js
    await chartjsPlugin.initializeChartJS();
    
    console.log('Chart.js initialized, setting component');
    
    // Set the chart component
    chartComponent.value = vueChartjs.Line;
    
    console.log('Chart component set successfully');
    
    isLoading.value = false;
  } catch (err: unknown) {
    console.error('Failed to load Chart.js:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const errorStack = err instanceof Error ? err.stack : undefined;
    console.error('Error details:', errorMessage, errorStack);
    error.value = true;
    isLoading.value = false;
  }
};

const onChartRender = (chart: any) => {
  chartInstance.value = chart;
  emit('chart:render', chart);
};

// Load chart on mount
onMounted(() => {
  loadChart();
});

// Cleanup on unmount
onUnmounted(() => {
  if (chartInstance.value) {
    try {
      chartInstance.value.destroy();
    } catch (e) {
      console.warn('Error destroying chart:', e);
    }
    chartInstance.value = null;
  }
});
</script>

<style scoped>
.lazy-chart-container {
  width: 100%;
}

.chart-wrapper {
  position: relative;
  width: 100%;
}
</style>