<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useTranslation } from "@/composables/useTranslation";
import { useShoppingListStore } from "@/stores/shoppingList";
import SyncStatusIndicator from "./SyncStatusIndicator.vue";

const { t } = useTranslation();
const router = useRouter();
const store = useShoppingListStore();

onMounted(() => {
  store.fetchLists();
});

const activeList = computed(() => store.firstActiveList);

const progressPercent = computed(() => {
  if (!activeList.value || activeList.value.totalItems === 0) return 0;
  const unchecked = activeList.value.totalItems - activeList.value.checkedItems;
  return Math.round((unchecked / activeList.value.totalItems) * 100);
});

const uncheckedCount = computed(() => {
  if (!activeList.value) return 0;
  return activeList.value.totalItems - activeList.value.checkedItems;
});

const goToList = () => {
  if (activeList.value) {
    router.push(`/shopping-lists/${activeList.value.localId}`);
  } else {
    router.push("/shopping-lists");
  }
};

const goToAllLists = () => {
  router.push("/shopping-lists");
};
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-2">
        <span class="text-xl">🛒</span>
        <h3 class="font-semibold text-gray-900 dark:text-white">
          {{ t("shoppingList.widget.title") }}
        </h3>
      </div>
      <SyncStatusIndicator />
    </div>

    <!-- Content -->
    <div class="p-4">
      <template v-if="activeList">
        <!-- Active list info -->
        <div class="mb-4">
          <h4 class="font-medium text-gray-900 dark:text-white mb-1">
            {{ activeList.name }}
          </h4>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t("shoppingList.widget.itemsLeft", { count: uncheckedCount }) }}
          </p>
        </div>

        <!-- Progress bar -->
        <div class="mb-4">
          <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-primary-500 rounded-full transition-all duration-500"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>
          <div class="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{{ t("shoppingList.widget.progress") }}</span>
            <span>{{ progressPercent }}%</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button
            @click="goToList"
            class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            {{ t("shoppingList.widget.viewList") }}
          </button>
          <button
            @click="goToAllLists"
            class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
          >
            {{ t("shoppingList.widget.allLists") }}
          </button>
        </div>
      </template>

      <!-- No active list -->
      <template v-else>
        <div class="text-center py-4">
          <p class="text-gray-500 dark:text-gray-400 mb-4">
            {{ t("shoppingList.widget.noActiveList") }}
          </p>
          <button
            @click="goToAllLists"
            class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            {{ t("shoppingList.widget.createList") }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
