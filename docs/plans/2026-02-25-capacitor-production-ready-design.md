# Capacitor 8 Production-Ready Design

**Date:** 2026-02-25
**Scope:** Keyboard management, edge-to-edge layout, crash analytics
**Constraint:** No changes to AI or gamification logic

---

## Task 1: Keyboard Management — `useScrollIntoView` Hook

### Problem
On native iOS/Android, the soft keyboard can obscure input fields in workout logging views (WorkoutView, CardioView, Nutrition, ProfileSettingsModal, DashboardView). The existing `keyboardSetup.js` enables Capacitor's native scroll and tracks `--keyboard-height`, but there's no React-level hook to guarantee the focused input is visible.

### Design

**Strategy:** Resize mode — keep `Keyboard.resize: "body"` in capacitor.config.json. The webview shrinks when keyboard opens. Enhance with a React hook.

**New file:** `src/hooks/useScrollIntoView.js`

```
useScrollIntoView(containerRef)
```

- Attaches a delegated `focusin` event listener on the container element
- On focus, waits 300ms (for webview resize to settle), then calls `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`
- Only activates on native platforms (`Capacitor.isNativePlatform()`)
- Cleans up listener on unmount

**Integration point:** App.jsx — the `viewportRef` div that wraps all tab views. Single hook call, zero changes to individual views.

**Bottom nav hide:** Add CSS rule — when `body.keyboard-open` is set (already done by `keyboardSetup.js`), hide the bottom nav via `display: none` or `translateY(120px)`. This prevents the nav from eating screen space while typing.

### Files Changed
- `src/hooks/useScrollIntoView.js` (new)
- `src/App.jsx` (add hook call + keyboard-hide nav)

---

## Task 2: Edge-to-Edge Layout — Safe Area Audit

### Problem
The app must render behind iPhone Dynamic Island and Android gesture bars without clipping text or interactive elements.

### Current State (already correct)
- `index.html` has `viewport-fit=cover` and `interactive-widget=resizes-content`
- `body` has `padding-top: env(safe-area-inset-top)`, `padding-left`, `padding-right`
- Bottom nav has `paddingBottom: calc(env(safe-area-inset-bottom, 8px) + 8px)`
- `capacitor.config.json` has `ios.contentInset: "always"` and `StatusBar.overlaysWebView: true`

### Gaps to Fix

1. **FloatingActionButton (FAB):** Positioned `fixed bottom-24 right-6` — no safe-area offset. On phones with tall gesture bars, the FAB sits too low.
   - Fix: Add `calc(env(safe-area-inset-bottom, 0px) + 6rem)` to FAB bottom positioning.

2. **Toast container:** Positioned `fixed top-4` — doesn't account for Dynamic Island.
   - Fix: Change to `top: calc(env(safe-area-inset-top, 16px) + 4px)` in UIComponents.jsx.

3. **VoiceCoach button:** Floating mic button — needs same safe-area-bottom treatment as FAB.

### Files Changed
- `src/components/UIComponents.jsx` (FAB + Toast)
- `src/components/VoiceCoach.jsx` (mic button)

---

## Task 3: Crash Analytics — Sentry Init

### Problem
No crash reporting. Unhandled promise rejections and native layer crashes are invisible.

### Design

**Initialize in `src/main.jsx`** before `ReactDOM.createRoot()`:

```js
import * as SentryReact from '@sentry/react';
import * as SentryCapacitor from '@sentry/capacitor';

SentryCapacitor.init({
  dsn: '<DSN>',
  release: 'ironcore@1.0.0',
  environment: import.meta.env.MODE,
}, SentryReact.init);
```

`@sentry/capacitor` wraps `@sentry/react` — its `init()` takes the React init as a callback, bridging native crashes to the same project.

**Error boundary integration:** Add `Sentry.captureException(error)` calls inside both existing error boundary classes (`ViewErrorBoundary.componentDidCatch` and `ErrorBoundary.componentDidCatch`). Preserves existing UI, adds Sentry reporting.

**Unhandled promise rejections:** Sentry's default browser integrations capture these automatically. No extra listener needed.

**DSN:** Will be read from `import.meta.env.VITE_SENTRY_DSN` so it's not hardcoded.

### Files Changed
- `src/main.jsx` (Sentry init)
- `src/App.jsx` (captureException in error boundaries)

---

## Bonus: Performance Verification

The existing mobile performance overrides in `index.css` (lines 1029-1123) already kill all `backdrop-filter` on mobile. No additional perf work needed for 60fps scrolling.

---

## Summary of All Files Changed

| File | Change |
|------|--------|
| `src/hooks/useScrollIntoView.js` | New hook |
| `src/App.jsx` | Hook integration + Sentry in error boundaries + nav hide on keyboard |
| `src/main.jsx` | Sentry initialization |
| `src/components/UIComponents.jsx` | Safe-area on FAB + Toast |
| `src/components/VoiceCoach.jsx` | Safe-area on mic button |
| `src/index.css` | keyboard-open nav hide rule |
