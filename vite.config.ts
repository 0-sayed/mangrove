import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@app": fileURLToPath(new URL("./src/app", import.meta.url)),
      "@content": fileURLToPath(new URL("./src/content", import.meta.url)),
      "@game": fileURLToPath(new URL("./src/game", import.meta.url)),
      "@sim": fileURLToPath(new URL("./src/sim", import.meta.url)),
      "@tests": fileURLToPath(new URL("./src/tests", import.meta.url))
    }
  },
  server: {
    host: "127.0.0.1",
    port: Number(process.env["MANGROVE_DEV_PORT"] ?? 5177),
    strictPort: true
  },
  preview: {
    host: "127.0.0.1",
    port: Number(process.env["MANGROVE_PREVIEW_PORT"] ?? 4177),
    strictPort: true
  },
  build: {
    chunkSizeWarningLimit: 1800
  }
});
