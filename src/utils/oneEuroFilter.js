/**
 * One-Euro Filter — adaptive low-pass for real-time signal smoothing.
 *
 * Unlike EMA (fixed alpha), one-euro adjusts cutoff frequency based on
 * how fast the signal is changing. Fast movement gets less smoothing
 * (stays responsive), slow/still gets more (eliminates jitter).
 *
 * Reference: Casiez et al. 2012, "1 Euro Filter"
 * https://cristal.univ-lille.fr/~casiez/1euro/
 */

class LowPassFilter {
    constructor(alpha) {
        this.y = null;
        this.s = null;
        this.setAlpha(alpha);
    }

    setAlpha(alpha) {
        this.alpha = Math.max(0, Math.min(1, alpha));
    }

    filter(value) {
        if (this.y === null) {
            this.s = value;
        } else {
            this.s = this.alpha * value + (1 - this.alpha) * this.s;
        }
        this.y = value;
        return this.s;
    }

    reset() {
        this.y = null;
        this.s = null;
    }
}

function alpha(cutoff, dt) {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
}

export class OneEuroFilter {
    /**
     * @param {number} minCutoff - Minimum cutoff frequency (Hz). Lower = more smoothing when still. Default 1.0.
     * @param {number} beta - Speed coefficient. Higher = less smoothing during fast movement. Default 0.007.
     * @param {number} dCutoff - Cutoff for derivative filter. Default 1.0.
     */
    constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.dCutoff = dCutoff;
        this.xFilter = new LowPassFilter(1);
        this.dxFilter = new LowPassFilter(1);
        this.lastTime = null;
    }

    /**
     * Filter a single value.
     * @param {number} value - Raw input value
     * @param {number} timestamp - Timestamp in seconds (must be monotonically increasing)
     * @returns {number} Filtered value
     */
    filter(value, timestamp) {
        if (this.lastTime === null) {
            this.lastTime = timestamp;
            this.xFilter.filter(value);
            this.dxFilter.filter(0);
            return value;
        }

        const dt = Math.max(timestamp - this.lastTime, 0.001);
        this.lastTime = timestamp;

        // Estimate derivative (speed of change)
        const dAlpha = alpha(this.dCutoff, dt);
        this.dxFilter.setAlpha(dAlpha);
        const dx = (value - (this.xFilter.s ?? value)) / dt;
        const edx = this.dxFilter.filter(dx);

        // Adjust cutoff based on speed
        const cutoff = this.minCutoff + this.beta * Math.abs(edx);

        // Filter the value
        const a = alpha(cutoff, dt);
        this.xFilter.setAlpha(a);
        return this.xFilter.filter(value);
    }

    reset() {
        this.xFilter.reset();
        this.dxFilter.reset();
        this.lastTime = null;
    }
}

/**
 * Per-keypoint filter bank — creates one OneEuroFilter per keypoint per axis.
 * Use this in FormAnalysisEngine to smooth all 17 keypoints.
 */
export class KeypointFilterBank {
    /**
     * @param {number} count - Number of keypoints (17 for MoveNet)
     * @param {Object} options - { minCutoff, beta, dCutoff }
     */
    constructor(count = 17, { minCutoff = 1.0, beta = 0.007, dCutoff = 1.0 } = {}) {
        this.filters = [];
        for (let i = 0; i < count; i++) {
            this.filters.push({
                x: new OneEuroFilter(minCutoff, beta, dCutoff),
                y: new OneEuroFilter(minCutoff, beta, dCutoff),
            });
        }
    }

    /**
     * Smooth an array of keypoints.
     * @param {Array} keypoints - [{x, y, score}, ...] in pixel coordinates
     * @param {number} timestamp - Current time in seconds
     * @returns {Array} Smoothed keypoints (new array, original untouched)
     */
    filter(keypoints, timestamp) {
        return keypoints.map((kp, i) => {
            if (!kp || kp.score < 0.3) return kp;
            const f = this.filters[i];
            return {
                ...kp,
                x: f.x.filter(kp.x, timestamp),
                y: f.y.filter(kp.y, timestamp),
            };
        });
    }

    reset() {
        for (const f of this.filters) {
            f.x.reset();
            f.y.reset();
        }
    }
}
