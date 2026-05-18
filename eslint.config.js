// Flat ESLint config (ESLint v9+). Mirrors the TS rules used in wmstudio + mcp-director's ruff config in spirit.
import js from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**", "eslint.config.js"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Match wmstudio house style
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
      "no-console": "off", // CLI legitimately uses console
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
    },
  },
  {
    files: ["test/**/*.ts", "*.config.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  }
)
