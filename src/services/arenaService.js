// Arena Service - All Firebase CRUD operations for Arena tab
import { db, auth } from '../firebase';
import { GAME_BALANCE } from '../utils/constants';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    increment,
    arrayUnion,
    onSnapshot,
    runTransaction
} from 'firebase/firestore';

// ============================================
// USER STATS
// ============================================

/**
 * Get user stats by ID
 * @param {string} userId 
 * @returns {Promise<Object|null>}
 */
export const getUserStats = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            return { id: userSnap.id, ...userSnap.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting user stats:', error);
        throw error;
    }
};

/**
 * Create or update user stats.
 * Always writes to the currently authenticated user's document.
 * @param {Object} userData
 */
export const updateUserStats = async (userData) => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Not authenticated');
        const userId = currentUser.uid;

        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
            ...userData,
            updatedAt: serverTimestamp()
        }, { merge: true });

        // Leaderboard writes are handled by Cloud Functions server-side.
        // Client writes to the leaderboard collection are blocked by Firestore rules.
    } catch (error) {
        console.error('Error updating user stats:', error);
        throw error;
    }
};

/**
 * Initialize a new user with default stats
 * @param {string} userId 
 * @param {string} username 
 * @param {string} avatarUrl - optional custom avatar URL
 */
export const initializeUser = async (userId, username, avatarUrl = null) => {
    const defaultStats = {
        username,
        level: 1,
        xp: 0,
        workoutsCompleted: 0,
        wins: 0,
        losses: 0,
        currentForge: 1,
        longestForge: 1,
        forgeShieldCount: 1, // Start with 1 free shield
        lastLoginAt: serverTimestamp(),
        lastForgeUpdateAt: serverTimestamp(),
        league: 'Iron Novice',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        createdAt: serverTimestamp()
    };

    // initializeUser is called right after auth, so auth.currentUser is set.
    await updateUserStats(defaultStats);
    return defaultStats;
};

/**
 * Check and update daily Forge
 * @param {string} userId
 */
export const checkDailyForge = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return null;

        const userData = userSnap.data();
        const lastLoginAt = userData.lastLoginAt?.toDate() || new Date(0);

        // Use lastForgeUpdateAt (server timestamp) as the reference point for "now"
        // to avoid client clock manipulation. Fall back to lastLoginAt if not set.
        const serverNow = userData.lastForgeUpdateAt?.toDate() || userData.updatedAt?.toDate() || lastLoginAt;

        // Calculate difference in days (ignoring time) using server-derived timestamps
        const today = new Date(serverNow.getFullYear(), serverNow.getMonth(), serverNow.getDate());
        const lastLoginDate = new Date(lastLoginAt.getFullYear(), lastLoginAt.getMonth(), lastLoginAt.getDate());

        const diffTime = Math.abs(today - lastLoginDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let updates = {
            lastLoginAt: serverTimestamp()
        };

        const currentForge = userData.currentForge ?? userData.currentStreak ?? 0;
        const longestForge = userData.longestForge ?? userData.longestStreak ?? 0;
        const forgeShieldCount = userData.forgeShieldCount ?? userData.streakFreezeCount ?? 0;

        if (diffDays === 0) {
            // Already logged in today, do nothing to Forge
        } else if (diffDays === 1) {
            // Logged in consecutive day, increment Forge
            updates.currentForge = increment(1);
            const newForge = currentForge + 1;
            if (newForge > longestForge) {
                updates.longestForge = newForge;
            }
        } else {
            // Missed a day (or more)
            // Check for Forge Shield
            if (forgeShieldCount > 0) {
                // Use shield
                updates.forgeShieldCount = increment(-1);
                // Keep Forge as is (don't increment, don't reset)
            } else {
                // Reset Forge
                updates.currentForge = 1; // Reset to 1 (today counts)
            }
        }

        await updateDoc(userRef, updates);
        return {
            forgeUpdated: diffDays > 0,
            shielded: diffDays > 1 && forgeShieldCount > 0
        };

    } catch (error) {
        console.error('Error checking Forge:', error);
        return null;
    }
};

// Backwards-compat alias
export const checkDailyStreak = checkDailyForge;

// ============================================
// LEADERBOARD
// ============================================

// NOTE: Leaderboard writes are handled server-side by Cloud Functions.
// Client writes to the leaderboard collection are blocked by Firestore security rules.

/**
 * Get top players from leaderboard
 * @param {number} limitCount - Number of players to fetch (default 100)
 * @returns {Promise<Array>}
 */
