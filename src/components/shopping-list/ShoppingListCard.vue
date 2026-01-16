<script setup lang="ts">
import { computed } from "vue";
import { useTranslation } from "@/composables/useTranslation";
import type { LocalShoppingList } from "@/types/shoppingList";

const props = defineProps<{
  list: LocalShoppingList;
}>();

const emit = defineEmits<{
  (e: "select", list: LocalShoppingList): void;
  (e: "delete", list: LocalShoppingList): void;
}>();

const { t } = useTranslation();

const progressPercent = computed(() => {
  if (props.list.totalItems === 0) return 0;
  const unchecked = props.list.totalItems - props.list.checkedItems;
  return Math.round((unchecked / props.list.totalItems) * 100);
});

const progressText = computed(() => {
  const unchecked = props.list.totalItems - props.list.checkedItems;
  return `${unchecked}/${props.list.totalItems}`;
});

const statusBadge = computed(() => {
  if (props.list.syncStatus === "pending") {
    return { text: t("shoppingList.status.pending"), class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" };
  }
  if (props.list.syncStatus === "error") {
    return { text: t("shoppingList.status.error"), class: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
  }
  if (props.list.status === "completed") {
    return { text: t("shoppingList.status.completed"), class: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
  }
  return null;
});

const formattedDate = computed(() => {
  const date = new Date(props.list.updatedAt);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
});

const handleClick = () => {
  emit("select", props.list);
};

const handleDelete = (e: Event) => {
  e.stopPropagation();
  emit("delete", props.list);
};
</script>

<template>
  <div
    @click="handleClick"
    class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-shadow"
  >
    <div class="flex items-start justify-between mb-3">
      <div class="flex-1 min-w-0">
        <h3 class="font-medium text-gray-900 dark:text-white truncate">
          {{ list.name }}
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ formattedDate }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <span
          v-if="statusBadge"
          class="text-xs px-2 py-0.5 rounded-full"
          :class="statusBadge.class"
        >
          {{ statusBadge.text }}
        </span>

        <button
          @click="handleDelete"
          class="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
          :title="t('common.delete')"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="mb-2">
      <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>{{ t("shoppingList.card.progress") }}</span>
        <span>{{ progressText }}</span>
      </div>
      <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          class="h-full bg-primary-500 rounded-full transition-all duration-300"
          :style="{ width: `${progressPercent}%` }"
        ></div>
      </div>
    </div>

    <p class="text-sm text-gray-600 dark:text-gray-300">
      {{ t("shoppingList.card.items", { count: list.totalItems }) }}
    </p>
  </div>
</template>
