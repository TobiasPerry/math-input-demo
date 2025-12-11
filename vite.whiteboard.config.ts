import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config specifically for building the whiteboard standalone
export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      input: './whiteboard.html',
    },
  },
})

