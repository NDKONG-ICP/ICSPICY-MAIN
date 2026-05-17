import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import environment from "vite-plugin-environment";

const ii_url =
  process.env.DFX_NETWORK === "local"
    ? `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943/`
    : `https://identity.ic0.app`;

process.env.II_URL = process.env.II_URL || ii_url;
export default defineConfig({
  logLevel: "error",
  build: {
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
  },
  css: {
    postcss: "./postcss.config.js",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
    environment(["II_URL"]),
    react(),
  ],
  resolve: {
    alias: [
      {
        find: "declarations",
        replacement: fileURLToPath(new URL("../declarations", import.meta.url)),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
      // signer-agent expects `compare` on `@dfinity/agent` (removed from public API).
      {
        find: "@dfinity/agent",
        replacement: fileURLToPath(
          new URL("./src/shims/dfinity-agent-with-compare.ts", import.meta.url),
        ),
      },
      // Deep import used by @slide-computer/signer-transport-stoic (IdentityKit) —
      // not exposed in @dfinity/identity "exports" (Vite/Rollup fails without this).
      {
        find: "@dfinity/identity/lib/cjs/identity/partial",
        replacement: fileURLToPath(
          new URL("./src/shims/dfinity-partial-id.ts", import.meta.url),
        ),
      },
    ],
    dedupe: ["@dfinity/agent", "@dfinity/identity"],
  },
});
