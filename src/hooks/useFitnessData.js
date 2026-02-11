import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    signInWithCredential
} from 'firebase/auth';
import {
    getFirestore, doc, setDoc, collection, addDoc,
    onSnapshot, query, deleteDoc, orderBy, limit, where
} from 'firebase/firestore';
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from 'firebase/storage';
import { Capacitor } from '@capacitor/core';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export function useFitnessData() {
    const [user, setUser] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [storage, setStorage] = useState(null);
    const [isStorageReady, setIsStorageReady] = useState(false);
    const [profileLoaded, setProfileLoaded] = useState(false); // Track if profile has been fetched from Firestore

    const [data, setData] = useState({
        meals: [], progress: [], burned: [], workouts: [], photos: [],
        profile: {}, // Start with empty object - will be populated from Firestore
        leaderboard: [], chat: [], following: [], posts: [], inbox: [],
        globalFeed: [], battles: []
    });

    const [dataLoaded, setDataLoaded] = useState(false); // True after first Firestore collection snapshot
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firebaseConfig.apiKey) {
            setError("Missing API Key in .env");
            setLoading(false);
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const firestore = getFirestore(app);

            let storageInstance = null;
            if (firebaseConfig.storageBucket) {
                try {
                    storageInstance = getStorage(app);
                    setIsStorageReady(true);
                } catch (e) {
                    console.warn("Storage Init Error:", e);
                }
            }

            setAuth(authInstance);
            setDb(firestore);
            setStorage(storageInstance);

            // Auth state listener — sole source of truth for login state
            const unsubscribe = onAuthStateChanged(authInstance, (u) => {
                console.log('Auth state changed:', u ? u.email : 'null');
                setUser(u);
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    }, []);

    const login = async () => {
        if (!auth) {
            alert('Auth not initialized');
            return;
        }

        try {
            console.log('Attempting Google login...');
            const isNative = Capacitor.isNativePlatform();

            if (isNative) {
                // Native: use Capacitor Firebase Authentication plugin
                // This opens Google's native sign-in UI (not a WebView redirect)
                console.log('Native platform — using native Google Sign-In...');
                const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
                const result = await FirebaseAuthentication.signInWithGoogle();
                // Use the credential to sign in with Firebase JS SDK
                const credential = GoogleAuthProvider.credential(result.credential?.idToken);
                await signInWithCredential(auth, credential);
                console.log('Native Google Sign-In successful');
            } else {
                // Web: use popup (works in normal browsers)
                console.log('Web platform, using popup...');
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
            }
        } catch (e) {
            console.error('Login error:', e);
            if (e.code === 'auth/popup-closed-by-user' || e.message?.includes('canceled')) {
                console.log('Login cancelled by user');
            } else {
                alert('Login Error: ' + (e.message || e.code));
            }
        }
    };

    const logout = async () => {
        if (!auth) return;
        try {
            // Sign out from native Google if on Capacitor
            if (Capacitor.isNativePlatform()) {
                try {
                    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
                    await FirebaseAuthentication.signOut();
                } catch (e) { /* native signout failed, continue with web signout */ }
            }
            await signOut(auth);
            setData(prev => ({ ...prev, meals: [] }));
        } catch (e) { console.error(e); }
    };

    const uploadProfilePic = async (file) => {
        if (!isStorageReady || !user) { alert("Storage not configured."); return; }
        try {
            const storageRef = ref(storage, `users/${user.uid}/profile_${Date.now()}.jpg`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await updateData('add', 'profile', { photoURL: url });
            return url;
        } catch (e) { console.error("Upload failed", e); }
    };

    const uploadProgressPhoto = async (file, note = "") => {
        if (!isStorageReady || !user) return;
        try {
            const storageRef = ref(storage, `users/${user.uid}/progress/${Date.now()}.jpg`);
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
                type, message, details,
                username: user.displayName || "Anonymous",
                userId: user.uid,
                createdAt: new Date()
            });
        } catch (e) { console.error("Broadcast failed", e); }
    };

    const buyItem = async (item, cost) => {
        if (!user || (data.profile.xp || 0) < cost) { alert("Not enough XP!"); return false; }
        try {
            const newXp = (data.profile.xp || 0) - cost;
            const currentInv = data.profile.inventory || [];
            await setDoc(doc(db, 'users', user.uid, 'data', 'profile'), { xp: newXp, inventory: [...currentInv, { item, boughtAt: new Date() }] }, { merge: true });
            return true;
        } catch (e) { console.error("Purchase failed", e); return false; }
    };

    const completeDailyDrop = async (xpReward) => {
        const today = new Date().toISOString().split('T')[0];
        if (data.profile.dailyDrops && data.profile.dailyDrops[today]) return;
        await updateData('add', 'xp_bonus', { amount: xpReward, reason: "Daily Drop" });
        await updateData('add', 'profile', { dailyDrops: { ...data.profile.dailyDrops, [today]: true } });
        broadcastEvent('challenge', 'crushed the Daily Drop!', `+${xpReward} XP`);
    };

    // --- SOCIAL ACTIONS ---
    const sendMessage = async (text) => {
        if (!user || !db || !text.trim()) return;
        try {
            await addDoc(collection(db, 'global', 'data', 'chat'), {
                text: text.trim(), userId: user.uid, username: user.displayName || "Anonymous", photo: user.photoURL, xp: data.profile.xp || 0, createdAt: new Date()
            });
        } catch (e) { console.error("Message failed", e); }
    };

    const sendPrivateMessage = async (targetUserId, text) => {
        if (!user || !db || !text.trim()) return;
        try {
            await addDoc(collection(db, 'users', targetUserId, 'inbox'), {
                text: text.trim(), fromId: user.uid, fromName: user.displayName || "Anonymous", fromPhoto: user.photoURL, createdAt: new Date(), read: false
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
        try {
            const storageRef = ref(storage, `posts/${Date.now()}_${user.uid}.jpg`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await addDoc(collection(db, 'global', 'data', 'posts'), {
                imageUrl: url, caption: caption, userId: user.uid, username: user.displayName || "Anonymous", userPhoto: user.photoURL, xp: data.profile.xp || 0, likes: 0, createdAt: new Date()
            });
            return true;
        } catch (e) { console.error("Post failed", e); return false; }
    };

    // --- BATTLES LOGIC ---
    const createBattle = async (opponentId, opponentName) => {
        if (!user || !db) return;
        await addDoc(collection(db, 'global', 'data', 'battles'), {
            challengerId: user.uid,
            challengerName: user.displayName || "Unknown",
            opponentId,
            opponentName,
            status: 'active', // For this demo, auto-active
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 86400000) // 24h
        });
    };

    // --- DATA LISTENERS ---
    useEffect(() => {
        if (!user || !db) return;
        const uid = user.uid;
        const listeners = [];

        const bind = (key, path, isDoc = false) => {
            const ref = isDoc ? doc(db, 'users', uid, 'data', key) : query(collection(db, 'users', uid, key));
            const leaderboardRef = query(collection(db, 'global', 'data', 'leaderboard'));
            const chatRef = query(collection(db, 'global', 'data', 'chat'), orderBy('createdAt', 'asc'), limit(50));
            const postsRef = query(collection(db, 'global', 'data', 'posts'), orderBy('createdAt', 'desc'), limit(20));
            const feedRef = query(collection(db, 'global', 'data', 'feed'), orderBy('createdAt', 'desc'), limit(50));
            const battlesRef = query(collection(db, 'global', 'data', 'battles'), orderBy('createdAt', 'desc'), limit(20));

            let actualRef = ref;
            if (key === 'leaderboard') actualRef = leaderboardRef;
            if (key === 'chat') actualRef = chatRef;
            if (key === 'posts') actualRef = postsRef;
            if (key === 'globalFeed') actualRef = feedRef;
            if (key === 'battles') actualRef = battlesRef;

            listeners.push(onSnapshot(actualRef, (snap) => {
                if (isDoc) {
                    setData(prev => ({ ...prev, [key]: snap.exists() ? snap.data() : {} }));
                    // Mark profile as loaded once Firestore responds
                    if (key === 'profile') {
                        setProfileLoaded(true);
                    }
                }
                else {
                    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    // Local sort for collections not sorted by query
                    if (key !== 'chat' && key !== 'globalFeed' && key !== 'posts' && key !== 'battles') {
                        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                    }
                    setData(prev => ({ ...prev, [key]: list }));
                }
                // Mark data as loaded after first snapshot from any binding
                setDataLoaded(true);
            }));
        };

        bind('meals'); bind('progress'); bind('burned'); bind('workouts'); bind('photos'); bind('profile', [], true);
        bind('leaderboard'); bind('chat'); bind('posts'); bind('globalFeed'); bind('battles');

        listeners.push(onSnapshot(collection(db, 'users', uid, 'inbox'), (snap) => {
            const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt);
            setData(prev => ({ ...prev, inbox: msgs }));
        }));
        listeners.push(onSnapshot(collection(db, 'users', uid, 'following'), (snap) => {
            setData(prev => ({ ...prev, following: snap.docs.map(d => d.id) }));
        }));

        return () => listeners.forEach(u => u());
    }, [user, db]);

    const updateData = async (action, col, payload, id) => {
        if (!user || !db) return;
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

            try {
                if (col === 'xp_bonus') { /* logic */ }
                else if (col === 'profile') { await setDoc(doc(db, 'users', user.uid, 'data', 'profile'), payload, { merge: true }); }
                else { await addDoc(collection(db, 'users', user.uid, col), docData); }

                // Update XP and Leaderboard
                if (xpGain > 0 || col === 'workouts') {
                    const currentXp = (data.profile.xp || 0) + xpGain;
                    if (xpGain > 0) {
                        await setDoc(doc(db, 'users', user.uid, 'data', 'profile'), { xp: currentXp }, { merge: true });
                    }

                    // Calculate Today's Volume for Leaderboard (Simple Approximation based on just this workout + previous today)
                    // Note: Real-world apps might use Cloud Functions for this.
                    // Here we update it optimistically.
                    let workoutVolume = 0;
                    if (col === 'workouts' && payload.exercises) {
                        payload.exercises.forEach(ex => {
                            ex.sets.forEach(s => { workoutVolume += (parseFloat(s.w) || 0) * (parseFloat(s.r) || 0); });
                        });
                    }

                    const currentEntry = data.leaderboard.find(u => u.userId === user.uid);
                    const currentVolume = currentEntry?.todayVolume || 0;

                    const leaderboardData = {
                        username: user.displayName || "Anonymous",
                        xp: currentXp,
                        userId: user.uid,
                        photo: user.photoURL,
                        todayVolume: col === 'workouts' ? currentVolume + workoutVolume : currentVolume
                    };
                    if (data.profile.photoURL) leaderboardData.photo = data.profile.photoURL;
                    await setDoc(doc(db, 'global', 'data', 'leaderboard', user.uid), leaderboardData, { merge: true });

                    if (xpGain > 0 && Math.floor((currentXp - xpGain) / 500) < Math.floor(currentXp / 500)) {
                        broadcastEvent('level', 'leveled up!', `Reached ${currentXp} XP`);
                    }
                }
            } catch (e) { console.error("Write Error", e); }
        } else if (action === 'delete') { await deleteDoc(doc(db, 'users', user.uid, col, id)); }
    };

    return {
        user, loading, login, logout, profileLoaded, dataLoaded,
        uploadProfilePic, uploadProgressPhoto,
        sendMessage, toggleFollow, sendPrivateMessage, createPost,
        buyItem, completeDailyDrop, broadcastEvent, createBattle, isStorageReady,
        ...data, updateData, deleteEntry: (col, id) => updateData('delete', col, null, id),
        error
    };
}


