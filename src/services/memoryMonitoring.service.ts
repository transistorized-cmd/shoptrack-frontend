/**
 * Production Memory Monitoring Service
 *
 * Provides real-time memory leak detection and monitoring for the ShopTrack application.
 * This service monitors memory usage patterns, detects potential leaks, and reports
 * critical memory issues in production environments.
 */

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss?: number; // Only available in Node.js
}

export interface MemoryLeak {
  id: string;
  type: 'component' | 'store' | 'general' | 'dom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  growth: number; // MB
  duration: number; // seconds
  stackTrace?: string;
  component?: string;
  store?: string;
  timestamp: number;
}

export interface MemoryThresholds {
  warningThreshold: number; // MB
  criticalThreshold: number; // MB
  leakDetectionWindow: number; // minutes
  minimumGrowthRate: number; // MB per minute
  maxSnapshots: number;
}

export interface MemoryAlert {
  id: string;
  type: 'warning' | 'critical' | 'leak_detected';
  message: string;
  memoryUsage: number;
  timestamp: number;
  recommendations: string[];
}

class MemoryMonitoringService {
  private snapshots: MemorySnapshot[] = [];
  private leaks: MemoryLeak[] = [];
  private alerts: MemoryAlert[] = [];
  private monitoringInterval: number | null = null;
  private isMonitoring = false;
  private observerInstances = new Map<string, PerformanceObserver>();

  private readonly defaultThresholds: MemoryThresholds = {
    warningThreshold: 100, // 100MB
    criticalThreshold: 250, // 250MB
    leakDetectionWindow: 5, // 5 minutes
    minimumGrowthRate: 10, // 10MB per minute
    maxSnapshots: 100
  };

  private thresholds: MemoryThresholds = { ...this.defaultThresholds };

  /**
   * Initialize memory monitoring with custom thresholds
   */
  public initialize(customThresholds?: Partial<MemoryThresholds>): void {
    if (customThresholds) {
      this.thresholds = { ...this.defaultThresholds, ...customThresholds };
    }

    // Only monitor in browser environment
    if (typeof window !== 'undefined') {
      this.setupPerformanceObservers();
      this.startMonitoring();
    }
  }

  /**
   * Start continuous memory monitoring
   */
  public startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      console.warn('Memory monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.takeSnapshot();

    this.monitoringInterval = window.setInterval(() => {
      this.takeSnapshot();
      this.analyzeMemoryTrends();
      this.detectLeaks();
      this.checkThresholds();
    }, intervalMs);

    console.log('Memory monitoring started with', intervalMs, 'ms interval');
  }

  /**
   * Stop memory monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.observerInstances.forEach(observer => observer.disconnect());
    this.observerInstances.clear();

    this.isMonitoring = false;
    console.log('Memory monitoring stopped');
  }

  /**
   * Take a memory snapshot
   */
  public takeSnapshot(): MemorySnapshot {
    const memory = this.getMemoryInfo();
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: memory.usedJSHeapSize || 0,
      heapTotal: memory.totalJSHeapSize || 0,
      external: 0, // Not available in browser
      arrayBuffers: 0 // Not directly available in browser
    };

    this.snapshots.push(snapshot);

