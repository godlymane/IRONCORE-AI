import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { User, Users, Calendar, Activity, Image as ImageIcon, LogOut, Flame, UserPlus, Check, X, Swords, Trophy, Medal } from 'lucide-react';
import { TrackView } from './TrackView';
import { StatsView } from './StatsView';
import { ChronicleView } from './ChronicleView';
import ProgressPhotos from '../components/Progress/ProgressPhotos';
import { PremiumIcon } from '../components/PremiumIcon';
import { GlassCard } from '../components/UIComponents';
import { ProfileSkeleton } from '../components/ViewSkeletons';
import { TrophyIconShape, ProteinBoltIcon, DumbbellIcon, UtensilsIcon } from '../components/IronCoreIcons';
import { useStore } from '../hooks/useStore';
import { PlayerCard, PlayerCardModal } from '../components/Profile/PlayerCard';
import { Achievements } from '../components/Gamification/Achievements';
import { db, auth } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// Iron Score color helper
const getIronScoreColor = (score) => {
    if (score >= 80) return '#eab308';
    if (score >= 60) return '#f97316';
    if (score >= 30) return '#dc2626';
    return '#6b7280';
};

// Mini progress ring for profile
const ProfileProgressRing = ({ progress: pct, size = 72, strokeWidth = 6, color = '#dc2626' }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (Math.min(pct, 100) / 100) * circumference;
    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
                strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            />
        </svg>
    );
};

