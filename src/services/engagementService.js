/**
 * Engagement Service - Firebase operations for engagement features
 */
import {
    doc, setDoc, getDoc, collection, query, where, orderBy,
    limit, onSnapshot, updateDoc, increment, arrayUnion, arrayRemove,
    addDoc, getDocs, serverTimestamp
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import {
    getStreakMultiplier, getStreakMilestone, getDailyReward,
    getRandomMysteryReward, getRandomPremiumReward, getGuildLevel
} from '../data/engagementData';

// ============================================
// STREAK FUNCTIONS
// ============================================

/**
 * Calculate and update user's streak based on activity
 */
export const calculateStreak = async (db, userId, workoutDates) => {
    if (!db || !userId) return { streak: 0, multiplier: 1 };

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const sortedDates = [...new Set(workoutDates)].sort().reverse();

    let streak = 0;

    // Check if user worked out today or yesterday
    if (sortedDates.includes(today)) {
        streak = 1;
        // Count consecutive days backward
        let checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - 1);

        while (sortedDates.includes(checkDate.toISOString().split('T')[0])) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
    } else if (sortedDates.includes(yesterday)) {
        // User can still save streak today - grace period
        streak = 1;
        let checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - 2);

        while (sortedDates.includes(checkDate.toISOString().split('T')[0])) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
    }

    const multiplier = getStreakMultiplier(streak);
    const milestone = getStreakMilestone(streak);

    // Update streak in profile
    try {
        await setDoc(doc(db, 'users', userId, 'data', 'profile'), {
            currentStreak: streak,
            streakMultiplier: multiplier,
            lastStreakUpdate: new Date().toISOString(),
        }, { merge: true });
    } catch (e) {
        console.error('Error updating streak:', e);
    }

    return { streak, multiplier, milestone };
};

/**
 * Activate streak shield for user
 */
export const activateStreakShield = async (db, userId) => {
    if (!db || !userId) return false;

    try {
        const profileRef = doc(db, 'users', userId, 'data', 'profile');
        const profile = await getDoc(profileRef);
        const data = profile.data() || {};

        // Check if user has a shield available
        const shields = data.streakShields || 0;
        if (shields <= 0) return { success: false, message: 'No shields available' };

        await updateDoc(profileRef, {
            streakShields: increment(-1),
            shieldActiveUntil: new Date(Date.now() + 86400000).toISOString(),
        });

        return { success: true, message: 'Shield activated for 24 hours!' };
    } catch (e) {
        console.error('Error activating shield:', e);
        return { success: false, message: 'Failed to activate shield' };
    }
};

/**
 * Check if user has active shield
 */
export const hasActiveShield = (profile) => {
    if (!profile?.shieldActiveUntil) return false;
    return new Date(profile.shieldActiveUntil) > new Date();
};

// ============================================
// DAILY REWARDS FUNCTIONS
// ============================================

/**
 * Claim daily reward
 */
export const claimDailyReward = async (db, userId, profile) => {
    if (!db || !userId) return { success: false };

    const today = new Date().toISOString().split('T')[0];
    const claimedDays = profile?.dailyRewardsClaimed || {};

    // Check if already claimed today
    if (claimedDays[today]) {
        return { success: false, message: 'Already claimed today!' };
    }

    // Get current month and day
    const dayOfMonth = new Date().getDate();
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Check if month changed - reset claim count
    const lastClaimMonth = profile?.lastRewardMonth;
    let currentDayIndex = profile?.rewardDayIndex || 0;

    if (lastClaimMonth !== currentMonth) {
        currentDayIndex = 0;
    }

    // Get reward for current day index
    const reward = getDailyReward(currentDayIndex + 1);
    let rewardResult = { ...reward };

    // Process reward based on type
    try {
        const profileRef = doc(db, 'users', userId, 'data', 'profile');

        switch (reward.type) {
            case 'xp':
                await updateDoc(profileRef, {
                    xp: increment(reward.amount),
                    [`dailyRewardsClaimed.${today}`]: true,
                    rewardDayIndex: currentDayIndex + 1,
                    lastRewardMonth: currentMonth,
                });
                break;

            case 'item':
                const itemKey = reward.item === 'streak_freeze' ? 'streakShields' :
                    reward.item === 'double_xp' ? 'doubleXPTokens' : 'inventory';
                await updateDoc(profileRef, {
                    [itemKey]: increment(reward.quantity || 1),
                    [`dailyRewardsClaimed.${today}`]: true,
                    rewardDayIndex: currentDayIndex + 1,
                    lastRewardMonth: currentMonth,
                });
                break;

            case 'mystery':
                const mysteryReward = getRandomMysteryReward();
                rewardResult = { ...reward, actualReward: mysteryReward };
                if (mysteryReward.type === 'xp') {
                    await updateDoc(profileRef, {
                        xp: increment(mysteryReward.amount),
                        [`dailyRewardsClaimed.${today}`]: true,
                        rewardDayIndex: currentDayIndex + 1,
                        lastRewardMonth: currentMonth,
                    });
                } else {
                    const itemKey = mysteryReward.item === 'streak_freeze' ? 'streakShields' : 'doubleXPTokens';
                    await updateDoc(profileRef, {
                        [itemKey]: increment(1),
                        [`dailyRewardsClaimed.${today}`]: true,
                        rewardDayIndex: currentDayIndex + 1,
                        lastRewardMonth: currentMonth,
                    });
                }
                break;

            case 'premium':
                const premiumReward = getRandomPremiumReward();
                rewardResult = { ...reward, actualReward: premiumReward };
                if (premiumReward.type === 'xp') {
                    await updateDoc(profileRef, {
                        xp: increment(premiumReward.amount),
                        [`dailyRewardsClaimed.${today}`]: true,
                        rewardDayIndex: currentDayIndex + 1,
                        lastRewardMonth: currentMonth,
                    });
                } else {
                    await updateDoc(profileRef, {
                        inventory: arrayUnion({ item: premiumReward.item, receivedAt: new Date() }),
                        [`dailyRewardsClaimed.${today}`]: true,
                        rewardDayIndex: currentDayIndex + 1,
                        lastRewardMonth: currentMonth,
                    });
                }
                break;
        }

        return { success: true, reward: rewardResult };
    } catch (e) {
        console.error('Error claiming daily reward:', e);
        return { success: false, message: 'Failed to claim reward' };
    }
};