export const getLeaderboard = async (limitCount = GAME_BALANCE.DEFAULT_LEADERBOARD_LIMIT) => {
    try {
        const q = query(
            collection(db, 'leaderboard'),
            orderBy('xp', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc, index) => ({
            id: doc.id,
            rank: index + 1,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        throw error;
    }
};

/**
 * Subscribe to real-time leaderboard updates
 * @param {number} limitCount 
 * @param {Function} callback 
 * @returns {Function} Unsubscribe function
 */
export const subscribeToLeaderboard = (limitCount, callback) => {
    const q = query(
        collection(db, 'leaderboard'),
        orderBy('xp', 'desc'),
        limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
        const leaderboard = snapshot.docs.map((doc, index) => ({
            id: doc.id,
            rank: index + 1,
            ...doc.data()
        }));
        callback(leaderboard);
    }, (error) => {
        console.error('Leaderboard subscription error:', error);
    });
};

// ============================================
// COMMUNITY BOSS
// ============================================

/**
 * Get current community boss data
 * @returns {Promise<Object|null>}
 */
export const getCommunityBoss = async () => {
    try {
        const bossRef = doc(db, 'community_boss', 'current');
        const bossSnap = await getDoc(bossRef);

        if (bossSnap.exists()) {
            return { id: bossSnap.id, ...bossSnap.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting community boss:', error);
        throw error;
    }
};

/**
 * Subscribe to real-time boss updates
 * @param {Function} callback 
 * @returns {Function} Unsubscribe function
 */
export const subscribeToBoss = (callback) => {
    const bossRef = doc(db, 'community_boss', 'current');

    return onSnapshot(bossRef, (doc) => {
        if (doc.exists()) {
            callback({ id: doc.id, ...doc.data() });
        } else {
            callback(null);
        }
    }, (error) => {
        console.error('Boss subscription error:', error);
    });
};

// NOTE: Community boss writes (updateBossProgress, createCommunityBoss) are handled
// server-side by Cloud Functions. Client writes to the community_boss collection
// are blocked by Firestore security rules.

/**
 * @deprecated Use the submitBossDamage Cloud Function instead.
 * Client-side boss damage is disabled for security.
 */
export const updateBossProgress = async (/* userId, username, damage */) => {
    throw new Error('updateBossProgress is disabled. Use submitBossDamage Cloud Function instead.');
};

/**
 * @deprecated Use the createBoss Cloud Function instead.
 * Client-side boss creation is disabled for security.
 */
export const createCommunityBoss = async (/* bossData */) => {
    throw new Error('createCommunityBoss is disabled. Use createBoss Cloud Function instead.');
};

// ============================================
// BATTLES
// ============================================

/**
 * Create a new battle challenge
 * @param {Object} challenger - { userId, username, xp }
 * @param {Object} opponent - { userId, username, xp }
 * @param {string} battleType - 'ranked' or 'casual'
 * @returns {Promise<string>} Battle ID
 */
export const createBattle = async (challenger, opponent, battleType = 'ranked') => {
    try {
        const battleRef = await addDoc(collection(db, 'battles'), {
            challenger: {
                userId: challenger.userId,
                username: challenger.username,
                photo: challenger.photo || null,
                xp: challenger.xp || 0
            },
            opponent: {
                userId: opponent.userId,
                username: opponent.username,
                photo: opponent.photo || null,
                xp: opponent.xp || 0
            },
            status: 'pending',
            winnerId: null,
            battleType,
            createdAt: serverTimestamp(),
            completedAt: null
        });

        // Battle created
        return battleRef.id;
    } catch (error) {
        console.error('Error creating battle:', error);
        throw error;
    }
};

/**
 * Accept a battle challenge
 * @param {string} battleId 
 */
export const acceptBattle = async (battleId) => {
    try {
        const battleRef = doc(db, 'battles', battleId);
        await updateDoc(battleRef, {
            status: 'active',
            acceptedAt: serverTimestamp()
        });
        // Battle accepted
    } catch (error) {
        console.error('Error accepting battle:', error);
        throw error;
    }
};

/**
 * Decline a battle challenge
 * @param {string} battleId 
 */
export const declineBattle = async (battleId) => {
    try {
        const battleRef = doc(db, 'battles', battleId);
        await updateDoc(battleRef, {
            status: 'declined',
            declinedAt: serverTimestamp()
        });
        // Battle declined
    } catch (error) {
        console.error('Error declining battle:', error);
        throw error;
    }
};

/**
 * @deprecated Use submitBattleWorkout Cloud Function instead.
 * Client-side battle completion is disabled for security.
 * All battle resolution must go through the server-authoritative
 * submitBattleWorkout Cloud Function which validates anti-cheat,
 * calculates Elo, and awards XP atomically.
 */
export const completeBattle = async (/* battleId, winnerId, xpReward */) => {
    throw new Error('completeBattle is disabled. Use submitBattleWorkout Cloud Function instead.');
};

/** @deprecated — preserved for reference only, not callable */
const _legacyCompleteBattle = async (battleId, winnerId, xpReward = GAME_BALANCE.DEFAULT_BATTLE_XP_REWARD) => {
    try {
        const battleRef = doc(db, 'battles', battleId);

        const result = await runTransaction(db, async (transaction) => {
            const battleSnap = await transaction.get(battleRef);
            if (!battleSnap.exists()) throw new Error('Battle not found');

            const battleData = battleSnap.data();
            if (battleData.status === 'completed') throw new Error('Battle already completed');
            if (battleData.status !== 'active') throw new Error('Battle must be active to complete');

            // SECURITY: Verify winnerId is an actual participant
            const challengerId = battleData.challenger.userId;
            const opponentId = battleData.opponent.userId;
            if (winnerId !== challengerId && winnerId !== opponentId) {
                throw new Error('Winner must be a battle participant');
            }

            const loserId = winnerId === challengerId ? opponentId : challengerId;

            const winnerRef = doc(db, 'users', winnerId);
            const loserRef = doc(db, 'users', loserId);

            const loserSnap = await transaction.get(loserRef);
            const currentLoserForge = loserSnap.exists() ? (loserSnap.data().currentForge || 0) : 0;

            // All writes inside the transaction — atomic
            transaction.update(battleRef, {
                status: 'completed',
                winnerId,
                completedAt: serverTimestamp()
            });

            transaction.update(winnerRef, {
                wins: increment(1),
                xp: increment(xpReward),
                currentForge: increment(1)
            });

            // Elo floor: Forge cannot go below 0
            transaction.update(loserRef, {
                losses: increment(1),
                currentForge: Math.max(0, currentLoserForge - 1)
            });

            return { winnerId, loserId, xpReward };
        });

        return result;
    } catch (error) {
        console.error('Error completing battle:', error);
        throw error;
    }
};

/**
 * Get battles for a user
 * @param {string} userId 
 * @param {string} status - 'pending', 'active', 'completed', or 'all'
 * @returns {Promise<Array>}
 */
export const getUserBattles = async (userId, status = 'all') => {
    try {
        let q;

        if (status === 'all') {
            // Get battles where user is challenger or opponent
            const challengerQuery = query(
                collection(db, 'battles'),
                where('challenger.userId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(20)
            );

            const opponentQuery = query(
                collection(db, 'battles'),
                where('opponent.userId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(20)
            );

            const [challengerSnap, opponentSnap] = await Promise.all([
                getDocs(challengerQuery),
                getDocs(opponentQuery)
            ]);

            const battles = [
                ...challengerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                ...opponentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            ];

            // Sort by createdAt and remove duplicates
            return battles
                .filter((battle, index, self) =>
                    index === self.findIndex(b => b.id === battle.id)
                )
                .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
        } else {
            // Query battles with specific status where user is participant
            const challengerQ = query(
                collection(db, 'battles'),
                where('challenger.userId', '==', userId),
                where('status', '==', status),
                orderBy('createdAt', 'desc'),
                limit(20)
            );
            const opponentQ = query(
                collection(db, 'battles'),
                where('opponent.userId', '==', userId),
                where('status', '==', status),
                orderBy('createdAt', 'desc'),
                limit(20)
            );

            const [cSnap, oSnap] = await Promise.all([getDocs(challengerQ), getDocs(opponentQ)]);
            const battles = [
                ...cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                ...oSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            ];
            return battles
                .filter((b, i, self) => i === self.findIndex(x => x.id === b.id))
                .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        }
    } catch (error) {
        console.error('Error getting user battles:', error);
        throw error;
    }
};

/**
 * Subscribe to user's pending battles (incoming challenges)
 * @param {string} userId 
 * @param {Function} callback 
 * @returns {Function} Unsubscribe function
 */
export const subscribeToPendingBattles = (userId, callback) => {
    const q = query(
        collection(db, 'battles'),
        where('opponent.userId', '==', userId),
        where('status', '==', 'pending')
    );

    return onSnapshot(q, (snapshot) => {
        const battles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(battles);
    }, (error) => {
        console.error('Pending battles subscription error:', error);
    });
};

// ============================================
// CHAT / LOCKER ROOM
// ============================================

/**
 * Send a chat message
 * @param {string} userId 
 * @param {string} username 
 * @param {string} message 
 */
export const sendChatMessage = async (userId, username, photo, message) => {
    try {
        // Validate and sanitize message
        if (typeof message !== 'string' || message.trim().length === 0) {
            throw new Error('Message cannot be empty');
        }
        const trimmed = message.trim();
        if (trimmed.length > 2000) {
            throw new Error('Message too long (max 2000 characters)');
        }
        // Strip control characters (keep newlines and tabs)
        const sanitized = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

        await addDoc(collection(db, 'global', 'data', 'chat'), {
            userId,
            username,
            photo,
            message: sanitized,
            timestamp: serverTimestamp()
        });
        // Message sent
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

/**
 * Get recent chat messages
 * @param {number} limitCount 
 * @returns {Promise<Array>}
 */
export const getChatMessages = async (limitCount = 50) => {
    try {
        const q = query(
            collection(db, 'global', 'data', 'chat'),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
    } catch (error) {
        console.error('Error getting chat messages:', error);
        throw error;
    }
};

/**
 * Subscribe to real-time chat messages
 * @param {number} limitCount 
 * @param {Function} callback 
 * @returns {Function} Unsubscribe function
 */
export const subscribeToChatMessages = (limitCount, callback) => {
    const q = query(
        collection(db, 'global', 'data', 'chat'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
        callback(messages);
    }, (error) => {
        console.error('Chat subscription error:', error);
    });
};

// ============================================
// XP & LEVELING
// ============================================

/**
 * Award XP to a user
 * @param {string} userId 
 * @param {number} amount 
 * @param {string} reason 
 */
export const awardXP = async (userId, amount, reason = 'activity') => {
    try {
        const userRef = doc(db, 'users', userId);

        const result = await runTransaction(db, async (transaction) => {
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists()) throw new Error('User not found');

            const userData = userSnap.data();
            const newXP = (userData.xp || 0) + amount;
            const newLevel = calculateLevel(newXP);

            // Cap xpHistory to last 100 entries (stored as array, not unbounded map)
            const xpHistory = Array.isArray(userData.xpHistory) ? userData.xpHistory : [];
            const newEntry = { amount, reason, ts: Date.now() };
            const trimmedHistory = [...xpHistory, newEntry].slice(-100);

            transaction.update(userRef, {
                xp: newXP,
                level: newLevel,
                xpHistory: trimmedHistory
            });

            return { newXP, newLevel, leveledUp: newLevel > (userData.level || 0), userData };
        });

        // Leaderboard is updated server-side by Cloud Functions.
        return { newXP: result.newXP, newLevel: result.newLevel, leveledUp: result.leveledUp };
    } catch (error) {
        console.error('Error awarding XP:', error);
        throw error;
    }
};

/**
 * Calculate level from XP
 * @param {number} xp 
 * @returns {number} Level
 */
export const calculateLevel = (xp) => {
    // XP needed per level: BASE_XP_PER_LEVEL * 1, * 2, * 3... (scales linearly)
    let level = 1;
    let xpNeeded = GAME_BALANCE.BASE_XP_PER_LEVEL;
    let totalXP = 0;

    while (totalXP + xpNeeded <= xp) {
        totalXP += xpNeeded;
        level++;
        xpNeeded = GAME_BALANCE.BASE_XP_PER_LEVEL * level;
    }

    return level;
};

/**
 * Get XP progress within current level
 * @param {number} xp 
 * @returns {Object} { currentLevelXP, xpForNextLevel, progress }
 */
export const getLevelProgress = (xp) => {
    const level = calculateLevel(xp);

    // Calculate XP at start of current level
    let xpAtLevelStart = 0;
    for (let i = 1; i < level; i++) {
        xpAtLevelStart += GAME_BALANCE.BASE_XP_PER_LEVEL * i;
    }

    const currentLevelXP = xp - xpAtLevelStart;
    const xpForNextLevel = GAME_BALANCE.BASE_XP_PER_LEVEL * level;
    const progress = (currentLevelXP / xpForNextLevel) * 100;

    return { currentLevelXP, xpForNextLevel, progress: Math.min(100, progress) };
};


