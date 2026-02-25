/**
 * GuildDashboard — Cooperative guild goals section.
 * Visual-first shell with mock data. Shows team progress, member avatars, weekly goals.
 * Designed to embed inside ArenaView as a tab or section.
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Target, Trophy, Shield, Flame, TrendingUp } from 'lucide-react';
import { GlassCard } from '../UIComponents';

// Mock guild data — replace with Firestore when backend is ready
const MOCK_GUILD = {
  name: 'Iron Legion',
  tag: 'IRON',
  level: 7,
  xp: 34200,
  motto: 'Forged in fire, united in iron.',
  members: [
    { id: '1', name: 'Captain', photo: null, weeklyVolume: 12400, role: 'Leader' },
    { id: '2', name: 'BladeRunner', photo: null, weeklyVolume: 9800, role: 'Officer' },
    { id: '3', name: 'PhantomLift', photo: null, weeklyVolume: 8200, role: 'Member' },
    { id: '4', name: 'IronMaiden', photo: null, weeklyVolume: 7600, role: 'Member' },
    { id: '5', name: 'GhostRep', photo: null, weeklyVolume: 5400, role: 'Recruit' },
  ],
  weeklyGoals: [
    { id: 'vol', label: 'Lift 50,000 kg as a team', icon: '🏋️', current: 43400, target: 50000, unit: 'kg' },
    { id: 'workouts', label: 'Complete 30 team workouts', icon: '💪', current: 22, target: 30, unit: '' },
    { id: 'streak', label: 'All members active 5 days', icon: '🔥', current: 3, target: 5, unit: 'days' },
  ],
  recentActivity: [
    { member: 'Captain', action: 'crushed a Leg Day workout', time: '2h ago', xp: 50 },
    { member: 'BladeRunner', action: 'hit a new PR on Bench Press', time: '4h ago', xp: 75 },
    { member: 'IronMaiden', action: 'completed a Ghost Match victory', time: '6h ago', xp: 150 },
  ],
};

const GoalProgressBar = ({ goal }) => {
  const pct = Math.min((goal.current / goal.target) * 100, 100);
  const isComplete = pct >= 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{goal.icon}</span>
          <span className="text-[11px] font-bold text-white">{goal.label}</span>
        </div>
        <span className={`text-[10px] font-mono font-bold ${isComplete ? 'text-green-400' : 'text-gray-400'}`}>
          {goal.current.toLocaleString()}/{goal.target.toLocaleString()}{goal.unit}
        </span>
      </div>
      <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <motion.div
          className="h-full rounded-full relative"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 20 }}
          style={{
            background: isComplete
              ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)'
              : 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)',
          }}
        >
          {!isComplete && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                animation: 'progress-shimmer 2.5s ease-in-out infinite',
              }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
};

const MemberRow = ({ member, rank }) => {
  const roleColors = {
    Leader: 'text-yellow-400',
    Officer: 'text-blue-400',
    Member: 'text-gray-400',
    Recruit: 'text-gray-600',
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      {/* Rank */}
      <span className="text-[10px] font-bold text-gray-600 w-5 text-center">#{rank}</span>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-bold text-gray-500">
          {member.name[0].toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-white truncate">{member.name}</span>
          <span className={`text-[9px] font-bold uppercase ${roleColors[member.role] || 'text-gray-500'}`}>
            {member.role}
          </span>
        </div>
      </div>

      {/* Weekly Volume */}
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-bold text-red-400">{member.weeklyVolume.toLocaleString()}</p>
        <p className="text-[9px] text-gray-600">kg this week</p>
      </div>
    </div>
  );
};

export const GuildDashboard = ({ user }) => {
  const guild = MOCK_GUILD;
  const totalWeeklyVolume = useMemo(
    () => guild.members.reduce((sum, m) => sum + m.weeklyVolume, 0),
    [guild.members]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-3"
    >
      {/* Guild Banner */}
      <GlassCard highlight className="!p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(220,38,38,0.3) 0%, rgba(185,28,28,0.1) 100%)',
                border: '1px solid rgba(220,38,38,0.4)',
              }}
            >
              <Shield size={24} className="text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-lg uppercase tracking-tight">{guild.name}</h3>
                <span className="text-[9px] font-bold text-gray-500 px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                  [{guild.tag}]
                </span>
              </div>
              <p className="text-[11px] text-gray-500 italic">{guild.motto}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-white">Lv.{guild.level}</p>
            <p className="text-[10px] text-gray-500 uppercase font-bold">Guild</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: 'Members', value: guild.members.length, icon: Users },
            { label: 'Weekly Vol', value: `${(totalWeeklyVolume / 1000).toFixed(1)}k`, icon: TrendingUp },
            { label: 'Guild XP', value: guild.xp.toLocaleString(), icon: Flame },
          ].map(stat => (
            <div key={stat.label} className="py-2 px-2 rounded-xl bg-black/30 border border-white/5 text-center">
              <stat.icon size={14} className="text-red-400 mx-auto mb-1" />
              <p className="text-xs font-black text-white">{stat.value}</p>
              <p className="text-[9px] text-gray-600 uppercase">{stat.label}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Weekly Goals */}
      <GlassCard className="!p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target size={14} className="text-red-400" />
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Weekly Goals</h3>
        </div>
        <div className="space-y-3">
          {guild.weeklyGoals.map(goal => (
            <GoalProgressBar key={goal.id} goal={goal} />
          ))}
        </div>
      </GlassCard>

      {/* Member Leaderboard */}
      <GlassCard className="!p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={14} className="text-yellow-400" />
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Team Rankings</h3>
        </div>
        {guild.members
          .sort((a, b) => b.weeklyVolume - a.weeklyVolume)
          .map((member, i) => (
            <MemberRow key={member.id} member={member} rank={i + 1} />
          ))}
      </GlassCard>

      {/* Recent Activity Feed */}
      <GlassCard className="!p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame size={14} className="text-orange-400" />
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Activity Feed</h3>
        </div>
        <div className="space-y-2.5">
          {guild.recentActivity.map((activity, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-300">
                  <span className="font-bold text-white">{activity.member}</span>{' '}
                  {activity.action}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-600">{activity.time}</span>
                  <span className="text-[10px] text-yellow-400 font-bold">+{activity.xp} XP</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default GuildDashboard;
