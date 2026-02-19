import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    drop: ['console', 'debugger'],
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-motion': ['framer-motion'],
          'vendor-charts': ['recharts'],
          // TensorFlow removed from manualChunks — it's dynamically imported in FormCoach
          // so Vite will auto-split it into a lazy chunk that only loads when FormCoach mounts
        }
      }
    },
    chunkSizeWarningLimit: 600,
  },
})
