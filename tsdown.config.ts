import process from 'node:process'

import { defineConfig } from 'tsdown'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
  entry: 'src/index.ts',
  format: ['cjs', 'esm'],
  target: 'node20',
  clean: true,
  dts: true,
  sourcemap: isDev,
})
