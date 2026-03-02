# IRONCORE FIT — ANDROID/CAPACITOR PRODUCTION FIX PROMPT

You are fixing the IronCore Fit Android/Capacitor build for production release. This is a React 19 + Vite 7 + Firebase + Capacitor fitness app. Below are ALL issues found during audit, organized by priority. Fix every item.

## PROJECT CONTEXT
- Root: `C:\Users\devda\iron-ai\`
- React app: `src/`
- Cloud Functions: `functions/index.js`
- Android: `android/`
- Firebase project: `ironcore-f68c2`
- Theme: dark/red glass ("BlayzEx"), pure black background

---

## CRITICAL FIXES (do ALL of these first)

### 1. DELETE PII FILES & ADD TO .gitignore
- Delete `auth_users.json` and `nul` from project root — they contain real user data
- Add both to `.gitignore`
- Run `git rm --cached auth_users.json nul` if they're tracked

### 2. MOVE GEMINI API KEY SERVER-SIDE
- Remove `VITE_GEMINI_API_KEY` from `.env`
- Create a new Cloud Function `callGemini` in `functions/index.js` that proxies Gemini API calls
- The function should use `defineSecret("GEMINI_API_KEY")` for the key
- Update all client-side Gemini calls (in AILabView.jsx, CoachView.jsx) to call this Cloud Function instead
- The client should NEVER have the Gemini key

### 3. FIX ANDROID MANIFEST SECURITY
File: `android/app/src/main/AndroidManifest.xml`
- Change `android:allowBackup="true"` to `android:allowBackup="false"`
- Add `android:networkSecurityConfig="@xml/network_security_config"` to `<application>`
- Add `<uses-permission android:name="android.permission.VIBRATE" />` (needed for haptics)
- Create `android/app/src/main/res/xml/network_security_config.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

### 4. FIX PAYMENT VERIFICATION (CRITICAL REVENUE BUG)
File: `functions/index.js` — `verifyPayment` function (around line 394)

The function currently trusts the client-supplied `planId` to determine subscription duration. This means a user can pay for a monthly plan but send `planId: "yearly"` and get 365 days.

Fix: After verifying the Razorpay payment, look up the actual amount paid from Razorpay's API response and map it to the correct plan server-side:
```javascript
// Inside verifyPayment, AFTER signature verification succeeds:
const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
const amountPaid = payment.amount; // in paise

// Server-side plan mapping — do NOT trust client planId
let actualPlanId, durationDays;
if (amountPaid === 1299 * 100) { // ₹1299 monthly
  actualPlanId = "monthly";
  durationDays = 30;
} else if (amountPaid === 7999 * 100) { // ₹7999 yearly
  actualPlanId = "yearly";
  durationDays = 365;
} else {
  throw new functions.https.HttpsError("failed-precondition", "Unknown payment amount");
}
// Use actualPlanId and durationDays instead of client-supplied values
```

### 5. FIX APPLE JWS CERTIFICATE VERIFICATION
File: `functions/index.js` — `decodeAppleJWS` function (around lines 523-531)

The x5c certificate chain is decoded but never verified against Apple's root CA. Add verification:
```javascript
const { X509Certificate } = require("crypto");

function verifyAppleCertChain(x5cArray) {
  const certs = x5cArray.map(c => new X509Certificate(Buffer.from(c, "base64")));
  // Verify each cert is signed by the next in chain
  for (let i = 0; i < certs.length - 1; i++) {
    if (!certs[i].verify(certs[i + 1].publicKey)) {
      throw new Error("Apple certificate chain verification failed");
    }
  }
  // Verify root cert is Apple's known root
  const APPLE_ROOT_CA_G3_FINGERPRINT = "63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:BE:29:F3:3D:D0:5E:CF:4A:93:74:F5:CF:5A:D5";
  const rootFingerprint = certs[certs.length - 1].fingerprint256;
  if (rootFingerprint !== APPLE_ROOT_CA_G3_FINGERPRINT) {
    throw new Error("Apple root CA not recognized");
  }
  return certs[0]; // leaf cert
}
```

### 6. FIX DEV_FORCE_PREMIUM (REVENUE DESTROYER)
File: `src/context/PremiumContext.jsx`

