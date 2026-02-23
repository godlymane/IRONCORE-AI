import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Swords, Crown, Medal, MessageCircle, Send, Zap,
    TrendingUp, Users, Flame, Lock
} from 'lucide-react';
import { GlassCard } from '../components/UIComponents';
import { LEVELS } from '../data/constants';
import { getLevel } from '../utils/helpers';
import { usePremium } from '../context/PremiumContext';

// Season config — single source of truth (move to Firestore config when dynamic seasons launch)
export const CURRENT_SEASON = 'Season 1';

// ArenaView — Live leaderboard, global chat, and battles

export const ArenaView = ({
    user, workouts = [], meals = [], burned = [],
    leaderboard = [], profile = {}, chat = [],
    sendMessage, battles = [], createBattle
}) => {
    const [arenaTab, setArenaTab] = useState('leaderboard');
    const { isPremium, requirePremium } = usePremium();
    const [chatText, setChatText] = useState('');
    const chatEndRef = useRef(null);

    const xp = profile?.xp || 0;
    const levelData = getLevel(xp, LEVELS);
    const level = levelData.level || Math.floor(xp / 500) + 1;

    // Auto-scroll chat
    useEffect(() => {
        if (arenaTab === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chat, arenaTab]);

    const handleSend = () => {
        const text = chatText.trim();
        if (!text || !sendMessage) return;
        sendMessage(text);
        setChatText('');
    };

    // Find user's rank
    const userRankIdx = leaderboard.findIndex(u => u.userId === user?.uid);
    const userRank = userRankIdx === -1 ? null : userRankIdx + 1;

    const getRankBadge = (rank) => {
        if (rank === 1) return <Crown size={16} className="text-yellow-400 fill-yellow-400" />;
        if (rank === 2) return <Medal size={16} className="text-gray-300" />;
        if (rank === 3) return <Medal size={16} className="text-orange-500" />;
        return <span className="text-xs font-bold text-gray-500">#{rank}</span>;
    };

    // Use the shared LEVELS constants for league name (single source of truth)
    const leagueData = getLevel(xp, LEVELS);
    const league = { name: leagueData.name, color: leagueData.color };

    return (
        <div className="space-y-5 pb-4 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-red-600 to-orange-600">
                        <Swords className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">Arena</h1>
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">{CURRENT_SEASON} — Live</p>
                    </div>
                </div>
                {userRank && (
                    <div
                        className="px-3 py-2 rounded-xl text-center"
                        style={{
                            background: 'linear-gradient(145deg, rgba(220, 38, 38, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)',
                            border: '1px solid rgba(220, 38, 38, 0.3)',
                        }}
                    >
                        <p className="text-lg font-black text-white">#{userRank}</p>
                        <p className="text-[10px] text-red-400 font-bold uppercase">Rank</p>
                    </div>
                )}
            </div>

            {/* User League Card */}
            <GlassCard highlight className="!p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-red-500/50">
                            {(profile?.photoURL || user?.photoURL) ? (
                                <img src={profile?.photoURL || user?.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">
                                    <Users size={20} />
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="font-black text-white">{user?.displayName || 'Athlete'}</p>
                            <p className={`text-xs font-bold ${league.color}`}>{league.name} League</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <p className="text-sm font-black text-yellow-400">{xp.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">XP</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-black text-white">Lv.{level}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Level</p>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Tab Switcher — Polished Pill */}
            <div className="relative flex p-1 rounded-2xl border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {/* Sliding Active Indicator */}
                <motion.div
                    className="absolute z-0 rounded-xl"
                    style={{
                        width: `calc((100% - 8px) / 3)`,
                        height: 'calc(100% - 8px)',
                        top: '4px',
                        background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.5) 0%, rgba(185, 28, 28, 0.3) 100%)',
                        boxShadow: '0 0 20px rgba(220, 38, 38, 0.4)',
                        border: '1px solid rgba(220, 38, 38, 0.4)',
                    }}
                    animate={{
                        left: `calc(${['leaderboard', 'chat', 'battles'].indexOf(arenaTab)} * (100% - 8px) / 3 + 4px)`,
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
                {[
                    { id: 'leaderboard', label: 'Ranks', icon: Trophy, premium: false },
                    { id: 'chat', label: 'Locker Room', icon: MessageCircle, premium: false },
                    { id: 'battles', label: 'Battles', icon: Swords, premium: true },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            if (tab.premium && !isPremium) {
                                requirePremium('guilds');
                                return;
                            }
                            setArenaTab(tab.id);
                        }}
                        className={`relative z-10 flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${arenaTab === tab.id
                            ? 'text-white'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                        {tab.premium && !isPremium && <Lock size={10} className="text-yellow-400" />}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {arenaTab === 'leaderboard' && (
                    <motion.div key="lb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                        {leaderboard.length === 0 ? (
                            <GlassCard className="!p-8 text-center">
                                <Trophy size={32} className="mx-auto mb-3 text-gray-600" />
                                <p className="text-gray-400 font-bold">No warriors yet</p>
                                <p className="text-xs text-gray-600 mt-1">Log workouts and meals to climb the ranks</p>
                            </GlassCard>
                        ) : (
                            leaderboard.slice(0, 50).map((entry, i) => {
                                const rank = i + 1;
                                const isMe = entry.userId === user?.uid;
                                const entryLevel = Math.floor((entry.xp || 0) / 500) + 1;
                                return (
                                    <div
                                        key={entry.userId || i}
                                        className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${isMe
                                            ? 'bg-gradient-to-r from-red-900/40 to-red-800/20 border-2 border-red-500/40'
                                            : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
                                            }`}
                                    >
                                        <div className="w-8 text-center flex-shrink-0">
                                            {getRankBadge(rank)}
                                        </div>
                                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/10 flex-shrink-0">
                                            {entry.photo ? (
                                                <img src={entry.photo} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500 text-xs font-bold">
                                                    {(entry.username || '?')[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={`font-bold truncate ${isMe ? 'text-red-400' : 'text-white'}`}>
                                                    {entry.username || 'Anonymous'}
                                                </p>
                                                {isMe && (
                                                    <span className="px-1.5 py-0.5 bg-red-600 rounded text-[10px] font-bold text-white flex-shrink-0">YOU</span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-500">Lv.{getLevel(entry.xp || 0, LEVELS).level || entryLevel} • {(entry.xp || 0).toLocaleString()} XP</p>
                                        </div>
                                        {entry.todayVolume > 0 && (
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-xs font-bold text-green-400">{Math.round(entry.todayVolume).toLocaleString()}</p>
                                                <p className="text-[10px] text-gray-600">vol</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </motion.div>
                )}

                {arenaTab === 'chat' && (
                    <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <GlassCard className="!p-0 overflow-hidden">
                            {/* Chat Messages */}
                            <div className="h-80 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                                {chat.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <MessageCircle size={28} className="text-gray-600 mb-2" />
                                        <p className="text-gray-500 text-sm font-bold">Locker Room is empty</p>
                                        <p className="text-gray-600 text-xs">Be the first to say something</p>
                                    </div>
                                ) : (
                                    chat.map((msg, i) => {
                                        const isMe = msg.userId === user?.uid;
                                        return (
                                            <div key={msg.id || i} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                                                    {msg.photo ? (
                                                        <img src={msg.photo} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500 text-[10px] font-bold">
                                                            {(msg.username || '?')[0].toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`max-w-[75%] ${isMe ? 'text-right' : ''}`}>
                                                    <p className="text-[10px] text-gray-500 font-bold mb-0.5">{msg.username || 'Anon'}</p>
                                                    <div className={`px-3 py-2 rounded-2xl text-sm ${isMe
                                                        ? 'bg-red-600/80 text-white rounded-tr-sm'
                                                        : 'bg-white/[0.06] text-gray-200 rounded-tl-sm'
                                                        }`}>
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Chat Input */}
                            <div className="border-t border-white/10 p-3 flex gap-2">
                                <input
                                    value={chatText}
                                    onChange={e => setChatText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                    placeholder="Talk trash..."
                                    className="flex-1 bg-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-red-500/50 transition-colors"
                                    maxLength={500}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!chatText.trim()}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
                                    style={{
                                        background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                                    }}
                                >
                                    <Send size={16} className="text-white" />
                                </button>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {arenaTab === 'battles' && (
                    <motion.div key="battles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                        {/* Active Battles */}
                        {battles.length === 0 ? (
                            <GlassCard className="!p-8 text-center">
                                <Swords size={32} className="mx-auto mb-3 text-gray-600" />
                                <p className="text-gray-400 font-bold">No active battles</p>
                                <p className="text-xs text-gray-600 mt-1">Challenge someone from the leaderboard to start a battle</p>
                            </GlassCard>
                        ) : (
                            battles.map((battle, i) => {
                                const isChallenger = battle.challenger?.userId === user?.uid;
                                const opponent = isChallenger ? battle.opponent : battle.challenger;
                                const opponentName = opponent?.username || 'Unknown Warrior';
                                const opponentPhoto = opponent?.photo;

                                return (
                                    <GlassCard key={battle.id || i} className="!p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-white/20 flex flex-shrink-0 items-center justify-center">
                                                    {opponentPhoto ? (
                                                        <img src={opponentPhoto} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Swords size={18} className="text-red-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">vs {opponentName}</p>
                                                    <p className="text-[11px] text-gray-500">
                                                        {battle.status === 'active' ? 'Battle Active' : battle.status}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-lg text-xs font-bold ${battle.status === 'active'
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                                }`}>
                                                {battle.status === 'active' ? 'LIVE' : battle.status?.toUpperCase()}
                                            </div>
                                        </div>
                                    </GlassCard>
                                );
                            })
                        )}

                        {/* Challenge from Leaderboard Prompt */}
                        <GlassCard className="!p-4">
                            <div className="flex items-center gap-3">
                                <Zap size={18} className="text-yellow-400" />
                                <div>
                                    <p className="text-sm font-bold text-white">Challenge a Rival</p>
                                    <p className="text-xs text-gray-500">Tap any user on the leaderboard to initiate a PvP battle</p>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ArenaView;
