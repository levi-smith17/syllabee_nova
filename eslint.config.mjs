import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import js from "@eslint/js";

const eslintConfig = defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  globalIgnores([
    "**/dist/**",
    "**/build/**",
    "**/.turbo/**",
    "**/node_modules/**",
    "infrastructure/**",
    "scripts/**",
    "**/src/_legacy/**",
  ]),
]);

export default eslintConfig;
