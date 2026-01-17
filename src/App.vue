<template>
  <EnhancedErrorBoundary
    fallback="ShopTrack encountered an unexpected error. Please refresh the page to continue."
    :capture-async="true"
    :max-retries="3"
  >
    <div class="bg-gray-100 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      <!-- Main Header -->
      <header v-if="authStore.isAuthenticated" class="bg-white dark:bg-gray-800 shadow-sm transition-colors duration-300">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-2 sm:py-3">
            <!-- Logo -->
            <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex-shrink-0">
              <RouterLink to="/">ShopTrack</RouterLink>
            </h1>

            <!-- Right side: Search + Utilities -->
            <div class="flex items-center space-x-2 sm:space-x-4">
              <!-- Search (Desktop) -->
              <div class="hidden md:flex">
                <SearchInput
                  :config="{
                    placeholder: t('search.placeholder'),
                    minQueryLength: 2,
                    maxResults: 8
                  }"
                  @result-select="handleSearchResultSelect"
                />
              </div>

              <!-- Search Icon (Mobile) -->
              <button
                class="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                @click="mobileSearchOpen = !mobileSearchOpen"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              <div class="hidden sm:block">
                <LanguageSwitcher />
              </div>
              <NotificationMenu />

              <!-- User Menu Dropdown -->
              <div class="relative" ref="userMenuRef">
                <button
                  class="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                  @click="toggleUserMenu"
                >
                  <img
                    v-if="authStore.user?.profilePicture"
                    :src="safeImageUrl(authStore.user.profilePicture)"
                    :alt="displayName"
                    class="h-8 w-8 rounded-full object-cover"
                  />
                  <div v-else class="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <svg class="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </button>
                <transition enter-active-class="transition ease-out duration-200" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
                  <div v-show="userMenuOpen" class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 dark:divide-gray-700 focus:outline-none z-50">
                    <div class="px-4 py-3">
                      <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('common.signedInAs') }}</p>
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ displayName }}</p>
                    </div>
                    <div class="py-1">
                      <RouterLink to="/profile" class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" @click="userMenuOpen = false">
                        <svg class="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {{ t('profile.title') }}
                      </RouterLink>
                      <RouterLink to="/billing" class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" @click="userMenuOpen = false">
                        <svg class="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        {{ t('billing.title') }}
                      </RouterLink>
                      <button class="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer" @click="toggleTheme">
                        <span class="flex items-center">
                          <svg class="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                          </svg>
                          {{ t('settings.theme') }}
                        </span>
                        <ThemeToggle simple />
                      </button>
                    </div>
                    <div class="py-1">
                      <button class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" @click="handleLogout">
                        <svg class="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {{ t('navigation.logout') }}
                      </button>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile Search Panel -->
        <div
          v-show="mobileSearchOpen"
          class="md:hidden border-t border-gray-200 dark:border-gray-700 px-4 py-3"
        >
          <SearchInput
            :config="{
              placeholder: t('search.placeholder'),
              minQueryLength: 2,
              maxResults: 8
            }"
            @result-select="handleMobileSearchSelect"
          />
        </div>
      </header>

      <!-- Secondary Navigation -->
      <nav v-if="authStore.isAuthenticated" class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Desktop Navigation -->
          <div class="hidden md:flex items-center space-x-1 py-2">
            <RouterLink
              to="/upload"
              class="flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors"
              :class="$route.name === 'upload'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'"
            >
              <span class="mr-2">📤</span>
              {{ t('common.upload') }}
            </RouterLink>
            <RouterLink
              to="/receipts"
              class="flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors"
              :class="$route.name === 'receipts' || $route.name === 'receipt-detail'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'"
            >
              <span class="mr-2">🧾</span>
              {{ t('navigation.receipts') }}
            </RouterLink>
            <RouterLink
              to="/reports"
              class="flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors"
              :class="$route.name === 'reports'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'"
            >
              <span class="mr-2">📊</span>
              {{ t('navigation.reports') }}
            </RouterLink>
            <RouterLink
              v-if="featureFlags.nfcProducts"
              to="/nfc-products"
              class="flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors"
              :class="$route.name === 'nfc-products'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'"
            >
              <span class="mr-2">📱</span>
              NFC
            </RouterLink>
            <RouterLink
              to="/shopping-lists"
              class="flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors"
              :class="$route.name === 'shopping-lists' || $route.name === 'shopping-list-detail'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'"
            >
              <span class="mr-2">🛒</span>
              {{ t('navigation.shoppingLists') }}
            </RouterLink>
          </div>

          <!-- Mobile Navigation -->
          <div class="md:hidden flex items-center justify-between py-2">
            <div class="flex items-center space-x-1 overflow-x-auto scrollbar-hide">
              <RouterLink
                to="/upload"
                class="flex items-center px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors"
                :class="$route.name === 'upload'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
              >
                📤
              </RouterLink>
              <RouterLink
                to="/receipts"
                class="flex items-center px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors"
                :class="$route.name === 'receipts' || $route.name === 'receipt-detail'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
              >
                🧾
              </RouterLink>
              <RouterLink
                to="/reports"
                class="flex items-center px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors"
                :class="$route.name === 'reports'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
              >
                📊
              </RouterLink>
              <RouterLink
                v-if="featureFlags.nfcProducts"
                to="/nfc-products"
                class="flex items-center px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors"
                :class="$route.name === 'nfc-products'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
              >
                📱
              </RouterLink>
              <RouterLink
                to="/shopping-lists"
                class="flex items-center px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors"
                :class="$route.name === 'shopping-lists' || $route.name === 'shopping-list-detail'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
              >
                🛒
              </RouterLink>
            </div>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <EnhancedErrorBoundary fallback="This section encountered an error. Please try refreshing the page." :capture-async="true">
          <router-view />
        </EnhancedErrorBoundary>
      </main>
    </div>
  </EnhancedErrorBoundary>
  <NotificationContainer />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import EnhancedErrorBoundary from '@/components/EnhancedErrorBoundary.vue';
