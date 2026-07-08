import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Shared timestamp for __BUILD_DATE__ define and public/version.json
const buildDate = new Date().toISOString()

export default defineConfig({
  plugins: [
    // Write version.json to public/ so the running app can fetch it for fast update detection
    {
      name: 'generate-version-json',
      configResolved(config) {
        writeFileSync(join(config.root, 'public', 'version.json'), JSON.stringify({ buildDate }))
      },
    },
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',       // 自動更新しない、アプリ側で制御する
      injectRegister: 'auto',
      manifest: false,              // public/manifest.webmanifest をそのまま使う
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
        // Netlify Functions への fetch はキャッシュしない
        navigateFallbackDenylist: [/^\/.netlify/],
        runtimeCaching: [
          {
            urlPattern: /^\/.netlify\//,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  define: {
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
