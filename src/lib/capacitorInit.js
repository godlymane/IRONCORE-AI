import { Capacitor } from '@capacitor/core';

let initialized = false;
const listenerHandles = [];

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

    listenerHandles.push(
      await Keyboard.addListener('keyboardWillShow', (info) => {
        document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
        document.body.classList.add('keyboard-open');
      })
    );

    listenerHandles.push(
      await Keyboard.addListener('keyboardWillHide', () => {
        document.documentElement.style.setProperty('--keyboard-height', '0px');
        document.body.classList.remove('keyboard-open');
      })
    );
  } catch (error) {
    if (import.meta.env.DEV) console.warn('Capacitor init failed:', error);
  }
}

export async function teardownCapacitor() {
  while (listenerHandles.length) {
    const handle = listenerHandles.pop();
    try { await handle?.remove?.(); } catch { /* noop */ }
  }
  initialized = false;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => { teardownCapacitor(); });
}

export function useScrollIntoView() {
  return (element) => {
    if (!element) return;
    setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }, 300);
  };
}
