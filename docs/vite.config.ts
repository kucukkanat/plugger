import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the docs from /plugger/ when deployed under the repo path.
// Override with DOCS_BASE for other hosts.
const base = process.env.DOCS_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 4000,
  },
  worker: {
    format: "es",
  },
});
