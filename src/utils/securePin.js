/**
 * Secure PIN storage.
 *
 * On native (iOS / Android) the PIN hash is kept in the platform keychain
 * (iOS Keychain / Android Keystore) via capacitor-secure-storage-plugin.
 * That keeps it out of any JS-accessible storage and out of backups that
 * aren't explicitly allowed.
 *
 * On the web we store the hash in sessionStorage (tab-scoped; cleared when
 * the tab closes) rather than localStorage. This is a *hash* not the PIN
 * itself and PIN verification is gated server-side by Cloud Functions
 * loginWithPin, but keeping it out of localStorage prevents XSS persistence
 * and mobile-web-view siphoning across tabs.
 *
 * Callers should ONLY use these helpers — never touch `ironcore_pin_*`
 * localStorage keys directly. All legacy localStorage entries are migrated
 * to secure storage on first read and then deleted.
 */
import { Capacitor } from '@capacitor/core';

const LEGACY_PREFIX = 'ironcore_pin_';
const SECURE_PREFIX = 'ironcore_pin_v2_';

let securePlugin = null;
let securePluginLoadPromise = null;

async function getSecureStorage() {
  if (!Capacitor.isNativePlatform()) return null;
  if (securePlugin) return securePlugin;
  if (!securePluginLoadPromise) {
    // Runtime-only dep. The package ships native iOS/Android code and has
    // no web fallback — importing it in the web bundle would just bloat
    // output, so we resolve it dynamically and obscure the string from
    // Rollup's static analyzer (same pattern used for @capacitor/app and
    // @capacitor/local-notifications).
    const pkg = 'capacitor-secure-storage' + '-plugin';
    securePluginLoadPromise = import(/* @vite-ignore */ pkg)
      .then((mod) => {
        securePlugin = mod.SecureStoragePlugin || mod.default;
        return securePlugin;
      })
      .catch(() => null);
  }
  return securePluginLoadPromise;
}

function legacyKey(uid) { return `${LEGACY_PREFIX}${uid}`; }
function secureKey(uid) { return `${SECURE_PREFIX}${uid}`; }

async function migrateLegacy(uid) {
  if (!uid || typeof localStorage === 'undefined') return null;
  let legacy;
  try { legacy = localStorage.getItem(legacyKey(uid)); } catch { return null; }
  if (!legacy) return null;
  try {
    await setPinHash(uid, legacy);
  } finally {
    try { localStorage.removeItem(legacyKey(uid)); } catch { /* noop */ }
  }
  return legacy;
}

export async function getPinHash(uid) {
  if (!uid) return null;
  const secure = await getSecureStorage();
  if (secure) {
    try {
      const { value } = await secure.get({ key: secureKey(uid) });
      if (value) return value;
    } catch { /* miss → fall through to migrate/session */ }
    return migrateLegacy(uid);
  }
  try {
    const sessionVal = sessionStorage.getItem(secureKey(uid));
    if (sessionVal) return sessionVal;
  } catch { /* noop */ }
  return migrateLegacy(uid);
}

export async function setPinHash(uid, hash) {
  if (!uid || !hash) return;
  const secure = await getSecureStorage();
  if (secure) {
    try { await secure.set({ key: secureKey(uid), value: hash }); return; }
    catch { /* fall through to session */ }
  }
  try { sessionStorage.setItem(secureKey(uid), hash); } catch { /* quota / private mode */ }
}

export async function clearPinHash(uid) {
  if (!uid) return;
  const secure = await getSecureStorage();
  if (secure) {
    try { await secure.remove({ key: secureKey(uid) }); } catch { /* noop */ }
  }
  try { sessionStorage.removeItem(secureKey(uid)); } catch { /* noop */ }
  try { localStorage.removeItem(legacyKey(uid)); } catch { /* noop */ }
}

export async function hasPinHash(uid) {
  const v = await getPinHash(uid);
  return !!v;
}
