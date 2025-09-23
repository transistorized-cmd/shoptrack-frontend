import { fileURLToPath, URL } from "node:url";

import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { visualizer } from "rollup-plugin-visualizer";
import vueI18n from "@intlify/unplugin-vue-i18n/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars (both .env and mode-specific like .env.development)
  const env = loadEnv(mode, process.cwd(), "");
  const isProd = mode === 'production';
  // Enable DevTools in production for Chrome browsers only
  // This allows Chrome DevTools to work while preventing errors in Safari/Firefox
  const enableProdDevtools = true; // Will be conditionally enabled at runtime based on browser detection
  const plugins = [
    vue({
      // Ensure all templates are compiled at build time
      template: {
        compilerOptions: {
          // Remove any Vue compiler-related options that might cause runtime compilation
          isCustomElement: (tag) => tag.startsWith('ion-'),
        },
      },
    }),
  ];

  // Add i18n plugin for both dev and prod to avoid runtime issues
  const i18nPlugin = vueI18n({
    runtimeOnly: isProd, // Only use runtime-only in production
    compositionOnly: true,
    fullInstall: false, // Don't install all features in runtime-only mode
    forceStringify: isProd, // Force stringify in production to precompile messages
    strictMessage: false, // Allow simple string interpolation
    escapeHtml: false, // Don't escape HTML in messages
    allowDynamic: !isProd, // CRITICAL: Only allow dynamic compilation in dev
    optimizeTranslationDirective: true, // Optimize v-t directive
    defaultSFCLang: 'json', // Use JSON for SFC i18n blocks
    globalSFCScope: true, // Enable global SFC scope
    include: [
      fileURLToPath(new URL('./src/i18n/locales/**', import.meta.url)),
    ],
    // Force pre-compilation of all message resources
    dropMessageCompiler: isProd,
    // Additional production safety: ensure messages are pre-compiled
    onlyLocales: isProd ? ['en', 'es'] : undefined,
    // Completely disable JIT compilation in production
    // jitCompilation: !isProd, // This option doesn't exist
    // Ensure no eval() usage in production
    // allowHtml: false, // Invalid option
    // escapeParameterHtml: true, // Invalid option
  });
  // The unplugin can return a single plugin or an array - normalize to array
  plugins.push(...(Array.isArray(i18nPlugin) ? i18nPlugin : [i18nPlugin]));

  // Bundle analyzer plugin - only enable when ANALYZE=true
  if (process.env.ANALYZE) {
    plugins.push(
      visualizer({
        filename: "dist/stats.html",
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: "treemap", // or 'sunburst', 'network'
      }),
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        // Force Vue to use runtime-only build to avoid CSP issues
        "vue": "vue/dist/vue.runtime.esm-bundler.js",
        // Use vue-i18n runtime-only build only in production to satisfy CSP.
        // In development, keep the default build to avoid composer errors.
        "vue-i18n": isProd
          ? "vue-i18n/dist/vue-i18n.runtime.esm-bundler.js"
          : "vue-i18n/dist/vue-i18n.esm-bundler.js",
        // Only alias vue-i18n itself for runtime-only in production
        // Let bundler handle other dependencies naturally
      },
    },
    define: {
      // Allow enabling Vue Devtools in production via env flag
      __VUE_PROD_DEVTOOLS__: JSON.stringify(enableProdDevtools),
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
      // Disable Vue runtime compiler to enforce SFC pre-compilation
      __VUE_OPTIONS_API__: true,
      // Ensure vue-i18n installs global features (needed for globalInjection and $t)
      __VUE_I18N_FULL_INSTALL__: !isProd, // Only full install in development
      __VUE_I18N_LEGACY_API__: false,
      // Drop message compiler and JIT only in production (CSP-safe). Keep in dev to avoid composer errors.
      __VUE_I18N_DROP_MESSAGE_COMPILER__: isProd,
      __INTLIFY_PROD_DEVTOOLS__: enableProdDevtools,
      __INTLIFY_JIT_COMPILATION__: !isProd, // Only allow JIT in development
      __INTLIFY_DROP_MESSAGE_COMPILER__: isProd, // Additional flag to drop compiler
      // Additional vue-i18n production flags
      __INTLIFY_PROD_WARNING__: false, // Disable warnings in production
      __INTLIFY_JIT_OPTIMIZATION__: !isProd, // Disable JIT optimizations in production
      __BRIDGE__: false, // Disable Vue 2 bridge
      __FEATURE_LEGACY_API__: false, // Disable legacy API completely
      __FEATURE_FULL_INSTALL__: !isProd, // Feature flag for full install
      __FEATURE_PROD_DEVTOOLS__: enableProdDevtools,
      // Critical: Force runtime-only compilation
      __FEATURE_MESSAGE_COMPILER__: false, // Completely disable message compiler
      __INTLIFY_RUNTIME_ONLY__: isProd, // Force runtime-only in production
      // Disable development features that might cause issues
      __DEV__: !isProd,
    },
    build: {
      // Production optimizations - temporarily disable minification for debugging
      minify: false,
      cssMinify: true,
      sourcemap: true,
      terserOptions: {
        compress: {
          drop_console: false,
          drop_debugger: false,
          // pure_funcs: ["console.log", "console.info"],
          passes: 2,
        },
        mangle: {
          safari10: true,
        },
        format: {
          comments: false,
        },
      },
      // Enable tree-shaking
      rollupOptions: {
        output: {
          // Manual chunks for better caching
          manualChunks: {
            // Vue core
            "vue-vendor": ["vue", "vue-router", "pinia"],
            // Chart.js will be lazy-loaded, so removed from manual chunks
            // This allows proper code splitting
            // Utilities
            utils: ["axios", "@vueuse/core"],
          },
          // Optimize chunk file names
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId
                  .split("/")
                  .pop()
                  ?.replace(".vue", "") || "chunk"
              : "chunk";
            return `js/${facadeModuleId}-[hash].js`;
          },
          entryFileNames: "js/[name]-[hash].js",
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith(".css")) {
              return "css/[name]-[hash].css";
            }
            return "assets/[name]-[hash][extname]";
          },
        },
      },
      // Optimize dependencies
      commonjsOptions: {
        include: [/node_modules/],
      },
      // Set chunk size warning limit
      chunkSizeWarningLimit: 1000,
      // Report compressed size
      reportCompressedSize: true,
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ["vue", "vue-router", "pinia", "axios", "@vueuse/core"],
      // Exclude Chart.js from pre-bundling to allow proper lazy loading
      exclude: ["chart.js", "vue-chartjs"],
    },
    server: {
      // Serve dev app over HTTP on 5173; proxy API target can be set via .env (VITE_API_TARGET)
      proxy: {
        "/api": {
          target: env.VITE_API_TARGET || "https://localhost:5201",
          changeOrigin: true,
          secure: false, // allow self-signed dev cert from Kestrel
        },
      },
    },
  };
});
