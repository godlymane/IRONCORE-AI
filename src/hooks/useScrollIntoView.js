import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Attaches a delegated focusin listener to a container ref.
 * When any input/textarea inside gains focus, waits for the
 * Capacitor keyboard resize to settle, then scrolls the
 * focused element into the visible area.
 *
 * @param {React.RefObject<HTMLElement>} containerRef
 */
export function useScrollIntoView(containerRef) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const el = containerRef.current;
    if (!el) return;

    const handleFocusIn = (e) => {
      const target = e.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        // Wait for Capacitor Keyboard.resize:"body" to finish resizing the webview
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    el.addEventListener('focusin', handleFocusIn);
    return () => el.removeEventListener('focusin', handleFocusIn);
  }, [containerRef]);
}
