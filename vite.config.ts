import * as path from 'node:path'
import { defineConfig } from 'vite'

const dev = process.env.VERCEL_CI || !process.argv[2]

export default defineConfig(
  dev
    ? {
        root: 'demo',
        resolve: {
          alias: {
            four: path.resolve(process.cwd(), 'src'),
          },
        },
        build: {
          minify: false,
          sourcemap: true,
          polyfillModulePreload: false,
        },
      }
    : {
        build: {
          minify: 'terser',
          sourcemap: true,
          target: 'esnext',
          lib: {
            formats: ['es', 'cjs'],
            entry: 'src/index.ts',
            fileName: (format) => (format === 'es' ? 'index.mjs' : 'index.js'),
          },
          rollupOptions: {
            output: {
              sourcemapExcludeSources: true,
            },
          },
          terserOptions: {
            safari10: false,
            compress: true,
            mangle: true,
          },
        },
        plugins: [
          {
            name: 'vite-tsc',
            generateBundle() {
              this.emitFile({ type: 'asset', fileName: 'index.d.ts', source: `export * from '../src'` })
            },
          },
        ],
      },
)
