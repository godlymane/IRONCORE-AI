/**
 * AchievementsView — Trophy Room / Arsenal.
 * Grid of locked/unlocked badges with rarity tiers, categories, and unlock progress.
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Lock, ChevronDown, Shield, X } from 'lucide-react';
import { GlassCard } from '../components/UIComponents';
import {
  BADGES, BADGE_CATEGORIES, getRarityConfig,
  getUnlockedBadges, getUnlockProgress, getBadgesByCategory
} from '../components/Gamification/badgeDefinitions';
import { celebrateAchievement } from '../components/Gamification/celebrations';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
};

const BadgeCard = ({ badge, unlocked, onClick }) => {
  const rarity = getRarityConfig(badge.rarity);

  return (
    <motion.button
      variants={fadeUp}
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick(badge)}
      aria-label={`${badge.name} badge, ${unlocked ? `unlocked, ${rarity.label} rarity` : 'locked'}`}
      className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
        unlocked
          ? `${rarity.border} ${rarity.bg} ${rarity.glow}`
          : 'border-white/5 bg-white/[0.02]'
      }`}
      style={{ minHeight: 100 }}
    >
      {/* Rarity dot */}
      {unlocked && (
        <div
          className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${
            badge.rarity === 'legendary' ? 'bg-yellow-400' :
            badge.rarity === 'epic' ? 'bg-purple-400' :
            badge.rarity === 'rare' ? 'bg-blue-400' :
            badge.rarity === 'uncommon' ? 'bg-green-400' : 'bg-gray-500'
          }`}
        />
      )}

      {/* Icon */}
      <span
        className={`text-2xl mb-1.5 ${unlocked ? '' : 'grayscale opacity-30'}`}
        style={unlocked ? { filter: `drop-shadow(0 0 6px ${rarity.color === 'text-yellow-400' ? '#fbbf24' : '#dc2626'})` } : {}}
      >
        {unlocked ? badge.icon : '🔒'}
      </span>

      {/* Name */}
      <span className={`text-[10px] font-black uppercase tracking-wider text-center leading-tight ${
        unlocked ? 'text-white' : 'text-gray-600'
      }`}>
        {badge.name}
      </span>

      {/* Rarity label */}
      {unlocked && (
        <span className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${rarity.color}`}>
          {rarity.label}
        </span>
      )}
    </motion.button>
  );
};

