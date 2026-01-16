<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useTranslation } from "@/composables/useTranslation";
import { useShoppingListStore } from "@/stores/shoppingList";
import type { LocalShoppingList } from "@/types/shoppingList";
import ShoppingListCard from "@/components/shopping-list/ShoppingListCard.vue";
import SyncStatusIndicator from "@/components/shopping-list/SyncStatusIndicator.vue";

const { t } = useTranslation();
const router = useRouter();
const store = useShoppingListStore();

const showCreateModal = ref(false);
const newListName = ref("");
const creating = ref(false);
const filter = ref<"all" | "active" | "completed">("all");
const showDeleteConfirm = ref(false);
const listToDelete = ref<LocalShoppingList | null>(null);

onMounted(() => {
  store.fetchLists(true);
});

const filteredLists = computed(() => {
  switch (filter.value) {
    case "active":
      return store.activeLists;
    case "completed":
      return store.completedLists;
    default:
      return store.lists;
  }
});

const handleSelectList = (list: LocalShoppingList) => {
  router.push(`/shopping-lists/${list.localId}`);
};

const handleDeleteRequest = (list: LocalShoppingList) => {
  listToDelete.value = list;
  showDeleteConfirm.value = true;
};

const handleConfirmDelete = async () => {
  if (listToDelete.value) {
    await store.deleteList(listToDelete.value.localId);
    listToDelete.value = null;
    showDeleteConfirm.value = false;
  }
};

const handleCancelDelete = () => {
  listToDelete.value = null;
  showDeleteConfirm.value = false;
};

const handleCreateList = async () => {
  if (!newListName.value.trim()) return;

  creating.value = true;
  try {
    const newList = await store.createList(newListName.value.trim());
    newListName.value = "";
    showCreateModal.value = false;
    router.push(`/shopping-lists/${newList.localId}`);
  } finally {
    creating.value = false;
  }
};

const handleCloseCreateModal = () => {
  showCreateModal.value = false;
  newListName.value = "";
};

import { computed } from "vue";
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          {{ t("shoppingList.title") }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ t("shoppingList.description") }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <SyncStatusIndicator />
        <button
          @click="showCreateModal = true"
          class="btn btn-primary w-full sm:w-auto"
        >
          + {{ t("shoppingList.actions.create") }}
        </button>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="flex gap-2">
      <button
        v-for="f in ['all', 'active', 'completed'] as const"
        :key="f"
        @click="filter = f"
        class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
        :class="
          filter === f
            ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        "
      >
        {{ t(`shoppingList.filter.${f}`) }}
      </button>
    </div>

    <!-- Content -->
      <!-- Loading -->
      <div v-if="store.loading" class="text-center py-12">
        <div class="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
          {{ t("common.loading") }}
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="filteredLists.length === 0"
        class="text-center py-12"
      >
        <span class="text-6xl block mb-4">📝</span>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {{ t("shoppingList.empty.title") }}
        </h2>
        <p class="text-gray-500 dark:text-gray-400 mb-6">
          {{ t("shoppingList.empty.description") }}
        </p>
        <button
          @click="showCreateModal = true"
          class="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          {{ t("shoppingList.actions.createFirst") }}
        </button>
      </div>

    <!-- Lists grid -->
    <div v-else class="grid gap-4 sm:grid-cols-2">
      <ShoppingListCard
        v-for="list in filteredLists"
        :key="list.localId"
        :list="list"
        @select="handleSelectList"
        @delete="handleDeleteRequest"
      />
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click.self="handleCloseCreateModal"
      >
        <div class="absolute inset-0 bg-black/50"></div>
        <div class="relative bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {{ t("shoppingList.create.title") }}
          </h3>
          <input
            v-model="newListName"
            type="text"
            :placeholder="t('shoppingList.create.placeholder')"
            class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            @keyup.enter="handleCreateList"
            autofocus
          />
          <div class="flex justify-end gap-3 mt-4">
            <button
              @click="handleCloseCreateModal"
              class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {{ t("common.cancel") }}
            </button>
            <button
              @click="handleCreateList"
              :disabled="!newListName.trim() || creating"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ creating ? t("common.creating") : t("common.create") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click.self="handleCancelDelete"
      >
        <div class="absolute inset-0 bg-black/50"></div>
        <div class="relative bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {{ t("shoppingList.delete.title") }}
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            {{ t("shoppingList.delete.message", { name: listToDelete?.name }) }}
          </p>
          <div class="flex justify-end gap-3">
            <button
              @click="handleCancelDelete"
              class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {{ t("common.cancel") }}
            </button>
            <button
              @click="handleConfirmDelete"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {{ t("common.delete") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
