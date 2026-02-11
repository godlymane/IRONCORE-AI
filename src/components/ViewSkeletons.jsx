import React from 'react';
import { GlassCard } from './UIComponents';

// Shared shimmer bar
const Shimmer = ({ className = '' }) => (
  <div
    className={`bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded-lg ${className}`}
    style={{ animation: 'skeleton-loading 1.5s ease-in-out infinite' }}
  />
);

// --- DASHBOARD SKELETON ---
export const DashboardSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    {/* Header */}
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <Shimmer className="h-6 w-32" />
        <Shimmer className="h-3 w-20" />
      </div>
      <Shimmer className="w-12 h-12 rounded-full" />
    </div>

    {/* Main stats card with rings */}
    <GlassCard className="!p-6">
      <div className="flex items-center justify-center gap-6">
        <Shimmer className="w-28 h-28 rounded-full" />
        <div className="space-y-3">
          <Shimmer className="h-4 w-24" />
          <Shimmer className="h-8 w-32" />
          <Shimmer className="h-3 w-20" />
        </div>
      </div>
      <div className="flex justify-center gap-3 mt-4">
        <Shimmer className="h-14 w-20 rounded-xl" />
        <Shimmer className="h-14 w-20 rounded-xl" />
        <Shimmer className="h-14 w-20 rounded-xl" />
      </div>
    </GlassCard>

    {/* Quick actions grid */}
    <div className="grid grid-cols-4 gap-3">
      {[1, 2, 3, 4].map(i => (
        <GlassCard key={i} className="!p-3">
          <Shimmer className="w-10 h-10 rounded-xl mx-auto mb-2" />
          <Shimmer className="h-2 w-12 mx-auto" />
        </GlassCard>
      ))}
    </div>

    {/* AI input */}
    <GlassCard>
      <Shimmer className="h-12 w-full rounded-xl" />
    </GlassCard>
  </div>
);

// --- WORKOUT SKELETON ---
export const WorkoutSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    <div className="flex justify-between items-center">
      <Shimmer className="h-7 w-40" />
      <Shimmer className="h-10 w-28 rounded-2xl" />
    </div>

    <GlassCard className="!p-6">
      <Shimmer className="h-5 w-32 mb-3" />
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Shimmer className="w-10 h-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-4 w-3/4" />
              <Shimmer className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>

    <GlassCard>
      <Shimmer className="h-5 w-40 mb-3" />
      <div className="space-y-2">
        {[1, 2].map(i => (
          <Shimmer key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </GlassCard>
  </div>
);

// --- CHRONICLE SKELETON ---
export const ChronicleSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    <Shimmer className="h-7 w-48" />

    {/* Date scroll bar */}
    <div className="flex gap-2 overflow-hidden">
      {[1, 2, 3, 4, 5, 6, 7].map(i => (
        <Shimmer key={i} className="w-14 h-16 rounded-xl flex-shrink-0" />
      ))}
    </div>

    {/* Chart placeholder */}
    <GlassCard className="!p-4">
      <Shimmer className="h-40 w-full rounded-xl" />
    </GlassCard>

    {/* Meal list */}
    <GlassCard>
      <Shimmer className="h-5 w-28 mb-3" />
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 mb-3">
          <Shimmer className="w-8 h-8 rounded-lg" />
          <div className="flex-1 space-y-1">
            <Shimmer className="h-4 w-2/3" />
            <Shimmer className="h-3 w-1/3" />
          </div>
          <Shimmer className="h-5 w-14" />
        </div>
      ))}
    </GlassCard>
  </div>
);

// --- CARDIO SKELETON ---
export const CardioSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    <Shimmer className="h-7 w-36" />

    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map(i => (
        <GlassCard key={i} className="!p-4">
          <Shimmer className="w-8 h-8 rounded-lg mb-2" />
          <Shimmer className="h-6 w-16 mb-1" />
          <Shimmer className="h-3 w-20" />
        </GlassCard>
      ))}
    </div>

    <GlassCard className="!p-6">
      <Shimmer className="h-32 w-32 rounded-full mx-auto mb-4" />
      <Shimmer className="h-5 w-24 mx-auto" />
    </GlassCard>
  </div>
);

// --- ARENA SKELETON ---
export const ArenaSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    <div className="flex justify-between items-center">
      <Shimmer className="h-7 w-32" />
      <Shimmer className="h-8 w-8 rounded-full" />
    </div>

    {/* Battle card */}
    <GlassCard highlight className="!p-6">
      <div className="flex items-center gap-4">
        <Shimmer className="w-16 h-16 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-5 w-40" />
          <Shimmer className="h-3 w-28" />
          <Shimmer className="h-8 w-full rounded-full" />
        </div>
      </div>
    </GlassCard>

    {/* Leaderboard */}
    <GlassCard>
      <Shimmer className="h-5 w-28 mb-4" />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-3 mb-3">
          <Shimmer className="w-8 h-8 rounded-full" />
          <Shimmer className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-1">
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-3 w-16" />
          </div>
        </div>
      ))}
    </GlassCard>
  </div>
);

// --- PROFILE SKELETON ---
export const ProfileSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="space-y-1">
        <Shimmer className="h-7 w-28" />
        <Shimmer className="h-3 w-36" />
      </div>
      <Shimmer className="h-9 w-24 rounded-xl" />
    </div>

    {/* Level card */}
    <GlassCard className="!p-6">
      <div className="flex items-center gap-4">
        <Shimmer className="w-20 h-20 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-4 w-20" />
          <Shimmer className="h-3 w-full rounded-full" />
          <Shimmer className="h-3 w-28" />
        </div>
      </div>
    </GlassCard>

    {/* Stats grid */}
    <div className="grid grid-cols-4 gap-3">
      {[1, 2, 3, 4].map(i => (
        <GlassCard key={i} className="!p-3">
          <Shimmer className="h-6 w-10 mx-auto mb-1" />
          <Shimmer className="h-2 w-14 mx-auto" />
        </GlassCard>
      ))}
    </div>

    {/* Tab bar */}
    <div className="flex gap-2">
      {[1, 2, 3, 4].map(i => (
        <Shimmer key={i} className="h-9 flex-1 rounded-xl" />
      ))}
    </div>
  </div>
);

// --- AI LAB SKELETON ---
export const AILabSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    <div className="space-y-1">
      <Shimmer className="h-7 w-36" />
      <Shimmer className="h-3 w-52" />
    </div>

    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <GlassCard key={i} className="!p-4">
          <Shimmer className="w-10 h-10 rounded-xl mb-3" />
          <Shimmer className="h-4 w-24 mb-1" />
          <Shimmer className="h-3 w-full" />
        </GlassCard>
      ))}
    </div>
  </div>
);
