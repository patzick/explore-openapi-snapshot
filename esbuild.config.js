import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  outfile: "dist/index.js",
  external: [],
  minify: false,
  sourcemap: false,
  treeShaking: true,
  logLevel: "info",
});
