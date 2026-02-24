let tfInitialized = false;
let tfInitPromise = null;

export async function initTfBackend() {
  if (tfInitialized) return;
  if (tfInitPromise) return tfInitPromise;

  tfInitPromise = (async () => {
    try {
      const [tfModule, wasmModule, webglModule] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow/tfjs-backend-wasm'),
        import('@tensorflow/tfjs-backend-webgl')
      ]);

      const tf = tfModule.default || tfModule;

      await tf.setWasmPath(
        'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@latest/dist/'
      );

      let backendSet = false;

      try {
        await tf.ready();
        const webglSupported = tf.ENV.getBool('WEBGL_RENDER_FLOAT32_ENABLED') &&
                               tf.ENV.getBool('WEBGL_RENDER_FLOAT32_CAPABLE');

        if (webglSupported) {
          await tf.setBackend('webgl');
          await tf.ready();
          backendSet = true;
          console.log('[TF.js] WebGL backend initialized');
        }
      } catch (e) {
        console.warn('[TF.js] WebGL initialization failed:', e);
      }

      if (!backendSet) {
        try {
          await tf.setBackend('wasm');
          await tf.ready();
          backendSet = true;
          console.log('[TF.js] WASM backend initialized');
        } catch (e) {
          console.warn('[TF.js] WASM initialization failed:', e);
        }
      }

      if (!backendSet) {
        await tf.setBackend('cpu');
        await tf.ready();
        console.warn('[TF.js] Fallback to CPU backend');
      }

      tfInitialized = true;
      return tf;
    } catch (error) {
      console.error('[TF.js] Failed to initialize:', error);
      throw error;
    }
  })();

  return tfInitPromise;
}

export async function loadPoseDetection() {
  await initTfBackend();
  const poseDetection = await import('@tensorflow-models/pose-detection');
  return poseDetection;
}

export function isTfInitialized() {
  return tfInitialized;
}
