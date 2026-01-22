<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div class="flex items-center space-x-3 sm:space-x-4">
            <button
              class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 dark:text-gray-300 dark:hover:text-gray-100 flex-shrink-0"
              @click="$router.go(-1)"
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
            <div class="min-w-0 flex-1">
              <h1 class="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{{ $t('receipts.receiptDetail.title') }}</h1>
              <p v-if="receipt" class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                {{ receipt.filename }}
              </p>
            </div>
          </div>
          <div v-if="receipt" class="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <span
              class="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start sm:self-auto"
              :class="getStatusColor(receipt.processingStatus)"
            >
              {{ receipt.processingStatus }}
            </span>
            <div class="flex space-x-2">
              <button class="btn btn-secondary text-sm" @click="handleReprocess">
                🔄 <span class="hidden sm:inline ml-1">{{ $t('receipts.receiptDetail.reprocess') }}</span>
              </button>
              <button
                class="btn-danger text-sm"
                @click="handleDelete"
              >
                <svg
                  class="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span class="hidden sm:inline">{{ $t('receipts.receiptDetail.deleteReceipt') }}</span>
                <span class="sm:hidden">Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="inline-flex items-center space-x-2">
        <svg
          class="animate-spin h-5 w-5 text-shoptrack-600"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span class="text-gray-500 dark:text-gray-400">{{ $t('receipts.receiptDetail.loadingReceipt') }}</span>
      </div>
    </div>

    <div v-else-if="error" class="text-center py-12">
      <div class="text-red-600 dark:text-red-400 mb-4">{{ error }}</div>
      <button class="btn btn-secondary" @click="fetchReceipt">{{ $t('receipts.tryAgain') }}</button>
    </div>

    <div v-else-if="!receipt" class="text-center py-12">
      <div class="text-gray-500 dark:text-gray-400">{{ $t('receipts.receiptDetail.receiptNotFound') }}</div>
    </div>

    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <!-- Combined Image and Receipt Information -->
      <div class="card p-6 mb-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <!-- Image Section -->
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {{ $t('receipts.receiptDetail.receiptImageTitle') }}
            </h2>
            <div class="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden h-64 flex items-center justify-center">
              <img
                v-if="imageUrl && !imageError"
                :src="imageUrl"
                :alt="receipt.filename"
                crossorigin="use-credentials"
                class="max-w-full max-h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                @error="handleImageError"
                @click="showImageModal = true"
              />
              <div
                v-else
                class="flex items-center justify-center h-full text-gray-500"
              >
                <div class="text-center">
                  <svg
                    class="w-12 h-12 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p>
                    {{
                      imageError ? $t('receipts.receiptDetail.failedToLoadImage') : $t('receipts.receiptDetail.imageNotAvailable')
                    }}
                  </p>
                  <p v-if="imageError" class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {{ imageError }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Receipt Information -->
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {{ $t('receipts.receiptDetail.receiptInformation') }}
            </h2>
            <div class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1"
                    >{{ $t('receipts.date') }}</label
                  >
                  <div v-if="!editingDate" class="flex items-center group">
                    <span class="text-gray-700 dark:text-gray-300">
                      {{
                        receipt.receiptDate
                          ? formatDate(receipt.receiptDate)
                          : $t('common.no')
                      }}
                    </span>
                    <button
                      class="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 dark:text-gray-500 dark:hover:text-gray-300 transition-opacity"
                      @click="startEditingDate"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  </div>
                  <div v-else class="flex items-center space-x-2">
                    <LocalizedDateInput
                      v-model="editedReceiptDate"
                      class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <button
                      class="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                      @click="saveEditedDate"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
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
                      class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      @click="cancelEditingDate"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
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
                </div>
                <div v-if="receipt.receiptNumber">
                  <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1"
                    >{{ $t('receipts.receiptNumber') }}</label
                  >
                  <div class="text-gray-700 dark:text-gray-300">{{ receipt.receiptNumber }}</div>
                </div>
                <div v-if="receipt.currency">
                  <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1"
                    >{{ $t('receipts.currency') || 'Currency' }}</label
                  >
                  <div class="text-gray-700 dark:text-gray-300">{{ receipt.currency }}</div>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1"
                    >{{ $t('receipts.storeName') }}</label
                  >
                  <div v-if="!editingStore" class="flex items-center group">
                    <span class="text-gray-700 dark:text-gray-300 font-medium">
                      {{ receipt.storeName || $t('receipts.receiptDetail.notSpecified') }}
                    </span>
                    <button
                      class="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 dark:text-gray-500 dark:hover:text-gray-300 transition-opacity"
                      @click="startEditingStoreName"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  </div>
                  <div
                    v-if="editingStore"
                    class="flex items-center space-x-2 relative"
                  >
                    <div class="flex-1 relative">
                      <input
                        v-model="editedStoreName"
                        type="text"
                        class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        :class="{
                          'border-red-300':
                            editingStore && !editedStoreName.trim(),
                        }"
                        :placeholder="$t('receipts.receiptDetail.enterStoreName')"
                        @input="onStoreNameInput"
                        @keydown="onStoreNameKeydown"
                        @blur="onStoreNameBlur"
                      />
                      <div
                        v-if="
                          showStoreSuggestions &&
                          storeNameSuggestions.length > 0
                        "
                        class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto"
                      >
                        <div
                          v-for="(suggestion, index) in storeNameSuggestions"
                          :key="suggestion"
                          class="px-3 py-2 hover:bg-gray-100 dark:bg-gray-700 cursor-pointer"
                          :class="{
                            'bg-blue-100 dark:bg-blue-900': index === selectedSuggestionIndex,
                          }"
                          @mousedown="selectStoreSuggestion(suggestion)"
                        >
                          {{ suggestion }}
                        </div>
                      </div>
                    </div>
                    <button
                      class="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                      @click="saveEditedStoreName"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
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
                      class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      @click="cancelEditingStoreName"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
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
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1"
                    >{{ $t('receipts.itemsDetected') }}</label
                  >
                  <div class="text-gray-700 dark:text-gray-300">
                    {{ receipt.totalItemsDetected }}
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1"
                    >{{ $t('receipts.successfullyParsed') }}</label
                  >
                  <div class="text-gray-700 dark:text-gray-300">
                    {{ receipt.successfullyParsed }}
                  </div>
                </div>
              </div>

              <div v-if="receipt.imageQualityAssessment">
                <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1"
                  >{{ $t('receipts.imageQuality') }}</label
                >
                <div class="text-gray-700 dark:text-gray-300">
                  {{ receipt.imageQualityAssessment }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1"
                  >{{ $t('receipts.created') }}</label
                >
                <div class="text-gray-700 dark:text-gray-300">
                  {{ formatDateTime(receipt.createdAt) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Claude Response (Debug) -->
      <div
        v-if="receipt.claudeResponseJson && showDebugInfo"
        class="card p-6 mb-6"
      >
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-4">
          {{ $t('receipts.receiptDetail.claudeResponse') }}
        </h2>
        <pre
          class="bg-gray-100 dark:bg-gray-700 p-4 rounded text-xs overflow-x-auto text-gray-700 dark:text-gray-300"
          >{{ JSON.stringify(receipt.claudeResponseJson, null, 2) }}</pre
        >
      </div>

      <!-- Items List (Full Width) -->
      <div
        v-if="receipt.items && receipt.items.length > 0"
        class="card p-6 mt-6"
      >
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ $t('receipts.receiptDetail.items', { count: receipt.items.length }) }}
          </h2>
          <div class="text-lg font-bold text-gray-900 dark:text-white">
            {{ $t('receipts.receiptDetail.total', {
              amount: formatAmount(
                receipt.items.reduce((sum, item) => sum + item.totalPrice, 0),
                receipt.currency || 'USD'
              )
            }) }}
          </div>
        </div>

        <div class="space-y-3">
          <div
            v-for="item in receipt.items"
            :key="item.id"
            class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <div v-if="!editingItems[item.id]" class="group">
              <div class="flex justify-between items-start mb-2">
                <h3 class="font-medium text-gray-900 dark:text-white">
                  {{ capitalizeFirst(item.itemName) }}
                </h3>
                <div class="flex items-center space-x-2">
                  <span class="font-semibold text-gray-900 dark:text-white">{{
                    formatAmount(item.totalPrice, receipt.currency || 'USD')
                  }}</span>
                  <!-- Favorite toggle button -->
                  <button
                    v-if="item.productId"
                    class="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
                    :disabled="togglingFavoriteItemId === item.id"
                    :title="item.isFavorite ? $t('receipts.receiptDetail.removeFromFavorites') : $t('receipts.receiptDetail.addToFavorites')"
                    @click="handleToggleItemFavorite(item)"
                  >
                    <span v-if="togglingFavoriteItemId === item.id" class="inline-block w-4 h-4">
                      <svg class="animate-spin h-4 w-4 text-yellow-500" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </span>
                    <span v-else class="text-base">{{ item.isFavorite ? '⭐' : '☆' }}</span>
                  </button>
                  <button
                    class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-opacity"
                    @click="startEditingItem(item)"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div
                class="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400"
              >
                <div class="flex space-x-4">
                  <span>{{ $t('receipts.receiptDetail.quantity', { qty: item.quantity || 1 }) }}</span>
                  <span>{{ $t('receipts.receiptDetail.unitPrice', { price: formatUnitPrice(item.pricePerUnit || 0) }) }}</span>
                  <span v-if="item.weightOriginal"
                    >{{ $t('receipts.receiptDetail.weightInfo', {
                      weight: item.weightOriginal,
                      unit: item.unit ? capitalizeFirst(item.unit) : ''
                    }) }}</span
                  >
                </div>
                <span
                  v-if="(item.category?.id && categoriesStore.getName(item.category.id, (locale as any))) || item.category?.name || item.categoryRaw || (item as any).category"
                  class="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 px-2 py-1 rounded text-xs"
                >
                  {{ capitalizeFirst((item.category?.id && categoriesStore.getName(item.category.id, (locale as any))) || item.category?.name || item.categoryRaw || (item as any).category) }}
                </span>
              </div>
              <div v-if="item.notes" class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {{ item.notes }}
              </div>
            </div>

            <!-- Editing Mode -->
            <div v-else class="space-y-3">
              <!-- Item Name with Autocomplete -->
              <div class="relative">
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                  >{{ $t('receipts.receiptDetail.itemName') }}</label
                >
                <input
                  v-model="editedItems[item.id].itemName"
                  type="text"
                  class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  :placeholder="$t('receipts.receiptDetail.enterItemName')"
                  @input="onItemNameInput(item.id)"
                  @keydown="
                    onAutocompleteKeydown($event, item.id, 'itemName')
                  "
                  @blur="hideItemSuggestions(item.id, 'itemName')"
                />
                <div
                  v-if="
                    itemSuggestions[item.id]?.itemName?.show &&
                    (itemSuggestions[item.id]?.itemName?.options?.length ??
                      0) > 0
                  "
                  class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-20 max-h-32 overflow-y-auto"
                >
                  <div
                    v-for="(suggestion, index) in itemSuggestions[item.id]
                      ?.itemName?.options ?? []"
                    :key="suggestion"
                    class="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                    :class="{
                      'bg-blue-100 dark:bg-blue-900':
                        index ===
                        (itemSuggestions[item.id]?.itemName
                          ?.selectedIndex ?? -1),
                    }"
                    @mousedown="
                      selectSuggestion(item.id, 'itemName', suggestion)
                    "
                  >
                    {{ suggestion }}
                  </div>
                </div>
              </div>

              <!-- Category with Autocomplete -->
              <div class="relative">
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {{ $t('receipts.receiptDetail.category') }}
                </label>
                <input
                  v-model="editedItems[item.id].categoryInput"
                  type="text"
                  class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  :placeholder="$t('receipts.receiptDetail.selectOrEnterCategory') || 'Select or enter category'"
                  @input="onCategoryInputChange(item.id)"
                  @keydown="onAutocompleteKeydown($event, item.id, 'category')"
                  @blur="hideItemSuggestions(item.id, 'category')"
                />
                <div
                  v-if="
                    itemSuggestions[item.id]?.category?.show &&
                    (itemSuggestions[item.id]?.category?.options?.length ?? 0) > 0
                  "
                  class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-20 max-h-32 overflow-y-auto"
                >
                  <div
                    v-for="(suggestion, index) in itemSuggestions[item.id]?.category?.options ?? []"
                    :key="typeof suggestion === 'string' ? suggestion : suggestion.id"
                    class="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                    :class="{
                      'bg-blue-100 dark:bg-blue-900':
                        index === (itemSuggestions[item.id]?.category?.selectedIndex ?? -1),
                    }"
                    @mousedown="selectCategorySuggestion(item.id, suggestion)"
                  >
                    {{ typeof suggestion === 'string' ? suggestion : suggestion.name }}
                  </div>
                </div>
              </div>

              <!-- Quantity, Price Per Unit, Weight, Unit in a row -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label
                    class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                    >{{ $t('receipts.receiptDetail.quantity') }}</label
                  >
                  <input
                    v-model.number="editedItems[item.id].quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    @input="calculateTotalPrice(item.id)"
                  />
                </div>
                <div>
                  <label
                    class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                    >{{ $t('receipts.receiptDetail.pricePerUnit') }}</label
                  >
                  <input
                    v-model.number="editedItems[item.id].pricePerUnit"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    @input="calculateTotalPrice(item.id)"
                  />
                </div>
                <div>
                  <label
                    class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                    >{{ $t('receipts.receiptDetail.weight') }}</label
                  >
                  <input
                    v-model.number="editedItems[item.id].weightOriginal"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
                <div class="relative">
                  <label
                    class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                    >{{ $t('receipts.receiptDetail.unit') }}</label
                  >
                  <input
                    v-model="editedItems[item.id].unit"
                    type="text"
                    class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    :placeholder="$t('receipts.receiptDetail.unitPlaceholder')"
                    @input="onUnitInput(item.id)"
                    @keydown="
                      onAutocompleteKeydown($event, item.id, 'unit')
                    "
                    @blur="hideItemSuggestions(item.id, 'unit')"
                  />
                  <div
                    v-if="
                      itemSuggestions[item.id]?.unit?.show &&
                      (itemSuggestions[item.id]?.unit?.options?.length ??
                        0) > 0
                    "
                    class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-20 max-h-32 overflow-y-auto"
                  >
                    <div
                      v-for="(suggestion, index) in itemSuggestions[item.id]
                        ?.unit?.options ?? []"
                      :key="suggestion"
                      class="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-white"
                      :class="{
                        'bg-blue-100 dark:bg-blue-900':
                          index ===
                          (itemSuggestions[item.id]?.unit?.selectedIndex ??
                            -1),
                      }"
                      @mousedown="
                        selectSuggestion(item.id, 'unit', suggestion)
                      "
                    >
                      {{ suggestion }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Notes -->
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                  >{{ $t('receipts.receiptDetail.notes') }}</label
                >
                <textarea
                  v-model="editedItems[item.id].notes"
                  rows="2"
                  class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
                  :placeholder="$t('receipts.receiptDetail.additionalNotes')"
                />
              </div>

              <!-- Total Price Display -->
              <div class="bg-gray-50 dark:bg-gray-600 rounded px-3 py-2">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300"
                  >{{ $t('receipts.receiptDetail.totalPrice') }}
                </span>
                <span class="font-semibold text-gray-900 dark:text-white">{{
                  formatAmount(editedItems[item.id].totalPrice || 0, receipt.currency || 'USD')
                }}</span>
              </div>

              <!-- Action buttons -->
              <div class="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-2">
                <button
                  class="btn-success w-full sm:w-auto"
                  @click="saveEditedItem(item.id)"
                >
                  {{ $t('receipts.receiptDetail.save') }}
                </button>
                <button
                  class="btn-secondary w-full sm:w-auto"
                  @click="cancelEditingItem(item.id)"
                >
                  {{ $t('receipts.receiptDetail.cancel') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Debug Toggle -->
      <div class="mt-8 text-center">
        <button
          class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
          @click="showDebugInfo = !showDebugInfo"
        >
          {{ showDebugInfo ? $t('receipts.receiptDetail.hideDebugInfo') : $t('receipts.receiptDetail.showDebugInfo') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Full-size Image Modal -->
  <div
    v-if="showImageModal"
    class="fixed inset-0 z-50 bg-black bg-opacity-75"
    @click="showImageModal = false"
  >
    <div class="w-full h-full overflow-auto p-4" @click="handleModalContentClick">
      <div class="min-h-full flex items-center justify-center">
        <div class="relative">
          <img
            v-if="imageUrl && !imageError"
            :src="imageUrl"
            :alt="receipt?.filename ?? 'Receipt'"
            crossorigin="use-credentials"
            class="max-w-full h-auto"
          />
          <!-- Close button - fixed position -->
          <button
            class="fixed top-4 right-4 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2 transition-colors z-10"
            @click="showImageModal = false"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTranslation } from "@/composables/useTranslation";
import { TIMEOUT } from "@/constants/app";
import { useReceiptsStore } from "@/stores/receipts";
import { useCategoriesStore } from "@/stores/categories";
import LocalizedDateInput from "@/components/common/LocalizedDateInput.vue";
import { getApiBaseUrl } from "@/services/api";
import { receiptsService } from "@/services/receipts";
import { shoppingListService } from "@/services/shoppingList.service";
import { useNotifications } from "@/composables/useNotifications";
import { useRouteValidation } from "@/utils/routeValidation";
import { useDateLocalization } from "@/composables/useDateLocalization";
import { useCurrencyFormat } from "@/composables/useCurrencyFormat";
import type { Receipt } from "@/types/receipt";
import { getCurrentLocale } from "@/i18n";

const { t, locale } = useTranslation();
const route = useRoute();
const router = useRouter();
const receiptsStore = useReceiptsStore();
const categoriesStore = useCategoriesStore();
const { formatDate, formatDateTime } = useDateLocalization();
const { formatAmount } = useCurrencyFormat();

const receipt = ref<Receipt | null>(null);

// Helper function to format unit price for translation
const formatUnitPrice = (pricePerUnit: number) => {
  return formatAmount(pricePerUnit, receipt.value?.currency || 'USD');
};

// Format date to YYYY-MM-DD using local timezone (not UTC)
// This prevents off-by-one day issues for users in timezones like UTC+1
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const loading = ref(true);
const error = ref<string | null>(null);
const showDebugInfo = ref(false);
const imageError = ref<string | null>(null);
const showImageModal = ref(false);
const togglingFavoriteItemId = ref<number | null>(null);

const handleModalContentClick = (event: MouseEvent) => {
  event.stopPropagation();
};

// Editing state
const editingStore = ref(false);
const editedStoreName = ref("");
const storeSuggestions = ref({
  show: false,
  options: [] as string[],
  selectedIndex: -1,
});

const editingDate = ref(false);
const editedReceiptDate = ref("");

// Receipt item editing
const editingItems = ref({} as Record<number, boolean>);
const editedItems = ref({} as Record<number, any>);
// Category suggestion type for autocomplete
interface CategorySuggestion {
  id: number;
  name: string;
}
const itemSuggestions = ref(
  {} as Record<
    number,
    {
      itemName?: { show: boolean; options: string[]; selectedIndex: number };
      category?: { show: boolean; options: (string | CategorySuggestion)[]; selectedIndex: number };
      unit?: { show: boolean; options: string[]; selectedIndex: number };
    }
  >,
);

const autocompleteOptions = ref<string[]>([]);
const selectedIndex = ref(-1);
const autocompleteDebouncer = ref<number | null>(null);

// Store suggestions (legacy naming for compatibility)
const showStoreSuggestions = ref(false);
const storeNameSuggestions = ref<string[]>([]);
const selectedSuggestionIndex = ref(-1);
const suggestionTimeout = ref<number | null>(null);

// Global notifications
const { success: showSuccess, error: showError } = useNotifications();

// Route validation
const { validateReceiptId, handleValidationError, sanitizeStringParam, sanitizeItemName, sanitizeText } =
  useRouteValidation();

const receiptId = computed(() => {
  const validation = validateReceiptId(route.params.id);
  if (!validation.isValid) {
    console.error("Invalid receipt ID parameter:", validation.error);
    handleValidationError(validation, router);
    return null;
  }
  return validation.value as number;
});

const imageUrl = computed(() => {
  if (!receipt.value?.id) return null;
  return `${getApiBaseUrl()}/receipts/${receipt.value.id}/image`;
});

const fetchReceipt = async () => {
  if (!receiptId.value) {
    error.value = t('errors.generic');
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const data = await receiptsStore.getReceiptDetails(receiptId.value);
    console.log("Receipt data received:", data);
    console.log("Items count received:", data.items?.length || 0);

    if (data.items) {
      console.log("First few items:", data.items.slice(0, 5));
    }

    receipt.value = data;
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : t('errors.receiptNotFound');
    console.error("Error fetching receipt:", err);
  } finally {
    loading.value = false;
  }
};

const handleReprocess = async () => {
  if (!receipt.value) return;

  try {
    await receiptsStore.reprocessReceipt(receipt.value.id);
    // Refresh receipt data
    await fetchReceipt();
  } catch (err) {
    console.error("Failed to reprocess receipt:", err);
  }
};

const handleDelete = async () => {
  if (!receipt.value) return;

  const confirmDelete = confirm(
    t('receipts.receiptDetail.deleteConfirmation', {
      filename: receipt.value.filename,
      date: receipt.value.receiptDate ? formatDate(receipt.value.receiptDate) : t('common.no')
    })
  );

  if (!confirmDelete) return;

  try {
    await receiptsStore.deleteReceipt(receipt.value.id);
    // Navigate back to receipts list
    router.push("/receipts");
  } catch (err) {
    console.error("Failed to delete receipt:", err);
    alert(t('receipts.receiptDetail.failedToDelete'));
  }
};

// Store name editing
const startEditingStoreName = () => {
  editedStoreName.value = receipt.value?.storeName || "";
  editingStore.value = true;
};

const saveEditedStoreName = async () => {
  if (!receipt.value || !editedStoreName.value.trim()) return;

  const sanitizedStoreName = sanitizeText(editedStoreName.value.trim());
  if (!sanitizedStoreName) {
    showError(t('receipts.receiptDetail.updateFailed'), t('receipts.receiptDetail.failedToUpdate', { field: t('receipts.storeName') }));
    return;
  }

  try {
    await receiptsStore.updateReceipt(receipt.value.id, {
      storeName: sanitizedStoreName,
      receiptDate: receipt.value.receiptDate,
    });

    // Update local state with the sanitized store name
    receipt.value.storeName = sanitizedStoreName;
    editedStoreName.value = sanitizedStoreName;

    editingStore.value = false;
    showStoreSuggestions.value = false;
    showSuccess(t('receipts.receiptDetail.storeNameUpdated'));
  } catch (error) {
    console.error("Failed to update store name:", error);
    showError(
      t('receipts.receiptDetail.updateFailed'),
      t('receipts.receiptDetail.failedToUpdate', { field: t('receipts.storeName') })
    );
  }
};

const cancelEditingStoreName = () => {
  editingStore.value = false;
  editedStoreName.value = "";
  showStoreSuggestions.value = false;
  storeNameSuggestions.value = [];
};

// Store name autocomplete methods
const fetchStoreSuggestions = async (query: string) => {
  if (query.trim().length < 1) {
    showStoreSuggestions.value = false;
    storeNameSuggestions.value = [];
    return;
  }

  try {
    const suggestions = await receiptsService.getStoreNames(query);
    if (suggestions.length > 0 && query.trim().length > 0) {
      storeNameSuggestions.value = suggestions;
      showStoreSuggestions.value = true;
      selectedSuggestionIndex.value = -1;
    } else {
      showStoreSuggestions.value = false;
      storeNameSuggestions.value = [];
    }
  } catch (error) {
    console.error("Failed to fetch store suggestions:", error);
    showStoreSuggestions.value = false;
    storeNameSuggestions.value = [];
  }
};

const onStoreNameInput = () => {
  if (suggestionTimeout.value) {
    clearTimeout(suggestionTimeout.value);
  }

  suggestionTimeout.value = window.setTimeout(() => {
    fetchStoreSuggestions(editedStoreName.value);
  }, 300);
};

const onStoreNameKeydown = (event: KeyboardEvent) => {
  if (!showStoreSuggestions.value || storeNameSuggestions.value.length === 0)
    return;

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      selectedSuggestionIndex.value = Math.min(
        selectedSuggestionIndex.value + 1,
        storeNameSuggestions.value.length - 1,
      );
      break;
    case "ArrowUp":
      event.preventDefault();
      selectedSuggestionIndex.value = Math.max(
        selectedSuggestionIndex.value - 1,
        -1,
      );
      break;
    case "Enter":
      event.preventDefault();
      if (selectedSuggestionIndex.value >= 0) {
        selectStoreSuggestion(
          storeNameSuggestions.value[selectedSuggestionIndex.value],
        );
      }
      break;
    case "Escape":
      showStoreSuggestions.value = false;
      selectedSuggestionIndex.value = -1;
      break;
  }
};

const onStoreNameBlur = () => {
  // Delay hiding suggestions to allow for click events
  setTimeout(() => {
    showStoreSuggestions.value = false;
    selectedSuggestionIndex.value = -1;
  }, TIMEOUT.DEBOUNCE_AUTOCOMPLETE);
};

const selectStoreSuggestion = (suggestion: string) => {
  editedStoreName.value = suggestion;
  showStoreSuggestions.value = false;
  selectedSuggestionIndex.value = -1;
};

// Date editing
const startEditingDate = () => {
  // Convert receipt date to YYYY-MM-DD format for date input
  if (receipt.value?.receiptDate) {
    const date = new Date(receipt.value.receiptDate);
    editedReceiptDate.value = formatLocalDate(date);
  } else {
    editedReceiptDate.value = "";
  }
  editingDate.value = true;
};

const saveEditedDate = async () => {
  if (!receipt.value || !editedReceiptDate.value) return;

  const dateToSave = new Date(editedReceiptDate.value)
    .toISOString()
    .split("T")[0];

  try {
    await receiptsStore.updateReceipt(receipt.value.id, {
      storeName: receipt.value.storeName,
      receiptDate: dateToSave,
    });

    // Update local state with the new date
    receipt.value.receiptDate = dateToSave;

    editingDate.value = false;
    showSuccess(t('receipts.receiptDetail.dateUpdated'));
  } catch (error) {
    console.error("Failed to update date:", error);
    showError(t('receipts.receiptDetail.failedToUpdate', { field: t('receipts.date') }));
  }
};

const cancelEditingDate = () => {
  editingDate.value = false;
  editedReceiptDate.value = "";
};

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  imageError.value = `Failed to load image: ${target.src}`;
};


const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400";
    case "pending":
      return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400";
    case "processing":
      return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400";
    case "failed":
      return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400";
    default:
      return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
  }
};

