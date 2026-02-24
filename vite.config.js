import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
          'vendor-tensorflow': [
            '@tensorflow/tfjs',
            '@tensorflow/tfjs-backend-wasm',
            '@tensorflow/tfjs-backend-webgl'
          ],
          'vendor-pose-detection': ['@tensorflow-models/pose-detection']
        }
      }
    },
    chunkSizeWarningLimit: 600,
    assetsInlineLimit: 0,
  },
  assetsInclude: ['**/*.wasm'],
  publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  optimizeDeps: {
    exclude: ['@tensorflow/tfjs-backend-wasm'],
    include: [
      '@tensorflow/tfjs',
      '@tensorflow/tfjs-backend-webgl',
      '@tensorflow-models/pose-detection'
    ]
  }
})
