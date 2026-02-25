# Web3 Player Card Auth — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace email/Google auth with a Web3-style Player Card system using Firebase Anonymous Auth, biometrics, and a 12-word recovery phrase.

**Architecture:** Users create an `@username` → Firebase `signInAnonymously()` creates their UID → a 12-word phrase from a custom IronCore wordlist is generated (hashed and stored in Firestore) → a holographic Player Card with QR code is rendered → biometrics gate subsequent launches → Cloud Function `recoverAccount` handles device recovery via phrase hash matching and custom token minting.

**Tech Stack:** React 19, Framer Motion, Firebase Auth (anonymous + custom token), Firestore, Cloud Functions v2, qrcode.react, html-to-image, @capacitor/filesystem, @capacitor/share, @capacitor-community/biometric-auth

**Design Doc:** `docs/plans/2026-02-25-web3-player-card-auth-design.md`

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install frontend packages**

Run:
```bash
npm install qrcode.react html-to-image @capacitor/filesystem @capacitor/share @capacitor-community/biometric-auth
```

**Step 2: Sync Capacitor native plugins**

Run:
```bash
npx cap sync
```

**Step 3: Commit**

```bash
git add package.json package-lock.json android/ ios/
git commit -m "deps: add qrcode.react, html-to-image, biometric-auth, filesystem, share plugins"
```

---

## Task 2: Create IronCore Wordlist & Identity Utils

**Files:**
- Create: `src/utils/playerIdentity.js`

**Step 1: Write the utility module**

This file contains:
1. `IRONCORE_WORDLIST` — ~300 themed words (power, fitness, gaming, elements)
2. `generatePhrase()` — picks 12 random words using `crypto.getRandomValues()`
3. `hashPhrase(phrase)` — SHA-256 hash of normalized phrase
4. `hashPin(pin)` — SHA-256 hash of 6-digit PIN
5. `validateUsername(username)` — checks format rules

```js
// src/utils/playerIdentity.js

// ~300 IronCore-themed words for recovery phrase generation
// Categories: Power, Fitness, Gaming, Elements, Military, Animals, Tech
const IRONCORE_WORDLIST = [
  // Power (40)
  'iron', 'steel', 'forge', 'titan', 'apex', 'blade', 'thunder', 'storm',
  'fury', 'rage', 'wrath', 'valor', 'might', 'force', 'power', 'strike',
  'crush', 'smash', 'break', 'shatter', 'conquer', 'dominate', 'reign',
  'surge', 'charge', 'blast', 'impact', 'havoc', 'chaos', 'rebel',
  'savage', 'brutal', 'fierce', 'wild', 'primal', 'raw', 'core',
  'prime', 'ultra', 'omega',
  // Fitness (40)
  'squat', 'deadlift', 'bench', 'curl', 'press', 'flex', 'pump',
  'grind', 'rep', 'set', 'max', 'lift', 'pull', 'push', 'sprint',
  'endure', 'recover', 'gains', 'bulk', 'shred', 'lean', 'ripped',
  'beast', 'warrior', 'champion', 'athlete', 'legend', 'muscle',
  'sweat', 'hustle', 'drive', 'focus', 'grit', 'resolve', 'peak',
  'summit', 'climb', 'rise', 'ascend', 'evolve',
  // Gaming (40)
  'arena', 'shield', 'quest', 'raid', 'guild', 'loot', 'boss',
  'level', 'rank', 'elite', 'mythic', 'epic', 'rare', 'master',
  'rogue', 'knight', 'mage', 'scout', 'hunter', 'sniper', 'tank',
  'healer', 'spawn', 'combo', 'crit', 'dodge', 'parry', 'block',
  'counter', 'flank', 'siege', 'clash', 'duel', 'bounty', 'trophy',
  'crown', 'throne', 'castle', 'fortress', 'bastion',
  // Elements (40)
  'ember', 'frost', 'shadow', 'flame', 'spark', 'crystal', 'void',
  'pulse', 'bolt', 'flash', 'blaze', 'inferno', 'glacier', 'torrent',
  'quake', 'tremor', 'vortex', 'cyclone', 'typhoon', 'eclipse',
  'nova', 'comet', 'meteor', 'solar', 'lunar', 'astral', 'cosmic',
  'plasma', 'photon', 'neon', 'chrome', 'obsidian', 'onyx', 'cobalt',
  'titanium', 'carbon', 'granite', 'magma', 'vapor', 'aether',
  // Military (40)
  'delta', 'bravo', 'alpha', 'omega', 'sigma', 'viper', 'falcon',
  'eagle', 'hawk', 'wolf', 'cobra', 'panther', 'lion', 'bear',
  'raptor', 'phoenix', 'dragon', 'hydra', 'kraken', 'golem',
  'sentinel', 'guardian', 'warden', 'marshal', 'general', 'captain',
  'major', 'colonel', 'legion', 'brigade', 'squad', 'platoon',
  'recon', 'stealth', 'tactical', 'ballistic', 'kinetic', 'vector',
  'cipher', 'protocol',
  // Tech (40)
  'binary', 'matrix', 'nexus', 'quantum', 'neural', 'synth', 'cyber',
  'nano', 'turbo', 'nitro', 'rocket', 'missile', 'orbital', 'hyper',
  'sonic', 'warp', 'rift', 'portal', 'beacon', 'signal', 'relay',
  'anchor', 'vertex', 'prism', 'zenith', 'horizon', 'genesis',
  'catalyst', 'fusion', 'reactor', 'dynamo', 'piston', 'torque',
  'voltage', 'circuit', 'grid', 'sector', 'module', 'system', 'deploy',
  // Nature (40)
  'stone', 'river', 'mountain', 'ocean', 'desert', 'jungle', 'ridge',
  'canyon', 'cliff', 'summit', 'timber', 'cedar', 'oak', 'pine',
  'thorn', 'fang', 'claw', 'talon', 'horn', 'tusk', 'scale',
  'venom', 'sting', 'prowl', 'stalk', 'hunt', 'prey', 'pack',
  'herd', 'swarm', 'den', 'lair', 'nest', 'burrow', 'ridge',
  'peak', 'vale', 'marsh', 'dune', 'crater'
];

/**
 * Generate a 12-word recovery phrase from the IronCore wordlist.
 * Uses crypto.getRandomValues() for secure randomness.
 */
export function generatePhrase() {
  const indices = new Uint32Array(12);
  crypto.getRandomValues(indices);
  return Array.from(indices)
    .map(n => IRONCORE_WORDLIST[n % IRONCORE_WORDLIST.length])
    .join(' ');
}

/**
 * SHA-256 hash of a recovery phrase (normalized: lowercase, trimmed, single-spaced).
 */
export async function hashPhrase(phrase) {
  const normalized = phrase.toLowerCase().trim().replace(/\s+/g, ' ');
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * SHA-256 hash of a 6-digit PIN.
 */
export async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(String(pin));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate username format:
 * - 3-20 characters
 * - Only lowercase letters, numbers, underscores
 * - Must start with a letter
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') return { valid: false, error: 'Username is required' };
  const clean = username.replace(/^@/, '').toLowerCase();
  if (clean.length < 3) return { valid: false, error: 'At least 3 characters' };
  if (clean.length > 20) return { valid: false, error: 'Max 20 characters' };
  if (!/^[a-z][a-z0-9_]*$/.test(clean)) return { valid: false, error: 'Letters, numbers, underscores only. Must start with a letter.' };
  return { valid: true, clean };
}

export { IRONCORE_WORDLIST };
```

