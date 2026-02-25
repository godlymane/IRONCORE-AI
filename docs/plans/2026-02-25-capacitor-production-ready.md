# Capacitor 8 Production-Ready Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Capacitor 8 app production-ready with proper keyboard handling, edge-to-edge safe areas, and Sentry crash analytics.

**Architecture:** A single delegated `useScrollIntoView` hook attached to the main viewport handles all input scroll-into-view behavior. Safe area CSS variables are applied to every fixed-position floating element. Sentry is initialized at the app entry point with native crash bridging via `@sentry/capacitor`.

**Tech Stack:** React 19, Capacitor 8, @sentry/react 8.55, @sentry/capacitor 1.5, CSS env() safe-area variables

---

## Task 1: Create useScrollIntoView Hook

**Files:**
- Create: `src/hooks/useScrollIntoView.js`

**Step 1: Create the hook file**

Create `src/hooks/useScrollIntoView.js` with this content:

```js
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
```

**Step 2: Verify no syntax errors**

Run: `npx vite build --mode development 2>&1 | head -20`
Expected: No import errors for the new file (it's not imported yet, so build won't reference it)

**Step 3: Commit**

```bash
git add src/hooks/useScrollIntoView.js
git commit -m "feat: add useScrollIntoView hook for native keyboard management"
```

---

## Task 2: Integrate useScrollIntoView in App.jsx

**Files:**
- Modify: `src/App.jsx`

**Step 1: Add the import**

At the top of `src/App.jsx`, after the existing hook imports (line ~28), add:

```js
import { useScrollIntoView } from './hooks/useScrollIntoView';
```

**Step 2: Call the hook in MainContent**

Inside the `MainContent` component, after the existing `viewportRef` declaration (line ~100), add:

```js
useScrollIntoView(viewportRef);
```

The `viewportRef` is already attached to the main scrollable `<div>` that wraps all views. This is the single integration point — every input inside any tab view (WorkoutView, CardioView, Nutrition, etc.) is covered by event delegation.

**Step 3: Verify build succeeds**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build completes successfully

**Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire useScrollIntoView to main viewport for keyboard-safe inputs"
```

---

## Task 3: Hide Bottom Nav When Keyboard Opens

**Files:**
- Modify: `src/index.css`

**Step 1: Add keyboard-open CSS rules**

In `src/index.css`, after the existing `.keyboard-open .keyboard-safe` rule (around line 188), add:

```css
/* Hide bottom nav + floating buttons when keyboard is open */
body.keyboard-open .fixed.bottom-0,
body.keyboard-open .fixed.z-50 {
  display: none !important;
}
```

Wait — this is too aggressive (it would hide toasts too). Instead, add a more targeted rule. The bottom nav is the `motion.div` with `fixed bottom-0`. The FAB and VoiceCoach are `fixed ... z-50` but positioned at bottom. Better approach: use a data attribute.

**Revised Step 1: Add keyboard-hide class to nav in App.jsx**

Actually, the cleanest approach is a CSS rule targeting the nav wrapper specifically. In `src/index.css`, after the keyboard-safe rule block (~line 190), add:

```css
/* Slide bottom nav off-screen when keyboard opens — prevents it from eating viewport space */
body.keyboard-open [data-nav="bottom"] {
  transform: translateY(120px) !important;
  transition: transform 0.2s ease !important;
}

/* Hide floating action buttons when keyboard is open */
body.keyboard-open [data-keyboard-hide] {
  opacity: 0 !important;
  pointer-events: none !important;
  transition: opacity 0.15s ease !important;
}
```

**Step 2: Add data attributes to App.jsx nav wrapper**

In `src/App.jsx`, on the bottom nav `<motion.div>` (line ~351), add `data-nav="bottom"`:

Change:
```jsx
<motion.div
  className="fixed bottom-0 left-0 right-0 z-40 p-3"
```

To:
```jsx
<motion.div
  data-nav="bottom"
  className="fixed bottom-0 left-0 right-0 z-40 p-3"
```

**Step 3: Add data-keyboard-hide to FAB and VoiceCoach in App.jsx**

On the FloatingActionButton usage (line ~337), wrap with data attribute. Since FAB is a component, add `data-keyboard-hide` on the wrapper div. Actually, the FAB renders its own `<div className="fixed ...">` so we need to modify UIComponents.jsx.

In `src/components/UIComponents.jsx` at line 467, change:
```jsx
<div className="fixed right-4 z-50" style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px) + 16px)' }}>
```
To:
```jsx
<div data-keyboard-hide className="fixed right-4 z-50" style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px) + 16px)' }}>
```

In `src/components/VoiceCoach.jsx` on the mic button (line ~451), add `data-keyboard-hide` to the outer fragment wrapper. Since it's a fragment, add it to both the bubble div and the button. On the `<motion.button>` at line 451:

Change:
```jsx
<motion.button
    onClick={toggleListening}
    whileTap={{ scale: 0.9 }}
    className="fixed bottom-28 left-4 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
```
To:
```jsx
<motion.button
    data-keyboard-hide
    onClick={toggleListening}
    whileTap={{ scale: 0.9 }}
    className="fixed bottom-28 left-4 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
```

**Step 4: Verify build**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/index.css src/App.jsx src/components/UIComponents.jsx src/components/VoiceCoach.jsx
git commit -m "feat: hide nav and floating buttons when keyboard opens"
```