/**
 * Get daily rewards status for UI
 */
export const getDailyRewardsStatus = (profile) => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);

    const claimedDays = profile?.dailyRewardsClaimed || {};
    const lastClaimMonth = profile?.lastRewardMonth;
    let dayIndex = profile?.rewardDayIndex || 0;

    // Reset if month changed
    if (lastClaimMonth !== currentMonth) {
        dayIndex = 0;
    }

    const canClaimToday = !claimedDays[today];
    const nextReward = getDailyReward(dayIndex + 1);

    // Count claimed days this month
    const thisMonthClaims = Object.keys(claimedDays).filter(date =>
        date.startsWith(currentMonth)
    ).length;

    return {
        canClaimToday,
        nextReward,
        dayIndex,
        thisMonthClaims,
        claimedDays,
    };
};

// ============================================
// GUILD FUNCTIONS
// ============================================

/**
 * Create a new guild
 */
export const createGuild = async (db, userId, guildData) => {
    if (!db || !userId) return { success: false };

    const { name, emblem, bio } = guildData;

    try {
        // Generate invite code
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const guildRef = await addDoc(collection(db, 'guilds'), {
            name,
            emblem: emblem || '✊',
            bio: bio || '',
            inviteCode,
            leaderId: userId,
            members: [userId],
            totalXP: 0,
            level: 1,
            weeklyGoal: null,
            weeklyGoalProgress: 0,
            createdAt: serverTimestamp(),
        });

        // Update user's profile with guild
        await updateDoc(doc(db, 'users', userId, 'data', 'profile'), {
            guildId: guildRef.id,
            guildRole: 'leader',
        });

        return { success: true, guildId: guildRef.id, inviteCode };
    } catch (e) {
        console.error('Error creating guild:', e);
        return { success: false, message: 'Failed to create guild' };
    }
};

/**
 * Join a guild by invite code
 */
export const joinGuild = async (db, userId, inviteCode) => {
    if (!db || !userId || !inviteCode) return { success: false };

    try {
        const guildsQuery = query(
            collection(db, 'guilds'),
            where('inviteCode', '==', inviteCode.toUpperCase())
        );
        const snapshot = await getDocs(guildsQuery);

        if (snapshot.empty) {
            return { success: false, message: 'Invalid invite code' };
        }

        const guildDoc = snapshot.docs[0];
        const guildData = guildDoc.data();
        const guildLevel = getGuildLevel(guildData.totalXP);

        if (guildData.members.length >= guildLevel.maxMembers) {
            return { success: false, message: 'Guild is full' };
        }

        // Add user to guild
        await updateDoc(doc(db, 'guilds', guildDoc.id), {
            members: arrayUnion(userId),
        });

        // Update user profile
        await updateDoc(doc(db, 'users', userId, 'data', 'profile'), {
            guildId: guildDoc.id,
            guildRole: 'member',
        });

        return { success: true, guildId: guildDoc.id, guildName: guildData.name };
    } catch (e) {
        console.error('Error joining guild:', e);
        return { success: false, message: 'Failed to join guild' };
    }
};

