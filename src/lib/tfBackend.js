/**
 * TensorFlow.js Backend Initializer
 * Tries WebGL first (GPU-accelerated), falls back to WASM, then CPU.
 * Keeps backend state so cleanup can properly dispose tensors.
 */

let backendReady = false;
let initPromise = null;

/**
 * Initialize the fastest available TF.js backend.
 * WebGL → WASM (with correct wasmPaths) → CPU
 * Uses promise lock to prevent concurrent initialization.
 */
export async function initializeTFBackend() {
  if (backendReady) return;
  if (initPromise) return initPromise;

  initPromise = _doInit();
  return initPromise;
}

async function _doInit() {

  const tf = await import('@tensorflow/tfjs');

  // Try WebGL first (fastest on most devices)
  try {
    await tf.setBackend('webgl');
    await tf.ready();
    backendReady = true;
    console.debug('[tfBackend] Using WebGL');
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
    console.debug('[tfBackend] Using WASM');
    return;
  } catch (_) {
    console.warn('[tfBackend] WASM failed, falling back to CPU...');
  }

  // CPU fallback (slowest but always works)
  await tf.setBackend('cpu');
  await tf.ready();
  backendReady = true;
  console.debug('[tfBackend] Using CPU (slowest)');
}

/**
 * Dispose all TF tensors and reset backend state.
 * Called on component unmount to prevent memory leaks.
 */
export async function resetBackend() {
  try {
    const tf = await import('@tensorflow/tfjs');
    // Only dispose variables/tensors — NEVER dispose the shared backend itself,
    // as other components may still be using it.
    tf.disposeVariables();
  } catch (_) {
    // Silently ignore — component may already be torn down
  }
  // Don't reset backendReady — the backend is still initialized and usable.
  // Only set false if we actually need to re-initialize (e.g., backend error).
}

export function isTfInitialized() {
  return backendReady;
}
