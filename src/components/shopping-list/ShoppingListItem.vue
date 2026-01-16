<script setup lang="ts">
import { computed } from "vue";
import type { ShoppingListItem } from "@/types/shoppingList";

const props = defineProps<{
  item: ShoppingListItem;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "toggle", item: ShoppingListItem): void;
  (e: "delete", item: ShoppingListItem): void;
}>();

const displayName = computed(() => {
  if (props.item.emoji) {
    return `${props.item.emoji} ${props.item.name}`;
  }
  return props.item.name;
});

const quantityText = computed(() => {
  if (!props.item.quantity) return null;
  return `x${props.item.quantity}`;
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

    <!-- Quantity -->
    <span
      v-if="quantityText"
      class="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400"
    >
      {{ quantityText }}
    </span>

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
