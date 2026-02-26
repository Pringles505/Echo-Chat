import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
  ],
  resolve: {
    alias: {
      'aes-wasm': path.resolve(__dirname, './aes-wasm/pkg/aes_wasm.js'),
      'xeddsa-wasm': path.resolve(__dirname, './xeddsa-wasm/pkg/xeddsa_wasm.js'),
      'dh-wasm': path.resolve(__dirname, './dh-wasm/pkg/dh_wasm.js')
    }
  },
  optimizeDeps: {
  exclude: ['aes-wasm', 'xeddsa-wasm', 'dh-wasm']
},
  test: {
    // Keep unit/crypto tests under src; avoid accidentally running Playwright specs via Vitest.
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['e2e/**', '**/node_modules/**', '**/dist/**'],
  },
});
