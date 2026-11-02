import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Stamped into the bundle so you can tell which build a browser is running:
  // read `document.documentElement.dataset.build` in the console.
  define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')) },
  // Three pages: the website at /, the app at /app/, the privacy policy at /privacy/.
  build: {
    rollupOptions: {
      input: {
        site: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app/index.html'),
        privacy: resolve(__dirname, 'privacy/index.html'),
      },
    },
  },
  plugins: [
    react(),
    /*
     * Installed to a home screen, Nook has to open with no network — the boards
     * are already on the device, so a blank screen would be a lie. The service
     * worker precaches the app shell and updates itself in the background.
     *
     * The manifest is hand-written in public/ and linked from index.html, so the
     * plugin only does the caching.
     */
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      injectRegister: 'auto',
      workbox: {
        // Latin only: the other scripts are fetched on demand if a note needs them.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}', '**/bricolage-grotesque-latin-*.woff2', '**/dm-sans-latin-*.woff2'],
        // Only the app is a single page; the website and policy are real pages.
        navigateFallback: '/app/index.html',
        navigateFallbackAllowlist: [/^\/app/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Product icons: keep whatever has been fetched, fall back to the
            // drawn artwork when a new one cannot be reached.
            urlPattern: /^https:\/\/api\.iconify\.design\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'product-icons',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
