/**
 * Accessibility test reporting and categorization utilities
 * Provides detailed reporting, violation tracking, and test categorization for accessibility testing
 */

import { TestCategory } from './categories';
import { AccessibilityTestResult, ViolationSeverity } from './accessibility';

// Extended accessibility test categories
export enum AccessibilityTestCategory {
  // Core WCAG Categories
  PERCEIVABLE = 'perceivable',
  OPERABLE = 'operable',
  UNDERSTANDABLE = 'understandable',
  ROBUST = 'robust',

  // Detailed Categories
  COLOR_CONTRAST = 'color-contrast',
  KEYBOARD_NAVIGATION = 'keyboard-navigation',
  SCREEN_READER = 'screen-reader',
  FOCUS_MANAGEMENT = 'focus-management',
  FORM_LABELS = 'form-labels',
  ARIA_IMPLEMENTATION = 'aria-implementation',
  SEMANTIC_HTML = 'semantic-html',
  LANDMARKS = 'landmarks',
  HEADINGS = 'headings',
  IMAGES = 'images',
  TABLES = 'tables',
  LISTS = 'lists',
  LINKS = 'links',
  BUTTONS = 'buttons',
  FORMS = 'forms',
  MODALS = 'modals',
  MENUS = 'menus',
  CAROUSELS = 'carousels',
  TOOLTIPS = 'tooltips',

  // User Experience Categories
  ERROR_HANDLING = 'error-handling',
  LOADING_STATES = 'loading-states',
  PROGRESS_INDICATION = 'progress-indication',
  DYNAMIC_CONTENT = 'dynamic-content',
  LIVE_REGIONS = 'live-regions',

  // Testing Categories
  AUTOMATED = 'automated',
  MANUAL = 'manual',
  INTEGRATION = 'integration',
  REGRESSION = 'regression',
  PERFORMANCE = 'performance'
}

// Violation impact mapping
export const ViolationImpactMap = {
  minor: ViolationSeverity.MINOR,
  moderate: ViolationSeverity.MODERATE,
  serious: ViolationSeverity.SERIOUS,
  critical: ViolationSeverity.CRITICAL
} as const;

// WCAG Success Criteria mapping
export const WCAGCriteriaMap = {
  'color-contrast': '1.4.3',
  'color-contrast-enhanced': '1.4.6',
  'keyboard': '2.1.1',
  'keyboard-trap': '2.1.2',
  'focus-order-semantics': '2.4.3',
  'link-name': '2.4.4',
  'heading-order': '2.4.6',
  'focus-visible': '2.4.7',
  'aria-valid-attr': '4.1.2',
  'aria-valid-attr-value': '4.1.2',
  'button-name': '4.1.2',
  'form-field-multiple-labels': '3.3.2',
  'label': '3.3.2',
  'landmark-unique': '1.3.6',
  'region': '1.3.6'
} as const;

// Accessibility test report interface
export interface AccessibilityReport {
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalViolations: number;
    successRate: number;
    timestamp: string;
  };
  violationsByImpact: Record<ViolationSeverity, number>;
  violationsByRule: Record<string, ViolationInfo>;
  violationsByCategory: Record<AccessibilityTestCategory, number>;
  violationsByWCAG: Record<string, number>;
  testResults: AccessibilityTestResult[];
  recommendations: AccessibilityRecommendation[];
  trends: AccessibilityTrend[];
}

export interface ViolationInfo {
  count: number;
  impact: ViolationSeverity;
  wcagCriteria: string;
  description: string;
  helpUrl: string;
  examples: ViolationExample[];
}

export interface ViolationExample {
  component: string;
  element: string;
  html: string;
  message: string;
}

export interface AccessibilityRecommendation {
  category: AccessibilityTestCategory;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  solution: string;
  resources: string[];
}

export interface AccessibilityTrend {
  date: string;
  totalTests: number;
  passedTests: number;
  violationCount: number;
  successRate: number;
}

