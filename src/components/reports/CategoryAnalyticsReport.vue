<template>
  <div class="space-y-6">
    <!-- Summary Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-4 rounded-lg border">
        <p class="text-sm font-medium text-gray-500">Total Spending</p>
        <p class="text-2xl font-bold text-gray-900">
          ${{ data.totalSpending?.toFixed(2) || "0.00" }}
        </p>
      </div>
      <div class="bg-white p-4 rounded-lg border">
        <p class="text-sm font-medium text-gray-500">Transactions</p>
        <p class="text-2xl font-bold text-gray-900">
          {{ data.totalTransactions || 0 }}
        </p>
      </div>
      <div class="bg-white p-4 rounded-lg border">
        <p class="text-sm font-medium text-gray-500">Avg Transaction</p>
        <p class="text-2xl font-bold text-gray-900">
          ${{ data.averageTransaction?.toFixed(2) || "0.00" }}
        </p>
      </div>
      <div class="bg-white p-4 rounded-lg border">
        <p class="text-sm font-medium text-gray-500">Categories</p>
        <p class="text-2xl font-bold text-gray-900">
          {{ data.categories?.length || 0 }}
        </p>
      </div>
    </div>

    <!-- Categories Breakdown -->
    <div v-if="data.categories && data.categories.length > 0">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900">Categories Breakdown</h3>
        <RouterLink
          to="/analytics/categories"
          class="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
        >
          View detailed analytics →
        </RouterLink>
      </div>
      <div class="space-y-3">
        <div
          v-for="category in data.categories"
          :key="category.name"
          class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          @click="goToDetailedAnalytics"
        >
          <div class="flex-1">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-medium text-gray-900">
                {{ category.name }}
              </h4>
              <span class="text-sm text-gray-500"
                >{{ category.percentage }}%</span
              >
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-shoptrack-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${category.percentage}%` }"
              />
            </div>
            <div
              class="flex items-center justify-between mt-2 text-xs text-gray-500"
            >
              <span>{{ category.transactions }} transactions</span>
              <span>${{ category.amount?.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Monthly Trend -->
    <div v-if="data.monthlyTrend && data.monthlyTrend.length > 0">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Monthly Trend</h3>
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div
            v-for="month in data.monthlyTrend"
            :key="month.month"
            class="text-center p-3 bg-white rounded-lg"
          >
            <p class="text-sm font-medium text-gray-900">{{ month.month }}</p>
            <p class="text-lg font-bold text-shoptrack-600">
              ${{ month.amount?.toFixed(2) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- No Data State -->
    <div
      v-if="!data.categories || data.categories.length === 0"
      class="text-center py-8"
    >
      <p class="text-gray-500">
        No category data available for the selected period
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

defineProps<{
  data: any;
}>();

const router = useRouter();

function goToDetailedAnalytics() {
  router.push("/analytics/categories");
}
</script>
