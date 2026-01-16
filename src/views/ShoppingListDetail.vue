<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTranslation } from "@/composables/useTranslation";
import { useShoppingListStore } from "@/stores/shoppingList";
import type { ShoppingListItem } from "@/types/shoppingList";
import ShoppingListItemGroup from "@/components/shopping-list/ShoppingListItemGroup.vue";
import SyncStatusIndicator from "@/components/shopping-list/SyncStatusIndicator.vue";
import AddItemModal from "@/components/shopping-list/AddItemModal.vue";

const { t } = useTranslation();
const route = useRoute();
const router = useRouter();
const store = useShoppingListStore();

const showAddModal = ref(false);
const editingName = ref(false);
const newName = ref("");
const quickStartLoading = ref(false);
const quickStartResult = ref<{ added: number; skipped: number } | null>(null);

const listId = computed(() => route.params.id as string);

onMounted(async () => {
  if (listId.value) {
    await store.fetchList(listId.value);
  }
});

watch(listId, async (id) => {
  if (id) {
    await store.fetchList(id);
  }
});

const currentList = computed(() => store.currentLocalList);

const progressPercent = computed(() => {
  if (!currentList.value || currentList.value.totalItems === 0) return 0;
  const unchecked = currentList.value.totalItems - currentList.value.checkedItems;
  return Math.round((unchecked / currentList.value.totalItems) * 100);
});

const uncheckedCount = computed(() => {
  if (!currentList.value) return 0;
  return currentList.value.totalItems - currentList.value.checkedItems;
});

const handleBack = () => {
  store.clearCurrentList();
  router.push("/shopping-lists");
};

const handleToggleItem = async (item: ShoppingListItem) => {
  if (currentList.value) {
    // Find the local item
    const localItem = store.currentItems.find((i) => i.id === item.id);
    if (localItem) {
      await store.toggleItem(currentList.value.localId, localItem.localId);
    }
  }
};

const handleDeleteItem = async (item: ShoppingListItem) => {
  if (currentList.value) {
    const localItem = store.currentItems.find((i) => i.id === item.id);
    if (localItem) {
      await store.removeItem(currentList.value.localId, localItem.localId);
    }
  }
};

const handleItemAdded = () => {
  // Item was added, modal will close automatically
};

const startEditName = () => {
  if (currentList.value) {
    newName.value = currentList.value.name;
    editingName.value = true;
  }
};

const saveNameEdit = async () => {
  if (currentList.value && newName.value.trim()) {
    await store.updateList(currentList.value.localId, {
      name: newName.value.trim(),
    });
  }
  editingName.value = false;
};

const cancelNameEdit = () => {
  editingName.value = false;
  newName.value = "";
};

const handleQuickStart = async () => {
  if (!currentList.value) return;

  quickStartLoading.value = true;
  quickStartResult.value = null;

  try {
    const result = await store.addFavoritesToList(currentList.value.localId);
    quickStartResult.value = result;

    // Clear result message after 3 seconds
    setTimeout(() => {
      quickStartResult.value = null;
    }, 3000);
  } catch (err) {
    console.error("Quick start failed:", err);
  } finally {
    quickStartLoading.value = false;
  }
};

const allItemsChecked = computed(() => {
  if (!currentList.value || currentList.value.totalItems === 0) return false;
  return currentList.value.checkedItems === currentList.value.totalItems;
});

const handleToggleAll = async () => {
  if (!currentList.value) return;
  await store.toggleAllItems(currentList.value.localId, !allItemsChecked.value);
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div class="flex items-center space-x-3 sm:space-x-4">
            <button
              @click="handleBack"
              class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 flex-shrink-0"
            >
              <svg
                class="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>

            <div class="flex-1 min-w-0">
              <!-- Editable name -->
              <div v-if="editingName" class="flex items-center gap-2">
                <input
                  v-model="newName"
                  type="text"
                  class="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  @keyup.enter="saveNameEdit"
                  @keyup.escape="cancelNameEdit"
                  autofocus
                />
                <button
                  @click="saveNameEdit"
                  class="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </button>
                <button
                  @click="cancelNameEdit"
                  class="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
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
              <div v-else>
                <h1
                  @click="startEditName"
                  class="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {{ currentList?.name || t("shoppingList.detail.untitled") }}
                </h1>
              </div>
            </div>
          </div>

          <SyncStatusIndicator />
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <!-- Loading -->
      <div v-if="store.loading" class="flex justify-center items-center py-12">
        <div class="inline-flex items-center space-x-2">
          <svg class="animate-spin h-5 w-5 text-primary-600" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
              fill="none"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span class="text-gray-500 dark:text-gray-400">{{ t("common.loading") }}</span>
        </div>
      </div>

      <!-- Progress Card -->
      <div v-else-if="currentList" class="card p-6 mb-6">
        <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span class="font-medium">
            {{ t("shoppingList.detail.itemsLeft", { count: uncheckedCount }) }}
          </span>
          <span>{{ progressPercent }}%</span>
        </div>
        <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-primary-500 rounded-full transition-all duration-300"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
      </div>

      <!-- Empty list -->
      <div
        v-if="!store.loading && store.categorizedItems.length === 0"
        class="card p-6 text-center"
      >
        <span class="text-6xl block mb-4">🛒</span>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {{ t("shoppingList.detail.empty.title") }}
        </h2>
        <p class="text-gray-500 dark:text-gray-400 mb-6">
          {{ t("shoppingList.detail.empty.description") }}
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <!-- Quick Start Button -->
          <button
            @click="handleQuickStart"
            :disabled="quickStartLoading"
            class="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg
              v-if="quickStartLoading"
              class="animate-spin h-5 w-5"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
                fill="none"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <svg
              v-else
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
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            {{ t("shoppingList.actions.quickStart") }}
          </button>
          <button
            @click="showAddModal = true"
            class="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            {{ t("shoppingList.actions.addFirstItem") }}
          </button>
        </div>
        <!-- Quick Start Result Message -->
        <div
          v-if="quickStartResult"
          class="mt-4 text-sm"
          :class="quickStartResult.added > 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'"
        >
          <span v-if="quickStartResult.added > 0">
            {{ t("shoppingList.quickStart.added", { count: quickStartResult.added }) }}
          </span>
          <span v-else>
            {{ t("shoppingList.quickStart.noFavorites") }}
          </span>
        </div>
      </div>

      <!-- Items grouped by category -->
      <div v-if="store.categorizedItems.length > 0" class="card p-0 overflow-hidden">
        <div class="divide-y divide-gray-200 dark:divide-gray-700">
          <ShoppingListItemGroup
            v-for="group in store.categorizedItems"
            :key="group.category"
            :group="group"
            @toggle="handleToggleItem"
            @delete="handleDeleteItem"
          />
        </div>
      </div>

      <!-- Bottom actions -->
      <div v-if="currentList && store.categorizedItems.length > 0" class="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          @click="showAddModal = true"
          class="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center justify-center gap-2"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          {{ t("shoppingList.actions.addItem") }}
        </button>

        <button
          @click="handleToggleAll"
          class="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              v-if="allItemsChecked"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {{ allItemsChecked ? t("shoppingList.actions.uncheckAll") : t("shoppingList.actions.selectAll") }}
        </button>
      </div>
    </div>

    <!-- Add Item Modal -->
    <AddItemModal
      :is-open="showAddModal"
      :list-local-id="listId"
      @close="showAddModal = false"
      @added="handleItemAdded"
    />
  </div>
</template>