// Utility function to capitalize first letter
const capitalizeFirst = (str: string) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Toggle favorite for receipt item
const handleToggleItemFavorite = async (item: any) => {
  if (!item.productId || togglingFavoriteItemId.value !== null) return;

  togglingFavoriteItemId.value = item.id;
  try {
    const currentState = item.isFavorite || false;
    if (currentState) {
      await shoppingListService.removeFavorite(item.productId);
    } else {
      await shoppingListService.addFavorite(item.productId);
    }
    // Update the local state
    item.isFavorite = !currentState;
  } catch (err) {
    console.error("Failed to toggle favorite:", err);
  } finally {
    togglingFavoriteItemId.value = null;
  }
};

// Receipt item editing methods
const startEditingItem = (item: any) => {
  editingItems.value[item.id] = true;
  editedItems.value[item.id] = { ...item };
  // Initialize category input with current category name
  editedItems.value[item.id].categoryInput = item.category?.name || item.categoryRaw || '';
  editedItems.value[item.id].categorySelectedId = item.category?.id || undefined;
  editedItems.value[item.id].newCategoryName = "";

  // Initialize suggestions for this item
  itemSuggestions.value[item.id] = {
    itemName: { show: false, options: [], selectedIndex: -1 },
    category: { show: false, options: [], selectedIndex: -1 },
    unit: { show: false, options: [], selectedIndex: -1 },
  };
};

