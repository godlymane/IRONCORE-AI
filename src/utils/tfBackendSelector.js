/**
 * TensorFlow.js Backend Auto-Selector
 * Optimizes ML model performance for Capacitor mobile apps
 * 
 * Strategy:
 * - WebGL for flagship devices (iPhone 12+, Snapdragon 8xx series)
 * - WASM for mid-range Android (Snapdragon 6xx/7xx, budget devices)
 * - Graceful fallback if WebGL not supported
 * 
 * Critical: WASM binaries are bundled locally via Vite, not fetched from CDN
 */

import * as tf from '@tensorflow/tfjs';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';
import { Capacitor } from '@capacitor/core';

let backendInitialized = false;
let selectedBackend = null;

/**
 * Device capability detection
 * Returns 'flagship', 'midrange', or 'budget' based on hardware
 */
export function detectDeviceCapability() {
  const platform = Capacitor.getPlatform();
  
  // iOS device detection
  if (platform === 'ios') {
    const isOldDevice = /(iPhone [1-9]|iPhone [1][0-1]|iPad [1-6])/.test(navigator.userAgent);
    return isOldDevice ? 'midrange' : 'flagship';
  }
  
  // Android device detection via GPU info
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  if (!gl) return 'budget';
  
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (!debugInfo) return 'midrange';
  
  const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
  
  // Flagship: Adreno 6xx/7xx (Snapdragon 8xx), Mali-G7x (flagship Samsung/Xiaomi)
  if (/adreno [67]\d\d/.test(renderer) || /mali-g7[0-9]/.test(renderer)) {
    return 'flagship';
  }
  
  // Midrange: Adreno 5xx/6xx (Snapdragon 6xx/7xx), Mali-G5x
  if (/adreno [56]\d\d/.test(renderer) || /mali-g5[0-9]/.test(renderer)) {
    return 'midrange';
  }
  
  // Budget: Everything else
  return 'budget';
}

/**
 * Check if WebGL supports required extensions
 * OES_texture_float is critical for TensorFlow.js WebGL backend
 */
function isWebGLSupported() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return false;
    
    // Check for required extensions
    const hasFloat = gl.getExtension('OES_texture_float');
    const hasHalfFloat = gl.getExtension('OES_texture_half_float');
    
    return hasFloat || hasHalfFloat;
  } catch (e) {
    return false;
  }
}

/**
 * Initialize TensorFlow.js backend with optimal selection
 * Call this BEFORE loading any pose detection models
 */
export async function initializeTensorFlowBackend() {
  if (backendInitialized) {
    console.log(`[TensorFlow] Already initialized with backend: ${selectedBackend}`);
    return selectedBackend;
  }

  console.log('[TensorFlow] Detecting device capability...');
  const deviceCapability = detectDeviceCapability();
  const webglSupported = isWebGLSupported();
  
  console.log(`[TensorFlow] Device: ${deviceCapability}, WebGL: ${webglSupported}`);

  try {
    // Strategy 1: Flagship devices with WebGL support -> Use WebGL
    if (deviceCapability === 'flagship' && webglSupported) {
      console.log('[TensorFlow] Using WebGL backend (flagship device)');
      await tf.setBackend('webgl');
      await tf.ready();
      selectedBackend = 'webgl';
    }
    
    // Strategy 2: Mid-range devices OR flagship without proper WebGL -> Use WASM
    else if (deviceCapability === 'midrange' || (deviceCapability === 'flagship' && !webglSupported)) {
      console.log('[TensorFlow] Using WASM backend (mid-range device or WebGL unavailable)');
      
      // CRITICAL: Set WASM paths to local bundled files (not CDN)
      // Vite will copy these to the dist folder
      setWasmPaths('/wasm/');
      
      await tf.setBackend('wasm');
      await tf.ready();
      selectedBackend = 'wasm';
    }
    
    // Strategy 3: Budget devices -> Try WASM, fallback to CPU
    else {
      console.log('[TensorFlow] Budget device detected, trying WASM...');
      
      try {
        setWasmPaths('/wasm/');
        await tf.setBackend('wasm');
        await tf.ready();
        selectedBackend = 'wasm';
      } catch (wasmError) {
        console.warn('[TensorFlow] WASM failed, falling back to CPU:', wasmError);
        await tf.setBackend('cpu');
        await tf.ready();
        selectedBackend = 'cpu';
      }
    }

    backendInitialized = true;
    console.log(`[TensorFlow] Backend initialized: ${selectedBackend}`);
    console.log(`[TensorFlow] Num tensors: ${tf.memory().numTensors}`);
    
    return selectedBackend;
    
  } catch (error) {
    console.error('[TensorFlow] Backend initialization failed:', error);
    
    // Ultimate fallback: CPU backend (slow but guaranteed to work)
    try {
      await tf.setBackend('cpu');
      await tf.ready();
      selectedBackend = 'cpu';
      backendInitialized = true;
      console.warn('[TensorFlow] Using CPU backend as last resort');
      return selectedBackend;
    } catch (cpuError) {
      console.error('[TensorFlow] All backends failed:', cpuError);
      throw new Error('TensorFlow.js could not initialize any backend');
    }
  }
}

/**
 * Get current backend info
 */
export function getBackendInfo() {
  return {
    backend: selectedBackend || 'not_initialized',
    initialized: backendInitialized,
    memory: backendInitialized ? tf.memory() : null
  };
}

/**
 * Cleanup TensorFlow resources
 * Call this when unmounting components that use TensorFlow
 */
export function cleanupTensorFlow() {
  if (backendInitialized) {
    tf.disposeVariables();
    console.log('[TensorFlow] Resources cleaned up');
  }
}

/**
 * Helper: Lazy load TensorFlow models
 * Use this in FormCoach.jsx or any component that needs pose detection
 *
 * @param {string} [modelOverride] - 'lightning' or 'thunder'. Default: auto-select based on device.
 *
 * Usage:
 * const detector = await lazyLoadPoseDetector(); // Auto-select
 * const detector = await lazyLoadPoseDetector('thunder'); // Force Thunder
 */
export async function lazyLoadPoseDetector(modelOverride) {
  // Ensure backend is initialized first
  if (!backendInitialized) {
    await initializeTensorFlowBackend();
  }

  // Auto-select model based on device capability
  const capability = detectDeviceCapability();
  const useThunder = modelOverride === 'thunder' || (!modelOverride && capability === 'flagship');
  const modelLabel = useThunder ? 'Thunder' : 'Lightning';

  console.log(`[TensorFlow] Lazy loading MoveNet ${modelLabel} (device: ${capability})...`);

  // Dynamic import to code-split TensorFlow models
  const poseDetection = await import('@tensorflow-models/pose-detection');

  const detectorConfig = {
    modelType: useThunder
      ? poseDetection.movenet.modelType.SINGLEPOSE_THUNDER
      : poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    enableSmoothing: true,
  };

  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    detectorConfig
  );

  console.log(`[TensorFlow] Pose detector loaded (${modelLabel})`);
  return detector;
}
