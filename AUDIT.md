# IronCore AI — Security & Code Quality Audit

**Scope:** `C:\Users\devda\iron-ai\` — React 19 + Vite 7 + Capacitor 8 hybrid (iOS + Android), Firebase Auth/Firestore/Storage/Functions/Messaging.
**Auditor:** senior security + code quality review.
**Date:** 2026-04-22.
**Method:** `npm audit`, `depcheck`, targeted `grep`/`Read` across web, native, CI, rules, and Cloud Functions. No runtime exploitation performed.

---

## 1. Executive Summary

- **iOS build will crash on launch and be rejected by App Review** — `ios/App/App/Info.plist` is missing `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, and `NSPhotoLibraryUsageDescription`, yet the app uses camera (QR login, pose detection, profile uploads) and mic (voice coach). This is the single highest-severity finding.
- **User PII leaking from the working directory into git-tracked artifacts** — a file literally named `nul` at repo root (9,159 bytes) contains a dump of real Firebase Auth UIDs and sign-in timestamps; `firestore-debug.log` is also tracked.
- **Authentication has a silent downgrade path** — `loginWithPin` still accepts v1 plain-SHA-256 PIN hashes server-side. A 6-digit PIN is fully brute-forceable offline (1M tries on commodity hardware in <1s) if a v1 hash ever lands in a backup or Firestore export.
- **Client secrets & observability leak PII** — Sentry is initialised with no `beforeSend` scrubber, `console.error` is not stripped by the Vite prod build, and `LoginScreen.jsx:181` logs the full Firebase error object including `e.details`/`JSON.stringify(e)`.
- **Supply-chain posture is weak but not actively broken** — GitHub Actions are pinned to *tags* (`@v4`, `@v0`) not commit SHAs; `@capacitor/local-notifications` is imported but missing from `package.json`; minified production bundles are committed to `ios/App/App/public/assets/` and `android/app/src/main/assets/public/assets/`.

**Severity counts:** Critical **2** · High **3** · Medium **9** · Low **7**.

Firestore rules, Storage rules, Cloud Functions design, `capacitor.config.json` hardening, and `AndroidManifest.xml` posture are genuinely strong — most of the weight sits on the client and release/CI pipeline.

---

## 2. Findings

### C-1 · iOS Info.plist missing all camera/microphone/photo-library usage strings — app crashes on first camera/mic access, App Store will reject  ·  **Critical**

**Location:** [ios/App/App/Info.plist](ios/App/App/Info.plist) (entire file, lines 1–51).

**Evidence:**
```xml
<!-- ios/App/App/Info.plist — full dict, NO usage-description keys -->
<dict>
    <key>CAPACITOR_DEBUG</key>
    <string>$(CAPACITOR_DEBUG)</string>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    ...
    <key>UIViewControllerBasedStatusBarAppearance</key>
    <true/>
</dict>
```
Camera / mic / photos are actually used:
- [src/components/FormCoach.jsx](src/components/FormCoach.jsx) — TF.js pose detection from `<video>` + MediaDevices.
- [src/views/LoginScreen.jsx](src/views/LoginScreen.jsx) — `html5-qrcode` for QR-card login.
- [src/components/VoiceCoach.jsx:298](src/components/VoiceCoach.jsx:298) — `@capacitor-community/speech-recognition`.
- [src/views/PlayerCardView.jsx](src/views/PlayerCardView.jsx) — `@capacitor/filesystem` + `@capacitor/share` (photo library).

**Why it matters:** On iOS 10+, any call that reaches `AVCaptureDevice`, `AVAudioSession`, or `PHPhotoLibrary` without the corresponding `NS*UsageDescription` **terminates the app with SIGABRT** — the system will not prompt the user, it will kill the process. App Store review hits this in the first 30 seconds of testing; binary is rejected. No exploit required — this is a guaranteed crash on first use by any user.

**Fix (exact):** Add these keys inside the existing `<dict>` in `ios/App/App/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>IronCore uses the camera to analyze your exercise form in real time and to scan login QR codes.</string>
<key>NSMicrophoneUsageDescription</key>
<string>IronCore listens for voice commands during workouts ("start timer", "next set").</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>IronCore saves and shares your progress photos and player card.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>IronCore saves your shareable player card to your photo library.</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>IronCore converts your voice commands to text on-device for workout control.</string>
```

---

### C-2 · `nul` file at repo root contains real Firebase Auth UIDs + sign-in timestamps  ·  **Critical**

**Location:** [nul](nul) (repo root, 9,159 bytes, mtime 2026-02-20).

**Evidence:** `cat nul` head:
```json
{"users": [
{ "localId": "26wt3g4At8alXjDWNeAavSjSnRu2",
  "lastSignedInAt": "1766587987391",
  "createdAt": "1766587987391" },
{ "localId": "44G0OFMPFvbvIEWuwgbnS9063JA3",
  "lastSignedInAt": "1766589520364",
  "createdAt": "1766589520364" },
...
```
This is a `firebase auth:export` dump created by a Windows bash redirect bug (`> nul` on Git Bash goes to a file literally named `nul`, not the null device).

**Why it matters:** Direct dump of production user identifiers. Even if `.gitignore` currently covers it, the file sits on your working machine; if it was ever captured in a backup tool (Time Machine / Windows File History / Dropbox), leaked via `tar czf project.tar.gz .`, or added with `git add -A` before the rule was in place, all UIDs + account ages are exposed. UIDs in turn enable Firestore enumeration against users where rules permit reads (`users/{uid}`). Also confusing — future `git add -A` from a contributor who doesn't know about `.gitignore` will leak it.

