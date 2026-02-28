import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Target, Check, Gift, Clock, Flame } from 'lucide-react';

export const DailyChallenges = ({ onClaim, user, todayWorkouts = [], todayMeals = [], todayBurned = 0 }) => {
    // Calculate dynamic challenges based on actual data
    const challenges = useMemo(() => {
        const workoutCount = todayWorkouts.length;
        const mealCount = todayMeals.length;
        const caloriesBurned = todayBurned || todayWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);

        return [
            {
                id: 1,
                title: 'Complete 3 Workouts',
                progress: workoutCount,
                target: 3,
                xp: 150,
                icon: '💪',
                claimed: false
            },
            {
                id: 2,
                title: 'Log 5 Meals',
                progress: mealCount,
                target: 5,
                xp: 100,
                icon: '🍽️',
                claimed: false
            },
            {
                id: 3,
                title: 'Burn 500 Calories',
                progress: Math.round(caloriesBurned),
                target: 500,
                xp: 200,
                icon: '🔥',
                claimed: false
            },
        ];
    }, [todayWorkouts, todayMeals, todayBurned]);

    const [claimedIds, setClaimedIds] = useState([]);

    // Load claimed IDs from Firestore on mount
    useEffect(() => {
        if (!user?.uid) return;
        const today = new Date().toISOString().slice(0, 10);
        getDoc(doc(db, 'users', user.uid, 'challengeClaims', today)).then(snap => {
            if (snap.exists()) setClaimedIds(snap.data().claimedIds || []);
        }).catch(() => {});
    }, [user?.uid]);

    const handleClaim = async (id) => {
        const updated = [...claimedIds, id];
        setClaimedIds(updated);
        if (onClaim) onClaim(id);
        if (user?.uid) {
            const today = new Date().toISOString().slice(0, 10);
            await setDoc(
                doc(db, 'users', user.uid, 'challengeClaims', today),
                { claimedIds: updated },
                { merge: true }
            ).catch(() => {});
        }
    };

    // Calculate time until midnight reset
    const timeUntilReset = useMemo(() => {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const diff = midnight - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }, []);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                    <Target size={14} className="text-red-400" />
                    Daily Quests
                </h3>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={12} />
                    Resets in {timeUntilReset}
                </div>
            </div>

            {challenges.map(challenge => {
                const isComplete = challenge.progress >= challenge.target;
                const isClaimed = claimedIds.includes(challenge.id);
                const progressPercent = Math.min((challenge.progress / challenge.target) * 100, 100);

                return (
                    <div
                        key={challenge.id}
                        className={`relative overflow-hidden rounded-2xl p-4 border transition-all ${isClaimed
                            ? 'bg-green-900/20 border-green-500/30'
                            : isComplete
                                ? 'bg-yellow-900/20 border-yellow-500/30 animate-pulse'
                                : 'bg-white/5 border-white/10'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isClaimed ? 'bg-green-600/30' : 'bg-black/30'
                                }`}>
                                {isClaimed ? <Check className="text-green-400" /> : challenge.icon}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className={`font-bold text-sm ${isClaimed ? 'text-green-400 line-through' : 'text-white'}`}>
                                    {challenge.title}
                                </p>

                                {/* Progress Bar */}
                                <div className="mt-1 h-2 bg-black/30 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${isClaimed
                                            ? 'bg-green-500'
                                            : isComplete
                                                ? 'bg-yellow-500'
                                                : 'bg-red-500'
                                            }`}
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>

                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-[11px] text-gray-500">
                                        {challenge.progress}/{challenge.target}
                                    </span>
                                    <span className="text-[11px] text-yellow-400 font-bold">
                                        +{challenge.xp} XP
                                    </span>
                                </div>
                            </div>

                            {/* Claim Button */}
                            {isComplete && !isClaimed && (
                                <button
                                    onClick={() => handleClaim(challenge.id)}
                                    className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-bold text-sm text-black hover:scale-105 transition-transform"
                                >
                                    <Gift size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};




