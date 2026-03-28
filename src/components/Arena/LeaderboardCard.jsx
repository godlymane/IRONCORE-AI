import React from 'react';
import { TrendingUp, TrendingDown, Crown, Medal } from 'lucide-react';

export const LeaderboardCard = React.memo(({ user, rank, isUser = false }) => {
    const getRankIcon = () => {
        if (rank === 1) return <Crown className="text-yellow-400" fill="currentColor" size={16} />;
        if (rank === 2) return <Medal className="text-gray-400" size={16} />;
        if (rank === 3) return <Medal className="text-orange-600" size={16} />;
        return null;
    };

    const getTrendIcon = () => {
        if (!user.trend) return null;
        if (user.trend > 0) return <TrendingUp size={12} className="text-green-400" />;
        if (user.trend < 0) return <TrendingDown size={12} className="text-red-400" />;
        return null;
    };

    return (
        <div className={`relative overflow-hidden rounded-2xl p-4 transition-all ${isUser
                ? 'bg-gradient-to-r from-red-900/60 to-purple-900/60 border-2 border-red-500/50 shadow-[0_0_30px_rgba(99,102,241,0.2)]'
                : 'bg-white/5 border border-white/10 hover:bg-white/10'
            }`}>
            <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="w-8 text-center">
                    {getRankIcon() || (
                        <span className={`text-lg font-black ${isUser ? 'text-red-400' : 'text-gray-500'}`}>
                            #{rank}
                        </span>
                    )}
                </div>

                {/* Avatar */}
                <div className="relative">
                    <img
                        src={user.avatar}
                        alt={user.name}
                        className={`w-12 h-12 rounded-full object-cover border-2 ${rank === 1 ? 'border-yellow-400' :
                                rank === 2 ? 'border-gray-400' :
                                    rank === 3 ? 'border-orange-600' :
                                        isUser ? 'border-red-400' : 'border-white/20'
                            }`}
                    />
                    <div className="absolute -bottom-1 -right-1 bg-black/80 px-1.5 py-0.5 rounded text-[11px] font-bold text-white border border-white/10">
                        {user.level}
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-white truncate">{user.name}</p>
                        {getTrendIcon()}
                        {user.trend && (
                            <span className={`text-[11px] ${user.trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {user.trend > 0 ? '+' : ''}{user.trend}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-400">{user.xp?.toLocaleString()} XP</p>
                </div>

                {/* Rank Badge */}
                {isUser && (
                    <div className="px-3 py-1 bg-red-600 rounded-full text-xs font-bold text-white">
                        YOU
                    </div>
                )}
            </div>
        </div>
    );
});
