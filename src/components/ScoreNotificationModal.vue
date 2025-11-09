<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click="handleDismiss"
      >
        <Transition
          enter-active-class="transition-all duration-500 ease-out"
          enter-from-class="opacity-0 scale-90 translate-y-8"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-300 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-90 translate-y-8"
        >
          <div
            v-if="show"
            class="relative max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
            @click.stop
          >
            <!-- Animated Background Gradient -->
            <div
              class="absolute inset-0 opacity-10"
              :style="{
                background: `linear-gradient(135deg, ${themeConfig.gradient[0]}, ${themeConfig.gradient[1]})`
              }"
            />

            <!-- Particles Container -->
            <div class="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                v-for="particle in particles"
                :key="particle.id"
                class="absolute"
                :style="{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  fontSize: `${particle.size}px`,
                  opacity: particle.opacity,
                  transform: `translate(-50%, -50%) rotate(${particle.rotation}deg)`,
                  animation: `float-${particle.animation} ${particle.duration}s ease-in-out infinite ${particle.delay}s`
                }"
              >
                {{ particle.emoji }}
              </div>
            </div>

            <!-- Content -->
            <div class="relative p-8 text-center">
              <!-- Theme Emoji -->
              <div class="text-6xl mb-4 animate-bounce-slow">
                {{ themeConfig.emoji }}
              </div>

              <!-- Title -->
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {{ $t(themeConfig.title) }}
              </h2>

              <!-- Score Display -->
              <div class="flex items-center justify-center space-x-4 mb-6">
                <!-- Previous Score -->
                <div class="flex flex-col items-center">
                  <span class="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {{ $t('score.notification.previous') }}
                  </span>
                  <div
                    class="text-3xl font-bold px-4 py-2 rounded-lg"
                    :style="{
                      background: `linear-gradient(135deg, ${themeConfig.gradient[0]}20, ${themeConfig.gradient[1]}20)`
                    }"
                  >
                    {{ notification.previousScore }}
                  </div>
                </div>

                <!-- Arrow -->
                <div class="text-2xl text-gray-400 dark:text-gray-500">
                  →
                </div>

                <!-- New Score -->
                <div class="flex flex-col items-center">
                  <span class="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {{ $t('score.notification.new') }}
                  </span>
                  <div
                    class="text-3xl font-bold px-4 py-2 rounded-lg animate-pulse-slow"
                    :style="{
                      background: `linear-gradient(135deg, ${themeConfig.gradient[0]}, ${themeConfig.gradient[1]})`,
                      color: 'white'
                    }"
                  >
                    {{ notification.newScore }}
                  </div>
                </div>
              </div>

              <!-- Change Badge -->
              <div
                v-if="scoreChange !== 0"
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold mb-4"
                :class="scoreChange > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'"
              >
                {{ scoreChange > 0 ? '+' : '' }}{{ scoreChange }}
              </div>

              <!-- Message -->
              <p class="text-gray-600 dark:text-gray-300 mb-6 text-sm px-4">
                {{ notification.message }}
              </p>

              <!-- Dismiss Button -->
              <button
                @click="handleDismiss"
                class="w-full px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95"
                :style="{
                  background: `linear-gradient(135deg, ${themeConfig.gradient[0]}, ${themeConfig.gradient[1]})`
                }"
              >
                {{ $t('score.notification.awesome') }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { ScoreNotification } from '@/types/scoreNotification'
import { getThemeConfig } from '@/types/scoreNotification'

interface Props {
  notification: ScoreNotification
  show?: boolean
}

interface Emits {
  (e: 'dismiss'): void
}

const props = withDefaults(defineProps<Props>(), {
  show: true
})

const emit = defineEmits<Emits>()

// Theme configuration
const themeConfig = computed(() => getThemeConfig(props.notification.theme))

// Score change
const scoreChange = computed(() => props.notification.newScore - props.notification.previousScore)

// Particle system
interface Particle {
  id: number
  emoji: string
  x: number
  y: number
  size: number
  opacity: number
  rotation: number
  duration: number
  delay: number
  animation: 'up' | 'down' | 'left' | 'right' | 'diagonal'
}

const particles = ref<Particle[]>([])

// Generate particles based on theme
const generateParticles = () => {
  const particleCount = 50
  const animationType = themeConfig.value.animationType

  const emojiMap = {
    confetti: ['🎊', '🎉', '✨', '⭐', '🌟'],
    sparkles: ['✨', '⭐', '💫', '🌟', '💥'],
    checkmark: ['✅', '✓', '👍', '💚'],
    tumbleweed: ['🌵', '🏜️', '💨', '🌬️'],
    raindrops: ['💧', '💦', '☔', '🌧️']
  }

  const emojis = emojiMap[animationType] || emojiMap.confetti

  particles.value = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 20 + 10,
    opacity: Math.random() * 0.6 + 0.3,
    rotation: Math.random() * 360,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 2,
    animation: ['up', 'down', 'left', 'right', 'diagonal'][Math.floor(Math.random() * 5)] as Particle['animation']
  }))
}

// Handle dismiss
const handleDismiss = () => {
  emit('dismiss')
}

// Generate particles on mount
onMounted(() => {
  generateParticles()
})

// Cleanup on unmount
onUnmounted(() => {
  particles.value = []
})
</script>

<style scoped>
@keyframes float-up {
  0%, 100% { transform: translate(-50%, -50%) translateY(0) rotate(0deg); }
  50% { transform: translate(-50%, -50%) translateY(-20px) rotate(180deg); }
}

@keyframes float-down {
  0%, 100% { transform: translate(-50%, -50%) translateY(0) rotate(0deg); }
  50% { transform: translate(-50%, -50%) translateY(20px) rotate(-180deg); }
}

@keyframes float-left {
  0%, 100% { transform: translate(-50%, -50%) translateX(0) rotate(0deg); }
  50% { transform: translate(-50%, -50%) translateX(-20px) rotate(90deg); }
}

@keyframes float-right {
  0%, 100% { transform: translate(-50%, -50%) translateX(0) rotate(0deg); }
  50% { transform: translate(-50%, -50%) translateX(20px) rotate(-90deg); }
}

@keyframes float-diagonal {
  0%, 100% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); }
  50% { transform: translate(-50%, -50%) translate(-15px, -15px) rotate(360deg); }
}

@keyframes bounce-slow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes pulse-slow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

.animate-bounce-slow {
  animation: bounce-slow 2s ease-in-out infinite;
}

.animate-pulse-slow {
  animation: pulse-slow 2s ease-in-out infinite;
}
</style>
