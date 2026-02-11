import React, { useState } from 'react';
import { Shield, Lock, Star, ChevronRight, Gift, Zap } from 'lucide-react';

export const BattlePass = ({ level = 1, xp = 0, isPremium = false }) => {
    const currentProgress = (xp % 1000) / 10; // Percentage of current level

    return (
        <div className="space-y-4">
            {/* Header Card */}
            <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-red-900 via-purple-900 to-red-900 border border-white/10">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Season 1</h2>
                            <p className="text-sm text-red-300">Rise of the Machines</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${isPremium ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'}`}>
                            {isPremium ? 'PREMIUM ACTIVE' : 'FREE TIER'}
                        </div>
                    </div>

                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-4xl font-black text-white">{level}</span>
                        <span className="text-sm text-white/60 mb-1">/ 50</span>
                    </div>

                    <div className="h-4 bg-black/30 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                        <div
                            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
                            style={{ width: `${currentProgress}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-white/40">
                        <span>{xp % 1000} XP</span>
                        <span>1000 XP</span>
                    </div>
                </div>

                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
            </div>

            {/* Reward Tiers Preview */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[level - 1, level, level + 1, level + 2].filter(l => l > 0 && l <= 50).map(tierLevel => (
                    <div
                        key={tierLevel}
                        className={`flex-shrink-0 w-20 p-3 rounded-2xl border text-center transition-all ${tierLevel === level
                                ? 'bg-red-600/30 border-red-500/50 scale-105'
                                : tierLevel < level
                                    ? 'bg-green-900/20 border-green-500/30'
                                    : 'bg-white/5 border-white/10'
                            }`}
                    >
                        <div className="text-xs text-gray-400 mb-1">Tier {tierLevel}</div>
                        <div className="w-10 h-10 mx-auto rounded-lg bg-black/30 flex items-center justify-center">
                            {tierLevel < level ? (
                                <Star size={20} className="text-green-400" fill="currentColor" />
                            ) : tierLevel === level ? (
                                <Gift size={20} className="text-red-400" />
                            ) : (
                                <Lock size={16} className="text-gray-600" />
                            )}
                        </div>
                        {tierLevel % 5 === 0 && (
                            <div className="mt-1 text-[11px] text-yellow-400 font-bold">+100 XP</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Premium Upgrade CTA */}
            {!isPremium && (
                <button className="w-full py-4 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-2xl flex items-center justify-center gap-2 font-black text-white hover:scale-[1.02] transition-transform active:scale-[0.98]">
                    <Zap size={20} />
                    <span>UPGRADE TO PREMIUM</span>
                    <ChevronRight size={20} />
                </button>
            )}
        </div>
    );
};



