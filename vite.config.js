import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
          // CRITICAL: Separate TensorFlow.js into its own chunk for lazy loading
          'vendor-tensorflow': ['@tensorflow/tfjs', '@tensorflow/tfjs-backend-wasm'],
          'vendor-pose-detection': ['@tensorflow-models/pose-detection']
        }
      }
    },
    chunkSizeWarningLimit: 600,
    // Copy WASM files to dist/wasm/ so they're bundled with the app
    assetsInlineLimit: 0, // Don't inline WASM files
  },
  // CRITICAL: Configure Vite to handle WASM files properly
  assetsInclude: ['**/*.wasm'],
  publicDir: 'public',
  // Resolve node_modules for WASM backend
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  // Optimize deps to pre-bundle TensorFlow properly
  optimizeDeps: {
    exclude: ['@tensorflow/tfjs-backend-wasm'],
    include: ['@tensorflow/tfjs', '@tensorflow-models/pose-detection']
  }
})