const cancelEditingItem = (itemId: number) => {
  editingItems.value[itemId] = false;
  delete editedItems.value[itemId];
  delete itemSuggestions.value[itemId];
};

const calculateTotalPrice = (itemId: number) => {
  const item = editedItems.value[itemId];
  if (item) {
    item.totalPrice = (item.quantity || 1) * (item.pricePerUnit || 0);
  }
};

const saveEditedItem = async (itemId: number) => {
  try {
    const editedItem = editedItems.value[itemId];
    if (!editedItem) return;

    // Sanitize and validate string inputs
    const sanitizedItemName = sanitizeItemName(editedItem.itemName || "");
    const idNum = Number(editedItem.categorySelectedId);
    const selectedCategoryId: number | undefined = Number.isFinite(idNum) && idNum > 0 ? idNum : undefined;
    const newCategoryName = sanitizeItemName(editedItem.newCategoryName || "");
    const sanitizedUnit = sanitizeItemName(editedItem.unit || "");
    const sanitizedNotes = sanitizeItemName(editedItem.notes || "");

    if (!sanitizedItemName) {
      showError(t('receipts.receiptDetail.updateFailed'), t('receipts.receiptDetail.failedToUpdate', { field: t('receipts.receiptDetail.itemName') }));
      return;
    }

    // Build minimal payload (avoid leaking reactive/unknown fields)
    const itemToSave: any = {
      itemName: sanitizedItemName,
      quantity: editedItem.quantity ?? 1,
      unit: sanitizedUnit,
      pricePerUnit: editedItem.pricePerUnit ?? 0,
      totalPrice: (editedItem.quantity || 1) * (editedItem.pricePerUnit || 0),
      weightOriginal: editedItem.weightOriginal ? String(editedItem.weightOriginal) : null,
      weightNormalizedKg: editedItem.weightNormalizedKg ?? null,
      notes: sanitizedNotes,
      status: editedItem.status ?? 'complete',
    };

    // Build category payload
    const categoryInput = sanitizeItemName(editedItem.categoryInput || "");

    if (selectedCategoryId) {
      // User selected an existing category from the list
      itemToSave.category = { id: selectedCategoryId };
    } else if (categoryInput) {
      // User entered a new category name (not in the list)
      const currentLocale = getCurrentLocale();
      itemToSave.category = {
        id: null,  // Signal to backend that this is a new category
        name: categoryInput,
        locale: currentLocale
      };
    } else if (newCategoryName) {
      // Legacy fallback
      const currentLocale = getCurrentLocale();
      itemToSave.category = { name: newCategoryName, locale: currentLocale };
    } else if (
      typeof editedItem.category === 'string' &&
      editedItem.category.trim().length > 0
    ) {
      // Fallback: legacy text category input still present
      const currentLocale = getCurrentLocale();
      itemToSave.category = {
        name: editedItem.category.trim(),
        locale: currentLocale,
      };
    }

    const updatedItem = await receiptsService.updateReceiptItem(
      itemId,
      itemToSave,
    );

    // If we added a new category, trigger an immediate refresh of categories
    // to pick up the new category and any pending translations
    if (newCategoryName) {
      const currentLocale = getCurrentLocale();
      await categoriesStore.fetchCategories(currentLocale);
    }

    // Update the receipt item in the local state
    if (receipt.value?.items) {
      const itemIndex = receipt.value.items.findIndex(
        (item) => item.id === itemId,
      );
      if (itemIndex !== -1) {
        receipt.value.items[itemIndex] = updatedItem;
      }
    }

    editingItems.value[itemId] = false;
    delete editedItems.value[itemId];
    delete itemSuggestions.value[itemId];

    showSuccess(t('receipts.receiptDetail.itemUpdated'));
  } catch (error) {
    console.error("Failed to update item:", error);
    showError(t('receipts.receiptDetail.failedToUpdate', { field: t('receipts.items') }));
  }
};

