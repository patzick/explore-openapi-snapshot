import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/index.ts",
  format: "esm",
  platform: "node",
  target: "es2020",
  external: [],
  noExternal: ["@actions/core", "@actions/github"],
  clean: true,
  outDir: "dist",
});
