<template>
  <div class="relative">
    <!-- Custom input with localized display -->
    <div class="relative">
      <input
        :value="displayValue"
        type="text"
        :class="inputClass"
        readonly
        :placeholder="placeholder"
        @click="togglePicker"
        @focus="togglePicker"
      />
      <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
        </svg>
      </div>
    </div>

    <!-- Custom date picker dropdown -->
    <div
      v-if="showPicker"
      class="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 min-w-[260px]"
    >
      <!-- Month/Year navigation -->
      <div class="flex items-center justify-between mb-2">
        <button
          type="button"
          class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
          @click="previousMonth"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </button>

        <div class="text-sm font-medium text-gray-900 dark:text-white">
          {{ currentMonthName }} {{ currentYear }}
        </div>

        <button
          type="button"
          class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
          @click="nextMonth"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <!-- Day names header -->
      <div class="grid grid-cols-7 gap-0.5 mb-1">
        <div
          v-for="day in dayNames"
          :key="day"
          class="text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-0.5"
        >
          {{ day }}
        </div>
      </div>

      <!-- Calendar days -->
      <div class="grid grid-cols-7 gap-0.5">
        <button
          v-for="day in calendarDays"
          :key="`${day.date}-${day.month}`"
          type="button"
          :class="getDayClass(day)"
          @click="selectDate(day)"
        >
          {{ day.day }}
        </button>
      </div>

      <!-- Today button -->
      <div class="mt-2 pt-1.5 border-t border-gray-200 dark:border-gray-600">
        <button
          type="button"
          class="w-full px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
          @click="selectToday"
        >
          {{ todayButtonText }}
        </button>
      </div>
    </div>
  </div>

  <!-- Backdrop to close picker -->
  <div
    v-if="showPicker"
    class="fixed inset-0 z-40"
    @click="closePicker"
  ></div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateLocalization } from '@/composables/useDateLocalization'

interface Props {
  modelValue?: string
  class?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  class: 'input'
})

const emit = defineEmits<Emits>()

const { t, locale } = useI18n()
const { formatDate } = useDateLocalization()

const showPicker = ref(false)
const currentDate = ref(new Date())
const selectedDate = ref<Date | null>(null)

const inputClass = props.class

// Initialize selected date from modelValue
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    selectedDate.value = new Date(newValue)
    currentDate.value = new Date(newValue)
  }
}, { immediate: true })

// Create localized month names using i18n
const monthNames = computed(() => {
  return [
    t('datePicker.months.january'),
    t('datePicker.months.february'),
    t('datePicker.months.march'),
    t('datePicker.months.april'),
    t('datePicker.months.may'),
    t('datePicker.months.june'),
    t('datePicker.months.july'),
    t('datePicker.months.august'),
    t('datePicker.months.september'),
    t('datePicker.months.october'),
    t('datePicker.months.november'),
    t('datePicker.months.december')
  ]
})

// Create localized day names (abbreviated) using i18n
const dayNames = computed(() => {
  return [
    t('datePicker.weekdaysShort.0'),
    t('datePicker.weekdaysShort.1'),
    t('datePicker.weekdaysShort.2'),
    t('datePicker.weekdaysShort.3'),
    t('datePicker.weekdaysShort.4'),
    t('datePicker.weekdaysShort.5'),
    t('datePicker.weekdaysShort.6')
  ]
})

// Current month name
const currentMonthName = computed(() => {
  return monthNames.value[currentDate.value.getMonth()]
})

// Current year
const currentYear = computed(() => {
  return currentDate.value.getFullYear()
})

// Today button text using i18n
const todayButtonText = computed(() => {
  return t('datePicker.today')
})

// Placeholder text using i18n
const placeholder = computed(() => {
  return t('datePicker.placeholder')
})

// Display value with localized formatting
const displayValue = computed(() => {
  if (!props.modelValue) return ''
  try {
    return formatDate(props.modelValue)
  } catch (error) {
    return props.modelValue
  }
})

// Calendar days
const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()

  // First day of the month
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Get the day of week for the first day (0 = Sunday)
  let startDay = firstDay.getDay()

  const days = []

  // Add empty cells for days before the first day of month
  for (let i = 0; i < startDay; i++) {
    const prevDate = new Date(year, month, -(startDay - i - 1))
    days.push({
      day: prevDate.getDate(),
      date: prevDate,
      month: 'prev',
      isCurrentMonth: false,
      isSelected: false,
      isToday: false
    })
  }

  // Add days of current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    const today = new Date()

    days.push({
      day,
      date,
      month: 'current',
      isCurrentMonth: true,
      isSelected: selectedDate.value &&
        date.getFullYear() === selectedDate.value.getFullYear() &&
        date.getMonth() === selectedDate.value.getMonth() &&
        date.getDate() === selectedDate.value.getDate(),
      isToday: date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
    })
  }

  // Fill remaining cells with next month days
  const remainingCells = 42 - days.length // 6 rows × 7 days
  for (let day = 1; day <= remainingCells; day++) {
    const nextDate = new Date(year, month + 1, day)
    days.push({
      day,
      date: nextDate,
      month: 'next',
      isCurrentMonth: false,
      isSelected: false,
      isToday: false
    })
  }

  return days
})

// Day button classes
const getDayClass = (day: any) => {
  const baseClass = 'py-1 px-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'

  let classes = [baseClass]

  if (!day.isCurrentMonth) {
    classes.push('text-gray-400 dark:text-gray-500')
  } else {
    classes.push('text-gray-900 dark:text-white')
  }

  if (day.isSelected) {
    classes.push('bg-blue-500 text-white hover:bg-blue-600')
  }

  if (day.isToday && !day.isSelected) {
    classes.push('font-bold text-blue-500 dark:text-blue-400')
  }

  return classes.join(' ')
}

// Navigation methods
const previousMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

const nextMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}

// Date selection
const selectDate = (day: any) => {
  if (day.month !== 'current') {
    // If clicking on prev/next month day, navigate to that month
    if (day.month === 'prev') {
      previousMonth()
    } else {
      nextMonth()
    }
    return
  }

  selectedDate.value = new Date(day.date)
  const dateString = day.date.toISOString().split('T')[0]
  emit('update:modelValue', dateString)
  emit('change', dateString)
  closePicker()
}

const selectToday = () => {
  const today = new Date()
  selectedDate.value = today
  currentDate.value = new Date(today.getFullYear(), today.getMonth(), 1)
  const dateString = today.toISOString().split('T')[0]
  emit('update:modelValue', dateString)
  emit('change', dateString)
  closePicker()
}

// Picker control
const togglePicker = () => {
  showPicker.value = !showPicker.value
}

const closePicker = () => {
  showPicker.value = false
}

// Close picker on escape key
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closePicker()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>