// Autocomplete methods for item name
const onItemNameInput = async (itemId: number) => {
  const item = editedItems.value[itemId];
  if (!item) return;

  if (item.itemName && item.itemName.length > 0) {
    try {
      const suggestions = await receiptsService.getItemNames(item.itemName);
      if (itemSuggestions.value[itemId]?.itemName) {
        itemSuggestions.value[itemId].itemName!.options = suggestions;
        itemSuggestions.value[itemId].itemName!.show = suggestions.length > 0;
        itemSuggestions.value[itemId].itemName!.selectedIndex = -1;
      }
    } catch (error) {
      console.error("Failed to fetch item name suggestions:", error);
    }
  } else {
    hideItemSuggestions(itemId, "itemName");
  }
};

// Autocomplete methods for category
const onCategoryInputChange = async (itemId: number) => {
  const item = editedItems.value[itemId];
  if (!item) return;

  const searchText = item.categoryInput || '';

  if (searchText.length > 0) {
    try {
      // Get all categories from the store
      const currentLocale = getCurrentLocale();
      const allCategories = categoriesStore.byLocale[currentLocale] || [];

      // Filter categories based on input
      const filtered = allCategories.filter(cat =>
        cat.name.toLowerCase().includes(searchText.toLowerCase())
      );

      if (itemSuggestions.value[itemId]?.category) {
        itemSuggestions.value[itemId].category!.options = filtered;
        itemSuggestions.value[itemId].category!.show = filtered.length > 0;
        itemSuggestions.value[itemId].category!.selectedIndex = -1;
      }

      // Reset selected ID if user is typing something new
      editedItems.value[itemId].categorySelectedId = undefined;
    } catch (error) {
      console.error("Failed to filter category suggestions:", error);
    }
  } else {
    hideItemSuggestions(itemId, "category");
    editedItems.value[itemId].categorySelectedId = undefined;
  }
};

