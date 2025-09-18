import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LocalizedDateInput from '../LocalizedDateInput.vue'

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: vi.fn(() => ({
    t: vi.fn((key: string) => {
      const translations: Record<string, string> = {
        'datePicker.months.january': 'January',
        'datePicker.months.february': 'February',
        'datePicker.months.march': 'March',
        'datePicker.months.april': 'April',
        'datePicker.months.may': 'May',
        'datePicker.months.june': 'June',
        'datePicker.months.july': 'July',
        'datePicker.months.august': 'August',
        'datePicker.months.september': 'September',
        'datePicker.months.october': 'October',
        'datePicker.months.november': 'November',
        'datePicker.months.december': 'December',
        'datePicker.weekdaysShort.0': 'Sun',
        'datePicker.weekdaysShort.1': 'Mon',
        'datePicker.weekdaysShort.2': 'Tue',
        'datePicker.weekdaysShort.3': 'Wed',
        'datePicker.weekdaysShort.4': 'Thu',
        'datePicker.weekdaysShort.5': 'Fri',
        'datePicker.weekdaysShort.6': 'Sat',
        'datePicker.today': 'Today',
        'datePicker.placeholder': 'Select date'
      }
      return translations[key] || key
    }),
    locale: { value: 'en' }
  }))
}))

// Mock useDateLocalization composable
vi.mock('@/composables/useDateLocalization', () => ({
  useDateLocalization: vi.fn(() => ({
    formatDate: vi.fn((date: string) => {
      const d = new Date(date)
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
    })
  }))
}))