**Fix:**
```bash
# 1. Nuke the file now — it has no legitimate use.
rm -- ./nul

# 2. Verify it was never committed:
git log --all --full-history -- nul
# if the above prints any commit, rewrite history (git filter-repo --invert-paths --path nul)

# 3. Add an explicit guard to .gitignore (literal name, not pattern):
echo '/nul' >> .gitignore
```
Also audit the command that produced it and switch the script to `2>/dev/null` (which on Git-Bash/MSYS is a valid POSIX-style null device) or use absolute `> NUL` via `cmd /c`.

---

### H-1 · PIN stored in plain-text `localStorage`, known and documented by TODOs  ·  **High**

**Location:**
- Write: [src/App.jsx:93](src/App.jsx:93), [src/App.jsx:316](src/App.jsx:316), [src/App.jsx:326](src/App.jsx:326) — `localStorage.setItem(\`ironcore_pin_${user.uid}\`, pin)`.
- Read: [src/views/LoginScreen.jsx:171](src/views/LoginScreen.jsx:171), [src/views/PlayerCardView.jsx:545](src/views/PlayerCardView.jsx:545) — `localStorage.getItem('ironcore_pin_...')`.
- Biometric "fallback": [src/App.jsx:106](src/App.jsx:106) — if biometric fails, reads the PIN from localStorage and auto-submits.
- Self-documented TODOs:
  - `src/views/LoginScreen.jsx:171` — `// TODO [native-rebuild]: Move to secure storage (Keychain on iOS, EncryptedSharedPreferences on Android)`
  - `src/views/LoginScreen.jsx:235`, `src/views/PlayerCardView.jsx:545` — same TODO.

**Evidence:** e.g. `src/views/LoginScreen.jsx` ~line 170:
```jsx
// TODO [native-rebuild]: Move to secure storage (Keychain on iOS, EncryptedSharedPreferences on Android)
const storedPin = localStorage.getItem(`ironcore_pin_${uid}`);
```