import NotificationContainer from '@/components/NotificationContainer.vue';
import { RouterLink, useRouter } from 'vue-router';
import { useTranslation } from '@/composables/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import NotificationMenu from '@/components/notifications/NotificationMenu.vue';
import SearchInput from '@/components/SearchInput.vue';
import { useAuthStore } from '@/stores/auth';
import { safeImageUrl } from '@/utils/urlSanitizer';
import { useDarkMode } from '@/composables/useDarkMode';
import { useCategoriesStore } from '@/stores/categories';
import { useShoppingListStore } from '@/stores/shoppingList';
import { availableLocales } from '@/i18n';
import type { SearchResultItem } from '@/types/search';
import { featureFlags } from '@/config/featureFlags';

const authStore = useAuthStore();
const shoppingListStore = useShoppingListStore();
const { t } = useTranslation();
const router = useRouter();
const { toggleMode: toggleTheme } = useDarkMode();
const userMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);
const mobileSearchOpen = ref(false);

const displayName = computed(() => authStore.user?.firstName || authStore.user?.email || 'User');

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value;
}

function handleClickOutside(event: Event) {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    userMenuOpen.value = false;
  }
}

async function handleLogout() {
  await authStore.logout();
  userMenuOpen.value = false;
  router.push('/login');
}

function handleSearchResultSelect(result: SearchResultItem) {
  // Navigation is handled by SearchInput component
  console.log('Search result selected:', result);
}

function handleMobileSearchSelect(result: SearchResultItem) {
  // Close mobile search panel
  mobileSearchOpen.value = false;
  // Navigation is handled by SearchInput component
  console.log('Mobile search result selected:', result);
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  // Preload categories only if user is authenticated
  if (authStore.isAuthenticated) {
    const categoriesStore = useCategoriesStore();
    categoriesStore.fetchAllLocales(availableLocales.map(l => l.code));

    // Initialize WebSocket for real-time shopping list updates
    shoppingListStore.initWebSocket();
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  // Disconnect WebSocket when app unmounts
  shoppingListStore.disconnectWebSocket();
});
</script>

<style>
/* Styles primarily come from Tailwind classes and main.css */
</style>