const selectCategorySuggestion = (itemId: number, suggestion: any) => {
  const item = editedItems.value[itemId];
  if (!item) return;

  // Set the selected category
  item.categoryInput = suggestion.name;
  item.categorySelectedId = suggestion.id;

  // Hide suggestions
  hideItemSuggestions(itemId, "category");
};

// Autocomplete methods for unit
const onUnitInput = async (itemId: number) => {
  const item = editedItems.value[itemId];
  if (!item) return;

  if (item.unit && item.unit.length > 0) {
    try {
      const suggestions = await receiptsService.getUnits(item.unit);
      if (itemSuggestions.value[itemId]?.unit) {
        itemSuggestions.value[itemId].unit!.options = suggestions;
        itemSuggestions.value[itemId].unit!.show = suggestions.length > 0;
        itemSuggestions.value[itemId].unit!.selectedIndex = -1;
      }
    } catch (error) {
      console.error("Failed to fetch unit suggestions:", error);
    }
  } else {
    hideItemSuggestions(itemId, "unit");
  }
};

const hideItemSuggestions = (
  itemId: number,
  field: "itemName" | "category" | "unit",
) => {
  setTimeout(() => {
    if (itemSuggestions.value[itemId]?.[field]) {
      itemSuggestions.value[itemId][field]!.show = false;
    }
  }, 200);
};

