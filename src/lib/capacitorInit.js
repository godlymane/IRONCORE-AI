import { Capacitor } from '@capacitor/core';

let initialized = false;

export async function initializeCapacitor() {
  if (!Capacitor.isNativePlatform() || initialized) return;
  initialized = true;

  try {
    const [{ StatusBar, Style }, { Keyboard, KeyboardResize }] = await Promise.all([
      import('@capacitor/status-bar'),
      import('@capacitor/keyboard')
    ]);

    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#000000' });
    await StatusBar.setOverlaysWebView({ overlay: true });

    await Keyboard.setAccessoryBarVisible({ isVisible: true });
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });

    Keyboard.addListener('keyboardWillShow', (info) => {
      document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
    });

    Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    });
  } catch (error) {
    console.warn('Capacitor init failed:', error);
  }
}

export function useScrollIntoView() {
  return (element) => {
    if (!element) return;
    setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }, 300);
  };
}
