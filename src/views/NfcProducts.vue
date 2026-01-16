<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">NFC Shopping List</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage products linked to NFC tags for quick shopping list management</p>
      </div>
      <button
        @click="openCreateModal"
        class="btn btn-primary w-full sm:w-auto"
      >
        + Add NFC Product
      </button>
    </div>

    <!-- Filter -->
    <div class="card p-4">
      <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Show:</label>
          <select
            v-model="filterActivo"
            class="input py-1.5 text-sm"
            @change="fetchProducts"
          >
            <option :value="undefined">All</option>
            <option :value="true">Active only</option>
            <option :value="false">Inactive only</option>
          </select>
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ products.length }} product{{ products.length !== 1 ? 's' : '' }}
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="card p-8 text-center">
      <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p class="text-gray-500 dark:text-gray-400">Loading products...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="products.length === 0" class="card p-8 text-center">
      <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No NFC Products Yet</h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4">Create your first NFC product to start building your shopping list.</p>
      <button @click="openCreateModal" class="btn btn-primary">
        + Add First Product
      </button>
    </div>

    <!-- Products Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="product in products"
        :key="product.id"
        class="card p-4 hover:shadow-md transition-shadow"
        :class="{ 'opacity-60': !product.activo }"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-2xl">{{ product.emoji || '📦' }}</span>
            <div>
              <h3 class="font-medium text-gray-900 dark:text-white">{{ product.nombre }}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]" :title="product.itemNameOriginal">
                {{ product.itemNameOriginal }}
              </p>
            </div>
          </div>
          <span
            class="px-2 py-0.5 text-xs rounded-full"
            :class="product.activo ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'"
          >
            {{ product.activo ? 'Active' : 'Inactive' }}
          </span>
        </div>

        <div class="space-y-1 text-sm text-gray-600 dark:text-gray-300 mb-4">
          <div v-if="product.category" class="flex items-center gap-2">
            <span class="text-gray-400">Category:</span>
            <span class="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded text-xs">{{ product.category }}</span>
          </div>
          <div v-if="product.tagUuid" class="flex items-center gap-2">
            <span class="text-gray-400">NFC Tag:</span>
            <code class="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded truncate max-w-[140px]" :title="product.tagUuid">{{ product.tagUuid }}</code>
          </div>
        </div>

        <div class="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            @click="openEditModal(product)"
            class="btn btn-secondary btn-sm flex-1"
          >
            Edit
          </button>
          <button
            @click="toggleProduct(product)"
            class="btn btn-sm"
            :class="product.activo ? 'btn-secondary' : 'btn-primary'"
          >
            {{ product.activo ? 'Disable' : 'Enable' }}
          </button>
          <button
            @click="confirmDelete(product)"
            class="btn btn-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4">
        <div class="fixed inset-0 bg-black bg-opacity-50" @click="closeModal"></div>

        <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ editingProduct ? 'Edit NFC Product' : 'Add NFC Product' }}
            </h2>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="saveProduct" class="space-y-4">
            <!-- Item Name Selector -->
            <div class="relative">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Original Item Name <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.itemNameOriginal"
                type="text"
                class="input w-full"
                placeholder="Search for a product from your receipts..."
                @input="searchItems"
                @focus="showSuggestions = true"
                autocomplete="off"
              />
              <!-- Suggestions Dropdown -->
              <div
                v-if="showSuggestions && itemSuggestions.length > 0"
                class="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto"
              >
                <button
                  v-for="suggestion in itemSuggestions"
                  :key="suggestion.itemName"
                  type="button"
                  class="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between"
                  @click="selectSuggestion(suggestion)"
                >
                  <div>
                    <div class="font-medium text-gray-900 dark:text-white">{{ suggestion.itemName }}</div>
                    <div v-if="suggestion.category" class="text-xs text-gray-500 dark:text-gray-400">{{ suggestion.category }}</div>
                  </div>
                  <span class="text-xs text-gray-400">{{ suggestion.count }}x</span>
                </button>
              </div>
            </div>

            <!-- Display Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Display Name <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.nombre"
                type="text"
                class="input w-full"
                placeholder="Clean name for shopping list"
                required
              />
            </div>

            <!-- Emoji -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Emoji
              </label>
              <input
                v-model="formData.emoji"
                type="text"
                class="input w-full"
                placeholder="e.g. 🥛"
                maxlength="10"
              />
            </div>

            <!-- NFC Tag UUID -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                NFC Tag UUID
              </label>
              <input
                v-model="formData.tagUuid"
                type="text"
                class="input w-full"
                placeholder="Home Assistant NFC tag UUID"
              />
              <p class="text-xs text-gray-500 mt-1">The UUID from your Home Assistant NFC tag</p>
            </div>

            <!-- Category -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <input
                v-model="formData.category"
                type="text"
                class="input w-full"
                placeholder="Product category"
              />
            </div>

            <!-- Active Toggle -->
            <div class="flex items-center gap-3">
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="formData.activo" type="checkbox" class="sr-only peer" />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
              <span class="text-sm text-gray-700 dark:text-gray-300">Active</span>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-4">
              <button type="button" @click="closeModal" class="btn btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary flex-1" :disabled="saving">
                {{ saving ? 'Saving...' : (editingProduct ? 'Update' : 'Create') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="productToDelete" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4">
        <div class="fixed inset-0 bg-black bg-opacity-50" @click="productToDelete = null"></div>

        <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Delete Product</h2>
          <p class="text-gray-600 dark:text-gray-300 mb-6">
            Are you sure you want to delete <strong>{{ productToDelete.nombre }}</strong>? This action cannot be undone.
          </p>
          <div class="flex gap-3">
            <button @click="productToDelete = null" class="btn btn-secondary flex-1">
              Cancel
            </button>
            <button @click="deleteProduct" class="btn bg-red-600 hover:bg-red-700 text-white flex-1">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { nfcProductsService, type NfcProductDto, type ItemSuggestionDto } from '@/services/nfcProducts';

// State
const products = ref<NfcProductDto[]>([]);
const loading = ref(true);
const filterActivo = ref<boolean | undefined>(undefined);
const showModal = ref(false);
const editingProduct = ref<NfcProductDto | null>(null);
const saving = ref(false);
const productToDelete = ref<NfcProductDto | null>(null);

// Form data
const formData = ref({
  itemNameOriginal: '',
  nombre: '',
  emoji: '',
  tagUuid: '',
  category: '',
  activo: true,
});

// Suggestions
const showSuggestions = ref(false);
const itemSuggestions = ref<ItemSuggestionDto[]>([]);
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// Fetch products
async function fetchProducts() {
  loading.value = true;
  try {
    products.value = await nfcProductsService.getAll(filterActivo.value);
  } catch (error) {
    console.error('Failed to fetch NFC products:', error);
  } finally {
    loading.value = false;
  }
}

// Search for item suggestions
async function searchItems() {
  if (searchTimeout) clearTimeout(searchTimeout);

  const query = formData.value.itemNameOriginal;
  if (query.length < 2) {
    itemSuggestions.value = [];
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      itemSuggestions.value = await nfcProductsService.getItemSuggestions(query);
      showSuggestions.value = true;
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  }, 300);
}

// Select a suggestion
function selectSuggestion(suggestion: ItemSuggestionDto) {
  formData.value.itemNameOriginal = suggestion.itemName;
  formData.value.category = suggestion.category || '';
  if (!formData.value.nombre) {
    // Auto-fill nombre with a cleaned version
    formData.value.nombre = suggestion.itemName;
  }
  showSuggestions.value = false;
}

// Modal handlers
function openCreateModal() {
  editingProduct.value = null;
  formData.value = {
    itemNameOriginal: '',
    nombre: '',
    emoji: '',
    tagUuid: '',
    category: '',
    activo: true,
  };
  showModal.value = true;
}

function openEditModal(product: NfcProductDto) {
  editingProduct.value = product;
  formData.value = {
    itemNameOriginal: product.itemNameOriginal,
    nombre: product.nombre,
    emoji: product.emoji || '',
    tagUuid: product.tagUuid || '',
    category: product.category || '',
    activo: product.activo,
  };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingProduct.value = null;
  showSuggestions.value = false;
}

// Save product
async function saveProduct() {
  if (!formData.value.itemNameOriginal || !formData.value.nombre) {
    return;
  }

  saving.value = true;
  try {
    if (editingProduct.value) {
      await nfcProductsService.update(editingProduct.value.id, {
        itemNameOriginal: formData.value.itemNameOriginal,
        nombre: formData.value.nombre,
        emoji: formData.value.emoji || undefined,
        tagUuid: formData.value.tagUuid || undefined,
        category: formData.value.category || undefined,
        activo: formData.value.activo,
      });
    } else {
      await nfcProductsService.create({
        itemNameOriginal: formData.value.itemNameOriginal,
        nombre: formData.value.nombre,
        emoji: formData.value.emoji || undefined,
        tagUuid: formData.value.tagUuid || undefined,
        category: formData.value.category || undefined,
        activo: formData.value.activo,
      });
    }
    closeModal();
    await fetchProducts();
  } catch (error) {
    console.error('Failed to save product:', error);
  } finally {
    saving.value = false;
  }
}

// Toggle product active state
async function toggleProduct(product: NfcProductDto) {
  try {
    await nfcProductsService.toggle(product.id);
    await fetchProducts();
  } catch (error) {
    console.error('Failed to toggle product:', error);
  }
}

// Delete product
function confirmDelete(product: NfcProductDto) {
  productToDelete.value = product;
}

async function deleteProduct() {
  if (!productToDelete.value) return;

  try {
    await nfcProductsService.delete(productToDelete.value.id);
    productToDelete.value = null;
    await fetchProducts();
  } catch (error) {
    console.error('Failed to delete product:', error);
  }
}

// Click outside to close suggestions
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.relative')) {
    showSuggestions.value = false;
  }
}

onMounted(() => {
  fetchProducts();
  document.addEventListener('click', handleClickOutside);
});
</script>
