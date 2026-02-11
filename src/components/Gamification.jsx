import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Lock, Star, Zap, Gift, Clock, Flame, Shield, Sparkles } from 'lucide-react';
import { ACHIEVEMENTS, POWER_UPS, RARITY_CONFIG, generateDailyChallenge, generateWeeklyChallenge } from '../data/achievements';
import { Button } from './UIComponents';

/**
 * Achievement Badge Component
 */
export const AchievementBadge = ({ achievement, unlocked = false, showDetails = true, onClick }) => {
    const [isRevealing, setIsRevealing] = useState(false);
    const rarity = RARITY_CONFIG[achievement.rarity];

    const handleClick = () => {
        if (!unlocked) return;
        setIsRevealing(true);
        setTimeout(() => setIsRevealing(false), 1000);
        onClick?.();
    };

    return (
        <motion.div
            onClick={handleClick}
            whileHover={{ scale: unlocked ? 1.05 : 1 }}
            whileTap={{ scale: unlocked ? 0.95 : 1 }}
            className={`relative p-4 rounded-2xl border transition-all cursor-${unlocked ? 'pointer' : 'default'} ${unlocked
                    ? 'bg-gradient-to-br border-white/20'
                    : 'bg-white/[0.02] border-white/5 opacity-60'
                }`}
            style={unlocked ? {
                background: `linear-gradient(135deg, ${rarity.glow}20, transparent)`,
                boxShadow: `0 0 20px ${rarity.glow}`,
            } : {}}
        >
            {/* Lock overlay */}
            {!unlocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                    <Lock className="w-6 h-6 text-white/30" />
                </div>
            )}

            {/* Reveal animation */}
            <AnimatePresence>
                {isRevealing && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 2, opacity: [0, 1, 0] }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <Sparkles className="w-12 h-12 text-yellow-400" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Badge content */}
            <div className={`text-center ${!unlocked ? 'filter grayscale' : ''}`}>
                <div className="text-4xl mb-2">{achievement.icon}</div>
                <p className="text-sm font-bold text-white truncate">{achievement.name}</p>
                {showDetails && (
                    <>
                        <p className="text-[11px] text-white/50 mt-1 line-clamp-2">{achievement.description}</p>
                        <div className="flex items-center justify-center gap-1 mt-2">
                            <Star className={`w-3 h-3 bg-gradient-to-r ${rarity.gradient} bg-clip-text text-transparent`} />
                            <span className={`text-[11px] font-bold bg-gradient-to-r ${rarity.gradient} bg-clip-text text-transparent uppercase`}>
                                {achievement.rarity}
                            </span>
                        </div>
                        <p className="text-xs text-yellow-400 font-bold mt-1">+{achievement.xp} XP</p>
                    </>
                )}
            </div>
        </motion.div>
    );
};

/**
 * Power-Up Card Component
 */
export const PowerUpCard = ({ powerUp, owned = 0, onBuy, onUse, xpBalance = 0 }) => {
    const canAfford = xpBalance >= powerUp.cost;

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-2xl backdrop-blur-xl border border-white/10 bg-white/[0.03]"
        >
            <div className="flex items-start gap-3">
                <div className="text-3xl">{powerUp.icon}</div>
                <div className="flex-1">
                    <p className="font-bold text-white">{powerUp.name}</p>
                    <p className="text-xs text-white/50 mt-0.5">{powerUp.description}</p>

                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-400" />
                            <span className="text-sm font-bold text-yellow-400">{powerUp.cost}</span>
                        </div>

                        {owned > 0 ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-white/40">x{owned}</span>
                                <Button onClick={() => onUse?.(powerUp)} variant="primary" className="!py-1.5 !px-3 !text-xs">
                                    Use
                                </Button>
                            </div>
                        ) : (
                            <Button
                                onClick={() => canAfford && onBuy?.(powerUp)}
                                variant={canAfford ? 'primary' : 'secondary'}
                                disabled={!canAfford}
                                className="!py-1.5 !px-3 !text-xs"
                            >
                                {canAfford ? 'Buy' : 'Need XP'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

/**
 * Challenge Card Component
 */
export const ChallengeCard = ({ challenge, progress = 0, onClaim, variant = 'daily' }) => {
    const isDaily = variant === 'daily';
    const isComplete = progress >= 100;

    // Calculate time remaining
    const getTimeRemaining = () => {
        const now = new Date();
        const end = new Date(challenge.expiresAt);
        const diff = end - now;

        if (diff <= 0) return 'Expired';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        }
        return `${hours}h ${mins}m`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl border ${isComplete
                    ? 'bg-green-500/10 border-green-500/30'
                    : isDaily
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-red-500/10 border-purple-500/20'
                }`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    {isDaily ? (
                        <Flame className="w-5 h-5 text-orange-400" />
                    ) : (
                        <Trophy className="w-5 h-5 text-red-400" />
                    )}
                    <div>
                        <p className="font-bold text-white">{challenge.name}</p>
                        <p className="text-[11px] text-white/50 uppercase tracking-wider">{isDaily ? 'Daily' : 'Weekly'} Challenge</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-white/40">
                    <Clock className="w-3 h-3" />
                    {getTimeRemaining()}
                </div>
            </div>

            <p className="text-sm text-white/70 mb-3">{challenge.description}</p>

            {/* Progress bar */}
            <div className="mb-3">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, progress)}%` }}
                        className={`h-full rounded-full ${isComplete ? 'bg-green-500' : 'bg-red-500'}`}
                    />
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[11px] text-white/40">{progress.toFixed(0)}%</span>
                    <span className="text-xs font-bold text-yellow-400">+{challenge.xp} XP</span>
                </div>
            </div>

            {isComplete && !challenge.claimed && (
                <Button onClick={() => onClaim?.(challenge)} variant="primary" className="w-full">
                    <Gift className="w-4 h-4 mr-2" />
                    Claim Reward
                </Button>
            )}
        </motion.div>
    );
};

