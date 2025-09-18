import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import * as parserVue from "vue-eslint-parser";
import tsEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import configPrettier from "@vue/eslint-config-prettier";

// Polyfill for Node.js versions that don't have structuredClone (< Node 17)
if (typeof globalThis.structuredClone === "undefined") {
  try {
    // eslint-disable-next-line no-undef
    const structuredClonePkg = require("structured-clone");
    globalThis.structuredClone =
      structuredClonePkg.structuredClone ||
      structuredClonePkg.default ||
      structuredClonePkg;
  } catch {
    // Fallback implementation using JSON.parse/stringify for simple cases
    globalThis.structuredClone = function (obj) {
      return JSON.parse(JSON.stringify(obj));
    };
  }
}

export default [
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,vue}"],
  },

  {
    name: "app/files-to-ignore",
    ignores: [
      "**/dist/**",
      "**/dist-ssr/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/.DS_Store",
      "**/Thumbs.db",
    ],
  },

  // Base ESLint recommended rules
  js.configs.recommended,

  // Vue.js rules
  ...pluginVue.configs["flat/recommended"],

  // TypeScript configuration - using direct plugin instead of config wrapper
  {
    name: "app/typescript-base",
    files: ["**/*.{ts,mts,tsx,vue}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsEslint,
    },
    rules: {
      ...tsEslint.configs.recommended.rules,
    },
  },

  // Prettier integration (must be last)
  configPrettier,

  // Custom rules and overrides
  {
    name: "app/vue-rules",
    files: ["**/*.vue"],
    languageOptions: {
      parser: parserVue,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".vue"],
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Vue specific rules
      "vue/multi-word-component-names": "warn", // Warn instead of error for flexibility
      "vue/no-unused-vars": "error",
      "vue/no-multiple-template-root": "off", // Vue 3 allows multiple roots
      "vue/html-self-closing": [
        "error",
        {
          html: {
            void: "always",
            normal: "always",
            component: "always",
          },
          svg: "always",
          math: "always",
        },
      ],
      "vue/max-attributes-per-line": [
        "error",
        {
          singleline: 3,
          multiline: 1,
        },
      ],
      "vue/component-definition-name-casing": ["error", "PascalCase"],
      "vue/component-name-in-template-casing": ["error", "PascalCase"],
      "vue/prop-name-casing": ["error", "camelCase"],
      "vue/attribute-hyphenation": ["error", "never"],
      "vue/v-on-event-hyphenation": ["error", "never"],
    },
  },

  {
    name: "app/typescript-rules",
    files: ["**/*.{ts,mts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "prefer-const": "error",
    },
  },

  {
    name: "app/javascript-rules",
    files: ["**/*.{js,mjs,jsx,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      // JavaScript specific rules
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
    },
  },

  // Global rules for all files
  {
    name: "app/global-rules",
    files: ["**/*.{js,mjs,jsx,cjs,ts,mts,tsx,vue}"],
    languageOptions: {
      globals: {
        process: "readonly",
      },
    },
    rules: {
      // Security rules
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",

      // Code quality rules
      "no-console": process.env.NODE_ENV === "production" ? "error" : "warn",
      "no-debugger": "error",
      "no-alert": "warn",
      "no-duplicate-imports": "error",
      "no-self-compare": "error",
      "no-template-curly-in-string": "error",
      "no-unreachable-loop": "error",
      "no-use-before-define": ["error", { functions: false, classes: true }],

      // Best practices
      "array-callback-return": "error",
      "consistent-return": "error",
      "default-case": "error",
      eqeqeq: ["error", "always"],
      "no-empty-function": "warn",
      "no-magic-numbers": [
        "warn",
        {
          ignore: [
            -1, 0, 1, 2, 5, 10, 30, 60, 100, 200, 255, 300, 500, 1000, 1024,
            5000, 10240, 60000,
          ],
          ignoreArrayIndexes: true,
          enforceConst: true,
          ignoreDefaultValues: true,
        },
      ],
      "no-useless-concat": "error",
      "prefer-arrow-callback": "error",
      yoda: "error",

      // Style rules (that don't conflict with Prettier)
      camelcase: ["error", { properties: "never" }],
      "new-cap": ["error", { newIsCap: true, capIsNew: false }],
      "no-nested-ternary": "warn",
      "spaced-comment": ["error", "always"],
    },
  },
];
