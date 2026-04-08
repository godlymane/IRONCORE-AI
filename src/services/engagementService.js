/**
 * Engagement Service - Firebase operations for engagement features
 */
import {
    doc, setDoc, getDoc, collection, query, where, orderBy,
    limit, onSnapshot, updateDoc, increment, arrayUnion,
    addDoc, getDocs, serverTimestamp
} from 'firebase/firestore';
import {
    getForgeMultiplier, getForgeMilestone, getDailyReward,
    getRandomMysteryReward, getRandomPremiumReward, getGuildLevel
} from '../data/engagementData';

// ============================================
// FORGE FUNCTIONS
// ============================================

/**
 * Calculate and update user's Forge based on activity
 */
export const calculateForge = async (db, userId, workoutDates) => {
    if (!db || !userId) return { forge: 0, multiplier: 1 };

    // Normalize to local date strings (YYYY-MM-DD) to avoid UTC/DST issues
    const toLocalDateStr = (d) => {
        const dt = new Date(d);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };

    const now = new Date();
    const today = toLocalDateStr(now);
    const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterday = toLocalDateStr(yesterdayDate);
    const sortedDates = [...new Set(workoutDates)].sort().reverse();

    let forge = 0;

    // Check if user worked out today or yesterday
    if (sortedDates.includes(today)) {
        forge = 1;
        // Count consecutive days backward using date-only arithmetic
        let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

        while (sortedDates.includes(toLocalDateStr(checkDate))) {
            forge++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
    } else if (sortedDates.includes(yesterday)) {
        // User can still save Forge today - grace period
        forge = 1;
        let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);

        while (sortedDates.includes(toLocalDateStr(checkDate))) {
            forge++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
    }

    const multiplier = getForgeMultiplier(forge);
    const milestone = getForgeMilestone(forge);

    // Update Forge in profile
    try {
        await setDoc(doc(db, 'users', userId, 'data', 'profile'), {
            currentForge: forge,
            forgeMultiplier: multiplier,
            lastForgeUpdate: new Date().toISOString(),
        }, { merge: true });
    } catch (e) {
        console.error('Error updating Forge:', e);
    }

    return { forge, multiplier, milestone };
};

// Backwards-compat alias
export const calculateStreak = calculateForge;

/**
 * Activate Forge Shield for user
 */
export const activateForgeShield = async (db, userId) => {
    if (!db || !userId) return false;

    try {
        const profileRef = doc(db, 'users', userId, 'data', 'profile');
        const profile = await getDoc(profileRef);
        const data = profile.data() || {};

        // Check if user has a shield available
        const shields = data.forgeShields ?? data.streakShields ?? 0;
        if (shields <= 0) return { success: false, message: 'No shields available' };

        await updateDoc(profileRef, {
            forgeShields: increment(-1),
            shieldActiveUntil: new Date(Date.now() + 86400000).toISOString(),
        });

        return { success: true, message: 'Forge Shield activated for 24 hours!' };
    } catch (e) {
        console.error('Error activating Forge Shield:', e);
        return { success: false, message: 'Failed to activate shield' };
    }
};

// Backwards-compat alias
export const activateStreakShield = activateForgeShield;

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
                const itemKey = (reward.item === 'forge_shield' || reward.item === 'streak_freeze') ? 'forgeShields' :
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
                    const itemKey = (mysteryReward.item === 'forge_shield' || mysteryReward.item === 'streak_freeze') ? 'forgeShields' : 'doubleXPTokens';
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
 * Create a new guild — DELEGATES to guildService (single source of truth).
 * Kept for backward compat with EngagementContext's (db, userId, data) signature.
 */
export const createGuild = async (db, userId, guildData) => {
    if (!db || !userId) return { success: false };
    try {
        const { createGuild: _create } = await import('./guildService');
        const { name, emblem, bio } = guildData;
        const guildId = await _create(name, bio || '', { userId, username: guildData.username || '' }, {
            tag: guildData.tag || '',
            focusType: guildData.focusType || 'Mixed',
            membershipType: guildData.membershipType || 'Open',
        });
        return { success: true, guildId };
    } catch (e) {
        console.error('Error creating guild:', e);
        return { success: false, message: e.message || 'Failed to create guild' };
    }
};

/**
 * Join a guild — DELEGATES to guildService.
 */
export const joinGuild = async (db, userId, inviteCode) => {
    if (!db || !userId || !inviteCode) return { success: false };
    try {
        const { joinGuildByInvite } = await import('./guildService');
        if (joinGuildByInvite) {
            await joinGuildByInvite(inviteCode, { userId });
        }
        return { success: true };
    } catch (e) {
        console.error('Error joining guild:', e);
        return { success: false, message: e.message || 'Failed to join guild' };
    }
};

/**
 * Leave current guild — DELEGATES to guildService.
 */
export const leaveGuild = async (db, userId, guildId) => {
    if (!db || !userId || !guildId) return { success: false };
    try {
        const { leaveGuild: _leave } = await import('./guildService');
        await _leave(guildId, userId);
        return { success: true };
    } catch (e) {
        console.error('Error leaving guild:', e);
        return { success: false, message: e.message || 'Failed to leave guild' };
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
 * Get current tournament data — delegates to tournamentService (single source of truth).
 * The `db` parameter is accepted for backward compat but ignored.
 */
export const getCurrentTournament = async (db) => {
    try {
        const { getCurrentTournament: _getCurrent } = await import('./tournamentService');
        return await _getCurrent();
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
        // Write entry into the main tournament doc's entries array (not a subcollection)
        // so subscribeToTournament can read it from doc('global/tournament').entries
        const tournamentRef = doc(db, 'global', 'tournament');
        const { runTransaction: _rt } = await import('firebase/firestore');
        await _rt(db, async (transaction) => {
            const snap = await transaction.get(tournamentRef);
            const data = snap.exists() ? snap.data() : { entries: [] };
            const entries = Array.isArray(data.entries) ? data.entries : [];
            const idx = entries.findIndex(e => e.userId === userId);
            const entry = {
                userId,
                username,
                score: value,
                metric,
                updatedAt: new Date().toISOString()
            };
            if (idx >= 0) {
                entries[idx] = entry;
            } else {
                entries.push(entry);
            }
            transaction.set(tournamentRef, { ...data, entries }, { merge: true });
        });
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
 * Schedule a local notification with proper permission checks (Android 13+).
 * Uses Capacitor LocalNotifications plugin when available; falls back gracefully.
 */
export const scheduleLocalNotification = async ({ id, title, body, scheduleAt }) => {
    try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const permResult = await LocalNotifications.checkPermissions();
        if (permResult.display !== 'granted') {
            const reqResult = await LocalNotifications.requestPermissions();
            if (reqResult.display !== 'granted') return;
        }
        await LocalNotifications.schedule({
            notifications: [{
                id: id || Date.now(),
                title,
                body,
                schedule: scheduleAt ? { at: new Date(scheduleAt) } : undefined,
            }],
        });
    } catch (err) {
        console.warn('Notification scheduling failed:', err);
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
    calculateForge,
    calculateStreak,
    activateForgeShield,
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
    scheduleLocalNotification,
    markNotificationRead,
    subscribeToNotifications,
};


