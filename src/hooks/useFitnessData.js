import { useState, useEffect, useCallback, useRef } from 'react';
import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    signInWithCredential
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
import { Capacitor } from '@capacitor/core';
import { db, auth as firebaseAuth, storage as firebaseStorage, isStorageConfigured } from '../firebase';
import { runMigrations, CURRENT_SCHEMA_VERSION } from '../utils/migrations';

// --- Input validation helpers ---
const MAX_MESSAGE_LENGTH = 500;
const MAX_CAPTION_LENGTH = 300;
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

export function useFitnessData() {
    const [user, setUser] = useState(null);
    const [profileLoaded, setProfileLoaded] = useState(false);
    const [profileExists, setProfileExists] = useState(false);
    const listenersRef = useRef([]);

    const [data, setData] = useState({
        meals: [], progress: [], burned: [], workouts: [], photos: [],
        profile: {},
        leaderboard: [], chat: [], following: [], posts: [], inbox: [],
        globalFeed: [], battles: []
    });

    const [dataLoaded, setDataLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    // Use singleton instances from firebase.js (no duplicate init)
    const isStorageReady = isStorageConfigured;

    useEffect(() => {
        if (!db || !firebaseAuth) {
            setError("Firebase not initialized — check .env");
            setLoading(false);
            return;
        }

        // Auth state listener — sole source of truth for login state
        const unsubscribe = onAuthStateChanged(firebaseAuth, (u) => {
            // Auth state changed
            // Seed profile from localStorage so onboarding data shows instantly
            if (u) {
                try {
                    const cached = localStorage.getItem('ironai_profile_' + u.uid);
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        setData(prev => ({ ...prev, profile: { ...parsed, ...prev.profile } }));
                    }
                } catch (e) { /* ignore */ }
            }
            setUser(u);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async () => {
        try {
            const isNative = Capacitor.isNativePlatform();

            if (isNative) {
                const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
                const result = await FirebaseAuthentication.signInWithGoogle();
                const credential = GoogleAuthProvider.credential(result.credential?.idToken);
                await signInWithCredential(firebaseAuth, credential);
            } else {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(firebaseAuth, provider);
            }
        } catch (e) {
            console.error('Login error:', e);
            if (e.code === 'auth/popup-closed-by-user' || e.message?.includes('canceled')) {
                // Login cancelled by user
            } else {
                setError('Login Error: ' + (e.message || e.code));
            }
        }
    };

    const logout = async () => {
        try {
            if (Capacitor.isNativePlatform()) {
                try {
                    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
                    await FirebaseAuthentication.signOut();
                } catch (e) { /* native signout failed, continue with web signout */ }
            }
            const uid = user?.uid;
            await signOut(firebaseAuth);

            // Clear ALL in-memory state (privacy: don't leak data to next user)
            setData({
                meals: [], progress: [], burned: [], workouts: [], photos: [],
                profile: {},
                leaderboard: [], chat: [], following: [], posts: [], inbox: [],
                globalFeed: [], battles: []
            });
            setProfileLoaded(false);
            setProfileExists(false);
            setDataLoaded(false);

            // Clear localStorage caches for this user
            if (uid) {
                try {
                    localStorage.removeItem('ironai_profile_' + uid);
                    localStorage.removeItem('ironai_onboarded_' + uid);
                } catch (e) { /* ignore */ }
            }
        } catch (e) { console.error(e); }
    };

    const uploadProfilePic = async (file) => {
        if (!isStorageReady || !user) { setError("Storage not configured."); return; }
        try {
            const storageRef = ref(firebaseStorage, 'users/' + user.uid + '/profile_' + Date.now() + '.jpg');
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            // Update Firestore profile
            await updateData('add', 'profile', { photoURL: url });
            // Also update localStorage cache so pic persists across restarts
            try {
                const cached = localStorage.getItem('ironai_profile_' + user.uid);
                const profile = cached ? JSON.parse(cached) : {};
                profile.photoURL = url;
                localStorage.setItem('ironai_profile_' + user.uid, JSON.stringify(profile));
            } catch (e) { /* ignore */ }
            return url;
        } catch (e) { console.error("Upload failed", e); }
    };

    const uploadProgressPhoto = async (file, note = "") => {
        if (!isStorageReady || !user) return;
        try {
            const storageRef = ref(firebaseStorage, 'users/' + user.uid + '/progress/' + Date.now() + '.jpg');
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await addDoc(collection(db, 'users', user.uid, 'photos'), { url, date: new Date().toISOString().split('T')[0], createdAt: new Date(), note });
            return true;
        } catch (e) { return false; }
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
                // Check if already claimed today (inside transaction to prevent double-claim)
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

    // --- SOCIAL ACTIONS ---
    const sendMessage = async (text) => {
        const clean = sanitizeText(text, MAX_MESSAGE_LENGTH);
        if (!user || !db || !clean) return;
        try {
            await addDoc(collection(db, 'global', 'data', 'chat'), {
                text: clean, userId: user.uid, username: sanitizeText(user.displayName || "Anonymous", MAX_USERNAME_LENGTH), photo: user.photoURL, xp: data.profile.xp || 0, createdAt: new Date()
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
        if (!user || !db) return;
        const isFollowing = data.following.includes(targetUserId);
        try {
            if (isFollowing) { await deleteDoc(doc(db, 'users', user.uid, 'following', targetUserId)); }
            else { await setDoc(doc(db, 'users', user.uid, 'following', targetUserId), { followedAt: new Date() }); }
        } catch (e) { console.error("Follow toggle failed", e); }
    };

    const createPost = async (file, caption) => {
        if (!isStorageReady || !user || !db) return;
        const cleanCaption = sanitizeText(caption, MAX_CAPTION_LENGTH);
        try {
            const storageRef = ref(firebaseStorage, 'posts/' + Date.now() + '_' + user.uid + '.jpg');
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await addDoc(collection(db, 'global', 'data', 'posts'), {
                imageUrl: url, caption: cleanCaption, userId: user.uid, username: sanitizeText(user.displayName || "Anonymous", MAX_USERNAME_LENGTH), userPhoto: user.photoURL, xp: data.profile.xp || 0, likes: 0, createdAt: new Date()
            });
            return true;
        } catch (e) { console.error("Post failed", e); return false; }
    };

    // --- BATTLES LOGIC ---
    const createBattle = async (opponentId, opponentName) => {
        if (!user || !db || !opponentId) return;
        try {
            await addDoc(collection(db, 'global', 'data', 'battles'), {
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

    // --- DATA LISTENERS with error handlers + refresh support ---
    const onListenerError = useCallback((key) => (err) => {
        console.error('Listener error [' + key + ']:', err.code || err.message);
    }, []);

    const subscribeToData = useCallback((uid) => {
        // Tear down previous listeners
        listenersRef.current.forEach(u => u());
        listenersRef.current = [];

        const push = (unsub) => listenersRef.current.push(unsub);

        const bind = (key, isDoc = false) => {
            let actualRef;
            if (key === 'leaderboard') actualRef = query(collection(db, 'leaderboard'), orderBy('xp', 'desc'), limit(100));
            else if (key === 'chat') actualRef = query(collection(db, 'global', 'data', 'chat'), orderBy('createdAt', 'asc'), limit(50));
            else if (key === 'posts') actualRef = query(collection(db, 'global', 'data', 'posts'), orderBy('createdAt', 'desc'), limit(20));
            else if (key === 'globalFeed') actualRef = query(collection(db, 'global', 'data', 'feed'), orderBy('createdAt', 'desc'), limit(50));
            else if (key === 'battles') actualRef = query(collection(db, 'global', 'data', 'battles'), orderBy('createdAt', 'desc'), limit(20));
            else if (isDoc) actualRef = doc(db, 'users', uid, 'data', key);
            else actualRef = query(collection(db, 'users', uid, key));

            push(onSnapshot(actualRef, (snap) => {
                if (isDoc) {
                    const docData = snap.exists() ? snap.data() : {};
                    setData(prev => ({ ...prev, [key]: docData }));
                    if (key === 'profile') {
                        setProfileLoaded(true);
                        setProfileExists(snap.exists() && Object.keys(docData).length > 0);
                        if (snap.exists() && Object.keys(docData).length > 0) {
                            try { localStorage.setItem('ironai_profile_' + uid, JSON.stringify(docData)); } catch (_) { /* ignore */ }
                        }
                    }
                } else {
                    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    if (key !== 'chat' && key !== 'globalFeed' && key !== 'posts' && key !== 'battles' && key !== 'leaderboard') {
                        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                    }
                    setData(prev => ({ ...prev, [key]: list }));
                }
                setDataLoaded(true);
            }, onListenerError(key)));
        };

        bind('meals'); bind('progress'); bind('burned'); bind('workouts'); bind('photos'); bind('profile', true);
        bind('leaderboard'); bind('chat'); bind('posts'); bind('globalFeed'); bind('battles');

        push(onSnapshot(collection(db, 'users', uid, 'inbox'), (snap) => {
            const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt);
            setData(prev => ({ ...prev, inbox: msgs }));
        }, onListenerError('inbox')));

        push(onSnapshot(collection(db, 'users', uid, 'following'), (snap) => {
            setData(prev => ({ ...prev, following: snap.docs.map(d => d.id) }));
        }, onListenerError('following')));
    }, [onListenerError]);

    // Re-subscribe for pull-to-refresh
    const refreshData = useCallback(() => {
        if (!user || !db) return;
        subscribeToData(user.uid);
    }, [user, subscribeToData]);

    useEffect(() => {
        if (!user || !db) return;
        subscribeToData(user.uid);
        return () => listenersRef.current.forEach(u => u());
    }, [user, subscribeToData]);

    // --- Schema migration runner (runs once after profile + data load) ---
    const migrationRanRef = useRef(false);
    useEffect(() => {
        if (migrationRanRef.current || !user || !db || !profileLoaded || !dataLoaded) return;
        if ((data.profile.schemaVersion || 0) >= CURRENT_SCHEMA_VERSION) return;
        migrationRanRef.current = true;

        runMigrations(
            data.profile,
            { progress: data.progress, meals: data.meals, workouts: data.workouts },
            async (patch) => {
                await setDoc(doc(db, 'users', user.uid, 'data', 'profile'), patch, { merge: true });
            }
        ).then(result => {
            if (result.migrated) {
                // Migrations applied
            }
        }).catch(e => console.error('Migration error:', e));
    }, [user, db, profileLoaded, dataLoaded, data.profile, data.progress, data.meals, data.workouts]);

    const updateData = async (action, col, payload, id) => {
        if (!user || !db) return;
        // Validate payload to prevent prototype pollution
        if (payload && !validatePayload(payload)) {
            console.error('Invalid payload rejected');
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        const timestamp = new Date();
        let xpGain = 0;

        if (action === 'add') {
            if (col === 'meals') xpGain = 10;
            if (col === 'workouts') xpGain = 50;
            if (col === 'progress') xpGain = 20;
            if (col === 'xp_bonus') xpGain = payload.amount;
            if (col === 'burned') xpGain = 15;

            const docData = { ...payload, date: today, createdAt: timestamp, userId: user.uid };

            // Bounds-check workout volume values
            if (col === 'workouts' && payload.exercises) {
                payload.exercises.forEach(ex => {
                    if (ex.sets) {
                        ex.sets.forEach(s => {
                            s.w = Math.max(0, Math.min(2000, parseFloat(s.w) || 0));
                            s.r = Math.max(0, Math.min(1000, parseFloat(s.r) || 0));
                        });
                    }
                });
            }

            try {
                if (col === 'xp_bonus') { /* logic */ }
                else if (col === 'profile') { await setDoc(doc(db, 'users', user.uid, 'data', 'profile'), payload, { merge: true }); }
                else { await addDoc(collection(db, 'users', user.uid, col), docData); }

                // Update XP atomically via transaction + update leaderboard
                if (xpGain > 0 || col === 'workouts') {
                    const profileRef = doc(db, 'users', user.uid, 'data', 'profile');
                    let newXp = 0;
                    let oldXp = 0;

                    if (xpGain > 0) {
                        await runTransaction(db, async (txn) => {
                            const snap = await txn.get(profileRef);
                            const current = snap.exists() ? snap.data() : {};
                            oldXp = current.xp || 0;
                            newXp = oldXp + xpGain;
                            txn.set(profileRef, { xp: newXp }, { merge: true });
                        });
                    } else {
                        newXp = data.profile.xp || 0;
                        oldXp = newXp;
                    }

                    // Leaderboard volume calculation
                    let workoutVolume = 0;
                    if (col === 'workouts' && payload.exercises) {
                        payload.exercises.forEach(ex => {
                            ex.sets.forEach(s => { workoutVolume += (parseFloat(s.w) || 0) * (parseFloat(s.r) || 0); });
                        });
                    }

                    const currentEntry = data.leaderboard.find(u => u.userId === user.uid);
                    const currentVolume = currentEntry?.todayVolume || 0;

                    const leaderboardData = {
                        username: sanitizeText(user.displayName || "Anonymous", MAX_USERNAME_LENGTH),
                        xp: newXp,
                        userId: user.uid,
                        photo: data.profile.photoURL || user.photoURL,
                        todayVolume: col === 'workouts' ? currentVolume + workoutVolume : currentVolume
                    };
                    await setDoc(doc(db, 'leaderboard', user.uid), leaderboardData, { merge: true });

                    if (xpGain > 0 && Math.floor(oldXp / 500) < Math.floor(newXp / 500)) {
                        broadcastEvent('level', 'leveled up!', 'Reached ' + newXp + ' XP');
                    }
                }
            } catch (e) { console.error("Write Error", e); }
        } else if (action === 'update') {
            // Update an existing document (merge)
            if (!id) return;
            try {
                await setDoc(doc(db, 'users', user.uid, col, id), payload, { merge: true });
            } catch (e) { console.error("Update Error", e); }
        } else if (action === 'delete') { await deleteDoc(doc(db, 'users', user.uid, col, id)); }
    };

    const clearError = useCallback(() => setError(null), []);

    return {
        user, loading, login, logout, profileLoaded, profileExists, dataLoaded,
        uploadProfilePic, uploadProgressPhoto,
        sendMessage, toggleFollow, sendPrivateMessage, createPost,
        buyItem, completeDailyDrop, broadcastEvent, createBattle, isStorageReady,
        ...data, updateData, deleteEntry: (col, id) => updateData('delete', col, null, id),
        refreshData, error, clearError
    };
}