---

## Task 4: Safe Area — Toast Container

**Files:**
- Modify: `src/components/UIComponents.jsx`

**Step 1: Add safe-area-inset-top to toast container**

In `src/components/UIComponents.jsx` at line 48, the toast container is:
```jsx
<div className="fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
```

Change to use inline style for safe area:
```jsx
<div className="fixed left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none" style={{ top: 'calc(env(safe-area-inset-top, 16px) + 4px)' }}>
```

This ensures toasts render below the Dynamic Island on iPhones with the notch/island.

**Step 2: Verify build**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/UIComponents.jsx
git commit -m "fix: offset toast container below Dynamic Island safe area"
```

---

## Task 5: Safe Area — VoiceCoach Mic Button

**Files:**
- Modify: `src/components/VoiceCoach.jsx`

**Step 1: Update mic button bottom position**

The VoiceCoach mic button at line ~454 uses `className="fixed bottom-28 left-4 ..."`. This is a Tailwind class (`bottom-28` = `7rem`). For safe area support, switch to inline style.

Change the `className` on the `<motion.button>` (line 454):
```jsx
className="fixed bottom-28 left-4 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
```

To:
```jsx
className="fixed left-4 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
style={{
    ...existingStyleObject,
    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 7rem)',
}}
```

Note: The existing `style` attribute on the button has a complex ternary for `background`, `border`, and `boxShadow`. Merge `bottom` into that same style object.

Also update the chat bubble at line 379:
```jsx
className="fixed bottom-28 left-4 z-50 max-w-[280px]"
```
Change to:
```jsx
className="fixed left-4 z-50 max-w-[280px]"
style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 7rem)' }}
```

**Step 2: Verify build**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/VoiceCoach.jsx
git commit -m "fix: offset VoiceCoach mic button above gesture bar safe area"
```

---

## Task 6: Sentry Initialization in main.jsx

**Files:**
- Modify: `src/main.jsx`

**Step 1: Add Sentry imports and init**

At the top of `src/main.jsx`, before the React imports, add:

```js
import * as SentryReact from '@sentry/react';
import * as SentryCapacitor from '@sentry/capacitor';

// Initialize Sentry — must run before React renders
// @sentry/capacitor wraps @sentry/react and bridges native crashes
SentryCapacitor.init(
  {
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release: `ironcore@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    environment: import.meta.env.MODE,
    // Only send 20% of transactions in production to stay within quota
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.2 : 1.0,
    // Disable in development unless DSN is explicitly set
    enabled: !!import.meta.env.VITE_SENTRY_DSN,
  },
  SentryReact.init,
);
```

The existing React/App imports stay below this block.

**Step 2: Verify build**

Run: `npx vite build 2>&1 | tail -10`
Expected: Build succeeds (Sentry will be disabled at runtime since VITE_SENTRY_DSN isn't set in .env yet, but the code is correct)

**Step 3: Commit**

```bash
git add src/main.jsx
git commit -m "feat: initialize Sentry crash analytics with Capacitor native bridge"
```

---

## Task 7: Wire Sentry into Existing Error Boundaries

**Files:**
- Modify: `src/App.jsx`

**Step 1: Add Sentry import to App.jsx**

At the top of `src/App.jsx`, add:
```js
import * as Sentry from '@sentry/react';
```

**Step 2: Update ViewErrorBoundary.componentDidCatch**

In the `ViewErrorBoundary` class (line ~403), change:
```js
componentDidCatch(error, errorInfo) {
    console.error(`[${this.props.viewName || 'View'}] Error:`, error, errorInfo);
}
```

To:
```js
componentDidCatch(error, errorInfo) {
    console.error(`[${this.props.viewName || 'View'}] Error:`, error, errorInfo);
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo?.componentStack } },
      tags: { view: this.props.viewName || 'unknown' },
    });
}
```

**Step 3: Update ErrorBoundary.componentDidCatch**

In the `ErrorBoundary` class (line ~446), change:
```js
componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
}
```

To:
```js
componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo?.componentStack } },
      tags: { boundary: 'app-root' },
    });
}
```

**Step 4: Verify build**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: report error boundary crashes to Sentry with view context"
```

---

## Task 8: Final Build Verification

**Step 1: Clean build**

Run: `npx vite build`
Expected: Build completes with no errors, output in `dist/`

**Step 2: Verify no broken imports**

Run: `npx vite build 2>&1 | grep -i error`
Expected: No output (no errors)

**Step 3: Verify bundle sizes haven't ballooned**

Run: `npx vite build 2>&1 | grep -E "dist/|kB"`
Expected: Sentry adds ~30-50kB to the vendor bundle. No other size changes.

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | useScrollIntoView hook | `src/hooks/useScrollIntoView.js` (new) |
| 2 | Wire hook to viewport | `src/App.jsx` |
| 3 | Hide nav/FAB on keyboard | `src/index.css`, `src/App.jsx`, `UIComponents.jsx`, `VoiceCoach.jsx` |
| 4 | Toast safe area | `src/components/UIComponents.jsx` |
| 5 | VoiceCoach safe area | `src/components/VoiceCoach.jsx` |
| 6 | Sentry init | `src/main.jsx` |
| 7 | Sentry in error boundaries | `src/App.jsx` |
| 8 | Final build verify | (no files) |
