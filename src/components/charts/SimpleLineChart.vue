<template>
  <div class="simple-chart-container">
    <div class="chart-canvas-container">
      <canvas ref="chartCanvas"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps<{
  data: any;
  options?: any;
  height?: number;
}>();

const emit = defineEmits<{
  'chart:render': [chart: any];
}>();

const chartCanvas = ref<HTMLCanvasElement>();
let chartInstance: any = null;

const createChart = async () => {
  if (!chartCanvas.value || !props.data) return;
  
  try {
    // Import Chart.js components
    const {
      Chart: ChartJS,
      CategoryScale,
      LinearScale,
      PointElement,
      LineElement,
      LineController,
      Title,
      Tooltip,
      Legend,
    } = await import('chart.js');

    // Register components
    ChartJS.register(
      CategoryScale,
      LinearScale,
      PointElement,
      LineElement,
      LineController,
      Title,
      Tooltip,
      Legend
    );

    // Destroy existing chart
    if (chartInstance) {
      chartInstance.destroy();
    }

    // Create new chart
    chartInstance = new ChartJS(chartCanvas.value, {
      type: 'line',
      data: props.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...props.options,
      },
    });

    emit('chart:render', chartInstance);
  } catch (error) {
    console.error('Failed to create chart:', error);
  }
};

// Watch for data changes
watch(() => props.data, createChart, { deep: true });

onMounted(() => {
  if (props.height) {
    if (chartCanvas.value) {
      chartCanvas.value.style.height = `${props.height}px`;
    }
  }
  createChart();
});

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy();
  }
});
</script>

<style scoped>
.simple-chart-container {
  width: 100%;
  position: relative;
}

.chart-canvas-container {
  position: relative;
  width: 100%;
  height: 200px;
}

canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>