Find `DEV_FORCE_PREMIUM = true` and change to:
```javascript
const DEV_FORCE_PREMIUM = false;
```
Better yet, remove the flag entirely and delete all code paths that reference it. In production, premium status should ONLY come from Firestore `users/{uid}.premium` field.

### 7. FIX arenaService.js MISSING IMPORT
File: `src/services/arenaService.js`

Add the missing import at the top:
```javascript
import { runTransaction } from "firebase/firestore";
```
Also fix the arena chat field mismatch — the service writes `message` but the UI reads `text`. Pick one and make both consistent.

### 8. FIX GUILDS.JSX HOOKS VIOLATION
File: `src/components/Arena/Guilds.jsx`

The `useEffect` is placed AFTER a conditional `return` statement. React hooks must always be called in the same order. Move the early return BELOW all hook calls:
```javascript
// BAD (current):
if (!user) return <div>Loading...</div>;
useEffect(() => { ... }, []);

// GOOD (fix):
useEffect(() => { ... }, []);
if (!user) return <div>Loading...</div>;
```

### 9. FIX CommunityView.jsx
File: `src/views/CommunityView.jsx`
- Replace `Sword` import with a valid lucide-react icon (e.g., `Swords` or `Shield`)
- Wrap all 3 async operations in try/catch blocks with user-facing error toasts

### 10. REMOVE DEV BUTTON FROM CommunityBoss.jsx
File: `src/components/Arena/CommunityBoss.jsx`
- Remove or gate the "Spawn Boss (Dev)" button behind a dev-only check:
```javascript
{import.meta.env.DEV && <button onClick={spawnBoss}>Spawn Boss (Dev)</button>}
```

### 11. FIX BATTLEPASS — CONNECT TO FIRESTORE
File: `src/views/BattlePassView.jsx`
- Remove ALL hardcoded values (currentTier=7, currentXP=340, countdown string, tier rewards)
- Fetch battle pass data from Firestore: `battlePass/{seasonId}` for season config and `users/{uid}/battlePass/{seasonId}` for player progress
- Calculate countdown from actual season end timestamp
- If no Firestore collections exist yet, create the data model:
  - `battlePass/{seasonId}`: `{ startDate, endDate, tiers: [{xpRequired, freeReward, premiumReward}] }`
  - `users/{uid}/battlePass/{seasonId}`: `{ currentTier, currentXP, claimedTiers: [] }`

### 12. FIX GUILD DASHBOARD — CONNECT TO FIRESTORE
File: `src/components/Gamification/GuildDashboard.jsx`
- Remove entire `MOCK_GUILD` constant
- Fetch real guild data from Firestore `guilds/{guildId}` collection
- Use the existing `guildService.js` for data operations

### 13. FIX DAILY CHALLENGES — PERSIST CLAIMS
File: `src/components/Gamification/DailyChallenges.jsx`
- When a user claims a challenge reward, write to Firestore: `users/{uid}/challengeClaims/{date}_{challengeId}`
- On load, check which challenges are already claimed
- Prevent double-claiming

### 14. FIX GUILD JOIN/LEAVE FIRESTORE RULES
File: `firestore.rules`
- The current rules only allow guild owners to modify guild documents
- Add rules allowing users to join/leave:
```
match /guilds/{guildId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update: if request.auth != null && (
    request.auth.uid == resource.data.ownerId ||
    // Allow joining: only adding own uid to members array
    (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['members', 'memberCount']) &&
     request.auth.uid in request.resource.data.members) ||
    // Allow leaving: only removing own uid from members array
    (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['members', 'memberCount']) &&
     !(request.auth.uid in request.resource.data.members) &&
     request.auth.uid in resource.data.members)
  );
}
```

---

## MEDIUM FIXES (do after critical)

### 15. ADD INPUT VALIDATION TO CLOUD FUNCTIONS
File: `functions/index.js`
- `analyzeFood`: Add `if (mealText && mealText.length > 2000) throw ...` and `if (imageBase64 && imageBase64.length > 10_000_000) throw ...`
- Add rate limiting to `createRazorpayOrder` (same pattern as existing rate-limited functions)
- Add rate limiting to `dealBossDamage`

