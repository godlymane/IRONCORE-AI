import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trophy, Users, Flame, Crown, Search, X, BarChart2, MessageSquare, Send, UserPlus, UserCheck, Heart, Image as ImageIcon, Camera, Mail, Swords, Skull, Sparkles } from 'lucide-react';
import { Button, GlassCard, useToast } from '../components/UIComponents';
import { getLevel } from '../utils/helpers';
import { LEVELS } from '../utils/constants';
import { SFX } from '../utils/audio';

export const CommunityView = ({ leaderboard, profile, updateData, workouts, setActiveTab, chat, sendMessage, following, toggleFollow, user, posts, createPost, sendPrivateMessage, inbox, globalFeed, isStorageReady, battles = [], createBattle, acceptBattle }) => {
    const { addToast } = useToast();
    const [subTab, setSubTab] = useState('arena');
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [msgInput, setMsgInput] = useState("");
    const [dmInput, setDmInput] = useState("");
    const [caption, setCaption] = useState("");
    const [showPostModal, setShowPostModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [challengeTarget, setChallengeTarget] = useState(null);

    const chatEndRef = useRef(null);

    useEffect(() => {
        if (subTab === 'chat' && chatEndRef.current) {
            const container = chatEndRef.current.parentElement;
            if (container) {
                const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
                if (isNearBottom) {
                    chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
    }, [chat, subTab]);

    const userDamage = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todaysWorkouts = workouts.filter(w => {
            const d = w.createdAt?.seconds ? new Date(w.createdAt.seconds * 1000) : new Date(w.createdAt || w.date);
            return d.toISOString().split('T')[0] === today;
        });

        return todaysWorkouts.reduce((total, workout) => {
            let workoutVol = 0;
            if (workout.exercises) {
                workout.exercises.forEach(ex => { ex.sets.forEach(s => { workoutVol += (parseFloat(s.w) || 0) * (parseFloat(s.r) || 0); }); });
            }
            return total + workoutVol;
        }, 0);
    }, [workouts]);

    const BOSS_TARGET = 100000;
    const currentDamage = userDamage;
    const progress = Math.min((currentDamage / BOSS_TARGET) * 100, 100);
    const filteredLeaderboard = leaderboard.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase()));

    const myBattles = battles.filter(b => b.challengerId === user?.uid || b.opponentId === user?.uid);

    const handleCreatePost = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        setUploading(true); await createPost(file, caption); setUploading(false); setShowPostModal(false); setCaption("");
    };

    const handleSendDM = async () => { if (!dmInput.trim() || !selectedPlayer) return; await sendPrivateMessage(selectedPlayer.userId, dmInput); setDmInput(""); addToast("Message Sent!", "success"); };

    const handleChallenge = (opponent) => {
        if (!createBattle) return;
        setChallengeTarget(opponent);
    };

    const confirmChallenge = async () => {
        if (!challengeTarget) return;
        await createBattle(challengeTarget.userId, challengeTarget.username);
        SFX.battleStart();
        addToast("Challenge sent!", "success");
        setChallengeTarget(null);
    };

    return (
        <div className="space-y-5 animate-in fade-in pb-4 relative">
            {/* Navigation Tabs */}
            <div
                className="flex p-1 rounded-2xl overflow-x-auto scrollbar-hide"
                style={{
                    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                <NavBtn id="arena" label="Arena" icon={<Swords size={14} />} active={subTab} set={setSubTab} />
                <NavBtn id="battles" label="Battles" icon={<Swords size={14} />} active={subTab} set={setSubTab} />
                <NavBtn id="media" label="Media" icon={<ImageIcon size={14} />} active={subTab} set={setSubTab} />
                <NavBtn id="chat" label="Locker" icon={<MessageSquare size={14} />} active={subTab} set={setSubTab} />
                <NavBtn id="inbox" label="Inbox" icon={<Mail size={14} />} active={subTab} set={setSubTab} />
            </div>

            {subTab === 'arena' && (
                <>
                    {/* Community Boss Card */}
                    {!searchTerm && (
                        <GlassCard className="!p-6 relative overflow-hidden">
                            {/* Red glow effect */}
                            <div
                                className="absolute inset-0 opacity-20"
                                style={{
                                    background: 'radial-gradient(circle at top right, rgba(220, 38, 38, 0.4) 0%, transparent 60%)',
                                }}
                            />
                            <div className="absolute top-0 right-0 p-6 opacity-20">
                                <Swords size={80} className="text-red-600" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <span
                                        className="text-[11px] font-black px-2 py-0.5 rounded uppercase"
                                        style={{
                                            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                                        }}
                                    >
                                        Community Boss
                                    </span>
                                    <span className="text-red-400 text-xs font-bold uppercase animate-pulse flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        Live Event
                                    </span>
                                </div>
                                <h3 className="text-xl font-black italic text-white uppercase">The 100-Ton Titan</h3>
                                <p className="text-xs text-gray-400 mb-4">Goal: Lift 100,000kg total volume today.</p>

                                {/* Progress Bar */}
                                <div
                                    className="w-full h-6 rounded-full overflow-hidden relative"
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                    }}
                                >
                                    <div
                                        className="h-full transition-all duration-1000 relative"
                                        style={{
                                            width: `${progress}%`,
                                            background: 'linear-gradient(90deg, #dc2626 0%, #f97316 50%, #eab308 100%)',
                                            boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
                                        }}
                                    >
                                        <div className="absolute top-0 right-0 bottom-0 w-[2px] bg-white/50 animate-pulse" />
                                    </div>
                                    <p className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-white drop-shadow-lg">
                                        {Math.round(progress)}% DEFEATED
                                    </p>
                                </div>

                                <div className="flex justify-between text-[11px] font-mono text-gray-500 mt-2 uppercase">
                                    <span>{currentDamage.toLocaleString()}kg Dealt</span>
                                    <span>{BOSS_TARGET.toLocaleString()}kg HP</span>
                                </div>

                                {/* Your Impact Section */}
                                <div
                                    className="mt-4 p-4 rounded-2xl flex items-center justify-between"
                                    style={{
                                        background: 'linear-gradient(145deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.2) 100%)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                    }}
                                >
                                    <div>
                                        <p className="text-[11px] text-gray-400 uppercase font-bold">Your Impact</p>
                                        <p className={`text-xl font-black ${userDamage > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                                            {userDamage.toLocaleString()} <span className="text-xs">kg</span>
                                        </p>
                                    </div>
                                    {userDamage > 0 ? (
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-yellow-400 flex items-center gap-1">
                                                <Sparkles size={12} />
                                                Contributor
                                            </span>
                                            <p className="text-[11px] text-gray-500">Keep grinding!</p>
                                        </div>
                                    ) : (
                                        <span
                                            className="text-[11px] font-bold px-3 py-1.5 rounded-lg"
                                            style={{
                                                background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                color: '#f87171',
                                            }}
                                        >
                                            No Damage Yet
                                        </span>
                                    )}
                                </div>

                                <button
                                    onClick={() => setActiveTab('train')}
                                    className="w-full mt-4 py-4 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                                    style={{
                                        background: userDamage > 0
                                            ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.9) 0%, rgba(234, 179, 8, 0.9) 100%)'
                                            : 'linear-gradient(135deg, rgba(220, 38, 38, 0.8) 0%, rgba(239, 68, 68, 0.8) 100%)',
                                        boxShadow: userDamage > 0
                                            ? '0 10px 30px rgba(249, 115, 22, 0.3)'
                                            : '0 10px 30px rgba(220, 38, 38, 0.3)',
                                    }}
                                >
                                    <Swords size={16} />
                                    {userDamage > 0 ? 'Deal MORE Damage' : 'Join the Fight'}
                                </button>
                            </div>
                        </GlassCard>
                    )}

                    {/* Search & Leaderboard */}
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Scout gladiators..."
                                className="w-full py-4 pl-12 pr-4 rounded-2xl text-sm text-white outline-none placeholder:text-gray-600"
                                style={{
                                    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                }}
                            />
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                <Crown size={14} className="text-yellow-500" />
                                Global Arena
                            </h3>
                            <span className="text-[11px] text-gray-600 uppercase">{filteredLeaderboard.length} Warriors</span>
                        </div>

                        <GlassCard className="!p-0 overflow-hidden">
                            {filteredLeaderboard.map((u, i) => (
                                <LeaderboardItem key={i} u={u} i={i} user={user} setSelectedPlayer={setSelectedPlayer} />
                            ))}
                        </GlassCard>
                    </div>
                </>
            )}

            {subTab === 'battles' && (
                <div className="space-y-5">
                    {/* PvP Arena Header */}
                    <GlassCard highlight className="text-center !py-8">
                        <div
                            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <Swords size={28} className="text-red-400" />
                        </div>
                        <h3 className="text-xl font-black italic text-white uppercase">PvP Arena</h3>
                        <p className="text-xs text-gray-400 max-w-xs mx-auto mt-2">Challenge rivals to a 24h Volume War. Who can lift more weight in a single day?</p>
                    </GlassCard>

                    {/* My Active Battles */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase text-gray-500 pl-2">My Active Battles</h3>
                        {myBattles.length === 0 ? (
                            <p className="text-xs text-gray-600 text-center italic py-6">No active wars.</p>
                        ) : myBattles.map(battle => {
                            const isChallenger = battle.challengerId === user.uid;
                            const opponentName = isChallenger ? battle.opponentName : battle.challengerName;
                            const opponentId = isChallenger ? battle.opponentId : battle.challengerId;

                            const myEntry = leaderboard.find(l => l.userId === user.uid);
                            const oppEntry = leaderboard.find(l => l.userId === opponentId);
                            const myVol = myEntry?.todayVolume || 0;
                            const oppVol = oppEntry?.todayVolume || 0;
                            const amIWinning = myVol > oppVol;

                            return (
                                <GlassCard key={battle.id} className="!p-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="text-left">
                                            <p className="text-[11px] text-gray-500 uppercase font-bold">You</p>
                                            <p className="text-lg font-black text-white">{myVol.toLocaleString()} <span className="text-[11px]">kg</span></p>
                                        </div>
                                        <div
                                            className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.3) 0%, rgba(220, 38, 38, 0.1) 100%)',
                                                color: '#f87171',
                                            }}
                                        >
                                            VS
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] text-gray-500 uppercase font-bold">{opponentName}</p>
                                            <p className="text-lg font-black text-gray-300">{oppVol.toLocaleString()} <span className="text-[11px]">kg</span></p>
                                        </div>
                                    </div>
                                    <div
                                        className="w-full h-2 rounded-full overflow-hidden mb-2"
                                        style={{ background: 'rgba(255,255,255,0.1)' }}
                                    >
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: '50%',
                                                background: amIWinning ? '#22c55e' : '#ef4444',
                                                transform: `translateX(${(myVol - oppVol) / 100}px)`,
                                            }}
                                        />
                                    </div>
                                    <p className={`text-center text-xs font-bold uppercase ${amIWinning ? 'text-green-400' : 'text-red-400'}`}>
                                        {amIWinning ? 'You are leading!' : 'You are behind!'}
                                    </p>
                                </GlassCard>
                            );
                        })}
                    </div>

                    {/* Challenge Rivals */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase text-gray-500 pl-2">Challenge a Rival</h3>
                        <GlassCard className="!p-0 overflow-hidden max-h-60 overflow-y-auto">
                            {leaderboard.filter(u => u.userId !== user.uid).map((u, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-4 border-b last:border-0 transition-colors hover:bg-white/[0.02]"
                                    style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                            {u.photo ? <img src={u.photo} alt={u.username || 'User'} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-[11px] text-gray-500 bg-gray-800">{(u.username || '?')[0].toUpperCase()}</div>}
                                        </div>
                                        <p className="text-sm font-bold text-gray-300">{u.username}</p>
                                    </div>
                                    <button
                                        onClick={() => handleChallenge(u)}
                                        className="text-[11px] font-black uppercase px-4 py-2 rounded-xl flex items-center gap-1 transition-all hover:scale-105"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
                                            boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
                                        }}
                                    >
                                        <Swords size={10} /> Fight
                                    </button>
                                </div>
                            ))}
                        </GlassCard>
                    </div>
                </div>
            )}

            {subTab === 'media' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-black italic text-white uppercase">The Gram</h3>
                            <p className="text-[11px] text-gray-500">Community progress photos</p>
                        </div>
                        {isStorageReady && (
                            <button
                                onClick={() => setShowPostModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
                                    boxShadow: '0 8px 25px rgba(220, 38, 38, 0.3)',
                                }}
                            >
                                <Camera size={14} /> Post
                            </button>
                        )}
                    </div>
                    {!isStorageReady && <p className="text-xs text-red-400 text-center py-2">Media storage unavailable.</p>}
                    {posts.length === 0 ? (
                        <div className="text-center py-16 rounded-3xl" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                            <ImageIcon size={48} className="mx-auto mb-3 text-gray-600" />
                            <p className="text-sm text-gray-400 font-medium">No posts yet</p>
                            <p className="text-xs text-gray-600 mt-1">Complete a workout and share your progress.</p>
                        </div>
                    ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {posts.map(post => (
                            <GlassCard key={post.id} className="!p-0 overflow-hidden">
                                <div className="flex items-center gap-3 p-4">
                                    <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                        {post.userPhoto ? <img src={post.userPhoto} alt={post.username || 'User'} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[11px] text-gray-500 bg-gray-800">{(post.username || '?')[0].toUpperCase()}</div>}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{post.username}</p>
                                        <p className="text-[11px] text-red-400 uppercase font-bold">{getLevel(post.xp, LEVELS).name}</p>
                                    </div>
                                </div>
                                <img src={post.imageUrl} alt={post.caption || 'Progress photo'} className="w-full aspect-square object-cover bg-black" />
                                <div className="p-4">
                                    <p className="text-sm text-gray-300"><span className="font-bold text-white">{post.username}</span> {post.caption}</p>
                                    <p className="text-[11px] text-gray-600 mt-2">{new Date(post.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                    )}
                </div>
            )}

            {subTab === 'chat' && (
                <GlassCard className="h-[60vh] flex flex-col !p-0 overflow-hidden">
                    <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {chat.map(msg => (
                            <div key={msg.id} className={`flex items-start gap-3 ${msg.userId === user.uid ? 'flex-row-reverse' : ''}`}>
                                <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                    {msg.photo ? <img src={msg.photo} alt={msg.username || 'User'} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-500 bg-gray-800">{(msg.username || '?')[0].toUpperCase()}</div>}
                                </div>
                                <div
                                    className={`p-3 text-xs max-w-[200px] ${msg.userId === user.uid ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm'}`}
                                    style={msg.userId === user.uid ? {
                                        background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
                                        color: 'white',
                                    } : {
                                        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
                                        color: '#d1d5db',
                                    }}
                                >
                                    <p className="font-bold text-[11px] opacity-70 mb-1">{msg.username}</p>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef}></div>
                    </div>
                    <div
                        className="p-3 flex gap-2"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                    >
                        <input
                            value={msgInput}
                            onChange={e => setMsgInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && msgInput.trim() && (sendMessage(msgInput), setMsgInput(""))}
                            placeholder="Talk trash..."
                            maxLength={500}
                            className="flex-grow rounded-xl px-4 py-3 text-xs text-white outline-none"
                            style={{
                                background: 'linear-gradient(145deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}
                        />
                        <button
                            onClick={() => { if (!msgInput.trim()) return; sendMessage(msgInput); setMsgInput(""); }}
                            className="p-3 rounded-xl text-white transition-all hover:scale-105"
                            style={{
                                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
                            }}
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </GlassCard>
            )}

            {subTab === 'inbox' && (
                <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase text-gray-500 pl-2">Private Comms</h3>
                    {inbox.length === 0 ? (
                        <p className="text-xs text-gray-600 text-center italic py-8">No messages.</p>
                    ) : inbox.map(msg => (
                        <GlassCard key={msg.id} className="!p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                        {msg.fromPhoto ? <img src={msg.fromPhoto} alt={msg.fromName || 'User'} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-500 bg-gray-800">{(msg.fromName || '?')[0].toUpperCase()}</div>}
                                    </div>
                                    <span className="text-xs font-bold text-white">{msg.fromName}</span>
                                </div>
                                <span className="text-[11px] text-gray-600">{new Date(msg.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-gray-300">{msg.text}</p>
                        </GlassCard>
                    ))}
                </div>
            )}

            {/* User Details Modal */}
            {selectedPlayer && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in-95">
                    <GlassCard className="w-full max-w-sm !p-6 relative">
                        <button onClick={() => setSelectedPlayer(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
                        <div className="text-center mb-6">
                            <div
                                className="w-24 h-24 rounded-2xl mx-auto mb-4 overflow-hidden"
                                style={{
                                    border: '3px solid rgba(239, 68, 68, 0.5)',
                                    boxShadow: '0 0 30px rgba(220, 38, 38, 0.3)',
                                }}
                            >
                                {selectedPlayer.photo ? <img src={selectedPlayer.photo} alt={selectedPlayer.username || 'Player'} className="w-full h-full object-cover" /> : <UserPlus size={32} className="m-auto mt-6 text-gray-600" />}
                            </div>
                            <h3 className="text-2xl font-black italic text-white uppercase">{selectedPlayer.username}</h3>
                            <p className="text-xs font-bold text-red-400 uppercase tracking-widest mt-1">{getLevel(selectedPlayer.xp, LEVELS).name}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div
                                className="p-4 rounded-2xl text-center"
                                style={{
                                    background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}
                            >
                                <p className="text-[11px] text-gray-500 uppercase font-bold">XP</p>
                                <p className="text-xl font-black text-white">{selectedPlayer.xp}</p>
                            </div>
                            <div
                                className="p-4 rounded-2xl text-center"
                                style={{
                                    background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}
                            >
                                <p className="text-[11px] text-gray-500 uppercase font-bold">Battle Ready</p>
                                <p className="text-xl font-black text-green-400">YES</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={() => { toggleFollow(selectedPlayer.userId); }}
                                className="w-full py-4 rounded-xl font-bold text-xs uppercase transition-all"
                                style={following.includes(selectedPlayer.userId) ? {
                                    background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#9ca3af',
                                } : {
                                    background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
                                    color: 'white',
                                }}
                            >
                                {following.includes(selectedPlayer.userId) ? 'Unfollow' : 'Follow'}
                            </button>
                            <div className="flex gap-2">
                                <input
                                    value={dmInput}
                                    onChange={e => setDmInput(e.target.value)}
                                    placeholder="Send Message..."
                                    maxLength={500}
                                    className="flex-grow rounded-xl px-4 py-3 text-xs text-white outline-none"
                                    style={{
                                        background: 'linear-gradient(145deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                    }}
                                />
                                <button
                                    onClick={handleSendDM}
                                    className="p-3 rounded-xl text-white transition-all hover:scale-105"
                                    style={{
                                        background: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                                    }}
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Post Modal */}
            {showPostModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
                    <GlassCard className="w-full max-w-sm !p-6 relative animate-in zoom-in-95">
                        <h3 className="text-xl font-black italic text-white uppercase mb-4">New Post</h3>
                        <input
                            type="file"
                            onChange={handleCreatePost}
                            disabled={uploading}
                            className="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-500 mb-4"
                        />
                        <textarea
                            value={caption}
                            onChange={e => setCaption(e.target.value)}
                            placeholder="Write a caption..."
                            maxLength={300}
                            className="w-full p-4 rounded-xl text-white text-xs outline-none mb-4 h-24 resize-none"
                            style={{
                                background: 'linear-gradient(145deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowPostModal(false)}
                                className="flex-1 py-3 rounded-xl text-gray-400 text-xs font-bold transition-all"
                                style={{
                                    background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                disabled={uploading}
                                className="flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
                                    color: '#1f2937',
                                }}
                            >
                                {uploading ? 'Posting...' : 'Share'}
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Challenge Confirmation */}
            {challengeTarget && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in-95">
                    <GlassCard className="w-full max-w-sm !p-6 text-center">
                        <Swords size={32} className="mx-auto text-red-400 mb-3" />
                        <h3 className="text-lg font-black italic text-white uppercase mb-2">Volume Duel</h3>
                        <p className="text-sm text-white/50 mb-6">Challenge <span className="text-white font-bold">{challengeTarget.username}</span> to a 24h Volume War?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setChallengeTarget(null)}
                                className="flex-1 py-3 rounded-xl text-gray-400 text-xs font-bold"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmChallenge}
                                className="flex-1 py-3 rounded-xl text-white text-xs font-black uppercase"
                                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 4px 15px rgba(220,38,38,0.3)' }}
                            >
                                Fight
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};

const NavBtn = ({ id, label, icon, active, set }) => (
    <button
        onClick={() => set(id)}
        className={`flex-shrink-0 flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${active === id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
        style={active === id ? {
            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.8) 0%, rgba(185, 28, 28, 0.8) 100%)',
            boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
        } : {}}
    >
        {icon} {label}
    </button>
);

const LeaderboardItem = ({ u, i, user, setSelectedPlayer }) => (
    <div
        onClick={() => setSelectedPlayer(u)}
        className={`flex items-center justify-between p-4 border-b last:border-0 cursor-pointer transition-colors hover:bg-white/[0.02] ${u.userId === user?.uid ? 'bg-red-900/10' : ''}`}
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}
    >
        <div className="flex items-center gap-3">
            <div className={`font-black italic text-lg w-7 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                {i === 0 ? <Crown size={18} className="text-yellow-400" /> : i + 1}
            </div>
            <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                {u.photo ? <img src={u.photo} className="w-full h-full object-cover" alt="User" /> : <div className="w-full h-full flex items-center justify-center text-[11px] text-gray-500 bg-gray-800">?</div>}
            </div>
            <div>
                <p className="font-bold text-sm text-white flex items-center gap-2">
                    {u.username || "Anonymous"}
                    {u.userId === user?.uid && <span className="text-[11px] bg-red-500 text-white px-1.5 py-0.5 rounded">YOU</span>}
                </p>
                <p className="text-[11px] uppercase text-gray-500 font-bold">{getLevel(u.xp, LEVELS).name}</p>
            </div>
        </div>
        <div className="text-right">
            <p className="font-mono text-red-400 font-black text-sm">{u.xp}</p>
            {u.todayVolume > 0 && <p className="text-[8px] text-green-500 font-bold uppercase">{(u.todayVolume / 1000).toFixed(1)}k Vol</p>}
        </div>
    </div>
);


