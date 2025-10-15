import js from "@eslint/js";
import tseslint from "typescript-eslint";
import next from "eslint-config-next";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  next,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: { attributes: false, arguments: false },
          checksConditionals: true,
        },
      ],
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
    },
  },

  {
    files: [
      "next.config.*",
      "postcss.config.*",
      "tailwind.config.*",
      "*.cjs",
      "*.cts",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
