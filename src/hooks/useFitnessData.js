import { useEffect, useCallback, useRef } from 'react';
import {
    signInAnonymously,
    signInWithCustomToken,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import {
    doc, setDoc, collection, addDoc, getDoc, runTransaction,
    onSnapshot, query, deleteDoc, orderBy, limit
} from 'firebase/firestore';
import {
    ref,
    uploadBytes,
    getDownloadURL
} from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { Capacitor } from '@capacitor/core';
import { db, auth as firebaseAuth, storage as firebaseStorage, isStorageConfigured, functions as firebaseFunctions } from '../firebase';
import { runMigrations, CURRENT_SCHEMA_VERSION } from '../utils/migrations';
import imageCompression from 'browser-image-compression';
import { useStore } from './useStore';
import { updateBossProgress } from '../services/arenaService';
import { throttleAction } from '../utils/rateLimiter';
import { enqueueOfflineOp, replayOfflineQueue, registerQueueNotifier } from '../utils/offlineQueue';
import { registerFCMToken } from '../services/pushNotificationService';
import { CONTENT_LIMITS, STORAGE_KEYS } from '../utils/constants';

// --- Input validation helpers ---
const { MAX_MESSAGE_LENGTH, MAX_CAPTION_LENGTH } = CONTENT_LIMITS;
const MAX_USERNAME_LENGTH = 50;

const sanitizeText = (text, maxLength = MAX_MESSAGE_LENGTH) => {
    if (typeof text !== 'string') return '';
    return text.trim().slice(0, maxLength);
};

const validatePayload = (payload) => {
    if (!payload || typeof payload !== 'object') return false;
    // Reject if payload has any prototype pollution keys
    const dangerous = ['__proto__', 'constructor', 'prototype'];
    return !Object.keys(payload).some(k => dangerous.includes(k));
};

// Tabs that need social listeners (leaderboard, chat, posts, globalFeed, battles, inbox, following)
const SOCIAL_TABS = new Set(['arena', 'profile']);
// Tabs that need photos listener
const PHOTOS_TABS = new Set(['profile']);

export function useFitnessData() {
    // Read from Zustand store
    const {
        user, dataLoaded, profileLoaded, profileExists, activeTab,
        setUser, setLoading, setError, clearStore, updateState
    } = useStore();

    // Data references (not reactive here, just needed for functions)
    const storeState = useStore();

    // Register offline queue notifier to surface dropped/errored ops as errors
    useEffect(() => {
        registerQueueNotifier({
            onDrop: (_type, msg) => setError(msg),
            onError: (_type, msg) => setError(msg),
        });
    }, [setError]);

    const listenersRef = useRef([]);
    const socialUnsubs = useRef([]);
    const photosUnsub = useRef(null);

    // Use singleton instances from firebase.js
    const isStorageReady = isStorageConfigured;

    // --- INIT AUTH ---
    useEffect(() => {
        if (!db || !firebaseAuth) {
            setError("Firebase not initialized — check .env");
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(firebaseAuth, (u) => {
            if (u) {
                try {
                    const cached = localStorage.getItem(STORAGE_KEYS.PROFILE_PREFIX + u.uid);
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        updateState({ profile: { ...parsed } });
                    }
                } catch (_err) { /* expected: cached profile may not exist */ }

                // Register FCM token for server-side push notifications
                registerFCMToken(u.uid).catch(() => {});
            }
            setUser(u);
        });

        return () => unsubscribe();
    }, []);

    // --- OFFLINE QUEUE REPLAY on reconnect ---
    useEffect(() => {
        const handleOnline = async () => {
            if (!user) return;
            try {
                const count = await replayOfflineQueue({
                    xp_update: async ({ activityType, workoutVolume }, idempotencyKey) => {
                        const awardXP = httpsCallable(firebaseFunctions, 'awardActivityXP');
                        await awardXP({ activityType, workoutVolume, idempotencyKey });
                    },
                    boss_damage: async ({ userId, username, workoutVolume }) => {
                        await updateBossProgress(userId, username, workoutVolume);
                    }
                });
                if (count.replayed > 0) console.log(`Replayed ${count.replayed} offline operations.`);
                if (count.dropped > 0) setError(`${count.dropped} queued operation(s) expired and were discarded.`);
            } catch (err) {
                console.error('Offline queue replay error:', err);
            }
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [user]);

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

    const logout = async () => {
        try {
            await signOut(firebaseAuth);

            clearStore();

            // Tear down deferred listeners
            socialUnsubs.current.forEach(u => u());
            socialUnsubs.current = [];
            if (photosUnsub.current) { photosUnsub.current(); photosUnsub.current = null; }

            // NOTE: We intentionally keep localStorage caches (profile, onboarding)
            // so the app feels instant on re-login. Firestore onSnapshot will
            // overwrite stale data within seconds of the next sign-in.
        } catch (e) { console.error(e); }
    };

    // --- DATA MUTATIONS ---
    const uploadProfilePic = async (file) => {
        if (!isStorageReady || !user) { setError("Storage not configured."); return; }
        try {
            const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };
            const compressedFile = await imageCompression(file, options);

            const storageRef = ref(firebaseStorage, 'users/' + user.uid + '/profile_' + Date.now() + '.jpg');
            await uploadBytes(storageRef, compressedFile);
            const url = await getDownloadURL(storageRef);

            await updateData('add', 'profile', { photoURL: url });

            try {
                const cached = localStorage.getItem(STORAGE_KEYS.PROFILE_PREFIX + user.uid);
                const profile = cached ? JSON.parse(cached) : {};
                profile.photoURL = url;
                localStorage.setItem(STORAGE_KEYS.PROFILE_PREFIX + user.uid, JSON.stringify(profile));
            } catch (_err) { /* expected: localStorage may be unavailable */ }
            return url;
        } catch (e) { console.error("Upload failed", e); }
    };

    const uploadProgressPhoto = async (file, note = "") => {
        if (!isStorageReady || !user) return;
        try {
            const options = { maxSizeMB: 1.0, maxWidthOrHeight: 1200, useWebWorker: true };
            const compressedFile = await imageCompression(file, options);

            const storageRef = ref(firebaseStorage, 'users/' + user.uid + '/progress/' + Date.now() + '.jpg');
            await uploadBytes(storageRef, compressedFile);
            const url = await getDownloadURL(storageRef);
            await addDoc(collection(db, 'users', user.uid, 'photos'), { url, date: new Date().toISOString().split('T')[0], createdAt: new Date(), note });
            return true;
        } catch (e) { console.debug('[fitness] Save failed:', e.message); return false; }
    };

    const broadcastEvent = async (type, message, details = "") => {
        if (!db || !user) return;
        try {
            await addDoc(collection(db, 'global', 'data', 'feed'), {
                type, message: sanitizeText(message, MAX_MESSAGE_LENGTH), details,
                username: sanitizeText(user.displayName || "Anonymous", MAX_USERNAME_LENGTH),
                userId: user.uid,
                createdAt: new Date()
            });
        } catch (e) { console.error("Broadcast failed", e); }
    };

    const buyItem = async (item, cost) => {
        if (!user || !db) return false;
        try {
            const profileRef = doc(db, 'users', user.uid, 'data', 'profile');
            await runTransaction(db, async (txn) => {
                const snap = await txn.get(profileRef);
                const current = snap.exists() ? snap.data() : {};
                const currentXp = current.xp || 0;
                if (currentXp < cost) throw new Error("Not enough XP!");
                txn.set(profileRef, {
                    xp: currentXp - cost,
                    inventory: [...(current.inventory || []), { item, boughtAt: new Date() }]
                }, { merge: true });
            });
            return true;
        } catch (e) {
            console.error("Purchase failed", e);
            if (e.message === "Not enough XP!") setError("Not enough XP!");
            return false;
        }
    };

    const completeDailyDrop = async (xpReward) => {
        if (!user || !db) return;
        const today = new Date().toISOString().split('T')[0];
        try {
            const profileRef = doc(db, 'users', user.uid, 'data', 'profile');
            await runTransaction(db, async (txn) => {
                const snap = await txn.get(profileRef);
                const current = snap.exists() ? snap.data() : {};
                if (current.dailyDrops && current.dailyDrops[today]) {
                    throw new Error("already_claimed");
                }
                txn.set(profileRef, {
                    xp: (current.xp || 0) + xpReward,
                    dailyDrops: { ...(current.dailyDrops || {}), [today]: true }
                }, { merge: true });
            });
            broadcastEvent('challenge', 'crushed the Daily Drop!', '+' + xpReward + ' XP');
        } catch (e) {
            if (e.message !== "already_claimed") console.error("Daily drop failed", e);
        }
    };

    const sendMessage = async (text) => {
        const clean = sanitizeText(text, MAX_MESSAGE_LENGTH);
        const { profile } = useStore.getState();
        if (!user || !db || !clean) return;
        try {
            await addDoc(collection(db, 'global', 'data', 'chat'), {
                text: clean, userId: user.uid, username: sanitizeText(user.displayName || "Anonymous", MAX_USERNAME_LENGTH), photo: user.photoURL, xp: profile.xp || 0, createdAt: new Date()
            });
        } catch (e) { console.error("Message failed", e); }
    };

    const sendPrivateMessage = async (targetUserId, text) => {
        const clean = sanitizeText(text, MAX_MESSAGE_LENGTH);
        if (!user || !db || !clean || !targetUserId) return;
        try {
            await addDoc(collection(db, 'users', targetUserId, 'inbox'), {
                text: clean, fromId: user.uid, fromName: sanitizeText(user.displayName || "Anonymous", MAX_USERNAME_LENGTH), fromPhoto: user.photoURL, createdAt: new Date(), read: false
            });
            return true;
        } catch (e) { console.error("DM failed", e); return false; }
    };

    const toggleFollow = async (targetUserId) => {
        const { following } = useStore.getState();
        if (!user || !db) return;
        const isFollowing = following.includes(targetUserId);
        try {
            if (isFollowing) { await deleteDoc(doc(db, 'users', user.uid, 'following', targetUserId)); }
            else { await setDoc(doc(db, 'users', user.uid, 'following', targetUserId), { followedAt: new Date() }); }
        } catch (e) { console.error("Follow toggle failed", e); }
    };

    const createPost = async (file, caption) => {
        const { profile } = useStore.getState();
        if (!isStorageReady || !user || !db) return;
        const cleanCaption = sanitizeText(caption, MAX_CAPTION_LENGTH);
        try {
            const storageRef = ref(firebaseStorage, 'posts/' + Date.now() + '_' + user.uid + '.jpg');
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await addDoc(collection(db, 'global', 'data', 'posts'), {
                imageUrl: url, caption: cleanCaption, userId: user.uid, username: sanitizeText(user.displayName || "Anonymous", MAX_USERNAME_LENGTH), userPhoto: user.photoURL, xp: profile.xp || 0, likes: 0, createdAt: new Date()
            });
            return true;
        } catch (e) { console.error("Post failed", e); return false; }
    };

    const createBattle = async (opponentId, opponentName) => {
        if (!user || !db || !opponentId) return;
        try {
            await addDoc(collection(db, 'battles'), {
                challengerId: user.uid,
                challengerName: sanitizeText(user.displayName || "Unknown", MAX_USERNAME_LENGTH),
                opponentId,
                opponentName: sanitizeText(opponentName || "Unknown", MAX_USERNAME_LENGTH),
                status: 'active',
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 86400000)
            });
        } catch (e) { console.error("Battle creation failed", e); }
    };

    // --- DATA LISTENERS ---
    const onListenerError = useCallback((key) => (err) => {
        console.error('Listener error [' + key + ']:', err.code || err.message);
    }, []);

    const bindListener = useCallback((uid, key, isDoc = false) => {
        let actualRef;
        if (key === 'leaderboard') actualRef = query(collection(db, 'leaderboard'), orderBy('xp', 'desc'), limit(100));
        else if (key === 'chat') actualRef = query(collection(db, 'global', 'data', 'chat'), orderBy('createdAt', 'asc'), limit(50));
        else if (key === 'posts') actualRef = query(collection(db, 'global', 'data', 'posts'), orderBy('createdAt', 'desc'), limit(20));
        else if (key === 'globalFeed') actualRef = query(collection(db, 'global', 'data', 'feed'), orderBy('createdAt', 'desc'), limit(50));
        else if (key === 'battles') actualRef = query(collection(db, 'battles'), orderBy('createdAt', 'desc'), limit(20));
        else if (isDoc) actualRef = doc(db, 'users', uid, 'data', key);
        else actualRef = query(collection(db, 'users', uid, key));

        return onSnapshot(actualRef, (snap) => {
            if (isDoc) {
                const docData = snap.exists() ? snap.data() : {};
                useStore.getState().updateState({ [key]: docData });

                if (key === 'profile') {
                    useStore.getState().updateState({
                        profileLoaded: true,
                        profileExists: snap.exists() && Object.keys(docData).length > 0
                    });
                    if (snap.exists() && Object.keys(docData).length > 0) {
                        try { localStorage.setItem(STORAGE_KEYS.PROFILE_PREFIX + uid, JSON.stringify(docData)); } catch (_err) { /* expected: localStorage may be full */ }
                    }
                }
            } else {
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                if (!['chat', 'globalFeed', 'posts', 'battles', 'leaderboard'].includes(key)) {
                    list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                }
                useStore.getState().updateState({ [key]: list });
            }
            useStore.getState().updateState({ dataLoaded: true });
        }, onListenerError(key));
    }, [onListenerError]);

    // CORE listeners
    useEffect(() => {
        if (!user || !db) return;
        // Root user doc listener — has ironScore, weightStatus (written by Cloud Functions)
        const unsubUserDoc = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            useStore.getState().updateState({ userDoc: snap.exists() ? snap.data() : {} });
        }, onListenerError('userDoc'));
        const unsubs = [
            unsubUserDoc,
            bindListener(user.uid, 'meals'),
            bindListener(user.uid, 'progress'),
            bindListener(user.uid, 'burned'),
            bindListener(user.uid, 'workouts'),
            bindListener(user.uid, 'profile', true),
            bindListener(user.uid, 'friendRequests'),
            bindListener(user.uid, 'friends'),
        ];
        listenersRef.current = unsubs;
        return () => unsubs.forEach(u => u());
    }, [user, bindListener]);

    // SOCIAL listeners
    useEffect(() => {
        if (!user || !db || !SOCIAL_TABS.has(activeTab)) {
            socialUnsubs.current.forEach(u => u());
            socialUnsubs.current = [];
            return;
        }
        if (socialUnsubs.current.length > 0) return;

        socialUnsubs.current = [
            bindListener(user.uid, 'leaderboard'),
            bindListener(user.uid, 'chat'),
            bindListener(user.uid, 'posts'),
            bindListener(user.uid, 'globalFeed'),
            bindListener(user.uid, 'battles'),
            onSnapshot(collection(db, 'users', user.uid, 'inbox'), (snap) => {
                const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt);
                useStore.getState().updateState({ inbox: msgs });
            }, onListenerError('inbox')),
            onSnapshot(collection(db, 'users', user.uid, 'following'), (snap) => {
                useStore.getState().updateState({ following: snap.docs.map(d => d.id) });
            }, onListenerError('following')),
        ];
        return () => {
            socialUnsubs.current.forEach(u => u());
            socialUnsubs.current = [];
        };
    }, [user, activeTab, bindListener, onListenerError]);

    // PHOTOS listener
    useEffect(() => {
        if (!user || !db || !PHOTOS_TABS.has(activeTab)) {
            if (photosUnsub.current) { photosUnsub.current(); photosUnsub.current = null; }
            return;
        }
        if (photosUnsub.current) return;
        photosUnsub.current = bindListener(user.uid, 'photos');
        return () => { if (photosUnsub.current) { photosUnsub.current(); photosUnsub.current = null; } };
    }, [user, activeTab, bindListener]);

    const refreshData = useCallback(() => {
        if (!user || !db) return;
        // Unsubscribe ALL existing listeners before re-creating (prevents listener leak)
        listenersRef.current.forEach(u => u());
        listenersRef.current = [];
        socialUnsubs.current.forEach(u => u());
        socialUnsubs.current = [];
        if (photosUnsub.current) { photosUnsub.current(); photosUnsub.current = null; }
        const unsubUserDoc = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            useStore.getState().updateState({ userDoc: snap.exists() ? snap.data() : {} });
        }, onListenerError('userDoc'));
        listenersRef.current = [
            unsubUserDoc,
            bindListener(user.uid, 'meals'),
            bindListener(user.uid, 'progress'),
            bindListener(user.uid, 'burned'),
            bindListener(user.uid, 'workouts'),
            bindListener(user.uid, 'profile', true),
            bindListener(user.uid, 'friendRequests'),
            bindListener(user.uid, 'friends'),
        ];
        if (SOCIAL_TABS.has(activeTab)) {
            socialUnsubs.current.forEach(u => u());
            socialUnsubs.current = [
                bindListener(user.uid, 'leaderboard'),
                bindListener(user.uid, 'chat'),
                bindListener(user.uid, 'posts'),
                bindListener(user.uid, 'globalFeed'),
                bindListener(user.uid, 'battles'),
                onSnapshot(collection(db, 'users', user.uid, 'inbox'), (snap) => {
                    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt);
                    useStore.getState().updateState({ inbox: msgs });
                }, onListenerError('inbox')),
                onSnapshot(collection(db, 'users', user.uid, 'following'), (snap) => {
                    useStore.getState().updateState({ following: snap.docs.map(d => d.id) });
                }, onListenerError('following')),
            ];
        }
    }, [user, activeTab, bindListener, onListenerError]);

    // Migration runner
    const migrationRanRef = useRef(false);
    useEffect(() => {
        const { profile, progress, meals, workouts } = useStore.getState();
        if (migrationRanRef.current || !user || !db || !profileLoaded || !dataLoaded) return;
        // Skip migration for brand new accounts (no profile data yet)
        if (!profile.username && !profile.weight && !profile.goal) return;
        if ((profile.schemaVersion || 0) >= CURRENT_SCHEMA_VERSION) return;
        migrationRanRef.current = true;

        runMigrations(
            profile,
            { progress, meals, workouts },
            async (patch) => {
                await setDoc(doc(db, 'users', user.uid, 'data', 'profile'), patch, { merge: true });
            }
        ).catch(e => console.error('Migration error:', e));
    }, [user, db, profileLoaded, dataLoaded, storeState.profile, storeState.progress, storeState.meals, storeState.workouts]);

    const updateData = async (action, col, payload, id) => {
        if (!user || !db) return;
        if (payload && !validatePayload(payload)) {
            console.error('Invalid payload rejected');
            return;
        }

        const { profile, leaderboard } = useStore.getState();
        const today = new Date().toISOString().split('T')[0];
        const timestamp = new Date();
        let xpGain = 0;

        if (action === 'add') {
            if (col === 'meals') xpGain = 10;
            if (col === 'workouts') xpGain = 50;
            if (col === 'progress') xpGain = 20;
            if (col === 'xp_bonus') xpGain = payload.amount;
            if (col === 'burned') xpGain = 15;

            // Deep-clone payload to avoid mutating caller's object
            const safePayload = JSON.parse(JSON.stringify(payload));
            const docData = { ...safePayload, date: today, createdAt: timestamp, userId: user.uid };

            if (col === 'workouts' && docData.exercises) {
                docData.exercises.forEach(ex => {
                    if (ex.sets) {
                        ex.sets.forEach(s => {
                            s.w = Math.max(0, Math.min(2000, parseFloat(s.w) || 0));
                            s.r = Math.max(0, Math.min(1000, parseFloat(s.r) || 0));
                        });
                    }
                });

                // Server-side anti-cheat validation (skip when offline — Firestore cache handles the write)
                if (navigator.onLine) {
                    try {
                        const validateWorkout = httpsCallable(firebaseFunctions, 'validateWorkoutData');
                        await validateWorkout({
                            exercises: docData.exercises.map(ex => ({
                                name: ex.name || ex.exercise || 'Unknown',
                                sets: ex.sets || []
                            })),
                            duration: docData.duration || 0
                        });
                    } catch (validationErr) {
                        console.error('Workout rejected by server:', validationErr.message);
                        throw new Error(validationErr.message || 'Workout validation failed');
                    }
                }
            }

            try {
                if (col === 'xp_bonus') { /* logic */ }
                else if (col === 'profile') { await setDoc(doc(db, 'users', user.uid, 'data', 'profile'), { ...payload, userId: user.uid }, { merge: true }); }
                else { await addDoc(collection(db, 'users', user.uid, col), docData); }

                if (xpGain > 0 || col === 'workouts') {
                    let workoutVolume = 0;
                    if (col === 'workouts' && payload.exercises) {
                        payload.exercises.forEach(ex => {
                            ex.sets.forEach(s => { workoutVolume += (parseFloat(s.w) || 0) * (parseFloat(s.r) || 0); });
                        });
                    }

                    // Offline: queue server-dependent ops for replay on reconnect
                    if (!navigator.onLine) {
                        if (xpGain > 0) {
                            enqueueOfflineOp('xp_update', { activityType: col, workoutVolume: col === 'workouts' ? workoutVolume : undefined });
                        }
                        if (col === 'workouts' && workoutVolume > 0) {
                            enqueueOfflineOp('boss_damage', {
                                userId: user.uid,
                                username: user.displayName || "Anonymous",
                                workoutVolume
                            });
                        }
                    } else {
                        // Online: award XP via server-authoritative Cloud Function
                        if (xpGain > 0) {
                            try {
                                const awardXP = httpsCallable(firebaseFunctions, 'awardActivityXP');
                                const result = await awardXP({
                                    activityType: col === 'xp_bonus' ? 'workout' : col,
                                    workoutVolume: col === 'workouts' ? workoutVolume : undefined
                                });
                                const { newXp, xpAwarded } = result.data;
                                if (xpAwarded > 0) {
                                    const oldXp = newXp - xpAwarded;
                                    if (Math.floor(oldXp / 500) < Math.floor(newXp / 500)) {
                                        broadcastEvent('level', 'leveled up!', 'Reached ' + newXp + ' XP');
                                    }
                                }
                            } catch (err) {
                                console.error('Server XP award failed:', err.message);
                            }
                        }

                        // Apply Boss Damage based on Workout Volume (server-side)
                        if (col === 'workouts' && workoutVolume > 0 && throttleAction('workout_boss_damage', 10000).allowed) {
                            try {
                                const bossResult = await updateBossProgress(user.uid, user.displayName || "Anonymous", workoutVolume);
                                if (bossResult && !bossResult.defeated) {
                                    broadcastEvent('boss_hit', 'Critical Hit!', `Dealt ${workoutVolume} damage to the Boss!`);
                                } else if (bossResult && bossResult.defeated) {
                                    broadcastEvent('boss_kill', 'Boss Defeated!', `You struck the final blow!`);
                                }
                            } catch (err) {
                                console.error("Failed to apply boss damage:", err);
                            }
                        }
                    }
                }
            } catch (e) { console.error("Write Error", e); }
        } else if (action === 'update') {
            if (!id) return;
            try {
                await setDoc(doc(db, 'users', user.uid, col, id), payload, { merge: true });
            } catch (e) { console.error("Update Error", e); }
        } else if (action === 'delete') { await deleteDoc(doc(db, 'users', user.uid, col, id)); }
    };

    const clearError = useCallback(() => setError(null), []);

    // --- FRIEND SYSTEM CALLABLES ---
    const sendFriendRequest = async (targetUid) => {
        if (!user || !firebaseFunctions) return;
        const fn = httpsCallable(firebaseFunctions, 'sendFriendRequest');
        const result = await fn({ targetUid });
        return result.data;
    };

    const respondFriendRequest = async (requestId, response) => {
        if (!user || !firebaseFunctions) return;
        const fn = httpsCallable(firebaseFunctions, 'respondFriendRequest');
        const result = await fn({ requestId, response });
        return result.data;
    };

    // Return the stable functions and API so existing components don't break immediately
    // Note: To fully benefit from Zustand, components should import `useStore` directly and stop destructuring from this hook.
    return {
        loginAnonymous, recoverWithToken, logout, uploadProfilePic, uploadProgressPhoto,
        sendMessage, toggleFollow, sendPrivateMessage, createPost,
        buyItem, completeDailyDrop, broadcastEvent, createBattle,
        sendFriendRequest, respondFriendRequest,
        isStorageReady, updateData, deleteEntry: (col, id) => updateData('delete', col, null, id),
        refreshData, clearError
    };
}
