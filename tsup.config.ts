import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  dts: false,
  shims: false,
  banner: { js: "#!/usr/bin/env node" },
  esbuildOptions(options) {
    options.legalComments = "none"
  },
})
