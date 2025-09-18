<template>
  <div class="relative w-full max-w-md">
    <!-- Search Input -->
    <div class="relative">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          class="h-5 w-5 text-gray-400 dark:text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="text"
        :placeholder="config.placeholder"
        class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 sm:text-sm transition-colors"
        :class="{ 'rounded-b-none': showResults }"
        autocomplete="off"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
      />

      <!-- Loading indicator -->
      <div
        v-show="isLoading"
        class="absolute inset-y-0 right-0 pr-3 flex items-center"
      >
        <svg
          class="animate-spin h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    </div>

    <!-- Search Results Dropdown -->
    <SearchResultsDropdown
      v-show="showResults"
      :results="searchResults"
      :selected-index="selectedIndex"
      :is-loading="isLoading"
      :has-query="hasQuery"
      @select="handleResultSelect"
      @close="handleClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { searchService } from '@/services/search.service';
import SearchResultsDropdown from './SearchResultsDropdown.vue';
import type { SearchResponse, SearchResultItem, SearchConfig } from '@/types/search';

interface Props {
  config?: Partial<SearchConfig>;
}

const props = withDefaults(defineProps<Props>(), {
  config: () => ({})
});

const emit = defineEmits<{
  resultSelect: [result: SearchResultItem];
}>();

const { locale } = useI18n();
const router = useRouter();

// Default configuration
const defaultConfig: SearchConfig = {
  debounceMs: 300,
  minQueryLength: 2,
  maxResults: 10,
  placeholder: 'Search receipts, items, categories...'
};

const config = computed(() => ({ ...defaultConfig, ...props.config }));

// Component state
const searchInputRef = ref<HTMLInputElement>();
const searchQuery = ref('');
const isLoading = ref(false);
const showResults = ref(false);
const selectedIndex = ref(-1);
const searchResults = ref<SearchResultItem[]>([]);
const debounceTimeout = ref<number | null>(null);

// Computed properties
const hasQuery = computed(() => searchQuery.value.length >= config.value.minQueryLength);

// Search functionality
async function performSearch(query: string) {
  if (!query || query.length < config.value.minQueryLength) {
    searchResults.value = [];
    return;
  }

  isLoading.value = true;

  try {
    const response: SearchResponse = await searchService.search({
      query,
      locale: locale.value,
      limit: config.value.maxResults
    });

    searchResults.value = transformSearchResponse(response);
  } catch (error) {
    console.error('Search failed:', error);
    searchResults.value = [];
  } finally {
    isLoading.value = false;
  }
}

function transformSearchResponse(response: SearchResponse): SearchResultItem[] {
  const results: SearchResultItem[] = [];

  // Add receipt results
  response.receipts.forEach(receipt => {
    results.push({
      type: 'receipt',
      id: receipt.id,
      primaryText: receipt.storeName || 'Unknown Store',
      secondaryText: `${receipt.receiptNumber || 'No Number'} • ${formatDate(receipt.receiptDate)}`,
      icon: '🧾',
      data: receipt
    });
  });

  // Add item results
  response.items.forEach(item => {
    const categoryText = item.category?.name || 'Uncategorized';
    const storeInfo = `${item.receipt.storeName || 'Unknown Store'} • ${formatDate(item.receipt.receiptDate)}`;

    results.push({
      type: 'item',
      id: item.id,
      primaryText: item.itemName,
      secondaryText: `${categoryText}\n${storeInfo}`,
      icon: '🛒',
      data: item
    });
  });

  // Add category results
  response.categories.forEach(category => {
    results.push({
      type: 'category',
      id: category.id,
      primaryText: category.name,
      secondaryText: 'Category',
      icon: '📂',
      data: category
    });
  });

  return results;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'No Date';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale.value, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Invalid Date';
  }
}

// Event handlers
function handleFocus() {
  if (hasQuery.value) {
    showResults.value = true;
  }
}

function handleBlur() {
  // Delay hiding results to allow clicking on them
  setTimeout(() => {
    showResults.value = false;
    selectedIndex.value = -1;
  }, 150);
}

function handleClose() {
  showResults.value = false;
  selectedIndex.value = -1;
  searchInputRef.value?.blur();
}

function handleKeydown(event: KeyboardEvent) {
  if (!showResults.value) return;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      selectedIndex.value = Math.min(selectedIndex.value + 1, searchResults.value.length - 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      selectedIndex.value = Math.max(selectedIndex.value - 1, -1);
      break;
    case 'Enter':
      event.preventDefault();
      if (selectedIndex.value >= 0 && searchResults.value[selectedIndex.value]) {
        handleResultSelect(searchResults.value[selectedIndex.value]);
      }
      break;
    case 'Escape':
      event.preventDefault();
      handleClose();
      break;
  }
}

function handleResultSelect(result: SearchResultItem) {
  emit('resultSelect', result);
  handleNavigation(result);
  handleClose();
  searchQuery.value = ''; // Clear search after selection
}

function handleNavigation(result: SearchResultItem) {
  switch (result.type) {
    case 'receipt':
    case 'item':
      // Navigate to receipt detail page
      const receiptId = result.type === 'receipt'
        ? result.data.id
        : (result.data as any).receiptId;
      router.push(`/receipts/${receiptId}`);
      break;
    case 'category':
      // Navigate to category analytics
      router.push(`/reports/categories/${result.data.id}`);
      break;
  }
}

// Debounced search watcher
watch(searchQuery, (newQuery) => {
  // Clear existing timeout
  if (debounceTimeout.value) {
    clearTimeout(debounceTimeout.value);
  }

  if (!newQuery || newQuery.length < config.value.minQueryLength) {
    searchResults.value = [];
    showResults.value = false;
    selectedIndex.value = -1;
    return;
  }

  // Set up new debounced search
  debounceTimeout.value = setTimeout(() => {
    performSearch(newQuery);
    showResults.value = true;
    selectedIndex.value = -1;
  }, config.value.debounceMs);
});

// Cleanup
onUnmounted(() => {
  if (debounceTimeout.value) {
    clearTimeout(debounceTimeout.value);
  }
});

// Public methods (for parent component access)
defineExpose({
  focus: () => searchInputRef.value?.focus(),
  clear: () => {
    searchQuery.value = '';
    searchResults.value = [];
    showResults.value = false;
  }
});
</script>

<style scoped>
/* Component-specific styles if needed */
</style>