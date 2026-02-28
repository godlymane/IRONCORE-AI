// Arena Service - All Firebase CRUD operations for Arena tab
import { db } from '../firebase';
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
        currentStreak: 1,
        longestStreak: 1,
        streakFreezeCount: 1, // Start with 1 free freeze
        lastLoginAt: serverTimestamp(),
        lastStreakUpdateAt: serverTimestamp(),
        league: 'Iron Novice',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        createdAt: serverTimestamp()
    };

    await updateUserStats(userId, defaultStats);
    return defaultStats;
};

/**
 * Check and update daily streak
 * @param {string} userId 
 */
export const checkDailyStreak = async (userId) => {
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

        if (diffDays === 0) {
            // Already logged in today, do nothing to streak
        } else if (diffDays === 1) {
            // Logged in consecutive day, increment streak
            updates.currentStreak = increment(1);
            // Check if this beats longest streak (needs to be checked after update or optimistically)
            // We'll trust Firestore atomic increment for now, but to be precise we might need a transaction
            // For simplicity:
            const newStreak = (userData.currentStreak || 0) + 1;
            if (newStreak > (userData.longestStreak || 0)) {
                updates.longestStreak = newStreak;
            }
        } else {
            // Missed a day (or more)
            // Check for streak freeze
            if (userData.streakFreezeCount > 0) {
                // Use freeze
                updates.streakFreezeCount = increment(-1);
                // Keep streak as is (don't increment, don't reset)
                // Streak freeze used
            } else {
                // Reset streak
                updates.currentStreak = 1; // Reset to 1 (today counts)
            }
        }

        await updateDoc(userRef, updates);
        return {
            streakUpdated: diffDays > 0,
            frozen: diffDays > 1 && userData.streakFreezeCount > 0
        };

    } catch (error) {
        console.error('Error checking streak:', error);
        return null;
    }
};

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
export const getLeaderboard = async (limitCount = 100) => {
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
            console.log("Boss already active, skipping creation.");
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
 * Complete a battle and record the winner
 * @param {string} battleId 
 * @param {string} winnerId 
 * @param {number} xpReward - XP awarded to winner
 */
export const completeBattle = async (battleId, winnerId, xpReward = 100) => {
    try {
        const battleRef = doc(db, 'battles', battleId);
        const battleSnap = await getDoc(battleRef);

        if (!battleSnap.exists()) {
            throw new Error('Battle not found');
        }

        const battleData = battleSnap.data();
        const loserId = winnerId === battleData.challenger.userId
            ? battleData.opponent.userId
            : battleData.challenger.userId;

        // Update battle status
        await updateDoc(battleRef, {
            status: 'completed',
            winnerId,
            completedAt: serverTimestamp()
        });

        // Update winner stats
        const winnerRef = doc(db, 'users', winnerId);
        await updateDoc(winnerRef, {
            wins: increment(1),
            xp: increment(xpReward),
            currentStreak: increment(1)
        });

        // Update loser stats
        const loserRef = doc(db, 'users', loserId);
        await updateDoc(loserRef, {
            losses: increment(1),
            currentStreak: 0
        });

        // Battle completed
        return { winnerId, loserId, xpReward };
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
            q = query(
                collection(db, 'battles'),
                where('status', '==', status),
                orderBy('createdAt', 'desc'),
                limit(20)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            throw new Error('User not found');
        }

        const userData = userSnap.data();
        const newXP = (userData.xp || 0) + amount;
        const newLevel = calculateLevel(newXP);

        await updateDoc(userRef, {
            xp: newXP,
            level: newLevel,
            [`xpHistory.${Date.now()}`]: { amount, reason }
        });

        // Update leaderboard
        await updateLeaderboardEntry(userId, { ...userData, xp: newXP, level: newLevel });

        // XP awarded
        return { newXP, newLevel, leveledUp: newLevel > userData.level };
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
    // XP needed per level: 100, 200, 300, 400... (100 * level)
    let level = 1;
    let xpNeeded = 100;
    let totalXP = 0;

    while (totalXP + xpNeeded <= xp) {
        totalXP += xpNeeded;
        level++;
        xpNeeded = 100 * level;
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
        xpAtLevelStart += 100 * i;
    }

    const currentLevelXP = xp - xpAtLevelStart;
    const xpForNextLevel = 100 * level;
    const progress = (currentLevelXP / xpForNextLevel) * 100;

    return { currentLevelXP, xpForNextLevel, progress: Math.min(100, progress) };
};


