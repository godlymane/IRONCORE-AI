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

      let wasmFiles = []
      try {
        wasmFiles = readdirSync(wasmSrc).filter(f => f.endsWith('.wasm'))
      } catch (err) {
        console.error(`[tfjs-wasm] ERROR: WASM source directory not found at ${wasmSrc}. Run "npm install" to fix.`)
        throw new Error(`TensorFlow.js WASM binaries missing — AI Lab will not work offline. Source: ${wasmSrc}`)
      }
      if (wasmFiles.length === 0) {
        throw new Error('[tfjs-wasm] No .wasm files found in ' + wasmSrc + ' — AI Lab will be broken offline.')
      }
      for (const file of wasmFiles) {
        copyFileSync(join(wasmSrc, file), join(wasmDest, file))
      }
      console.log(`[tfjs-wasm] Copied ${wasmFiles.length} WASM binaries to public/wasm/`)
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    copyTfjsWasm(),
  ],
  esbuild: {
    drop: ['debugger'],
    // Strip every console method in production builds. Call-sites that genuinely
    // need to log should guard with `if (import.meta.env.DEV)`.
    pure: ['console.log', 'console.debug', 'console.info', 'console.warn', 'console.error', 'console.trace'],
  },
  build: {
    target: 'es2020',
    sourcemap: false,
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
    chunkSizeWarningLimit: 400,
    assetsInlineLimit: 4096,
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
