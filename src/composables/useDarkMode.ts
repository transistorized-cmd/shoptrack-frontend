import { ref, computed, watch, onMounted } from "vue";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "shoptrack-theme";

// Global reactive state
const theme = ref<Theme>("system");
const systemDarkMode = ref(false);

// Initialize system dark mode detection
const mediaQuery =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

if (mediaQuery) {
  systemDarkMode.value = mediaQuery.matches;
  mediaQuery.addEventListener("change", (e) => {
    systemDarkMode.value = e.matches;
  });
}

// Computed property for actual dark mode state
const isDarkMode = computed(() => {
  switch (theme.value) {
    case "dark":
      return true;
    case "light":
      return false;
    case "system":
    default:
      return systemDarkMode.value;
  }
});

// Apply theme to document
function applyTheme(isDark: boolean) {
  if (typeof document === "undefined") return;

  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

// Watch for theme changes and apply them
watch(
  isDarkMode,
  (isDark) => {
    applyTheme(isDark);
  },
  { immediate: true },
);

export function useDarkMode() {
  // Initialize theme from localStorage
  onMounted(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ["light", "dark", "system"].includes(stored)) {
        theme.value = stored as Theme;
      }
    } catch (error) {
      // Silently handle localStorage errors
      console.warn('Failed to read theme from localStorage:', error);
    }
    // Apply initial theme
    applyTheme(isDarkMode.value);
  });

  // Save theme to localStorage when it changes
  watch(theme, (newTheme) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (error) {
      // Silently handle localStorage errors
      console.warn('Failed to save theme to localStorage:', error);
    }
  });

  // Theme setters
  const setLightMode = () => {
    theme.value = "light";
  };

  const setDarkMode = () => {
    theme.value = "dark";
  };

  const setSystemMode = () => {
    theme.value = "system";
  };

  const toggleMode = () => {
    if (theme.value === "system") {
      theme.value = isDarkMode.value ? "light" : "dark";
    } else {
      theme.value = isDarkMode.value ? "light" : "dark";
    }
  };

  return {
    theme: computed(() => theme.value),
    isDarkMode,
    systemDarkMode: computed(() => systemDarkMode.value),
    setLightMode,
    setDarkMode,
    setSystemMode,
    toggleMode,
  };
}
