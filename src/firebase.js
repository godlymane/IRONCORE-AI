// Firebase Configuration for IronCore AI
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, persistentSingleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';


const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Native = single tab (WebView), Web = multi-tab (browser)
const isNative = Capacitor.isNativePlatform();
const tabMgr = isNative ? persistentSingleTabManager({}) : persistentMultipleTabManager();

export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: tabMgr })
});
export const auth = getAuth(app);

// Storage — may fail if bucket not configured
let storageInstance = null;
try {
    if (firebaseConfig.storageBucket) {
        storageInstance = getStorage(app);
    }
} catch (e) {
    console.warn('Storage init skipped:', e.message);
}
export const storage = storageInstance;
export const isStorageConfigured = !!storageInstance;

export const functions = getFunctions(app);

// Messaging — only supported in browser contexts with service workers
// Uses a promise cache to prevent race conditions from concurrent calls
let _msgPromise = null;
export const getMessagingInstance = () => {
    if (!_msgPromise) {
        _msgPromise = (async () => {
            try {
                const supported = await isMessagingSupported();
                if (supported) {
                    return getMessaging(app);
                }
            } catch (e) {
                console.warn('Messaging init skipped:', e.message);
            }
            return null;
        })();
    }
    return _msgPromise;
};

export default app;



