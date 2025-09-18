import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useJobNotifications } from '../useJobNotifications'
import type { JobNotification, NotificationResponse } from '@/services/asyncJobs'

// Mock dependencies
const mockAsyncJobsService = {
  getUnreadCount: vi.fn(),
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markMultipleNotificationsRead: vi.fn(),
  markAllNotificationsRead: vi.fn()
}

const mockNotifications = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn()
}

vi.mock('@/services/asyncJobs', () => ({
  asyncJobsService: mockAsyncJobsService
}))

vi.mock('./useNotifications', () => ({
  useNotifications: () => mockNotifications
}))

// Mock timers
vi.useFakeTimers()

describe('useJobNotifications', () => {
  // Sample notification data
  const createMockNotification = (overrides: Partial<JobNotification> = {}): JobNotification => ({
    id: 'notif-1',
    jobId: 'job-1',
    userId: 123,
    sessionId: 'session-1',
    notificationType: 'job_completed',
    title: 'Job Completed',
    message: 'Your job has finished successfully',
    data: {},
    isRead: false,
    isPersistent: false,
    createdAt: new Date().toISOString(),
    ...overrides
  })

  const createMockResponse = (notifications: JobNotification[], unreadCount: number = 0): NotificationResponse => ({
    notifications,
    unreadCount,
    totalCount: notifications.length
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()

    // Default mock implementations
    mockAsyncJobsService.getUnreadCount.mockResolvedValue({ count: 0 })
    mockAsyncJobsService.getNotifications.mockResolvedValue(createMockResponse([]))
    mockAsyncJobsService.markNotificationRead.mockResolvedValue(undefined)
    mockAsyncJobsService.markMultipleNotificationsRead.mockResolvedValue(undefined)
    mockAsyncJobsService.markAllNotificationsRead.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.resetAllMocks()
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.useFakeTimers()
  })

  describe('basic functionality', () => {
    it('should initialize with default values', () => {
      // Act
      const notifications = useJobNotifications()

      // Assert
      expect(notifications.jobNotifications.value).toEqual([])
      expect(notifications.unreadCount.value).toBe(0)
      expect(notifications.hasUnreadNotifications.value).toBe(false)
      expect(notifications.unreadNotifications.value).toEqual([])
      expect(notifications.persistentNotifications.value).toEqual([])
      expect(notifications.isPolling.value).toBe(false)
    })

    it('should provide all expected functions', () => {
      // Act
      const notifications = useJobNotifications()

      // Assert
      expect(typeof notifications.fetchNotifications).toBe('function')
      expect(typeof notifications.markAsRead).toBe('function')
      expect(typeof notifications.markMultipleAsRead).toBe('function')
      expect(typeof notifications.markAllAsRead).toBe('function')
      expect(typeof notifications.clearOldNotifications).toBe('function')
      expect(typeof notifications.startPolling).toBe('function')
      expect(typeof notifications.stopPolling).toBe('function')
      expect(typeof notifications.initialize).toBe('function')
      expect(typeof notifications.getNotificationsByJobId).toBe('function')
      expect(typeof notifications.hasNotificationsForJob).toBe('function')
    })
  })

  describe('computed properties', () => {
    it('should calculate hasUnreadNotifications correctly', () => {
      // Arrange
      const notifications = useJobNotifications()

      // Act & Assert - initially no unread
      expect(notifications.hasUnreadNotifications.value).toBe(false)

      // Act - set unread count
      notifications.unreadCount.value = 3
      expect(notifications.hasUnreadNotifications.value).toBe(true)

      // Act - reset to zero
      notifications.unreadCount.value = 0
      expect(notifications.hasUnreadNotifications.value).toBe(false)
    })

    it('should filter unreadNotifications correctly', () => {
      // Arrange
      const readNotification = createMockNotification({ id: 'read-1', isRead: true })
      const unreadNotification1 = createMockNotification({ id: 'unread-1', isRead: false })
      const unreadNotification2 = createMockNotification({ id: 'unread-2', isRead: false })

      const notifications = useJobNotifications()

      // Act
      notifications.jobNotifications.value = [readNotification, unreadNotification1, unreadNotification2]

      // Assert
      expect(notifications.unreadNotifications.value).toHaveLength(2)
      expect(notifications.unreadNotifications.value).toEqual([unreadNotification1, unreadNotification2])
    })

    it('should filter persistentNotifications correctly', () => {
      // Arrange
      const persistentRead = createMockNotification({ id: 'pers-read', isPersistent: true, isRead: true })
      const persistentUnread = createMockNotification({ id: 'pers-unread', isPersistent: true, isRead: false })
      const nonPersistent = createMockNotification({ id: 'non-pers', isPersistent: false, isRead: false })

      const notifications = useJobNotifications()

      // Act
      notifications.jobNotifications.value = [persistentRead, persistentUnread, nonPersistent]

      // Assert
      expect(notifications.persistentNotifications.value).toHaveLength(1)
      expect(notifications.persistentNotifications.value[0].id).toBe('pers-unread')
    })
  })

  describe('fetchNotifications', () => {
    it('should fetch and set notifications', async () => {
      // Arrange
      const mockNotifs = [
        createMockNotification({ id: 'notif-1' }),
        createMockNotification({ id: 'notif-2', isRead: true })
      ]
      const mockResponse = createMockResponse(mockNotifs, 1)

      mockAsyncJobsService.getNotifications.mockResolvedValue(mockResponse)
      const notifications = useJobNotifications()

      // Act
      await notifications.fetchNotifications()

      // Assert
      expect(mockAsyncJobsService.getNotifications).toHaveBeenCalledWith(undefined)
      expect(notifications.jobNotifications.value).toEqual(mockNotifs)
      expect(notifications.unreadCount.value).toBe(1)
    })

    it('should fetch notifications with options', async () => {
      // Arrange
      const options = { unreadOnly: true, limit: 10, offset: 20 }
      mockAsyncJobsService.getNotifications.mockResolvedValue(createMockResponse([], 0))
      const notifications = useJobNotifications()

      // Act
      await notifications.fetchNotifications(options)

      // Assert
      expect(mockAsyncJobsService.getNotifications).toHaveBeenCalledWith(options)
    })

    it('should merge new notifications when unreadOnly is true', async () => {
      // Arrange
      const existingNotifs = [createMockNotification({ id: 'existing' })]
      const newNotifs = [
        createMockNotification({ id: 'new-1' }),
        createMockNotification({ id: 'new-2' })
      ]

      mockAsyncJobsService.getNotifications.mockResolvedValue(createMockResponse(newNotifs, 2))
      const notifications = useJobNotifications()
      notifications.jobNotifications.value = existingNotifs

      // Act
      await notifications.fetchNotifications({ unreadOnly: true })

      // Assert
      expect(notifications.jobNotifications.value).toHaveLength(3)
      expect(notifications.jobNotifications.value).toEqual([...existingNotifs, ...newNotifs])
    })

    it('should avoid duplicate notifications when merging', async () => {
      // Arrange
      const existingNotifs = [createMockNotification({ id: 'duplicate' })]
      const responseNotifs = [
        createMockNotification({ id: 'duplicate' }), // This should be filtered out
        createMockNotification({ id: 'new-one' })
      ]

      mockAsyncJobsService.getNotifications.mockResolvedValue(createMockResponse(responseNotifs, 1))
      const notifications = useJobNotifications()
      notifications.jobNotifications.value = existingNotifs

      // Act
      await notifications.fetchNotifications({ unreadOnly: true })

      // Assert
      expect(notifications.jobNotifications.value).toHaveLength(2)
      expect(notifications.jobNotifications.value.map(n => n.id)).toEqual(['duplicate', 'new-one'])
    })

    it('should show notifications in UI when they should be shown', async () => {
      // Arrange
      const recentNotification = createMockNotification({
        id: 'recent',
        notificationType: 'job_completed',
        isRead: false,
        createdAt: new Date(Date.now() - 30000).toISOString() // 30 seconds ago
      })

      mockAsyncJobsService.getNotifications.mockResolvedValue(createMockResponse([recentNotification], 1))
      const notifications = useJobNotifications()

      // Act
      await notifications.fetchNotifications()

      // Assert
      expect(mockNotifications.success).toHaveBeenCalledWith(
        'Job Completed',
        'Your job has finished successfully',
        { persistent: false, duration: 5000 }
      )
    })

    it('should handle fetch errors gracefully', async () => {
      // Arrange
      const error = new Error('Network error')
      mockAsyncJobsService.getNotifications.mockRejectedValue(error)
      const notifications = useJobNotifications()

      // Act
      await notifications.fetchNotifications()

      // Assert
      expect(mockNotifications.error).toHaveBeenCalledWith(
        'Notification Error',
        'Failed to fetch notifications'
      )
      expect(notifications.jobNotifications.value).toEqual([])
    })
  })

  describe('polling functionality', () => {
    it('should start polling and fetch unread count', async () => {
      // Arrange
      mockAsyncJobsService.getUnreadCount.mockResolvedValue({ count: 2 })
      mockAsyncJobsService.getNotifications.mockResolvedValue(createMockResponse([], 2))
      const notifications = useJobNotifications()

      // Act
      await notifications.startPolling(1000)

      // Assert
      expect(notifications.isPolling.value).toBe(true)
      expect(mockAsyncJobsService.getUnreadCount).toHaveBeenCalled()
    })

    it('should fetch full notifications when unread count > 0', async () => {
      // Arrange
      mockAsyncJobsService.getUnreadCount.mockResolvedValue({ count: 3 })
      const mockNotifs = [createMockNotification({ id: 'unread-1' })]
      mockAsyncJobsService.getNotifications.mockResolvedValue(createMockResponse(mockNotifs, 3))

      const notifications = useJobNotifications()

      // Act
      await notifications.startPolling(1000)
      await nextTick()

      // Assert
      expect(mockAsyncJobsService.getNotifications).toHaveBeenCalledWith({ unreadOnly: true })
      expect(notifications.unreadCount.value).toBe(3)
    })

    it('should not start polling if already polling', async () => {
      // Arrange
      const notifications = useJobNotifications()
      notifications.isPolling.value = true

      // Act
      await notifications.startPolling()

      // Assert
      expect(mockAsyncJobsService.getUnreadCount).not.toHaveBeenCalled()
    })

    it('should poll at specified intervals', async () => {
      // Arrange
      mockAsyncJobsService.getUnreadCount.mockResolvedValue({ count: 0 })
      const notifications = useJobNotifications()

      // Act
      await notifications.startPolling(2000)

      // Advance timers and verify polling happens
      vi.advanceTimersByTime(2000)
      await nextTick()
      vi.advanceTimersByTime(2000)
      await nextTick()

      // Assert
      expect(mockAsyncJobsService.getUnreadCount).toHaveBeenCalledTimes(3) // Initial + 2 intervals
    })

    it('should handle polling errors gracefully', async () => {
      // Arrange
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockAsyncJobsService.getUnreadCount.mockRejectedValue(new Error('Polling error'))
      const notifications = useJobNotifications()

      // Act
      await notifications.startPolling(1000)

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error polling job notifications:', expect.any(Error))
      expect(notifications.isPolling.value).toBe(true) // Should continue polling despite error

      consoleErrorSpy.mockRestore()
    })

    it('should stop polling correctly', async () => {
      // Arrange
      mockAsyncJobsService.getUnreadCount.mockResolvedValue({ count: 0 })
      const notifications = useJobNotifications()

      // Act - start then stop
      await notifications.startPolling(1000)
      notifications.stopPolling()

      // Assert
      expect(notifications.isPolling.value).toBe(false)

      // Verify no more polling after stop
      const callCountBeforeStop = mockAsyncJobsService.getUnreadCount.mock.calls.length
      vi.advanceTimersByTime(2000)
      await nextTick()
      expect(mockAsyncJobsService.getUnreadCount).toHaveBeenCalledTimes(callCountBeforeStop)
    })
  })

  describe('shouldShowInUI', () => {
    it('should show recent job completion notifications', async () => {
      // Arrange
      const recentNotification = createMockNotification({
        notificationType: 'job_completed',
        createdAt: new Date(Date.now() - 30000).toISOString() // 30 seconds ago
      })

      mockAsyncJobsService.getNotifications.mockResolvedValue(createMockResponse([recentNotification], 1))
      const notifications = useJobNotifications()

      // Act
      await notifications.fetchNotifications()

      // Assert
      expect(mockNotifications.success).toHaveBeenCalled()
    })

    it('should show recent job failure notifications', async () => {
      // Arrange
      const failureNotification = createMockNotification({
        notificationType: 'job_failed',
        title: 'Job Failed',
        message: 'Job processing failed',
        createdAt: new Date(Date.now() - 30000).toISOString() // 30 seconds ago
      })

      mockAsyncJobsService.getNotifications.mockResolvedValue(createMockResponse([failureNotification], 1))
      const notifications = useJobNotifications()

      // Act
      await notifications.fetchNotifications()

      // Assert
      expect(mockNotifications.error).toHaveBeenCalledWith(
        'Job Failed',
        'Job processing failed',
        { persistent: true }
      )
    })

    it('should not show old notifications', async () => {
      // Arrange
      const oldNotification = createMockNotification({
        notificationType: 'job_completed',
        createdAt: new Date(Date.now() - 120000).toISOString() // 2 minutes ago
      })

      mockAsyncJobsService.getNotifications.mockResolvedValue(createMockResponse([oldNotification], 1))
      const notifications = useJobNotifications()

      // Act
      await notifications.fetchNotifications()

      // Assert
      expect(mockNotifications.success).not.toHaveBeenCalled()
    })

    it('should handle different notification types', async () => {
      // Arrange
      const retryNotification = createMockNotification({
        notificationType: 'job_retry',
        title: 'Job Retry',
        message: 'Retrying job',
        createdAt: new Date(Date.now() - 10000).toISOString()
      })

      const cancelledNotification = createMockNotification({
        id: 'cancelled',
        notificationType: 'job_cancelled',
        title: 'Job Cancelled',
        message: 'Job was cancelled',
        createdAt: new Date(Date.now() - 10000).toISOString()
      })

      const unknownNotification = createMockNotification({
        id: 'unknown',
        notificationType: 'unknown_type',
        title: 'Unknown',
        message: 'Unknown notification',
        createdAt: new Date(Date.now() - 10000).toISOString()
      })

      mockAsyncJobsService.getNotifications.mockResolvedValue(
        createMockResponse([retryNotification, cancelledNotification, unknownNotification], 3)
      )
      const notifications = useJobNotifications()

      // Act
      await notifications.fetchNotifications()

      // Assert
      expect(mockNotifications.warning).toHaveBeenCalledWith(
        'Job Retry',
        'Retrying job',
        { persistent: false, duration: 4000 }
      )
      expect(mockNotifications.info).toHaveBeenCalledWith(
        'Job Cancelled',
        'Job was cancelled',
        { persistent: false, duration: 3000 }
      )
      expect(mockNotifications.info).toHaveBeenCalledWith(
        'Unknown',
        'Unknown notification',
        { persistent: false, duration: 4000 }
      )
    })
  })

  describe('markAsRead functionality', () => {
    it('should mark notification as read', async () => {
      // Arrange
      const notification = createMockNotification({ id: 'mark-read', isRead: false })
      const notifications = useJobNotifications()
      notifications.jobNotifications.value = [notification]
      notifications.unreadCount.value = 1

      // Act
      await notifications.markAsRead('mark-read')

      // Assert
      expect(mockAsyncJobsService.markNotificationRead).toHaveBeenCalledWith('mark-read')
      expect(notification.isRead).toBe(true)
      expect(notification.readAt).toBeDefined()
      expect(notifications.unreadCount.value).toBe(0)
    })

    it('should handle non-existent notification gracefully', async () => {
      // Arrange
      const notifications = useJobNotifications()

      // Act
      await notifications.markAsRead('non-existent')

      // Assert
      expect(mockAsyncJobsService.markNotificationRead).toHaveBeenCalledWith('non-existent')
      expect(notifications.unreadCount.value).toBe(0)
    })

    it('should handle mark as read API errors', async () => {
      // Arrange
      const error = new Error('API error')
      mockAsyncJobsService.markNotificationRead.mockRejectedValue(error)
      const notifications = useJobNotifications()

      // Act
      await notifications.markAsRead('error-id')

      // Assert
      expect(mockNotifications.error).toHaveBeenCalledWith(
        'Update Failed',
        'Failed to mark notification as read'
      )
    })

    it('should not reduce unread count below zero', async () => {
      // Arrange
      const notifications = useJobNotifications()
      notifications.unreadCount.value = 0

      // Act
      await notifications.markAsRead('test-id')

      // Assert
      expect(notifications.unreadCount.value).toBe(0)
    })
  })

  describe('markMultipleAsRead functionality', () => {
    it('should mark multiple notifications as read', async () => {
      // Arrange
      const notif1 = createMockNotification({ id: 'multi-1', isRead: false })
      const notif2 = createMockNotification({ id: 'multi-2', isRead: false })
      const notif3 = createMockNotification({ id: 'multi-3', isRead: true }) // Already read

      const notifications = useJobNotifications()
      notifications.jobNotifications.value = [notif1, notif2, notif3]
      notifications.unreadCount.value = 2

      // Act
      await notifications.markMultipleAsRead(['multi-1', 'multi-2'])

      // Assert
      expect(mockAsyncJobsService.markMultipleNotificationsRead).toHaveBeenCalledWith(['multi-1', 'multi-2'])
      expect(notif1.isRead).toBe(true)
      expect(notif2.isRead).toBe(true)
      expect(notif3.isRead).toBe(true) // Still read
      expect(notifications.unreadCount.value).toBe(0)
    })

    it('should handle partial matches correctly', async () => {
      // Arrange
      const notif1 = createMockNotification({ id: 'exists', isRead: false })
      const notifications = useJobNotifications()
      notifications.jobNotifications.value = [notif1]
      notifications.unreadCount.value = 1

      // Act - includes non-existent ID
      await notifications.markMultipleAsRead(['exists', 'non-existent'])

      // Assert
      expect(notif1.isRead).toBe(true)
      expect(notifications.unreadCount.value).toBe(0) // Only decreased by 1
    })

    it('should handle API errors for multiple mark as read', async () => {
      // Arrange
      const error = new Error('Bulk update error')
      mockAsyncJobsService.markMultipleNotificationsRead.mockRejectedValue(error)
      const notifications = useJobNotifications()

      // Act
      await notifications.markMultipleAsRead(['id1', 'id2'])

      // Assert
      expect(mockNotifications.error).toHaveBeenCalledWith(
        'Update Failed',
        'Failed to mark selected notifications as read'
      )
    })
  })

  describe('markAllAsRead functionality', () => {
    it('should mark all notifications as read', async () => {
      // Arrange
      const notif1 = createMockNotification({ id: 'all-1', isRead: false })
      const notif2 = createMockNotification({ id: 'all-2', isRead: false })
      const notif3 = createMockNotification({ id: 'all-3', isRead: true })

      const notifications = useJobNotifications()
      notifications.jobNotifications.value = [notif1, notif2, notif3]
      notifications.unreadCount.value = 2

      // Act
      await notifications.markAllAsRead()

      // Assert
      expect(mockAsyncJobsService.markAllNotificationsRead).toHaveBeenCalled()
      expect(notif1.isRead).toBe(true)
      expect(notif2.isRead).toBe(true)
      expect(notif3.isRead).toBe(true)
      expect(notifications.unreadCount.value).toBe(0)
    })

    it('should handle mark all as read API errors', async () => {
      // Arrange
      const error = new Error('Mark all error')
      mockAsyncJobsService.markAllNotificationsRead.mockRejectedValue(error)
      const notifications = useJobNotifications()

      // Act
      await notifications.markAllAsRead()

      // Assert
      expect(mockNotifications.error).toHaveBeenCalledWith(
        'Update Failed',
        'Failed to mark all notifications as read'
      )
    })
  })

  describe('clearOldNotifications', () => {
    it('should clear old read notifications', () => {
      // Arrange
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

      const oldRead = createMockNotification({
        id: 'old-read',
        isRead: true,
        createdAt: twoDaysAgo.toISOString()
      })

      const oldUnread = createMockNotification({
        id: 'old-unread',
        isRead: false,
        createdAt: twoDaysAgo.toISOString()
      })

      const recentRead = createMockNotification({
        id: 'recent-read',
        isRead: true,
        createdAt: new Date().toISOString()
      })

      const notifications = useJobNotifications()
      notifications.jobNotifications.value = [oldRead, oldUnread, recentRead]

      // Act
      notifications.clearOldNotifications()

      // Assert
      expect(notifications.jobNotifications.value).toHaveLength(2)
      expect(notifications.jobNotifications.value.map(n => n.id)).toEqual(['old-unread', 'recent-read'])
    })
  })

  describe('utility functions', () => {
    it('should get notifications by job ID', () => {
      // Arrange
      const jobNotifs = [
        createMockNotification({ id: 'job-1-notif-1', jobId: 'job-1' }),
        createMockNotification({ id: 'job-1-notif-2', jobId: 'job-1' }),
        createMockNotification({ id: 'job-2-notif', jobId: 'job-2' })
      ]

      const notifications = useJobNotifications()
      notifications.jobNotifications.value = jobNotifs

      // Act
      const result = notifications.getNotificationsByJobId('job-1')

      // Assert
      expect(result).toHaveLength(2)
      expect(result.map(n => n.id)).toEqual(['job-1-notif-1', 'job-1-notif-2'])
    })

    it('should check if notifications exist for job', () => {
      // Arrange
      const jobNotifs = [
        createMockNotification({ jobId: 'job-exists' }),
        createMockNotification({ jobId: 'job-other' })
      ]

      const notifications = useJobNotifications()
      notifications.jobNotifications.value = jobNotifs

      // Act & Assert
      expect(notifications.hasNotificationsForJob('job-exists')).toBe(true)
      expect(notifications.hasNotificationsForJob('job-missing')).toBe(false)
    })
  })

  describe('initialization', () => {
    it('should initialize with correct sequence', async () => {
      // Arrange
      mockAsyncJobsService.getNotifications.mockResolvedValue(createMockResponse([], 0))
      mockAsyncJobsService.getUnreadCount.mockResolvedValue({ count: 0 })
      const notifications = useJobNotifications()

      // Act
      await notifications.initialize()

      // Assert
      expect(mockAsyncJobsService.getNotifications).toHaveBeenCalledWith({ limit: 50 })
      expect(notifications.isPolling.value).toBe(true)
    })
  })

  describe('edge cases and error scenarios', () => {
    it('should handle notifications with missing properties', async () => {
      // Arrange
      const incompleteNotification = {
        id: 'incomplete',
        jobId: 'job-incomplete',
        userId: 123,
        notificationType: 'job_completed',
        title: 'Incomplete',
        message: 'Missing some properties',
        isRead: false,
        isPersistent: false,
        createdAt: new Date().toISOString()
        // Missing optional properties like data, sessionId, etc.
      } as JobNotification

      mockAsyncJobsService.getNotifications.mockResolvedValue(
        createMockResponse([incompleteNotification], 1)
      )
      const notifications = useJobNotifications()

      // Act
      await notifications.fetchNotifications()

      // Assert
      expect(notifications.jobNotifications.value).toHaveLength(1)
      expect(notifications.jobNotifications.value[0]).toEqual(incompleteNotification)
    })

    it('should handle concurrent polling attempts', async () => {
      // Arrange
      mockAsyncJobsService.getUnreadCount.mockResolvedValue({ count: 0 })
      const notifications = useJobNotifications()

      // Act - start polling multiple times
      await notifications.startPolling(1000)
      await notifications.startPolling(1000)
      await notifications.startPolling(1000)

      // Assert - should only start once
      expect(notifications.isPolling.value).toBe(true)
      expect(mockAsyncJobsService.getUnreadCount).toHaveBeenCalledTimes(1) // Only initial call
    })

    it('should handle empty notification arrays', async () => {
      // Arrange
      mockAsyncJobsService.getNotifications.mockResolvedValue(createMockResponse([], 0))
      const notifications = useJobNotifications()

      // Act
      await notifications.fetchNotifications()

      // Assert
      expect(notifications.jobNotifications.value).toEqual([])
      expect(notifications.unreadCount.value).toBe(0)
      expect(notifications.hasUnreadNotifications.value).toBe(false)
    })

    it('should handle notifications with identical timestamps', () => {
      // Arrange
      const timestamp = new Date().toISOString()
      const notif1 = createMockNotification({ id: 'same-time-1', createdAt: timestamp })
      const notif2 = createMockNotification({ id: 'same-time-2', createdAt: timestamp })

      const notifications = useJobNotifications()

      // Act
      notifications.jobNotifications.value = [notif1, notif2]

      // Assert
      expect(notifications.jobNotifications.value).toHaveLength(2)
      // Both should be treated equally in filtering operations
      const filtered = notifications.jobNotifications.value.filter(n => new Date(n.createdAt).getTime() > 0)
      expect(filtered).toHaveLength(2)
    })

    it('should handle notifications with future timestamps', async () => {
      // Arrange
      const futureTime = new Date(Date.now() + 60000).toISOString() // 1 minute in future
      const futureNotification = createMockNotification({
        notificationType: 'job_completed',
        createdAt: futureTime
      })

      mockAsyncJobsService.getNotifications.mockResolvedValue(
        createMockResponse([futureNotification], 1)
      )
      const notifications = useJobNotifications()

      // Act
      await notifications.fetchNotifications()

      // Assert - future notifications should still be shown (they're recent)
      expect(mockNotifications.success).toHaveBeenCalled()
    })

    it('should handle very large notification datasets', async () => {
      // Arrange
      const largeNotificationSet = Array.from({ length: 1000 }, (_, index) =>
        createMockNotification({
          id: `notif-${index}`,
          jobId: `job-${index}`,
          isRead: index % 2 === 0
        })
      )

      mockAsyncJobsService.getNotifications.mockResolvedValue(
        createMockResponse(largeNotificationSet, 500)
      )
      const notifications = useJobNotifications()

      // Act
      await notifications.fetchNotifications()

      // Assert
      expect(notifications.jobNotifications.value).toHaveLength(1000)
      expect(notifications.unreadCount.value).toBe(500)
      expect(notifications.unreadNotifications.value).toHaveLength(500)
    })
  })

  describe('memory management', () => {
    it('should properly clean up intervals on stop polling', async () => {
      // Arrange
      mockAsyncJobsService.getUnreadCount.mockResolvedValue({ count: 0 })
      const notifications = useJobNotifications()

      // Act
      await notifications.startPolling(1000)
      const intervalCountBefore = vi.getTimerCount()
      notifications.stopPolling()

      // Assert
      expect(notifications.isPolling.value).toBe(false)
      // Timer should be cleared
      vi.advanceTimersByTime(2000)
      const callCountAfterStop = mockAsyncJobsService.getUnreadCount.mock.calls.length
      expect(callCountAfterStop).toBe(1) // Only the initial call
    })

    it('should handle stop polling when not polling', () => {
      // Arrange
      const notifications = useJobNotifications()
      expect(notifications.isPolling.value).toBe(false)

      // Act - should not throw error
      notifications.stopPolling()

      // Assert
      expect(notifications.isPolling.value).toBe(false)
    })
  })
})