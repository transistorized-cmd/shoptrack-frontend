<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useTranslation } from "@/composables/useTranslation";
import { useShoppingListStore } from "@/stores/shoppingList";
import type { ProductSearchResult } from "@/types/shoppingList";

const props = defineProps<{
  isOpen: boolean;
  listLocalId: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "added", product: ProductSearchResult): void;
}>();

const { t } = useTranslation();
const store = useShoppingListStore();

const searchQuery = ref("");
const selectedQuantity = ref<number | undefined>(undefined);
const searchInput = ref<HTMLInputElement | null>(null);
const addingCustom = ref(false);

// Show "add custom" option when search has results but user might want custom
const showAddCustomOption = computed(() => {
  return searchQuery.value.length >= 2 && store.searchResults.length === 0 && !store.searchLoading;
});

// Debounced search
let searchTimeout: number | undefined;
watch(searchQuery, (value) => {
  if (searchTimeout) clearTimeout(searchTimeout);

  if (value.length >= 2) {
    searchTimeout = window.setTimeout(() => {
      store.searchProducts(value);
    }, 300);
  } else {
    store.clearSearch();
  }
});

// Focus input when modal opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      setTimeout(() => {
        searchInput.value?.focus();
      }, 100);
    } else {
      searchQuery.value = "";
      selectedQuantity.value = undefined;
      store.clearSearch();
    }
  }
);

const handleSelectProduct = async (product: ProductSearchResult) => {
  try {
    await store.addItem(props.listLocalId, product, selectedQuantity.value);
    emit("added", product);
    handleClose();
  } catch (error) {
    console.error("Failed to add item:", error);
  }
};

const handleAddCustomItem = async () => {
  if (!searchQuery.value.trim() || addingCustom.value) return;

  addingCustom.value = true;
  try {
    const item = await store.addCustomItem(
      props.listLocalId,
      searchQuery.value.trim(),
      selectedQuantity.value
    );
    // Create a pseudo product result for the emit
    const product: ProductSearchResult = {
      id: item.productId,
      itemNameOriginal: item.name,
      nombre: item.name,
      emoji: item.emoji || "📦",
      category: item.category,
      hasNfc: false,
      isFavorite: false,
    };
    emit("added", product);
    handleClose();
  } catch (error) {
    console.error("Failed to add custom item:", error);
  } finally {
    addingCustom.value = false;
  }
};

const handleClose = () => {
  emit("close");
};

const handleOverlayClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    handleClose();
  }
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      @click="handleOverlayClick"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50"></div>

      <!-- Modal -->
      <div
        class="relative w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ t("shoppingList.addItem.title") }}
          </h3>
          <button
            @click="handleClose"
            class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
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

        <!-- Search input -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            :placeholder="t('shoppingList.addItem.searchPlaceholder')"
            class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />

          <!-- Quantity selector (optional) -->
          <div class="mt-3 flex items-center gap-2">
            <label class="text-sm text-gray-600 dark:text-gray-400">
              {{ t("shoppingList.addItem.quantity") }}:
            </label>
            <input
              v-model.number="selectedQuantity"
              type="number"
              min="1"
              step="1"
              :placeholder="t('shoppingList.addItem.optional')"
              class="w-20 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>

        <!-- Search results -->
        <div class="flex-1 overflow-y-auto">
          <!-- Loading -->
          <div v-if="store.searchLoading" class="p-4 text-center text-gray-500 dark:text-gray-400">
            {{ t("common.loading") }}
          </div>

          <!-- No results - show add custom option -->
          <div
            v-else-if="showAddCustomOption"
            class="p-4"
          >
            <p class="text-center text-gray-500 dark:text-gray-400 mb-4">
              {{ t("shoppingList.addItem.noResults") }}
            </p>
            <button
              @click="handleAddCustomItem"
              :disabled="addingCustom"
              class="w-full flex items-center gap-3 p-4 bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700 rounded-lg text-left transition-colors disabled:opacity-50"
            >
              <span class="text-2xl">📦</span>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-white">
                  {{ addingCustom ? t("shoppingList.addItem.adding") : t("shoppingList.addItem.addCustom") }}
                </p>
              </div>
              <svg v-if="addingCustom" class="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <svg v-else class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <!-- Results list -->
          <div v-else-if="store.searchResults.length > 0" class="divide-y divide-gray-200 dark:divide-gray-700">
            <button
              v-for="product in store.searchResults"
              :key="product.id"
              @click="handleSelectProduct(product)"
              class="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left transition-colors"
            >
              <span class="text-2xl">{{ product.emoji || "📦" }}</span>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 dark:text-white truncate">
                  {{ product.nombre }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {{ product.category || t("shoppingList.addItem.uncategorized") }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <span
                  v-if="product.isFavorite"
                  class="text-yellow-500"
                  :title="t('shoppingList.addItem.favorite')"
                >
                  ⭐
                </span>
                <span
                  v-if="product.hasNfc"
                  class="text-blue-500"
                  :title="t('shoppingList.addItem.hasNfc')"
                >
                  📱
                </span>
              </div>
            </button>
          </div>

          <!-- Hint -->
          <div
            v-else-if="searchQuery.length < 2"
            class="p-4 text-center text-gray-500 dark:text-gray-400"
          >
            {{ t("shoppingList.addItem.hint") }}
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
