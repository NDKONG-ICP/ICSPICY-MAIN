import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2020",
    sourcemap: false,
    minify: "esbuild",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "dfinity-agent": [
            "@dfinity/agent",
            "@dfinity/candid",
            "@dfinity/principal",
            "@dfinity/auth-client",
            "@dfinity/identity",
          ],
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "motion-vendor": ["motion"],
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    port: 5180,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
    dedupe: ["@dfinity/agent"],
  },
  define: {
    "process.env.DFX_NETWORK": JSON.stringify(
      process.env.DFX_NETWORK ?? "local",
    ),
    "process.env.CANISTER_ID_DOCS_BACKEND": JSON.stringify(
      process.env.CANISTER_ID_DOCS_BACKEND ?? "",
    ),
    "process.env.CANISTER_ID_INTERNET_IDENTITY": JSON.stringify(
      process.env.CANISTER_ID_INTERNET_IDENTITY ?? "",
    ),
  },
});