**Step 2: Commit**

```bash
git add src/utils/playerIdentity.js
git commit -m "feat: add IronCore wordlist and player identity utils (phrase gen, hashing, username validation)"
```

---

## Task 3: Create Biometrics Wrapper

**Files:**
- Create: `src/utils/biometrics.js`

**Step 1: Write the biometric auth wrapper**

This wraps `@capacitor-community/biometric-auth` with graceful fallback for web/unsupported devices.

```js
// src/utils/biometrics.js
import { Capacitor } from '@capacitor/core';

/**
 * Check if biometric auth is available on this device.
 * Returns false on web or unsupported devices.
 */
export async function isBiometricAvailable() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { BiometricAuth } = await import('@capacitor-community/biometric-auth');
    const result = await BiometricAuth.checkBiometry();
    return result.isAvailable;
  } catch {
    return false;
  }
}

/**
 * Prompt the user for biometric authentication.
 * Returns true if authenticated, false if cancelled/failed.
 */
export async function authenticateWithBiometrics(reason = 'Verify your identity') {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { BiometricAuth } = await import('@capacitor-community/biometric-auth');
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Use PIN',
      allowDeviceCredential: false,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the type of biometric available (for UI labels).
 * Returns 'faceid', 'fingerprint', or 'none'.
 */
export async function getBiometricType() {
  if (!Capacitor.isNativePlatform()) return 'none';
  try {
    const { BiometricAuth } = await import('@capacitor-community/biometric-auth');
    const result = await BiometricAuth.checkBiometry();
    if (!result.isAvailable) return 'none';
    // biometryType: 1 = touchId/fingerprint, 2 = faceId, 3 = iris
    return result.biometryType === 2 ? 'faceid' : 'fingerprint';
  } catch {
    return 'none';
  }
}
```

**Step 2: Commit**

```bash
git add src/utils/biometrics.js
git commit -m "feat: add biometric auth wrapper with graceful web fallback"
```

---

## Task 4: Update Firestore Security Rules

**Files:**
- Modify: `firestore.rules` — add `usernames` collection rules after line 147 (after the `users` match block closes)

**Step 1: Add the usernames collection rules**

Insert after the closing `}` of the `users/{userId}` match block (line 147):

