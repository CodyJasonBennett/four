import * as fs from 'node:fs'
import * as path from 'node:path'
import * as zlib from 'node:zlib'
import * as vite from 'vite'

const mangleMap: Record<string, string> = {
  _compiled: '_c',
  _programs: '_p',
  _VAOs: '_v',
  _buffers: '_b',
  _textures: '_t',
  _samplers: '_s',
  _FBOs: '_f',
  _pipelines: '_p',
}

export default vite.defineConfig({
  root: process.argv[2] ? undefined : 'examples',
  logLevel: process.argv[2] ? 'warn' : undefined,
  resolve: {
    alias: {
      four: path.resolve(__dirname, 'src'),
    },
  },
  build: {
    reportCompressedSize: false,
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
          return vite.transformWithEsbuild(code, fileName, { minify: true, target: 'es2018' })
        },
      },
      closeBundle() {
        const dist = path.resolve(__dirname, 'dist')
        const bundles: Record<string, number> = {}

        for (const file of fs.readdirSync(dist)) {
          if (file.endsWith('js')) {
            const code = fs.readFileSync(path.resolve(dist, file))
            const ext = path.extname(file)
            const size = zlib.brotliCompressSync(code).length

            bundles[ext] ??= 0
            bundles[ext] += size
          }
        }

        const blue = (text: string) => `\x1b[34m${text}\x1b[39m`
        const green = (text: string) => `\x1b[32m${text}\x1b[39m`
        const measure = (bytes: number) => `${bytes} B`

        for (const ext in bundles) {
          const size = bundles[ext]
          console.info(`Created bundle ${blue(`dist/index${ext}`)}: ${green(measure(size))}`)
        }
      },
    },
  ],
})
