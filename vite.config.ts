import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    tailwindcss(),
  ],
  worker: {
    // CRITICAL: WASM plugins MUST also be in worker.plugins.
    // Without this, wasm imports inside parser-worker.ts fail at Vite build time.
    // format: 'es' required — bundler-target WASM produces top-level await which
    // iife (the Vite default) does not support.
    format: 'es',
    plugins: () => [wasm()],
  },
  // Prevent Vite/esbuild from pre-bundling the WASM pkg — it cannot handle .wasm files.
  // If excluded, the .wasm file is served as a separate asset (correct behavior).
  optimizeDeps: {
    exclude: ['rsvp-parser'],
  },
})
