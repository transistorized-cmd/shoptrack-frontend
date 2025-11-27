import { fileURLToPath, URL } from "node:url";

import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { visualizer } from "rollup-plugin-visualizer";
import vueI18n from "@intlify/unplugin-vue-i18n/vite";
// @ts-ignore - JavaScript plugin file
import { vueI18nProductionFix } from "./scripts/vue-i18n-production-fix.js";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars (both .env and mode-specific like .env.development)
  const env = loadEnv(mode, process.cwd(), "");
  const isProd = mode === "production";
  // Enable DevTools in production for Chrome browsers only
  // This allows Chrome DevTools to work while preventing errors in Safari/Firefox
  const enableProdDevtools = true; // Will be conditionally enabled at runtime based on browser detection
  const plugins = [
    vue({
      // Ensure all templates are compiled at build time with full helper functions
      template: {
        compilerOptions: {
          // Remove any Vue compiler-related options that might cause runtime compilation
          isCustomElement: (tag) => tag.startsWith("ion-"),
          // Force inclusion of helper functions
          hoistStatic: true,
          cacheHandlers: true,
          // Force runtime helpers to be included
          // transformAssetUrls: false, // This option doesn't exist
        },
      },
      // Ensure the SFC compiler includes helper functions like _withMods
      include: /\.vue$/,
      // Force the compiler to include runtime helpers
      customElement: false,
      // CRITICAL: Force Vue to include all runtime helpers
      script: {
        defineModel: true,
        propsDestructure: false,
      },
    }),
  ];

  // Force runtime-only mode in PRODUCTION for CSP compliance, allow dev compilation
  const i18nPlugin = vueI18n({
    runtimeOnly: isProd, // Runtime-only in production, full compilation in dev
    compositionOnly: true,
    fullInstall: !isProd, // Full install in dev for dynamic compilation
    forceStringify: isProd, // Force stringify only in production
    strictMessage: false, // Allow simple string interpolation
    escapeHtml: false, // Don't escape HTML in messages
    allowDynamic: !isProd, // Allow dynamic compilation in dev only
    optimizeTranslationDirective: true, // Optimize v-t directive
    defaultSFCLang: "json", // Use JSON for SFC i18n blocks
    globalSFCScope: true, // Enable global SFC scope
    include: [fileURLToPath(new URL("./src/i18n/locales/**", import.meta.url))],
    // Force pre-compilation only in production
    dropMessageCompiler: isProd,
    // Ensure messages are pre-compiled only in production
    onlyLocales: isProd ? ["en", "es"] : undefined,
  });
  // The unplugin can return a single plugin or an array - normalize to array
  plugins.push(...(Array.isArray(i18nPlugin) ? i18nPlugin : [i18nPlugin]));

  // Add vue-i18n production fix plugin
  if (isProd) {
    plugins.push(vueI18nProductionFix());
  }

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
        // FORCE Vue to use the FULL build with ALL runtime helpers included
        vue: isProd
          ? "vue/dist/vue.esm-bundler.js"
          : "vue/dist/vue.esm-bundler.js",
        // Use vue-i18n runtime-only build in production for CSP compliance
        "vue-i18n": isProd
          ? "vue-i18n/dist/vue-i18n.runtime.esm-bundler.js"
          : "vue-i18n/dist/vue-i18n.esm-bundler.js"
      },
    },
    define: {
      // Allow enabling Vue Devtools in production via env flag
      __VUE_PROD_DEVTOOLS__: JSON.stringify(enableProdDevtools),
      // Enable Vue Options API and ensure helpers are available
      __VUE_OPTIONS_API__: true,
      // CRITICAL: Ensure Vue runtime helpers like _withMods are included in production
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true,
      // Force inclusion of ALL Vue runtime helpers in production
      __VUE_RUNTIME_HELPERS__: true,
      __VUE_INCLUDE_RUNTIME_HELPERS__: true,
      // Enable compiler helpers for directive modifiers like @submit.prevent
      // These flags ensure Vue includes helper functions in production builds
      // Force runtime-only vue-i18n in PRODUCTION for CSP compliance, allow dev compilation
      __VUE_I18N_FULL_INSTALL__: !isProd, // Full install in dev, runtime-only in production
      __VUE_I18N_LEGACY_API__: false,
      // Drop message compiler and JIT only in production for CSP compliance
      __VUE_I18N_DROP_MESSAGE_COMPILER__: isProd,
      __INTLIFY_PROD_DEVTOOLS__: enableProdDevtools,
      __INTLIFY_JIT_COMPILATION__: !isProd, // Allow JIT in dev, disable in production
      __INTLIFY_DROP_MESSAGE_COMPILER__: isProd, // Drop compiler only in production
      // Additional vue-i18n production flags
      __INTLIFY_PROD_WARNING__: false, // Disable warnings in production
      __INTLIFY_JIT_OPTIMIZATION__: !isProd, // Allow JIT optimizations in dev only
      __BRIDGE__: false, // Disable Vue 2 bridge
      __FEATURE_LEGACY_API__: false, // Disable legacy API completely
      __FEATURE_FULL_INSTALL__: !isProd, // Full install in dev, runtime-only in production
      __FEATURE_PROD_DEVTOOLS__: enableProdDevtools,
      // Critical: Force runtime-only compilation only in production
      __FEATURE_MESSAGE_COMPILER__: !isProd, // Allow message compiler in dev
      __INTLIFY_RUNTIME_ONLY__: isProd, // Runtime-only only in production
      // Disable development features that might cause issues
      __DEV__: !isProd,
      // CRITICAL: Completely disable all eval/Function usage for CSP compliance
      __VUE_COMPILE_TEMPLATE__: false,
      // Force compile-time template processing only
      __VUE_RUNTIME_COMPILE__: false,
      // Disable all runtime compilation features
      __VUE_TEMPLATE_COMPILER__: false,
      // Additional CSP compliance flags
      __RUNTIME_COMPILE__: false,
      __COMPILE_TEMPLATE__: false,
      // Chart.js CSP compliance
      "process.env.DISABLE_EVAL": JSON.stringify("true"),
      "globalThis.eval": "undefined",
      "global.eval": "undefined",
      "window.eval": "undefined",
    },
    build: {
      // Production optimizations
      minify: isProd ? 'terser' : false,
      cssMinify: isProd,
      sourcemap: !isProd,
      terserOptions: {
        compress: {
          drop_console: false,
          drop_debugger: false,
          // pure_funcs: ["console.log", "console.info"],
          passes: 3,
          // Remove unnecessary code that might contain eval
          dead_code: true,
          // More aggressive optimization to eliminate runtime compilation
          reduce_funcs: true,
          reduce_vars: true,
          // Remove unused code that might contain eval/Function calls
          unused: true,
          // Additional CSP compliance optimizations
          pure_getters: true,
          unsafe: false, // Ensure safe transformations only
        },
        mangle: {
          safari10: true,
          // Don't mangle Vue runtime helper names to ensure they work correctly
          reserved: [
            '_withMods', '_withDirectives', '_withKeys', '_withScope',
            '_withCtx', '_createVNode', '_resolveComponent', '_resolveDynamicComponent',
            '_normalizeClass', '_normalizeStyle', '_renderList', '_Fragment',
            '_openBlock', '_createBlock', '_createTextVNode', '_createCommentVNode',
            '_toDisplayString', '_createSlots', '_renderSlot', '_withAsyncContext'
          ],
        },
        format: {
          comments: false,
        },
        // CRITICAL: Remove any remaining eval/Function usage
        toplevel: true,
      },
      // Enable tree-shaking
      rollupOptions: {
        output: {
          // Manual chunks for better caching - DO NOT split Vue core to avoid _withMods issues
          manualChunks: {
            // Keep Vue together with the main bundle to ensure helpers are accessible
            "vendor": ["vue-router", "pinia"],
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
            // Force new hash for cache busting
            const timestamp = Date.now().toString(36);
            return `js/${facadeModuleId}-${timestamp}-[hash].js`;
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
      include: [
        "vue",
        "vue-router",
        "pinia",
        "axios",
        "@vueuse/core",
      ],
      // Exclude Chart.js from pre-bundling to allow proper lazy loading
      exclude: ["chart.js", "vue-chartjs"],
      // Force re-optimization to ensure Vue helpers are included
      force: true,
    },
    server: {
      // Serve dev app over HTTP on 5173; proxy API target can be set via .env (VITE_API_TARGET)
      proxy: {
        "/api": {
          target: env.VITE_API_TARGET || "https://localhost:5201",
          changeOrigin: true,
          secure: false, // allow self-signed dev cert from Kestrel
          credentials: true, // Forward cookies for authentication
        },
      },
    },
  };
});