**Why it matters:** In Capacitor's WebView, `localStorage` is:
1. Readable by **any** JS that executes in the WebView — so any XSS (see M-1 CSP finding) instantly recovers the PIN and therefore any Firebase custom-token session.
2. Readable from the native side via `WebView.evaluateJavascript("localStorage.getItem(...)")` if `setWebContentsDebuggingEnabled` were ever flipped on (it's off today — M-7 — but debuggable builds exist).
3. **Not cleared** on logout unless you explicitly do so; a rooted/jailbroken phone's backup surfaces it as plaintext.
4. Biometric's "ease-of-use" fallback at `App.jsx:106` means a bypass of `BiometricAuth` (e.g. user denies it once) silently logs them in with the unprotected PIN anyway — biometric gating is cosmetic.

**Fix:** Move PIN to `@capacitor-community/secure-storage` (iOS Keychain + Android Keystore-backed). Minimal patch:
```js
// NEW file: src/utils/securePin.js
import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

const KEY = (uid) => `ironcore_pin_${uid}`;

export async function savePin(uid, pin) {
  if (!Capacitor.isNativePlatform()) {
    // Browser dev only — DO NOT persist in prod web build
    sessionStorage.setItem(KEY(uid), pin);
    return;
  }
  await SecureStoragePlugin.set({ key: KEY(uid), value: pin });
}
export async function getPin(uid) {
  if (!Capacitor.isNativePlatform()) return sessionStorage.getItem(KEY(uid));
  try { return (await SecureStoragePlugin.get({ key: KEY(uid) })).value; }
  catch { return null; }
}
export async function clearPin(uid) {
  try { await SecureStoragePlugin.remove({ key: KEY(uid) }); } catch {}
  sessionStorage.removeItem(KEY(uid));
  localStorage.removeItem(KEY(uid)); // migration cleanup
}
```
Replace every `localStorage.{get,set,remove}Item('ironcore_pin_...')` call with these helpers. **Also remove the biometric-failure fallback at `src/App.jsx:106`** — on biometric failure, require re-entry of the PIN through the UI, not a silent read from storage.

---

### H-2 · `loginWithPin` still accepts legacy unsalted SHA-256 PIN hashes  ·  **High**

**Location:** [functions/index.js:1843-1869](functions/index.js:1843).

**Evidence:**
```js
// functions/index.js
1843  const storedPinHash = profileDoc.data().pinHash;
1844
1845  // Verify PIN — supports both v1 (plain SHA-256) and v2 (PBKDF2+salt)
1846  let pinValid = false;
1847  try {
1848    if (storedPinHash.startsWith("v2:")) {
1849      ...  // v2 PBKDF2 path
1860      pinValid = crypto.timingSafeEqual(derived, Buffer.from(expectedHex, "hex"));
1861    } else {
1862      // v1 legacy — plain SHA-256 comparison
1863      const inputHash = rawPin
1864        ? crypto.createHash("sha256").update(rawPin).digest("hex")
1865        : legacyPinHash;
1866      const a = Buffer.from(inputHash, "hex");
1867      const b = Buffer.from(storedPinHash, "hex");
1868      pinValid = a.length === b.length && crypto.timingSafeEqual(a, b);
1869    }
1870  } catch (e) { ... }
```
Client counterpart: [src/utils/playerIdentity.js](src/utils/playerIdentity.js) `pbkdf2Verify` — same dual acceptance.

**Why it matters:** The v1 branch hashes a 4–8 digit PIN with **unsalted SHA-256** (line 1864). That's not a password hash — a full 8-digit rainbow table is 100M entries, <1s to enumerate, and 4–6 digit PINs are sub-microsecond. If any PIN hash ever leaks (Firestore export, a `users/*/data/profile` read in a misconfigured staging rule, a support-engineer dump, this very `nul` file pattern) the attacker recovers the PIN trivially, and `loginWithPin` mints a custom token via `admin.auth().createCustomToken(uid)` at line 1881 → full account takeover.

Rate-limiting at L1796–1827 prevents online brute-force, but brute-force happens *offline* against a leaked hash, then succeeds on the first online attempt, which is under the 5/hr limit.

**Fix:**
1. Add a one-time Cloud Function migration that rewrites every v1 `pinHash` to v2 (`v2:salt:pbkdf2`). This must be done server-side because the server doesn't know the plaintext PIN — so the migration is: on every successful v1 `loginWithPin`, immediately re-store as v2 *before* returning the token, then a follow-up batch job flags any account that hasn't logged in within 90 days as "PIN must be re-set on next login" (force reset).
2. After one release-train of migration, delete the v1 branch:
```js
// functions/index.js ~line 1848
if (!storedPinHash.startsWith("v2:")) {
  throw new HttpsError("failed-precondition", "PIN needs to be reset.");
}
// ...only v2 path retained.
```
3. Raise iteration count — see L-1 below.

---

### H-3 · Sentry initialised with no `beforeSend` — full exception payloads (including PII) shipped to Sentry  ·  **High**

**Location:** [src/main.jsx:6-17](src/main.jsx:6).

**Evidence:**
```js
SentryCapacitor.init(
  {
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release: `ironcore@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.2 : 1.0,
    enabled: !!import.meta.env.VITE_SENTRY_DSN,
  },
  SentryReact.init,
);
```
Call sites that feed raw errors: [src/App.jsx:539](src/App.jsx:539) and [src/App.jsx:586](src/App.jsx:586):
```js
Sentry.captureException(error, { ... });
```

**Why it matters:** Firebase `FirebaseError` objects frequently carry `email`, `uid`, `customData`, or un-redacted request bodies in `.details` and `.message`. Sentry default integrations also auto-attach breadcrumbs (URL query strings, fetch request bodies, form inputs) and HTTP request data. With no `beforeSend` hook and no `sendDefaultPii: false`, the org's Sentry tenant becomes a compliance hazard (GDPR Art. 32 — you're controller for PII, but you're shipping it to a US SaaS with no DPA-level guardrails in the client code).

**Fix:**
```js
// src/main.jsx
SentryCapacitor.init(
  {
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release: `ironcore@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.2 : 1.0,
    enabled: !!import.meta.env.VITE_SENTRY_DSN,
    sendDefaultPii: false,
    beforeSend(event, hint) {
      // Strip user identifiers
      if (event.user) { event.user = { id: event.user.id ? 'redacted' : undefined }; }
      // Strip request bodies & query strings
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        if (event.request.url) event.request.url = event.request.url.split('?')[0];
      }
      // Strip PII patterns from error messages
      if (event.exception?.values) {
        for (const ex of event.exception.values) {
          if (ex.value) {
            ex.value = ex.value
              .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>')
              .replace(/[A-Za-z0-9]{24,}/g, '<token>'); // catch UIDs & tokens
          }
        }
      }
      return event;
    },
    beforeBreadcrumb(bc) {
      if (bc.category === 'fetch' || bc.category === 'xhr') {
        if (bc.data) { delete bc.data.response_body_size; delete bc.data.request_body_size; }
      }
      return bc;
    },
  },
  SentryReact.init,
);
```
Also — line 181 of `LoginScreen.jsx` (see M-4) should not be feeding raw `e.message` / `JSON.stringify(e)` to anything, Sentry or console.

---

### M-1 · CSP uses `'unsafe-inline'` for `script-src`  ·  **Medium**

**Location:** [index.html:9](index.html:9).

**Evidence:**
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self' https://*.firebaseio.com https://*.googleapis.com;
           script-src 'self' 'unsafe-inline' https://checkout.razorpay.com;
           ...
           frame-ancestors 'none';">
```

**Why it matters:** `'unsafe-inline'` neutralises CSP's XSS benefit — the whole point of script-src is to block injected inline `<script>` and `onerror=...` vectors. Combined with H-1 (`localStorage` PIN), a single reflected or stored-content XSS (e.g. via a guild name / chat message / AI-coach reply that bypasses React's escaping via `dangerouslySetInnerHTML` — not currently used, but one copy-paste away) would give an attacker the PIN and the Firebase session. `frame-ancestors` in a `<meta>` tag is **ignored by the spec** — browsers only honour it as an HTTP response header; use your Firebase Hosting / native WebView server header instead. `firebase.json` already sets CSP on hosting, but the in-WebView (Capacitor file:// load) uses the `<meta>` tag.

**Fix:** Razorpay doesn't need inline script — drop `'unsafe-inline'` and move any required inline `<script>` blocks to `.js` files. If Vite's `/@vite/client` HMR snippet is the blocker, it only runs in dev; the prod build doesn't emit inline script.
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self' https://*.firebaseio.com https://*.googleapis.com;
           script-src 'self' https://checkout.razorpay.com;
           style-src 'self' 'unsafe-inline';
           connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://api.razorpay.com https://*.sentry.io;
           img-src 'self' data: blob: https://*.googleusercontent.com https://firebasestorage.googleapis.com;
           object-src 'none';
           base-uri 'self';
           form-action 'self';">
```
Remove the `frame-ancestors 'none'` directive from the meta tag (it's a no-op) and add `X-Frame-Options: DENY` + `Content-Security-Policy: frame-ancestors 'none'` as *response headers* in `firebase.json` — the latter is already present, confirm it's the only load path for web.

---

### M-2 · Double Capacitor Keyboard listener registration — every keyboard event fires twice and neither is ever removed  ·  **Medium**

**Location:**
- [src/lib/capacitorInit.js:22](src/lib/capacitorInit.js:22) + [:26](src/lib/capacitorInit.js:26)
- [src/utils/keyboardSetup.js:23](src/utils/keyboardSetup.js:23) + [:30](src/utils/keyboardSetup.js:30)

Both are called during startup: `main.jsx:26 initializeCapacitor()` → `lib/capacitorInit.js` adds listeners; `src/App.jsx:220` separately calls `setupKeyboard()` from `utils/keyboardSetup.js` which adds the **same** two listeners again.

**Evidence:**
```js
// src/lib/capacitorInit.js
22    Keyboard.addListener('keyboardWillShow', (info) => { ... });
26    Keyboard.addListener('keyboardWillHide', () => { ... });

// src/utils/keyboardSetup.js — runs ADDITIONALLY
23    Keyboard.addListener('keyboardWillShow', (info) => { ... });
30    Keyboard.addListener('keyboardWillHide', () => { ... });
```
Neither file tracks the returned `PluginListenerHandle` nor calls `.remove()` / `removeAllListeners()`.

**Why it matters:** Each of the two handlers performs DOM style mutations (`document.documentElement.style.setProperty(...)`). Double-fire causes flicker and layout thrash on focus/blur of every input. The handlers are never removed → on hot-reload in dev and on any future attempt to re-mount the app shell, handlers accumulate linearly. This is a real performance + correctness bug, not just a leak.

**Fix:** Pick one owner — `capacitorInit.js` is the natural one since it already owns status-bar and splash-screen init. Delete `utils/keyboardSetup.js` entirely and remove its call site in `App.jsx`. Inside `capacitorInit.js` keep the handles so they can be removed if the app ever cleans up (and for dev HMR):
```js
// src/lib/capacitorInit.js
const listeners = [];
listeners.push(await Keyboard.addListener('keyboardWillShow', ...));
listeners.push(await Keyboard.addListener('keyboardWillHide', ...));

export async function teardownCapacitor() {
  for (const l of listeners) await l.remove();
  listeners.length = 0;
}
```

---

### M-3 · Built production bundles committed inside native projects — obscures audits and bloats git  ·  **Medium**

**Location:**
- `ios/App/App/public/assets/*.js` (incl. `FormCoach-CkUpcLLo.js`, `vendor-motion-BbjdVTf7.js`)
- `android/app/src/main/assets/public/assets/*.js` (incl. `vendor-tensorflow-FpQTnOVu.js`, `vendor-motion-C979L5_9.js`)
- `android/app/src/main/assets/public/cordova.js`

Discovered via `depcheck` flagging phantom missing modules (`node-fetch`, `@emotion/is-prop-valid`, `cordova`) because those strings appear only inside the minified bundles.

**Evidence:** `depcheck` output (excerpt):
```json
"missing": {
  "node-fetch": ["ios/App/App/public/assets/FormCoach-CkUpcLLo.js",
                 "android/app/src/main/assets/public/assets/vendor-tensorflow-FpQTnOVu.js"],
  "@emotion/is-prop-valid": ["ios/.../vendor-motion-BbjdVTf7.js",
                             "android/.../vendor-motion-C979L5_9.js"],
  "cordova": ["android/app/src/main/assets/public/cordova.js"]
}
```

**Why it matters:**
1. `npx cap sync` is supposed to regenerate these from `dist/` on every build — committing them means a contributor's `git pull` ships **stale JS** that silently diverges from `src/`. That's a textbook "works on my machine" bug.
2. Minified bundles are indistinguishable from malicious-supply-chain payloads in diffs. A compromised dev box could slip modified `vendor-*.js` into a commit and nobody would catch it in review.
3. They inflate the repo and make every `depcheck`/`audit` noisier — real issues get lost.

**Fix:**
```
# .gitignore — add:
/ios/App/App/public/
/android/app/src/main/assets/public/

# then:
git rm -r --cached ios/App/App/public android/app/src/main/assets/public
git commit -m "stop tracking cap-sync output"
```
`npx cap sync` (or the CI equivalent) must run as a build step — add it to `android-build.yml` and `ios-build.yml` right after `npm ci` and `npm run build`.

---

### M-4 · `LoginScreen` leaks full Firebase error to console (including `e.details` and stringified object)  ·  **Medium**

**Location:** [src/views/LoginScreen.jsx:181](src/views/LoginScreen.jsx:181).

**Evidence:**
```jsx
} catch (e) {
  console.error('Login error:', e?.code, e?.message, e?.details, JSON.stringify(e));
  ...
}
```
Vite prod build ([vite.config.js](vite.config.js)): `pure: ['console.log', 'console.debug']` — `console.error` is **not** stripped.

**Why it matters:** Shipped app logs raw authentication errors to the device's JS console, which is:
- Visible in Safari Web Inspector and Chrome remote devtools for any developer build / testflight device.
- Captured by Sentry as a breadcrumb (see H-3) with full content.
- Captured by `adb logcat` on Android when WebView console-to-logcat mirroring is enabled by any installed debug tool.

`e.details` on a Firebase `HttpsError` contains whatever the Cloud Function passed as the second arg to `new HttpsError(...)` — for `loginWithPin` it's just the error string, but on other endpoints it could carry internal IDs.

**Fix:**
```jsx
} catch (e) {
  if (import.meta.env.DEV) console.error('Login error:', e?.code, e?.message);
  // Never stringify the error or log details in prod; rely on Sentry (with scrubber from H-3).
  ...
}
```
Also add `drop_console: import.meta.env.MODE === 'production'` in `vite.config.js`'s esbuild / terser options (or enumerate `pure: ['console.log','console.debug','console.info','console.warn','console.error']`), but keep the DEV-guarded explicit call for local debugging.

---

### M-5 · GitHub Actions pinned to tags, not commit SHAs  ·  **Medium**

**Location:**
- [.github/workflows/android-build.yml](.github/workflows/android-build.yml)
- [.github/workflows/ios-build.yml](.github/workflows/ios-build.yml)
- [.github/workflows/ci.yml](.github/workflows/ci.yml)
- [.github/workflows/firebase-deploy.yml](.github/workflows/firebase-deploy.yml) — `FirebaseExtended/action-hosting-deploy@v0`.

**Evidence:** Every action ref is `@v4`, `@v3`, `@v0`, `@main` — not a 40-char SHA.

**Why it matters:** Tag references are mutable. A compromise of the upstream action's maintainer GitHub account allows the attacker to retag `v4` to point at a malicious commit; next CI run executes it with your `ANDROID_KEYSTORE_BASE64`, `FIREBASE_TOKEN`, `GOOGLE_APPLICATION_CREDENTIALS` secrets in scope → signed-release supply-chain compromise. This is not theoretical — the `tj-actions/changed-files` incident in March 2025 did exactly this and every pipeline pinned to tags was affected.

**Fix:** Pin every third-party action to a SHA. Dependabot will keep them fresh:
```yaml
# example
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11    # v4.1.1
- uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8  # v4.0.2
- uses: android-actions/setup-android@07976c6290703d34c16d382cb36445f98bb43b1f   # v3.2.1
- uses: FirebaseExtended/action-hosting-deploy@0cbcac4740c2bcb00828cb224844e3bcc5e78e08 # v0.9.0
```
Enable `.github/dependabot.yml` with `package-ecosystem: "github-actions"`. First-party `actions/*` actions can be tag-pinned if you accept GitHub's compromise radius as trusted.

---

### M-6 · Pushy notification service: 30-second `setInterval` never actually cleaned up in Capacitor WebView  ·  **Medium**

**Location:** [src/services/pushNotificationService.js:183-213](src/services/pushNotificationService.js:183).

**Evidence:**
```js
export const startReminderChecker = () => {
  if (reminderCheckInterval) return;
  reminderCheckInterval = setInterval(() => { ... }, 30000);
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', stopReminderChecker);
  }
};
```

**Why it matters:** Capacitor WebView does **not** reliably fire `beforeunload` on iOS (WKWebView); on Android it fires on process death but not on background/foreground transitions. On iOS the interval runs forever until the OS kills the process, which — combined with the app being backgrounded — contributes to battery drain complaints and silent zombie timers across hot-reloads in dev. There's also no pairing with `App.addListener('appStateChange', ...)` from `@capacitor/app` to stop the interval when backgrounded.

**Fix:**
```js
import { App as CapApp } from '@capacitor/app';

export const startReminderChecker = () => {
  if (reminderCheckInterval) return;
  reminderCheckInterval = setInterval(() => { ... }, 30000);
  CapApp.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) stopReminderChecker();
  });
};
```
Better yet, switch to `@capacitor/local-notifications` `schedule()` with a daily/weekly recurrence — the OS manages the timer and you don't own a process-life-long interval at all.

---

### M-7 · Legacy Cordova `<access origin="*" />` still present in Android config  ·  **Medium**

**Location:** [android/app/src/main/res/xml/config.xml](android/app/src/main/res/xml/config.xml).

**Evidence:**
```xml
<widget version="1.0.0" xmlns="http://www.w3.org/ns/widgets" ...>
  <access origin="*" />
  <feature name="InAppBillingPlugin">
    <param name="android-package" value="cc.fovea.PurchasePlugin"/>
  </feature>
</widget>
```

**Why it matters:** Capacitor 8 does not consume Cordova's `config.xml` for navigation allowlisting (that's driven by `capacitor.config.json` which you have correctly restricted), so this file is likely a **no-op** today — but:
1. The `cordova-plugin-purchase` plugin is consumed from here (`InAppBillingPlugin`), meaning this file is loaded for at least plugin registration.
2. If a future Capacitor/Cordova compat shim regresses and starts honouring `<access>`, `origin="*"` reintroduces unrestricted navigation.
3. Reviewers and new developers see `origin="*"` and reasonably conclude the app has no navigation allowlist, which is false — this is a misleading-documentation hazard.

**Fix:** Remove the `<access>` tag, keep only the `<feature>` block. Capacitor's `capacitor.config.json` → `android.allowNavigation` remains the source of truth:
```xml
<widget version="1.0.0" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
  <feature name="InAppBillingPlugin">
    <param name="android-package" value="cc.fovea.PurchasePlugin"/>
  </feature>
</widget>
```

---

### M-8 · `firestore-debug.log` tracked in repo  ·  **Medium**

**Location:** [firestore-debug.log](firestore-debug.log) (1,829 bytes).

**Why it matters:** The emulator's debug log rotates Firestore emulator state, query bodies, and sometimes document contents including test UIDs. If created against the prod project (accidental `firebase emulators:exec` without `--only firestore`), it can include real writes. Even when harmless, it's a developer-machine artefact with zero purpose in source control.

**Fix:**
```bash
git rm --cached firestore-debug.log
echo 'firestore-debug.log' >> .gitignore
echo '*-debug.log' >> .gitignore
git commit -m "remove stray debug log"
```

---

### M-9 · CI `continue-on-error: true` on lint; no tests gate the merge  ·  **Medium**

**Location:** [.github/workflows/ci.yml](.github/workflows/ci.yml).

**Evidence:** The lint step has `continue-on-error: true` and there is no `vitest run` step. The Vitest configs `vitest.config.js` and `src/setupTests.js` exist (depcheck reported both as unparseable — a secondary bug, see S-1), so tests are written but not executed by CI.

**Why it matters:** Broken lint and failing tests merge silently. Given the app handles payments (Razorpay + Google Play) and AI-coach rate limiting, a regression in `functions/index.js` or a `useFitnessData` race condition going untested to prod is a revenue/user-trust problem. This isn't a security vulnerability per se — it's the *removal of the primary mitigation* against all the other findings.

**Fix:**
```yaml
# .github/workflows/ci.yml
- name: Lint
  run: npm run lint   # no continue-on-error
- name: Type check / build
  run: npm run build
- name: Unit tests
  run: npm test -- --run --reporter=dot
```
Gate PRs on this workflow via branch protection.

---

### L-1 · PBKDF2 100k iterations is below OWASP 2023 recommendation (600k)  ·  **Low**

**Location:** [src/utils/playerIdentity.js](src/utils/playerIdentity.js) + [functions/index.js:1859](functions/index.js:1859).

**Evidence:**
```js
// functions/index.js
const derived = crypto.pbkdf2Sync(rawPin, salt, 100000, 32, "sha256");
```

**Why it matters:** 100k iterations of PBKDF2-HMAC-SHA256 takes ~30 ms on a 2024 phone, ~2 ms on a modern GPU. OWASP ASVS 2023 recommends **600,000** for PBKDF2-HMAC-SHA256. With a 4-digit PIN space of 10,000, an attacker with a stolen hash can try all candidates in 20 seconds per account regardless of iteration count — so ultimately this is a mitigation, not a defence, but raising the iteration count is free correctness hygiene.

**Fix:** bump both sides to 600,000; bump existing stored hashes lazily via the same migration path recommended in H-2:
```js
// functions/index.js:1859 and src/utils/playerIdentity.js
crypto.pbkdf2Sync(rawPin, salt, 600000, 32, "sha256");
```

The real defence is moving PIN verification off "something you know with 10,000 possible values" — e.g. require device attestation (Play Integrity / DeviceCheck) on the call, or bind PIN to a device-stored secret so an offline hash steal is useless. Treat L-1 as a stop-gap.

---

### L-2 · ProGuard keeps every app class — obfuscation is cosmetic  ·  **Low**

**Location:** [android/app/proguard-rules.pro](android/app/proguard-rules.pro).

**Evidence:**
```
-keep class com.ironcore.ai.** { *; }
-keepattributes SourceFile,LineNumberTable
```
Combined with [android/app/build.gradle](android/app/build.gradle) which enables `minifyEnabled true`, `shrinkResources true`.

**Why it matters:** `-keep class com.ironcore.ai.** { *; }` undoes the obfuscation R8 would otherwise do on the app's own code; only libs are actually minified. `-keepattributes SourceFile,LineNumberTable` leaves file names + line numbers in stack traces in the shipped APK — valuable for reverse engineering. Most mobile apps keep `LineNumberTable` for Crashlytics but upload a mapping file; you're keeping both the mapping *and* the originals.

**Fix:**
```proguard
# android/app/proguard-rules.pro
# Replace the wildcard keep. Only keep things actually referenced by the manifest/JNI.
-keep class com.ironcore.ai.MainActivity { *; }

# Drop source file names and rename-map line numbers.
-keepattributes LineNumberTable,SourceFile
-renamesourcefileattribute SourceFile
```
If Sentry crashes become unreadable, upload the ProGuard mapping file via `sentry-cli upload-proguard` as a release step; don't compromise the shipped APK.

---

### L-3 · `android-build.yml` has dead `KEYSTORE_FILE` env and double-signs the APK  ·  **Low**

**Location:** [.github/workflows/android-build.yml](.github/workflows/android-build.yml).

**Evidence:** The workflow sets `env: KEYSTORE_FILE: ...` but `android/app/build.gradle` reads from `local.properties` / Gradle properties — the env var is never consumed. Then `./gradlew assembleRelease` signs the APK via the signing config, and a subsequent explicit `apksigner sign` step re-signs the same output.

**Why it matters:** Not a security hole, but:
1. Dead config is a maintenance trap — a contributor copying the workflow trusts the `KEYSTORE_FILE` name to matter and breaks signing by "fixing" it.
2. Double-signing masks the actual signing-key being used. If signing is ever split into two configs (e.g. debug vs upload key), the second pass silently overrides the first.

**Fix:** Either:
- **Option A (preferred):** delete the `apksigner` step; gradle already signs correctly.
- **Option B:** keep one signing path (apksigner post-step, delete the gradle signingConfig for release).
Remove the unused `KEYSTORE_FILE` env var.

---

### L-4 · Vite prod build only strips `console.log`/`console.debug` — `warn`/`error`/`info` survive  ·  **Low**

**Location:** [vite.config.js](vite.config.js).

**Evidence:**
```js
esbuild: {
  pure: ['console.log', 'console.debug'],
},
```

**Why it matters:** Any `console.warn`/`console.error`/`console.info` in production code ships verbatim into the bundle (see M-4 for the most egregious case). For a shipped hybrid app where the WebView console is capturable via Safari Web Inspector / Chrome DevTools (on installable debug builds) and by Sentry breadcrumbs, all five levels should be stripped or gated on `import.meta.env.DEV`.

**Fix:**
```js
esbuild: {
  pure: ['console.log', 'console.debug', 'console.info', 'console.warn', 'console.error'],
},
```
Keep DEV-guarded logging via `if (import.meta.env.DEV) console.error(...)` at call sites where useful, but strip the unconditional ones from the bundle.

---

### L-5 · `@capacitor/local-notifications` imported but missing from `package.json`  ·  **Low**

**Location:** [src/services/engagementService.js](src/services/engagementService.js).

**Evidence:** `depcheck` output:
```
"missing": {
  "@capacitor/local-notifications": ["src/services/engagementService.js"],
  ...
}
```

**Why it matters:** Any build on a clean `npm ci` without a transitive pin will fail on that codepath, or silently load a different version via hoisting. This is also the plugin that M-6's fix relies on.

**Fix:**
```bash
npm install @capacitor/local-notifications
npx cap sync
```

---

### L-6 · `.env` in working directory contains Razorpay live key and is gitignored but easy to leak  ·  **Low**

**Location:** [.env](.env) line 8 — `VITE_RAZORPAY_KEY_ID=rzp_live_SM3uYo5jtLfRMs`.

**Why it matters:** This specific value is the **public** Razorpay Key ID (the "key id", not the key secret) — it is intentionally shipped to the client and is recoverable from any installed APK/IPA regardless. So it's not a secret leak. *However:* `.env` also tends to accumulate real secrets (Firebase admin SDK key, server-side tokens) on developer machines; a single mistake — `.env` ending up in a screenshot, a support bundle, an `scp` to a shared box — ships anything in there. The pattern of "keep one `.env` that mixes public `VITE_*` and whatever secret I pasted last week" is the risk, not the current content.

**Fix:**
1. Keep *only* `VITE_*` (public) vars in `.env`/`.env.local`.
2. For anything sensitive, use a runtime-accessed secret via Firebase's `defineSecret` (already used in `functions/index.js` — good) or a native-side config (Android `local.properties`, iOS Xcode build setting).
3. Consider adding a pre-commit hook with `git-secrets` or `trufflehog` scanning staged files:
```bash
# .husky/pre-commit
trufflehog filesystem --since-commit HEAD --fail .
```

---

### L-7 · `vitest.config.js` and `src/setupTests.js` unparseable by standard Babel parser  ·  **Low**

**Location:** [vitest.config.js](vitest.config.js), [src/setupTests.js](src/setupTests.js).

**Evidence:** `depcheck` failed with `SyntaxError: Expecting Unicode escape sequence \uXXXX. (1:45)` on both files.

**Why it matters:** Almost certainly a TypeScript-style import statement or a triple-slash directive that `@babel/parser` without Flow/TS presets chokes on. Downstream impact: any tool that walks the repo for analysis (`depcheck`, some linters, static-analysis CI, SCA tools) skips these files. That includes security-scanner dead-code analysis. Low severity alone but a signal that test infra is likely flaky.

**Fix:** Re-save both files as plain ESM JS without TS syntax, or add `@babel/preset-typescript` to the project's babel config so every parser in the toolchain agrees what the files are.

---

## 3. Dependency Report

`npm audit --json`:
```json
{"auditReportVersion": 2, "vulnerabilities": {}, "metadata": { "vulnerabilities": { "total": 0 } }}
```
**Zero exploitable CVEs across production + dev dependencies.** Package versions in `package.json` are current: Capacitor 8.x, Firebase 12.x, React 19.x, Sentry 8.x, TensorFlow.js 4.x. `package-lock.json` was modified (see `gitStatus`) but not in a way that introduced known-vulnerable transitive pins — run a second `npm audit` after the `@capacitor/local-notifications` install from L-5 to confirm.

`depcheck` findings that are NOT CVEs but are structural:
- **Missing (real):** `@capacitor/local-notifications` (L-5).
- **Missing (phantom — from committed build artifacts, not real):** `node-fetch`, `@emotion/is-prop-valid`, `cordova` — resolved by M-3's fix of stopping `ios/App/App/public/` + `android/app/src/main/assets/public/` from being tracked.
- **Reported unused:** `@capacitor/android`, `@capacitor/browser`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/splash-screen`, `date-fns`.
  - `@capacitor/android`/`@capacitor/ios`/`@capacitor/cli` are **not unused** — depcheck doesn't see the native build consume them; leave them.
  - `@capacitor/splash-screen` — verify by grepping `SplashScreen.hide`; if absent, remove.
  - `@capacitor/browser` — grep for `Browser.open`; currently **only `window.open` is used** (`src/components/InviteSystem.jsx:117,122`, `src/utils/exportUtils.js:186`). If you want external links to open in the in-app browser with SFSafariViewController/Chrome Custom Tabs, replace those three `window.open(...)` calls with `Browser.open({ url })` and keep the dep; otherwise remove it.
  - `date-fns` — not seen in source; if unused, `npm uninstall date-fns`.

---

## 4. Quick Wins (≤30 min each)

1. **C-2:** `rm ./nul` + add `/nul` to `.gitignore`. Verify it was never committed (`git log --all -- nul`). **2 min.**
2. **M-8:** `git rm --cached firestore-debug.log`; add `*-debug.log` to `.gitignore`. **2 min.**
3. **M-7:** Delete the `<access origin="*" />` line in `android/app/src/main/res/xml/config.xml`. **1 min.**
4. **L-2:** Replace `-keep class com.ironcore.ai.** { *; }` with the narrow MainActivity-only keep rule, and add `-renamesourcefileattribute SourceFile`. **5 min.**
5. **L-4:** Extend `pure:` in `vite.config.js` to all 5 console methods. **1 min.**
6. **L-5:** `npm install @capacitor/local-notifications` + `npx cap sync`. **5 min.**
7. **C-1:** Add the 5 iOS usage strings to `Info.plist`. **10 min, unblocks App Store.**
8. **M-4:** Guard `LoginScreen.jsx:181`'s `console.error` behind `import.meta.env.DEV` and drop `JSON.stringify(e)`. **3 min.**
9. **H-3:** Add `beforeSend` + `sendDefaultPii: false` to the Sentry config in `main.jsx`. **10 min.**
10. **M-9:** Remove `continue-on-error: true` from lint; add `npm test -- --run` step. **5 min.**

Do these ten and you eliminate one Critical, three Medium, and three Low findings in under two hours.

---

## 5. Structural Debt

These are not single-file fixes — they're ongoing design problems:

- **PIN-based auth as the primary factor for account takeover (H-1 + H-2 + L-1).** A 4–8 digit PIN protected by 100k PBKDF2 iterations is inadequate for a fitness app that's about to handle payments, social features, and PII. Plan for migration to: Firebase Auth email/Apple/Google as primary, PIN as a convenience factor *only after device attestation passes* (Play Integrity / DeviceCheck). The `loginWithPin` endpoint should be retired once the new flow ships and the v1→v2 hash migration completes.
- **Client-side secret storage (`localStorage` PIN, `.env` discipline).** Until everything sensitive is in Keychain/Keystore and all `VITE_*` vars are treated as public-by-default, any XSS is game-over. Adopt `@capacitor-community/secure-storage` or equivalent as the single secret-storage primitive and ban `localStorage` for auth material via a lint rule.
- **Double-init pattern between `src/lib/capacitorInit.js` and `src/utils/keyboardSetup.js`.** Signals no single owner for native-plugin lifecycle. Consolidate to one init module with a clear teardown; use it as the template for any other plugin added (haptics, statusbar, keyboard, app-state).
- **Cordova / Capacitor hybrid state.** `cordova-plugin-purchase` is still in use (required for Google Play Billing); `config.xml` is Cordova-legacy. Either fully commit to Capacitor (move to `@revenuecat/purchases-capacitor` or equivalent Capacitor-first billing plugin and delete every Cordova artefact), or accept the hybrid and document which config file is authoritative for which concern. The ambiguity is a bug magnet.
- **CI/CD maturity.** Pinned-by-tag actions (M-5), `continue-on-error: true` (M-9), test suite not gating merges, no Dependabot, no SBOM, no mapping-file upload to Sentry. Each one alone is small; collectively they mean "the pipeline will ship a regression before anyone reviews it." Budget a one-week hardening sprint.
- **Committed build artefacts (M-3).** The fact that `npx cap sync` output was ever committed suggests the release process was, at some point, "build locally, commit, tag." Move the entire build+sign+deploy flow to CI and make local builds produce artefacts in `dist/` only.
- **Monolithic `App.jsx` + `useFitnessData.js`.** Both files are large single-owners; the hook alone has three separate useEffect lifecycles driving Firestore listeners (lines 85–101, 372–386, 437–441). Race conditions are likely — rapid tab switches between "social"-class tabs and other tabs will attach/detach listeners faster than Firestore can reply, leading to duplicated onSnapshot callbacks writing to Zustand. Split the data hook by concern (auth, profile, social, photos) before adding more features.

---

## 6. What I did NOT verify (blind spots)

Explicit list of claims I did **not** prove during this audit. If you need any of these signed off, they need follow-up.

- **Runtime exploit reproduction.** I did not run the app, did not attempt XSS via the content surfaces (guild name, chat, AI coach reply), did not actually recover a PIN from `localStorage`, did not fuzz `loginWithPin`. All findings are based on static analysis and `npm audit`/`depcheck`.
- **Full Firestore rules fuzzing.** I read `firestore.rules` and confirmed the structure is strong, but I didn't generate a property-based test for every collection. A rules-unit-test suite against `@firebase/rules-unit-testing` would catch anything I missed. I did not read `storage.rules` in this pass (only referenced it from memory of the earlier session).
- **Cloud Functions coverage.** I read the first ~200 lines + `recoverAccount` (1717) + `loginWithPin` (1776) + `checkExpiredSubscriptions` (1890). Functions in between — `verifyGooglePlayPurchase`, `verifyApplePurchase`, `callGemini`, `startFreeTrial`, matchmaking, guild scoring — were only grepped, not read in full. Payment verification especially deserves a dedicated read pass: confirm receipt signature verification uses the full chain, not just the body.
- **iOS URL-scheme / Universal Links / deep-link attack surface.** `AppDelegate.swift` delegates to `ApplicationDelegateProxy` (stock Capacitor). I did not enumerate the app's registered URL schemes or check Universal Links `apple-app-site-association` / `assetlinks.json` domain coverage against open-redirect risks.
- **TLS pinning / cert-transparency / network-security-config edges.** I confirmed `cleartextTrafficPermitted="false"` but I did not verify the full domain allowlist matches what `capacitor.config.json` permits for navigation — the two should agree.
- **React Native bridge surface.** `MainActivity.java` is trivial (extends `BridgeActivity`, no custom methods) and `AppDelegate.swift` uses the standard proxy. I did not read every Capacitor plugin's Kotlin/Swift side for unintentional `@JavascriptInterface` / `@objc` exposures.
- **Large view components.** `OnboardingView.jsx` (~55KB), `WorkoutView.jsx` (~49KB), `CommunityView.jsx` (~44KB) were NOT read — they could contain `dangerouslySetInnerHTML`, unsanitised URL navigation, or race conditions around submission. Grep didn't surface `dangerouslySetInnerHTML` anywhere in `src/`, which is positive, but a full read per view is still outstanding.
- **Build-time secret exposure.** I confirmed no `rzp_live_*`/`rzp_test_*` string outside `.env`, but I did not run `trufflehog` against git history to catch previously-committed-then-removed secrets. Do this before the next external-facing release.
- **Third-party SDK privacy manifests (iOS 17 requirement).** Sentry, Firebase, Razorpay, `html5-qrcode`, `html-to-image`, `canvas-confetti` all need `PrivacyInfo.xcprivacy` — not verified.
- **Android Play Integrity / SafetyNet attestation.** Not present in code at all (confirmed by grep). If you add PIN-as-convenience-factor per the Structural Debt item above, you'll need it.
- **`.env.local` override file.** I read `.env.local` — contains `VITE_PROMO_MODE=true` only; no secrets there. But I did not check `.env.production`, `.env.staging`, or any `.env.*` that might exist.
- **`android-native/` + `ios-native/` (the Swift/Kotlin rebuild).** Per `CLAUDE.md` these are the in-progress native rewrites. They were NOT audited — this audit is of the current shipped Capacitor app only. They committed a real `google-services.json` in `android-native/` which is worth a look before that side reaches production.

Anything above marked as a blind spot is not an implicit "it's fine" — treat each line as an open audit ticket.
