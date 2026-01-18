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
      class="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 min-w-[280px]"
    >
      <!-- Year Selector View -->
      <div v-if="pickerView === 'year'">
        <!-- Year range navigation -->
        <div class="flex items-center justify-between mb-3">
          <button
            type="button"
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
            @click="previousYearRange"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </button>

          <div class="text-sm font-medium text-gray-900 dark:text-white">
            {{ yearRangeStart }} - {{ yearRangeEnd }}
          </div>

          <button
            type="button"
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
            @click="nextYearRange"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <!-- Year grid -->
        <div class="grid grid-cols-4 gap-1">
          <button
            v-for="year in yearRange"
            :key="year"
            type="button"
            :class="[
              'py-2 px-1 text-sm rounded transition-colors',
              year === currentYear
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700',
              year === new Date().getFullYear() && year !== currentYear
                ? 'font-bold text-blue-500 dark:text-blue-400'
                : ''
            ]"
            @click="selectYear(year)"
          >
            {{ year }}
          </button>
        </div>
      </div>

      <!-- Month Selector View -->
      <div v-else-if="pickerView === 'month'">
        <!-- Year navigation in month view -->
        <div class="flex items-center justify-between mb-3">
          <button
            type="button"
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
            @click="previousYear"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            class="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-500 dark:hover:text-blue-400"
            @click="pickerView = 'year'"
          >
            {{ currentYear }}
          </button>

          <button
            type="button"
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
            @click="nextYear"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <!-- Month grid -->
        <div class="grid grid-cols-3 gap-1">
          <button
            v-for="(monthName, index) in monthNames"
            :key="index"
            type="button"
            :class="[
              'py-2 px-1 text-sm rounded transition-colors',
              index === currentDate.getMonth()
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            ]"
            @click="selectMonth(index)"
          >
            {{ monthName.substring(0, 3) }}
          </button>
        </div>
      </div>

      <!-- Day Selector View (default) -->
      <div v-else>
        <!-- Month/Year navigation -->
        <div class="flex items-center justify-between mb-2">
          <!-- Previous year button -->
          <button
            type="button"
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
            :title="t('datePicker.previousYear')"
            @click="previousYear"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M15.707 4.293a1 1 0 010 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0zm-6 0a1 1 0 010 1.414L5.414 10l4.293 4.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </button>

          <!-- Previous month button -->
          <button
            type="button"
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
            :title="t('datePicker.previousMonth')"
            @click="previousMonth"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </button>

          <!-- Clickable month/year -->
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-500 dark:hover:text-blue-400"
              @click="pickerView = 'month'"
            >
              {{ currentMonthName }}
            </button>
            <button
              type="button"
              class="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-500 dark:hover:text-blue-400"
              @click="pickerView = 'year'"
            >
              {{ currentYear }}
            </button>
          </div>

          <!-- Next month button -->
          <button
            type="button"
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
            :title="t('datePicker.nextMonth')"
            @click="nextMonth"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </button>

          <!-- Next year button -->
          <button
            type="button"
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
            :title="t('datePicker.nextYear')"
            @click="nextYear"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0zm6 0a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clip-rule="evenodd" />
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
            :disabled="isDateDisabled(new Date())"
            :class="[
              'w-full px-3 py-1.5 text-sm rounded transition-colors',
              isDateDisabled(new Date())
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            ]"
            @click="selectToday"
          >
            {{ todayButtonText }}
          </button>
        </div>
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
import { useTranslation } from '@/composables/useTranslation'
import { useDateLocalization } from '@/composables/useDateLocalization'

interface Props {
  modelValue?: string
  class?: string
  minDate?: string
  maxDate?: string
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

const { t, locale } = useTranslation()
const { formatDate } = useDateLocalization()

const showPicker = ref(false)
const currentDate = ref(new Date())
const selectedDate = ref<Date | null>(null)
const pickerView = ref<'day' | 'month' | 'year'>('day')
const yearRangeStart = ref(Math.floor(new Date().getFullYear() / 12) * 12)

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

// Year range for year selector (12 years at a time)
const yearRange = computed(() => {
  const years = []
  for (let i = 0; i < 12; i++) {
    years.push(yearRangeStart.value + i)
  }
  return years
})

const yearRangeEnd = computed(() => {
  return yearRangeStart.value + 11
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

// Check if a date is disabled based on min/max constraints
const isDateDisabled = (date: Date) => {
  if (props.minDate) {
    const minDate = new Date(props.minDate)
    if (date < minDate) return true
  }

  if (props.maxDate) {
    const maxDate = new Date(props.maxDate)
    if (date > maxDate) return true
  }

  return false
}

// Day button classes
const getDayClass = (day: any) => {
  const baseClass = 'py-1 px-1.5 text-sm rounded transition-colors'
  const isDisabled = isDateDisabled(day.date)

  let classes = [baseClass]

  if (isDisabled) {
    classes.push('text-gray-300 dark:text-gray-600 cursor-not-allowed bg-gray-50 dark:bg-gray-800')
  } else {
    classes.push('hover:bg-gray-100 dark:hover:bg-gray-700')

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

const previousYear = () => {
  currentDate.value = new Date(currentDate.value.getFullYear() - 1, currentDate.value.getMonth(), 1)
}

const nextYear = () => {
  currentDate.value = new Date(currentDate.value.getFullYear() + 1, currentDate.value.getMonth(), 1)
}

const previousYearRange = () => {
  yearRangeStart.value -= 12
}

const nextYearRange = () => {
  yearRangeStart.value += 12
}

// Year/Month selection
const selectYear = (year: number) => {
  currentDate.value = new Date(year, currentDate.value.getMonth(), 1)
  pickerView.value = 'month'
}

const selectMonth = (month: number) => {
  currentDate.value = new Date(currentDate.value.getFullYear(), month, 1)
  pickerView.value = 'day'
}

// Format date to YYYY-MM-DD using local timezone (not UTC)
const formatDateToString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Date selection
const selectDate = (day: any) => {
  // Prevent selection of disabled dates
  if (isDateDisabled(day.date)) {
    return
  }

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
  const dateString = formatDateToString(day.date)
  emit('update:modelValue', dateString)
  emit('change', dateString)
  closePicker()
}

const selectToday = () => {
  const today = new Date()

  // Don't select today if it's disabled
  if (isDateDisabled(today)) {
    return
  }

  selectedDate.value = today
  currentDate.value = new Date(today.getFullYear(), today.getMonth(), 1)
  const dateString = formatDateToString(today)
  emit('update:modelValue', dateString)
  emit('change', dateString)
  closePicker()
}

// Picker control
const togglePicker = () => {
  if (!showPicker.value) {
    // Reset to day view and update year range when opening
    pickerView.value = 'day'
    yearRangeStart.value = Math.floor(currentDate.value.getFullYear() / 12) * 12
  }
  showPicker.value = !showPicker.value
}

const closePicker = () => {
  showPicker.value = false
  pickerView.value = 'day'
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