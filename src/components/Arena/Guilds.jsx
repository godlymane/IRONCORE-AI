import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Shield, MessageSquare, Plus, Crown, LogOut, Send,
    Trophy, Lock, Flame, Swords, Star, ChevronRight, TrendingUp,
    Timer, CheckCircle, Target, Zap, Award
} from 'lucide-react';
import { doc, onSnapshot, collection, query, limit as fbLimit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useArena } from '../../context/ArenaContext';
import {
    createGuild, joinGuild, leaveGuild, getGuilds,
    subscribeToGuild, sendGuildMessage, subscribeToGuildChat
} from '../../services/guildService';
import { Button, useToast } from '../UIComponents';
import { usePremium } from '../../context/PremiumContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

const suggestTag = (name) => {
    const words = name.trim().toUpperCase().split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 4);
    return words.map(w => w[0]).join('').slice(0, 4);
};

const getTimeToMonday3amUTC = () => {
    const now = new Date();
    const target = new Date(now);
    const day = target.getUTCDay(); // 0=Sun, 1=Mon
    const daysUntilMonday = day === 0 ? 1 : (8 - day) % 7 || 7;
    target.setUTCDate(target.getUTCDate() + daysUntilMonday);
    target.setUTCHours(3, 0, 0, 0);
    return Math.max(0, Math.floor((target - now) / 1000));
};