describe('LocalizedDateInput', () => {
  let wrapper: any
  let addEventListenerSpy: any
  let removeEventListenerSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    addEventListenerSpy = vi.spyOn(document, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  describe('Basic Rendering', () => {
    it('renders input field with calendar icon', () => {
      wrapper = mount(LocalizedDateInput)

      expect(wrapper.find('input[type="text"]').exists()).toBe(true)
      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('input').attributes('readonly')).toBe('')
      expect(wrapper.find('input').attributes('placeholder')).toBe('Select date')
    })

    it('renders with custom class', () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          class: 'custom-input-class'
        }
      })

      expect(wrapper.find('input').classes()).toContain('custom-input-class')
    })

    it('displays formatted date when modelValue is provided', () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: '2024-03-15'
        }
      })

      expect(wrapper.find('input').element.value).toBe('3/15/2024')
    })

    it('displays empty input when no modelValue', () => {
      wrapper = mount(LocalizedDateInput)

      expect(wrapper.find('input').element.value).toBe('')
    })
  })

  describe('Date Picker Interaction', () => {
    it('opens date picker on input click', async () => {
      wrapper = mount(LocalizedDateInput)

      expect(wrapper.find('.absolute.z-50').exists()).toBe(false)

      await wrapper.find('input').trigger('click')

      expect(wrapper.find('.absolute.z-50').exists()).toBe(true)
      expect(wrapper.find('.backdrop').exists()).toBe(true)
    })

    it('opens date picker on input focus', async () => {
      wrapper = mount(LocalizedDateInput)

      await wrapper.find('input').trigger('focus')

      expect(wrapper.find('.absolute.z-50').exists()).toBe(true)
    })

    it('closes date picker when backdrop is clicked', async () => {
      wrapper = mount(LocalizedDateInput)

      await wrapper.find('input').trigger('click')
      expect(wrapper.find('.absolute.z-50').exists()).toBe(true)

      await wrapper.find('.fixed.inset-0').trigger('click')

      expect(wrapper.find('.absolute.z-50').exists()).toBe(false)
    })

    it('closes date picker on escape key', async () => {
      wrapper = mount(LocalizedDateInput)

      await wrapper.find('input').trigger('click')
      expect(wrapper.find('.absolute.z-50').exists()).toBe(true)

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)
      await nextTick()

      expect(wrapper.find('.absolute.z-50').exists()).toBe(false)
    })
  })

  describe('Calendar Display', () => {
    it('displays month and year navigation', async () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: '2024-03-15'
        }
      })

      await wrapper.find('input').trigger('click')

      const header = wrapper.find('.text-sm.font-medium')
      expect(header.text()).toBe('March 2024')

      expect(wrapper.findAll('button')[0].find('svg').exists()).toBe(true) // Previous button
      expect(wrapper.findAll('button')[1].find('svg').exists()).toBe(true) // Next button
    })

    it('displays weekday names', async () => {
      wrapper = mount(LocalizedDateInput)

      await wrapper.find('input').trigger('click')

      const weekdays = wrapper.findAll('.text-xs.font-medium.text-gray-500')
      expect(weekdays).toHaveLength(7)
      expect(weekdays[0].text()).toBe('Sun')
      expect(weekdays[1].text()).toBe('Mon')
      expect(weekdays[6].text()).toBe('Sat')
    })

    it('displays calendar days grid', async () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: '2024-03-15'
        }
      })

      await wrapper.find('input').trigger('click')

      const dayButtons = wrapper.findAll('.grid.grid-cols-7 button')
      expect(dayButtons.length).toBeGreaterThan(28) // At least a month's worth of days
      expect(dayButtons.length).toBeLessThanOrEqual(42) // Max 6 weeks * 7 days
    })

    it('highlights selected date', async () => {
      const date = '2024-03-15'
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: date
        }
      })

      await wrapper.find('input').trigger('click')

      const selectedDay = wrapper.find('.bg-blue-500.text-white')
      expect(selectedDay.exists()).toBe(true)
      expect(selectedDay.text()).toBe('15')
    })

    it('highlights today with special styling', async () => {
      const today = new Date()
      const todayString = today.toISOString().split('T')[0]

      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: todayString
        }
      })

      await wrapper.find('input').trigger('click')

      // Today should have blue text if not selected
      const todayElement = wrapper.find('.font-bold.text-blue-500, .bg-blue-500')
      expect(todayElement.exists()).toBe(true)
    })

    it('shows Today button', async () => {
      wrapper = mount(LocalizedDateInput)

      await wrapper.find('input').trigger('click')

      const todayButton = wrapper.find('button.bg-blue-500')
      expect(todayButton.exists()).toBe(true)
      expect(todayButton.text()).toBe('Today')
    })
  })

  describe('Month Navigation', () => {
    it('navigates to previous month', async () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: '2024-03-15'
        }
      })

      await wrapper.find('input').trigger('click')

      const header = wrapper.find('.text-sm.font-medium')
      expect(header.text()).toBe('March 2024')

      const prevButton = wrapper.findAll('button')[0]
      await prevButton.trigger('click')

      expect(header.text()).toBe('February 2024')
    })

    it('navigates to next month', async () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: '2024-03-15'
        }
      })

      await wrapper.find('input').trigger('click')

      const header = wrapper.find('.text-sm.font-medium')
      expect(header.text()).toBe('March 2024')

      const nextButton = wrapper.findAll('button')[1]
      await nextButton.trigger('click')

      expect(header.text()).toBe('April 2024')
    })

    it('handles year transition when navigating months', async () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: '2024-12-15'
        }
      })

      await wrapper.find('input').trigger('click')

      const header = wrapper.find('.text-sm.font-medium')
      expect(header.text()).toBe('December 2024')

      const nextButton = wrapper.findAll('button')[1]
      await nextButton.trigger('click')

      expect(header.text()).toBe('January 2025')
    })
  })

  describe('Date Selection', () => {
    it('emits update:modelValue when date is selected', async () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: '2024-03-15'
        }
      })

      await wrapper.find('input').trigger('click')

      const dayButtons = wrapper.findAll('.grid.grid-cols-7 button')
      const dayToSelect = dayButtons.find((btn: any) =>
        btn.text() === '20' && !btn.classes().includes('text-gray-400')
      )

      await dayToSelect.trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0]).toEqual(['2024-03-20'])
      expect(wrapper.emitted('change')).toBeTruthy()
      expect(wrapper.emitted('change')[0]).toEqual(['2024-03-20'])
    })

    it('closes picker after date selection', async () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: '2024-03-15'
        }
      })

      await wrapper.find('input').trigger('click')
      expect(wrapper.find('.absolute.z-50').exists()).toBe(true)

      const dayButtons = wrapper.findAll('.grid.grid-cols-7 button')
      const dayToSelect = dayButtons.find((btn: any) =>
        btn.text() === '20' && !btn.classes().includes('text-gray-400')
      )

      await dayToSelect.trigger('click')

      expect(wrapper.find('.absolute.z-50').exists()).toBe(false)
    })

    it('selects today when Today button is clicked', async () => {
      wrapper = mount(LocalizedDateInput)

      await wrapper.find('input').trigger('click')

      const todayButton = wrapper.find('button.bg-blue-500')
      await todayButton.trigger('click')

      const today = new Date()
      const expectedDate = today.toISOString().split('T')[0]

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([expectedDate])
      expect(wrapper.emitted('change')).toBeTruthy()
      expect(wrapper.emitted('change')[0]).toEqual([expectedDate])
      expect(wrapper.find('.absolute.z-50').exists()).toBe(false)
    })

    it('navigates to previous month when clicking prev month day', async () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: '2024-03-15'
        }
      })

      await wrapper.find('input').trigger('click')

      const prevMonthDay = wrapper.find('.text-gray-400 button')
      await prevMonthDay.trigger('click')

      const header = wrapper.find('.text-sm.font-medium')
      expect(header.text()).toBe('February 2024')
    })

    it('navigates to next month when clicking next month day', async () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: '2024-03-15'
        }
      })

      await wrapper.find('input').trigger('click')

      const dayButtons = wrapper.findAll('.grid.grid-cols-7 button')
      const nextMonthDay = dayButtons.filter((btn: any) =>
        btn.classes().includes('text-gray-400')
      ).at(-1)

      await nextMonthDay.trigger('click')

      const header = wrapper.find('.text-sm.font-medium')
      expect(header.text()).toBe('April 2024')
    })
  })

  describe('Calendar Grid Generation', () => {
    it('generates correct number of days for the month', async () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: '2024-02-15' // February with 29 days (leap year)
        }
      })

      await wrapper.find('input').trigger('click')

      const dayButtons = wrapper.findAll('.grid.grid-cols-7 button')
      const currentMonthDays = dayButtons.filter((btn: any) =>
        !btn.classes().includes('text-gray-400')
      )

      expect(currentMonthDays).toHaveLength(29)
    })

    it('fills grid with previous and next month days', async () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: '2024-03-15'
        }
      })

      await wrapper.find('input').trigger('click')

      const dayButtons = wrapper.findAll('.grid.grid-cols-7 button')
      expect(dayButtons).toHaveLength(42) // 6 weeks * 7 days

      const otherMonthDays = dayButtons.filter((btn: any) =>
        btn.classes().includes('text-gray-400')
      )
      expect(otherMonthDays.length).toBeGreaterThan(0)
    })
  })

  describe('Styling and Classes', () => {
    it('applies correct classes to current month days', async () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: '2024-03-15'
        }
      })

      await wrapper.find('input').trigger('click')

      const currentMonthDay = wrapper.findAll('.grid.grid-cols-7 button')
        .find((btn: any) => btn.text() === '10' && !btn.classes().includes('text-gray-400'))

      expect(currentMonthDay.classes()).toContain('text-gray-900')
    })

    it('applies correct classes to other month days', async () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: '2024-03-15'
        }
      })

      await wrapper.find('input').trigger('click')

      const otherMonthDay = wrapper.find('.text-gray-400 button')
      expect(otherMonthDay.exists()).toBe(true)
    })

    it('applies hover styles to day buttons', async () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: '2024-03-15'
        }
      })

      await wrapper.find('input').trigger('click')

      const dayButton = wrapper.findAll('.grid.grid-cols-7 button')[15]
      expect(dayButton.classes()).toContain('hover:bg-gray-100')
    })
  })

  describe('Edge Cases', () => {
    it('handles invalid date in modelValue gracefully', () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: 'invalid-date'
        }
      })

      expect(wrapper.find('input').element.value).toBe('invalid-date')
    })

    it('handles empty modelValue', () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: ''
        }
      })

      expect(wrapper.find('input').element.value).toBe('')
    })

    it('updates when modelValue changes externally', async () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: '2024-03-15'
        }
      })

      expect(wrapper.find('input').element.value).toBe('3/15/2024')

      await wrapper.setProps({ modelValue: '2024-04-20' })

      expect(wrapper.find('input').element.value).toBe('4/20/2024')
    })
  })

  describe('Lifecycle', () => {
    it('sets up keydown event listener on mount', () => {
      wrapper = mount(LocalizedDateInput)

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('removes keydown event listener on unmount', () => {
      wrapper = mount(LocalizedDateInput)
      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })
  })

  describe('Accessibility', () => {
    it('has readonly input to prevent direct typing', () => {
      wrapper = mount(LocalizedDateInput)

      const input = wrapper.find('input')
      expect(input.attributes('readonly')).toBe('')
    })

    it('provides visual feedback for selected date', async () => {
      wrapper = mount(LocalizedDateInput, {
        props: {
          modelValue: '2024-03-15'
        }
      })

      await wrapper.find('input').trigger('click')

      const selectedDay = wrapper.find('.bg-blue-500.text-white')
      expect(selectedDay.exists()).toBe(true)
    })

    it('provides navigation buttons with clear icons', async () => {
      wrapper = mount(LocalizedDateInput)

      await wrapper.find('input').trigger('click')

      const navButtons = wrapper.findAll('button').filter((btn: any) =>
        btn.find('svg').exists()
      )
      expect(navButtons.length).toBeGreaterThanOrEqual(2)
    })
  })
})