/**
 * Achievements Gallery Component
 */
export const AchievementsGallery = ({ unlockedIds = [], stats = {}, category = 'all' }) => {
    const [filter, setFilter] = useState(category);

    const categories = ['all', 'milestone', 'consistency', 'strength', 'social', 'nutrition', 'special'];

    const filteredAchievements = ACHIEVEMENTS.filter(a =>
        filter === 'all' || a.category === filter
    );

    const unlockedCount = unlockedIds.length;
    const totalCount = ACHIEVEMENTS.length;

    return (
        <div className="space-y-4">
            {/* Progress header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                        Achievements
                    </h3>
                    <p className="text-xs text-white/50">{unlockedCount} / {totalCount} unlocked</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-yellow-400">{Math.round((unlockedCount / totalCount) * 100)}%</p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(unlockedCount / totalCount) * 100}%` }}
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                />
            </div>

            {/* Category filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${filter === cat
                                ? 'bg-red-500 text-white'
                                : 'bg-white/5 text-white/50 hover:bg-white/10'
                            }`}
                    >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
            </div>

            {/* Achievements grid */}
            <div className="grid grid-cols-2 gap-3">
                {filteredAchievements.map(achievement => (
                    <AchievementBadge
                        key={achievement.id}
                        achievement={achievement}
                        unlocked={unlockedIds.includes(achievement.id)}
                    />
                ))}
            </div>
        </div>
    );
};

/**
 * Streak Flame Component
 */
export const StreakFlame = ({ streak = 0, hasFreezeActive = false }) => {
    const getFlameSize = () => {
        if (streak >= 30) return 'text-6xl';
        if (streak >= 14) return 'text-5xl';
        if (streak >= 7) return 'text-4xl';
        return 'text-3xl';
    };

    const getFlameColor = () => {
        if (streak >= 30) return 'from-purple-400 via-pink-500 to-red-500';
        if (streak >= 14) return 'from-yellow-400 via-orange-500 to-red-500';
        if (streak >= 7) return 'from-yellow-400 to-orange-500';
        return 'from-orange-400 to-red-500';
    };

    return (
        <motion.div
            animate={{
                scale: [1, 1.05, 1],
                rotate: [-2, 2, -2]
            }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut'
            }}
            className="relative flex flex-col items-center"
        >
            <div
                className={`${getFlameSize()} filter drop-shadow-lg`}
                style={{
                    filter: `drop-shadow(0 0 ${streak >= 7 ? 20 : 10}px rgba(249, 115, 22, ${streak >= 7 ? 0.8 : 0.5}))`
                }}
            >
                🔥
            </div>

            <div className={`text-2xl font-black bg-gradient-to-r ${getFlameColor()} bg-clip-text text-transparent`}>
                {streak}
            </div>
            <p className="text-xs text-white/50">day streak</p>

            {hasFreezeActive && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30">
                    <Shield className="w-3 h-3 text-cyan-400" />
                    <span className="text-[11px] text-cyan-400 font-bold">FREEZE</span>
                </div>
            )}
        </motion.div>
    );
};

export default { AchievementBadge, PowerUpCard, ChallengeCard, AchievementsGallery, StreakFlame };



