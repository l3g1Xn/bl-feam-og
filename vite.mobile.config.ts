import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

/**
 * Offline SPA build for Android APK / PWA.
 * No SSR, no nitro — pure static assets under dist-mobile/.
 */
export default defineConfig({
  root: path.resolve(__dirname, "mobile"),
  base: "./",
  publicDir: path.resolve(__dirname, "public"),
  plugins: [tailwindcss(), viteReact()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist-mobile"),
    emptyOutDir: true,
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: path.resolve(__dirname, "mobile/index.html"),
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
});
