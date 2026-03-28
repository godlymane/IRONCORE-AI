/**
 * Local ML model caching using IndexedDB.
 * Downloads pose model once, serves locally on subsequent launches.
 * Critical for offline gym basement usage.
 */
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';

const MODEL_VERSION_KEY = 'ironcore_model_version';
const MODEL_STORE_KEY = 'ironcore-pose-model';
const CURRENT_MODEL_VERSION = '2.1.3'; // Bump when model updates

/**
 * Load pose detection model with local caching.
 * @param {function} onProgress - Callback with loading state message
 * @returns {Promise<poseDetection.PoseDetector>}
 */
export async function loadCachedModel(onProgress) {
    const storedVersion = localStorage.getItem(MODEL_VERSION_KEY);
    let detector;

    try {
        // Try loading from IndexedDB cache first
        if (storedVersion === CURRENT_MODEL_VERSION) {
            onProgress?.('Loading cached model...');
            try {
                // Check if model exists in IndexedDB
                const savedModels = await tf.io.listModels();
                if (savedModels[`indexeddb://${MODEL_STORE_KEY}`]) {
                    detector = await poseDetection.createDetector(
                        poseDetection.SupportedModels.MoveNet,
                        {
                            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
                            modelUrl: `indexeddb://${MODEL_STORE_KEY}`,
                        }
                    );
                    console.debug('[Model] ✅ Loaded from cache');
                    return detector;
                }
            } catch (cacheErr) {
                console.warn('[Model] Cache read failed, downloading fresh:', cacheErr);
            }
        }

        // Download fresh model
        onProgress?.('Downloading AI model (first time only)...');
        detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            {
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            }
        );

        // Save to IndexedDB for offline use
        onProgress?.('Caching model for offline use...');
        try {
            // MoveNet's internal model can be saved
            const model = detector.model || detector.moveNetModel;
            if (model && typeof model.save === 'function') {
                await model.save(`indexeddb://${MODEL_STORE_KEY}`);
                localStorage.setItem(MODEL_VERSION_KEY, CURRENT_MODEL_VERSION);
                console.debug('[Model] ✅ Saved to cache');
            }
        } catch (saveErr) {
            console.warn('[Model] Cache save failed (non-critical):', saveErr);
        }

        return detector;
    } catch (err) {
        console.error('[Model] Failed to load:', err);
        onProgress?.('Model loading failed. Check your connection.');
        throw err;
    }
}

/** Clear cached model (for debugging or forced updates) */
export async function clearModelCache() {
    try {
        await tf.io.removeModel(`indexeddb://${MODEL_STORE_KEY}`);
        localStorage.removeItem(MODEL_VERSION_KEY);
        console.debug('[Model] Cache cleared');
    } catch {
        // Ignore if model wasn't cached
    }
}