/**
 * Leave current guild
 */
export const leaveGuild = async (db, userId, guildId) => {
    if (!db || !userId || !guildId) return { success: false };

    try {
        await updateDoc(doc(db, 'guilds', guildId), {
            members: arrayRemove(userId),
        });

        await updateDoc(doc(db, 'users', userId, 'data', 'profile'), {
            guildId: null,
            guildRole: null,
        });

        return { success: true };
    } catch (e) {
        console.error('Error leaving guild:', e);
        return { success: false, message: 'Failed to leave guild' };
    }
};

/**
 * Contribute XP to guild
 */
export const contributeToGuild = async (db, guildId, xpAmount) => {
    if (!db || !guildId || !xpAmount) return;

    try {
        await updateDoc(doc(db, 'guilds', guildId), {
            totalXP: increment(xpAmount),
        });
    } catch (e) {
        console.error('Error contributing to guild:', e);
    }
};

/**
 * Subscribe to guild data
 */
export const subscribeToGuild = (db, guildId, callback) => {
    if (!db || !guildId) return () => { };

    return onSnapshot(doc(db, 'guilds', guildId), (snapshot) => {
        if (snapshot.exists()) {
            callback({ id: snapshot.id, ...snapshot.data() });
        } else {
            callback(null);
        }
    }, (err) => console.error('Guild listener error:', err.code || err.message));
};

/**
 * Get guild leaderboard
 */
export const subscribeToGuildLeaderboard = (db, limit_count = 20, callback) => {
    if (!db) return () => { };

    const q = query(
        collection(db, 'guilds'),
        orderBy('totalXP', 'desc'),
        limit(limit_count)
    );

    return onSnapshot(q, (snapshot) => {
        const guilds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(guilds);
    }, (err) => console.error('Guild leaderboard listener error:', err.code || err.message));
};

// ============================================
// TOURNAMENT FUNCTIONS
// ============================================

/**
 * Get current tournament data
 */
export const getCurrentTournament = async (db) => {
    if (!db) return null;

    try {
        const tournamentRef = doc(db, 'global', 'tournament');
        const snapshot = await getDoc(tournamentRef);

        if (snapshot.exists()) {
            return snapshot.data();
        }

        return null;
    } catch (e) {
        console.error('Error getting tournament:', e);
        return null;
    }
};

/**
 * Subscribe to tournament leaderboard
 */
export const subscribeToTournament = (db, callback) => {
    if (!db) return () => { };

    return onSnapshot(doc(db, 'global', 'tournament'), (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data());
        } else {
            callback(null);
        }
    }, (err) => console.error('Tournament listener error:', err.code || err.message));
};

/**
 * Update tournament entry
 */
export const updateTournamentEntry = async (db, userId, username, value, metric) => {
    if (!db || !userId) return;

    try {
        await setDoc(doc(db, 'global', 'tournament', 'entries', userId), {
            userId,
            username,
            [metric]: increment(value),
            lastUpdated: serverTimestamp(),
        }, { merge: true });
    } catch (e) {
        console.error('Error updating tournament entry:', e);
    }
};

// ============================================
// NOTIFICATION FUNCTIONS
// ============================================

/**
 * Create a notification for user
 */
export const createNotification = async (db, userId, notification) => {
    if (!db || !userId) return;

    try {
        await addDoc(collection(db, 'users', userId, 'notifications'), {
            ...notification,
            read: false,
            createdAt: serverTimestamp(),
        });
    } catch (e) {
        console.error('Error creating notification:', e);
    }
};

/**
 * Mark notification as read
 */
export const markNotificationRead = async (db, userId, notificationId) => {
    if (!db || !userId || !notificationId) return;

    try {
        await updateDoc(doc(db, 'users', userId, 'notifications', notificationId), {
            read: true,
        });
    } catch (e) {
        console.error('Error marking notification read:', e);
    }
};

/**
 * Subscribe to user notifications
 */
export const subscribeToNotifications = (db, userId, callback) => {
    if (!db || !userId) return () => { };

    const q = query(
        collection(db, 'users', userId, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(50)
    );

    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(notifications);
    }, (err) => console.error('Notifications listener error:', err.code || err.message));
};

export default {
    calculateStreak,
    activateStreakShield,
    hasActiveShield,
    claimDailyReward,
    getDailyRewardsStatus,
    createGuild,
    joinGuild,
    leaveGuild,
    contributeToGuild,
    subscribeToGuild,
    subscribeToGuildLeaderboard,
    getCurrentTournament,
    subscribeToTournament,
    updateTournamentEntry,
    createNotification,
    markNotificationRead,
    subscribeToNotifications,
};


