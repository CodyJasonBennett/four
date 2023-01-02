import * as dns from 'node:dns'
import * as path from 'node:path'
import { defineConfig } from 'vite'

// Serve on localhost for origin trial
dns.setDefaultResultOrder('verbatim')

export default defineConfig({
  server: { port: 80 },
  resolve: {
    alias: {
      four: path.resolve(__dirname, '../src'),
    },
  },
  plugins: [
    // Inserts a WebGPU origin trial token for local testing
    {
      name: 'vite-gpu',
      transformIndexHtml() {
        return [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'origin-trial',
              content:
                'ApB+TDs41dv4jFD67a312hCPRMkNgkhNEK6Or8SQWWNtTEqn1CbOk3tyvbbvtnNuaR2Wn4mTx8ivaDxpH+2WpAsAAABHeyJvcmlnaW4iOiJodHRwOi8vbG9jYWxob3N0OjgwIiwiZmVhdHVyZSI6IldlYkdQVSIsImV4cGlyeSI6MTY3NTIwOTU5OX0=',
            },
            injectTo: 'head',
          },
        ]
      },
    },
  ],
})