// Accessibility test reporter class
export class AccessibilityReporter {
  private testHistory: AccessibilityTestResult[] = [];
  private trends: AccessibilityTrend[] = [];

  /**
   * Add test results to the reporter
   */
  addTestResults(results: AccessibilityTestResult[]): void {
    this.testHistory.push(...results);
    this.updateTrends();
  }

  /**
   * Generate comprehensive accessibility report
   */
  generateReport(results?: AccessibilityTestResult[]): AccessibilityReport {
    const testResults = results || this.testHistory;
    const timestamp = new Date().toISOString();

    // Calculate summary statistics
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalViolations = testResults.reduce((sum, r) => sum + r.violations.length, 0);
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    // Analyze violations
    const violationsByImpact = this.analyzeViolationsByImpact(testResults);
    const violationsByRule = this.analyzeViolationsByRule(testResults);
    const violationsByCategory = this.analyzeViolationsByCategory(testResults);
    const violationsByWCAG = this.analyzeViolationsByWCAG(testResults);

    // Generate recommendations
    const recommendations = this.generateRecommendations(violationsByRule);

    return {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        totalViolations,
        successRate,
        timestamp
      },
      violationsByImpact,
      violationsByRule,
      violationsByCategory,
      violationsByWCAG,
      testResults,
      recommendations,
      trends: this.trends
    };
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(results?: AccessibilityTestResult[]): string {
    const report = this.generateReport(results);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
        .section { margin-bottom: 30px; }
        .violation-item { background: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; margin: 10px 0; }
        .recommendation { background: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 10px 0; }
        .chart { height: 300px; background: #f8f9fa; display: flex; align-items: center; justify-content: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: #28a745; transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Accessibility Test Report</h1>
        <p>Generated on ${new Date(report.summary.timestamp).toLocaleString()}</p>
        <p>ShopTrack Frontend Application</p>
    </div>

    <div class="summary">
        <div class="stat-card">
            <div class="stat-value ${report.summary.successRate >= 90 ? 'success' : report.summary.successRate >= 70 ? 'warning' : 'danger'}">
                ${report.summary.successRate.toFixed(1)}%
            </div>
            <div>Success Rate</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${report.summary.totalTests}</div>
            <div>Total Tests</div>
        </div>
        <div class="stat-card">
            <div class="stat-value success">${report.summary.passedTests}</div>
            <div>Passed</div>
        </div>
        <div class="stat-card">
            <div class="stat-value danger">${report.summary.failedTests}</div>
            <div>Failed</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${report.summary.totalViolations}</div>
            <div>Total Violations</div>
        </div>
    </div>

    <div class="section">
        <h2>📊 Violations by Impact</h2>
        ${this.generateViolationsByImpactHTML(report.violationsByImpact)}
    </div>

    <div class="section">
        <h2>🔍 Violations by Rule</h2>
        ${this.generateViolationsByRuleHTML(report.violationsByRule)}
    </div>

    <div class="section">
        <h2>💡 Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation">
                <h4>${rec.title}</h4>
                <p><strong>Priority:</strong> ${rec.priority.toUpperCase()}</p>
                <p><strong>Impact:</strong> ${rec.impact}</p>
                <p>${rec.description}</p>
                <p><strong>Solution:</strong> ${rec.solution}</p>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>📈 Test Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Component</th>
                    <th>Test</th>
                    <th>Status</th>
                    <th>Violations</th>
                    <th>Profile</th>
                </tr>
            </thead>
            <tbody>
                ${report.testResults.map(result => `
                    <tr>
                        <td>${result.componentName}</td>
                        <td>${result.testName}</td>
                        <td class="${result.passed ? 'success' : 'danger'}">
                            ${result.passed ? '✅ Passed' : '❌ Failed'}
                        </td>
                        <td>${result.violations.length}</td>
                        <td>${result.profile}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <script>
        // Add interactive features here if needed
        console.log('Accessibility Report Data:', ${JSON.stringify(report, null, 2)});
    </script>
</body>
</html>`;
  }

  /**
   * Export report to JSON
   */
  exportToJSON(results?: AccessibilityTestResult[]): string {
    const report = this.generateReport(results);
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export report to CSV
   */
  exportToCSV(results?: AccessibilityTestResult[]): string {
    const testResults = results || this.testHistory;

    const headers = ['Component', 'Test Name', 'Status', 'Violations', 'Profile', 'Timestamp'];
    const rows = testResults.map(result => [
      result.componentName,
      result.testName,
      result.passed ? 'Passed' : 'Failed',
      result.violations.length.toString(),
      result.profile,
      new Date(result.timestamp).toISOString()
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Clear test history
   */
  clearHistory(): void {
    this.testHistory = [];
    this.trends = [];
  }

  /**
   * Get accessibility score
   */
  getAccessibilityScore(results?: AccessibilityTestResult[]): number {
    const testResults = results || this.testHistory;
    if (testResults.length === 0) return 0;

    const passedTests = testResults.filter(r => r.passed).length;
    return (passedTests / testResults.length) * 100;
  }

  private analyzeViolationsByImpact(results: AccessibilityTestResult[]): Record<ViolationSeverity, number> {
    const violations: Record<ViolationSeverity, number> = {
      [ViolationSeverity.MINOR]: 0,
      [ViolationSeverity.MODERATE]: 0,
      [ViolationSeverity.SERIOUS]: 0,
      [ViolationSeverity.CRITICAL]: 0
    };

    results.forEach(result => {
      result.violations.forEach(violation => {
        const severity = ViolationImpactMap[violation.impact as keyof typeof ViolationImpactMap] || ViolationSeverity.MODERATE;
        violations[severity]++;
      });
    });

    return violations;
  }

  private analyzeViolationsByRule(results: AccessibilityTestResult[]): Record<string, ViolationInfo> {
    const violations: Record<string, ViolationInfo> = {};

    results.forEach(result => {
      result.violations.forEach(violation => {
        if (!violations[violation.id]) {
          violations[violation.id] = {
            count: 0,
            impact: ViolationImpactMap[violation.impact as keyof typeof ViolationImpactMap] || ViolationSeverity.MODERATE,
            wcagCriteria: WCAGCriteriaMap[violation.id as keyof typeof WCAGCriteriaMap] || 'Unknown',
            description: violation.description,
            helpUrl: violation.helpUrl,
            examples: []
          };
        }

        violations[violation.id].count++;

        // Add examples
        violation.nodes.forEach((node: any) => {
          violations[violation.id].examples.push({
            component: result.componentName,
            element: node.target.join(', '),
            html: node.html,
            message: node.failureSummary || violation.description
          });
        });
      });
    });

    return violations;
  }

  private analyzeViolationsByCategory(results: AccessibilityTestResult[]): Record<AccessibilityTestCategory, number> {
    const violations: Record<AccessibilityTestCategory, number> = {} as Record<AccessibilityTestCategory, number>;

    // Initialize all categories
    Object.values(AccessibilityTestCategory).forEach(category => {
      violations[category] = 0;
    });

    results.forEach(result => {
      result.violations.forEach(violation => {
        // Map violation rules to categories
        const category = this.mapViolationToCategory(violation.id);
        if (category) {
          violations[category]++;
        }
      });
    });

    return violations;
  }

  private analyzeViolationsByWCAG(results: AccessibilityTestResult[]): Record<string, number> {
    const violations: Record<string, number> = {};

    results.forEach(result => {
      result.violations.forEach(violation => {
        const wcagCriteria = WCAGCriteriaMap[violation.id as keyof typeof WCAGCriteriaMap];
        if (wcagCriteria) {
          violations[wcagCriteria] = (violations[wcagCriteria] || 0) + 1;
        }
      });
    });

    return violations;
  }

  private mapViolationToCategory(ruleId: string): AccessibilityTestCategory | null {
    const ruleToCategory: Record<string, AccessibilityTestCategory> = {
      'color-contrast': AccessibilityTestCategory.COLOR_CONTRAST,
      'color-contrast-enhanced': AccessibilityTestCategory.COLOR_CONTRAST,
      'keyboard': AccessibilityTestCategory.KEYBOARD_NAVIGATION,
      'keyboard-trap': AccessibilityTestCategory.KEYBOARD_NAVIGATION,
      'focus-order-semantics': AccessibilityTestCategory.FOCUS_MANAGEMENT,
      'aria-valid-attr': AccessibilityTestCategory.ARIA_IMPLEMENTATION,
      'aria-valid-attr-value': AccessibilityTestCategory.ARIA_IMPLEMENTATION,
      'button-name': AccessibilityTestCategory.BUTTONS,
      'form-field-multiple-labels': AccessibilityTestCategory.FORM_LABELS,
      'label': AccessibilityTestCategory.FORM_LABELS,
      'link-name': AccessibilityTestCategory.LINKS,
      'heading-order': AccessibilityTestCategory.HEADINGS,
      'landmark-unique': AccessibilityTestCategory.LANDMARKS,
      'region': AccessibilityTestCategory.LANDMARKS,
      'list': AccessibilityTestCategory.LISTS,
      'listitem': AccessibilityTestCategory.LISTS,
      'table-fake-caption': AccessibilityTestCategory.TABLES,
      'image-alt': AccessibilityTestCategory.IMAGES
    };

    return ruleToCategory[ruleId] || null;
  }

  private generateRecommendations(violationsByRule: Record<string, ViolationInfo>): AccessibilityRecommendation[] {
    const recommendations: AccessibilityRecommendation[] = [];

    Object.entries(violationsByRule).forEach(([ruleId, info]) => {
      const recommendation = this.getRecommendationForRule(ruleId, info);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private getRecommendationForRule(ruleId: string, info: ViolationInfo): AccessibilityRecommendation | null {
    const recommendations: Record<string, Omit<AccessibilityRecommendation, 'category'>> = {
      'color-contrast': {
        priority: 'high',
        title: 'Improve Color Contrast',
        description: 'Text does not have sufficient contrast against its background color.',
        impact: 'Users with visual impairments may not be able to read content.',
        solution: 'Use colors with a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text.',
        resources: [
          'https://webaim.org/resources/contrastchecker/',
          'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html'
        ]
      },
      'keyboard': {
        priority: 'high',
        title: 'Fix Keyboard Navigation',
        description: 'Interactive elements are not accessible via keyboard navigation.',
        impact: 'Users who rely on keyboard navigation cannot access functionality.',
        solution: 'Ensure all interactive elements can be reached and activated using only the keyboard.',
        resources: [
          'https://webaim.org/techniques/keyboard/',
          'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html'
        ]
      },
      'aria-valid-attr': {
        priority: 'medium',
        title: 'Fix ARIA Attributes',
        description: 'ARIA attributes are not valid or properly implemented.',
        impact: 'Screen readers may not properly interpret content structure and functionality.',
        solution: 'Use valid ARIA attributes according to the ARIA specification.',
        resources: [
          'https://www.w3.org/WAI/ARIA/apg/',
          'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA'
        ]
      },
      'button-name': {
        priority: 'high',
        title: 'Add Button Labels',
        description: 'Buttons do not have accessible names.',
        impact: 'Screen reader users cannot understand the purpose of buttons.',
        solution: 'Provide accessible names using text content, aria-label, or aria-labelledby.',
        resources: [
          'https://webaim.org/techniques/forms/controls#button',
          'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html'
        ]
      }
    };

    const baseRecommendation = recommendations[ruleId];
    if (!baseRecommendation) return null;

    const category = this.mapViolationToCategory(ruleId) || AccessibilityTestCategory.AUTOMATED;

    return {
      ...baseRecommendation,
      category
    };
  }

  private updateTrends(): void {
    const today = new Date().toISOString().split('T')[0];
    const todayResults = this.testHistory.filter(r =>
      new Date(r.timestamp).toISOString().split('T')[0] === today
    );

    if (todayResults.length > 0) {
      const totalTests = todayResults.length;
      const passedTests = todayResults.filter(r => r.passed).length;
      const violationCount = todayResults.reduce((sum, r) => sum + r.violations.length, 0);
      const successRate = (passedTests / totalTests) * 100;

      // Update or add today's trend
      const existingTrendIndex = this.trends.findIndex(t => t.date === today);
      const trendData = {
        date: today,
        totalTests,
        passedTests,
        violationCount,
        successRate
      };

      if (existingTrendIndex >= 0) {
        this.trends[existingTrendIndex] = trendData;
      } else {
        this.trends.push(trendData);
      }

      // Keep only last 30 days
      this.trends = this.trends.slice(-30);
    }
  }

  private generateViolationsByImpactHTML(violationsByImpact: Record<ViolationSeverity, number>): string {
    const total = Object.values(violationsByImpact).reduce((sum, count) => sum + count, 0);

    return `
      <div class="violations-by-impact">
        ${Object.entries(violationsByImpact).map(([severity, count]) => {
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return `
            <div class="impact-item">
              <div class="impact-header">
                <span class="impact-label">${severity.toUpperCase()}</span>
                <span class="impact-count">${count}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  private generateViolationsByRuleHTML(violationsByRule: Record<string, ViolationInfo>): string {
    return `
      <table>
        <thead>
          <tr>
            <th>Rule</th>
            <th>Count</th>
            <th>Impact</th>
            <th>WCAG</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(violationsByRule).map(([rule, info]) => `
            <tr>
              <td><code>${rule}</code></td>
              <td>${info.count}</td>
              <td class="${info.impact}">${info.impact}</td>
              <td>${info.wcagCriteria}</td>
              <td>${info.description}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

// Global accessibility reporter instance
export const accessibilityReporter = new AccessibilityReporter();

// Utility functions for test categorization
export function categorizeAccessibilityTest(
  testName: string,
  component: string,
  violations: any[]
): AccessibilityTestCategory[] {
  const categories: AccessibilityTestCategory[] = [AccessibilityTestCategory.AUTOMATED];

  // Add categories based on component type
  if (component.toLowerCase().includes('form')) {
    categories.push(AccessibilityTestCategory.FORMS);
  }
  if (component.toLowerCase().includes('modal')) {
    categories.push(AccessibilityTestCategory.MODALS);
  }
  if (component.toLowerCase().includes('nav')) {
    categories.push(AccessibilityTestCategory.MENUS);
  }

  // Add categories based on violations
  violations.forEach(violation => {
    const category = accessibilityReporter['mapViolationToCategory'](violation.id);
    if (category && !categories.includes(category)) {
      categories.push(category);
    }
  });

  return categories;
}

// Export utilities for test configuration
export const AccessibilityTestProfiles = {
  BASIC: [TestCategory.ACCESSIBILITY, TestCategory.UNIT, TestCategory.FAST],
  COMPREHENSIVE: [TestCategory.ACCESSIBILITY, TestCategory.INTEGRATION, TestCategory.MEDIUM],
  STRICT: [TestCategory.ACCESSIBILITY, TestCategory.CRITICAL, TestCategory.SLOW],
  FORMS: [TestCategory.ACCESSIBILITY, TestCategory.FORMS, TestCategory.FAST],
  NAVIGATION: [TestCategory.ACCESSIBILITY, TestCategory.NAVIGATION, TestCategory.MEDIUM],
  PERFORMANCE: [TestCategory.ACCESSIBILITY, TestCategory.PERFORMANCE, TestCategory.SLOW]
};