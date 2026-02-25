import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // Use project-managed public/manifest.json — do NOT auto-generate a new one
      manifest: false,
      injectManifest: {
        // CRITICAL: include .wasm so the WASM bundle is pre-cached at install time
        globPatterns: ['**/*.{js,css,html,svg,wasm}'],
      },
      // 'prompt' = new SW waits until all tabs close before activating (no skipWaiting)
      registerType: 'prompt',
      // Register the app-shell SW automatically in the app bundle
      injectRegister: 'auto',
      devOptions: {
        enabled: false,
      },
    }),
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
  server: {
    // Vite's default is 'localhost', which does not work with the WASM pkg.
    allowedHosts: ['localhost', '.ngrok-free.app'],
  },
})
