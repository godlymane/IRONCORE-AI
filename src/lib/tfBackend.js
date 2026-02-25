/**
 * TensorFlow.js Backend Initializer
 * Tries WebGL first (GPU-accelerated), falls back to WASM, then CPU.
 * Keeps backend state so cleanup can properly dispose tensors.
 */

let backendReady = false;

/**
 * Initialize the fastest available TF.js backend.
 * WebGL → WASM (with correct wasmPaths) → CPU
 */
export async function initializeTFBackend() {
  if (backendReady) return;

  const tf = await import('@tensorflow/tfjs');

  // Try WebGL first (fastest on most devices)
  try {
    await tf.setBackend('webgl');
    await tf.ready();
    backendReady = true;
    console.log('[tfBackend] Using WebGL');
    return;
  } catch (_) {
    console.warn('[tfBackend] WebGL failed, trying WASM...');
  }

  // Try WASM (good fallback, uses public/wasm/ binaries)
  try {
    const wasmBackend = await import('@tensorflow/tfjs-backend-wasm');
    wasmBackend.setWasmPaths('/wasm/');
    await tf.setBackend('wasm');
    await tf.ready();
    backendReady = true;
    console.log('[tfBackend] Using WASM');
    return;
  } catch (_) {
    console.warn('[tfBackend] WASM failed, falling back to CPU...');
  }

  // CPU fallback (slowest but always works)
  await tf.setBackend('cpu');
  await tf.ready();
  backendReady = true;
  console.log('[tfBackend] Using CPU (slowest)');
}

/**
 * Dispose all TF tensors and reset backend state.
 * Called on component unmount to prevent memory leaks.
 */
export function resetBackend() {
  try {
    import('@tensorflow/tfjs').then(tf => {
      tf.disposeVariables();
      if (tf.engine()?.registeredVariables) {
        // Clear any lingering tensors
        const backend = tf.engine().backend;
        if (backend?.dispose) backend.dispose();
      }
    });
  } catch (_) {
    // Silently ignore — component may already be torn down
  }
  backendReady = false;
}

export function isTfInitialized() {
  return backendReady;
}
