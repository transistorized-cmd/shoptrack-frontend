<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

const props = defineProps<{
  threshold?: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "swipe-left"): void;
  (e: "swipe-right"): void;
}>();

const THRESHOLD = props.threshold ?? 80;
const SNAP_THRESHOLD = 40;

const container = ref<HTMLElement | null>(null);
const startX = ref(0);
const currentX = ref(0);
const isSwiping = ref(false);
const isOpen = ref<"left" | "right" | null>(null);

const translateX = computed(() => {
  if (isOpen.value === "left") return -THRESHOLD;
  if (isOpen.value === "right") return THRESHOLD;
  return currentX.value;
});

const leftActionsVisible = computed(() => translateX.value < -SNAP_THRESHOLD);
const rightActionsVisible = computed(() => translateX.value > SNAP_THRESHOLD);

const handleTouchStart = (e: TouchEvent) => {
  if (props.disabled) return;

  startX.value = e.touches[0].clientX;
  isSwiping.value = true;
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isSwiping.value || props.disabled) return;

  const diff = e.touches[0].clientX - startX.value;

  // If already open, adjust calculation
  if (isOpen.value === "left") {
    currentX.value = Math.max(-THRESHOLD, Math.min(0, diff - THRESHOLD));
  } else if (isOpen.value === "right") {
    currentX.value = Math.min(THRESHOLD, Math.max(0, diff + THRESHOLD));
  } else {
    // Limit swipe distance
    currentX.value = Math.max(-THRESHOLD, Math.min(THRESHOLD, diff));
  }
};

const handleTouchEnd = () => {
  if (!isSwiping.value || props.disabled) return;

  isSwiping.value = false;

  // Determine final state
  if (currentX.value < -SNAP_THRESHOLD) {
    // Swiped left
    if (Math.abs(currentX.value) >= THRESHOLD - 10) {
      // Trigger action
      emit("swipe-left");
      resetPosition();
    } else {
      isOpen.value = "left";
    }
  } else if (currentX.value > SNAP_THRESHOLD) {
    // Swiped right
    if (currentX.value >= THRESHOLD - 10) {
      // Trigger action
      emit("swipe-right");
      resetPosition();
    } else {
      isOpen.value = "right";
    }
  } else {
    // Reset
    resetPosition();
  }

  currentX.value = 0;
};

const resetPosition = () => {
  isOpen.value = null;
  currentX.value = 0;
};

// Click outside to close
const handleClickOutside = (e: MouseEvent) => {
  if (isOpen.value && container.value && !container.value.contains(e.target as Node)) {
    resetPosition();
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div
    ref="container"
    class="relative overflow-hidden touch-pan-y"
  >
    <!-- Left actions (revealed on swipe left) -->
    <div
      class="absolute inset-y-0 right-0 flex items-stretch"
      :style="{ width: `${THRESHOLD}px` }"
    >
      <slot name="left-actions">
        <button
          class="flex-1 flex items-center justify-center bg-red-500 text-white"
          @click="$emit('swipe-left')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </slot>
    </div>

    <!-- Right actions (revealed on swipe right) -->
    <div
      class="absolute inset-y-0 left-0 flex items-stretch"
      :style="{ width: `${THRESHOLD}px` }"
    >
      <slot name="right-actions">
        <button
          class="flex-1 flex items-center justify-center bg-green-500 text-white"
          @click="$emit('swipe-right')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </button>
      </slot>
    </div>

    <!-- Main content -->
    <div
      class="relative bg-white dark:bg-gray-800 transition-transform"
      :class="{ 'duration-200': !isSwiping }"
      :style="{ transform: `translateX(${translateX}px)` }"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <slot />
    </div>
  </div>
</template>
