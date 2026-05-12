import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/.git/**",
      "**/.pnpm-store/**",
      "**/.turbo/**",
      "**/backups/**",
      "**/build/**",
      "**/coverage/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/out/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/.next/**",
      "**/.test-dist/**"
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module"
    }
  }
);
