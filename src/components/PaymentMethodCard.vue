<template>
  <div
    class="payment-method-card rounded-lg border p-4 transition-all"
    :class="{
      'border-shoptrack-500 bg-shoptrack-50 dark:bg-shoptrack-900/20': paymentMethod.isDefault,
      'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800': !paymentMethod.isDefault
    }"
  >
    <div class="flex items-start justify-between">
      <div class="flex items-start space-x-3">
        <!-- Payment method icon -->
        <div
          class="flex h-12 w-12 items-center justify-center rounded-lg"
          :class="{
            'bg-shoptrack-100 dark:bg-shoptrack-900/40': paymentMethod.isDefault,
            'bg-gray-100 dark:bg-gray-700': !paymentMethod.isDefault
          }"
        >
          <component :is="getIconComponent()" class="h-6 w-6" />
        </div>

        <!-- Payment method details -->
        <div class="flex-1">
          <div class="flex items-center space-x-2">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              {{ getCardBrandName() }}
              <span v-if="paymentMethod.last4" class="text-gray-500 dark:text-gray-400">
                •••• {{ paymentMethod.last4 }}
              </span>
            </h3>
            <span
              v-if="paymentMethod.isDefault"
              class="inline-flex items-center rounded-full bg-shoptrack-100 px-2.5 py-0.5 text-xs font-medium text-shoptrack-800 dark:bg-shoptrack-900/40 dark:text-shoptrack-200"
            >
              <svg
                class="mr-1 h-3 w-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              {{ $t('paymentMethods.default') }}
            </span>
          </div>

          <p v-if="paymentMethod.holderName" class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {{ paymentMethod.holderName }}
          </p>

          <p v-if="hasExpiry" class="mt-1 text-sm" :class="isExpired ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-500'">
            {{ $t('paymentMethods.expires') }}
            {{ formatExpiry() }}
            <span v-if="isExpired" class="font-medium">
              ({{ $t('paymentMethods.expired') }})
            </span>
          </p>

          <p v-if="hasBillingAddress" class="mt-1 text-sm text-gray-500 dark:text-gray-500">
            {{ formatBillingAddress() }}
          </p>
        </div>
      </div>

      <!-- Actions menu -->
      <div class="relative">
        <button
          @click="toggleMenu"
          class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          :aria-label="$t('paymentMethods.actions')"
        >
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        <!-- Dropdown menu -->
        <div
          v-if="menuOpen"
          v-click-outside="closeMenu"
          class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700"
        >
          <div class="py-1">
            <button
              v-if="!paymentMethod.isDefault"
              @click="handleSetDefault"
              class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ $t('paymentMethods.setAsDefault') }}
            </button>

            <button
              @click="handleEdit"
              class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {{ $t('common.edit') }}
            </button>

            <button
              @click="handleDelete"
              class="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <svg class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {{ $t('common.delete') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PaymentMethod } from '@/types/paymentMethod'

interface Props {
  paymentMethod: PaymentMethod
}

const props = defineProps<Props>()

const emit = defineEmits<{
  setDefault: [id: number]
  edit: [paymentMethod: PaymentMethod]
  delete: [id: number]
}>()

const menuOpen = ref(false)

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const closeMenu = () => {
  menuOpen.value = false
}

const handleSetDefault = () => {
  emit('setDefault', props.paymentMethod.id)
  closeMenu()
}

const handleEdit = () => {
  emit('edit', props.paymentMethod)
  closeMenu()
}

const handleDelete = () => {
  emit('delete', props.paymentMethod.id)
  closeMenu()
}

const getIconComponent = () => {
  // Return appropriate icon component based on type and brand
  // This is a placeholder - you can replace with actual icon logic
  return 'svg'
}

const getCardBrandName = () => {
  if (props.paymentMethod.brand) {
    return props.paymentMethod.brand.charAt(0).toUpperCase() + props.paymentMethod.brand.slice(1)
  }
  return props.paymentMethod.type.charAt(0).toUpperCase() + props.paymentMethod.type.slice(1)
}

const hasExpiry = computed(() => {
  return props.paymentMethod.expiryMonth && props.paymentMethod.expiryYear
})

const isExpired = computed(() => {
  if (!hasExpiry.value) return false

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  return (
    props.paymentMethod.expiryYear! < currentYear ||
    (props.paymentMethod.expiryYear === currentYear &&
      props.paymentMethod.expiryMonth! < currentMonth)
  )
})

const formatExpiry = () => {
  if (!hasExpiry.value) return ''
  return `${String(props.paymentMethod.expiryMonth).padStart(2, '0')}/${props.paymentMethod.expiryYear}`
}

const hasBillingAddress = computed(() => {
  return props.paymentMethod.billingCity || props.paymentMethod.billingState || props.paymentMethod.billingCountry
})

const formatBillingAddress = () => {
  const parts = [
    props.paymentMethod.billingCity,
    props.paymentMethod.billingState,
    props.paymentMethod.billingCountry
  ].filter(Boolean)

  return parts.join(', ')
}

// Click outside directive
const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value()
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el: HTMLElement & { clickOutsideEvent?: (event: Event) => void }) {
    if (el.clickOutsideEvent) {
      document.removeEventListener('click', el.clickOutsideEvent)
    }
  }
}
</script>

<style scoped>
.payment-method-card {
  transition: all 0.2s ease;
}

.payment-method-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
