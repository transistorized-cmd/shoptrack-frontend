<template>
  <div class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 border-t-0 rounded-b-md shadow-lg max-h-80 overflow-auto">
    <!-- Loading state -->
    <div v-if="isLoading" class="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
      <div class="flex items-center justify-center space-x-2">
        <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-sm">Searching...</span>
      </div>
    </div>

    <!-- No results -->
    <div v-else-if="hasQuery && results.length === 0" class="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
      <div class="text-sm">No results found</div>
      <div class="text-xs mt-1">Try a different search term</div>
    </div>

    <!-- Results -->
    <div v-else-if="results.length > 0">
      <!-- Results by type -->
      <template v-for="(group, groupType) in groupedResults" :key="groupType">
        <div v-if="group.length > 0">
          <!-- Group header -->
          <div class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            {{ getGroupTitle(groupType as 'receipt' | 'item' | 'category') }}
          </div>

          <!-- Group items -->
          <div
            v-for="(result, index) in group"
            :key="`${result.type}-${result.id}`"
            class="px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            :class="{
              'bg-blue-50 dark:bg-blue-900/20': selectedIndex === getGlobalIndex(result)
            }"
            @click="handleSelect(result)"
            @mouseenter="$emit('hover', getGlobalIndex(result))"
          >
            <div class="flex items-start space-x-3">
              <!-- Icon -->
              <div class="flex-shrink-0 text-lg">
                {{ result.icon }}
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <!-- Primary text -->
                <div class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ result.primaryText }}
                </div>

                <!-- Secondary text -->
                <div v-if="result.secondaryText" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <!-- Handle multi-line secondary text for items -->
                  <template v-if="result.type === 'item'">
                    <div v-for="line in result.secondaryText.split('\n')" :key="line" class="truncate">
                      {{ line }}
                    </div>
                  </template>
                  <template v-else>
                    <div class="truncate">{{ result.secondaryText }}</div>
                  </template>
                </div>

                <!-- Result type badge -->
                <div class="mt-2">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    :class="getTypeBadgeClasses(result.type)"
                  >
                    {{ getTypeLabel(result.type) }}
                  </span>
                </div>
              </div>

              <!-- Navigation hint -->
              <div class="flex-shrink-0 text-gray-400 dark:text-gray-500">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Help text -->
    <div v-if="!hasQuery" class="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
      <div class="text-sm">Start typing to search...</div>
      <div class="text-xs mt-1">Search receipts, items, and categories</div>
    </div>

    <!-- Footer with shortcuts -->
    <div v-if="results.length > 0" class="px-3 py-2 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
      <div class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
        <span>Use ↑↓ to navigate</span>
        <span>Press Enter to select</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SearchResultItem } from '@/types/search';

interface Props {
  results: SearchResultItem[];
  selectedIndex: number;
  isLoading: boolean;
  hasQuery: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  select: [result: SearchResultItem];
  close: [];
  hover: [index: number];
}>();

const { t } = useI18n();

// Group results by type
const groupedResults = computed(() => {
  const groups: Record<string, SearchResultItem[]> = {
    receipt: [],
    item: [],
    category: []
  };

  props.results.forEach(result => {
    if (groups[result.type]) {
      groups[result.type].push(result);
    }
  });

  return groups;
});

// Get global index for a result (for keyboard navigation)
function getGlobalIndex(targetResult: SearchResultItem): number {
  return props.results.findIndex(result =>
    result.type === targetResult.type && result.id === targetResult.id
  );
}

function handleSelect(result: SearchResultItem) {
  emit('select', result);
}

function getGroupTitle(type: 'receipt' | 'item' | 'category'): string {
  switch (type) {
    case 'receipt':
      return t('search.groups.receipts', 'Receipts');
    case 'item':
      return t('search.groups.items', 'Items');
    case 'category':
      return t('search.groups.categories', 'Categories');
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function getTypeLabel(type: 'receipt' | 'item' | 'category'): string {
  switch (type) {
    case 'receipt':
      return t('search.types.receipt', 'Receipt');
    case 'item':
      return t('search.types.item', 'Item');
    case 'category':
      return t('search.types.category', 'Category');
    default:
      return type;
  }
}

function getTypeBadgeClasses(type: 'receipt' | 'item' | 'category'): string {
  const baseClasses = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';

  switch (type) {
    case 'receipt':
      return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400`;
    case 'item':
      return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400`;
    case 'category':
      return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400`;
  }
}
</script>

<style scoped>
/* Custom scrollbar for the dropdown */
.overflow-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-auto::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-gray-700;
}

.overflow-auto::-webkit-scrollbar-thumb {
  @apply bg-gray-300 dark:bg-gray-600 rounded;
}

.overflow-auto::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400 dark:bg-gray-500;
}
</style>