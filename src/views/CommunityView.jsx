import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trophy, Users, Flame, Crown, Sword, Search, X, BarChart2, MessageSquare, Send, UserPlus, UserCheck, Heart, Image as ImageIcon, Camera, Mail, Swords, Skull } from 'lucide-react';
import { Button } from '../components/UIComponents';
import { getLevel } from '../utils/helpers';
import { LEVELS } from '../utils/constants';
import { SFX } from '../utils/audio';

export const CommunityView = ({ leaderboard, profile, updateData, workouts, setActiveTab, chat, sendMessage, following, toggleFollow, user, posts, createPost, sendPrivateMessage, inbox, globalFeed, isStorageReady, battles = [], createBattle, acceptBattle }) => {
    const [subTab, setSubTab] = useState('arena');
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [msgInput, setMsgInput] = useState("");
    const [dmInput, setDmInput] = useState("");
    const [caption, setCaption] = useState("");
    const [showPostModal, setShowPostModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    
    const chatEndRef = useRef(null);

    useEffect(() => {
        if (subTab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    const BASE_DAMAGE = 45200; 
    const currentDamage = BASE_DAMAGE + userDamage;
    const progress = Math.min((currentDamage / BOSS_TARGET) * 100, 100);
    const filteredLeaderboard = leaderboard.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Battle Logic
    const myBattles = battles.filter(b => b.challengerId === user?.uid || b.opponentId === user?.uid);
    const openBattles = battles.filter(b => b.status === 'pending' && b.opponentId !== user?.uid && b.challengerId !== user?.uid);

    const handleCreatePost = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        setUploading(true); await createPost(file, caption); setUploading(false); setShowPostModal(false); setCaption("");
    };
    
    const handleSendDM = async () => { if (!dmInput.trim() || !selectedPlayer) return; await sendPrivateMessage(selectedPlayer.userId, dmInput); setDmInput(""); alert("Message Sent!"); };

    const handleChallenge = async (opponent) => {
        if (!createBattle) return;
        if (confirm(`Challenge ${opponent.username} to a Volume Duel?`)) {
            await createBattle(opponent.userId, opponent.username);
            SFX.battleStart();
            alert("Challenge sent!");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in pb-24 relative">
            <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-800 overflow-x-auto scrollbar-hide">
                <NavBtn id="arena" label="Arena" icon={<Sword size={14}/>} active={subTab} set={setSubTab} />
                <NavBtn id="battles" label="Battles" icon={<Swords size={14}/>} active={subTab} set={setSubTab} />
                <NavBtn id="media" label="Media" icon={<ImageIcon size={14}/>} active={subTab} set={setSubTab} />
                <NavBtn id="chat" label="Locker" icon={<MessageSquare size={14}/>} active={subTab} set={setSubTab} />
                <NavBtn id="inbox" label="Inbox" icon={<Mail size={14}/>} active={subTab} set={setSubTab} />
            </div>

            {subTab === 'arena' && (
                <>
                    {!searchTerm && (
                    <div className="relative bg-gray-900 border border-red-900/50 p-6 rounded-3xl overflow-hidden group shadow-2xl">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                        <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity"><Sword size={80} className="text-red-600"/></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2"><span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">Community Boss</span><span className="text-red-400 text-xs font-bold uppercase animate-pulse">Live Event</span></div>
                            <h3 className="text-xl font-black italic text-white uppercase">The 100-Ton Titan</h3>
                            <p className="text-xs text-gray-400 mb-4">Goal: Lift 100,000kg total volume today.</p>
                            <div className="w-full h-5 bg-gray-800 rounded-full overflow-hidden border border-gray-700 relative"><div className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-1000 relative" style={{width: `${progress}%`}}><div className="absolute top-0 right-0 bottom-0 w-[2px] bg-white/50 animate-ping"></div></div><p className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-md">{Math.round(progress)}% DEFEATED</p></div>
                            <div className="flex justify-between text-[10px] font-mono text-gray-500 mt-1 uppercase"><span>{currentDamage.toLocaleString()}kg Dealt</span><span>{BOSS_TARGET.toLocaleString()}kg HP</span></div>
                            <div className="mt-4 bg-black/40 p-3 rounded-xl border border-white/5 flex items-center justify-between"><div><p className="text-[10px] text-gray-400 uppercase font-bold">Your Impact</p><p className={`text-lg font-black ${userDamage > 0 ? 'text-green-400' : 'text-gray-600'}`}>{userDamage.toLocaleString()} <span className="text-xs">kg</span></p></div>{userDamage > 0 ? (<div className="text-right"><span className="text-xs font-bold text-yellow-400">Contributor</span><p className="text-[9px] text-gray-500">Keep grinding!</p></div>) : (<span className="text-[9px] text-red-400 font-bold bg-red-900/20 px-2 py-1 rounded">No Damage Yet</span>)}</div>
                            <Button className={`w-full mt-3 border ${userDamage > 0 ? 'bg-orange-600 hover:bg-orange-500 border-orange-400 text-white' : 'bg-red-900/40 border-red-500/30 text-red-200 hover:bg-red-800/40'}`} onClick={() => setActiveTab('workout')}>{userDamage > 0 ? <><Sword size={16}/> Deal MORE Damage</> : "Join the Fight (Log Workout)"}</Button>
                        </div>
                    </div>
                    )}

                    <div className="space-y-3">
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Scout gladiators..." className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-10 text-sm text-white focus:border-indigo-500 outline-none placeholder:text-gray-600"/></div>
                        <div className="flex items-center justify-between px-1"><h3 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><Crown size={14} className="text-yellow-500"/> Global Elite</h3><span className="text-[10px] text-gray-600 uppercase">{filteredLeaderboard.length} Warriors</span></div>
                        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
                            {filteredLeaderboard.map((u, i) => (
                                <LeaderboardItem key={i} u={u} i={i} user={user} setSelectedPlayer={setSelectedPlayer} />
                            ))}
                        </div>
                    </div>
                </>
            )}

            {subTab === 'battles' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 p-6 rounded-3xl text-center">
                        <Swords size={40} className="mx-auto text-indigo-400 mb-2"/>
                        <h3 className="text-xl font-black italic text-white uppercase">PvP Arena</h3>
                        <p className="text-xs text-gray-400 max-w-xs mx-auto">Challenge rivals to a 24h Volume War. Who can lift more weight in a single day?</p>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase text-gray-500 pl-2">My Active Battles</h3>
                        {myBattles.length === 0 ? <p className="text-xs text-gray-600 text-center italic py-4">No active wars.</p> : myBattles.map(battle => {
                            const isChallenger = battle.challengerId === user.uid;
                            const opponentName = isChallenger ? battle.opponentName : battle.challengerName;
                            const opponentId = isChallenger ? battle.opponentId : battle.challengerId;
                            
                            // Find current volumes from leaderboard
                            const myEntry = leaderboard.find(l => l.userId === user.uid);
                            const oppEntry = leaderboard.find(l => l.userId === opponentId);
                            const myVol = myEntry?.todayVolume || 0;
                            const oppVol = oppEntry?.todayVolume || 0;
                            const amIWinning = myVol > oppVol;

                            return (
                                <div key={battle.id} className="bg-gray-900 border border-gray-800 p-4 rounded-2xl relative overflow-hidden">
                                    <div className="flex justify-between items-center mb-4 relative z-10">
                                        <div className="text-left">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">You</p>
                                            <p className="text-lg font-black text-white">{myVol.toLocaleString()} <span className="text-[10px]">kg</span></p>
                                        </div>
                                        <div className="text-center">
                                            <div className="bg-red-900/50 text-red-400 px-2 py-1 rounded text-[10px] font-black uppercase">VS</div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">{opponentName}</p>
                                            <p className="text-lg font-black text-gray-300">{oppVol.toLocaleString()} <span className="text-[10px]">kg</span></p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mb-2">
                                        <div className={`h-full ${amIWinning ? 'bg-green-500' : 'bg-red-500'}`} style={{width: '50%', transform: `translateX(${(myVol - oppVol) / 100}px)`}}></div>
                                    </div>
                                    <p className={`text-center text-xs font-bold uppercase ${amIWinning ? 'text-green-400' : 'text-red-400'}`}>{amIWinning ? 'You are leading!' : 'You are behind!'}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase text-gray-500 pl-2">Challenge a Rival</h3>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                            {leaderboard.filter(u => u.userId !== user.uid).map((u, i) => (
                                <div key={i} className="flex items-center justify-between p-3 border-b border-gray-800 last:border-0 hover:bg-gray-800 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 overflow-hidden">
                                            {u.photo ? <img src={u.photo} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center w-full h-full text-[10px]">?</div>}
                                        </div>
                                        <p className="text-sm font-bold text-gray-300">{u.username}</p>
                                    </div>
                                    <button onClick={() => handleChallenge(u)} className="text-[10px] font-black uppercase bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1">
                                        <Swords size={10}/> Fight
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {subTab === 'media' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-black italic text-white uppercase">The Gram</h3>
                        {isStorageReady && <button onClick={() => setShowPostModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"><Camera size={16}/> Post</button>}
                    </div>
                    {!isStorageReady && <p className="text-xs text-red-400 text-center">Media storage unavailable.</p>}
                    <div className="grid grid-cols-1 gap-4">
                        {posts.map(post => (
                            <div key={post.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                                <div className="flex items-center gap-3 p-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden border border-gray-700">
                                        {post.userPhoto ? <img src={post.userPhoto} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">?</div>}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{post.username}</p>
                                        <p className="text-[10px] text-indigo-400 uppercase font-bold">{getLevel(post.xp, LEVELS).name}</p>
                                    </div>
                                </div>
                                <img src={post.imageUrl} className="w-full aspect-square object-cover bg-black" />
                                <div className="p-3">
                                    <p className="text-sm text-gray-300"><span className="font-bold text-white">{post.username}</span> {post.caption}</p>
                                    <p className="text-[10px] text-gray-600 mt-1">{new Date(post.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
             
            {subTab === 'chat' && (
                <div className="h-[60vh] flex flex-col bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {chat.map(msg => (
                            <div key={msg.id} className={`flex items-start gap-3 ${msg.userId === user.uid ? 'flex-row-reverse' : ''}`}>
                                <div className="w-8 h-8 rounded-full bg-black border border-gray-700 flex-shrink-0 overflow-hidden">
                                    {msg.photo ? <img src={msg.photo} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-500">?</div>}
                                </div>
                                <div>
                                    <div className={`p-3 rounded-2xl text-xs max-w-[200px] ${msg.userId === user.uid ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-300 rounded-tl-none'}`}>
                                        <p className="font-bold text-[9px] opacity-70 mb-1">{msg.username}</p>
                                        {msg.text}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef}></div>
                    </div>
                    <div className="p-2 border-t border-gray-800 flex gap-2">
                        <input value={msgInput} onChange={e=>setMsgInput(e.target.value)} onKeyDown={e=>e.key==='Enter' && (sendMessage(msgInput), setMsgInput(""))} placeholder="Talk trash..." className="flex-grow bg-black rounded-xl px-4 text-xs text-white outline-none border border-gray-800 focus:border-indigo-500"/>
                        <button onClick={() => {sendMessage(msgInput); setMsgInput("");}} className="p-2 bg-indigo-600 rounded-xl text-white"><Send size={16}/></button>
                    </div>
                </div>
            )}

            {subTab === 'inbox' && (
                <div className="space-y-2">
                     <h3 className="text-xs font-bold uppercase text-gray-500 pl-2">Private Comms</h3>
                     {inbox.length === 0 ? <p className="text-xs text-gray-600 text-center italic py-4">No messages.</p> : inbox.map(msg => (
                         <div key={msg.id} className="bg-gray-900 border border-gray-800 p-4 rounded-2xl">
                             <div className="flex justify-between items-start mb-2">
                                 <div className="flex items-center gap-2">
                                     <div className="w-6 h-6 rounded-full bg-black overflow-hidden">{msg.fromPhoto && <img src={msg.fromPhoto} className="w-full h-full object-cover"/>}</div>
                                     <span className="text-xs font-bold text-white">{msg.fromName}</span>
                                 </div>
                                 <span className="text-[9px] text-gray-600">{new Date(msg.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                             </div>
                             <p className="text-sm text-gray-300">{msg.text}</p>
                         </div>
                     ))}
                </div>
            )}

            {/* User Details Modal (Simplified) */}
            {selectedPlayer && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95">
                    <div className="bg-gray-950 border border-gray-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                         <button onClick={() => setSelectedPlayer(null)} className="absolute top-4 right-4 text-gray-500"><X/></button>
                         <div className="text-center mb-6">
                             <div className="w-24 h-24 rounded-full border-4 border-indigo-500 mx-auto mb-4 overflow-hidden bg-gray-900">
                                 {selectedPlayer.photo ? <img src={selectedPlayer.photo} className="w-full h-full object-cover"/> : <UserPlus size={32} className="m-auto mt-6 text-gray-600"/>}
                             </div>
                             <h3 className="text-2xl font-black italic text-white uppercase">{selectedPlayer.username}</h3>
                             <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{getLevel(selectedPlayer.xp, LEVELS).name}</p>
                         </div>
                         <div className="grid grid-cols-2 gap-3 mb-6">
                             <div className="bg-gray-900 p-3 rounded-xl text-center"><p className="text-[9px] text-gray-500 uppercase font-bold">XP</p><p className="text-xl font-black text-white">{selectedPlayer.xp}</p></div>
                             <div className="bg-gray-900 p-3 rounded-xl text-center"><p className="text-[9px] text-gray-500 uppercase font-bold">Battle Ready</p><p className="text-xl font-black text-white">YES</p></div>
                         </div>
                         <div className="space-y-2">
                             <button onClick={() => {toggleFollow(selectedPlayer.userId);}} className={`w-full py-3 rounded-xl font-bold text-xs uppercase border ${following.includes(selectedPlayer.userId) ? 'bg-gray-900 text-gray-400 border-gray-800' : 'bg-indigo-600 text-white border-indigo-500'}`}>
                                 {following.includes(selectedPlayer.userId) ? 'Unfollow' : 'Follow'}
                             </button>
                             <div className="flex gap-2">
                                 <input value={dmInput} onChange={e=>setDmInput(e.target.value)} placeholder="Send Message..." className="flex-grow bg-gray-900 rounded-xl px-4 text-xs text-white outline-none border border-gray-800"/>
                                 <button onClick={handleSendDM} className="bg-gray-800 p-3 rounded-xl text-white hover:bg-gray-700"><Send size={16}/></button>
                             </div>
                         </div>
                    </div>
                </div>
            )}
            
            {showPostModal && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
                     <div className="bg-gray-950 border border-gray-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95">
                         <h3 className="text-xl font-black italic text-white uppercase mb-4">New Post</h3>
                         <input type="file" onChange={handleCreatePost} disabled={uploading} className="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 mb-4"/>
                         <textarea value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Write a caption..." className="w-full bg-gray-900 p-3 rounded-xl text-white text-xs outline-none border border-gray-800 mb-4 h-24"/>
                         <div className="flex gap-2">
                             <button onClick={() => setShowPostModal(false)} className="flex-1 bg-gray-800 py-3 rounded-xl text-gray-400 text-xs font-bold">Cancel</button>
                             <button disabled={uploading} className="flex-1 bg-white text-black py-3 rounded-xl text-xs font-bold uppercase">{uploading ? 'Posting...' : 'Share'}</button>
                         </div>
                     </div>
                </div>
            )}
        </div>
    );
};

const NavBtn = ({ id, label, icon, active, set }) => (
    <button onClick={() => set(id)} className={`flex-shrink-0 flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${active === id ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}>
        {icon} {label}
    </button>
);

const LeaderboardItem = ({ u, i, user, setSelectedPlayer }) => (
    <div onClick={() => setSelectedPlayer(u)} className={`flex items-center justify-between p-4 border-b border-gray-800/50 last:border-0 cursor-pointer hover:bg-gray-800 transition-colors ${u.userId === user?.uid ? 'bg-indigo-900/20' : ''}`}>
        <div className="flex items-center gap-3">
            <div className={`font-black italic text-lg w-6 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>{i + 1}</div>
            <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-gray-700">
                {u.photo ? <img src={u.photo} className="w-full h-full object-cover" alt="User"/> : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">?</div>}
            </div>
            <div>
                <p className="font-bold text-sm text-white flex items-center gap-2">{u.username || "Anonymous"}{u.userId === user?.uid && <span className="text-[9px] bg-indigo-500 text-white px-1.5 rounded">YOU</span>}</p>
                <p className="text-[9px] uppercase text-gray-500 font-bold">{getLevel(u.xp, LEVELS).name}</p>
            </div>
        </div>
        <div className="text-right">
            <p className="font-mono text-indigo-400 font-black text-sm">{u.xp}</p>
            {u.todayVolume > 0 && <p className="text-[8px] text-green-500 font-bold uppercase">{u.todayVolume/1000}k Vol</p>}
        </div>
    </div>
);