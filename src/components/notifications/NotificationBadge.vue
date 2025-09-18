<template>
  <div class="relative">
    <!-- Badge Icon -->
    <svg 
      class="w-6 h-6 text-gray-600 dark:text-gray-300"
      :class="iconClass"
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        stroke-width="2" 
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
    
    <!-- Notification Count -->
    <span
      v-if="hasUnreadNotifications && unreadCount > 0"
      class="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1"
      :class="[
        badgeClass,
        { 'animate-pulse': animate && hasNewNotifications }
      ]"
    >
      {{ displayCount }}
    </span>

    <!-- Pulsing Dot for No Count -->
    <span
      v-else-if="hasUnreadNotifications && showDot"
      class="absolute -top-1 -right-1 bg-red-500 rounded-full w-3 h-3 animate-pulse"
      :class="dotClass"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useJobNotifications } from '@/composables/useJobNotifications'

interface Props {
  iconClass?: string
  badgeClass?: string
  dotClass?: string
  maxCount?: number
  showDot?: boolean
  animate?: boolean
  autoStart?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  iconClass: '',
  badgeClass: '',
  dotClass: '',
  maxCount: 99,
  showDot: false,
  animate: true,
  autoStart: true
})

const { 
  unreadCount, 
  hasUnreadNotifications,
  startPolling,
  isPolling
} = useJobNotifications()

const hasNewNotifications = ref(false)

const displayCount = computed(() => {
  if (unreadCount.value > props.maxCount) {
    return `${props.maxCount}+`
  }
  return unreadCount.value.toString()
})

// Watch for new notifications to trigger animation
watch(
  () => unreadCount.value,
  (newCount, oldCount) => {
    if (props.animate && newCount > oldCount && oldCount !== undefined) {
      hasNewNotifications.value = true
      setTimeout(() => {
        hasNewNotifications.value = false
      }, 2000) // Animation duration
    }
  }
)

onMounted(() => {
  if (props.autoStart && !isPolling.value) {
    startPolling()
  }
})
</script>