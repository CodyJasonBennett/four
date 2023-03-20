import * as path from 'node:path'
import * as vite from 'vite'

export default vite.defineConfig({
  root: process.argv[2] ? undefined : 'examples',
  resolve: {
    alias: {
      four: path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: true,
    target: 'es2018',
    lib: {
      formats: ['es', 'cjs'],
      entry: 'src/index.ts',
      fileName: '[name]',
    },
    rollupOptions: {
      output: {
        sourcemapExcludeSources: true,
      },
    },
  },
  plugins: [
    {
      name: 'vite-tsc',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'index.d.ts', source: `export * from '../src'` })
      },
    },
    {
      name: 'vite-minify',
      transform(code, url) {
        if (!url.includes('node_modules')) {
          return vite.transformWithEsbuild(code, url, {
            mangleProps: /^_/,
            mangleQuoted: true,
          })
        }
      },
      renderChunk: {
        order: 'post',
        handler(code, { fileName }) {
          return vite.transformWithEsbuild(code, fileName, { minify: true })
        },
      },
    },
  ],
})
