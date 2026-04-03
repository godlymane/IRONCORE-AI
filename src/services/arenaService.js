// Arena Service - All Firebase CRUD operations for Arena tab
import { db } from '../firebase';
import { GAME_BALANCE } from '../utils/constants';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    addDoc,
    deleteDoc,
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
 * Create or update user stats
 * @param {string} userId 
 * @param {Object} userData 
 */
export const updateUserStats = async (userId, userData) => {
    try {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
            ...userData,
            updatedAt: serverTimestamp()
        }, { merge: true });

        // Also update leaderboard entry
        await updateLeaderboardEntry(userId, userData);

        // User stats updated
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

    await updateUserStats(userId, defaultStats);
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
        const now = new Date();
        const lastLoginAt = userData.lastLoginAt?.toDate() || new Date(0);

        // Calculate difference in days (ignoring time)
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

/**
 * Update leaderboard entry for a user
 * @param {string} userId 
 * @param {Object} userData 
 */
const updateLeaderboardEntry = async (userId, userData) => {
    try {
        const leaderboardRef = doc(db, 'leaderboard', userId);
        await setDoc(leaderboardRef, {
            username: userData.username,
            xp: userData.xp || 0,
            level: userData.level || 1,
            league: userData.league || 'Iron Novice',
            avatarUrl: userData.avatarUrl || '',
            lastUpdated: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error updating leaderboard entry:', error);
    }
};

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

/**
 * Deal damage to the community boss
 * @param {string} userId 
 * @param {string} username 
 * @param {number} damage 
 */
export const updateBossProgress = async (userId, username, damage) => {
    try {
        const bossRef = doc(db, 'community_boss', 'current');

        return await runTransaction(db, async (transaction) => {
            const bossDoc = await transaction.get(bossRef);
            if (!bossDoc.exists()) {
                console.error("No active community boss to damage.");
                return null;
            }

            const data = bossDoc.data();
            if (data.status === 'defeated') return { newHP: 0, defeated: true };

            const currentHP = data.currentHP || data.totalHP;
            const newHP = Math.max(0, currentHP - damage);
            const isDefeated = newHP === 0;

            const updates = {
                currentHP: newHP,
                lastDamageAt: serverTimestamp()
            };

            if (isDefeated) {
                updates.status = 'defeated';
                updates.defeatedAt = serverTimestamp();
            }

            // Handle Contributors Array safely within transaction
            let contributors = data.contributors || [];
            const existingIndex = contributors.findIndex(c => c.userId === userId);

            if (existingIndex >= 0) {
                contributors[existingIndex].damageDealt += damage;
            } else {
                contributors.push({
                    userId,
                    username,
                    damageDealt: damage,
                    joinedAt: new Date().toISOString(),
                    claimedXP: false
                });
            }
            updates.contributors = contributors;

            transaction.update(bossRef, updates);
            return { newHP, defeated: isDefeated };
        });
    } catch (error) {
        console.error('Error updating Boss HP transaction:', error);
        throw error;
    }
};

/**
 * Create a new community boss
 * @param {Object} bossData 
 */
export const createCommunityBoss = async (bossData) => {
    try {
        const bossRef = doc(db, 'community_boss', 'current');
        const snap = await getDoc(bossRef);

        // Prevent accidental overwrites of an active boss
        if (snap.exists() && snap.data().status === 'active') {
            console.debug("Boss already active, skipping creation.");
            return;
        }

        await setDoc(bossRef, {
            bossId: bossData.bossId || `boss_${Date.now()}`,
            name: bossData.name || "Colossus Prime",
            totalHP: bossData.totalHP || 500000,
            currentHP: bossData.totalHP || 500000,
            contributors: [],
            status: 'active',
            startedAt: serverTimestamp(),
            defeatedAt: null
        });
        // Community boss created
    } catch (error) {
        console.error('Error creating community boss:', error);
        throw error;
    }
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
        await addDoc(collection(db, 'global', 'data', 'chat'), {
            userId,
            username,
            photo,
            message,
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

        // Update leaderboard outside transaction (non-critical)
        await updateLeaderboardEntry(userId, { ...result.userData, xp: result.newXP, level: result.newLevel });

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