```
    // ══════════════════════════════════════════════════════════════
    // USERNAME REGISTRY — Write-once uniqueness index
    // ══════════════════════════════════════════════════════════════
    // Anyone can check if a username is taken (read).
    // Only authenticated users can claim an unclaimed username (create).
    // Once claimed, a username cannot be updated or deleted.
    match /usernames/{username} {
      allow read: if true;
      allow create: if isAuth()
                    && request.resource.data.uid == request.auth.uid
                    && isValidString(request.resource.data.uid, 128);
      allow update, delete: if false;
    }
```

Note: We use `request.resource.data.uid == request.auth.uid` to prevent a user from claiming a username and assigning it to someone else's UID. The `exists()` check from the design doc is not needed because Firestore naturally prevents creating a document that already exists at the same path — the `create` rule only fires for new documents.

**Step 2: Commit**

```bash
git add firestore.rules
git commit -m "feat: add usernames collection security rules (write-once uniqueness index)"
```

---

## Task 5: Update useFitnessData.js — Replace Auth Methods

**Files:**
- Modify: `src/hooks/useFitnessData.js`

This is the most surgical task. We need to:
1. Replace imports: remove email/Google auth, add `signInAnonymously` and `signInWithCustomToken`
2. Remove `loginWithEmail`, `signUpWithEmail`, `loginWithGoogle`, `formatEmail`
3. Add `loginAnonymous()`, `recoverWithPhrase(phrase)`, `recoverWithToken(token)`
4. Update the return object

**Step 1: Update Firebase auth imports (lines 1-11)**

Replace:
```js
import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    signInWithCredential,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
```

With:
```js
import {
    signInAnonymously,
    signInWithCustomToken,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
```

**Step 2: Remove `formatEmail`, `loginWithEmail`, `signUpWithEmail`, `loginWithGoogle` (lines 92-145)**

Delete these functions entirely. Replace with:

```js
    // --- AUTH ACTIONS (Web3 Player Card) ---
    const loginAnonymous = async () => {
        try {
            const result = await signInAnonymously(firebaseAuth);
            return result.user;
        } catch (e) {
            console.error('Anonymous login error:', e);
            setError('Login Error: ' + (e.message || e.code));
            throw e;
        }
    };

    const recoverWithToken = async (token) => {
        try {
            const result = await signInWithCustomToken(firebaseAuth, token);
            return result.user;
        } catch (e) {
            console.error('Token login error:', e);
            setError('Recovery Error: ' + (e.message || e.code));
            throw e;
        }
    };
```

**Step 3: Update the return object (line 570-576)**

Replace:
```js
    return {
        login: loginWithGoogle, loginWithEmail, signUpWithEmail, logout, ...
    };
```

With:
```js
    return {
        loginAnonymous, recoverWithToken, logout, uploadProfilePic, uploadProgressPhoto,
        sendMessage, toggleFollow, sendPrivateMessage, createPost,
        buyItem, completeDailyDrop, broadcastEvent, createBattle,
        isStorageReady, updateData, deleteEntry: (col, id) => updateData('delete', col, null, id),
        refreshData, clearError
    };
```

**Step 4: Also remove the `@capacitor-firebase/authentication` import** (it was used in `loginWithGoogle` — line 129)

The dynamic `import('@capacitor-firebase/authentication')` inside `loginWithGoogle` will be deleted along with the function. No separate action needed.

**Step 5: Commit**

```bash
git add src/hooks/useFitnessData.js
git commit -m "feat: replace email/Google auth with anonymous + custom token auth in useFitnessData"
```

---

## Task 6: Create PinEntryView.jsx

**Files:**
- Create: `src/views/PinEntryView.jsx`

**Step 1: Build the PIN entry/setup component**

This component serves two modes:
- `mode="setup"` — user creates a new 6-digit PIN (with confirmation)
- `mode="verify"` — user enters their PIN to unlock the app