const selectSuggestion = (
  itemId: number,
  field: "itemName" | "category" | "unit",
  suggestion: string | CategorySuggestion,
) => {
  const item = editedItems.value[itemId];
  if (item && itemSuggestions.value[itemId]?.[field]) {
    // Extract string value from suggestion (handle both string and CategorySuggestion)
    const suggestionValue = typeof suggestion === 'string' ? suggestion : suggestion.name;
    item[field] = suggestionValue;
    itemSuggestions.value[itemId][field]!.show = false;

    if (field === "itemName" || field === "category") {
      // Trigger potential price calculation if needed
    }
  }
};

const onAutocompleteKeydown = (
  event: KeyboardEvent,
  itemId: number,
  field: "itemName" | "category" | "unit",
) => {
  const suggestions = itemSuggestions.value[itemId]?.[field];
  if (!suggestions || !suggestions.show || suggestions.options.length === 0)
    return;

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      suggestions.selectedIndex = Math.min(
        suggestions.selectedIndex + 1,
        suggestions.options.length - 1,
      );
      break;
    case "ArrowUp":
      event.preventDefault();
      suggestions.selectedIndex = Math.max(suggestions.selectedIndex - 1, -1);
      break;
    case "Enter":
      event.preventDefault();
      if (suggestions.selectedIndex >= 0) {
        selectSuggestion(
          itemId,
          field,
          suggestions.options[suggestions.selectedIndex],
        );
      }
      break;
    case "Escape":
      event.preventDefault();
      hideItemSuggestions(itemId, field);
      break;
  }
};

// Handle keyboard events
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && showImageModal.value) {
    showImageModal.value = false;
  }
};

onMounted(() => {
  const loc = getCurrentLocale();
  categoriesStore.fetchCategories(loc);
  // Start auto-refreshing categories to pick up new translations
  categoriesStore.startAutoRefresh();
  fetchReceipt();

  // Add keyboard event listener
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  // Clean up auto-refresh when leaving the component
  categoriesStore.stopAutoRefresh();

  // Remove keyboard event listener
  document.removeEventListener('keydown', handleKeydown);
});

// React to language changes: reload categories (names update automatically)
watch(
  () => locale.value,
  async (newLoc) => {
    await categoriesStore.fetchCategories(newLoc as string);
    // Optionally re-fetch receipt if you want fresh categoryRaw too
    // await fetchReceipt();
  },
);
</script>
