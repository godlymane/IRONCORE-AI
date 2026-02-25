import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

/**
 * Vite plugin: copies TensorFlow.js WASM binaries from node_modules
 * into public/wasm/ so the AI engine works 100% offline.
 */
function copyTfjsWasm() {
  return {
    name: 'copy-tfjs-wasm',
    buildStart() {
      const wasmSrc = resolve('node_modules/@tensorflow/tfjs-backend-wasm/dist')
      const wasmDest = resolve('public/wasm')
      mkdirSync(wasmDest, { recursive: true })

      const wasmFiles = readdirSync(wasmSrc).filter(f => f.endsWith('.wasm'))
      for (const file of wasmFiles) {
        copyFileSync(join(wasmSrc, file), join(wasmDest, file))
      }
      console.log(`[tfjs-wasm] Copied ${wasmFiles.length} WASM binaries to public/wasm/`)
    }
  }
}

export default defineConfig({
  plugins: [react(), copyTfjsWasm()],
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
      '@': resolve(__dirname, './src'),
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
