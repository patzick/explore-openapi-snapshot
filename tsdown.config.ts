import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  format: 'esm',
  platform: 'node',
  target: 'node24',
  external: [], // Bundle all dependencies
  clean: true,
  outDir: 'dist'
})
