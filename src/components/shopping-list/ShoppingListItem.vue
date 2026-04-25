<script setup lang="ts">
import { computed, ref } from "vue";
import { useTranslation } from "@/composables/useTranslation";
import type { ShoppingListItem } from "@/types/shoppingList";

const { locale } = useTranslation();

const props = defineProps<{
  item: ShoppingListItem;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "toggle", item: ShoppingListItem): void;
  (e: "delete", item: ShoppingListItem): void;
  (e: "edit", item: ShoppingListItem): void;
  (e: "updateQuantity", item: ShoppingListItem, quantity: number): void;
}>();

const showQuantityControls = ref(false);

const displayName = computed(() => {
  const name = props.item.name || "(unnamed)";
  if (props.item.emoji) {
    return `${props.item.emoji} ${name}`;
  }
  return name;
});

const quantityText = computed(() => {
  if (!props.item.quantity) return null;
  return `x${props.item.quantity}`;
});

const priceText = computed(() => {
  if (!props.item.lastPrice) return null;
  const total = props.item.lastPrice * (props.item.quantity || 1);
  return new Intl.NumberFormat(locale.value, {
    style: "currency",
    currency: "EUR",
  }).format(total);
});

const handleToggle = () => {
  if (!props.disabled) {
    emit("toggle", props.item);
  }
};

const handleDelete = (e: Event) => {
  e.stopPropagation();
  if (!props.disabled) {
    emit("delete", props.item);
  }
};

const handleEdit = (e: Event) => {
  e.stopPropagation();
  if (!props.disabled) {
    emit("edit", props.item);
  }
};

const toggleQuantityControls = (e: Event) => {
  e.stopPropagation();
  if (!props.disabled) {
    showQuantityControls.value = !showQuantityControls.value;
  }
};

const incrementQuantity = (e: Event) => {
  e.stopPropagation();
  if (!props.disabled) {
    const currentQty = props.item.quantity || 1;
    emit("updateQuantity", props.item, currentQty + 1);
  }
};

const decrementQuantity = (e: Event) => {
  e.stopPropagation();
  if (!props.disabled) {
    const currentQty = props.item.quantity || 1;
    if (currentQty > 1) {
      emit("updateQuantity", props.item, currentQty - 1);
    }
  }
};

const closeQuantityControls = () => {
  showQuantityControls.value = false;
};
</script>

<template>
  <div
    @click="handleToggle"
    class="flex items-center gap-3 py-3 px-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    :class="{ 'opacity-50': disabled }"
  >
    <!-- Checkbox -->
    <div
      class="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
      :class="
        item.isChecked
          ? 'border-gray-400 bg-gray-400'
          : 'border-green-500 bg-green-500'
      "
    >
      <svg
        v-if="item.isChecked"
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 13l4 4L19 7"
        />
      </svg>
    </div>

    <!-- Item details -->
    <div class="flex-1 min-w-0">
      <span class="block truncate text-gray-900 dark:text-white">
        {{ displayName }}
      </span>
    </div>

    <!-- Quantity and Price -->
    <div class="flex-shrink-0 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <!-- Quantity controls (expanded) -->
      <div v-if="showQuantityControls" class="flex items-center gap-1" @click.stop>
        <button
          @click="decrementQuantity"
          :disabled="disabled || (item.quantity || 1) <= 1"
          class="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
          </svg>
        </button>
        <span class="w-8 text-center font-medium text-gray-900 dark:text-white">
          {{ item.quantity || 1 }}
        </span>
        <button
          @click="incrementQuantity"
          :disabled="disabled"
          class="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          @click="closeQuantityControls"
          class="ml-1 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
      <!-- Quantity display (collapsed) - clickable to edit -->
      <button
        v-else-if="quantityText"
        @click="toggleQuantityControls"
        class="px-2 py-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        :class="{ 'cursor-not-allowed opacity-50': disabled }"
        :disabled="disabled"
      >
        {{ quantityText }}
      </button>
      <span v-if="priceText" class="text-emerald-600 dark:text-emerald-400 font-medium">
        {{ priceText }}
      </span>
    </div>

    <!-- Edit button -->
    <button
      @click="handleEdit"
      class="flex-shrink-0 p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
      :disabled="disabled"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    </button>

    <!-- Delete button -->
    <button
      @click="handleDelete"
      class="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
      :disabled="disabled"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  </div>
</template>