```jsx
// src/views/PinEntryView.jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Delete, AlertTriangle } from 'lucide-react';
import { Haptics } from '../utils/audio';

export const PinEntryView = ({ mode = 'verify', onComplete, onForgot, storedPinHash }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState(mode === 'setup' ? 'create' : 'verify'); // 'create' | 'confirm' | 'verify'
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 3;

  const handleDigit = (digit) => {
    Haptics.light();
    const current = step === 'confirm' ? confirmPin : pin;
    if (current.length >= 6) return;

    const next = current + digit;
    if (step === 'confirm') setConfirmPin(next);
    else setPin(next);

    // Auto-submit on 6 digits
    if (next.length === 6) {
      setTimeout(() => handleSubmit(next), 200);
    }
  };

  const handleDelete = () => {
    Haptics.light();
    if (step === 'confirm') setConfirmPin(prev => prev.slice(0, -1));
    else setPin(prev => prev.slice(0, -1));
  };

  const handleSubmit = async (value) => {
    const { hashPin } = await import('../utils/playerIdentity');

    if (step === 'create') {
      setStep('confirm');
      setConfirmPin('');
      return;
    }

    if (step === 'confirm') {
      if (value !== pin) {
        setError('PINs don\'t match. Try again.');
        setConfirmPin('');
        setStep('create');
        setPin('');
        return;
      }
      const hashed = await hashPin(value);
      onComplete(hashed);
      return;
    }

    // Verify mode
    const hashed = await hashPin(value);
    if (hashed === storedPinHash) {
      onComplete();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');
      Haptics.error();
      if (newAttempts >= MAX_ATTEMPTS) {
        setError('Too many attempts');
      } else {
        setError(`Wrong PIN (${MAX_ATTEMPTS - newAttempts} tries left)`);
      }
    }
  };

  const dots = step === 'confirm' ? confirmPin : pin;
  const title = step === 'create' ? 'Create Your PIN' : step === 'confirm' ? 'Confirm Your PIN' : 'Enter PIN';
  const subtitle = step === 'create' ? 'Choose a 6-digit PIN for quick access' : step === 'confirm' ? 'Enter the same PIN again' : 'Unlock IronCore';

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center w-full max-w-xs">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <ShieldCheck size={32} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{title}</h1>
        <p className="text-xs text-gray-500 mb-8">{subtitle}</p>

        {/* PIN Dots */}
        <div className="flex justify-center gap-3 mb-8">
          {[0,1,2,3,4,5].map(i => (
            <motion.div
              key={i}
              className={`w-4 h-4 rounded-full border-2 ${i < dots.length ? 'bg-red-500 border-red-500' : 'border-gray-700'}`}
              animate={i < dots.length ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.15 }}
            />
          ))}
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 flex items-center justify-center gap-2 text-red-400 text-xs">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1,2,3,4,5,6,7,8,9,null,0,'del'].map((key, i) => (
            key === null ? <div key={i} /> :
            key === 'del' ? (
              <button key={i} onClick={handleDelete} className="h-16 rounded-2xl bg-white/5 flex items-center justify-center active:bg-white/10 transition-colors">
                <Delete size={22} className="text-gray-400" />
              </button>
            ) : (
              <button key={i} onClick={() => handleDigit(String(key))} className="h-16 rounded-2xl bg-white/5 text-white text-2xl font-bold active:bg-white/10 transition-colors">
                {key}
              </button>
            )
          ))}
        </div>

        {/* Forgot PIN / Use Recovery */}
        {step === 'verify' && attempts >= MAX_ATTEMPTS && onForgot && (
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={onForgot}
            className="text-xs text-red-400 font-bold uppercase tracking-wide"
          >
            Use Recovery Phrase
          </motion.button>
        )}
      </motion.div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add src/views/PinEntryView.jsx
git commit -m "feat: add PinEntryView with setup/verify modes and 3-attempt lockout"
```

---

## Task 7: Create PlayerCardView.jsx (The Big One)

**Files:**
- Create: `src/views/PlayerCardView.jsx`

This is the largest task. It contains three internal screens:
1. **UsernameScreen** — enter/validate username
2. **PinSetupScreen** — wraps PinEntryView in setup mode
3. **CardRevealScreen** — the holographic card + phrase + save

**Step 1: Write the full PlayerCardView component**

