import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("three") || id.includes("@react-three")) return "three-vendor";
          if (id.includes("leaflet")) return "leaflet-vendor";
          if (id.includes("recharts")) return "recharts-vendor";
          if (id.includes("qrcode")) return "qrcode-vendor";
          if (id.includes("@dfinity") || id.includes("@icp-sdk")) return "icp-vendor";
          if (id.includes("@ic-pay")) return "icpay-vendor";
          if (id.includes("motion")) return "motion-vendor";
        },
      },
    },
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
    process.env.ANALYZE === "1" &&
      visualizer({
        open: false,
        gzipSize: true,
        filename: "dist/stats.html",
      }),
  ].filter(Boolean),
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
      // @nfid/identitykit imports @dfinity/identity subpaths not in the exports
      // map. Alias them explicitly so Vite/rollup can resolve them.
      {
        find: /^@dfinity\/identity\/lib\/cjs\/identity\/partial$/,
        replacement: fileURLToPath(
          new URL(
            "./node_modules/@dfinity/identity/lib/cjs/identity/partial.js",
            import.meta.url,
          ),
        ),
      },
    ],
    dedupe: ["@dfinity/agent", "@dfinity/identity"],
  },
});
