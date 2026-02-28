import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { BADGES, BADGE_CATEGORIES, getRarityConfig, getUnlockProgress } from './badgeDefinitions';
import { GlassCard } from '../UIComponents';
import { useStore } from '../../hooks/useStore';

/**
 * Achievements badge grid — embeds in Profile tab.
 * Reads user data from useStore and checks each badge client-side.
 */
export const Achievements = () => {
    const { profile, workouts, meals, progress, photos, userDoc } = useStore();
    const [filter, setFilter] = useState('ALL');

    // Build userData object matching badgeDefinition check signatures
    const userData = {
        // Core
        xp: profile?.xp || 0,
        level: Math.floor((profile?.xp || 0) / 500) + 1,
        ironScore: userDoc?.ironScore || 0,
        // Forge / Streak
        currentForge: profile?.currentForge ?? profile?.currentStreak ?? 0,
        longestForge: profile?.longestForge ?? profile?.longestStreak ?? 0,
        // Counts
        workoutCount: workouts?.length || 0,
        workouts,
        mealCount: meals?.length || 0,
        meals,
        progressCount: progress?.length || 0,
        progress,
        photoCount: photos?.length || 0,
        photos,
        // Volume
        totalVolume: profile?.totalVolume || 0,
        // Form
        bestFormScore: profile?.bestFormScore || 0,
        // Arena
        battlesWon: profile?.battlesWon || profile?.wins || 0,
        consecutiveWins: profile?.consecutiveWins || profile?.currentWinStreak || 0,
        bossesContributed: profile?.bossesContributed || 0,
        // Social
        followersCount: profile?.followersCount || 0,
        // League
        league: profile?.league || '',
        // Guild
        guildId: profile?.guildId || userDoc?.guildId || null,
        guildRole: profile?.guildRole || null,
        ownedGuildId: profile?.ownedGuildId || null,
        // Server-awarded badges
        earnedBadges: profile?.earnedBadges || userDoc?.earnedBadges || [],
        // Forge shields
        forgeShields: profile?.forgeShields || 0,
    };

    const { unlocked, total, percent } = getUnlockProgress(userData);

    const categories = ['ALL', ...Object.keys(BADGE_CATEGORIES)];

    const displayBadges = BADGES.filter(b => filter === 'ALL' || b.category === filter);
    const unlockedIds = new Set(BADGES.filter(b => b.check(userData)).map(b => b.id));

    return (
        <div className="space-y-4">
            {/* Progress Header */}
            <GlassCard className="!p-4">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                            Achievements
                        </p>
                        <p className="text-2xl font-black text-white mt-0.5">
                            {unlocked}
                            <span className="text-base text-gray-500 font-bold"> / {total}</span>
                        </p>
                    </div>
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, rgba(234,179,8,0.2), rgba(220,38,38,0.15))',
                            border: '2px solid rgba(234,179,8,0.3)',
                        }}
                    >
                        <span className="text-2xl">🏆</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div
                    className="h-2.5 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                    <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                            width: `${percent}%`,
                            background: 'linear-gradient(90deg, #dc2626 0%, #eab308 100%)',
                            boxShadow: '0 0 12px rgba(234,179,8,0.4)',
                        }}
                    />
                </div>
                <p className="text-[10px] text-gray-600 mt-1.5 text-right font-mono">{percent}% complete</p>
            </GlassCard>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {categories.map(cat => {
                    const config = BADGE_CATEGORIES[cat];
                    return (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all"
                            style={filter === cat ? {
                                background: 'linear-gradient(135deg, rgba(220,38,38,0.5), rgba(185,28,28,0.4))',
                                border: '1px solid rgba(239,68,68,0.4)',
                                color: '#fff',
                            } : {
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: '#6b7280',
                            }}
                        >
                            {config ? `${config.icon} ${config.label}` : 'All'}
                        </button>
                    );
                })}
            </div>

            {/* Badge Grid */}
            <div className="grid grid-cols-3 gap-3">
                {displayBadges.map(badge => {
                    const isUnlocked = unlockedIds.has(badge.id);
                    const rarity = getRarityConfig(badge.rarity);
                    return (
                        <div
                            key={badge.id}
                            className={`relative rounded-2xl p-3 flex flex-col items-center text-center transition-all ${isUnlocked ? '' : 'opacity-40'}`}
                            style={{
                                background: isUnlocked
                                    ? `linear-gradient(135deg, ${rarity.bg.replace('bg-', '').replace('/20', '')} 0%, rgba(10,10,10,0.6) 100%)`
                                    : 'rgba(255,255,255,0.02)',
                                border: isUnlocked ? `1px solid ${rarity.border.replace('border-', '')}` : '1px solid rgba(255,255,255,0.05)',
                                boxShadow: isUnlocked && rarity.glow ? `0 4px 20px ${rarity.glow}` : 'none',
                            }}
                        >
                            {!isUnlocked && (
                                <div className="absolute inset-0 flex items-end justify-end p-1.5 rounded-2xl">
                                    <Lock size={10} className="text-gray-600" />
                                </div>
                            )}
                            <span className="text-2xl mb-1.5">{badge.icon}</span>
                            <p className={`text-[10px] font-black uppercase tracking-wide leading-tight ${isUnlocked ? 'text-white' : 'text-gray-600'}`}>
                                {badge.name}
                            </p>
                            <p className={`text-[9px] mt-0.5 leading-tight ${isUnlocked ? rarity.color : 'text-gray-700'}`}>
                                {badge.rarity}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Achievements;
