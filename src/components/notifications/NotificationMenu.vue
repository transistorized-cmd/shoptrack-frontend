<template>
  <div class="relative" ref="dropdownRef">
    <!-- Notification Button -->
    <button
      @click="toggleMenu"
      class="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg transition-colors"
      :class="{ 'bg-gray-100 dark:bg-gray-700': isOpen }"
    >
      <!-- Bell Icon -->
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      
      <!-- Badge -->
      <span
        v-if="hasUnreadNotifications && unreadCount > 0"
        class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
        :class="{ 'animate-pulse': hasNewNotifications }"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="transform opacity-0 scale-95 translate-y-2"
      enter-to-class="transform opacity-100 scale-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="transform opacity-100 scale-100 translate-y-0"
      leave-to-class="transform opacity-0 scale-95 translate-y-2"
    >
      <div
        v-if="isOpen"
        class="fixed sm:absolute inset-x-4 sm:inset-x-auto top-16 sm:top-full sm:mt-2 sm:right-0 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50"
      >
        <!-- Header -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ $t('notifications.title') || 'Notifications' }}
          </h3>
          <div class="flex items-center space-x-2">
            <button
              v-if="hasUnreadNotifications"
              @click="markAllRead"
              :disabled="markingAllAsRead"
              class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50"
            >
              {{ markingAllAsRead ? 'Marking...' : ($t('notifications.markAllRead') || 'Mark all read') }}
            </button>
            <button
              @click="refreshNotifications"
              :disabled="isRefreshing"
              class="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50"
              :class="{ 'animate-spin': isRefreshing }"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="max-h-96 overflow-y-auto">
          <!-- Loading State -->
          <div v-if="isLoading" class="p-6 text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {{ $t('notifications.loading') || 'Loading notifications...' }}
            </p>
          </div>

          <!-- Empty State -->
          <div v-else-if="jobNotifications.length === 0" class="p-6 text-center">
            <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p class="text-gray-500 dark:text-gray-400">
              {{ $t('notifications.empty') || 'No notifications yet' }}
            </p>
          </div>

          <!-- Notification List -->
          <div v-else class="py-2">
            <div
              v-for="notification in displayedNotifications"
              :key="notification.id"
              class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-l-4 transition-colors"
              :class="[
                getNotificationBorderClass(notification),
                { 'bg-blue-50 dark:bg-blue-900/10': !notification.isRead }
              ]"
            >
              <div class="flex items-start space-x-3">
                <!-- Icon -->
                <div class="flex-shrink-0 pt-1">
                  <div 
                    class="w-2 h-2 rounded-full"
                    :class="getNotificationDotClass(notification)"
                  />
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h4 
                        class="text-sm font-medium truncate"
                        :class="notification.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-900 dark:text-white font-semibold'"
                      >
                        {{ notification.title }}
                      </h4>
                      <p 
                        v-if="notification.message"
                        class="text-sm mt-1 line-clamp-2"
                        :class="notification.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'"
                      >
                        {{ notification.message }}
                      </p>
                      
                      <!-- Job Data -->
                      <div
                        v-if="notification.data"
                        class="mt-2 text-xs text-gray-500 dark:text-gray-400"
                      >
                        <span v-if="notification.data && notification.data.jobId" class="font-mono">
                          Job: {{ notification.data.jobId.slice(-8) }}
                        </span>
                        <span v-if="notification.data && notification.data.filename" class="ml-2">
                          📄 {{ notification.data.filename }}
                        </span>
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center space-x-2 ml-2">
                      <span class="text-xs text-gray-400 dark:text-gray-500">
                        {{ formatNotificationTime(notification.createdAt) }}
                      </span>
                      <button
                        v-if="!notification.isRead"
                        @click="markAsRead(notification.id)"
                        class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {{ $t('notifications.markRead') || 'Mark read' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Load More -->
          <div v-if="hasMoreNotifications" class="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              @click="loadMoreNotifications"
              :disabled="isLoadingMore"
              class="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50"
            >
              {{ isLoadingMore ? 'Loading...' : ($t('notifications.loadMore') || 'Load more notifications') }}
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 rounded-b-lg">
          <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{{ jobNotifications.length }} notifications</span>
            <div class="flex items-center space-x-3">
              <button
                v-if="jobNotifications.some(n => n.isRead)"
                @click="clearReadNotifications"
                class="hover:text-gray-700 dark:hover:text-gray-300"
              >
                {{ $t('notifications.clearRead') || 'Clear read' }}
              </button>
              <div class="flex items-center space-x-1">
                <div 
                  class="w-2 h-2 rounded-full"
                  :class="isPolling ? 'bg-green-500 animate-pulse' : 'bg-gray-400'"
                />
                <span>{{ isPolling ? 'Live' : 'Offline' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useJobNotifications } from '@/composables/useJobNotifications'
import { useDateLocalization } from '@/composables/useDateLocalization'

const props = defineProps<{
  maxDisplay?: number
}>()

const {
  jobNotifications,
  unreadCount,
  hasUnreadNotifications,
  isPolling,
  fetchNotifications,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  startPolling,
  stopPolling
} = useJobNotifications()

const { formatDate: formatDateSafe } = useDateLocalization()

// Component state
const isOpen = ref(false)
const isLoading = ref(false)
const isRefreshing = ref(false)
const isLoadingMore = ref(false)
const markingAllAsRead = ref(false)
const dropdownRef = ref<HTMLElement>()
const hasNewNotifications = ref(false)
const displayLimit = ref(10)

// Computed properties
const displayedNotifications = computed(() => 
  jobNotifications.value.slice(0, displayLimit.value)
)

const hasMoreNotifications = computed(() => 
  jobNotifications.value.length > displayLimit.value
)

// Methods
const toggleMenu = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value && jobNotifications.value.length === 0) {
    loadInitialNotifications()
  }
}

const loadInitialNotifications = async () => {
  isLoading.value = true
  try {
    await fetchNotifications({ limit: displayLimit.value })
  } catch (error) {
    console.error('Failed to load notifications:', error)
  } finally {
    isLoading.value = false
  }
}

const refreshNotifications = async () => {
  isRefreshing.value = true
  try {
    await fetchNotifications({ limit: displayLimit.value })
  } catch (error) {
    console.error('Failed to refresh notifications:', error)
  } finally {
    isRefreshing.value = false
  }
}

const loadMoreNotifications = async () => {
  isLoadingMore.value = true
  try {
    await fetchNotifications({ 
      limit: displayLimit.value + 10,
      offset: displayLimit.value 
    })
    displayLimit.value += 10
  } catch (error) {
    console.error('Failed to load more notifications:', error)
  } finally {
    isLoadingMore.value = false
  }
}

const markAllRead = async () => {
  markingAllAsRead.value = true
  try {
    await markAllAsRead()
  } catch (error) {
    console.error('Failed to mark all as read:', error)
  } finally {
    markingAllAsRead.value = false
  }
}

const clearReadNotifications = () => {
  // Filter out read notifications from display
  // This is a local operation, server cleanup happens automatically
  const readIds = jobNotifications.value
    .filter(n => n.isRead)
    .map(n => n.id)
  
  // Remove from local array
  jobNotifications.value = jobNotifications.value.filter(n => !n.isRead)
}

// Mark all currently visible unread notifications as read (useful for bulk operations)
const markVisibleUnreadAsRead = async () => {
  const visibleUnreadIds = displayedNotifications.value
    .filter(n => !n.isRead)
    .map(n => n.id)
  
  if (visibleUnreadIds.length > 0) {
    try {
      await markMultipleAsRead(visibleUnreadIds)
    } catch (error) {
      console.error('Failed to mark visible notifications as read:', error)
    }
  }
}

const getNotificationBorderClass = (notification: any) => {
  switch (notification.notificationType) {
    case 'job_completed':
      return 'border-green-500'
    case 'job_failed':
      return 'border-red-500'
    case 'job_retry':
      return 'border-yellow-500'
    case 'job_cancelled':
      return 'border-gray-500'
    default:
      return 'border-blue-500'
  }
}

const getNotificationDotClass = (notification: any) => {
  if (!notification.isRead) {
    switch (notification.notificationType) {
      case 'job_completed':
        return 'bg-green-500'
      case 'job_failed':
        return 'bg-red-500'
      case 'job_retry':
        return 'bg-yellow-500'
      case 'job_cancelled':
        return 'bg-gray-500'
      default:
        return 'bg-blue-500'
    }
  }
  return 'bg-gray-300 dark:bg-gray-600'
}

const formatNotificationTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return formatDateSafe(timestamp)
}

// Click outside to close
const handleClickOutside = (event: Event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

// Watch for new notifications
watch(
  () => unreadCount.value,
  (newCount, oldCount) => {
    if (newCount > oldCount && oldCount !== undefined) {
      hasNewNotifications.value = true
      setTimeout(() => {
        hasNewNotifications.value = false
      }, 3000)
    }
  }
)

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  
  // Load initial unread count
  if (!isPolling.value) {
    startPolling()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.group:hover .group-hover\:opacity-100 {
  opacity: 1;
}
</style>