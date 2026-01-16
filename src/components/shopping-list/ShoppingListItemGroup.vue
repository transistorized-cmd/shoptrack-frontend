<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useTranslation } from "@/composables/useTranslation";
import { useCategoriesStore } from "@/stores/categories";
import type { ShoppingListCategoryGroup, ShoppingListItem } from "@/types/shoppingList";
import ShoppingListItemComponent from "./ShoppingListItem.vue";

const props = defineProps<{
  group: ShoppingListCategoryGroup;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "toggle", item: ShoppingListItem): void;
  (e: "delete", item: ShoppingListItem): void;
}>();

const { t, locale } = useTranslation();
const categoriesStore = useCategoriesStore();

// Auto-collapse groups where all items are in cart (unchecked)
const isCollapsed = ref(props.group.allUnchecked);

const capitalizeCategory = (str: string) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const displayCategory = computed(() => {
  // Try to get translated category name from categories store
  const translatedName = categoriesStore.getNameByKey(props.group.category, locale.value);
  const category = translatedName || capitalizeCategory(props.group.category);
  if (props.group.emoji) {
    return `${props.group.emoji} ${category}`;
  }
  return category;
});

// Fetch categories for current locale on mount
onMounted(async () => {
  if (!categoriesStore.byLocale[locale.value]) {
    await categoriesStore.fetchCategories(locale.value);
  }
});

// Watch for locale changes and fetch categories
watch(locale, async (newLocale) => {
  if (!categoriesStore.byLocale[newLocale]) {
    await categoriesStore.fetchCategories(newLocale);
  }
});

const checkedCount = computed(() => {
  return props.group.items.filter((i) => i.isChecked).length;
});

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

const handleToggle = (item: ShoppingListItem) => {
  emit("toggle", item);
};

const handleDelete = (item: ShoppingListItem) => {
  emit("delete", item);
};
</script>

<template>
  <div class="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
    <!-- Category header -->
    <button
      @click="toggleCollapse"
      class="w-full flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
    >
      <div class="flex items-center gap-2">
        <span class="font-medium text-gray-700 dark:text-gray-300">
          {{ displayCategory }}
        </span>
        <span class="text-sm text-gray-500 dark:text-gray-400">
          ({{ checkedCount }}/{{ group.itemCount }})
        </span>
      </div>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 text-gray-400 transition-transform"
        :class="{ 'rotate-180': !isCollapsed }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <!-- Items list -->
    <div v-show="!isCollapsed" class="divide-y divide-gray-100 dark:divide-gray-700">
      <ShoppingListItemComponent
        v-for="item in group.items"
        :key="item.id"
        :item="item"
        :disabled="disabled"
        @toggle="handleToggle"
        @delete="handleDelete"
      />
    </div>
  </div>
</template>
