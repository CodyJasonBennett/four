import * as path from 'node:path'
import * as vite from 'vite'

const mangleMap: Record<string, string> = {
  _compiled: '_c',
  _programs: '_p',
  _geometry: '_g',
  _buffers: '_b',
  _textures: '_t',
  _samplers: '_s',
  _FBOs: '_f',
  _UBOs: '_u',
  _pipelines: '_p',
}

export default vite.defineConfig({
  root: process.argv[2] ? undefined : 'examples',
  resolve: {
    alias: {
      four: path.resolve(__dirname, 'src'),
    },
  },
  build: {
    sourcemap: true,
    target: 'esnext',
    lib: {
      formats: ['es'],
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
          for (const key in mangleMap) code = code.replaceAll(key, mangleMap[key])
          return vite.transformWithEsbuild(code, url, {
            mangleProps: /^_\w{2,}/,
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
