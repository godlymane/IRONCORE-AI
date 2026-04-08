import React, { useRef, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Palette, Frame, Award, Mic, FileText, Sparkles, Star,
  Crown, Lock, ChevronLeft, Check, Trophy
} from 'lucide-react';
import { usePremium } from '../context/PremiumContext';

// ─── Reward type to icon mapping ───────────────────────────────────────────────
const REWARD_ICONS = {
  xpBoost: Zap,
  theme: Palette,
  border: Frame,
  badge: Award,
  voicePack: Mic,
  template: FileText,
  effect: Sparkles,
  xp: Star,
};

// ─── Full 30-tier season data ──────────────────────────────────────────────────
const SEASON_TIERS = [
  {
    tier: 1,
    xpRequired: 100,
    freeReward: { type: 'xpBoost', name: '2x XP Boost (1hr)', icon: 'Zap' },
    premiumReward: { type: 'theme', name: 'Crimson Night Theme', icon: 'Palette' },
  },
  {
    tier: 2,
    xpRequired: 150,
    freeReward: { type: 'xp', name: '50 Bonus XP', icon: 'Star' },
    premiumReward: { type: 'border', name: 'Iron Frame Border', icon: 'Frame' },
  },
  {
    tier: 3,
    xpRequired: 200,
    freeReward: { type: 'template', name: 'Push Day Template', icon: 'FileText' },
    premiumReward: { type: 'effect', name: 'Ember Glow Effect', icon: 'Sparkles' },
  },
  {
    tier: 4,
    xpRequired: 250,
    freeReward: { type: 'xp', name: '100 Bonus XP', icon: 'Star' },
    premiumReward: { type: 'badge', name: 'Premium Badge: Fire Starter', icon: 'Award' },
  },
  {
    tier: 5,
    xpRequired: 300,
    freeReward: { type: 'border', name: 'Basic Steel Border', icon: 'Frame' },
    premiumReward: { type: 'border', name: 'Animated Flame Border', icon: 'Frame' },
  },
  {
    tier: 6,
    xpRequired: 350,
    freeReward: { type: 'xpBoost', name: '2x XP Boost (2hr)', icon: 'Zap' },
    premiumReward: { type: 'theme', name: 'Pulse Red Theme', icon: 'Palette' },
  },
  {
    tier: 7,
    xpRequired: 400,
    freeReward: { type: 'template', name: 'Pull Day Template', icon: 'FileText' },
    premiumReward: { type: 'badge', name: 'Premium Badge: Iron Will', icon: 'Award' },
  },
  {
    tier: 8,
    xpRequired: 450,
    freeReward: { type: 'xp', name: '150 Bonus XP', icon: 'Star' },
    premiumReward: { type: 'border', name: 'Neon Circuit Border', icon: 'Frame' },
  },
  {
    tier: 9,
    xpRequired: 500,
    freeReward: { type: 'template', name: 'Leg Day Template', icon: 'FileText' },
    premiumReward: { type: 'voicePack', name: '"Drill Sergeant" AI Voice', icon: 'Mic' },
  },
  {
    tier: 10,
    xpRequired: 550,
    freeReward: { type: 'badge', name: 'Basic Shield Badge', icon: 'Award' },
    premiumReward: { type: 'theme', name: 'Midnight Blue Theme', icon: 'Palette' },
  },
  {
    tier: 11,
    xpRequired: 600,
    freeReward: { type: 'xpBoost', name: '3x XP Boost (1hr)', icon: 'Zap' },
    premiumReward: { type: 'border', name: 'Holographic Border', icon: 'Frame' },
  },
  {
    tier: 12,
    xpRequired: 650,
    freeReward: { type: 'xp', name: '200 Bonus XP', icon: 'Star' },
    premiumReward: { type: 'badge', name: 'Premium Badge: Apex Predator', icon: 'Award' },
  },
  {
    tier: 13,
    xpRequired: 700,
    freeReward: { type: 'template', name: 'Full Body Template', icon: 'FileText' },
    premiumReward: { type: 'effect', name: 'Lightning Pulse Effect', icon: 'Sparkles' },
  },
  {
    tier: 14,
    xpRequired: 750,
    freeReward: { type: 'xpBoost', name: '2x XP Boost (2hr)', icon: 'Zap' },
    premiumReward: { type: 'border', name: 'Electric Storm Border', icon: 'Frame' },
  },
  {
    tier: 15,
    xpRequired: 800,
    freeReward: { type: 'badge', name: 'Basic Warrior Badge', icon: 'Award' },
    premiumReward: { type: 'voicePack', name: '"Zen Master" AI Voice', icon: 'Mic' },
  },
  {
    tier: 16,
    xpRequired: 850,
    freeReward: { type: 'xp', name: '250 Bonus XP', icon: 'Star' },
    premiumReward: { type: 'theme', name: 'Deep Violet Theme', icon: 'Palette' },
  },
  {
    tier: 17,
    xpRequired: 900,
    freeReward: { type: 'template', name: 'Upper/Lower Template', icon: 'FileText' },
    premiumReward: { type: 'badge', name: 'Premium Badge: Shadow Elite', icon: 'Award' },
  },
  {
    tier: 18,
    xpRequired: 950,
    freeReward: { type: 'xpBoost', name: '3x XP Boost (2hr)', icon: 'Zap' },
    premiumReward: { type: 'border', name: 'Plasma Edge Border', icon: 'Frame' },
  },
  {
    tier: 19,
    xpRequired: 1000,
    freeReward: { type: 'xp', name: '300 Bonus XP', icon: 'Star' },
    premiumReward: { type: 'effect', name: 'Aurora Borealis Effect', icon: 'Sparkles' },
  },
  {
    tier: 20,
    xpRequired: 1050,
    freeReward: { type: 'badge', name: 'Bronze Crown Badge', icon: 'Award' },
    premiumReward: { type: 'theme', name: 'Gold Rush Theme', icon: 'Palette' },
  },
  {
    tier: 21,
    xpRequired: 1100,
    freeReward: { type: 'template', name: 'PPL Split Template', icon: 'FileText' },
    premiumReward: { type: 'border', name: 'Diamond Frost Border', icon: 'Frame' },
  },
  {
    tier: 22,
    xpRequired: 1150,
    freeReward: { type: 'xpBoost', name: '4x XP Boost (1hr)', icon: 'Zap' },
    premiumReward: { type: 'badge', name: 'Premium Badge: War Machine', icon: 'Award' },
  },
  {
    tier: 23,
    xpRequired: 1200,
    freeReward: { type: 'xp', name: '400 Bonus XP', icon: 'Star' },
    premiumReward: { type: 'voicePack', name: '"Battle Commander" AI Voice', icon: 'Mic' },
  },
  {
    tier: 24,
    xpRequired: 1250,
    freeReward: { type: 'xpBoost', name: '3x XP Boost (3hr)', icon: 'Zap' },
    premiumReward: { type: 'theme', name: 'Obsidian Black Theme', icon: 'Palette' },
  },
  {
    tier: 25,
    xpRequired: 1300,
    freeReward: { type: 'badge', name: 'Silver Crown Badge', icon: 'Award' },
    premiumReward: { type: 'border', name: 'Animated Lightning Border', icon: 'Frame' },
  },
  {
    tier: 26,
    xpRequired: 1350,
    freeReward: { type: 'xp', name: '500 Bonus XP', icon: 'Star' },
    premiumReward: { type: 'badge', name: 'Premium Badge: Legendary', icon: 'Award' },
  },
  {
    tier: 27,
    xpRequired: 1400,
    freeReward: { type: 'template', name: 'HIIT Template', icon: 'FileText' },
    premiumReward: { type: 'effect', name: 'Cosmic Void Effect', icon: 'Sparkles' },
  },
  {
    tier: 28,
    xpRequired: 1450,
    freeReward: { type: 'xpBoost', name: '5x XP Boost (1hr)', icon: 'Zap' },
    premiumReward: { type: 'border', name: 'Inferno Crown Border', icon: 'Frame' },
  },
  {
    tier: 29,
    xpRequired: 1500,
    freeReward: { type: 'badge', name: 'Gold Star Badge', icon: 'Award' },
    premiumReward: { type: 'voicePack', name: '"Spartan General" AI Voice', icon: 'Mic' },
  },
  {
    tier: 30,
    xpRequired: 1550,
    freeReward: { type: 'badge', name: 'Season Veteran Badge', icon: 'Award' },
    premiumReward: { type: 'theme', name: 'Sovereign Gold Theme + Crown', icon: 'Palette' },
  },
];


