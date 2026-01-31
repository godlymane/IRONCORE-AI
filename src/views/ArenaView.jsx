import React, { useState } from 'react';
import {
    Trophy, Swords, Star, Crown,
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

// Loading Skeleton Components
const SkeletonCard = ({ className = '' }) => (
    <div className={`animate-pulse bg-white/5 rounded-3xl ${className}`}>
        <div className="p-6 space-y-4">
            <div className="h-4 bg-white/10 rounded w-1/3"></div>
            <div className="h-8 bg-white/10 rounded w-2/3"></div>
            <div className="h-4 bg-white/10 rounded-full"></div>
        </div>
    </div>
);

const SkeletonLeaderboard = () => (
    <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="animate-pulse bg-white/5 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-8 h-8 bg-white/10 rounded-full"></div>
                <div className="w-12 h-12 bg-white/10 rounded-full"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-24"></div>
                    <div className="h-3 bg-white/10 rounded w-16"></div>
                </div>
            </div>
        ))}
    </div>
);

export const ArenaView = ({ user, workouts = [], meals = [], burned = 0 }) => {
    const [activeTab, setActiveTab] = useState('lobby');
    const [showAchievement, setShowAchievement] = useState(null);

    // Get real data from Firebase context
    const {
        currentUser,
        leaderboard,
        boss,
        pendingBattles,
        userRank,
        loading,
        isLoading,
        dealBossDamage,
        challengePlayer,
        awardXP,
        acceptBattle,
        declineBattle
    } = useArena();

    // Seed data for empty leaderboard (encouraging new users)
    const LEADERBOARD_SEEDS = [
        { id: 'seed_1', username: 'FitChampion', level: 15, xp: 2500, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Champion' },
        { id: 'seed_2', username: 'IronWarrior', level: 12, xp: 1800, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Warrior' },
        { id: 'seed_3', username: 'StreakMaster', level: 10, xp: 1200, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Streak' },
    ];

    // Use real leaderboard if available, otherwise show encouraging seeds
    const displayLeaderboard = leaderboard.length > 0 ? leaderboard : LEADERBOARD_SEEDS;

    // Format leaderboard data for components
    const formattedLeaderboard = displayLeaderboard.map((entry, index) => ({
        id: entry.id,
        name: entry.username,
        level: entry.level || 1,
        xp: entry.xp || 0,
        rank: index + 1,
        trend: 0, // Would need historical data
        avatar: entry.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.username}`,
        isUser: entry.id === currentUser?.id,
        isSeed: entry.id?.startsWith('seed_') // Flag seed entries
    }));

    const handleRaidEnter = async () => {
        try {
            // Calculate damage based on real workout data
            // Base damage + calories burned today / 10
            const todayCalories = burned || workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
            const baseDamage = 50;
            const damage = Math.max(baseDamage, Math.floor(baseDamage + todayCalories / 10));
            const result = await dealBossDamage(damage);

            if (result?.defeated) {
                setShowAchievement({
                    title: 'BOSS DEFEATED!',
                    desc: 'The community has defeated the titan!',
                    xp: 500,
                    icon: '👑'
                });
            } else {
                setShowAchievement({
                    title: 'Raid Damage!',
                    desc: `You dealt ${damage} damage to the boss!`,
                    xp: Math.floor(damage / 10),
                    icon: '⚔️'
                });
            }
        } catch (error) {
            console.error('Error entering raid:', error);
        }
    };

    const handleBattle = async (opponent) => {
        try {
            await challengePlayer(
                opponent?.id || 'opponent_001',
                opponent?.name || 'CyberGladiator',
                opponent?.xp || 1000
            );
            setShowAchievement({
                title: 'Battle Started!',
                desc: 'Challenge sent! May the strongest win!',
                xp: 50,
                icon: '⚔️'
            });
        } catch (error) {
            console.error('Error starting battle:', error);
        }
    };

    const handleAcceptBattle = async (battle) => {
        try {
            await acceptBattle(battle.id);

            // Simulate battle result based on XP comparison
            const userXP = currentUser?.xp || 0;
            const challengerXP = battle.challenger.xp || 0;
            const winChance = userXP / (userXP + challengerXP + 1);
            const userWins = Math.random() < winChance + 0.3; // Slight boost for defender

            if (userWins) {
                await awardXP(150, 'battle_victory');
                setShowAchievement({
                    title: 'VICTORY!',
                    desc: `You defeated ${battle.challenger.username}!`,
                    xp: 150,
                    icon: '🏆'
                });
            } else {
                setShowAchievement({
                    title: 'Defeat',
                    desc: `${battle.challenger.username} was too strong this time.`,
                    xp: 25,
                    icon: '💔'
                });
                await awardXP(25, 'battle_participation');
            }
        } catch (error) {
            console.error('Error accepting battle:', error);
        }
    };

    const handleDeclineBattle = async (battleId) => {
        try {
            await declineBattle(battleId);
            setShowAchievement({
                title: 'Battle Declined',
                desc: 'You can always challenge them back later!',
                xp: 0,
                icon: '🛡️'
            });
        } catch (error) {
            console.error('Error declining battle:', error);
        }
    };

    const handleClaimQuest = async (id) => {
        try {
            await awardXP(100, 'daily_quest');
            setShowAchievement({
                title: 'Daily Quest Complete',
                desc: 'You earned bonus XP!',
                xp: 100,
                icon: '📜'
            });
        } catch (error) {
            console.error('Error claiming quest:', error);
        }
    };

    // Calculate boss HP percentage
    const bossHPPercent = boss ? Math.round((boss.currentHP / boss.totalHP) * 100) : 45;
    const bossCurrentHP = boss?.currentHP?.toLocaleString() || '45,200';
    const bossTotalHP = boss?.totalHP?.toLocaleString() || '100,000';
    const bossName = boss?.name || 'The 100-Ton Titan';
    const contributorCount = boss?.contributors?.length || 42;

    const renderContent = () => {
        switch (activeTab) {
            case 'lobby':
                return (
                    <div className="space-y-6 pb-24 animate-in fade-in">
                        {/* Hero Section - Boss Card */}
                        {loading.boss ? (
                            <SkeletonCard className="min-h-[300px]" />
                        ) : (
                            <div className="relative overflow-hidden rounded-[32px] p-6 min-h-[300px] flex flex-col justify-end">
                                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542766788-a2f588f447ee?q=80&w=2676&auto=format&fit=crop')] bg-cover bg-center" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${boss?.status === 'active' ? 'bg-red-600 animate-pulse' : 'bg-green-600'}`}>
                                            {boss?.status === 'active' ? 'Live Boss' : 'Defeated'}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs font-bold text-red-400">
                                            <Clock size={12} />
                                            23:45:12
                                        </div>
                                    </div>

                                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">
                                        {bossName}
                                    </h2>

                                    {/* Boss Health Bar */}
                                    <div className="mb-4">
                                        <div className="flex justify-between text-xs font-bold text-white/70 mb-1">
                                            <span>HP: {bossCurrentHP} / {bossTotalHP}</span>
                                            <span className="text-red-400">-124/sec</span>
                                        </div>
                                        <div className="h-4 bg-black/50 rounded-full overflow-hidden border border-white/10">
                                            <div
                                                className="h-full bg-gradient-to-r from-red-600 to-orange-600 transition-all duration-500"
                                                style={{ width: `${bossHPPercent}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleRaidEnter}
                                            className="flex-1 bg-white text-black font-black py-3 rounded-xl hover:bg-gray-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            ENTER RAID
                                        </button>
                                        <div className="flex -space-x-3">
                                            {boss?.contributors?.slice(0, 3).map((c, i) => (
                                                <div
                                                    key={i}
                                                    className="w-10 h-10 rounded-full border-2 border-black bg-gray-800 overflow-hidden"
                                                >
                                                    <img
                                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.username}`}
                                                        alt=""
                                                        className="w-full h-full"
                                                    />
                                                </div>
                                            )) || [1, 2, 3].map(i => (
                                                <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-gray-800" />
                                            ))}
                                            <div className="w-10 h-10 rounded-full border-2 border-black bg-gray-900 flex items-center justify-center text-xs font-bold text-white">
                                                +{contributorCount}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Daily Challenges - Filter to today's data */}
                        <DailyChallenges
                            onClaim={handleClaimQuest}
                            todayWorkouts={workouts.filter(w => {
                                if (!w.date) return false;
                                const today = new Date().toISOString().split('T')[0];
                                return w.date.startsWith(today);
                            })}
                            todayMeals={meals.filter(m => {
                                if (!m.date) return false;
                                const today = new Date().toISOString().split('T')[0];
                                return m.date.startsWith(today);
                            })}
                            todayBurned={burned}
                        />

                        {/* Battle Pass Teaser */}
                        <div onClick={() => setActiveTab('season')} className="cursor-pointer hover:scale-[1.01] transition-transform">
                            <BattlePass level={currentUser?.level || 12} xp={currentUser?.xp || 450} />
                        </div>
                    </div>
                );

            case 'leaderboard':
                return (
                    <div className="space-y-4 pb-24 animate-in fade-in">
                        {loading.leaderboard ? (
                            <SkeletonLeaderboard />
                        ) : (
                            <>
                                {/* Top 3 Podium */}
                                <div className="flex justify-center items-end gap-2 mb-8 pt-4">
                                    {/* 2nd Place */}
                                    {formattedLeaderboard[1] && (
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 rounded-full border-4 border-gray-400 overflow-hidden mb-2 relative">
                                                <img src={formattedLeaderboard[1].avatar} className="w-full h-full object-cover" alt="" />
                                                <div className="absolute bottom-0 inset-x-0 bg-gray-400 text-[10px] font-bold text-center text-black">#2</div>
                                            </div>
                                            <p className="text-xs font-bold text-white/70 truncate max-w-16">{formattedLeaderboard[1].name}</p>
                                            <div className="h-24 w-20 bg-gradient-to-t from-gray-900 to-gray-800 rounded-t-2xl border-t border-gray-700 flex items-end justify-center pb-2">
                                                <span className="text-2xl font-black text-gray-500">2</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* 1st Place */}
                                    {formattedLeaderboard[0] && (
                                        <div className="flex flex-col items-center z-10">
                                            <Crown className="text-yellow-400 mb-2 animate-bounce" fill="currentColor" />
                                            <div className="w-20 h-20 rounded-full border-4 border-yellow-400 overflow-hidden mb-2 relative shadow-[0_0_30px_rgba(250,204,21,0.3)]">
                                                <img src={formattedLeaderboard[0].avatar} className="w-full h-full object-cover" alt="" />
                                                <div className="absolute bottom-0 inset-x-0 bg-yellow-400 text-[10px] font-bold text-center text-black">#1</div>
                                            </div>
                                            <p className="text-xs font-bold text-white truncate max-w-20">{formattedLeaderboard[0].name}</p>
                                            <div className="h-32 w-24 bg-gradient-to-t from-yellow-900/40 to-yellow-600/20 rounded-t-2xl border-t border-yellow-500/50 flex items-end justify-center pb-2 relative overflow-hidden">
                                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                                                <span className="text-4xl font-black text-yellow-500">1</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* 3rd Place */}
                                    {formattedLeaderboard[2] && (
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 rounded-full border-4 border-orange-700 overflow-hidden mb-2 relative">
                                                <img src={formattedLeaderboard[2].avatar} className="w-full h-full object-cover" alt="" />
                                                <div className="absolute bottom-0 inset-x-0 bg-orange-700 text-[10px] font-bold text-center text-white">#3</div>
                                            </div>
                                            <p className="text-xs font-bold text-white/70 truncate max-w-16">{formattedLeaderboard[2].name}</p>
                                            <div className="h-20 w-20 bg-gradient-to-t from-gray-900 to-orange-900/30 rounded-t-2xl border-t border-orange-800 flex items-end justify-center pb-2">
                                                <span className="text-2xl font-black text-orange-700">3</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* List - Users ranked 4+ */}
                                <div className="space-y-2">
                                    {formattedLeaderboard.filter(u => u.rank > 3).map((u) => (
                                        <LeaderboardCard key={u.id} user={u} rank={u.rank} isUser={u.isUser} />
                                    ))}
                                </div>

                                {/* Sticky User Rank */}
                                {currentUser && userRank && userRank > 3 && (
                                    <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto">
                                        <LeaderboardCard
                                            user={formattedLeaderboard.find(u => u.isUser) || {
                                                id: currentUser.id,
                                                name: currentUser.username,
                                                level: currentUser.level,
                                                xp: currentUser.xp,
                                                avatar: currentUser.avatarUrl
                                            }}
                                            rank={userRank}
                                            isUser={true}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                );

            case 'battles':
                return (
                    <div className="space-y-6 pb-24 animate-in fade-in">
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {['All', 'Ranked', 'Casual', 'History'].map(cat => (
                                <button key={cat} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold whitespace-nowrap hover:bg-white/10 transition-colors">
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Pending Battle Invites */}
                        {pendingBattles.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest pl-2">
                                    ⚡ Incoming Challenges ({pendingBattles.length})
                                </h3>
                                {pendingBattles.map(battle => (
                                    <div key={battle.id} className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${battle.challenger.username}`}
                                                    className="w-12 h-12 rounded-full"
                                                    alt=""
                                                />
                                                <div>
                                                    <p className="font-bold text-white">{battle.challenger.username}</p>
                                                    <p className="text-xs text-yellow-400">{battle.challenger.xp} XP</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAcceptBattle(battle)}
                                                    className="px-4 py-2 bg-green-600 rounded-xl text-xs font-bold hover:bg-green-500 transition-colors"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => handleDeclineBattle(battle.id)}
                                                    className="px-4 py-2 bg-red-600/50 rounded-xl text-xs font-bold hover:bg-red-600 transition-colors"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <PowerUpInventory
                            streakFreezeCount={currentUser?.streakFreezeCount || 0}
                            powerUps={currentUser?.powerUps || []}
                        />

                        <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest pl-2">Live Challenges</h3>
                        <div className="space-y-4">
                            {/* Get opponents from leaderboard (excluding self) */}
                            {formattedLeaderboard
                                .filter(u => u.id !== currentUser?.id)
                                .slice(0, 2)
                                .map(opponent => (
                                    <BattleCard
                                        key={opponent.id}
                                        opponent={{
                                            id: opponent.id,
                                            name: opponent.name,
                                            level: opponent.level,
                                            rank: opponent.rank || 'Iron Novice',
                                            avatar: opponent.avatar,
                                            winRate: Math.floor(Math.random() * 30) + 50, // TODO: Calculate from wins/losses
                                            power: (opponent.level || 1) * 100 + (opponent.xp || 0) / 10,
                                            streak: Math.floor(Math.random() * 5),
                                            xp: opponent.xp
                                        }}
                                        userStats={{
                                            name: currentUser?.username || 'You',
                                            level: currentUser?.level || 1,
                                            rank: currentUser?.league || 'Iron Novice',
                                            avatar: currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username}`,
                                            winRate: currentUser?.wins && currentUser?.losses
                                                ? Math.round((currentUser.wins / (currentUser.wins + currentUser.losses)) * 100)
                                                : 50,
                                            power: (currentUser?.level || 1) * 100 + (currentUser?.xp || 0) / 10
                                        }}
                                        onBattle={(opp) => handleBattle(opp)}
                                    />
                                ))}
                            {formattedLeaderboard.filter(u => u.id !== currentUser?.id).length === 0 && (
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center text-white/30">
                                    <Swords size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>No opponents yet - invite friends to battle!</p>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'guilds':
                return (
                    <div className="pb-24 animate-in fade-in">
                        <Guilds />
                    </div>
                );

            case 'tournaments':
                return (
                    <div className="pb-24 animate-in fade-in">
                        <Tournaments />
                    </div>
                );

            case 'season':
                return (
                    <div className="space-y-6 pb-24 animate-in fade-in">
                        <BattlePass level={currentUser?.level || 12} xp={currentUser?.xp || 450} />

                        <div className="bg-gradient-to-r from-red-900 to-red-900 rounded-3xl p-6 border border-white/10 text-center">
                            <Medal size={48} className="mx-auto text-white mb-4" />
                            <h3 className="text-2xl font-black text-white italic">{currentUser?.league || 'Diamond League'}</h3>
                            <p className="text-sm text-amber-300 mb-4">Ends in 14 days</p>
                            <button className="w-full py-3 bg-white text-red-900 font-black rounded-xl hover:bg-gray-100 transition-colors">
                                View Rewards
                            </button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen text-white">
            {/* Top Nav */}
            <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 flex justify-between items-center">
                <h1 className="text-xl font-black italic tracking-tighter uppercase">
                    {activeTab === 'lobby' ? 'Arena Lobby' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h1>
                <div className="flex gap-2 items-center">
                    {isLoading && (
                        <Loader2 size={16} className="animate-spin text-red-400" />
                    )}
                    <div className="px-3 py-1 bg-yellow-500/10 rounded-full border border-yellow-500/20 flex items-center gap-1">
                        <Star size={12} className="text-yellow-400" />
                        <span className="text-xs font-bold text-yellow-400">Lvl {currentUser?.level || user?.level || 1}</span>
                    </div>

                    {/* Notifications */}
                    <NotificationCenter userId={currentUser?.id || user?.id} />

                    <button className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors hidden sm:block">
                        <MessageCircle size={18} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-4">
                {renderContent()}
            </div>

            {/* Achievement Popup */}
            {showAchievement && (
                <AchievementBadge
                    achievement={showAchievement}
                    onDismiss={() => setShowAchievement(null)}
                />
            )}

            {/* Secondary Nav for Arena */}
            <div className="fixed bottom-24 left-0 right-0 z-20 flex justify-center pointer-events-none">
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-full p-1.5 flex gap-1 shadow-2xl pointer-events-auto overflow-x-auto max-w-[95vw]">
                    {[
                        { id: 'lobby', icon: Gamepad2 },
                        { id: 'battles', icon: Swords },
                        { id: 'leaderboard', icon: Trophy },
                        { id: 'guilds', icon: Shield },
                        { id: 'tournaments', icon: Calendar },
                        { id: 'season', icon: Crown },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`p-3 rounded-full transition-all ${activeTab === tab.id
                                ? 'bg-red-600 text-white shadow-lg scale-110'
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <tab.icon size={20} />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};



