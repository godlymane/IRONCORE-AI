// Arena Context - Real-time state management for Arena tab
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
    subscribeToLeaderboard,
    subscribeToBoss,
    subscribeToPendingBattles,
    getUserStats,
    updateBossProgress,
    createBattle,
    acceptBattle,
    declineBattle,
    awardXP,
    initializeUser,
    checkDailyForge
} from '../services/arenaService';
import { throttleAction } from '../utils/rateLimiter';
import { checkAITriggers } from '../services/NotificationService';

const ArenaContext = createContext(null);

export const ArenaProvider = ({ children, user: authUser }) => {
    // State
    const [currentUser, setCurrentUser] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [boss, setBoss] = useState(null);
    const [pendingBattles, setPendingBattles] = useState([]);

    // Loading states
    const [loading, setLoading] = useState({
        user: true,
        leaderboard: true,
        boss: true,
        battles: true
    });

    // Error states
    const [errors, setErrors] = useState({
        user: null,
        leaderboard: null,
        boss: null,
        battles: null
    });

    // Get real user ID and username from auth
    const userId = authUser?.uid;
    const authUsername = authUser?.displayName;
    const userPhoto = authUser?.photoURL;

    // Initialize user on mount (when authUser changes)
    useEffect(() => {
        if (!userId) {
            setLoading(prev => ({ ...prev, user: false }));
            return;
        }

        let isMounted = true;

        const initUser = async () => {
            try {
                // Check daily Forge first (updates firestore if needed)
                await checkDailyForge(userId);
                if (!isMounted) return;

                let user = await getUserStats(userId);
                if (!isMounted) return;

                if (!user) {
                    // Create new user if doesn't exist in arena, fallback to 'Warrior' ONLY here if auth also lacks a name
                    const finalUsername = authUsername || 'Warrior';
                    await initializeUser(userId, finalUsername, userPhoto);
                    if (!isMounted) return;
                    user = await getUserStats(userId);
                    if (!isMounted) return;
                }

                setCurrentUser(user);

                // Check AI Triggers (Notifications etc.)
                await checkAITriggers(user);

                if (isMounted) setLoading(prev => ({ ...prev, user: false }));
            } catch (error) {
                console.error('Error initializing user:', error);
                if (isMounted) {
                    setErrors(prev => ({ ...prev, user: error.message }));
                    setLoading(prev => ({ ...prev, user: false }));
                }
            }
        };

        initUser();

        return () => { isMounted = false; };
    }, [userId, authUsername, userPhoto]);

    // Subscribe to leaderboard only when user is authenticated
    useEffect(() => {
        if (!userId) {
            setLoading(prev => ({ ...prev, leaderboard: false }));
            return;
        }

        let isMounted = true;
        const unsubscribe = subscribeToLeaderboard(100, (data) => {
            if (isMounted) {
                setLeaderboard(data);
                setLoading(prev => ({ ...prev, leaderboard: false }));
            }
        });

        return () => { isMounted = false; unsubscribe(); };
    }, [userId]);

    // Subscribe to boss only when user is authenticated
    useEffect(() => {
        if (!userId) {
            setLoading(prev => ({ ...prev, boss: false }));
            return;
        }

        let isMounted = true;
        const unsubscribe = subscribeToBoss((data) => {
            if (isMounted) {
                setBoss(data);
                setLoading(prev => ({ ...prev, boss: false }));
            }
        });

        return () => { isMounted = false; unsubscribe(); };
    }, [userId]);

    // Subscribe to pending battles for current user
    useEffect(() => {
        if (!currentUser?.id) return;

        let isMounted = true;
        const unsubscribe = subscribeToPendingBattles(currentUser.id, (data) => {
            if (isMounted) {
                setPendingBattles(data);
                setLoading(prev => ({ ...prev, battles: false }));
            }
        });

        return () => { isMounted = false; unsubscribe(); };
    }, [currentUser?.id]);

    // Actions
    const dealBossDamage = useCallback(async (damage) => {
        if (!currentUser) return null;

        const { allowed, retryIn } = throttleAction('boss_damage', 10000);
        if (!allowed) {
            throw new Error(`Too fast — wait ${Math.ceil(retryIn / 1000)}s before attacking again.`);
        }

        try {
            const result = await updateBossProgress(
                currentUser.id,
                currentUser.username,
                damage
            );

            // Award XP for dealing damage
            if (result) {
                await awardXP(currentUser.id, Math.floor(damage / 10), 'boss_damage');
            }

            return result;
        } catch (error) {
            console.error('Error dealing boss damage:', error);
            throw error;
        }
    }, [currentUser]);

    const challengePlayer = useCallback(async (opponentId, opponentUsername, opponentXP, opponentPhoto, { skipConfirm = false } = {}) => {
        if (!currentUser) return null;

        // Require explicit confirmation to prevent accidental challenges
        if (!skipConfirm) {
            const confirmed = window.confirm(`Challenge ${opponentUsername} to a 24hr PvP battle?`);
            if (!confirmed) return null;
        }

        try {
            const battleId = await createBattle(
                {
                    userId: currentUser.id,
                    username: currentUser.username,
                    photo: currentUser.avatarUrl || userPhoto || null,
                    xp: currentUser.xp
                },
                {
                    userId: opponentId,
                    username: opponentUsername,
                    photo: opponentPhoto || null,
                    xp: opponentXP
                }
            );

            return battleId;
        } catch (error) {
            console.error('Error creating battle:', error);
            throw error;
        }
    }, [currentUser, userPhoto]);

    const handleAcceptBattle = useCallback(async (battleId) => {
        try {
            await acceptBattle(battleId);
        } catch (error) {
            console.error('Error accepting battle:', error);
            throw error;
        }
    }, []);

    const handleDeclineBattle = useCallback(async (battleId) => {
        try {
            await declineBattle(battleId);
        } catch (error) {
            console.error('Error declining battle:', error);
            throw error;
        }
    }, []);

    const handleAwardXP = useCallback(async (amount, reason) => {
        if (!currentUser) return null;

        const { allowed, retryIn } = throttleAction(`award_xp_${reason}`, 5000);
        if (!allowed) return null;

        try {
            const result = await awardXP(currentUser.id, amount, reason);

            // Update local user state
            if (result) {
                setCurrentUser(prev => ({
                    ...prev,
                    xp: result.newXP,
                    level: result.newLevel
                }));
            }

            return result;
        } catch (error) {
            console.error('Error awarding XP:', error);
            throw error;
        }
    }, [currentUser]);

    // Memoized refresh to avoid recreating on every render
    const refreshUser = useCallback(async () => {
        if (!userId) return;
        try {
            const user = await getUserStats(userId);
            setCurrentUser(user);
        } catch (err) {
            console.error('[Arena] refreshUser failed:', err.message);
        }
    }, [userId]);

    // Compute derived state
    const isLoading = Object.values(loading).some(Boolean);
    const hasErrors = Object.values(errors).some(Boolean);

    // Find current user's rank
    const userRank = leaderboard.findIndex(u => u.id === currentUser?.id) + 1 || null;

    const value = useMemo(() => ({
        // State
        currentUser,
        leaderboard,
        boss,
        pendingBattles,
        userRank,

        // Loading
        loading,
        isLoading,

        // Errors
        errors,
        hasErrors,

        // Actions
        dealBossDamage,
        challengePlayer,
        acceptBattle: handleAcceptBattle,
        declineBattle: handleDeclineBattle,
        awardXP: handleAwardXP,

        // Refresh user data
        refreshUser,
    }), [currentUser, leaderboard, boss, pendingBattles, userRank, loading, isLoading,
         errors, hasErrors, dealBossDamage, challengePlayer, handleAcceptBattle,
         handleDeclineBattle, handleAwardXP, refreshUser]);

    return (
        <ArenaContext.Provider value={value}>
            {children}
        </ArenaContext.Provider>
    );
};

// Custom hook
export const useArena = () => {
    const context = useContext(ArenaContext);
    if (!context) {
        throw new Error('useArena must be used within an ArenaProvider');
    }
    return context;
};

export default ArenaContext;



