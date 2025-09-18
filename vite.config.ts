import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(() => {
  const plugins = [vue()];

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
      },
    },
    define: {
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    },
    build: {
      // Production optimizations
      minify: "terser",
      cssMinify: true,
      sourcemap: false,
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ["console.log", "console.info"],
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
      proxy: {
        "/api": {
          target: `https://localhost:${process.env.VITE_API_PORT || "5201"}`,
          changeOrigin: true,
          secure: false, // Allow self-signed certificates in development
        },
      },
    },
  };
});
