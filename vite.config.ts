import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    tailwindcss(),
  ],
  worker: {
    // CRITICAL: WASM plugins MUST also be in worker.plugins.
    // Without this, wasm imports inside parser-worker.ts fail at Vite build time.
    plugins: () => [wasm(), topLevelAwait()],
  },
  // Prevent Vite/esbuild from pre-bundling the WASM pkg — it cannot handle .wasm files.
  // If excluded, the .wasm file is served as a separate asset (correct behavior).
  optimizeDeps: {
    exclude: ['rsvp-parser'],
  },
})