// ─── Helper: get icon component from reward type ───────────────────────────────
const getRewardIcon = (type) => REWARD_ICONS[type] || Star;

// ─── Reward Card Component ─────────────────────────────────────────────────────
const RewardCard = ({ reward, side, tierNum, isClaimed, isLocked, isPremiumTrack, isPremium, onPremiumTap, currentTier }) => {
  const Icon = getRewardIcon(reward.type);
  const isReachable = tierNum <= currentTier;

  return (
    <div
      className={`relative flex-1 min-w-0 ${side === 'left' ? 'pr-2' : 'pl-2'}`}
      onClick={() => {
        if (isPremiumTrack && !isPremium && !isClaimed) {
          onPremiumTap();
        }
      }}
    >
      <div
        className={`card-glass rounded-xl p-2.5 transition-all duration-300 ${
          isReachable && !isLocked ? 'opacity-100' : 'opacity-50'
        } ${isPremiumTrack && !isPremium ? 'cursor-pointer' : ''}`}
        style={{
          border: isClaimed
            ? '1px solid rgba(34, 197, 94, 0.4)'
            : isReachable && isPremiumTrack && isPremium
            ? '1px solid rgba(220, 38, 38, 0.4)'
            : undefined,
        }}
      >
        {/* Premium lock overlay */}
        {isPremiumTrack && !isPremium && !isClaimed && (
          <div className="absolute inset-0 rounded-xl bg-black/60 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-1">
              <Lock size={14} className="text-gray-400" />
              <span className="text-[9px] font-bold text-yellow-500/80 uppercase tracking-wider">Premium</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isClaimed
                ? 'bg-green-500/20'
                : isPremiumTrack
                ? 'bg-yellow-500/10'
                : 'bg-red-500/10'
            }`}
          >
            {isPremiumTrack ? (
              <Crown size={14} className={isClaimed ? 'text-green-400' : 'text-yellow-500'} />
            ) : (
              <Icon size={14} className={isClaimed ? 'text-green-400' : 'text-red-400'} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] leading-tight text-white/80 font-medium truncate">
              {reward.name}
            </p>
            {isClaimed && (
              <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider">Claimed</span>
            )}
            {!isClaimed && isReachable && isPremiumTrack && isPremium && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="mt-0.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider
                  bg-gradient-to-r from-red-600 to-red-500 text-white
                  hover:scale-[1.02] active:scale-95 transition-transform"
              >
                Claim
              </motion.button>
            )}
            {!isClaimed && isReachable && !isPremiumTrack && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="mt-0.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider
                  bg-gradient-to-r from-red-600 to-red-500 text-white
                  hover:scale-[1.02] active:scale-95 transition-transform"
              >
                Claim
              </motion.button>
            )}
            {!isClaimed && !isReachable && (
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Locked</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Tier Circle Component ─────────────────────────────────────────────────────
const TierCircle = ({ tierNum, isCompleted, isCurrent, isLast }) => {
  return (
    <div className="flex flex-col items-center flex-shrink-0" style={{ width: 44 }}>
      {/* The tier circle */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-heading font-black text-sm relative z-10
          ${isCompleted
            ? 'bg-gradient-to-br from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30'
            : isCurrent
            ? 'border-2 border-red-500 text-red-400 animate-pulse-glow bg-red-500/10'
            : 'border-2 border-gray-700 text-gray-600 bg-gray-900/50'
          }
          ${isCurrent ? 'scale-110' : ''}
        `}
        style={isCurrent ? { boxShadow: '0 0 20px rgba(220, 38, 38, 0.5), 0 0 40px rgba(220, 38, 38, 0.2)' } : {}}
      >
        {isCompleted ? <Check size={16} className="text-white" /> : tierNum}
      </div>

      {/* Connecting line to next tier */}
      {!isLast && (
        <div
          className="w-0.5 h-6"
          style={{
            background: isCompleted
              ? 'linear-gradient(to bottom, #dc2626, #ef4444)'
              : 'rgba(75, 75, 75, 0.5)',
          }}
        />
      )}
    </div>
  );
};