    // Keep only the most recent snapshots
    if (this.snapshots.length > this.thresholds.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.thresholds.maxSnapshots);
    }

    return snapshot;
  }

  /**
   * Get current memory information
   */
  private getMemoryInfo(): any {
    if ('memory' in performance) {
      return (performance as any).memory;
    }

    // Fallback for browsers without memory API
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    };
  }

  /**
   * Setup performance observers for memory monitoring
   */
  private setupPerformanceObservers(): void {
    if ('PerformanceObserver' in window) {
      try {
        // Monitor long tasks that might indicate memory issues
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.duration > 50) { // Tasks longer than 50ms
              this.reportPotentialMemoryIssue('Long task detected', {
                duration: entry.duration,
                type: 'long-task'
              });
            }
          });
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observerInstances.set('longtask', longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }

      try {
        // Monitor resource timing for memory-related metrics
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            // Monitor large resources that might cause memory pressure
            if ('transferSize' in entry && (entry as any).transferSize > 1024 * 1024) { // > 1MB
              this.reportPotentialMemoryIssue('Large resource loaded', {
                resource: entry.name,
                size: (entry as any).transferSize
              });
            }
          });
        });

        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observerInstances.set('resource', resourceObserver);
      } catch (error) {
        console.warn('Resource observer not supported:', error);
      }
    }
  }

  /**
   * Analyze memory usage trends
   */
  private analyzeMemoryTrends(): void {
    if (this.snapshots.length < 2) return;

    const recent = this.snapshots.slice(-10); // Last 10 snapshots
    const oldest = recent[0];
    const newest = recent[recent.length - 1];

    const timeDiff = (newest.timestamp - oldest.timestamp) / 1000 / 60; // minutes
    const memoryDiff = (newest.heapUsed - oldest.heapUsed) / 1024 / 1024; // MB

    if (timeDiff > 0) {
      const growthRate = memoryDiff / timeDiff; // MB per minute

      if (growthRate > this.thresholds.minimumGrowthRate) {
        this.reportMemoryLeak({
          type: 'general',
          severity: growthRate > 20 ? 'critical' : 'high',
          description: `Memory growing at ${growthRate.toFixed(2)} MB/min`,
          growth: memoryDiff,
          duration: timeDiff * 60
        });
      }
    }
  }

  /**
   * Detect potential memory leaks
   */
  private detectLeaks(): void {
    if (this.snapshots.length < 5) return;

    const windowMinutes = this.thresholds.leakDetectionWindow;
    const cutoffTime = Date.now() - (windowMinutes * 60 * 1000);
    const windowSnapshots = this.snapshots.filter(s => s.timestamp >= cutoffTime);

    if (windowSnapshots.length < 3) return;

    const firstSnapshot = windowSnapshots[0];
    const lastSnapshot = windowSnapshots[windowSnapshots.length - 1];

    const memoryGrowth = (lastSnapshot.heapUsed - firstSnapshot.heapUsed) / 1024 / 1024; // MB
    const timeSpan = (lastSnapshot.timestamp - firstSnapshot.timestamp) / 1000; // seconds

    // Check for sustained growth
    const growthRate = memoryGrowth / (timeSpan / 60); // MB per minute

    if (memoryGrowth > 20 && growthRate > this.thresholds.minimumGrowthRate) {
      const severity = memoryGrowth > 100 ? 'critical' :
                      memoryGrowth > 50 ? 'high' : 'medium';

      this.reportMemoryLeak({
        type: 'general',
        severity,
        description: `Sustained memory growth detected: ${memoryGrowth.toFixed(2)}MB over ${windowMinutes} minutes`,
        growth: memoryGrowth,
        duration: timeSpan,
        stackTrace: this.captureStackTrace()
      });
    }
  }

  /**
   * Check memory thresholds and create alerts
   */
  private checkThresholds(): void {
    const latest = this.snapshots[this.snapshots.length - 1];
    if (!latest) return;

    const currentMemoryMB = latest.heapUsed / 1024 / 1024;

    if (currentMemoryMB > this.thresholds.criticalThreshold) {
      this.createAlert({
        type: 'critical',
        message: `Critical memory usage: ${currentMemoryMB.toFixed(2)}MB`,
        memoryUsage: currentMemoryMB,
        recommendations: [
          'Restart the application if possible',
          'Clear caches and temporary data',
          'Close unnecessary browser tabs',
          'Contact support if issue persists'
        ]
      });
    } else if (currentMemoryMB > this.thresholds.warningThreshold) {
      this.createAlert({
        type: 'warning',
        message: `High memory usage: ${currentMemoryMB.toFixed(2)}MB`,
        memoryUsage: currentMemoryMB,
        recommendations: [
          'Monitor memory usage closely',
          'Clear browser cache',
          'Avoid opening too many receipts simultaneously'
        ]
      });
    }
  }

  /**
   * Report a potential memory issue
   */
  private reportPotentialMemoryIssue(description: string, metadata: any): void {
    console.warn('Potential memory issue:', description, metadata);

    // In production, you might want to send this to an analytics service
    if (import.meta.env.MODE === 'production') {
      // Example: Send to monitoring service
      // this.sendToMonitoringService('memory_issue', { description, metadata });
    }
  }

  /**
   * Report a memory leak
   */
  private reportMemoryLeak(leak: Omit<MemoryLeak, 'id' | 'timestamp'>): void {
    const memoryLeak: MemoryLeak = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...leak
    };

    this.leaks.push(memoryLeak);

    console.error('Memory leak detected:', memoryLeak);

    // Create corresponding alert
    this.createAlert({
      type: 'leak_detected',
      message: memoryLeak.description,
      memoryUsage: memoryLeak.growth,
      recommendations: this.getLeakRecommendations(memoryLeak.type)
    });

    // In production, send to monitoring service
    if (import.meta.env.MODE === 'production') {
      // this.sendToMonitoringService('memory_leak', memoryLeak);
    }
  }

  /**
   * Create a memory alert
   */
  private createAlert(alert: Omit<MemoryAlert, 'id' | 'timestamp'>): void {
    const memoryAlert: MemoryAlert = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...alert
    };

    this.alerts.push(memoryAlert);

    // Keep only recent alerts
    if (this.alerts.length > 20) {
      this.alerts = this.alerts.slice(-20);
    }

    // Emit event for UI components to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('memory-alert', {
        detail: memoryAlert
      }));
    }
  }

  /**
   * Get recommendations for different types of leaks
   */
  private getLeakRecommendations(leakType: MemoryLeak['type']): string[] {
    const recommendations = {
      component: [
        'Check for unremoved event listeners in components',
        'Ensure proper cleanup in onUnmounted hooks',
        'Clear timers and intervals on component destruction'
      ],
      store: [
        'Review store mutations for unnecessary data retention',
        'Clear unused cached data',
        'Check for circular references in store state'
      ],
      dom: [
        'Check for detached DOM nodes',
        'Clear unused element references',
        'Remove unused CSS animations'
      ],
      general: [
        'Monitor browser console for warnings',
        'Clear application caches',
        'Restart the application if necessary'
      ]
    };

    return recommendations[leakType] || recommendations.general;
  }

  /**
   * Capture current stack trace
   */
  private captureStackTrace(): string {
    try {
      throw new Error('Stack trace');
    } catch (error) {
      return error instanceof Error ? error.stack || '' : '';
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods

  /**
   * Get current memory status
   */
  public getMemoryStatus(): {
    currentMemory: number;
    isMonitoring: boolean;
    snapshotCount: number;
    recentLeaks: MemoryLeak[];
    recentAlerts: MemoryAlert[];
  } {
    const latest = this.snapshots[this.snapshots.length - 1];
    const currentMemory = latest ? latest.heapUsed / 1024 / 1024 : 0;

    return {
      currentMemory,
      isMonitoring: this.isMonitoring,
      snapshotCount: this.snapshots.length,
      recentLeaks: this.leaks.slice(-5),
      recentAlerts: this.alerts.slice(-5)
    };
  }

  /**
   * Get memory usage history
   */
  public getMemoryHistory(minutes: number = 30): MemorySnapshot[] {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return this.snapshots.filter(snapshot => snapshot.timestamp >= cutoffTime);
  }

  /**
   * Force garbage collection (if available)
   */
  public forceGarbageCollection(): boolean {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc();
        console.log('Garbage collection forced');
        return true;
      } catch (error) {
        console.warn('Failed to force garbage collection:', error);
        return false;
      }
    }

    console.warn('Garbage collection not available');
    return false;
  }

  /**
   * Clear monitoring data
   */
  public clearData(): void {
    this.snapshots = [];
    this.leaks = [];
    this.alerts = [];
    console.log('Memory monitoring data cleared');
  }

  /**
   * Update monitoring thresholds
   */
  public updateThresholds(newThresholds: Partial<MemoryThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('Memory monitoring thresholds updated:', this.thresholds);
  }

  /**
   * Export monitoring data for analysis
   */
  public exportData(): {
    snapshots: MemorySnapshot[];
    leaks: MemoryLeak[];
    alerts: MemoryAlert[];
    thresholds: MemoryThresholds;
    exportTimestamp: number;
  } {
    return {
      snapshots: this.snapshots,
      leaks: this.leaks,
      alerts: this.alerts,
      thresholds: this.thresholds,
      exportTimestamp: Date.now()
    };
  }

  /**
   * Get singleton instance
   */
  private static instance: MemoryMonitoringService | null = null;

  public static getInstance(): MemoryMonitoringService {
    if (!MemoryMonitoringService.instance) {
      MemoryMonitoringService.instance = new MemoryMonitoringService();
    }
    return MemoryMonitoringService.instance;
  }
}

// Export singleton instance
export const memoryMonitoringService = MemoryMonitoringService.getInstance();
export default memoryMonitoringService;