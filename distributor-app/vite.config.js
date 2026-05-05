import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    nodePolyfills()
  ],
  define: {
    global: 'window',
  },
  server: {
    port: 5174,
    strictPort: true,
  },
  css: {
    postcss: {}
  }
})


