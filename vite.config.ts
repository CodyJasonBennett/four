import { defineConfig, transformWithEsbuild } from 'vite'

const MANGLE_MAP: Record<string, string> = {
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

const MANGLE_INCLUDE_REGEX = /^_\w{2,}/

const PURE_COMMENT_REGEX = /\/\*\s*[#@]__PURE__\s*\*\//g

export default defineConfig((env) => ({
  root: env.command === 'serve' ? 'examples' : undefined,
  resolve: {
    alias: {
      four: new URL('./src', import.meta.url).href,
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
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/')

          if (normalizedId.endsWith('/src/WebGPURenderer.ts')) {
            return 'WebGPURenderer'
          }

          if (normalizedId.endsWith('/src/index.ts')) {
            return 'index'
          }

          return 'core'
        },
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
          for (const key in MANGLE_MAP) code = code.replaceAll(key, MANGLE_MAP[key])
          return transformWithEsbuild(code, url, {
            mangleProps: MANGLE_INCLUDE_REGEX,
            mangleQuoted: true,
          })
        }
      },
      renderChunk: {
        order: 'post',
        async handler(code, { fileName }) {
          // Preserve pure annotations, but remove all other comments and whitespace
          code = code.replaceAll(PURE_COMMENT_REGEX, '__PURE__ || ')
          const result = await transformWithEsbuild(code, fileName, { minify: true, target: 'esnext' })
          result.code = result.code.replaceAll('__PURE__||', '/*@__PURE__*/')
          return result
        },
      },
    },
  ],
}))
