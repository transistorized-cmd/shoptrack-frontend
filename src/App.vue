<template>
  <EnhancedErrorBoundary
    fallback="ShopTrack encountered an unexpected error. Please refresh the page to continue."
    :capture-async="true"
    :max-retries="3"
  >
    <div class="bg-gray-100 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      <!-- Navigation -->
      <nav v-if="authStore.isAuthenticated" class="bg-white dark:bg-gray-800 shadow-md transition-colors duration-300">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-3 sm:py-4">
            <div class="flex items-center flex-1">
              <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex-shrink-0">
                <RouterLink to="/">ShopTrack</RouterLink>
              </h1>

              <!-- Desktop Navigation -->
              <nav class="hidden md:flex space-x-6 lg:space-x-8 ml-6 lg:ml-8">
                <RouterLink
                  to="/upload"
                  class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap"
                  :class="{ 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400': $route.name === 'upload' }"
                >
                  📤 {{ $t('common.upload') }}
                </RouterLink>
                <RouterLink
                  to="/receipts"
                  class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap"
                  :class="{ 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400': $route.name === 'receipts' }"
                >
                  🧾 {{ $t('navigation.receipts') }}
                </RouterLink>
                <RouterLink
                  to="/reports"
                  class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap"
                  :class="{ 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400': $route.name === 'reports' }"
                >
                  📊 {{ $t('navigation.reports') }}
                </RouterLink>
              </nav>

              <!-- Search (Desktop only) -->
              <div class="hidden lg:flex ml-4 lg:ml-6">
                <SearchInput
                  :config="{
                    placeholder: $t('search.placeholder', 'Search receipts, items, categories...'),
                    minQueryLength: 2,
                    maxResults: 8
                  }"
                  @result-select="handleSearchResultSelect"
                />
              </div>

              <!-- Mobile Menu Button -->
              <button
                class="md:hidden ml-auto mr-2 p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                @click="mobileMenuOpen = !mobileMenuOpen"
              >
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- User Menu -->
            <div class="flex items-center space-x-2 sm:space-x-4">
              <div class="hidden sm:block">
                <LanguageSwitcher />
              </div>
              <ThemeToggle simple />
              <NotificationMenu />

              <div class="hidden lg:flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <span class="truncate max-w-32">{{ $t('common.hello', { name: displayName }) }}</span>
              </div>

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
                  <div v-show="userMenuOpen" class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 dark:divide-gray-700 focus:outline-none z-10">
                    <div class="py-1">
                      <RouterLink to="/profile" class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" @click="userMenuOpen = false">
                        <svg class="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {{ $t('profile.title') }}
                      </RouterLink>
                    </div>
                    <div class="py-1">
                      <button class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" @click="handleLogout">
                        <svg class="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {{ $t('navigation.logout') }}
                      </button>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>

          <!-- Mobile Navigation Menu -->
          <div v-show="mobileMenuOpen" class="md:hidden border-t border-gray-200 dark:border-gray-700">
            <div class="px-2 pt-2 pb-3 space-y-1">
              <RouterLink to="/upload" class="block px-3 py-2 text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors" :class="{ 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20': $route.name === 'upload' }" @click="mobileMenuOpen = false">
                📤 {{ $t('common.upload') }}
              </RouterLink>
              <RouterLink to="/receipts" class="block px-3 py-2 text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors" :class="{ 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20': $route.name === 'receipts' }" @click="mobileMenuOpen = false">
                🧾 {{ $t('navigation.receipts') }}
              </RouterLink>
              <RouterLink to="/reports" class="block px-3 py-2 text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors" :class="{ 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20': $route.name === 'reports' }" @click="mobileMenuOpen = false">
                📊 {{ $t('navigation.reports') }}
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
import { useI18n } from 'vue-i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import NotificationMenu from '@/components/notifications/NotificationMenu.vue';
import SearchInput from '@/components/SearchInput.vue';
import { useAuthStore } from '@/stores/auth';
import { safeImageUrl } from '@/utils/urlSanitizer';
import { useCategoriesStore } from '@/stores/categories';
import { availableLocales } from '@/i18n';
import type { SearchResultItem } from '@/types/search';

const authStore = useAuthStore();
const { t } = useI18n();
const router = useRouter();
const mobileMenuOpen = ref(false);
const userMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);

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
  // Close mobile menu if open
  mobileMenuOpen.value = false;

  // Navigation is handled by SearchInput component
  // This function can be used for additional tracking or actions
  console.log('Search result selected:', result);
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  // Preload categories for all locales once
  const categoriesStore = useCategoriesStore();
  categoriesStore.fetchAllLocales(availableLocales.map(l => l.code));
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style>
/* Styles primarily come from Tailwind classes and main.css */
</style>
