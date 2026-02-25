/**
 * Keyboard handling for Capacitor apps.
 * Ensures inputs aren't hidden behind keyboard on iOS/Android.
 */
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Initialize keyboard behavior for native platforms.
 * Call once in App.jsx or main.jsx on mount.
 */
export async function initKeyboardHandling() {
    if (!Capacitor.isNativePlatform()) return;

    try {
        // Hide the iOS keyboard accessory bar
        await Keyboard.setAccessoryBarVisible({ isVisible: false });

        // Scroll focused input into view
        await Keyboard.setScroll({ isDisabled: false });

        // Listen for keyboard events to adjust layout
        Keyboard.addListener('keyboardWillShow', (info) => {
            document.documentElement.style.setProperty(
                '--keyboard-height', `${info.keyboardHeight}px`
            );
            document.body.classList.add('keyboard-open');
        });

        Keyboard.addListener('keyboardWillHide', () => {
            document.documentElement.style.setProperty('--keyboard-height', '0px');
            document.body.classList.remove('keyboard-open');
        });

        console.log('[Keyboard] ✅ Handlers initialized');
    } catch (err) {
        console.warn('[Keyboard] Setup failed:', err);
    }
}
