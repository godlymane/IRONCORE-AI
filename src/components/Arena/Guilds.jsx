import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, MessageSquare, Plus, Search, Crown, LogOut, Send, Trophy, Lock } from 'lucide-react';
import { useArena } from '../../context/ArenaContext';
import { createGuild, joinGuild, leaveGuild, getGuilds, subscribeToGuild, sendGuildMessage, subscribeToGuildChat } from '../../services/guildService';
import { Button, useToast } from '../UIComponents';
import { usePremium } from '../../context/PremiumContext';

const Guilds = () => {
    const { currentUser, refreshUser } = useArena();
    const { addToast } = useToast();
    const { isPremium, requirePremium } = usePremium();
    const [guildId, setGuildId] = useState(currentUser?.guildId || null);
    const [currentGuild, setCurrentGuild] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    // Hooks must be called unconditionally before any conditional return
    useEffect(() => {
        setGuildId(currentUser?.guildId);
    }, [currentUser]);

    // Subscribe to guild if user is in one
    useEffect(() => {
        if (!guildId) {
            setCurrentGuild(null);
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeToGuild(guildId, (data) => {
            setCurrentGuild(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [guildId]);

    // Premium gate — guilds are premium-only
    if (!isPremium) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center space-y-4 px-6">
                    <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                        <Lock size={32} className="text-yellow-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white italic uppercase">Iron Guilds</h2>
                    <p className="text-sm text-white/50 max-w-xs mx-auto">Create and join guilds to compete with friends. Available on Premium.</p>
                    <button
                        onClick={() => requirePremium('guilds')}
                        className="px-6 py-3 rounded-xl font-bold text-white text-sm"
                        style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
                    >
                        Unlock Guilds
                    </button>
                </div>
            </div>
        );
    }

    const handleCreateGuild = async (name, desc) => {
        try {
            const id = await createGuild(name, desc, {
                userId: currentUser.id,
                username: currentUser.username,
                avatarUrl: currentUser.avatarUrl
            });
            await refreshUser(); // Update context with new guildId
            setGuildId(id);
            setShowCreateModal(false);
        } catch (error) {
            console.error('Failed to create guild:', error);
            addToast(error.message, 'error');
        }
    };

    const handleJoinGuild = async (id) => {
        try {
            await joinGuild(id, {
                userId: currentUser.id,
                username: currentUser.username,
                avatarUrl: currentUser.avatarUrl
            });
            await refreshUser();
            setGuildId(id);
        } catch (error) {
            addToast(error.message, 'error');
        }
    };

    const handleLeaveGuild = async () => {
        setShowLeaveConfirm(true);
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
                <GuildView
                    guild={currentGuild}
                    currentUser={currentUser}
                    onLeave={handleLeaveGuild}
                />
            ) : (
                <GuildBrowser
                    onJoin={handleJoinGuild}
                    onCreate={() => setShowCreateModal(true)}
                />
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateGuildModal
                        onClose={() => setShowCreateModal(false)}
                        onSubmit={handleCreateGuild}
                    />
                )}
            </AnimatePresence>

            {/* Leave Confirmation */}
            <AnimatePresence>
                {showLeaveConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowLeaveConfirm(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
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

// Sub-components

const GuildBrowser = ({ onJoin, onCreate }) => {
    const [guilds, setGuilds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGuilds = async () => {
            const data = await getGuilds();
            setGuilds(data);
            setLoading(false);
        };
        fetchGuilds();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white italic uppercase">Iron Guilds</h2>
                    <p className="text-white/50 text-sm">Join a clan, compete together.</p>
                </div>
                <Button onClick={onCreate} variant="primary" className="flex items-center gap-2">
                    <Plus size={16} />
                    Create Guild
                </Button>
            </div>

            <div className="grid gap-3">
                {loading ? (
                    <p className="text-center text-white/30 py-8">Loading guilds...</p>
                ) : guilds.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <Shield size={48} className="mx-auto text-white/20 mb-4" />
                        <p className="text-white/50">No guilds found. Be the first to start one!</p>
                        <Button onClick={onCreate} variant="secondary" className="mt-4">Start a Guild</Button>
                    </div>
                ) : (
                    guilds.map(guild => (
                        <div key={guild.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-purple-600 rounded-xl flex items-center justify-center text-xl font-black text-white">
                                    {guild.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{guild.name}</h3>
                                    <p className="text-xs text-white/50 line-clamp-1">{guild.description}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded text-white/70 flex items-center gap-1">
                                            <Users size={10} />
                                            {guild.memberCount}/{guild.maxMembers}
                                        </span>
                                        <span className="text-[11px] text-yellow-400 font-bold">
                                            Lvl {guild.level}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <Button onClick={() => onJoin(guild.id)} variant="secondary" className="text-xs">
                                Join
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const GuildView = ({ guild, currentUser, onLeave }) => {
    const [activeTab, setActiveTab] = useState('chat'); // chat, members

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-red-900 to-purple-900 rounded-3xl p-6 border border-red-500/30 overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Shield size={120} />
                </div>

                <div className="relative z-10 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl font-black text-white backdrop-blur-md border border-white/20">
                            {guild.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tight">{guild.name}</h2>
                            <p className="text-red-200/70 text-sm max-w-md">{guild.description}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-red-300 uppercase tracking-widest font-bold">Level</div>
                        <div className="text-4xl font-black text-white">{guild.level}</div>
                        <div className="text-xs text-red-300">
                            {guild.xp} XP
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 mt-6">
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'chat' ? 'bg-white text-red-900' : 'bg-black/20 text-white/70 hover:bg-black/30'}`}
                    >
                        <MessageSquare size={16} />
                        Clan Chat
                    </button>
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'members' ? 'bg-white text-red-900' : 'bg-black/20 text-white/70 hover:bg-black/30'}`}
                    >
                        <Users size={16} />
                        Members ({guild.memberCount})
                    </button>
                    <button
                        onClick={onLeave}
                        className="ml-auto px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'chat' ? (
                    <GuildChat guildId={guild.id} currentUser={currentUser} />
                ) : (
                    <GuildMembers members={guild.members} />
                )}
            </div>
        </div>
    );
};

const GuildChat = ({ guildId, currentUser }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const bottomRef = useRef(null);

    useEffect(() => {
        const unsubscribe = subscribeToGuildChat(guildId, (msgs) => {
            setMessages(msgs);
            // Scroll to bottom on new message? 
            // Ideally only if already near bottom or first load.
        });
        return () => unsubscribe();
    }, [guildId]);

    // Auto-scroll on mount/update
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        try {
            await sendGuildMessage(guildId, {
                userId: currentUser.id,
                username: currentUser.username,
                message: input.trim(),
                avatarUrl: currentUser.avatarUrl || ''
            });
            setInput('');
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="bg-black/20 rounded-2xl border border-white/5 h-[400px] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="text-center text-white/20 py-10">Start the conversation...</div>
                )}
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
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Message clan..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-red-500"
                />
                <button type="submit" className="p-2 bg-red-500 hover:bg-red-400 rounded-xl text-white transition-colors">
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};

const GuildMembers = ({ members }) => {
    return (
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
};

const CreateGuildModal = ({ onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative bg-gray-900 rounded-2xl border border-white/10 p-6 max-w-sm w-full shadow-2xl"
            >
                <h2 className="text-2xl font-bold text-white mb-4">Create Guild</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs uppercase text-white/50 font-bold mb-1">Guild Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-red-500"
                            placeholder="e.g. Iron Legion"
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-white/50 font-bold mb-1">Description</label>
                        <textarea
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-red-500 h-24 resize-none"
                            placeholder="Motto or requirements..."
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button onClick={onClose} variant="secondary" className="flex-1">Cancel</Button>
                        <Button onClick={() => onSubmit(name, desc)} variant="primary" className="flex-1">Create (Free)</Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Guilds;