### 16. FIX TIMING-SAFE SIGNATURE COMPARISON
File: `functions/index.js` — `verifyPayment`
Replace:
```javascript
if (generated_signature !== razorpay_signature) { ... }
```
With:
```javascript
const crypto = require("crypto");
if (!crypto.timingSafeEqual(Buffer.from(generated_signature), Buffer.from(razorpay_signature))) { ... }
```

### 17. ADD FUNCTION RESOURCE CONFIGS
File: `functions/index.js`
Add to each function definition:
```javascript
exports.myFunction = onCall({
  memory: "256MiB",      // or "512MiB" for AI functions
  timeoutSeconds: 60,    // or 120 for AI functions
  minInstances: 0,
  maxInstances: 100,
  ...
});
```

### 18. FIX ANDROID BUILD.GRADLE
File: `android/app/build.gradle`
- Change `targetSdkVersion 36` to `targetSdkVersion 35` (Android 15, the current stable)
- Change `versionCode 1` to use a build-time auto-incrementing strategy
- Add ABI filters to reduce APK size:
```gradle
android {
    defaultConfig {
        ndk {
            abiFilters "arm64-v8a", "armeabi-v7a"
        }
    }
}
```

### 19. ADD SENTRY CRASH REPORTING
- `npm install @sentry/capacitor @sentry/react`
- Initialize in `main.jsx`:
```javascript
import * as Sentry from "@sentry/react";
Sentry.init({ dsn: "YOUR_SENTRY_DSN", environment: "production" });
```
- Wrap App with `Sentry.ErrorBoundary`

### 20. ADD SERVER-SIDE SUBSCRIPTION EXPIRY CHECK
File: `functions/index.js`
Add a scheduled function:
```javascript
exports.checkExpiredSubscriptions = onSchedule("every 1 hours", async () => {
  const now = admin.firestore.Timestamp.now();
  const expired = await db.collection("users")
    .where("premium", "==", true)
    .where("premiumExpiry", "<=", now)
    .get();
  const batch = db.batch();
  expired.docs.forEach(doc => {
    batch.update(doc.ref, { premium: false });
  });
  await batch.commit();
});
```

### 21. ADD SECURITY HEADERS TO FIREBASE HOSTING
File: `firebase.json`
Add to hosting config:
```json
"headers": [{
  "source": "**",
  "headers": [
    { "key": "X-Frame-Options", "value": "DENY" },
    { "key": "X-Content-Type-Options", "value": "nosniff" },
    { "key": "X-XSS-Protection", "value": "1; mode=block" },
    { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
    { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.google.com;" }
  ]
}]
```

### 22. ADD MISSING FIRESTORE INDEXES
File: `firestore.indexes.json`
Add leaderboard composite indexes:
```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "league", "order": "ASCENDING" },
    { "fieldPath": "leaguePoints", "order": "DESCENDING" }
  ]
}
```

### 23. FIX REMAINING VIEW ISSUES
- `LoginScreen.jsx`: Move PIN hash from localStorage to Firestore (XSS-safe)
- `DashboardView.jsx`: Wrap all inline async onClick handlers in try/catch
- `CardioView.jsx`: Add try/catch and loading state to `logSession`
- `OnboardingView.jsx`: Move `OptionCard` component definition outside the render function
- `App.jsx`: Consider splitting the 617-line file into smaller modules

### 24. ENABLE GZIP/BROTLI COMPRESSION
File: `vite.config.js`
```javascript
import viteCompression from 'vite-plugin-compression';
// In plugins array:
viteCompression({ algorithm: 'gzip' }),
viteCompression({ algorithm: 'brotliCompress' }),
```

---

## VERIFICATION CHECKLIST
After all fixes, verify:
- [ ] `npm run build` succeeds with no warnings
- [ ] `npx cap sync android` completes
- [ ] Android Studio build succeeds
- [ ] APK runs on device — login works
- [ ] Premium features are gated (DEV_FORCE_PREMIUM is gone)
- [ ] Arena service doesn't crash (runTransaction imported)
- [ ] Guild operations work (join/leave)
- [ ] Battle pass shows real data
- [ ] No "Spawn Boss" button visible
- [ ] `auth_users.json` and `nul` are deleted
- [ ] Cloud Functions deploy without errors
- [ ] Payment flow works end-to-end (test mode)
