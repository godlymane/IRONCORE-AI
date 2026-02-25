/**
 * Haptic Feedback Engine for Iron Core.
 * Uses Capacitor Haptics on native, gracefully no-ops on web.
 */
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();

/**
 * Light haptic — for rep/weight logging, set completion
 */
export async function hapticLight() {
    if (!isNative) return;
    try {
        await Haptics.impact({ style: ImpactStyle.Light });
    } catch { /* device doesn't support haptics */ }
}

/**
 * Medium haptic — for navigation taps, button presses
 */
export async function hapticMedium() {
    if (!isNative) return;
    try {
        await Haptics.impact({ style: ImpactStyle.Medium });
    } catch { }
}

/**
 * Heavy haptic — for workout complete, PR hit, bad form detected
 */
export async function hapticHeavy() {
    if (!isNative) return;
    try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch { }
}

/**
 * Success notification — for achievements, rewards unlocked
 */
export async function hapticSuccess() {
    if (!isNative) return;
    try {
        await Haptics.notification({ type: NotificationType.Success });
    } catch { }
}

/**
 * Warning notification — for timer alerts, form warnings
 */
export async function hapticWarning() {
    if (!isNative) return;
    try {
        await Haptics.notification({ type: NotificationType.Warning });
    } catch { }
}

/**
 * Error notification — for critical failures
 */
export async function hapticError() {
    if (!isNative) return;
    try {
        await Haptics.notification({ type: NotificationType.Error });
    } catch { }
}