// ─── Main BattlePassView ───────────────────────────────────────────────────────
export const BattlePassView = ({ onClose, user }) => {
  const { isPremium, requirePremium } = usePremium();
  const currentTierRef = useRef(null);
  const [bpError, setBpError] = useState(null);

  const [bpData, setBpData] = useState({
    currentTier: 1,
    currentXP: 0,
    xpForNextTier: 100,
    claimedFreeRewards: [],
    claimedPremiumRewards: [],
  });

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, 'users', user.uid, 'data', 'battlePass')).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setBpData({
          currentTier: d.currentTier || 1,
          currentXP: d.currentXP || 0,
          xpForNextTier: d.xpForNextTier || 100,
          claimedFreeRewards: d.claimedFreeRewards || [],
          claimedPremiumRewards: d.claimedPremiumRewards || [],
        });
      }
    }).catch((err) => {
      console.error('BattlePass load error:', err);
      setBpError('Failed to load Battle Pass data. Check your connection.');
    });
  }, [user?.uid]);

  const { currentTier, currentXP, xpForNextTier, claimedFreeRewards, claimedPremiumRewards } = bpData;

  // Auto-scroll to current tier on mount
  useEffect(() => {
    if (currentTierRef.current) {
      setTimeout(() => {
        currentTierRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    }
  }, []);

  const xpPercent = Math.min((currentXP / xpForNextTier) * 100, 100);

  const handlePremiumTap = () => {
    requirePremium('elite', 'battlePassPremiumTrack');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[90] bg-black overflow-y-auto"
    >
      <div className="max-w-md mx-auto px-4 pb-12">

        {/* Error Banner */}
        {bpError && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
            {bpError}
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-sm pt-4 pb-3 -mx-4 px-4">
          <div className="flex items-center justify-between mb-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              aria-label="Go back"
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center
                hover:bg-white/10 active:scale-95 transition-all"
            >
              <ChevronLeft size={20} className="text-white" />
            </motion.button>

            <div className="text-center flex-1">
              <p className="text-[10px] font-bold text-red-400/70 uppercase tracking-[0.2em]">Season 1</p>
              <h1 className="text-3xl font-heading font-black uppercase text-gradient tracking-tight leading-none">
                Iron Rising
              </h1>
            </div>

            {/* Season info badge — no real end date configured yet */}
            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[10px] text-gray-400 font-medium">Season</p>
              <p className="text-xs font-bold text-white tracking-tight">Active</p>
            </div>
          </div>

          {/* Current tier + XP bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-red-400" />
                <span className="text-sm font-heading font-bold text-white uppercase tracking-wide">
                  Tier {currentTier} <span className="text-gray-500 font-normal">/ 30</span>
                </span>
              </div>
              <span className="text-xs text-gray-400 font-medium">
                {currentXP} / {xpForNextTier} XP
              </span>
            </div>

            {/* XP progress bar */}
            <div className="h-2.5 rounded-full bg-white/5 overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                className="h-full rounded-full relative"
                style={{
                  background: 'linear-gradient(90deg, #b91c1c 0%, #dc2626 50%, #ef4444 100%)',
                }}
              >
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                    animation: 'shimmer 2s infinite',
                  }}
                />
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── Track Legend ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mt-4 mb-3 px-1">
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Free</span>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-px bg-gray-700" />
            <div className="w-2 h-2 rounded-full bg-gray-700" />
            <div className="w-8 h-px bg-gray-700" />
          </div>
          <div className="flex items-center gap-1">
            <Crown size={10} className="text-yellow-500" />
            <span className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-wider">Premium</span>
          </div>
        </div>

        {/* ── 30-Tier Vertical Track ─────────────────────────────────────── */}
        <div className="space-y-0">
          {SEASON_TIERS.map((tierData, index) => {
            const isCompleted = tierData.tier < currentTier;
            const isCurrent = tierData.tier === currentTier;
            const isLast = index === SEASON_TIERS.length - 1;
            const freeClaimed = claimedFreeRewards.includes(tierData.tier);
            const premiumClaimed = claimedPremiumRewards.includes(tierData.tier);

            return (
              <div
                key={tierData.tier}
                ref={isCurrent ? currentTierRef : undefined}
                className={`flex items-start transition-all duration-300 ${
                  isCurrent ? 'py-1' : 'py-0'
                }`}
              >
                {/* Free Reward (left) */}
                <RewardCard
                  reward={tierData.freeReward}
                  side="left"
                  tierNum={tierData.tier}
                  isClaimed={freeClaimed}
                  isLocked={tierData.tier > currentTier}
                  isPremiumTrack={false}
                  isPremium={isPremium}
                  onPremiumTap={handlePremiumTap}
                  currentTier={currentTier}
                />

                {/* Tier Circle (center) */}
                <TierCircle
                  tierNum={tierData.tier}
                  isCompleted={isCompleted}
                  isCurrent={isCurrent}
                  isLast={isLast}
                />

                {/* Premium Reward (right) */}
                <RewardCard
                  reward={tierData.premiumReward}
                  side="right"
                  tierNum={tierData.tier}
                  isClaimed={premiumClaimed}
                  isLocked={tierData.tier > currentTier}
                  isPremiumTrack={true}
                  isPremium={isPremium}
                  onPremiumTap={handlePremiumTap}
                  currentTier={currentTier}
                />
              </div>
            );
          })}
        </div>

        {/* ── Bottom CTA for non-premium ─────────────────────────────────── */}
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 mb-4"
          >
            <div
              className="card-glass rounded-2xl p-5 text-center relative overflow-hidden"
              style={{
                border: '1px solid rgba(234, 179, 8, 0.3)',
                background: 'linear-gradient(145deg, rgba(234, 179, 8, 0.05) 0%, rgba(0,0,0,0) 100%)',
              }}
            >
              <Crown size={28} className="text-yellow-500 mx-auto mb-2" />
              <h3 className="font-heading font-black text-lg text-white uppercase tracking-wide">
                Unlock Premium Track
              </h3>
              <p className="text-xs text-gray-400 mt-1 mb-4 max-w-[260px] mx-auto">
                Get exclusive themes, animated borders, AI voice packs, and premium badges every tier.
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePremiumTap}
                className="px-6 py-3 rounded-xl font-heading font-bold text-sm uppercase tracking-wider text-white
                  bg-gradient-to-r from-yellow-600 to-yellow-500
                  hover:scale-[1.02] active:scale-95 transition-all
                  shadow-lg shadow-yellow-500/20"
              >
                Go Premium
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Season Summary Footer ──────────────────────────────────────── */}
        <div className="mt-6 mb-8 text-center space-y-1">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Season 1 -- Iron Rising</p>
          <p className="text-[10px] text-gray-700">Complete workouts to earn XP and climb the tiers</p>
        </div>

      </div>
    </motion.div>
  );
};

export default BattlePassView;
