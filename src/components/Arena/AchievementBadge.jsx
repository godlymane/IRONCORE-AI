import React from 'react';
import { Trophy, Star, Sparkles, X } from 'lucide-react';

export const AchievementBadge = React.memo(({ achievement, onDismiss }) => {
    if (!achievement) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onDismiss} />

            {/* Achievement Card */}
            <div className="relative bg-gradient-to-br from-yellow-900/90 to-orange-900/90 rounded-3xl p-8 border border-yellow-500/30 shadow-[0_0_60px_rgba(234,179,8,0.3)] max-w-sm w-full text-center">
                {/* Close */}
                <button
                    onClick={onDismiss}
                    className="absolute top-4 right-4 text-white/50 hover:text-white"
                >
                    <X size={20} />
                </button>

                {/* Sparkle decorations */}
                <div className="absolute top-4 left-4">
                    <Sparkles size={20} className="text-yellow-400 animate-pulse" />
                </div>
                <div className="absolute bottom-4 right-4">
                    <Star size={16} className="text-yellow-400 animate-pulse" fill="currentColor" />
                </div>

                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.5)]">
                    <span className="text-4xl">{achievement.icon || '🏆'}</span>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                    {achievement.title}
                </h2>

                {/* Description */}
                <p className="text-sm text-yellow-200/70 mb-4">
                    {achievement.desc}
                </p>

                {/* XP Reward */}
                {achievement.xp && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/30 rounded-full border border-yellow-500/20">
                        <Trophy size={16} className="text-yellow-400" />
                        <span className="text-lg font-black text-yellow-400">+{achievement.xp} XP</span>
                    </div>
                )}

                {/* Dismiss Button */}
                <button
                    onClick={onDismiss}
                    className="mt-6 w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-black text-black hover:scale-105 transition-transform"
                >
                    AWESOME!
                </button>
            </div>
        </div>
    );
});
