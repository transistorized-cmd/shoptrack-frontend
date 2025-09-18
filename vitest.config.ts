import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    css: true,
    testTimeout: 8000, // 8 seconds - reduced from default 5s to under 10s limit
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/main.ts",
        "*.config.ts",
        "**/*.d.ts",
        "**/__tests__/**",
        "**/tests/**",
        "**/coverage/**",
        "**/.{eslint,prettier}rc.{js,cjs,yml}",
      ],
    },
    include: [
      "src/**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}",
      "tests/**/*.{test,spec}.{js,ts,jsx,tsx}",
    ],
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
    setupFiles: ["./tests/setup.ts"],
    // Category-based test filtering
    testNamePattern: process.env.TEST_NAME_PATTERN,
    // Allow environment-based test configuration
    env: {
      TEST_CATEGORIES: process.env.TEST_CATEGORIES || '',
      EXCLUDE_CATEGORIES: process.env.EXCLUDE_CATEGORIES || '',
      TEST_SPEED_FILTER: process.env.TEST_SPEED_FILTER || '',
      TEST_TYPE_FILTER: process.env.TEST_TYPE_FILTER || '',
    },
    // Reporters for category tracking
    reporters: process.env.CI
      ? ['default', 'json']
      : ['default'],
    outputFile: {
      json: './test-results.json'
    },
    // Pool configuration for performance categories
    pool: process.env.TEST_POOL || 'threads',
    poolOptions: {
      threads: {
        singleThread: process.env.TEST_SINGLE_THREAD === 'true',
      },
    },
  },
});
