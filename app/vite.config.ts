import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// The site is served by GitHub Pages from the repo root, so the build
// writes index.html and assets/ one level up, next to SPEC.md.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "..",
    emptyOutDir: false,
    assetsDir: "assets",
  },
})
