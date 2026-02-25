// Biometric Auth Wrapper — graceful fallback for web/unsupported devices
import { Capacitor } from '@capacitor/core';

/**
 * Check if biometric auth is available on this device.
 */
export async function isBiometricAvailable() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch {
    return false;
  }
}

/**
 * Prompt user for biometric authentication.
 * Returns true if authenticated, false if cancelled/failed.
 */
export async function authenticateWithBiometrics(reason = 'Verify your identity') {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
    await NativeBiometric.verifyIdentity({
      reason,
      title: 'IronCore',
      subtitle: reason,
      useFallback: false,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get biometric type label for UI.
 */
export async function getBiometricType() {
  if (!Capacitor.isNativePlatform()) return 'none';
  try {
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
    const result = await NativeBiometric.isAvailable();
    if (!result.isAvailable) return 'none';
    // biometryType: 1=touch, 2=face, 3=iris
    return result.biometryType === 2 ? 'faceid' : 'fingerprint';
  } catch {
    return 'none';
  }
}
