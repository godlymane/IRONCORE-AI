import React, { useState, useRef } from 'react';
import { User, Calendar, Activity, Image as ImageIcon, Camera, Trash2, LogOut } from 'lucide-react';
import { TrackView } from './TrackView';
import { StatsView } from './StatsView';
import { ChronicleView } from './ChronicleView';
import ProgressPhotos from '../components/Progress/ProgressPhotos';
import { PremiumIcon } from '../components/PremiumIcon';
import { GlassCard } from '../components/UIComponents';
import { ProfileSkeleton } from '../components/ViewSkeletons';
import { TrophyIconShape, ProteinBoltIcon, DumbbellIcon, UtensilsIcon } from '../components/IronCoreIcons';
import { useStore } from '../hooks/useStore';

export const ProfileHub = ({
    deleteEntry,
    onLogout
}) => {
    // Read state from Zustand store for optimal performance!
    const {
        user, profile, progress, photos, meals, workouts, burned, leaderboard
    } = useStore();
    const [subTab, setSubTab] = useState('overview');
    const xp = profile?.xp || 0;
    const level = Math.floor(xp / 500) + 1;
    const xpProgress = (xp % 500) / 500 * 100;

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
                    { id: 'gallery', icon: <ImageIcon size={14} />, label: 'Gallery' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${subTab === tab.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                            }`}
                        style={subTab === tab.id ? {
                            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.6) 0%, rgba(185, 28, 28, 0.6) 100%)',
                            boxShadow: '0 4px 20px rgba(220, 38, 38, 0.3)',
                        } : {}}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-[50vh]">
                {subTab === 'overview' && <TrackView />}
                {subTab === 'history' && <ChronicleView deleteEntry={deleteEntry} />}
                {subTab === 'stats' && <StatsView />}
                {subTab === 'gallery' && <ProgressPhotos userId={user?.uid} />}
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
    // Calculate completion based on various factors
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

    if (completionPercent === 100) return null; // Hide when complete

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




