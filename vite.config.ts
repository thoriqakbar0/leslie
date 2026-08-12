import { defineConfig, lazyPlugins } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "#dev-agentation": fileURLToPath(
        new URL(
          process.env.NODE_ENV === "production"
            ? "./src/dev-agentation-disabled.tsx"
            : "./src/dev-agentation.tsx",
          import.meta.url,
        ),
      ),
    },
  },
  fmt: {
    ignorePatterns: ["prototype/**"],
  },
  lint: {
    ignorePatterns: ["prototype/**"],
    plugins: ["react", "typescript", "oxc"],
    rules: {
      "react/rules-of-hooks": "error",
      "react/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
        },
      ],
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
  },
  test: {
    include: ["src/**/*.test.ts", "electron/**/*.test.mjs"],
  },
  plugins: lazyPlugins(() => [react(), tailwindcss()]),
});
