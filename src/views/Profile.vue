<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-6 sm:mb-8">
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{{ $t('profile.title') }}</h1>
        <p class="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {{ $t('profile.subtitle') }}
        </p>
      </div>

      <!-- Success/Error Messages -->
      <div v-if="successMessage" class="mb-6 rounded-md bg-green-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-green-800">{{ successMessage }}</p>
          </div>
        </div>
      </div>

      <div v-if="error" class="mb-6 rounded-md bg-red-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-red-800">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <!-- Profile Summary Card -->
        <div class="lg:col-span-1 order-1">
          <div class="card rounded-xl p-6 sm:p-8 text-center">
            <!-- Profile Picture -->
            <div class="relative inline-block mb-4 sm:mb-6">
              <img
                v-if="authStore.user?.profilePicture"
                :src="safeImageUrl(authStore.user?.profilePicture)"
                :alt="`${authStore.user?.firstName || 'User'}'s avatar`"
                class="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-gray-200 dark:border-white/20"
              />
              <div
                v-else
                class="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center border-4 border-gray-200 dark:border-white/20"
              >
                <svg class="w-12 h-12 sm:w-16 sm:h-16 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>

              <!-- Camera Icon -->
              <label class="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-blue-600 rounded-full p-2 sm:p-3 text-white cursor-pointer hover:bg-blue-700 shadow-lg transition-colors">
                <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  type="file"
                  class="sr-only"
                  accept="image/*"
                  @change="handleProfilePictureChange"
                />
              </label>
            </div>
            
            <!-- User Info -->
            <h2 class="text-xl sm:text-2xl font-bold mb-2 text-gray-900 dark:text-white">
              {{ displayName }}
            </h2>
            <p class="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 break-all">{{ authStore.user?.email }}</p>
            
            <!-- Verification Status -->
            <div class="flex items-center justify-center mb-4">
              <svg
                v-if="authStore.isEmailConfirmed"
                class="w-5 h-5 text-green-400 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg
                v-else
                class="w-5 h-5 text-yellow-400 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm text-gray-700 dark:text-gray-300">
                {{ authStore.isEmailConfirmed ? $t('profile.emailVerified') : $t('profile.emailNotVerified') }}
              </span>
            </div>
            
            <!-- Member Since -->
            <div class="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {{ $t('profile.memberSince') }} {{ memberSince }}
            </div>

            <!-- Action Buttons -->
            <div class="space-y-3">
              <button
                v-if="!authStore.isEmailConfirmed"
                class="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                :disabled="loading"
                @click="resendEmailConfirmation"
              >
                {{ loading ? $t('profile.sending') : $t('profile.verifyEmail') }}
              </button>
              
              <button
                class="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                @click="handleLogout"
              >
                {{ $t('profile.signOut') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Personal Information -->
          <div class="card p-6">
            <div class="flex items-center mb-6">
              <svg class="w-6 h-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('profile.personalInformation') }}</h3>
            </div>
            
            <form @submit.prevent="updatePersonalInfo" class="space-y-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label for="firstName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ $t('profile.firstName') }} *
                  </label>
                  <input
                    id="firstName"
                    v-model="personalInfoForm.firstName"
                    type="text"
                    autocomplete="given-name"
                    class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                    :disabled="loading"
                    :placeholder="$t('profile.enterFirstName')"
                  />
                </div>
                
                <div>
                  <label for="lastName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ $t('profile.lastName') }} *
                  </label>
                  <input
                    id="lastName"
                    v-model="personalInfoForm.lastName"
                    type="text"
                    autocomplete="family-name"
                    class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                    :disabled="loading"
                    :placeholder="$t('profile.enterLastName')"
                  />
                </div>
              </div>
              
              <div>
                <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {{ $t('profile.emailAddress') }} *
                </label>
                <input
                  id="email"
                  v-model="personalInfoForm.email"
                  type="email"
                  autocomplete="email"
                  class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                  :disabled="loading"
                  :placeholder="$t('profile.enterEmailAddress')"
                />
                <p v-if="personalInfoForm.email !== authStore.user?.email" class="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  {{ $t('profile.emailChangeWarning') }}
                </p>
              </div>
              
              <div>
                <label for="userName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {{ $t('profile.username') }}
                </label>
                <input
                  id="userName"
                  v-model="personalInfoForm.userName"
                  type="text"
                  autocomplete="username"
                  class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                  :disabled="loading"
                  :placeholder="$t('profile.chooseUsername')"
                />
              </div>
              
              <div class="flex justify-end pt-4">
                <button
                  type="submit"
                  class="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  :disabled="loading"
                >
                  {{ loading ? $t('profile.updating') : $t('profile.updateInformation') }}
                </button>
              </div>
            </form>
          </div>

          <!-- Security Settings -->
          <div class="card p-6">
            <div class="flex items-center mb-6">
              <svg class="w-6 h-6 text-red-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('profile.securitySettings') }}</h3>
            </div>
            
            <!-- Change Password -->
            <div class="mb-8">
              <h4 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                <svg class="w-5 h-5 text-gray-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {{ $t('profile.passwordSection') }}
              </h4>
              
              <div v-if="!authStore.hasPassword" class="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm text-blue-800 dark:text-blue-200">
                      {{ $t('profile.socialAccountPassword') }}
                    </p>
                  </div>
                </div>
              </div>
              
              <form @submit.prevent="changePassword" class="space-y-4">
                <div v-if="authStore.hasPassword">
                  <label for="currentPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ $t('profile.currentPassword') }} *
                  </label>
                  <input
                    id="currentPassword"
                    v-model="passwordForm.currentPassword"
                    type="password"
                    autocomplete="current-password"
                    required
                    class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                    :disabled="loading"
                    :placeholder="$t('profile.enterCurrentPassword')"
                  />
                </div>
                
                <div>
                  <label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ authStore.hasPassword ? $t('profile.newPassword') + ' *' : $t('profile.passwordSection') + ' *' }}
                  </label>
                  <input
                    id="newPassword"
                    v-model="passwordForm.newPassword"
                    type="password"
                    autocomplete="new-password"
                    required
                    class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                    :disabled="loading"
                    :placeholder="$t('profile.enterStrongPassword')"
                  />
                </div>
                
                <div>
                  <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ $t('profile.confirmPassword') }} *
                  </label>
                  <input
                    id="confirmPassword"
                    v-model="passwordForm.confirmPassword"
                    type="password"
                    autocomplete="new-password"
                    required
                    class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                    :disabled="loading"
                    :placeholder="$t('profile.confirmYourPassword')"
                  />
                </div>
                
                <div class="flex justify-end pt-4">
                  <button
                    type="submit"
                    class="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    :disabled="loading || !isPasswordFormValid"
                  >
                    {{ loading ? $t('profile.updating') : (authStore.hasPassword ? $t('profile.changePassword') : $t('profile.setPassword')) }}
                  </button>
                </div>
              </form>
            </div>

            <!-- Passkeys Section -->
            <div class="mb-8">
              <h4 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                <svg class="w-5 h-5 text-gray-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                {{ $t('profile.passkeyManagement') }}
              </h4>
              
              <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center mb-2">
                      <h5 class="font-medium text-gray-900 dark:text-white">{{ $t('profile.passwordlessSignIn') }}</h5>
                      <span v-if="authStore.passkeysEnabled" class="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                        {{ $t('profile.passkeyActive') }}
                      </span>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {{ authStore.passkeysEnabled
                        ? $t('profile.passkeyEnabled')
                        : $t('profile.passkeySetupDescription')
                      }}
                    </p>
                  </div>
                  <div class="ml-6 flex-shrink-0">
                    <button
                      v-if="!authStore.passkeysEnabled && webauthn.isSupported"
                      class="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                      @click="setupPasskey"
                    >
                      {{ $t('profile.createPasskey') }}
                    </button>
                    <button
                      v-else-if="authStore.passkeysEnabled"
                      @click="removePasskey"
                      class="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                    >
                      {{ $t('profile.removePasskey') }}
                    </button>
                    <span
                      v-else
                      class="text-sm text-gray-500 dark:text-gray-400"
                    >
                      {{ $t('profile.notSupportedDevice') }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Preferences -->
          <div class="card p-6">
            <div class="flex items-center mb-6">
              <svg class="w-6 h-6 text-purple-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('profile.preferences') }}</h3>
            </div>
            
            <!-- Language Preference -->
            <div class="mb-6">
              <label for="languageSelect" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div class="flex items-center">
                  <svg class="w-5 h-5 text-gray-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  {{ $t('profile.displayLanguage') }}
                </div>
              </label>
              <div class="relative">
                <select
                  id="languageSelect"
                  v-model="selectedLanguage"
                  @change="handleLanguageChange"
                  class="w-full px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white appearance-none cursor-pointer transition-colors"
                  :disabled="loading"
                >
                  <option
                    v-for="locale in availableLocales"
                    :key="locale.code"
                    :value="locale.code"
                    class="flex items-center"
                  >
                    {{ locale.flag }} {{ locale.name }}
                  </option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {{ $t('profile.languageChangeDescription') }}
              </p>
            </div>

            <!-- Currency Setting -->
            <div class="mb-6">
              <label for="currencySelect" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div class="flex items-center">
                  <svg class="w-5 h-5 text-gray-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  {{ $t('profile.currency') }}
                </div>
              </label>
              <div class="relative">
                <select
                  id="currencySelect"
                  v-model="selectedCurrency"
                  @change="handleSettingsChange"
                  class="w-full px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white appearance-none cursor-pointer transition-colors"
                  :disabled="loading || settingsLoading"
                >
                  <option
                    v-for="currency in currencyOptions"
                    :key="currency.code"
                    :value="currency.code"
                  >
                    {{ currency.symbol }} {{ currency.code }} - {{ currency.name }}
                  </option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {{ $t('profile.currencyDescription') }}
              </p>
            </div>

            <!-- Save Settings Button -->
            <div class="border-t border-gray-200 dark:border-gray-600 pt-6">
              <div class="flex justify-end">
                <button
                  v-if="hasUnsavedSettings"
                  @click="saveSettings"
                  :disabled="loading || settingsLoading"
                  class="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {{ settingsLoading ? $t('profile.saving') : $t('profile.saveSettings') }}
                </button>
                <div v-else class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div class="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {{ $t('profile.settingsSaved') }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TODO: Connected Accounts - Hidden until OAuth is implemented
               Requirements:
               - Google: Google Cloud Console setup, OAuth 2.0 credentials, redirect URIs
               - Apple: Apple Developer Account ($99/year), Service ID, private key (.p8)
               - Backend: OAuth middleware configuration, callback endpoints, account linking logic
               - Frontend: OAuth libraries, redirect handling, connect/disconnect UI
          -->
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useTranslation } from '@/composables/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { useWebAuthn } from '@/composables/useWebAuthn';
import { useOAuth } from '@/composables/useOAuth';
import { authService } from '@/services/auth.service';
import { safeImageUrl } from '@/utils/urlSanitizer';
import { availableLocales, type LocaleCode } from '@/i18n';
import type { UpdateProfileRequest, ChangePasswordRequest, ConnectedAccount } from '@/types/auth';
import type { UserSettings, DisplaySettings } from '@/types/settings';
import { settingsService } from '@/services/settings.service';
import { languageSettingsService } from '@/services/languageSettings.service';
import { CURRENCY_OPTIONS } from '@/types/settings';

