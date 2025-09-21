<template>
  <div class="memory-monitoring-widget" :class="widgetClasses">
    <!-- Header -->
    <div class="widget-header">
      <div class="header-content">
        <div class="title-section">
          <h3 class="widget-title">
            <span class="memory-icon">🧠</span>
            Memory Monitor
          </h3>
          <div class="status-badge" :class="statusBadgeClasses">
            {{ memoryStatus }}
          </div>
        </div>
        <div class="controls">
          <button
            @click="toggleExpanded"
            class="expand-btn"
            :aria-label="isExpanded ? 'Collapse' : 'Expand'"
          >
            {{ isExpanded ? '▼' : '▶' }}
          </button>
          <button
            @click="refreshData"
            class="refresh-btn"
            :disabled="isRefreshing"
            aria-label="Refresh data"
          >
            <span class="refresh-icon" :class="{ 'spinning': isRefreshing }">⟳</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="widget-content" v-show="isExpanded">
      <!-- Memory Usage Summary -->
      <div class="memory-summary">
        <div class="metric-card">
          <div class="metric-label">Current Usage</div>
          <div class="metric-value" :class="currentMemoryClasses">
            {{ formatMemory(currentMemory) }}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Trend</div>
          <div class="metric-value" :class="trendClasses">
            {{ trendDisplay }}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Store State</div>
          <div class="metric-value">
            {{ formatMemory(totalStateSize / 1024 / 1024) }}
          </div>
        </div>
      </div>

      <!-- Memory Chart -->
      <div class="memory-chart" v-if="chartData.length > 0">
        <canvas ref="chartCanvas" width="300" height="80"></canvas>
      </div>

      <!-- Alerts Section -->
      <div class="alerts-section" v-if="criticalAlerts.length > 0">
        <h4 class="alerts-title">🚨 Critical Alerts</h4>
        <div class="alerts-list">
          <div
            v-for="alert in criticalAlerts.slice(0, 3)"
            :key="alert.id"
            class="alert-item"
            :class="alertClasses(alert)"
          >
            <div class="alert-content">
              <div class="alert-message">{{ alert.message }}</div>
              <div class="alert-time">{{ formatTime(alert.timestamp) }}</div>
            </div>
            <button
              @click="dismissAlert(alert.id)"
              class="dismiss-btn"
              aria-label="Dismiss alert"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- Memory Leaks -->
      <div class="leaks-section" v-if="activeLeaks.length > 0">
        <h4 class="leaks-title">⚠️ Memory Leaks</h4>
        <div class="leaks-list">
          <div
            v-for="leak in activeLeaks.slice(0, 2)"
            :key="leak.id"
            class="leak-item"
            :class="leakClasses(leak)"
          >
            <div class="leak-content">
              <div class="leak-description">{{ leak.description }}</div>
              <div class="leak-details">
                <span class="leak-growth">+{{ formatMemory(leak.growth) }}</span>
                <span class="leak-type">{{ leak.type }}</span>
                <span class="leak-time">{{ formatTime(leak.timestamp) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <button
          @click="performCleanup"
          class="action-btn cleanup-btn"
          :disabled="isPerformingAction"
        >
          🧹 Cleanup
        </button>
        <button
          @click="forceGarbageCollection"
          class="action-btn gc-btn"
          :disabled="isPerformingAction"
        >
          🗑️ Force GC
        </button>
        <button
          @click="optimizeStores"
          class="action-btn optimize-btn"
          :disabled="isPerformingAction"
        >
          ⚡ Optimize
        </button>
        <button
          @click="exportData"
          class="action-btn export-btn"
          :disabled="isPerformingAction"
        >
          📊 Export
        </button>
      </div>

      <!-- Component Info (if available) -->
      <div class="component-info" v-if="componentInfo && showComponentInfo">
        <h4 class="component-title">Component: {{ componentInfo.componentName }}</h4>
        <div class="component-metrics">
          <div class="component-metric">
            <span class="metric-label">Mount Memory:</span>
            <span class="metric-value">{{ formatMemory(componentInfo.mountMemory) }}</span>
          </div>
          <div class="component-metric">
            <span class="metric-label">Growth:</span>
            <span class="metric-value" :class="{ 'text-red-600': componentInfo.isLeaking }">
              {{ formatMemory(componentInfo.memoryGrowth) }}
            </span>
          </div>
          <div class="component-metric">
            <span class="metric-label">Status:</span>
            <span class="metric-value" :class="componentInfo.isLeaking ? 'text-red-600' : 'text-green-600'">
              {{ componentInfo.isLeaking ? 'Leaking' : 'Normal' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Minimize toggle for development -->
    <div class="dev-controls" v-if="isDevelopment">
      <button
        @click="toggleWidget"
        class="toggle-widget-btn"
        :aria-label="isVisible ? 'Hide widget' : 'Show widget'"
      >
        {{ isVisible ? '👁️' : '👁️‍🗨️' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useMemoryMonitoring } from '@/composables/useMemoryMonitoring';
import { useMemoryMonitoringStore } from '@/stores/memoryMonitoring.store';

interface Props {
  showComponentInfo?: boolean;
  position?: 'fixed' | 'relative';
  size?: 'compact' | 'normal' | 'large';
  autoHide?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showComponentInfo: true,
  position: 'fixed',
  size: 'normal',
  autoHide: false
});

// Store and composable
const memoryStore = useMemoryMonitoringStore();
const {
  currentMemory,
  memoryHistory,
  alerts,
  leaks,
  componentInfo,
  memoryTrend,
  memoryStatus,
  isComponentLeaking,
  analyzeMemory,
  forceGC,
  exportData: exportComponentData
} = useMemoryMonitoring({
  trackComponent: props.showComponentInfo,
  trackReactiveData: true,
  alertThreshold: 30,
  enableAutomaticCleanup: true
});

// Local state
const isExpanded = ref(true);
const isVisible = ref(true);
const isRefreshing = ref(false);
const isPerformingAction = ref(false);
const chartCanvas = ref<HTMLCanvasElement | null>(null);
const isDevelopment = ref(import.meta.env.MODE === 'development');

// Computed properties
const widgetClasses = computed(() => ({
  'widget-fixed': props.position === 'fixed',
  'widget-relative': props.position === 'relative',
  'widget-compact': props.size === 'compact',
  'widget-large': props.size === 'large',
  'widget-hidden': !isVisible.value,
  'widget-critical': memoryStatus.value === 'critical',
  'widget-warning': memoryStatus.value === 'warning'
}));

const statusBadgeClasses = computed(() => ({
  'status-normal': memoryStatus.value === 'normal',
  'status-warning': memoryStatus.value === 'warning',
  'status-critical': memoryStatus.value === 'critical'
}));

const currentMemoryClasses = computed(() => ({
  'text-green-600': memoryStatus.value === 'normal',
  'text-yellow-600': memoryStatus.value === 'warning',
  'text-red-600': memoryStatus.value === 'critical'
}));

const trendClasses = computed(() => ({
  'text-green-600': memoryTrend.value === 'decreasing' || memoryTrend.value === 'stable',
  'text-yellow-600': memoryTrend.value === 'increasing',
  'text-red-600': memoryTrend.value === 'rapidly-increasing'
}));

const trendDisplay = computed(() => {
  const icons = {
    'stable': '→',
    'increasing': '↗️',
    'rapidly-increasing': '⬆️',
    'decreasing': '↘️'
  };
  return `${icons[memoryTrend.value as keyof typeof icons] || '→'} ${memoryTrend.value}`;
});

const criticalAlerts = computed(() => memoryStore.criticalAlerts);
const activeLeaks = computed(() => memoryStore.activeLeaks);
const totalStateSize = computed(() => memoryStore.totalStateSize);

const chartData = computed(() => {
  return memoryHistory.value.slice(-20).map(snapshot => ({
    timestamp: snapshot.timestamp,
    memory: snapshot.heapUsed / 1024 / 1024 // Convert to MB
  }));
});

// Methods
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

const toggleWidget = () => {
  isVisible.value = !isVisible.value;
};

const refreshData = async () => {
  if (isRefreshing.value) return;

  isRefreshing.value = true;
  try {
    memoryStore.updateMemoryMetrics();
    analyzeMemory();
    await nextTick();
    drawChart();
  } catch (error) {
    console.error('Failed to refresh memory data:', error);
  } finally {
    setTimeout(() => {
      isRefreshing.value = false;
    }, 500);
  }
};

const performCleanup = async () => {
  if (isPerformingAction.value) return;

  isPerformingAction.value = true;
  try {
    memoryStore.optimizeStores();
    forceGC();
    setTimeout(() => refreshData(), 1000);
  } catch (error) {
    console.error('Cleanup failed:', error);
  } finally {
    setTimeout(() => {
      isPerformingAction.value = false;
    }, 1500);
  }
};

const forceGarbageCollection = async () => {
  if (isPerformingAction.value) return;

  isPerformingAction.value = true;
  try {
    const success = forceGC();
    if (success) {
      setTimeout(() => refreshData(), 500);
    }
  } catch (error) {
    console.error('Force GC failed:', error);
  } finally {
    setTimeout(() => {
      isPerformingAction.value = false;
    }, 1000);
  }
};

const optimizeStores = async () => {
  if (isPerformingAction.value) return;

  isPerformingAction.value = true;
  try {
    memoryStore.optimizeStores();
    setTimeout(() => refreshData(), 1000);
  } catch (error) {
    console.error('Store optimization failed:', error);
  } finally {
    setTimeout(() => {
      isPerformingAction.value = false;
    }, 1500);
  }
};

const exportData = () => {
  if (isPerformingAction.value) return;

  try {
    const storeData = memoryStore.exportMonitoringData();
    const componentData = exportComponentData();

    const exportData = {
      timestamp: Date.now(),
      storeData,
      componentData
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memory-monitoring-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
  }
};

const dismissAlert = (alertId: string) => {
  // Remove alert from local list (in real implementation, might call store action)
  const index = alerts.value.findIndex(alert => alert.id === alertId);
  if (index > -1) {
    alerts.value.splice(index, 1);
  }
};

const alertClasses = (alert: any) => ({
  'alert-critical': alert.type === 'critical',
  'alert-warning': alert.type === 'warning',
  'alert-info': alert.type !== 'critical' && alert.type !== 'warning'
});

const leakClasses = (leak: any) => ({
  'leak-critical': leak.severity === 'critical',
  'leak-high': leak.severity === 'high',
  'leak-medium': leak.severity === 'medium',
  'leak-low': leak.severity === 'low'
});

const formatMemory = (megabytes: number): string => {
  if (megabytes < 1) {
    return `${(megabytes * 1024).toFixed(0)}KB`;
  }
  return `${megabytes.toFixed(1)}MB`;
};

const formatTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

const drawChart = () => {
  if (!chartCanvas.value || chartData.value.length < 2) return;

  const canvas = chartCanvas.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const data = chartData.value;
  const maxMemory = Math.max(...data.map(d => d.memory));
  const minMemory = Math.min(...data.map(d => d.memory));
  const range = maxMemory - minMemory || 1;

  const width = canvas.width;
  const height = canvas.height;
  const padding = 10;

  // Draw background
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, width, height);

  // Draw grid lines
  ctx.strokeStyle = '#e9ecef';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const y = (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Draw memory line
  ctx.strokeStyle = memoryStatus.value === 'critical' ? '#dc3545' :
                   memoryStatus.value === 'warning' ? '#ffc107' : '#28a745';
  ctx.lineWidth = 2;
  ctx.beginPath();

  data.forEach((point, index) => {
    const x = padding + ((width - 2 * padding) * index) / (data.length - 1);
    const y = height - padding - ((point.memory - minMemory) / range) * (height - 2 * padding);

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Draw current point
  const lastPoint = data[data.length - 1];
  const lastX = width - padding;
  const lastY = height - padding - ((lastPoint.memory - minMemory) / range) * (height - 2 * padding);

  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 3, 0, 2 * Math.PI);
  ctx.fill();
};

// Auto-hide logic
watch(
  () => memoryStatus.value,
  (newStatus) => {
    if (props.autoHide) {
      if (newStatus === 'critical' || newStatus === 'warning') {
        isVisible.value = true;
        isExpanded.value = true;
      } else if (newStatus === 'normal') {
        setTimeout(() => {
          if (memoryStatus.value === 'normal') {
            isExpanded.value = false;
          }
        }, 5000);
      }
    }
  }
);

// Initialize and cleanup
onMounted(async () => {
  await nextTick();
  refreshData();

  // Auto-refresh every 30 seconds
  const interval = setInterval(refreshData, 30000);

  onUnmounted(() => {
    clearInterval(interval);
  });
});

// Watch for chart data changes
watch(chartData, () => {
  nextTick(() => drawChart());
}, { deep: true });
</script>

<style scoped>
.memory-monitoring-widget {
  @apply bg-white border border-gray-200 rounded-lg shadow-lg;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 12px;
  min-width: 280px;
  max-width: 400px;
  transition: all 0.3s ease;
}

.widget-fixed {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.widget-relative {
  position: relative;
}

.widget-compact {
  min-width: 220px;
  font-size: 11px;
}

.widget-large {
  min-width: 340px;
  max-width: 500px;
  font-size: 13px;
}

.widget-hidden {
  transform: translateX(100%);
  opacity: 0;
}

.widget-critical {
  @apply border-red-500 bg-red-50;
}

.widget-warning {
  @apply border-yellow-500 bg-yellow-50;
}

.widget-header {
  @apply p-3 border-b border-gray-200;
}

.header-content {
  @apply flex items-center justify-between;
}

.title-section {
  @apply flex items-center gap-2;
}

.widget-title {
  @apply text-sm font-semibold text-gray-800 flex items-center gap-1;
}

.memory-icon {
  font-size: 16px;
}

.status-badge {
  @apply px-2 py-1 rounded-full text-xs font-medium;
}

.status-normal {
  @apply bg-green-100 text-green-800;
}

.status-warning {
  @apply bg-yellow-100 text-yellow-800;
}

.status-critical {
  @apply bg-red-100 text-red-800;
}

.controls {
  @apply flex items-center gap-1;
}

.expand-btn,
.refresh-btn {
  @apply p-1 rounded hover:bg-gray-100 transition-colors;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
}

.refresh-btn:disabled {
  @apply opacity-50 cursor-not-allowed;
}

.refresh-icon {
  display: inline-block;
  transition: transform 0.5s ease;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.widget-content {
  @apply p-3 space-y-3;
}

.memory-summary {
  @apply grid grid-cols-3 gap-2;
}

.metric-card {
  @apply text-center p-2 bg-gray-50 rounded;
}

.metric-label {
  @apply text-xs text-gray-600 mb-1;
}

.metric-value {
  @apply text-sm font-semibold;
}

.memory-chart {
  @apply bg-gray-50 rounded p-2;
}

.alerts-section,
.leaks-section {
  @apply space-y-2;
}

.alerts-title,
.leaks-title {
  @apply text-sm font-semibold text-gray-800;
}

.alerts-list,
.leaks-list {
  @apply space-y-1;
}

.alert-item,
.leak-item {
  @apply flex items-center justify-between p-2 rounded border-l-4;
}

.alert-critical {
  @apply bg-red-50 border-red-500;
}

.alert-warning {
  @apply bg-yellow-50 border-yellow-500;
}

.alert-info {
  @apply bg-blue-50 border-blue-500;
}

.leak-critical {
  @apply bg-red-50 border-red-500;
}

.leak-high {
  @apply bg-orange-50 border-orange-500;
}

.leak-medium {
  @apply bg-yellow-50 border-yellow-500;
}

.leak-low {
  @apply bg-blue-50 border-blue-500;
}

.alert-content,
.leak-content {
  @apply flex-1;
}

.alert-message,
.leak-description {
  @apply text-xs font-medium text-gray-800;
}

.alert-time,
.leak-details {
  @apply text-xs text-gray-600 mt-1;
}

.leak-details {
  @apply flex gap-2;
}

.leak-growth {
  @apply font-semibold text-red-600;
}

.leak-type {
  @apply px-1 bg-gray-200 rounded text-xs;
}

.dismiss-btn {
  @apply w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
}

.quick-actions {
  @apply grid grid-cols-2 gap-2;
}

.action-btn {
  @apply px-2 py-1 rounded text-xs font-medium transition-colors;
  border: none;
  cursor: pointer;
}

.action-btn:disabled {
  @apply opacity-50 cursor-not-allowed;
}

.cleanup-btn {
  @apply bg-blue-100 text-blue-800 hover:bg-blue-200;
}

.gc-btn {
  @apply bg-green-100 text-green-800 hover:bg-green-200;
}

.optimize-btn {
  @apply bg-purple-100 text-purple-800 hover:bg-purple-200;
}

.export-btn {
  @apply bg-gray-100 text-gray-800 hover:bg-gray-200;
}

.component-info {
  @apply bg-gray-50 rounded p-2 space-y-1;
}

.component-title {
  @apply text-xs font-semibold text-gray-800;
}

.component-metrics {
  @apply space-y-1;
}

.component-metric {
  @apply flex justify-between text-xs;
}

.dev-controls {
  position: absolute;
  top: -40px;
  right: 0;
}

.toggle-widget-btn {
  @apply p-2 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
}
</style>