```jsx
// src/views/PlayerCardView.jsx
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Copy, Check, Download, ChevronRight, AlertCircle, Loader2, Dumbbell } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { generatePhrase, hashPhrase, validateUsername } from '../utils/playerIdentity';
import { PinEntryView } from './PinEntryView';
import { SFX, Haptics } from '../utils/audio';

// ─── Username Creation Screen ───────────────────────────────────
const UsernameScreen = ({ onNext, onRecover }) => {
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [available, setAvailable] = useState(null);
  const debounceRef = useRef(null);

  const checkAvailability = useCallback(async (name) => {
    const { valid, clean, error: validErr } = validateUsername(name);
    if (!valid) { setError(validErr); setAvailable(null); return; }
    setChecking(true);
    setError('');
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      const snap = await getDoc(doc(db, 'usernames', clean));
      setAvailable(!snap.exists());
      if (snap.exists()) setError('Already taken');
    } catch {
      setError('Connection error');
    } finally {
      setChecking(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value.replace(/^@/, '').toLowerCase();
    setUsername(val);
    setAvailable(null);
    setError('');
    clearTimeout(debounceRef.current);
    if (val.length >= 3) {
      debounceRef.current = setTimeout(() => checkAvailability(val), 500);
    }
  };

  const handleSubmit = () => {
    if (!available || checking) return;
    Haptics.medium();
    SFX.success();
    onNext(username);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl blur-xl opacity-60" style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.8), rgba(185,28,28,0.8))', transform: 'scale(1.2)' }} />
            <div className="relative p-4 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.9), rgba(185,28,28,0.9))', boxShadow: '0 20px 60px rgba(220,38,38,0.4), inset 0 2px 0 rgba(255,255,255,0.2)' }}>
              <Dumbbell size={48} className="text-white" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-1">Choose Your Handle</h1>
        <p className="text-xs text-gray-500 mb-8">This is your identity. No email. No password. Just you.</p>

        {/* Username Input */}
        <div className="relative mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">@</span>
          <input
            type="text"
            value={username}
            onChange={handleChange}
            placeholder="username"
            maxLength={20}
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-12 text-white text-lg font-bold placeholder-gray-700 outline-none focus:border-red-500/50 focus:bg-white/10 transition-all"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {checking && <Loader2 size={18} className="text-gray-500 animate-spin" />}
            {!checking && available === true && <Check size={18} className="text-green-500" />}
            {!checking && available === false && <AlertCircle size={18} className="text-red-500" />}
          </div>
        </div>

        {error && <p className="text-xs text-red-400 mb-4">{error}</p>}
        {available && <p className="text-xs text-green-400 mb-4">@{username} is available</p>}

        {/* Create Button */}
        <button
          onClick={handleSubmit}
          disabled={!available || checking}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white transition-all disabled:opacity-30"
          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: available ? '0 15px 50px rgba(220,38,38,0.3)' : 'none' }}
        >
          Create My Identity
        </button>

        {/* Recover Link */}
        <button onClick={onRecover} className="mt-6 text-xs text-gray-500 hover:text-white transition-colors">
          Already have an account? <span className="text-red-400 font-bold">Recover</span>
        </button>
      </motion.div>
    </div>
  );
};

// ─── Card Reveal Screen ─────────────────────────────────────────
const CardRevealScreen = ({ username, phrase, onSaved }) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const cardRef = useRef(null);
  const words = phrase.split(' ');

  const copyPhrase = async () => {
    try {
      await navigator.clipboard.writeText(phrase);
      setCopied(true);
      Haptics.light();
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard might fail on some devices */ }
  };

  const saveToDevice = async () => {
    setSaving(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, { backgroundColor: '#000', pixelRatio: 3 });

      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        const fileName = `ironcore-${username}-${Date.now()}.png`;
        const result = await Filesystem.writeFile({
          path: fileName,
          data: dataUrl.split(',')[1],
          directory: Directory.Cache,
        });
        await Share.share({
          title: 'IronCore Player Card',
          text: 'My IronCore Player Identity',
          url: result.uri,
        });
      } else {
        // Web fallback — download
        const link = document.createElement('a');
        link.download = `ironcore-${username}.png`;
        link.href = dataUrl;
        link.click();
      }
      setSaved(true);
      SFX.success();
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center p-6 pt-[env(safe-area-inset-top,0px)]">
      <motion.div initial={{ opacity: 0, rotateY: 90 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} className="w-full max-w-sm">

        {/* ── The Player Card ── */}
        <div ref={cardRef} className="relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(145deg, rgba(20,20,20,0.95), rgba(10,10,10,0.98))', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Holographic shimmer overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: 'linear-gradient(135deg, transparent 20%, rgba(220,38,38,0.3) 30%, rgba(249,115,22,0.2) 40%, rgba(168,85,247,0.2) 50%, rgba(59,130,246,0.2) 60%, transparent 80%)', backgroundSize: '200% 200%', animation: 'holographic 4s ease-in-out infinite' }} />
          {/* Border glow */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ boxShadow: 'inset 0 0 30px rgba(220,38,38,0.1), 0 0 40px rgba(220,38,38,0.05)' }} />

          <div className="relative p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Dumbbell size={18} className="text-red-500" />
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Player Identity</span>
              </div>
              <Shield size={16} className="text-red-500/50" />
            </div>

            {/* Username */}
            <h2 className="text-3xl font-black text-white mb-1" style={{ textShadow: '0 0 30px rgba(220,38,38,0.3)' }}>@{username}</h2>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-6">IronCore Athlete</p>

            {/* QR Code + Member Date */}
            <div className="flex items-end justify-between">
              <div className="bg-white p-2 rounded-xl">
                <QRCodeSVG value={phrase} size={100} level="M" />
              </div>
              <div className="text-right">
                <p className="text-[9px] text-gray-600 uppercase tracking-widest">Member Since</p>
                <p className="text-xs text-gray-400 font-bold">{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Recovery Phrase ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Recovery Phrase</p>
            <button onClick={copyPhrase} className="flex items-center gap-1 text-[10px] text-red-400 font-bold uppercase">
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {words.map((word, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5"
              >
                <span className="text-[10px] text-gray-600 font-bold w-4">{i + 1}</span>
                <span className="text-sm text-white font-bold">{word}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 mb-4">
          <p className="text-[11px] text-red-400/80 leading-relaxed">
            This phrase is your <strong>ONLY</strong> way to recover your account on a new device. Save it now. IronCore cannot reset it.
          </p>
        </div>

        {/* Confirmation checkbox */}
        <label className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => setConfirmed(!confirmed)}>
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${confirmed ? 'bg-red-500 border-red-500' : 'border-gray-700'}`}>
            {confirmed && <Check size={12} className="text-white" />}
          </div>
          <span className="text-xs text-gray-400">I've saved my recovery phrase</span>
        </label>

        {/* Save + Continue buttons */}
        <div className="flex flex-col gap-3 pb-[env(safe-area-inset-bottom,0px)]">
          <button
            onClick={saveToDevice}
            disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Save Card to Device
          </button>
          <button
            onClick={onSaved}
            disabled={!confirmed}
            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white transition-all disabled:opacity-30"
            style={{ background: confirmed ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'rgba(255,255,255,0.05)', boxShadow: confirmed ? '0 15px 50px rgba(220,38,38,0.3)' : 'none' }}
          >
            Continue <ChevronRight size={14} className="inline ml-1" />
          </button>
        </div>
      </motion.div>

      <style>{`
        @keyframes holographic {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
};

// ─── Main PlayerCardView Orchestrator ────────────────────────────
export const PlayerCardView = ({ onComplete, onRecover }) => {
  const [step, setStep] = useState('username'); // 'username' | 'creating' | 'pin' | 'reveal'
  const [username, setUsername] = useState('');
  const [phrase, setPhrase] = useState('');
  const [uid, setUid] = useState('');

  const handleUsernameChosen = async (name) => {
    setUsername(name);
    setStep('creating');

    try {
      // 1. Sign in anonymously
      const { signInAnonymously } = await import('firebase/auth');
      const { auth } = await import('../firebase');
      const result = await signInAnonymously(auth);
      const user = result.user;
      setUid(user.uid);

      // 2. Generate phrase + hash
      const newPhrase = generatePhrase();
      setPhrase(newPhrase);
      const phraseH = await hashPhrase(newPhrase);

      // 3. Claim username + write user doc
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../firebase');

      await setDoc(doc(db, 'usernames', name), {
        uid: user.uid,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'users', user.uid, 'data', 'profile'), {
        username: name,
        phraseHash: phraseH,
        createdAt: serverTimestamp(),
      }, { merge: true });

      // 4. Go to PIN setup
      setStep('pin');
    } catch (e) {
      console.error('Account creation error:', e);
      setStep('username');
    }
  };

  const handlePinSet = async (pinHash) => {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      await setDoc(doc(db, 'users', uid, 'data', 'profile'), {
        pinHash,
      }, { merge: true });

      setStep('reveal');
    } catch (e) {
      console.error('PIN save error:', e);
    }
  };

  const handleCardSaved = async () => {
    // Check for biometric availability and prompt enrollment
    const { isBiometricAvailable, authenticateWithBiometrics } = await import('../utils/biometrics');
    const bioAvail = await isBiometricAvailable();
    let bioEnabled = false;

    if (bioAvail) {
      bioEnabled = await authenticateWithBiometrics('Enable biometric login for IronCore');
    }

    // Save biometric preference
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      await setDoc(doc(db, 'users', uid, 'data', 'profile'), {
        biometricsEnabled: bioEnabled,
      }, { merge: true });
    } catch { /* non-fatal */ }

    // Store UID locally for return-visit biometric gate
    localStorage.setItem('ironcore_uid', uid);
    localStorage.setItem('ironcore_username', username);
    localStorage.setItem('ironcore_bio', bioEnabled ? 'true' : 'false');

    onComplete({ username, biometricsEnabled: bioEnabled });
  };

  if (step === 'creating') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 font-black uppercase tracking-widest animate-pulse">Forging Identity...</p>
      </div>
    );
  }

  if (step === 'pin') {
    return <PinEntryView mode="setup" onComplete={handlePinSet} />;
  }

  if (step === 'reveal') {
    return <CardRevealScreen username={username} phrase={phrase} onSaved={handleCardSaved} />;
  }

  return <UsernameScreen onNext={handleUsernameChosen} onRecover={onRecover} />;
};
```

**Step 2: Commit**

```bash
git add src/views/PlayerCardView.jsx
git commit -m "feat: add PlayerCardView with username creation, QR card reveal, and phrase display"
```

---

## Task 8: Create RecoveryView.jsx

**Files:**
- Create: `src/views/RecoveryView.jsx`

**Step 1: Write the recovery component**

Two modes: type phrase manually, or scan QR (QR scanning uses the device camera — we'll use a simple text input for now; camera-based QR scanning can be a follow-up).

```jsx
// src/views/RecoveryView.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Loader2, ArrowLeft, AlertCircle, Check } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { getApp } from 'firebase/app';
import { auth as firebaseAuth } from '../firebase';
import { Haptics } from '../utils/audio';

export const RecoveryView = ({ onRecovered, onBack }) => {
  const [phrase, setPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRecover = async () => {
    const trimmed = phrase.trim().toLowerCase();
    const words = trimmed.split(/\s+/);
    if (words.length !== 12) {
      setError('Enter all 12 words separated by spaces');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const functions = getFunctions(getApp());
      const recoverAccount = httpsCallable(functions, 'recoverAccount');
      const result = await recoverAccount({ phrase: trimmed });

      const { token, username } = result.data;
      await signInWithCustomToken(firebaseAuth, token);

      // Store locally for biometric gate
      localStorage.setItem('ironcore_uid', firebaseAuth.currentUser.uid);
      localStorage.setItem('ironcore_username', username);

      Haptics.success();
      onRecovered({ username });
    } catch (e) {
      console.error('Recovery error:', e);
      if (e.code === 'functions/not-found') {
        setError('No account matches this phrase. Check your words.');
      } else {
        setError('Recovery failed. Check your connection and try again.');
      }
      Haptics.error();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-500 mb-8">
          <ArrowLeft size={14} /> Back
        </button>

        <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <KeyRound size={28} className="text-red-500" />
        </div>

        <h1 className="text-2xl font-black text-white uppercase tracking-tight text-center mb-1">Recover Account</h1>
        <p className="text-xs text-gray-500 text-center mb-8">Enter your 12-word recovery phrase</p>

        <textarea
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder="iron forge titan apex blade thunder storm fury squat press flex pump"
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm placeholder-gray-700 outline-none focus:border-red-500/50 focus:bg-white/10 transition-all resize-none mb-4"
        />

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs mb-4">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleRecover}
          disabled={loading || phrase.trim().split(/\s+/).length !== 12}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white transition-all disabled:opacity-30"
          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
        >
          {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Recover My Account'}
        </button>
      </motion.div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add src/views/RecoveryView.jsx
git commit -m "feat: add RecoveryView for 12-word phrase account recovery"
```

---

## Task 9: Write the recoverAccount Cloud Function

**Files:**
- Modify: `functions/index.js`

**Step 1: Add the recoverAccount function**

Add at the bottom of `functions/index.js`, after the last existing export:

```js
// ════════════════════════════════════════════════
// ACCOUNT RECOVERY — Web3 Player Card Auth
// ════════════════════════════════════════════════
exports.recoverAccount = onCall(async (request) => {
  const { phrase } = request.data || {};

  if (!phrase || typeof phrase !== "string") {
    throw new HttpsError("invalid-argument", "Recovery phrase is required.");
  }

  const words = phrase.trim().toLowerCase().split(/\s+/);
  if (words.length !== 12) {
    throw new HttpsError("invalid-argument", "Recovery phrase must be exactly 12 words.");
  }

  // Rate limit by IP — max 5 attempts per hour
  const db = admin.firestore();
  const ip = request.rawRequest?.ip || "unknown";
  const rateLimitRef = db.collection("rateLimits").doc(`recovery_${ip}`);
  const rateLimitSnap = await rateLimitRef.get();
  const now = Date.now();

  if (rateLimitSnap.exists) {
    const data = rateLimitSnap.data();
    if (now - data.windowStart < 3600000 && data.count >= 5) {
      throw new HttpsError("resource-exhausted", "Too many recovery attempts. Try again later.");
    }
    if (now - data.windowStart >= 3600000) {
      await rateLimitRef.set({ count: 1, windowStart: now });
    } else {
      await rateLimitRef.update({ count: admin.firestore.FieldValue.increment(1) });
    }
  } else {
    await rateLimitRef.set({ count: 1, windowStart: now });
  }

  // Hash the phrase
  const normalized = words.join(" ");
  const phraseHash = crypto.createHash("sha256").update(normalized).digest("hex");

  // Search all users for matching phraseHash
  // We search in users/{uid}/data/profile where phraseHash is stored
  const usersSnap = await db.collectionGroup("data")
    .where("phraseHash", "==", phraseHash)
    .limit(1)
    .get();

  if (usersSnap.empty) {
    throw new HttpsError("not-found", "No account matches this recovery phrase.");
  }

  const matchedDoc = usersSnap.docs[0];
  // Path is: users/{uid}/data/profile — extract uid from parent path
  const uid = matchedDoc.ref.parent.parent.id;
  const username = matchedDoc.data().username || "unknown";

  // Mint a custom auth token for this UID
  const token = await admin.auth().createCustomToken(uid);

  return { token, username };
});
```

**Step 2: Add Firestore index for collectionGroup query**

The `collectionGroup("data").where("phraseHash", "==", phraseHash)` query requires a composite index. Update `firestore.indexes.json`:

Check current file first, then add the needed index entry:

```json
{
  "fieldOverrides": [
    {
      "collectionGroup": "data",
      "fieldPath": "phraseHash",
      "indexes": [
        { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" }
      ]
    }
  ]
}
```

**Step 3: Commit**

```bash
git add functions/index.js firestore.indexes.json
git commit -m "feat: add recoverAccount Cloud Function with rate limiting and phrase hash matching"
```

---

## Task 10: Update App.jsx — Wire Up the New Auth Flow

**Files:**
- Modify: `src/App.jsx`

This is the final integration task. We need to:

1. Replace `LoginView` import with `PlayerCardView` + `RecoveryView` + `PinEntryView`
2. Add biometric gate logic for return visits
3. Wire up the new auth flow in `MainContent`

**Step 1: Update imports (lines 9-10)**

Replace:
```js
import { LoginView } from './views/LoginView';
import { OnboardingView } from './views/OnboardingView';
```

With:
```js
import { PlayerCardView } from './views/PlayerCardView';
import { RecoveryView } from './views/RecoveryView';
import { PinEntryView } from './views/PinEntryView';
import { OnboardingView } from './views/OnboardingView';
```

**Step 2: Add auth gate state in MainContent (around line 48-51)**

Add after the existing state declarations:

```js
  const [authGate, setAuthGate] = useState('checking'); // 'checking' | 'biometric' | 'pin' | 'card' | 'recovery' | 'passed'
```

**Step 3: Add biometric gate effect**

Add a new `useEffect` after the splash screen effect. This runs when we have a Firebase user but need to verify biometrics:

```js
  // Biometric gate for return visits
  useEffect(() => {
    if (loading || showSplash) return;
    if (!user) { setAuthGate('card'); return; }

    // User exists (anonymous auth persisted) — check if biometric gate needed
    const bioEnabled = localStorage.getItem('ironcore_bio') === 'true';
    if (!bioEnabled) {
      setAuthGate('passed');
      return;
    }

    // Try biometric auth
    (async () => {
      const { authenticateWithBiometrics } = await import('./utils/biometrics');
      const success = await authenticateWithBiometrics('Unlock IronCore');
      setAuthGate(success ? 'passed' : 'pin');
    })();
  }, [user, loading, showSplash]);
```

**Step 4: Replace the login/auth gate render logic (line 242)**

Replace:
```jsx
  if (!user) return <LoginView onLogin={login} />;
```

With:
```jsx
  if (!user || authGate === 'card') return (
    <PlayerCardView
      onComplete={({ username }) => {
        setAuthGate('passed');
        addToast(`Welcome, @${username}`, 'success');
      }}
      onRecover={() => setAuthGate('recovery')}
    />
  );

  if (authGate === 'recovery') return (
    <RecoveryView
      onRecovered={({ username }) => {
        setAuthGate('passed');
        addToast(`Welcome back, @${username}`, 'success');
      }}
      onBack={() => setAuthGate('card')}
    />
  );

  if (authGate === 'pin') return (
    <PinEntryView
      mode="verify"
      storedPinHash={profile?.pinHash}
      onComplete={() => setAuthGate('passed')}
      onForgot={() => setAuthGate('recovery')}
    />
  );

  if (authGate === 'biometric' || authGate === 'checking') return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-gray-500 font-black uppercase tracking-widest animate-pulse">Authenticating...</p>
    </div>
  );
```

**Step 5: Update the `login` destructuring from useFitnessData**

In the MainContent component, the destructuring from `useFitnessData()` (line 63-67) currently includes `login`. Change it:

Replace:
```js
  const {
    login, logout, uploadProfilePic, ...
  } = useFitnessData();
```

With:
```js
  const {
    loginAnonymous, recoverWithToken, logout, uploadProfilePic, ...
  } = useFitnessData();
```

**Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire up PlayerCardView + biometric gate + PIN entry in App.jsx auth flow"
```

---

## Task 11: Clean Up — Delete LoginView

**Files:**
- Delete: `src/views/LoginView.jsx`

**Step 1: Delete the file**

```bash
rm src/views/LoginView.jsx
```

**Step 2: Search for any remaining imports**

Run:
```bash
grep -rn "LoginView" src/
```

Expected: No results (we already replaced the import in App.jsx).

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete LoginView.jsx (replaced by PlayerCardView)"
```

---

## Task 12: Smoke Test

**Step 1: Build**

Run:
```bash
npm run build
```

Expected: Clean build, no errors.

**Step 2: Manual test checklist**

1. `npm run dev` — app loads splash screen
2. Username screen appears (no email/password fields)
3. Type a username → real-time availability check
4. Create account → PIN setup → Card reveal
5. Copy phrase, save card, confirm checkbox
6. Continue → biometric prompt (or skip on web)
7. Onboarding flow (existing) appears
8. Close & reopen → biometric gate (or PIN on web)
9. Recovery: clear localStorage, enter phrase → account restored

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: Web3 Player Card auth system complete — anonymous auth, biometrics, recovery phrase"
```

---

## Summary of all files

| Action | File | Description |
|--------|------|-------------|
| CREATE | `src/utils/playerIdentity.js` | Wordlist, phrase gen, hashing, username validation |
| CREATE | `src/utils/biometrics.js` | Biometric auth wrapper |
| CREATE | `src/views/PlayerCardView.jsx` | Username + Card Reveal + orchestrator |
| CREATE | `src/views/PinEntryView.jsx` | PIN setup and verify |
| CREATE | `src/views/RecoveryView.jsx` | Phrase-based account recovery |
| MODIFY | `src/hooks/useFitnessData.js` | Replace auth methods |
| MODIFY | `src/App.jsx` | Wire up new auth flow |
| MODIFY | `functions/index.js` | Add recoverAccount Cloud Function |
| MODIFY | `firestore.rules` | Add usernames collection rules |
| MODIFY | `firestore.indexes.json` | Add collectionGroup index for phraseHash |
| MODIFY | `package.json` | New dependencies |
| DELETE | `src/views/LoginView.jsx` | Replaced by PlayerCardView |
