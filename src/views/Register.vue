<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 py-6 px-4 sm:py-12 sm:px-6 lg:px-8 transition-colors duration-300">
    <!-- Theme Toggle -->
    <div class="absolute top-4 right-4 z-10">
      <ThemeToggle simple />
    </div>

    <div class="max-w-4xl w-full space-y-6 sm:space-y-8">
      <!-- Header -->
      <div>
        <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-shoptrack-100 dark:bg-shoptrack-800">
          <svg class="h-6 w-6 text-shoptrack-600 dark:text-shoptrack-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {{ t('auth.createYourAccount') }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
          {{ t('common.or') }}
          <router-link to="/login" class="font-medium text-shoptrack-600 hover:text-shoptrack-500 dark:text-shoptrack-400 dark:hover:text-shoptrack-300">
            {{ t('auth.signInToExistingAccount') }}
          </router-link>
        </p>
      </div>

      <!-- Step Indicator -->
      <div v-if="!registrationSuccess" class="flex items-center justify-center space-x-4">
        <div class="flex items-center">
          <div
            :class="[
              'w-10 h-10 rounded-full flex items-center justify-center font-semibold',
              currentStep >= 1 ? 'bg-shoptrack-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            ]"
          >
            1
          </div>
          <span class="ml-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('registration.selectPlan') }}</span>
        </div>

        <svg class="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>

        <div class="flex items-center">
          <div
            :class="[
              'w-10 h-10 rounded-full flex items-center justify-center font-semibold',
              currentStep >= 2 ? 'bg-shoptrack-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            ]"
          >
            2
          </div>
          <span class="ml-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('registration.yourInfo') }}</span>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
              {{ t('auth.registrationError') }}
            </h3>
            <div class="mt-2 text-sm text-red-700 dark:text-red-300">
              <ul v-if="authStore.error?.details" class="list-disc list-inside space-y-1">
                <li v-for="(messages, field) in authStore.error.details" :key="field">
                  <span class="capitalize">{{ field }}</span>: {{ messages.join(', ') }}
                </li>
              </ul>
              <p v-else>{{ error }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Success Message -->
      <div v-if="registrationSuccess" class="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400 dark:text-green-300" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800 dark:text-green-200">
              {{ t('auth.accountCreatedSuccessfully') }}
            </h3>
            <div class="mt-2 text-sm text-green-700 dark:text-green-300">
              <p>{{ successMessage }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 1: Plan Selection -->
      <div v-if="!registrationSuccess && currentStep === 1" class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
        <div>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {{ t('registration.chooseYourPlan') }}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('registration.planDescription') }}
          </p>
        </div>

        <!-- Period Switcher -->
        <div v-if="availablePeriodOptions.length > 0" class="mb-6">
          <PeriodSwitcher
            :available-periods="availablePeriodOptions"
            :selected-period="selectedPeriod"
            @period-selected="handlePeriodSelected"
          />
        </div>

        <!-- Plan Selector -->
        <PlanSelector
          :selected-plan-id="selectedPlan?.id"
          :selected-currency="selectedCurrency"
          :selected-period="selectedPeriod"
          @plan-selected="handlePlanSelected"
          @plans-loaded="handlePlansLoaded"
        />

        <!-- Currency Picker -->
        <div v-if="selectedPlan && selectedPlan.pricing && selectedPlan.pricing.length > 0">
          <CurrencyPicker
            :pricing="selectedPlan.pricing"
            :is-free="selectedPlan.isFree"
            v-model="selectedCurrency"
            @currency-selected="handleCurrencySelected"
          />
        </div>

        <!-- Next Button -->
        <div class="flex justify-end pt-4">
          <button
            @click="goToNextStep"
            :disabled="!isStep1Complete"
            class="px-6 py-3 bg-shoptrack-600 hover:bg-shoptrack-700 dark:bg-shoptrack-700 dark:hover:bg-shoptrack-800 text-white font-medium rounded-lg focus:ring-2 focus:ring-shoptrack-500 focus:ring-offset-2 dark:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {{ t('common.next') }}
            <svg class="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Step 2: Personal Information and OAuth -->
      <div v-if="!registrationSuccess && currentStep === 2" class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
        <!-- Selected Plan Summary -->
        <div v-if="selectedPlan" class="bg-shoptrack-50 dark:bg-shoptrack-900/20 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-semibold text-gray-900 dark:text-white">{{ selectedPlan.name }}</h4>
              <p v-if="selectedPlan.isFree" class="text-sm text-green-600 dark:text-green-400">{{ t('registration.free') }}</p>
              <p v-else-if="selectedPlan.allowTrial" class="text-sm text-amber-600 dark:text-amber-400">
                {{ selectedPlan.trialDays }} {{ t('registration.dayFreeTrial') }}
              </p>
            </div>
            <button
              @click="goToPreviousStep"
              class="text-sm text-shoptrack-600 dark:text-shoptrack-400 hover:text-shoptrack-700 dark:hover:text-shoptrack-300"
            >
              {{ t('registration.changePlan') }}
            </button>
          </div>
        </div>

        <!-- OAuth Registration Options -->
        <div class="space-y-4">
          <div class="text-center text-sm text-gray-600 dark:text-gray-300">
            {{ t('auth.quickSignUpWith') }}
          </div>

          <div class="grid grid-cols-2 gap-3">
            <!-- Google OAuth -->
            <button
              type="button"
              class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              :disabled="Boolean(loading || oauth.loading)"
              @click="handleGoogleRegister"
            >
              <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>

            <!-- Apple OAuth -->
            <button
              type="button"
              class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              :disabled="Boolean(loading || oauth.loading)"
              @click="handleAppleRegister"
            >
              <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Apple
            </button>
          </div>

          <!-- Divider -->
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">{{ t('auth.orRegisterWithEmail') }}</span>
            </div>
          </div>
        </div>

        <!-- Registration Form -->
        <form class="space-y-6" @submit.prevent="handleRegister">
          <div class="space-y-4">
          <!-- Name Fields -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="first-name" class="sr-only">{{ t('auth.firstName') }}</label>
              <input
                id="first-name"
                v-model="form.firstName"
                name="first-name"
                type="text"
                autocomplete="given-name"
                class="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-shoptrack-500 focus:border-shoptrack-500 dark:focus:ring-shoptrack-400 dark:focus:border-shoptrack-400 focus:z-10 sm:text-sm transition-colors"
                :placeholder="t('auth.firstName')"
                :disabled="loading"
              />
            </div>
            <div>
              <label for="last-name" class="sr-only">{{ t('auth.lastName') }}</label>
              <input
                id="last-name"
                v-model="form.lastName"
                name="last-name"
                type="text"
                autocomplete="family-name"
                class="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-shoptrack-500 focus:border-shoptrack-500 dark:focus:ring-shoptrack-400 dark:focus:border-shoptrack-400 focus:z-10 sm:text-sm transition-colors"
                :placeholder="t('auth.lastName')"
                :disabled="loading"
              />
            </div>
          </div>

          <!-- Email -->
          <div>
            <label for="email-address" class="sr-only">{{ t('auth.email') }}</label>
            <input
              id="email-address"
              v-model="form.email"
              name="email"
              type="email"
              autocomplete="username"
              required
              class="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-shoptrack-500 focus:border-shoptrack-500 dark:focus:ring-shoptrack-400 dark:focus:border-shoptrack-400 focus:z-10 sm:text-sm transition-colors"
              :class="{
                'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500': emailError
              }"
              :placeholder="t('auth.email')"
              :disabled="loading"
            />
            <p v-if="emailError" class="mt-1 text-sm text-red-600">{{ emailError }}</p>
          </div>

          <!-- Password -->
          <div class="relative">
            <label for="password" class="sr-only">{{ t('auth.password') }}</label>
            <input
              id="password"
              v-model="form.password"
              name="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              required
              class="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-shoptrack-500 focus:border-shoptrack-500 dark:focus:ring-shoptrack-400 dark:focus:border-shoptrack-400 focus:z-10 sm:text-sm transition-colors"
              :class="{
                'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500': passwordError
              }"
              :placeholder="t('auth.password')"
              :disabled="loading"
              @input="validatePassword"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center"
              @click="showPassword = !showPassword"
            >
              <svg
                v-if="showPassword"
                class="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M9.878 9.878l4.242 4.242M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg
                v-else
                class="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>

          <!-- Password Strength Indicator -->
          <div v-if="form.password" class="space-y-2">
            <div class="flex items-center space-x-2">
              <div class="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  class="h-2 rounded-full transition-all duration-300"
                  :class="passwordStrengthClass"
                  :style="{ width: passwordStrengthPercentage + '%' }"
                ></div>
              </div>
              <span class="text-xs text-gray-600">{{ passwordStrengthText }}</span>
            </div>
            <ul class="text-xs text-gray-600 space-y-1">
              <li :class="{ 'text-green-600': hasMinLength }">
                ✓ At least 8 characters
              </li>
              <li :class="{ 'text-green-600': hasUppercase }">
                ✓ Contains uppercase letter
              </li>
              <li :class="{ 'text-green-600': hasLowercase }">
                ✓ Contains lowercase letter  
              </li>
              <li :class="{ 'text-green-600': hasNumber }">
                ✓ Contains number
              </li>
              <li :class="{ 'text-green-600': hasSpecialChar }">
                ✓ Contains special character
              </li>
            </ul>
          </div>

          <!-- Confirm Password -->
          <div class="relative">
            <label for="confirm-password" class="sr-only">Confirm Password</label>
            <input
              id="confirm-password"
              v-model="form.confirmPassword"
              name="confirm-password"
              :type="showConfirmPassword ? 'text' : 'password'"
              autocomplete="new-password"
              required
              class="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-shoptrack-500 focus:border-shoptrack-500 dark:focus:ring-shoptrack-400 dark:focus:border-shoptrack-400 focus:z-10 sm:text-sm transition-colors"
              :class="{
                'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500': confirmPasswordError,
                'border-green-300 dark:border-green-600 focus:ring-green-500 focus:border-green-500': form.confirmPassword && !confirmPasswordError
              }"
              :placeholder="t('auth.confirmPassword')"
              :disabled="loading"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <svg
                v-if="showConfirmPassword"
                class="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M9.878 9.878l4.242 4.242M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg
                v-else
                class="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <p v-if="confirmPasswordError" class="mt-1 text-sm text-red-600">{{ confirmPasswordError }}</p>
          </div>
        </div>

          <!-- Terms and Conditions -->
          <div class="flex items-start">
            <div class="flex items-center h-5">
              <input
                id="accept-terms"
                v-model="form.acceptTerms"
                name="accept-terms"
                type="checkbox"
                required
                class="focus:ring-shoptrack-500 h-4 w-4 text-shoptrack-600 border-gray-300 rounded"
                :disabled="loading"
              />
            </div>
            <div class="ml-3 text-sm">
              <label for="accept-terms" class="text-gray-600 dark:text-gray-300">
                {{ t('auth.iAgreeToThe') }}
                <a href="/terms" target="_blank" rel="noopener noreferrer" class="text-shoptrack-600 dark:text-shoptrack-400 hover:text-shoptrack-500 dark:hover:text-shoptrack-300 transition-colors">{{ t('auth.termsOfService') }}</a>
                {{ t('auth.and') }}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" class="text-shoptrack-600 dark:text-shoptrack-400 hover:text-shoptrack-500 dark:hover:text-shoptrack-300 transition-colors">{{ t('auth.privacyPolicy') }}</a>
              </label>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="flex space-x-3">
            <button
              type="button"
              @click="goToPreviousStep"
              class="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-shoptrack-500 transition-colors"
            >
              {{ t('common.back') }}
            </button>

            <button
              type="submit"
              class="group relative flex-1 flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-shoptrack-600 hover:bg-shoptrack-700 dark:bg-shoptrack-700 dark:hover:bg-shoptrack-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-shoptrack-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              :disabled="loading || !isFormValid"
            >
              <span v-if="loading" class="flex items-center">
                <svg
                  class="animate-spin h-5 w-5 mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ t('auth.creatingAccount') }}
              </span>
              <span v-else class="flex items-center">
                <svg
                  class="h-5 w-5 mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
                {{ t('auth.createAccount') }}
              </span>
            </button>
          </div>
        </form>
      </div>

      <!-- Action Buttons for Success State -->
      <div v-if="registrationSuccess" class="space-y-4">
        <button
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          @click="router.push('/login')"
        >
          {{ t('auth.continueToSignInButton') }}
        </button>
        <button
          v-if="needsEmailConfirmation"
          class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          :disabled="loading"
          @click="resendConfirmation"
        >
          {{ loading ? t('auth.sending') : t('auth.resendConfirmationEmail') }}
        </button>
      </div>

      <!-- Security Notice -->
      <div class="mt-4 text-center text-xs text-gray-500">
        <p>{{ t('auth.securityNoticeRegistration') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTranslation } from '@/composables/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { useOAuth } from '@/composables/useOAuth';
import ThemeToggle from '@/components/ThemeToggle.vue';
import PlanSelector from '@/components/registration/PlanSelector.vue';
import CurrencyPicker from '@/components/registration/CurrencyPicker.vue';
import PeriodSwitcher from '@/components/registration/PeriodSwitcher.vue';
import type { PeriodOption } from '@/components/registration/PeriodSwitcher.vue';
import { getBrowserPreferences } from '@/utils/browserDetection';
import { getAvailablePeriods, calculateSavings } from '@/types/subscription';
import type { RegisterRequest } from '@/types/auth';
import type { PublicPlan, PlanPricing } from '@/types/subscription';

const router = useRouter();
const { t } = useTranslation();
const authStore = useAuthStore();
const oauth = useOAuth();

const showPassword = ref(false);
const showConfirmPassword = ref(false);
const loading = ref(false);
const registrationSuccess = ref(false);
const successMessage = ref('');
const needsEmailConfirmation = ref(false);

// Step tracking
const currentStep = ref(1);

// Plan, currency, and period state
const selectedPlan = ref<PublicPlan | null>(null);
const selectedCurrency = ref<string>('USD');
const selectedPeriod = ref<'Monthly' | 'Yearly' | 'Quarterly' | 'Biannual'>('Monthly');
const allPlans = ref<PublicPlan[]>([]);

const form = reactive<RegisterRequest>({
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  subscriptionPlanId: 0,
  currency: 'USD',
  languageCode: 'en',
  timezone: 'UTC',
  acceptTerms: false,
});

// Validation computed properties
const emailError = computed(() => {
  if (!form.email) return '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(form.email) ? '' : 'Please enter a valid email address';
});

const hasMinLength = computed(() => form.password.length >= 8);
const hasUppercase = computed(() => /[A-Z]/.test(form.password));
const hasLowercase = computed(() => /[a-z]/.test(form.password));
const hasNumber = computed(() => /\d/.test(form.password));
const hasSpecialChar = computed(() => /[!@#$%^&*(),.?":{}|<>]/.test(form.password));

const passwordStrength = computed(() => {
  const checks = [
    hasMinLength.value,
    hasUppercase.value,
    hasLowercase.value,
    hasNumber.value,
    hasSpecialChar.value,
  ];
  return checks.filter(Boolean).length;
});

const passwordStrengthPercentage = computed(() => (passwordStrength.value / 5) * 100);

const passwordStrengthText = computed(() => {
  const strength = passwordStrength.value;
  if (strength === 0) return 'Very Weak';
  if (strength === 1) return 'Weak';
  if (strength === 2) return 'Fair';
  if (strength === 3) return 'Good';
  if (strength === 4) return 'Strong';
  return 'Very Strong';
});

const passwordStrengthClass = computed(() => {
  const strength = passwordStrength.value;
  if (strength <= 1) return 'bg-red-500';
  if (strength === 2) return 'bg-yellow-500';
  if (strength === 3) return 'bg-blue-500';
  if (strength >= 4) return 'bg-green-500';
  return 'bg-gray-300';
});

const passwordError = computed(() => {
  if (!form.password) return '';
  return passwordStrength.value >= 3 ? '' : 'Password must meet minimum requirements';
});

const confirmPasswordError = computed(() => {
  if (!form.confirmPassword) return '';
  return form.password === form.confirmPassword ? '' : 'Passwords do not match';
});

const isFormValid = computed(() => {
  return (
    form.email &&
    !emailError.value &&
    form.password &&
    !passwordError.value &&
    form.confirmPassword &&
    !confirmPasswordError.value &&
    form.acceptTerms
  );
});

// Local error state to control when errors should be displayed
const hasAttemptedRegistration = ref(false);

const error = computed(() => {
  // Don't show errors if registration was successful
  if (registrationSuccess.value) return null;
  // Only show errors after a registration attempt has been made
  if (!hasAttemptedRegistration.value) return null;
  return authStore.error?.message || oauth.error || null;
});

// Clear errors when component mounts to prevent showing stale errors
onMounted(() => {
  authStore.clearError();
  hasAttemptedRegistration.value = false;

  // Detect browser preferences
  const browserPrefs = getBrowserPreferences();
  form.languageCode = browserPrefs.languageCode;
  form.timezone = browserPrefs.timezone;
  form.currency = browserPrefs.currency;
  selectedCurrency.value = browserPrefs.currency;
});

// Compute available period options from all plans
const availablePeriodOptions = computed((): PeriodOption[] => {
  if (allPlans.value.length === 0) return [];

  // Collect all pricing from all plans
  const allPricing: PlanPricing[] = allPlans.value.flatMap(plan => plan.pricing || []);

  // Get unique periods
  const periods = getAvailablePeriods(allPricing);

  // Map to PeriodOption format with labels and savings
  return periods.map(period => {
    const savings = period !== 'Monthly'
      ? calculateSavings(allPricing, selectedCurrency.value, period as 'Yearly' | 'Quarterly' | 'Biannual')
      : 0;

    const labels: Record<string, string> = {
      Monthly: t('subscriptions.monthly'),
      Quarterly: t('subscriptions.quarterly'),
      Biannual: t('subscriptions.biannual'),
      Yearly: t('subscriptions.yearly')
    };

    return {
      value: period,
      label: labels[period] || period,
      savings: savings > 0 ? savings : undefined
    };
  });
});

// Handle plans loaded event
function handlePlansLoaded(plans: PublicPlan[]) {
  allPlans.value = plans;
}

// Handle plan selection
function handlePlanSelected(plan: PublicPlan) {
  selectedPlan.value = plan;
  form.subscriptionPlanId = plan.id;

  // If plan has pricing, ensure selected currency is available
  if (plan.pricing && plan.pricing.length > 0) {
    const availableCurrencies = plan.pricing.map(p => p.currency);
    if (!availableCurrencies.includes(selectedCurrency.value)) {
      // Auto-select first available currency
      selectedCurrency.value = availableCurrencies[0];
      form.currency = availableCurrencies[0];
    }

    // Ensure selected period is available for this plan
    const availablePeriods = getAvailablePeriods(plan.pricing);
    if (!availablePeriods.includes(selectedPeriod.value)) {
      // Auto-select first available period
      selectedPeriod.value = availablePeriods[0] || 'Monthly';
    }
  }
}

// Handle currency selection
function handleCurrencySelected(currency: string) {
  selectedCurrency.value = currency;
  form.currency = currency;
}

// Handle period selection
function handlePeriodSelected(period: 'Monthly' | 'Yearly' | 'Quarterly' | 'Biannual') {
  selectedPeriod.value = period;
}

// Step navigation
function goToNextStep() {
  if (currentStep.value === 1 && selectedPlan.value) {
    currentStep.value = 2;
  }
}

function goToPreviousStep() {
  if (currentStep.value === 2) {
    currentStep.value = 1;
  }
}

// Check if step 1 is complete
const isStep1Complete = computed(() => {
  return selectedPlan.value !== null && selectedCurrency.value !== '';
});

// Clear errors when form inputs change
watch(() => form.email, () => {
  if (hasAttemptedRegistration.value) {
    authStore.clearError();
  }
});

watch(() => form.password, () => {
  if (hasAttemptedRegistration.value) {
    authStore.clearError();
  }
});

function validatePassword() {
  // This function is called on input to trigger reactivity
}

// Handle standard registration
async function handleRegister() {
  if (!isFormValid.value) return;

  loading.value = true;
  // Clear any previous errors before attempting registration
  authStore.clearError();

  const response = await authStore.register(form);

  if (response.success) {
    // Reset registration attempt flag on success
    hasAttemptedRegistration.value = false;

    registrationSuccess.value = true;
    needsEmailConfirmation.value = response.requiresEmailConfirmation || false;

    if (needsEmailConfirmation.value) {
      successMessage.value = 'Please check your email and click the confirmation link to activate your account.';
    } else {
      successMessage.value = 'Your account has been created successfully! You can now sign in.';
    }
  } else {
    // Only set hasAttemptedRegistration on failure to show errors
    hasAttemptedRegistration.value = true;
  }

  loading.value = false;
}

// Handle OAuth registration (same as login for OAuth)
async function handleGoogleRegister() {
  hasAttemptedRegistration.value = true;
  const response = await oauth.loginWithGoogle();
  
  if (response.success) {
    await router.push('/');
  }
}

async function handleAppleRegister() {
  hasAttemptedRegistration.value = true;
  const response = await oauth.loginWithApple();
  
  if (response.success) {
    await router.push('/');
  }
}

// Resend email confirmation
async function resendConfirmation() {
  loading.value = true;
  
  const response = await authStore.resendEmailConfirmation();
  
  if (response.success) {
    successMessage.value = 'Confirmation email sent! Please check your inbox.';
  }
  
  loading.value = false;
}

// Clear errors when form changes
watch([() => form.email, () => form.password, () => form.confirmPassword], () => {
  authStore.clearError();
  oauth.clearError();
});
</script>

<style scoped>
/* Additional styles can be added here if needed */
</style>
