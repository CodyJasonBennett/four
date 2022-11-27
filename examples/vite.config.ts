import * as path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      four: path.resolve(__dirname, '../src'),
    },
  },
})