const router = useRouter();
const { t, locale: currentLocale, setLocale } = useTranslation();
const authStore = useAuthStore();
const webauthn = useWebAuthn();
const oauth = useOAuth();

const loading = ref(false);
const settingsLoading = ref(false);
const successMessage = ref('');
const error = ref('');


// User settings
const userSettings = ref<UserSettings | null>(null);
const originalSettings = ref<UserSettings | null>(null);

// Language preference - use reactive locale from useTranslation
const selectedLanguage = ref<LocaleCode>(currentLocale.value as LocaleCode);

// Keep selectedLanguage in sync with the global locale
watch(currentLocale, (newLocale) => {
  selectedLanguage.value = newLocale as LocaleCode;
});

// Currency preference
const selectedCurrency = ref<string>('USD');
const currencyOptions = CURRENCY_OPTIONS;

// Forms
const personalInfoForm = reactive<UpdateProfileRequest>({
  firstName: '',
  lastName: '',
  userName: '',
});

const passwordForm = reactive<ChangePasswordRequest>({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

// Computed properties
const displayName = computed(() => {
  const user = authStore.user;
  if (user?.firstName && user?.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user?.firstName) return user.firstName;
  if (user?.userName) return user.userName;
  return user?.email?.split('@')[0] || 'User';
});

const memberSince = computed(() => {
  if (authStore.user?.createdAt) {
    return new Date(authStore.user.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  }
  return '';
});

const isPasswordFormValid = computed(() => {
  const hasNewPassword = passwordForm.newPassword.length >= 8;
  const passwordsMatch = passwordForm.newPassword === passwordForm.confirmPassword;
  const hasCurrentPassword = authStore.hasPassword ? passwordForm.currentPassword.length > 0 : true;

  return hasNewPassword && passwordsMatch && hasCurrentPassword;
});

const hasUnsavedSettings = computed(() => {
  if (!originalSettings.value || !userSettings.value) return false;

  return (
    selectedLanguage.value !== originalSettings.value.display.language ||
    selectedCurrency.value !== originalSettings.value.display.currency
  );
});

// TODO: Add back when OAuth is implemented
// const googleAccount = computed(() => {
//   return authStore.connectedAccounts.find(account => account.provider === 'google');
// });
// const appleAccount = computed(() => {
//   return authStore.connectedAccounts.find(account => account.provider === 'apple');
// });

// Methods
function clearMessages() {
  successMessage.value = '';
  error.value = '';
}

function showSuccess(message: string) {
  clearMessages();
  successMessage.value = message;
  setTimeout(() => {
    successMessage.value = '';
  }, 5000);
}

function showError(message: string) {
  clearMessages();
  error.value = message;
}

async function updatePersonalInfo() {
  loading.value = true;
  clearMessages();

  try {
    const response = await authStore.updateProfile(personalInfoForm);
    if (response.success) {
      showSuccess('Personal information updated successfully');
    } else {
      showError(response.message || 'Failed to update personal information');
    }
  } catch (err: any) {
    showError(err.message || 'An error occurred while updating your information');
  } finally {
    loading.value = false;
  }
}

async function changePassword() {
  if (!isPasswordFormValid.value) return;

  loading.value = true;
  clearMessages();

  try {
    const response = await authStore.changePassword(passwordForm);
    if (response.success) {
      showSuccess(authStore.hasPassword ? 'Password changed successfully' : 'Password set successfully');
      // Reset form
      passwordForm.currentPassword = '';
      passwordForm.newPassword = '';
      passwordForm.confirmPassword = '';
    } else {
      showError(response.message || 'Failed to change password');
    }
  } catch (err: any) {
    showError(err.message || 'An error occurred while changing your password');
  } finally {
    loading.value = false;
  }
}

async function handleProfilePictureChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  loading.value = true;
  clearMessages();

  try {
    const response = await authStore.updateProfile({ profilePicture: file });
    if (response.success) {
      showSuccess('Profile picture updated successfully');
    } else {
      showError(response.message || 'Failed to update profile picture');
    }
  } catch (err: any) {
    showError(err.message || 'An error occurred while updating your profile picture');
  } finally {
    loading.value = false;
  }
}

function handleLanguageChange() {
  try {
    setLocale(selectedLanguage.value);
    // Don't show success message here - will be shown when settings are saved
  } catch (err: any) {
    showError('Failed to update language preference');
  }
}

function handleSettingsChange() {
  // This function is called when any setting changes
  // The computed property hasUnsavedSettings will trigger UI updates
}

async function loadUserSettings() {
  try {
    settingsLoading.value = true;
    const settings = await settingsService.getSettings();
    userSettings.value = settings;
    originalSettings.value = JSON.parse(JSON.stringify(settings)); // Deep clone

    // Update reactive values
    selectedLanguage.value = settings.display.language as LocaleCode || 'en';
    selectedCurrency.value = settings.display.currency || 'USD';
  } catch (err) {
    console.warn('Failed to load user settings, using defaults:', err);
    // Use defaults if settings don't exist yet
    selectedCurrency.value = 'USD';
    selectedLanguage.value = currentLocale.value as LocaleCode;
  } finally {
    settingsLoading.value = false;
  }
}

async function saveSettings() {
  if (!hasUnsavedSettings.value) return;

  settingsLoading.value = true;
  clearMessages();

  try {
    const settingsToUpdate: Partial<UserSettings> = {
      display: {
        ...userSettings.value?.display,
        language: selectedLanguage.value,
        currency: selectedCurrency.value
      } as DisplaySettings
    };

    // If only currency changed, use the individual update method that works
    const currencyChanged = selectedCurrency.value !== originalSettings.value.display.currency;
    const languageChanged = originalSettings.value && selectedLanguage.value !== originalSettings.value.display.language;

    let response;
    if (currencyChanged && !languageChanged) {
      // Only currency changed - use the working individual update method
      response = await settingsService.updateCurrency(selectedCurrency.value);
    } else {
      // Multiple settings or language changed - use full update
      response = await settingsService.updateSettings(settingsToUpdate);
    }

    if (response.success) {
      showSuccess('Settings saved successfully!');

      // Apply language change if needed (languageChanged already defined above)

      // Update original settings to reflect saved state
      if (originalSettings.value) {
        originalSettings.value.display.language = selectedLanguage.value;
        originalSettings.value.display.currency = selectedCurrency.value;
      }

      // Language change was already applied when user selected it from dropdown
      // No need to call handleLanguageChange() again here
    } else {
      showError(response.message || 'Failed to save settings');
    }
  } catch (err: any) {
    showError(err.message || 'An error occurred while saving settings');
  } finally {
    settingsLoading.value = false;
  }
}

async function setupPasskey() {
  clearMessages();
  
  const passkeyData = await webauthn.registerPasskey();
  if (!passkeyData) {
    showError(webauthn.error.value || 'Failed to set up passkey');
    return;
  }

  const response = await authStore.registerPasskey(passkeyData);
  if (response.success) {
    showSuccess('Passkey set up successfully! You can now use it to sign in.');
  } else {
    showError(response.message || 'Failed to register passkey');
  }
}

async function removePasskey() {
  if (!confirm(t('profile.passkeyRemoveConfirm'))) {
    return;
  }
  
  clearMessages();
  
  try {
    const response = await authStore.removePasskey();
    if (response.success) {
      showSuccess('Passkey removed successfully.');
      // Refresh user data to ensure UI updates immediately
      await authStore.initialize();
    } else {
      showError(response.message || 'Failed to remove passkey');
    }
  } catch (error) {
    showError('Failed to remove passkey');
  }
}

// TODO: Add back when OAuth is implemented
// async function connectGoogle() { ... }
// async function connectApple() { ... } 
// async function disconnectAccount(provider: string) { ... }

async function resendEmailConfirmation() {
  loading.value = true;
  clearMessages();

  try {
    const response = await authStore.resendEmailConfirmation();
    if (response.success) {
      showSuccess('Confirmation email sent! Please check your inbox.');
    } else {
      showError(response.message || 'Failed to send confirmation email');
    }
  } catch (err: any) {
    showError(err.message || 'An error occurred while sending confirmation email');
  } finally {
    loading.value = false;
  }
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}

// Initialize component
onMounted(async () => {
  if (authStore.user) {
    // Populate forms with current user data
    personalInfoForm.firstName = authStore.user.firstName || '';
    personalInfoForm.lastName = authStore.user.lastName || '';
    personalInfoForm.userName = authStore.user.userName || '';
    personalInfoForm.email = authStore.user.email || '';
  }

  // Load user settings
  await loadUserSettings();

  // Reset WebAuthn state to ensure clean initialization
  webauthn.resetState();
});
</script>

<style scoped>
/* Additional styles can be added here if needed */
</style>
