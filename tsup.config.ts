import { defineConfig } from "tsup"
import { createRequire } from "node:module"

const pkg = createRequire(import.meta.url)("./package.json") as { version: string }

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
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  esbuildOptions(options) {
    options.legalComments = "none"
  },
})
