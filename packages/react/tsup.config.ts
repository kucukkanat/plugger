import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["react", "react-dom", "@plugger/core", "@plugger/vanilla"],
  target: "es2021",
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
