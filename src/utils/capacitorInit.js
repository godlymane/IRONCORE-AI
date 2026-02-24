/**
 * Capacitor Initialization Utilities
 * Centralizes all Capacitor plugin initialization for mobile-first experience
 * 
 * Handles:
 * - Keyboard behavior and scroll management
 * - Status bar and system bars (Capacitor 8)
 * - Safe area detection
 * - Haptic feedback initialization
 */

import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();

/**
 * Initialize keyboard handling for native feel
 * Fixes the classic "webby" issue where keyboard covers input fields
 */
export async function initializeKeyboard() {
  if (!isNative) return;

  try {
    // Set resize mode based on platform
    // 'native' mode works best for most layouts - pushes content up naturally
    // 'ionic' mode is alternative if you have complex fixed positioning
    await Keyboard.setResizeMode({ mode: 'native' });

    // iOS: Show accessory bar with Done button above keyboard
    if (Capacitor.getPlatform() === 'ios') {
      await Keyboard.setAccessoryBarVisible({ isVisible: true });
    }

    // Listen for keyboard events to handle scroll-into-view
    Keyboard.addListener('keyboardWillShow', (info) => {
      // Get the currently focused input element
      const activeElement = document.activeElement;
      
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        // Wait a tick for keyboard to start showing, then scroll
        setTimeout(() => {
          activeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center', // Center the input in viewport
            inline: 'nearest'
          });
        }, 100);
      }
    });

    Keyboard.addListener('keyboardWillHide', () => {
      // Optional: scroll back to original position if needed
      // For now, let the layout naturally adjust
    });

    console.log('[Capacitor] Keyboard initialized successfully');
  } catch (error) {
    console.warn('[Capacitor] Keyboard initialization failed:', error);
  }
}

/**
 * Initialize Status Bar and System Bars (Capacitor 8)
 * Handles safe areas for notches, Dynamic Island, and navigation bars
 */
export async function initializeStatusBar() {
  if (!isNative) return;

  try {
    const platform = Capacitor.getPlatform();

    if (platform === 'ios') {
      // iOS: Use dark content style (light background)
      // For dark theme apps, use Style.Dark (white status bar icons)
      await StatusBar.setStyle({ style: Style.Dark });
      
      // Make status bar match app background
      await StatusBar.setBackgroundColor({ color: '#000000' });
      
      // Show status bar (don't hide it)
      await StatusBar.show();
    } 
    else if (platform === 'android') {
      // Android: Edge-to-edge layout with Capacitor 8
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#00000000' }); // Transparent
      
      // Capacitor 8: Use SystemBars plugin for proper edge-to-edge
      // Note: SystemBars is part of @capacitor/status-bar in v8
      await StatusBar.setOverlaysWebView({ overlay: true });
      
      console.log('[Capacitor] Android edge-to-edge layout enabled');
    }

    console.log('[Capacitor] Status bar initialized successfully');
  } catch (error) {
    console.warn('[Capacitor] Status bar initialization failed:', error);
  }
}

/**
 * Get safe area insets programmatically (backup for CSS env() variables)
 * Useful for dynamic calculations in JavaScript
 */
export function getSafeAreaInsets() {
  if (!isNative) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  // Read CSS custom properties set by Capacitor
  const computedStyle = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(computedStyle.getPropertyValue('--sai-top') || '0'),
    right: parseInt(computedStyle.getPropertyValue('--sai-right') || '0'),
    bottom: parseInt(computedStyle.getPropertyValue('--sai-bottom') || '0'),
    left: parseInt(computedStyle.getPropertyValue('--sai-left') || '0')
  };
}

/**
 * Initialize haptic feedback (already installed, just enable)
 */
export async function initializeHaptics() {
  if (!isNative) return;

  try {
    // Test haptic capability
    await Haptics.impact({ style: 'light' });
    console.log('[Capacitor] Haptics initialized successfully');
  } catch (error) {
    console.warn('[Capacitor] Haptics not available on this device');
  }
}

/**
 * Master initialization function
 * Call this in your App.jsx or main.jsx after Capacitor is ready
 */
export async function initializeCapacitor() {
  if (!isNative) {
    console.log('[Capacitor] Running in web mode, skipping native initialization');
    return;
  }

  console.log('[Capacitor] Initializing native plugins...');
  
  // Run initializations in parallel for faster startup
  await Promise.allSettled([
    initializeStatusBar(),
    initializeKeyboard(),
    initializeHaptics()
  ]);

  console.log('[Capacitor] All plugins initialized');
}

/**
 * Helper: Add haptic feedback to any button/element
 * Usage: <button onClick={() => { hapticFeedback('medium'); doSomething(); }}>Click</button>
 */
export async function hapticFeedback(style = 'light') {
  if (!isNative) return;
  
  try {
    await Haptics.impact({ style }); // 'light', 'medium', 'heavy'
  } catch (error) {
    // Silently fail - haptics are nice-to-have
  }
}

/**
 * Helper: Enhanced input focus handler
 * Use this on critical input fields for guaranteed visibility
 */
export function handleInputFocus(event) {
  if (!isNative) return;

  const input = event.target;
  
  // Add a small delay to ensure keyboard is showing
  setTimeout(() => {
    // Scroll with extra padding to account for keyboard height
    const rect = input.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const keyboardHeight = viewportHeight * 0.4; // Approximate keyboard height
    
    if (rect.bottom > (viewportHeight - keyboardHeight)) {
      input.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, 300);
}
