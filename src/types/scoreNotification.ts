/**
 * Score Notification System
 *
 * Displays animated notifications after receipt uploads showing score changes.
 * Based on the iOS implementation from shoptrack-ios.
 */

export enum ScoreNotificationTheme {
  CELEBRATION = 'celebration',  // +5 or more
  IMPROVEMENT = 'improvement',  // +1 to +4
  MAINTAINED = 'maintained',    // 0 (same score)
  SLOW_PROGRESS = 'slow',       // -1 to -4
  DECLINING = 'declining'       // -5 or more
}

export interface ScoreNotificationThemeConfig {
  theme: ScoreNotificationTheme
  title: string
  emoji: string
  gradient: [string, string]
  animationType: 'confetti' | 'sparkles' | 'checkmark' | 'tumbleweed' | 'raindrops'
}

export interface ScoreNotification {
  theme: ScoreNotificationTheme
  previousScore: number
  newScore: number
  message: string
  timestamp: Date
}

export interface ExpenseVisibilityScoreResponse {
  totalScore: number
  breakdown: {
    daysTracked: {
      score: number
      weight: number
    }
    categoryDiversity: {
      score: number
      weight: number
    }
    itemDetailRichness: {
      score: number
      weight: number
    }
  }
  metrics: {
    totalDays: number
    categoriesUsed: number
    averageItemsPerReceipt: number
  }
  feedbackMessage: string
  isNewUser: boolean
}

/**
 * Determine notification theme based on score change
 */
export function getTheme(previousScore: number, newScore: number): ScoreNotificationTheme {
  const change = newScore - previousScore

  if (change >= 5) {
    return ScoreNotificationTheme.CELEBRATION
  } else if (change >= 1) {
    return ScoreNotificationTheme.IMPROVEMENT
  } else if (change === 0) {
    return ScoreNotificationTheme.MAINTAINED
  } else if (change >= -4) {
    return ScoreNotificationTheme.SLOW_PROGRESS
  } else {
    return ScoreNotificationTheme.DECLINING
  }
}

/**
 * Get theme configuration with localized titles
 */
export function getThemeConfig(theme: ScoreNotificationTheme): ScoreNotificationThemeConfig {
  const configs: Record<ScoreNotificationTheme, ScoreNotificationThemeConfig> = {
    [ScoreNotificationTheme.CELEBRATION]: {
      theme: ScoreNotificationTheme.CELEBRATION,
      title: 'score.notification.celebration.title', // Localized key
      emoji: '🎉',
      gradient: ['#10b981', '#fbbf24'],
      animationType: 'confetti'
    },
    [ScoreNotificationTheme.IMPROVEMENT]: {
      theme: ScoreNotificationTheme.IMPROVEMENT,
      title: 'score.notification.improvement.title',
      emoji: '📈',
      gradient: ['#3b82f6', '#06b6d4'],
      animationType: 'sparkles'
    },
    [ScoreNotificationTheme.MAINTAINED]: {
      theme: ScoreNotificationTheme.MAINTAINED,
      title: 'score.notification.maintained.title',
      emoji: '✅',
      gradient: ['#06b6d4', '#6ee7b7'],
      animationType: 'checkmark'
    },
    [ScoreNotificationTheme.SLOW_PROGRESS]: {
      theme: ScoreNotificationTheme.SLOW_PROGRESS,
      title: 'score.notification.slow.title',
      emoji: '🌵',
      gradient: ['#f97316', '#92400e'],
      animationType: 'tumbleweed'
    },
    [ScoreNotificationTheme.DECLINING]: {
      theme: ScoreNotificationTheme.DECLINING,
      title: 'score.notification.declining.title',
      emoji: '📉',
      gradient: ['#ef4444', '#f97316'],
      animationType: 'raindrops'
    }
  }

  return configs[theme]
}

/**
 * Create a score notification from score data
 */
export function createScoreNotification(
  previousScore: number,
  newScore: number,
  message: string
): ScoreNotification {
  const theme = getTheme(previousScore, newScore)

  return {
    theme,
    previousScore,
    newScore,
    message,
    timestamp: new Date()
  }
}
