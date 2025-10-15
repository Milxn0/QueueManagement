import js from "@eslint/js";
import next from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "public/**/*.js",
      "public/**/*.min.js",
      "**/*.min.js",
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  next.configs["core-web-vitals"],

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {},
    rules: {},
  }
);
