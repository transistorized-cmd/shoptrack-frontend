<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useTranslation } from "@/composables/useTranslation";
import { useShoppingListStore } from "@/stores/shoppingList";
import type { ProductSearchResult, ShoppingListItem } from "@/types/shoppingList";

const formatPrice = (price: number | undefined, locale: string) => {
  if (price === undefined || price === null) return null;
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(price);
};

const props = defineProps<{
  isOpen: boolean;
  listLocalId: string;
  item: ShoppingListItem | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved"): void;
}>();

const { t, locale } = useTranslation();
const store = useShoppingListStore();

const searchQuery = ref("");
const quantity = ref<number | undefined>(undefined);
const selectedProduct = ref<ProductSearchResult | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const saving = ref(false);

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

// Seed form from the item being edited
watch(
  () => [props.isOpen, props.item] as const,
  ([isOpen, item]) => {
    if (isOpen && item) {
      searchQuery.value = "";
      quantity.value = item.quantity;
      selectedProduct.value = {
        id: item.productId,
        itemNameOriginal: item.name,
        nombre: item.name,
        emoji: item.emoji || "📦",
        category: item.category,
        hasNfc: false,
        isFavorite: false,
        lastPrice: item.lastPrice,
        lastPriceDate: item.lastPriceDate,
      };
      store.clearSearch();
      setTimeout(() => searchInput.value?.focus(), 100);
    } else if (!isOpen) {
      searchQuery.value = "";
      quantity.value = undefined;
      selectedProduct.value = null;
      store.clearSearch();
    }
  },
  { immediate: true }
);

const canSave = computed(() => {
  if (!props.item || !selectedProduct.value) return false;
  const productChanged = selectedProduct.value.id !== props.item.productId;
  const quantityChanged = quantity.value !== props.item.quantity;
  return productChanged || quantityChanged;
});

const handlePickProduct = (product: ProductSearchResult) => {
  selectedProduct.value = product;
  searchQuery.value = "";
  store.clearSearch();
};

const handleSave = async () => {
  if (!props.item || !selectedProduct.value || saving.value) return;
  if (!canSave.value) {
    handleClose();
    return;
  }

  const localItem = store.currentItems.find((i) => i.id === props.item!.id);
  if (!localItem) return;

  saving.value = true;
  try {
    const updates: { quantity?: number; product?: ProductSearchResult } = {};
    if (quantity.value !== props.item.quantity) {
      updates.quantity = quantity.value ?? 1;
    }
    if (selectedProduct.value.id !== props.item.productId) {
      updates.product = selectedProduct.value;
    }
    await store.updateItem(props.listLocalId, localItem.localId, updates);
    emit("saved");
    handleClose();
  } catch (err) {
    console.error("Failed to update item:", err);
  } finally {
    saving.value = false;
  }
};

const handleClose = () => {
  emit("close");
};

const handleOverlayClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) handleClose();
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      @click="handleOverlayClick"
    >
      <div class="absolute inset-0 bg-black/50"></div>

      <div
        class="relative w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ t("shoppingList.editItem.title") }}
          </h3>
          <button
            @click="handleClose"
            class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Current selection + quantity -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <div v-if="selectedProduct" class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <span class="text-2xl">{{ selectedProduct.emoji || "📦" }}</span>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 dark:text-white truncate">
                {{ selectedProduct.nombre }}
              </p>
              <p v-if="selectedProduct.category" class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ selectedProduct.category }}
              </p>
            </div>
            <span
              v-if="formatPrice(selectedProduct.lastPrice, locale)"
              class="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0"
            >
              {{ formatPrice(selectedProduct.lastPrice, locale) }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <label class="text-sm text-gray-600 dark:text-gray-400">
              {{ t("shoppingList.addItem.quantity") }}:
            </label>
            <input
              v-model.number="quantity"
              type="number"
              min="1"
              step="1"
              class="w-20 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            :placeholder="t('shoppingList.editItem.searchPlaceholder')"
            class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <!-- Search results -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="store.searchLoading" class="p-4 text-center text-gray-500 dark:text-gray-400">
            {{ t("common.loading") }}
          </div>

          <div v-else-if="store.searchResults.length > 0" class="divide-y divide-gray-200 dark:divide-gray-700">
            <button
              v-for="product in store.searchResults"
              :key="product.id"
              @click="handlePickProduct(product)"
              class="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left transition-colors"
              :class="{ 'bg-primary-50 dark:bg-primary-900/20': selectedProduct?.id === product.id }"
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
              <span
                v-if="formatPrice(product.lastPrice, locale)"
                class="text-sm font-medium text-emerald-600 dark:text-emerald-400"
              >
                {{ formatPrice(product.lastPrice, locale) }}
              </span>
              <svg
                v-if="selectedProduct?.id === product.id"
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-primary-600 dark:text-primary-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>

          <div
            v-else-if="searchQuery.length >= 2 && !store.searchLoading"
            class="p-4 text-center text-gray-500 dark:text-gray-400"
          >
            {{ t("shoppingList.addItem.noResults") }}
          </div>

          <div v-else class="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            {{ t("shoppingList.editItem.hint") }}
          </div>
        </div>

        <!-- Footer -->
        <div class="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            @click="handleClose"
            class="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {{ t("common.cancel") }}
          </button>
          <button
            @click="handleSave"
            :disabled="!canSave || saving"
            class="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ saving ? t("common.saving") : t("common.save") }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
