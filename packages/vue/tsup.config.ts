import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["vue", "@plugger/core", "@plugger/vanilla"],
  target: "es2021",
});
