import React, { useState } from 'react';
import {
    Trophy, Swords, Star, Crown, Lock,
    Gamepad2, Medal, Clock, MessageCircle, Loader2, Shield, Calendar
} from 'lucide-react';
import { BattleCard } from '../components/Arena/BattleCard';
import { LeaderboardCard } from '../components/Arena/LeaderboardCard';
import { AchievementBadge } from '../components/Arena/AchievementBadge';
import { BattlePass } from '../components/Gamification/BattlePass';
import { DailyChallenges } from '../components/Gamification/DailyChallenges';
import { PowerUpInventory } from '../components/Gamification/PowerUpInventory';
import Guilds from '../components/Arena/Guilds';
import Tournaments from '../components/Arena/Tournaments';
import NotificationCenter from '../components/Notifications/NotificationCenter';
import { useArena } from '../context/ArenaContext';

console.log('✅ ArenaView with Firebase Loading...');

// Loading Skeleton Components — red shimmer for BlayzEx theme consistency
const SkeletonCard = ({ className = '' }) => (
    <div className={`animate-pulse rounded-3xl ${className}`}
        style={{ background: 'linear-gradient(145deg, rgba(220, 38, 38, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)', border: '1px solid rgba(220, 38, 38, 0.1)' }}>
        <div className="p-6 space-y-4">
            <div className="h-4 rounded w-1/3 bg-gradient-to-r from-white/5 via-red-500/10 to-white/5 bg-[length:200%_100%]" style={{ animation: 'skeleton-loading 1.5s ease-in-out infinite' }}></div>
            <div className="h-8 rounded w-2/3 bg-gradient-to-r from-white/5 via-red-500/10 to-white/5 bg-[length:200%_100%]" style={{ animation: 'skeleton-loading 1.5s ease-in-out infinite' }}></div>
            <div className="h-4 rounded-full bg-gradient-to-r from-white/5 via-red-500/10 to-white/5 bg-[length:200%_100%]" style={{ animation: 'skeleton-loading 1.5s ease-in-out infinite' }}></div>
        </div>
    </div>
);

const SkeletonLeaderboard = () => (
    <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="animate-pulse rounded-2xl p-4 flex items-center gap-4"
                style={{ background: 'rgba(220, 38, 38, 0.03)', border: '1px solid rgba(220, 38, 38, 0.08)' }}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-white/5 via-red-500/10 to-white/5 bg-[length:200%_100%]" style={{ animation: 'skeleton-loading 1.5s ease-in-out infinite' }}></div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-white/5 via-red-500/10 to-white/5 bg-[length:200%_100%]" style={{ animation: 'skeleton-loading 1.5s ease-in-out infinite' }}></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 rounded w-24 bg-gradient-to-r from-white/5 via-red-500/10 to-white/5 bg-[length:200%_100%]" style={{ animation: 'skeleton-loading 1.5s ease-in-out infinite' }}></div>
                    <div className="h-3 rounded w-16 bg-gradient-to-r from-white/5 via-red-500/10 to-white/5 bg-[length:200%_100%]" style={{ animation: 'skeleton-loading 1.5s ease-in-out infinite' }}></div>
                </div>
            </div>
        ))}
    </div>
);

// --- LOCKED ARENA VIEW (PRE-LAUNCH) ---
export const ArenaView = ({ user }) => {
    const isLocked = true; // Set to false to unlock

    if (isLocked) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-in fade-in relative overflow-hidden">
                {/* Background FX */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />

                <div className="relative z-10 max-w-md mx-auto space-y-6">
                    <div className="w-24 h-24 mx-auto bg-red-600/10 rounded-full flex items-center justify-center border border-red-500/30 shadow-[0_0_30px_rgba(220,38,38,0.3)]">
                        <Lock size={40} className="text-red-500" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
                            Arena <span className="text-red-600">Locked</span>
                        </h1>
                        <p className="text-gray-400 font-medium">
                            Season 1 is currently under development.
                            Prepare your stats. The competition begins soon.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 opacity-50 pointer-events-none select-none">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                            <Trophy size={20} className="mx-auto mb-2 text-yellow-500" />
                            <p className="text-xs font-bold text-white">Leagues</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                            <Swords size={20} className="mx-auto mb-2 text-red-500" />
                            <p className="text-xs font-bold text-white">PvP Battles</p>
                        </div>
                    </div>

                    <div className="pt-8">
                        <p className="text-xs font-bold text-red-500 uppercase tracking-widest animate-pulse">
                            Access Restricted // Level 10 Required
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ... (Original Arena Code below for future unlock)
    return null;
};