export const ProfileHub = ({
    deleteEntry,
    onLogout
}) => {
    const {
        user, profile, progress, photos, meals, workouts, burned, leaderboard, userDoc,
        friends, friendRequests
    } = useStore();
    const [subTab, setSubTab] = useState('overview');
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [personalRecords, setPersonalRecords] = useState(null); // { exerciseName: { weight, date } }

    // Subscribe to PRs doc
    useEffect(() => {
        const uid = auth.currentUser?.uid || user?.uid;
        if (!uid) return;
        const unsub = onSnapshot(
            doc(db, 'users', uid, 'data', 'prs'),
            (snap) => setPersonalRecords(snap.exists() ? snap.data() : {}),
            (err) => console.warn('PRs listener:', err.code)
        );
        return unsub;
    }, [user?.uid]);

    const xp = profile?.xp || 0;
    const level = Math.floor(xp / 500) + 1;
    const xpProgress = (xp % 500) / 500 * 100;

    // Iron Score
    const ironScore = userDoc?.ironScore || 0;
    const ironScoreColor = getIronScoreColor(ironScore);
    const forgeShields = profile?.forgeShields || 0;

    // Forge streak (consecutive days with meals)
    const forgeCount = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const dates = [...new Set(meals.map(m => m.date))].sort().reverse();
        let count = 0;
        let checkDate = new Date(today);
        if (!dates.includes(today)) checkDate.setDate(checkDate.getDate() - 1);
        for (let i = 0; i < 365; i++) {
            const dateStr = checkDate.toISOString().split('T')[0];
            if (dates.includes(dateStr)) { count++; checkDate.setDate(checkDate.getDate() - 1); }
            else break;
        }
        return count;
    }, [meals]);

    const pendingRequests = useMemo(
        () => (friendRequests || []).filter(r => r.status === 'pending'),
        [friendRequests]
    );

    const handleRespondFriendRequest = useCallback(async (requestId, response) => {
        try {
            const { httpsCallable } = await import('firebase/functions');
            const { functions } = await import('../firebase');
            const fn = httpsCallable(functions, 'respondFriendRequest');
            await fn({ requestId, response });
        } catch (e) {
            console.error('respondFriendRequest error:', e);
        }
    }, []);

    const handleSendFriendRequest = useCallback(async (targetUid) => {
        try {
            const { httpsCallable } = await import('firebase/functions');
            const { functions } = await import('../firebase');
            const fn = httpsCallable(functions, 'sendFriendRequest');
            await fn({ targetUid });
        } catch (e) {
            console.error('sendFriendRequest error:', e);
        }
    }, []);

    // Show skeleton while profile data loads from Firestore
    if (!profile || Object.keys(profile).length === 0) return <ProfileSkeleton />;

    return (
        <div className="space-y-5 pb-4 animate-in fade-in">
            {/* Header with Logout */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">Profile</h2>
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Your Fitness Hub</p>
                </div>
                <button
                    onClick={onLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
                    style={{
                        background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                    }}
                >
                    <LogOut size={14} /> Sign Out
                </button>
            </div>

            {/* Player Card — identity card at top */}
            <PlayerCard isOwn={true} />

            {/* Level Card */}
            <GlassCard className="!p-6">
                <div className="flex items-center gap-4">
                    {/* Level Badge */}
                    <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
                        style={{
                            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.3) 0%, rgba(185, 28, 28, 0.2) 100%)',
                            border: '2px solid rgba(239, 68, 68, 0.4)',
                            boxShadow: '0 8px 30px rgba(220, 38, 38, 0.3)',
                        }}
                    >
                        <span className="text-3xl font-black text-white">{level}</span>
                        <TrophyIconShape className="absolute -top-1 -right-1 w-6 h-6" />
                    </div>

                    {/* XP Progress */}
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-white">Level {level}</span>
                            <span className="text-xs text-gray-400">{xp % 500} / 500 XP</span>
                        </div>
                        <div
                            className="h-3 rounded-full overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.1)' }}
                        >
                            <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{
                                    width: `${xpProgress}%`,
                                    background: 'linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
                                    boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)',
                                }}
                            />
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">{500 - (xp % 500)} XP to Level {level + 1}</p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 mt-5">
                    <StatMini icon={<PremiumIcon src={ProteinBoltIcon} size="sm" className="!w-6 !h-6" fallback={null} />} label="Total XP" value={xp} />
                    <StatMini icon={<PremiumIcon src={DumbbellIcon} size="sm" className="!w-6 !h-6" fallback={null} />} label="Workouts" value={workouts.length} />
                    <StatMini icon={<PremiumIcon src={UtensilsIcon} size="sm" className="!w-6 !h-6" fallback={null} />} label="Meals Logged" value={meals.length} />
                </div>

                {/* Iron Score Section */}
                <div
                    className="mt-4 pt-4 flex items-center gap-4"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <div className="relative flex-shrink-0">
                        <ProfileProgressRing
                            progress={Math.min(ironScore, 100)}
                            size={72}
                            strokeWidth={6}
                            color={ironScoreColor}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-black text-white">{ironScore || '—'}</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: ironScoreColor }}>
                            Iron Score
                        </p>
                        <p className="text-[10px] text-gray-600 mt-0.5 leading-tight">
                            League 40% · Consistency 25% · Nutrition 20% · Wins 10% · Body 5%
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                            <Flame size={11} className="text-orange-500 flex-shrink-0" />
                            <span>Forge: {forgeCount} days · {forgeShields} shield{forgeShields !== 1 ? 's' : ''}</span>
                        </p>
                    </div>
                </div>

                {/* Profile Completion Indicator */}
                <ProfileCompletion profile={profile} workouts={workouts} meals={meals} progress={progress} />
            </GlassCard>

            {/* Navigation */}
            <div
                className="flex p-1 rounded-2xl overflow-x-auto scrollbar-hide"
                style={{
                    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                {[
                    { id: 'overview', icon: <User size={14} />, label: 'Profile' },
                    { id: 'history', icon: <Calendar size={14} />, label: 'History' },
                    { id: 'stats', icon: <Activity size={14} />, label: 'Stats' },
                    { id: 'records', icon: <Trophy size={14} />, label: 'PRs' },
                    { id: 'achievements', icon: <Medal size={14} />, label: 'Badges' },
                    { id: 'gallery', icon: <ImageIcon size={14} />, label: 'Gallery' },
                    { id: 'friends', icon: <Users size={14} />, label: 'Friends', badge: pendingRequests.length },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap relative ${subTab === tab.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                            }`}
                        style={subTab === tab.id ? {
                            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.6) 0%, rgba(185, 28, 28, 0.6) 100%)',
                            boxShadow: '0 4px 20px rgba(220, 38, 38, 0.3)',
                        } : {}}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.badge > 0 && (
                            <span
                                className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 flex items-center justify-center rounded-full text-[9px] font-black text-white px-1"
                                style={{ background: '#dc2626' }}
                            >
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="min-h-[50vh]">
                {subTab === 'overview' && <TrackView />}
                {subTab === 'history' && <ChronicleView deleteEntry={deleteEntry} />}
                {subTab === 'stats' && <StatsView />}
                {subTab === 'records' && <PersonalRecordsSection prs={personalRecords} />}
                {subTab === 'achievements' && <Achievements />}
                {subTab === 'gallery' && <ProgressPhotos userId={user?.uid} />}
                {subTab === 'friends' && (
                    <FriendsSection
                        friends={friends || []}
                        pendingRequests={pendingRequests}
                        onViewPlayer={setSelectedPlayer}
                        onRespond={handleRespondFriendRequest}
                    />
                )}
            </div>

            {/* PlayerCardModal for viewing a friend's card */}
            <PlayerCardModal
                player={selectedPlayer}
                isOpen={!!selectedPlayer}
                onClose={() => setSelectedPlayer(null)}
                onChallenge={selectedPlayer ? () => setSelectedPlayer(null) : undefined}
            />
        </div>
    );
};

// ─── Personal Records Section ────────────────────────────────────────────────
const PersonalRecordsSection = ({ prs }) => {
    if (prs === null) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    const entries = Object.entries(prs || {})
        .map(([exercise, data]) => ({
            exercise,
            weight: data.weight,
            date: data.date ? new Date(data.date) : null,
        }))
        .sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return b.date - a.date; // most recent first
        });

    if (entries.length === 0) {
        return (
            <GlassCard className="!p-6 text-center">
                <div className="text-4xl mb-3">🏆</div>
                <p className="text-white font-bold text-sm">No PRs yet</p>
                <p className="text-gray-500 text-xs mt-1">
                    Complete sets during a workout to track your personal records
                </p>
            </GlassCard>
        );
    }

    const formatDate = (d) => {
        if (!d) return '—';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                Personal Records · {entries.length}
            </p>
            {entries.map(({ exercise, weight, date }) => (
                <div
                    key={exercise}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                        background: 'linear-gradient(145deg, rgba(234,179,8,0.06) 0%, rgba(10,10,10,0) 100%)',
                        border: '1px solid rgba(234,179,8,0.15)',
                    }}
                >
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                            background: 'linear-gradient(135deg, rgba(234,179,8,0.2), rgba(220,38,38,0.15))',
                            border: '1px solid rgba(234,179,8,0.3)',
                        }}
                    >
                        <Trophy size={14} className="text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{exercise}</p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{formatDate(date)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-black text-yellow-400 font-mono">{weight}kg</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─── Friends Section ─────────────────────────────────────────────
const FriendsSection = ({ friends, pendingRequests, onViewPlayer, onRespond }) => {
    const [responding, setResponding] = useState({});

    const handleRespond = async (requestId, response) => {
        setResponding(r => ({ ...r, [requestId]: response }));
        await onRespond(requestId, response);
        setResponding(r => { const n = { ...r }; delete n[requestId]; return n; });
    };

    return (
        <div className="space-y-4">
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
                <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3">
                        Pending Requests · {pendingRequests.length}
                    </p>
                    <div className="space-y-2">
                        {pendingRequests.map(req => (
                            <div
                                key={req.id}
                                className="flex items-center gap-3 p-3 rounded-xl"
                                style={{
                                    background: 'linear-gradient(145deg, rgba(245,158,11,0.08) 0%, rgba(10,10,10,0) 100%)',
                                    border: '1px solid rgba(245,158,11,0.2)',
                                }}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-white truncate">@{req.fromUsername}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">
                                        {req.fromLeague || 'Iron'} · Score {req.fromIronScore || '—'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleRespond(req.id, 'accept')}
                                    disabled={!!responding[req.id]}
                                    className="p-2 rounded-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                                    style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)' }}
                                >
                                    <Check size={14} className="text-green-400" />
                                </button>
                                <button
                                    onClick={() => handleRespond(req.id, 'decline')}
                                    disabled={!!responding[req.id]}
                                    className="p-2 rounded-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
                                >
                                    <X size={14} className="text-red-400" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Friends List */}
            <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3">
                    Friends · {friends.length}
                </p>
                {friends.length === 0 ? (
                    <div
                        className="text-center py-10 rounded-2xl"
                        style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        <Users size={28} className="text-gray-700 mx-auto mb-3" />
                        <p className="text-sm font-bold text-gray-600">No friends yet</p>
                        <p className="text-[11px] text-gray-700 mt-1">Challenge others in the Arena to connect</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {friends.map(friend => (
                            <button
                                key={friend.id || friend.uid}
                                onClick={() => onViewPlayer({
                                    uid: friend.uid,
                                    username: friend.username,
                                    xp: friend.xp || 0,
                                    ironScore: friend.ironScore || 0,
                                })}
                                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                                style={{
                                    background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                }}
                            >
                                {/* Avatar placeholder */}
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm text-white"
                                    style={{ background: 'rgba(220,38,38,0.3)', border: '1px solid rgba(239,68,68,0.4)' }}
                                >
                                    {(friend.username || 'A')[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-white truncate">@{friend.username}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">
                                        Score {friend.ironScore || '—'}
                                    </p>
                                </div>
                                <Swords size={14} className="text-gray-600 flex-shrink-0" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Mini Stat Component
const StatMini = ({ icon, label, value }) => (
    <div
        className="text-center p-3 rounded-xl"
        style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
        }}
    >
        <div className="flex justify-center mb-1">{icon}</div>
        <p className="text-lg font-black text-white">{value}</p>
        <p className="text-[11px] text-gray-500 uppercase font-bold">{label}</p>
    </div>
);

// Profile Completion Indicator Component
const ProfileCompletion = ({ profile, workouts, meals, progress }) => {
    const checks = [
        { label: 'Basic Info', complete: !!(profile?.weight && profile?.height && profile?.age) },
        { label: 'Goal Set', complete: !!profile?.goal },
        { label: 'Calories Calculated', complete: !!profile?.dailyCalories },
        { label: 'First Workout', complete: workouts?.length > 0 },
        { label: 'First Meal', complete: meals?.length > 0 },
        { label: 'Progress Tracked', complete: progress?.length > 0 },
    ];

    const completedCount = checks.filter(c => c.complete).length;
    const completionPercent = Math.round((completedCount / checks.length) * 100);

    if (completionPercent === 100) return null;

    return (
        <div
            className="mt-5 p-3 rounded-xl"
            style={{
                background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
            }}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-yellow-400 uppercase">Profile Completion</span>
                <span className="text-xs font-black text-yellow-400">{completionPercent}%</span>
            </div>
            <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.1)' }}
            >
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                        width: `${completionPercent}%`,
                        background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
                        boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)',
                    }}
                />
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
                {checks.filter(c => !c.complete).slice(0, 2).map((check, i) => (
                    <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 font-medium"
                    >
                        Missing: {check.label}
                    </span>
                ))}
            </div>
        </div>
    );
};
