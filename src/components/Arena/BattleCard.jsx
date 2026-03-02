import React from 'react';
import { Swords, Trophy, TrendingUp, User, Shield } from 'lucide-react';

export const BattleCard = ({ opponent, userStats, onBattle }) => {
    // Opponent is required - no demo fallback
    if (!opponent) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center text-white/30">
                <Swords size={32} className="mx-auto mb-2 opacity-50" />
                <p>No opponents available</p>
            </div>
        );
    }

    // User stats from context/props
    const user = userStats || {
        name: 'You',
        level: 1,
        rank: 'Iron Novice',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=warrior',
        winRate: 50,
        power: 100
    };

    const opp = opponent;
    const winProbability = Math.round((user.power / (user.power + opp.power)) * 100);

    return (
        <div className="relative overflow-hidden rounded-3xl p-1 bg-gradient-to-br from-red-600/20 to-red-600/20 border border-white/10 animate-in fade-in">
            {/* VS Badge */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center border-4 border-black shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse">
                    <span className="font-black text-white italic text-lg">VS</span>
                </div>
            </div>

            <div className="relative z-10 bg-black/40 backdrop-blur-xl rounded-[22px] p-5">
                <div className="flex justify-between items-center gap-4">

                    {/* Player (Left) */}
                    <div className="flex-1 text-center">
                        <div className="relative w-16 h-16 mx-auto mb-2">
                            <div className="absolute inset-0 bg-red-500 rounded-full blur opacity-50" />
                            <img src={user.avatar} className="relative w-full h-full rounded-full border-2 border-red-400 object-cover" alt="User" />
                            <div className="absolute -bottom-1 -right-1 bg-black/60 px-1.5 rounded-md border border-white/10 text-[11px] text-white font-bold">
                                Lv.{user.level}
                            </div>
                        </div>
                        <p className="text-sm font-bold text-white truncate">{user.name}</p>
                        <p className="text-[11px] text-red-400">{user.rank}</p>

                        <div className="mt-2 flex items-center justify-center gap-1 text-[11px]">
                            <TrendingUp size={10} className="text-green-400" />
                            <span className="text-green-400">{user.winRate}%</span>
                        </div>

                        {/* Power Bar */}
                        <div className="mt-2 h-1.5 bg-black/50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-red-500 to-purple-500" style={{ width: `${(user.power / 5000) * 100}%` }} />
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">{user.power} PWR</p>
                    </div>

                    {/* Spacer for VS */}
                    <div className="w-14" />

                    {/* Opponent (Right) */}
                    <div className="flex-1 text-center">
                        <div className="relative w-16 h-16 mx-auto mb-2">
                            <div className="absolute inset-0 bg-red-500 rounded-full blur opacity-50" />
                            <img src={opp.avatar} className="relative w-full h-full rounded-full border-2 border-red-400 object-cover" alt="Opponent" />
                            <div className="absolute -bottom-1 -right-1 bg-black/60 px-1.5 rounded-md border border-white/10 text-[11px] text-white font-bold">
                                Lv.{opp.level}
                            </div>
                        </div>
                        <p className="text-sm font-bold text-white truncate">{opp.name}</p>
                        <p className="text-[11px] text-red-400">{opp.rank}</p>

                        <div className="mt-2 flex items-center justify-center gap-1 text-[11px]">
                            <Trophy size={10} className="text-yellow-400" />
                            <span className="text-yellow-400">{opp.forge ?? opp.streak ?? 0} Forge</span>
                        </div>

                        {/* Power Bar */}
                        <div className="mt-2 h-1.5 bg-black/50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-red-500 to-orange-500" style={{ width: `${(opp.power / 5000) * 100}%` }} />
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">{opp.power} PWR</p>
                    </div>
                </div>

                {/* Battle Info */}
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield size={14} className="text-red-400" />
                        <span className="text-xs text-white/60">Win Chance: </span>
                        <span className={`text-xs font-bold ${winProbability >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                            {winProbability}%
                        </span>
                    </div>
                    <button
                        onClick={() => onBattle && onBattle(opp)}
                        className="px-6 py-2 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-black text-sm text-white hover:scale-105 transition-transform active:scale-95 shadow-lg"
                    >
                        BATTLE
                    </button>
                </div>
            </div>
        </div>
    );
};




