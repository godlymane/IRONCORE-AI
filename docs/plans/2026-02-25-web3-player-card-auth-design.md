# Web3-Style Player Card Authentication Design

**Date:** 2026-02-25
**Status:** Approved
**Replaces:** Email/Password + Google Auth

## Overview

Replace traditional Firebase Email/Google Auth with a "Web3 Player Card" identity system. Users create an `@username`, receive a holographic Player Card with a QR code and 12-word recovery phrase, and authenticate via biometrics (FaceID/Fingerprint) on subsequent launches.

## Decision Log

- **No existing users** — pre-launch app, clean slate for auth migration
- **Custom IronCore wordlist** — ~300 fitness/gaming-themed words (not BIP39)
- **QR encodes recovery phrase only** — no encrypted JSON payloads
- **Biometric fallback**: 6-digit PIN (same device) + recovery phrase/QR (new device)
- **Approach: Option A** — Full Anonymous Auth + Biometrics (no email anywhere)

## Auth Flow

### First Launch (New User)

```
Splash → PlayerCardCreation → signInAnonymously() → Generate phrase
→ Write Firestore docs → PIN setup → PlayerCardReveal (save card)
→ Biometric enrollment → OnboardingView (existing) → Main App
```

### Return Visit (Same Device)

```
Splash → Check stored UID → Biometric gate
  ├── Success → Main App
  └── Fail → PIN entry
      ├── Correct → Main App
      └── Wrong 3x → Recovery phrase input
```

### Device Recovery (New Device)

```
Splash → PlayerCardCreation → "Recover Account" link
→ Type phrase OR scan QR → Cloud Function recoverAccount
→ Verify hash → createCustomToken(uid) → signInWithCustomToken()
→ Biometric + PIN setup → Main App
```

## Firestore Data Model

### users/{uid} (existing collection, new fields)

```
username: "@ironblade"          // string, the player handle
phraseHash: "a1b2c3..."        // string, SHA-256 of 12-word phrase
pinHash: "d4e5f6..."           // string, SHA-256 of 6-digit PIN
createdAt: Timestamp
biometricsEnabled: boolean
// ... all existing profile fields unchanged
```

### usernames/{username} (NEW collection — uniqueness index)

```
uid: "abc123"
createdAt: Timestamp
```

### Security Rules

```
match /usernames/{username} {
  allow read: if true;
  allow create: if request.auth != null
    && !exists(/databases/$(database)/documents/usernames/$(username));
  allow delete, update: if false;
}
```

## Cloud Function: recoverAccount

- Callable function (onCall)
- Accepts: `{ phrase: "word1 word2 ... word12" }`
- Hashes phrase: `SHA-256(phrase.toLowerCase().trim())`
- Queries `users` collection for matching `phraseHash`
- If found: `admin.auth().createCustomToken(matchedUid)` → return `{ token, username }`
- If not found: throw `HttpsError("not-found")`
- Rate limited: max 5 attempts per IP per hour (reuse existing checkRateLimit infra)

## Player Card UI (Mobile-First)

### Visual Design

- Full viewport width minus 24px padding
- Glass morphism base: backdrop-blur(20px) + semi-transparent dark bg
- Animated gradient border (red → orange → red cycling)
- CSS @keyframes holographic shimmer (no gyroscope dependency)
- IronCore logo + "PLAYER IDENTITY" header
- Large @username with glow effect
- QR code: 120x120px, white on transparent (qrcode.react)
- "Member since" date

### Recovery Phrase Display

- Below the card (not on it)
- 2 columns x 6 rows grid (mobile-optimized)
- Numbered pill-shaped chips for each word
- Copy-all button

### Interactions

- Card enters with 3D flip animation (Framer Motion)
- Phrase words stagger in (0.1s delay each)
- Full-width sticky "Save to Camera Roll" button (above safe area)
- Checkbox: "I've saved my recovery phrase" (required to proceed)

### Save to Camera Roll

1. html-to-image renders card + phrase to PNG
2. @capacitor/filesystem writes to device storage
3. @capacitor/share triggers native share sheet

## IronCore Wordlist

~300 themed words organized in categories:
- **Power**: iron, steel, forge, titan, apex, blade, thunder, storm, fury
- **Fitness**: squat, deadlift, bench, curl, press, flex, pump, grind, rep
- **Gaming**: arena, shield, quest, raid, guild, loot, boss, level, rank
- **Elements**: ember, frost, shadow, flame, spark, crystal, void, pulse, bolt

12 words randomly selected = ~2^100 entropy (more than sufficient for this use case).

## New Dependencies

| Package | Purpose | Size |
|---------|---------|------|
| qrcode.react | QR code rendering | ~15KB |
| @capacitor/filesystem | Save image to device | Capacitor plugin |
| @capacitor/share | Native share sheet | Capacitor plugin |
| @capacitor-community/biometric-auth | FaceID/Fingerprint | Capacitor plugin |
| html-to-image | Render card to PNG | ~8KB |

## Files to Create/Modify

### New Files
- `src/views/PlayerCardView.jsx` — creation + reveal screens
- `src/views/RecoveryView.jsx` — phrase/QR recovery screen
- `src/views/PinEntryView.jsx` — PIN setup and entry
- `src/utils/playerIdentity.js` — wordlist, phrase generation, hashing
- `src/utils/biometrics.js` — biometric auth wrapper
- `functions/recoverAccount.js` — Cloud Function (imported in index.js)

### Modified Files
- `src/App.jsx` — replace LoginView with PlayerCardView, add biometric gate
- `src/hooks/useFitnessData.js` — replace email/Google auth with anonymous + custom token
- `src/views/OnboardingView.jsx` — remove any auth-related steps (it's now post-identity)
- `src/views/LoginView.jsx` — DELETE (replaced entirely)
- `functions/index.js` — import and export recoverAccount
- `firestore.rules` — add usernames collection rules
- `package.json` — add new dependencies

## Security Considerations

- Phrase is NEVER stored in plaintext — only SHA-256 hash in Firestore
- PIN is client-side UX gate only — no server-side auth capability
- QR code contains plaintext phrase — user warned to keep image private
- Recovery function rate-limited to prevent brute force
- Anonymous auth UID persists across app launches (Firebase handles this natively)
- usernames collection is write-once (no updates, no deletes via security rules)
