// Arena Context - Real-time state management for Arena tab
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
    checkDailyStreak
} from '../services/arenaService';
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
    const username = authUser?.displayName || 'Warrior';
    const userPhoto = authUser?.photoURL;

    // Initialize user on mount (when authUser changes)
    useEffect(() => {
        if (!userId) {
            setLoading(prev => ({ ...prev, user: false }));
            return;
        }

        const initUser = async () => {
            try {
                // Check daily streak first (updates firestore if needed)
                await checkDailyStreak(userId);

                let user = await getUserStats(userId);

                if (!user) {
                    // Create new user if doesn't exist in arena
                    await initializeUser(userId, username, userPhoto);
                    user = await getUserStats(userId);
                }

                setCurrentUser(user);

                // Check AI Triggers (Notifications etc.)
                await checkAITriggers(user);

                setLoading(prev => ({ ...prev, user: false }));
            } catch (error) {
                console.error('Error initializing user:', error);
                setErrors(prev => ({ ...prev, user: error.message }));
                setLoading(prev => ({ ...prev, user: false }));
            }
        };

        initUser();
    }, [userId, username, userPhoto]);

    // Subscribe to leaderboard
    useEffect(() => {
        const unsubscribe = subscribeToLeaderboard(100, (data) => {
            setLeaderboard(data);
            setLoading(prev => ({ ...prev, leaderboard: false }));
        });

        return () => unsubscribe();
    }, []);

    // Subscribe to boss
    useEffect(() => {
        const unsubscribe = subscribeToBoss((data) => {
            setBoss(data);
            setLoading(prev => ({ ...prev, boss: false }));
        });

        return () => unsubscribe();
    }, []);

    // Subscribe to pending battles for current user
    useEffect(() => {
        if (!currentUser?.id) return;

        const unsubscribe = subscribeToPendingBattles(currentUser.id, (data) => {
            setPendingBattles(data);
            setLoading(prev => ({ ...prev, battles: false }));
        });

        return () => unsubscribe();
    }, [currentUser?.id]);

    // Actions
    const dealBossDamage = useCallback(async (damage) => {
        if (!currentUser) return null;

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

    const challengePlayer = useCallback(async (opponentId, opponentUsername, opponentXP) => {
        if (!currentUser) return null;

        try {
            const battleId = await createBattle(
                {
                    userId: currentUser.id,
                    username: currentUser.username,
                    xp: currentUser.xp
                },
                {
                    userId: opponentId,
                    username: opponentUsername,
                    xp: opponentXP
                }
            );

            return battleId;
        } catch (error) {
            console.error('Error creating battle:', error);
            throw error;
        }
    }, [currentUser]);

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

    // Compute derived state
    const isLoading = Object.values(loading).some(Boolean);
    const hasErrors = Object.values(errors).some(Boolean);

    // Find current user's rank
    const userRank = leaderboard.findIndex(u => u.id === currentUser?.id) + 1 || null;

    const value = {
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
        refreshUser: async () => {
            if (!userId) return;
            const user = await getUserStats(userId);
            setCurrentUser(user);
        }
    };

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