const BadgeDetailModal = ({ badge, unlocked, onClose }) => {
  if (!badge) return null;
  const rarity = getRarityConfig(badge.rarity);
  const cat = BADGE_CATEGORIES[badge.category];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-detail-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Card */}
      <motion.div
        className="relative w-full max-w-xs rounded-3xl p-6 text-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, rgba(30,30,30,0.98) 0%, rgba(15,15,15,0.98) 100%)',
          border: unlocked ? `1px solid ${badge.rarity === 'legendary' ? 'rgba(251,191,36,0.3)' : 'rgba(220,38,38,0.3)'}` : '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <button onClick={onClose} aria-label="Close badge details" className="absolute top-3 right-3 text-gray-600 hover:text-white transition-colors">
          <X size={18} />
        </button>

        {/* Badge Icon */}
        <div className="mb-4">
          <span className={`text-5xl ${unlocked ? '' : 'grayscale opacity-40'}`}>
            {unlocked ? badge.icon : '🔒'}
          </span>
        </div>

        {/* Name */}
        <h3 id="badge-detail-title" className={`text-lg font-black uppercase tracking-tight ${unlocked ? 'text-white' : 'text-gray-500'}`}>
          {badge.name}
        </h3>

        {/* Rarity */}
        <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${unlocked ? rarity.color : 'text-gray-600'}`}>
          {rarity.label} {cat?.icon}
        </p>

        {/* Description */}
        <p className="text-sm text-gray-400 mt-3">{badge.description}</p>

        {/* Status */}
        <div className={`mt-4 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${
          unlocked
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-white/[0.03] border border-white/5 text-gray-500'
        }`}>
          {unlocked ? 'UNLOCKED' : 'LOCKED'}
        </div>
      </motion.div>
    </motion.div>
  );
};

export const AchievementsView = ({ profile = {}, workouts = [], meals = [], photos = [], progress = [] }) => {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [selectedBadge, setSelectedBadge] = useState(null);

  // Build userData object for badge checks
  const userData = useMemo(() => ({
    ...profile,
    workouts,
    meals,
    photos,
    progress,
    workoutCount: workouts.length,
    mealCount: meals.length,
    photoCount: photos.length,
    progressCount: progress.length,
  }), [profile, workouts, meals, photos, progress]);

  const unlockedSet = useMemo(() => {
    const set = new Set();
    BADGES.forEach(b => { if (b.check(userData)) set.add(b.id); });
    return set;
  }, [userData]);

  const { unlocked: unlockedCount, total, percent } = getUnlockProgress(userData);

  const filteredBadges = activeCategory === 'ALL'
    ? BADGES
    : getBadgesByCategory(activeCategory);

  const handleBadgeClick = (badge) => {
    setSelectedBadge(badge);
    if (unlockedSet.has(badge.id)) {
      celebrateAchievement();
    }
  };

  return (
    <div className="space-y-5 pb-4 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-600 to-orange-600">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">Arsenal</h1>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Trophy Room</p>
          </div>
        </div>
        {/* Unlock Counter */}
        <div
          className="px-3 py-2 rounded-xl text-center"
          style={{
            background: 'linear-gradient(145deg, rgba(220, 38, 38, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
          }}
        >
          <p className="text-lg font-black text-white">{unlockedCount}/{total}</p>
          <p className="text-[10px] text-red-400 font-bold uppercase">{percent}%</p>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <GlassCard className="!p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Collection Progress</span>
          <span className="text-xs font-mono text-red-400">{percent}%</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.2 }}
            style={{
              background: 'linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #fbbf24 100%)',
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {['common', 'uncommon', 'rare', 'epic', 'legendary'].map(r => {
            const cfg = getRarityConfig(r);
            const count = BADGES.filter(b => b.rarity === r && unlockedSet.has(b.id)).length;
            const rTotal = BADGES.filter(b => b.rarity === r).length;
            return (
              <div key={r} className="text-center">
                <p className={`text-[10px] font-bold ${cfg.color}`}>{count}/{rTotal}</p>
                <p className="text-[8px] text-gray-600 uppercase">{cfg.label}</p>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Category Filter */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1" role="tablist" aria-label="Badge categories">
        <button
          onClick={() => setActiveCategory('ALL')}
          role="tab"
          aria-selected={activeCategory === 'ALL'}
          className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            activeCategory === 'ALL'
              ? 'bg-red-600/30 text-white border border-red-500/40'
              : 'bg-white/[0.03] text-gray-500 border border-white/5 hover:text-gray-300'
          }`}
        >
          All ({total})
        </button>
        {Object.entries(BADGE_CATEGORIES).map(([key, cat]) => {
          const catBadges = getBadgesByCategory(key);
          const catUnlocked = catBadges.filter(b => unlockedSet.has(b.id)).length;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              role="tab"
              aria-selected={activeCategory === key}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                activeCategory === key
                  ? 'bg-red-600/30 text-white border border-red-500/40'
                  : 'bg-white/[0.03] text-gray-500 border border-white/5 hover:text-gray-300'
              }`}
            >
              {cat.icon} {cat.label} ({catUnlocked}/{catBadges.length})
            </button>
          );
        })}
      </div>

      {/* Badge Grid */}
      <motion.div
        className="grid grid-cols-3 gap-2"
        variants={stagger}
        initial="hidden"
        animate="show"
        key={activeCategory}
      >
        {filteredBadges.map(badge => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            unlocked={unlockedSet.has(badge.id)}
            onClick={handleBadgeClick}
          />
        ))}
      </motion.div>

      {/* Badge Detail Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <BadgeDetailModal
            badge={selectedBadge}
            unlocked={unlockedSet.has(selectedBadge.id)}
            onClose={() => setSelectedBadge(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AchievementsView;