const formatCountdown = (secs) => {
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const FOCUS_OPTIONS = ['Strength', 'Cardio', 'Mixed'];
const MEMBERSHIP_OPTIONS = ['Open', 'Invite Only'];

const GUILD_PERKS = [
    { level: 5, name: 'Iron Cache', desc: '+5% XP from workouts', icon: '⚡' },
    { level: 10, name: 'War Drums', desc: 'Guild War participation unlocked', icon: '🥁' },
    { level: 15, name: 'Forge Bonus', desc: 'Forge Shield recharge +1/week', icon: '🔥' },
    { level: 20, name: 'Iron Elite', desc: '+10% XP from all activities', icon: '💎' },
    { level: 25, name: 'Legendary Status', desc: 'Custom guild banner + title', icon: '👑' },
];

// ─── Main Component ──────────────────────────────────────────────────────────

const Guilds = () => {
    const { currentUser, refreshUser } = useArena();
    const { addToast } = useToast();
    const { tier, requirePremium } = usePremium();
    const [guildId, setGuildId] = useState(currentUser?.guildId || null);
    const [currentGuild, setCurrentGuild] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    useEffect(() => { setGuildId(currentUser?.guildId); }, [currentUser]);

    useEffect(() => {
        if (!guildId) { setCurrentGuild(null); setLoading(false); return; }
        const unsubscribe = subscribeToGuild(guildId, (data) => {
            setCurrentGuild(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [guildId]);

    if (tier !== 'elite') {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center space-y-4 px-6">
                    <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                        <Lock size={32} className="text-yellow-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white italic uppercase">Iron Guilds</h2>
                    <p className="text-sm text-white/50 max-w-xs mx-auto">Create and join guilds to compete with friends. Available on Premium.</p>
                    <button onClick={() => requirePremium('elite', 'guilds')} className="px-6 py-3 rounded-xl font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                        Unlock Guilds
                    </button>
                </div>
            </div>
        );
    }

    const handleCreateGuild = async (guildData) => {
        try {
            const { name, description, tag, focusType, membershipType, minJoinLevel } = guildData;
            const id = await createGuild(name, description, {
                userId: currentUser.id,
                username: currentUser.username,
                avatarUrl: currentUser.avatarUrl,
            }, { tag, focusType, membershipType, minJoinLevel });
            await refreshUser();
            setGuildId(id);
            setShowCreateModal(false);
            addToast(`Guild [${tag}] ${name} created!`, 'success');
        } catch (error) {
            addToast(error.message, 'error');
        }
    };

    const handleJoinGuild = async (id) => {
        try {
            await joinGuild(id, { userId: currentUser.id, username: currentUser.username, avatarUrl: currentUser.avatarUrl });
            await refreshUser();
            setGuildId(id);
        } catch (error) {
            addToast(error.message, 'error');
        }
    };

    const confirmLeaveGuild = async () => {
        setShowLeaveConfirm(false);
        try {
            await leaveGuild(guildId, currentUser.id);
            await refreshUser();
            setGuildId(null);
        } catch (error) {
            addToast(error.message, 'error');
        }
    };

    if (loading) return <div className="p-8 text-center text-white/50">Loading Guild Data...</div>;

    return (
        <div className="min-h-[60vh]">
            {currentGuild ? (
                <GuildView guild={currentGuild} currentUser={currentUser} onLeave={() => setShowLeaveConfirm(true)} />
            ) : (
                <GuildBrowser
                    onJoin={handleJoinGuild}
                    onCreate={() => setShowCreateModal(true)}
                    currentUser={currentUser}
                />
            )}

            <AnimatePresence>
                {showCreateModal && (
                    <CreateGuildModal
                        onClose={() => setShowCreateModal(false)}
                        onSubmit={handleCreateGuild}
                        currentUser={currentUser}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showLeaveConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowLeaveConfirm(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="relative bg-gray-900 rounded-2xl border border-white/10 p-6 max-w-sm w-full shadow-2xl text-center"
                        >
                            <h3 className="text-lg font-bold text-white mb-2">Leave Guild?</h3>
                            <p className="text-sm text-white/50 mb-6">Are you sure you want to leave this guild?</p>
                            <div className="flex gap-3">
                                <Button onClick={() => setShowLeaveConfirm(false)} variant="secondary" className="flex-1">Cancel</Button>
                                <Button onClick={confirmLeaveGuild} variant="primary" className="flex-1 !bg-red-600">Leave</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Guild Browser ───────────────────────────────────────────────────────────

const GuildBrowser = ({ onJoin, onCreate, currentUser }) => {
    const [guilds, setGuilds] = useState([]);
    const [loading, setLoading] = useState(true);
    const userLevel = currentUser?.level || 1;
    const canCreate = userLevel >= 10;

    useEffect(() => {
        getGuilds().then(d => { setGuilds(d); setLoading(false); });
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white italic uppercase">Iron Guilds</h2>
                    <p className="text-white/50 text-sm">Join a clan, compete together.</p>
                </div>
                {canCreate ? (
                    <Button onClick={onCreate} variant="primary" className="flex items-center gap-2">
                        <Plus size={16} /> Create
                    </Button>
                ) : (
                    <button
                        disabled
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-gray-500 cursor-not-allowed"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                        title="Reach Level 10 to create a guild"
                    >
                        <Lock size={14} /> Lvl 10
                    </button>
                )}
            </div>

            {!canCreate && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
                    <Lock size={16} className="text-yellow-500 flex-shrink-0" />
                    <p className="text-xs text-yellow-400">Reach <span className="font-black">Level 10</span> to create your own guild. You&apos;re currently Level {userLevel}.</p>
                </div>
            )}

            <div className="grid gap-3">
                {loading ? (
                    <p className="text-center text-white/30 py-8">Loading guilds...</p>
                ) : guilds.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <Shield size={48} className="mx-auto text-white/20 mb-4" />
                        <p className="text-white/50">No guilds found. Be the first to start one!</p>
                        {canCreate && <Button onClick={onCreate} variant="secondary" className="mt-4">Start a Guild</Button>}
                    </div>
                ) : (
                    guilds.map(guild => (
                        <div key={guild.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-900 rounded-xl flex items-center justify-center text-xl font-black text-white">
                                    {guild.tag ? guild.tag[0] : guild.name[0]}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white">{guild.name}</h3>
                                        {guild.tag && <span className="text-[10px] font-bold text-gray-400 px-1.5 py-0.5 rounded bg-white/5">[{guild.tag}]</span>}
                                    </div>
                                    <p className="text-xs text-white/50 line-clamp-1">{guild.description}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded text-white/70 flex items-center gap-1">
                                            <Users size={10} /> {guild.memberCount}/{guild.maxMembers}
                                        </span>
                                        <span className="text-[11px] text-yellow-400 font-bold">Lvl {guild.level}</span>
                                        {guild.focusType && <span className="text-[11px] text-red-400">{guild.focusType}</span>}
                                    </div>
                                </div>
                            </div>
                            <Button onClick={() => onJoin(guild.id)} variant="secondary" className="text-xs">Join</Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// ─── Guild View (existing member) ────────────────────────────────────────────

const TABS = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'forge', label: 'Forge', icon: Flame },
    { id: 'war', label: 'War', icon: Swords },
    { id: 'perks', label: 'Perks', icon: Star },
    { id: 'rankings', label: 'Rankings', icon: Trophy },
];

const GuildView = ({ guild, currentUser, onLeave }) => {
    const [activeTab, setActiveTab] = useState('chat');

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-red-900 to-purple-900 rounded-3xl p-5 border border-red-500/30 overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Shield size={120} /></div>
                <div className="relative z-10 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl font-black text-white backdrop-blur-md border border-white/20">
                            {guild.tag ? guild.tag[0] : guild.name[0]}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">{guild.name}</h2>
                                {guild.tag && <span className="text-xs font-bold text-red-300 px-2 py-0.5 rounded bg-white/10">[{guild.tag}]</span>}
                            </div>
                            <p className="text-red-200/60 text-xs">{guild.focusType} · {guild.membershipType || 'Open'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-red-300 uppercase tracking-widest font-bold">Level</div>
                        <div className="text-3xl font-black text-white">{guild.level}</div>
                        <div className="text-xs text-red-300">{(guild.xp || 0).toLocaleString()} XP</div>
                    </div>
                </div>

                {/* Tab Bar */}
                <div className="flex items-center gap-1.5 mt-5 overflow-x-auto scrollbar-hide">
                    {TABS.map(t => {
                        const Icon = t.icon;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${activeTab === t.id ? 'bg-white text-red-900' : 'bg-black/20 text-white/70 hover:bg-black/30'}`}
                            >
                                <Icon size={13} />{t.label}
                            </button>
                        );
                    })}
                    <button onClick={onLeave} className="ml-auto flex-shrink-0 p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors">
                        <LogOut size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="min-h-[360px]">
                {activeTab === 'chat' && <GuildChat guildId={guild.id} currentUser={currentUser} />}
                {activeTab === 'members' && <GuildMembers members={guild.members || []} />}
                {activeTab === 'forge' && <ForgeAccountabilityWall members={guild.members || []} />}
                {activeTab === 'war' && <GuildWarStatus guild={guild} />}
                {activeTab === 'perks' && <GuildPerks guild={guild} />}
                {activeTab === 'rankings' && <GuildRankings />}
            </div>
        </div>
    );
};

// ─── Chat ────────────────────────────────────────────────────────────────────

const GuildChat = ({ guildId, currentUser }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const bottomRef = useRef(null);

    useEffect(() => {
        const unsub = subscribeToGuildChat(guildId, (msgs) => setMessages(msgs));
        return () => unsub();
    }, [guildId]);

    useEffect(() => {
        if (bottomRef.current) {
            const container = bottomRef.current.parentElement;
            if (container) {
                const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
                if (isNearBottom) {
                    bottomRef.current.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        try {
            await sendGuildMessage(guildId, { userId: currentUser.id, username: currentUser.username, message: input.trim(), avatarUrl: currentUser.avatarUrl || '' });
            setInput('');
        } catch (err) { console.error(err); }
    };

    return (
        <div className="bg-black/20 rounded-2xl border border-white/5 h-[400px] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {messages.length === 0 && <div className="text-center text-white/20 py-10">Start the conversation...</div>}
                {messages.map(msg => {
                    const isMe = msg.userId === currentUser.id;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] ${isMe ? 'bg-red-600' : 'bg-white/10'} px-4 py-2 rounded-2xl ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                                {!isMe && <p className="text-[11px] text-white/50 font-bold mb-1">{msg.username}</p>}
                                <p className="text-sm text-white">{msg.message}</p>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} className="p-3 bg-white/5 border-t border-white/5 flex gap-2">
                <input
                    type="text" value={input} onChange={e => setInput(e.target.value)}
                    placeholder="Message clan..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-red-500"
                />
                <button type="submit" className="p-2 bg-red-500 hover:bg-red-400 rounded-xl text-white transition-colors"><Send size={20} /></button>
            </form>
        </div>
    );
};

// ─── Members ─────────────────────────────────────────────────────────────────

const GuildMembers = ({ members }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {members.map((member, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
                        <img src={member.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`} alt={member.username} />
                    </div>
                    <div>
                        <p className="font-bold text-white text-sm flex items-center gap-2">
                            {member.username}
                            {member.role === 'leader' && <Crown size={12} className="text-yellow-400" />}
                        </p>
                        <p className="text-[11px] text-white/40 uppercase tracking-wider">{member.role}</p>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

// ─── Forge Accountability Wall ────────────────────────────────────────────────

const ForgeAccountabilityWall = ({ members }) => {
    const sorted = [...members].sort((a, b) => (b.forgeStreak || 0) - (a.forgeStreak || 0));

    return (
        <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                <Flame size={12} className="text-orange-500" /> Forge Accountability Wall
            </p>
            {sorted.map((member, i) => {
                const forge = member.forgeStreak || 0;
                const lastWorkout = member.lastWorkout ? new Date(member.lastWorkout).toLocaleDateString() : 'Never';
                const isActive = forge > 0;
                return (
                    <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{
                            background: isActive ? 'linear-gradient(145deg, rgba(234,88,12,0.08) 0%, rgba(0,0,0,0) 100%)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isActive ? 'rgba(234,88,12,0.25)' : 'rgba(255,255,255,0.07)'}`,
                        }}
                    >
                        <span className="text-[11px] font-bold text-gray-600 w-5 text-center">#{i + 1}</span>
                        <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-black text-gray-400">{member.username[0].toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-white truncate">{member.username}</p>
                                {member.role === 'leader' && <Crown size={10} className="text-yellow-400 flex-shrink-0" />}
                            </div>
                            <p className="text-[10px] text-gray-600">Last: {lastWorkout}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <div className={`flex items-center gap-1 ${isActive ? 'text-orange-400' : 'text-gray-700'}`}>
                                <Flame size={14} />
                                <span className="text-sm font-black">{forge}</span>
                            </div>
                            <p className="text-[10px] text-gray-600">day forge</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ─── Guild War Status ─────────────────────────────────────────────────────────

const GuildWarStatus = ({ guild }) => {
    const [countdown, setCountdown] = useState(getTimeToMonday3amUTC());

    useEffect(() => {
        const interval = setInterval(() => setCountdown(getTimeToMonday3amUTC()), 60000);
        return () => clearInterval(interval);
    }, []);

    const war = guild.war || {};
    const weeklyXp = war.weeklyXp || guild.weeklyXp || 0;
    const members = guild.members || [];
    const totalContrib = members.reduce((s, m) => s + (m.weeklyXpContribution || 0), 0) || 1;

    return (
        <div className="space-y-3">
            {/* War Header */}
            <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.12) 0%, rgba(127,29,29,0.1) 100%)', border: '1px solid rgba(220,38,38,0.25)' }}>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1.5">
                            <Swords size={12} /> Guild War — Week
                        </p>
                        <p className="text-3xl font-black text-white mt-1">{weeklyXp.toLocaleString()} <span className="text-sm text-gray-400">XP</span></p>
                        {war.rank && <p className="text-xs text-gray-400 mt-0.5">Rank #{war.rank} this week</p>}
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Reset in</p>
                        <div className="flex items-center gap-1 mt-1">
                            <Timer size={12} className="text-red-400" />
                            <span className="text-sm font-black text-white font-mono">{formatCountdown(countdown)}</span>
                        </div>
                        <p className="text-[10px] text-gray-600 mt-0.5">Mon 3AM UTC</p>
                    </div>
                </div>
                {war.lastResult && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                        <CheckCircle size={12} className="text-green-400" />
                        <p className="text-xs text-gray-400">Last week: <span className="text-white font-bold">{war.lastResult}</span></p>
                    </div>
                )}
            </div>

            {/* Per-member contribution */}
            <div className="space-y-2.5">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Member Contributions</p>
                {[...members]
                    .sort((a, b) => (b.weeklyXpContribution || 0) - (a.weeklyXpContribution || 0))
                    .map((member, i) => {
                        const contrib = member.weeklyXpContribution || 0;
                        const pct = Math.min((contrib / (totalContrib || 1)) * 100, 100);
                        return (
                            <div key={i} className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                        {member.username}
                                        {member.role === 'leader' && <Crown size={9} className="text-yellow-400" />}
                                    </span>
                                    <span className="text-[11px] font-mono text-red-400 font-bold">{contrib.toLocaleString()} XP</span>
                                </div>
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #dc2626, #ef4444)' }} />
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};

// ─── Guild Perks ──────────────────────────────────────────────────────────────

const GuildPerks = ({ guild }) => {
    const guildLevel = guild.level || 1;
    const xp = guild.xp || 0;
    const xpToNextLevel = guildLevel * 500;
    const xpProgress = Math.min((xp % (guildLevel * 500)) / (guildLevel * 500) * 100, 100);

    return (
        <div className="space-y-4">
            {/* Level Progress */}
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-black text-white">Guild Level {guildLevel}</span>
                    <span className="text-xs text-gray-400">{xp} / {xpToNextLevel} XP</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${xpProgress}%`, background: 'linear-gradient(90deg, #dc2626, #ef4444)' }} />
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">{xpToNextLevel - (xp % xpToNextLevel)} XP to Level {guildLevel + 1}</p>
            </div>

            {/* Perks List */}
            <div className="space-y-2.5">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5"><Award size={12} /> Guild Perks</p>
                {GUILD_PERKS.map(perk => {
                    const unlocked = guildLevel >= perk.level;
                    return (
                        <div
                            key={perk.level}
                            className="flex items-center gap-3 p-3 rounded-xl transition-all"
                            style={{
                                background: unlocked ? 'linear-gradient(145deg, rgba(220,38,38,0.1) 0%, rgba(0,0,0,0) 100%)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${unlocked ? 'rgba(220,38,38,0.3)' : 'rgba(255,255,255,0.07)'}`,
                            }}
                        >
                            <div className="text-xl w-8 text-center flex-shrink-0">{unlocked ? perk.icon : '🔒'}</div>
                            <div className="flex-1">
                                <p className={`text-sm font-bold ${unlocked ? 'text-white' : 'text-gray-600'}`}>{perk.name}</p>
                                <p className={`text-[11px] ${unlocked ? 'text-gray-400' : 'text-gray-700'}`}>{perk.desc}</p>
                            </div>
                            <div className="flex-shrink-0">
                                {unlocked ? (
                                    <CheckCircle size={16} className="text-green-500" />
                                ) : (
                                    <span className="text-[10px] font-black text-gray-600 px-2 py-1 rounded-lg bg-white/5">Lvl {perk.level}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── Guild Rankings ───────────────────────────────────────────────────────────

const GuildRankings = () => {
    const [guilds, setGuilds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Try global leaderboard doc first, fallback to querying guilds collection
        const globalRef = doc(db, 'global', 'data');
        const unsub = onSnapshot(globalRef, (snap) => {
            if (snap.exists() && snap.data().guildLeaderboard) {
                setGuilds(snap.data().guildLeaderboard.slice(0, 20));
            } else {
                // Fallback: query guilds directly
                import('firebase/firestore').then(({ getDocs, query, collection, orderBy, limit }) => {
                    getDocs(query(collection(db, 'guilds'), orderBy('xp', 'desc'), limit(20)))
                        .then(snapshot => setGuilds(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
                });
            }
            setLoading(false);
        }, (error) => {
            console.error('[Guilds] Snapshot error:', error);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    if (loading) return <div className="text-center py-12 text-white/30">Loading rankings...</div>;

    return (
        <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                <Trophy size={12} className="text-yellow-400" /> Top 20 Guilds
            </p>
            {guilds.length === 0 ? (
                <div className="text-center py-10 text-gray-600">No guilds ranked yet</div>
            ) : (
                guilds.map((g, i) => (
                    <div
                        key={g.id || i}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{
                            background: i < 3 ? 'linear-gradient(145deg, rgba(234,179,8,0.07) 0%, rgba(0,0,0,0) 100%)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${i < 3 ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.07)'}`,
                        }}
                    >
                        <span className={`text-sm font-black w-6 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                            #{i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white truncate">{g.name}</span>
                                {g.tag && <span className="text-[10px] text-gray-500">[{g.tag}]</span>}
                            </div>
                            <p className="text-[10px] text-gray-600">{g.memberCount || 0} members · Lv.{g.level || 1}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className="text-sm font-black text-red-400">{(g.xp || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-gray-600">XP</p>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

// ─── Create Guild Modal ───────────────────────────────────────────────────────

const CreateGuildModal = ({ onClose, onSubmit, currentUser }) => {
    const userLevel = currentUser?.level || 1;
    const canCreate = userLevel >= 10;

    const [name, setName] = useState('');
    const [tag, setTag] = useState('');
    const [focusType, setFocusType] = useState('Mixed');
    const [membershipType, setMembershipType] = useState('Open');
    const [minJoinLevel, setMinJoinLevel] = useState(5);
    const [description, setDescription] = useState('');
    const [tagTouched, setTagTouched] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Auto-suggest tag from name
    useEffect(() => {
        if (!tagTouched && name) setTag(suggestTag(name));
    }, [name, tagTouched]);

    const nameError = name.length > 0 && (name.length < 3 || name.length > 30 || !/^[a-zA-Z0-9 ]+$/.test(name));
    const tagError = tag.length > 0 && (tag.length < 2 || tag.length > 4 || !/^[A-Z]+$/.test(tag.toUpperCase()));
    const canSubmit = name.length >= 3 && name.length <= 30 && /^[a-zA-Z0-9 ]+$/.test(name)
        && tag.length >= 2 && tag.length <= 4 && !submitting && canCreate;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            await onSubmit({ name: name.trim(), description: description.trim(), tag: tag.toUpperCase(), focusType, membershipType, minJoinLevel });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                className="relative w-full max-w-sm rounded-2xl shadow-2xl my-4"
                style={{ background: 'linear-gradient(145deg, #111 0%, #0a0a0a 100%)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
                {/* Header */}
                <div className="px-5 pt-5 pb-3 border-b border-white/5">
                    <h2 className="text-xl font-black text-white italic uppercase">Create Guild</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Build your iron brotherhood</p>
                </div>

                {/* Level Gate */}
                {!canCreate && (
                    <div className="px-5 py-4">
                        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
                            <Lock size={24} className="text-yellow-400 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-black text-yellow-400">Level 10 Required</p>
                                <p className="text-xs text-gray-500 mt-0.5">You&apos;re Level {userLevel}. {10 - userLevel} more levels to go.</p>
                            </div>
                        </div>
                        <Button onClick={onClose} variant="secondary" className="w-full mt-4">Close</Button>
                    </div>
                )}

                {canCreate && (
                    <div className="px-5 py-4 space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-[11px] uppercase text-gray-500 font-black mb-1.5 tracking-wider">
                                Guild Name <span className="text-gray-700 normal-case font-normal">3–30 chars, letters/numbers/spaces</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                maxLength={30}
                                placeholder="e.g. Iron Legion"
                                className="w-full bg-black/50 border rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
                                style={{ borderColor: nameError ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)' }}
                            />
                            {nameError && <p className="text-[11px] text-red-400 mt-1">3–30 chars, letters, numbers and spaces only</p>}
                        </div>

                        {/* Tag */}
                        <div>
                            <label className="block text-[11px] uppercase text-gray-500 font-black mb-1.5 tracking-wider">
                                Guild Tag <span className="text-gray-700 normal-case font-normal">2–4 capital letters</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-black">[</span>
                                <input
                                    type="text"
                                    value={tag}
                                    onChange={e => { setTag(e.target.value.toUpperCase().slice(0, 4)); setTagTouched(true); }}
                                    maxLength={4}
                                    placeholder="IRON"
                                    className="w-full bg-black/50 border rounded-xl pl-7 pr-7 py-3 text-white focus:outline-none text-sm font-black tracking-widest text-center uppercase"
                                    style={{ borderColor: tagError ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)' }}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-black">]</span>
                            </div>
                            {tagError && <p className="text-[11px] text-red-400 mt-1">2–4 capital letters only</p>}
                        </div>

                        {/* Focus Type */}
                        <div>
                            <label className="block text-[11px] uppercase text-gray-500 font-black mb-1.5 tracking-wider">Focus Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {FOCUS_OPTIONS.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setFocusType(opt)}
                                        className="py-2.5 rounded-xl text-xs font-bold transition-all"
                                        style={{
                                            background: focusType === opt ? 'linear-gradient(135deg, rgba(220,38,38,0.6), rgba(185,28,28,0.6))' : 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${focusType === opt ? 'rgba(220,38,38,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                            color: focusType === opt ? '#fff' : '#6b7280',
                                        }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Membership */}
                        <div>
                            <label className="block text-[11px] uppercase text-gray-500 font-black mb-1.5 tracking-wider">Membership</label>
                            <div className="grid grid-cols-2 gap-2">
                                {MEMBERSHIP_OPTIONS.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setMembershipType(opt)}
                                        className="py-2.5 rounded-xl text-xs font-bold transition-all"
                                        style={{
                                            background: membershipType === opt ? 'linear-gradient(135deg, rgba(220,38,38,0.6), rgba(185,28,28,0.6))' : 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${membershipType === opt ? 'rgba(220,38,38,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                            color: membershipType === opt ? '#fff' : '#6b7280',
                                        }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Min Level */}
                        <div>
                            <label className="block text-[11px] uppercase text-gray-500 font-black mb-1.5 tracking-wider">
                                Min Level to Join: <span className="text-white font-black">{minJoinLevel}</span>
                            </label>
                            <input
                                type="range" min={1} max={20} value={minJoinLevel}
                                onChange={e => setMinJoinLevel(parseInt(e.target.value))}
                                className="w-full accent-red-500"
                            />
                            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                                <span>1</span><span>10</span><span>20</span>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-[11px] uppercase text-gray-500 font-black mb-1.5 tracking-wider">Motto / Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                maxLength={100}
                                rows={2}
                                placeholder="Guild motto or requirements..."
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none text-sm resize-none"
                            />
                        </div>

                        {/* Preview Card */}
                        <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.1), rgba(127,29,29,0.08))', border: '1px solid rgba(220,38,38,0.2)' }}>
                            <p className="text-[10px] uppercase text-gray-600 font-black mb-2 tracking-wider">Preview</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-900 rounded-xl flex items-center justify-center font-black text-white">
                                    {tag ? tag[0] : '?'}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-white">{name || 'Guild Name'}</span>
                                        <span className="text-[10px] text-gray-400 px-1.5 py-0.5 rounded bg-white/5">[{tag || '??'}]</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500">{focusType} · {membershipType} · Min Lv.{minJoinLevel}</p>
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-1">
                            <Button onClick={onClose} variant="secondary" className="flex-1">Cancel</Button>
                            <button
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                                className="flex-1 py-3 rounded-xl font-black text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ background: canSubmit ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'rgba(255,255,255,0.1)' }}
                            >
                                {submitting ? 'Creating...' : 'CREATE GUILD'}
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default Guilds;
