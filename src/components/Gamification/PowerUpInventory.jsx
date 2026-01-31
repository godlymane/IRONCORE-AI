import React from 'react';
import { Zap, Shield, Flame, Clock, Star, Plus, Snowflake } from 'lucide-react';

// Default power-ups for new users
const DEFAULT_POWERUPS = [
    { id: 'xp_boost', name: 'XP Boost', icon: '⚡', count: 0, effect: '2x XP for 1 hour', rarity: 'rare' },
    { id: 'fire_mode', name: 'Fire Mode', icon: '🔥', count: 0, effect: '+50% workout power', rarity: 'legendary' },
];

export const PowerUpInventory = ({ powerUps = [], streakFreezeCount = 0, onUsePowerUp }) => {
    // Merge user power-ups with defaults, and add streak freeze
    const allPowerUps = [
        // Streak freeze is a special power-up from user stats
        {
            id: 'streak_freeze',
            name: 'Streak Freeze',
            icon: '❄️',
            count: streakFreezeCount,
            effect: 'Block streak loss',
            rarity: 'epic'
        },
        // User's other power-ups
        ...DEFAULT_POWERUPS.map(def => {
            const userPowerUp = powerUps.find(p => p.id === def.id);
            return userPowerUp || def;
        }),
        // Any additional user power-ups not in defaults
        ...powerUps.filter(p => !DEFAULT_POWERUPS.find(d => d.id === p.id) && p.id !== 'streak_freeze')
    ].filter(p => p.count > 0); // Only show power-ups with count > 0

    const getRarityColor = (rarity) => {
        switch (rarity) {
            case 'common': return 'from-gray-600 to-gray-700';
            case 'rare': return 'from-red-600 to-red-700';
            case 'epic': return 'from-purple-600 to-pink-700';
            case 'legendary': return 'from-yellow-500 to-orange-600';
            default: return 'from-gray-600 to-gray-700';
        }
    };

    const getRarityBorder = (rarity) => {
        switch (rarity) {
            case 'common': return 'border-gray-500/30';
            case 'rare': return 'border-red-500/30';
            case 'epic': return 'border-purple-500/30';
            case 'legendary': return 'border-yellow-500/30';
            default: return 'border-gray-500/30';
        }
    };

    const handleUse = (powerUp) => {
        if (onUsePowerUp && powerUp.count > 0) {
            onUsePowerUp(powerUp.id);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                    <Zap size={14} className="text-yellow-400" />
                    Power-Ups
                </h3>
                <button className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                    <Plus size={12} />
                    Get More
                </button>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {allPowerUps.length > 0 ? (
                    allPowerUps.map(powerUp => (
                        <div
                            key={powerUp.id}
                            onClick={() => handleUse(powerUp)}
                            className={`flex-shrink-0 w-24 p-3 rounded-2xl border bg-gradient-to-br ${getRarityColor(powerUp.rarity)} ${getRarityBorder(powerUp.rarity)} text-center hover:scale-105 transition-transform cursor-pointer group`}
                        >
                            <div className="text-3xl mb-1">{powerUp.icon}</div>
                            <p className="text-[10px] font-bold text-white truncate">{powerUp.name}</p>
                            <div className="mt-1 inline-block px-2 py-0.5 bg-black/30 rounded-full">
                                <span className="text-[10px] font-bold text-white">x{powerUp.count}</span>
                            </div>
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 rounded-lg text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {powerUp.effect}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-xs text-gray-500 py-4 text-center w-full">
                        No power-ups yet. Complete quests to earn some!
                    </div>
                )}

                {/* Empty Slot / Get More */}
                <div className="flex-shrink-0 w-24 p-3 rounded-2xl border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-white/40 transition-colors">
                    <Plus size={24} className="text-gray-600" />
                </div>
            </div>
        </div>
    );
};




