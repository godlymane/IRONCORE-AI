/**
 * Engagement Context - Central state management for engagement features
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

import {
    calculateForge,
    activateForgeShield,
    hasActiveShield,
    claimDailyReward,
    getDailyRewardsStatus,
    createGuild,
    joinGuild,
    leaveGuild,
    subscribeToGuild,
    subscribeToGuildLeaderboard,
    subscribeToTournament,
    subscribeToNotifications,
    markNotificationRead,
} from '../services/engagementService';

import {
    getForgeMultiplier,
    getForgeMilestone,
    getCurrentTournamentType,
    getTournamentEndTime,
} from '../data/engagementData';

const EngagementContext = createContext(null);

export const EngagementProvider = ({ children, user, db, profile, workouts }) => {
    // Forge state
    const [forge, setForge] = useState({
        current: 0,
        multiplier: 1,
        multiplierLabel: '',
        hasShield: false,
        shieldsAvailable: 0,
        nextMilestone: null,
    });

    // Daily rewards state
    const [dailyRewards, setDailyRewards] = useState({
        canClaim: false,
        nextReward: null,
        dayIndex: 0,
        thisMonthClaims: 0,
        claimedDays: {},
    });

    // Guild state
    const [guild, setGuild] = useState(null);
    const [guildLeaderboard, setGuildLeaderboard] = useState([]);

    // Tournament state
    const [tournament, setTournament] = useState({
        type: null,
        endTime: null,
        leaderboard: [],
        userRank: null,
        userScore: 0,
    });

    // Notifications state
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Loading states
    const [loading, setLoading] = useState({
        streak: true,
        dailyRewards: true,
        guild: true,
        tournament: true,
        notifications: true,
    });

    // Calculate Forge when workouts change
    useEffect(() => {
        if (!db || !user?.uid || !workouts) return;
        let isMounted = true;

        const workoutDates = workouts.map(w => {
            const d = w.createdAt?.seconds
                ? new Date(w.createdAt.seconds * 1000)
                : new Date(w.createdAt || w.date);
            return d.toISOString().split('T')[0];
        });

        calculateForge(db, user.uid, workoutDates).then(result => {
            if (!isMounted) return;
            const multiplier = getForgeMultiplier(result.forge ?? result.streak);
            const nextMilestoneDay = [7, 14, 30, 60, 100, 365].find(d => d > (result.forge ?? result.streak));

            setForge({
                current: result.forge ?? result.streak,
                multiplier,
                multiplierLabel: multiplier > 1 ? `${Math.round((multiplier - 1) * 100)}% Bonus` : '',
                hasShield: hasActiveShield(profile),
                shieldsAvailable: profile?.forgeShields ?? profile?.streakShields ?? 0,
                nextMilestone: nextMilestoneDay,
                milestone: result.milestone,
            });
            setLoading(prev => ({ ...prev, streak: false }));
        }).catch(err => {
            if (!isMounted) return;
            console.warn('Forge calculation failed:', err.message);
            setLoading(prev => ({ ...prev, streak: false }));
        });
        return () => { isMounted = false; };
    }, [db, user?.uid, workouts, profile]);

    // Update daily rewards status
    useEffect(() => {
        if (!profile) return;

        const status = getDailyRewardsStatus(profile);
        setDailyRewards({
            canClaim: status.canClaimToday,
            nextReward: status.nextReward,
            dayIndex: status.dayIndex,
            thisMonthClaims: status.thisMonthClaims,
            claimedDays: status.claimedDays,
        });
        setLoading(prev => ({ ...prev, dailyRewards: false }));
    }, [profile]);

    // Subscribe to guild if user has one
    useEffect(() => {
        if (!db || !profile?.guildId) {
            setGuild(null);
            setLoading(prev => ({ ...prev, guild: false }));
            return;
        }

        let isMounted = true;
        const unsubscribe = subscribeToGuild(db, profile.guildId, (guildData) => {
            if (isMounted) {
                setGuild(guildData);
                setLoading(prev => ({ ...prev, guild: false }));
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [db, profile?.guildId]);

    // Subscribe to guild leaderboard
    useEffect(() => {
        if (!db) return;

        let isMounted = true;
        const unsubscribe = subscribeToGuildLeaderboard(db, 20, (guilds) => {
            if (isMounted) setGuildLeaderboard(guilds);
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [db]);

    // Subscribe to tournament
    useEffect(() => {
        if (!db) return;

        const tournamentType = getCurrentTournamentType();
        const endTime = getTournamentEndTime();

        setTournament(prev => ({
            ...prev,
            type: tournamentType,
            endTime,
        }));

        let isMounted = true;
        const unsubscribe = subscribeToTournament(db, (data) => {
            if (!isMounted) return;
            if (data) {
                const entries = data.entries || [];
                const sortedEntries = [...entries].sort((a, b) => b.score - a.score);
                const userEntry = sortedEntries.find(e => e.userId === user?.uid);
                const userRank = userEntry ? sortedEntries.indexOf(userEntry) + 1 : null;

                setTournament(prev => ({
                    ...prev,
                    leaderboard: sortedEntries.slice(0, 20),
                    userRank,
                    userScore: userEntry?.score || 0,
                }));
            }
            setLoading(prev => ({ ...prev, tournament: false }));
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [db, user?.uid]);

    // Subscribe to notifications
    useEffect(() => {
        if (!db || !user?.uid) return;

        let isMounted = true;
        const unsubscribe = subscribeToNotifications(db, user.uid, (notifs) => {
            if (!isMounted) return;
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.read).length);
            setLoading(prev => ({ ...prev, notifications: false }));
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [db, user?.uid]);

    // Actions
    const claimDailyRewardAction = useCallback(async () => {
        if (!db || !user?.uid) return { success: false };
        return await claimDailyReward(db, user.uid, profile);
    }, [db, user?.uid, profile]);

    const activateShield = useCallback(async () => {
        if (!db || !user?.uid) return { success: false };
        return await activateForgeShield(db, user.uid);
    }, [db, user?.uid]);

    const createGuildAction = useCallback(async (guildData) => {
        if (!db || !user?.uid) return { success: false };
        return await createGuild(db, user.uid, guildData);
    }, [db, user?.uid]);

    const joinGuildAction = useCallback(async (inviteCode) => {
        if (!db || !user?.uid) return { success: false };
        return await joinGuild(db, user.uid, inviteCode);
    }, [db, user?.uid]);

    const leaveGuildAction = useCallback(async () => {
        if (!db || !user?.uid || !profile?.guildId) return { success: false };
        return await leaveGuild(db, user.uid, profile.guildId);
    }, [db, user?.uid, profile?.guildId]);

    const markNotificationReadAction = useCallback(async (notificationId) => {
        if (!db || !user?.uid) return;
        await markNotificationRead(db, user.uid, notificationId);
    }, [db, user?.uid]);

    const isLoading = Object.values(loading).some(Boolean);

    const value = useMemo(() => ({
        // State
        forge,
        streak: forge, // backwards-compat alias
        dailyRewards,
        guild,
        guildLeaderboard,
        tournament,
        notifications,
        unreadCount,

        // Loading
        loading,
        isLoading,

        // Actions
        claimDailyReward: claimDailyRewardAction,
        activateShield,
        createGuild: createGuildAction,
        joinGuild: joinGuildAction,
        leaveGuild: leaveGuildAction,
        markNotificationRead: markNotificationReadAction,
    }), [forge, dailyRewards, guild, guildLeaderboard, tournament, notifications, unreadCount,
         loading, isLoading, claimDailyRewardAction, activateShield, createGuildAction,
         joinGuildAction, leaveGuildAction, markNotificationReadAction]);

    return (
        <EngagementContext.Provider value={value}>
            {children}
        </EngagementContext.Provider>
    );
};

export const useEngagement = () => {
    const context = useContext(EngagementContext);
    if (!context) {
        throw new Error('useEngagement must be used within an EngagementProvider');
    }
    return context;
};

export default EngagementContext;


