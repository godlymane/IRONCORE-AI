import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, UserPlus, Check, X, Flame, Swords, Loader2, Copy } from 'lucide-react';
import { useStore } from '../../hooks/useStore';
import { useToast } from '../UIComponents';

// ─── League Data ──────────────────────────────────────────────────
const LEAGUES = [
  { name: 'Iron',     min: 0,     borderColor: '#6b7280', glowColor: 'rgba(107,114,128,0.25)', textColor: '#9ca3af' },
  { name: 'Bronze',   min: 1000,  borderColor: '#92400e', glowColor: 'rgba(146,64,14,0.3)',    textColor: '#b45309' },
  { name: 'Silver',   min: 2500,  borderColor: '#9ca3af', glowColor: 'rgba(156,163,175,0.3)',  textColor: '#d1d5db' },
  { name: 'Gold',     min: 5000,  borderColor: '#d97706', glowColor: 'rgba(217,119,6,0.4)',    textColor: '#fbbf24' },
  { name: 'Platinum', min: 10000, borderColor: '#0d9488', glowColor: 'rgba(13,148,136,0.45)',  textColor: '#2dd4bf' },
  { name: 'Diamond',  min: 25000, borderColor: '#06b6d4', glowColor: 'rgba(6,182,212,0.55)',   textColor: '#67e8f9' },
];

const getLeague = (xp = 0) =>
  [...LEAGUES].reverse().find(l => xp >= l.min) || LEAGUES[0];

const getIronScoreColor = (score) => {
  if (score >= 80) return '#eab308';
  if (score >= 60) return '#f97316';
  if (score >= 30) return '#dc2626';
  return '#6b7280';
};

// ─── Archetypes ───────────────────────────────────────────────────
const ARCHETYPES = {
  'THE IRON': {
    color: '#ef4444', textColor: '#fca5a5',
    bg: 'linear-gradient(145deg, rgba(220,38,38,0.1) 0%, rgba(10,10,10,0) 100%)',
    pattern: 'radial-gradient(ellipse at 88% 12%, rgba(220,38,38,0.2) 0%, transparent 52%)',
    label: 'Strength Dominant',
  },
  'THE BLADE': {
    color: '#06b6d4', textColor: '#67e8f9',
    bg: 'linear-gradient(145deg, rgba(6,182,212,0.1) 0%, rgba(10,10,10,0) 100%)',
    pattern: 'radial-gradient(ellipse at 88% 12%, rgba(6,182,212,0.2) 0%, transparent 52%)',
    label: 'Cardio Dominant',
  },
  'THE HYBRID': {
    color: '#a855f7', textColor: '#d8b4fe',
    bg: 'linear-gradient(145deg, rgba(168,85,247,0.1) 0%, rgba(10,10,10,0) 100%)',
    pattern: 'radial-gradient(ellipse at 88% 12%, rgba(168,85,247,0.2) 0%, transparent 52%)',
    label: 'Balanced Split',
  },
  'THE CUT': {
    color: '#f59e0b', textColor: '#fde68a',
    bg: 'linear-gradient(145deg, rgba(245,158,11,0.1) 0%, rgba(10,10,10,0) 100%)',
    pattern: 'radial-gradient(ellipse at 88% 12%, rgba(245,158,11,0.2) 0%, transparent 52%)',
    label: 'Cut Phase',
  },
  'THE BUILDER': {
    color: '#22c55e', textColor: '#86efac',
    bg: 'linear-gradient(145deg, rgba(34,197,94,0.1) 0%, rgba(10,10,10,0) 100%)',
    pattern: 'radial-gradient(ellipse at 88% 12%, rgba(34,197,94,0.2) 0%, transparent 52%)',
    label: 'Bulk Phase',
  },
};

// ─── Archetype Computation ────────────────────────────────────────
export function computeArchetype(workouts = [], profile = {}, userDoc = {}) {
  const goal = profile?.goal;
  const weightStatus = userDoc?.weightStatus;
  if (goal === 'cut' && weightStatus === 'on_track') return 'THE CUT';
  if (goal === 'bulk' && weightStatus === 'on_track') return 'THE BUILDER';

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const cardioKeywords = ['run', 'cardio', 'cycl', 'bike', 'swim', 'row', 'ellip', 'jump', 'hiit', 'treadmill', 'sprint', 'jog', 'walk'];

  let strengthCount = 0;
  let cardioCount = 0;

  workouts.forEach(w => {
    const wTime = w.createdAt?.seconds
      ? w.createdAt.seconds * 1000
      : new Date(w.createdAt || 0).getTime();
    if (wTime < thirtyDaysAgo) return;

    const exercises = w.exercises || [];
    let hasCardio = false;
    let hasStrength = false;
    exercises.forEach(ex => {
      const name = (ex.name || '').toLowerCase();
      if (cardioKeywords.some(k => name.includes(k))) hasCardio = true;
      else hasStrength = true;
    });
    if (hasCardio && !hasStrength) cardioCount++;
    else strengthCount++;
  });

  const total = strengthCount + cardioCount;
  if (total < 3) return 'THE IRON';
  const cardioRatio = cardioCount / total;
  if (cardioRatio > 0.6) return 'THE BLADE';
  if (cardioRatio >= 0.35) return 'THE HYBRID';
  return 'THE IRON';
}

// ─── Stat Chip ────────────────────────────────────────────────────
const StatChip = ({ label, value, color }) => (
  <div
    className="text-center px-2 py-2 rounded-xl flex-1"
    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
  >
    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wide leading-none">{label}</p>
    <p className="text-sm font-black mt-1 leading-none" style={{ color: color || '#fff' }}>{value}</p>
  </div>
);

// ─── Pure Card Visual (no buttons, exportable for modals) ─────────
export const CardVisual = React.forwardRef(function CardVisual(
  { username, xp, ironScore, wins, losses, guildTag, archetype, forgeCount },
  ref
) {
  const league = getLeague(xp);
  const ironScoreColor = getIronScoreColor(ironScore);
  const archetypeConfig = ARCHETYPES[archetype] || ARCHETYPES['THE IRON'];
  const level = Math.floor((xp || 0) / 500) + 1;

  const winsDisplay = wins != null ? wins : '—';
  const lossesDisplay = losses != null ? losses : '—';
  const wlColor = (wins != null && wins > losses) ? '#22c55e' : '#9ca3af';

  return (
    <div
      ref={ref}
      className="rounded-2xl p-5 select-none"
      style={{
        background: archetypeConfig.bg,
        border: `1px solid ${league.borderColor}`,
        boxShadow: `0 0 32px ${league.glowColor}, 0 8px 32px rgba(0,0,0,0.5)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Archetype background pattern */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: archetypeConfig.pattern }} />

      {/* Top row: guild tag + league badge */}
      <div className="relative flex items-center justify-between mb-4">
        {guildTag ? (
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-md tracking-widest uppercase"
            style={{
              color: league.textColor,
              background: `${league.borderColor}22`,
              border: `1px solid ${league.borderColor}44`,
            }}
          >
            {guildTag}
          </span>
        ) : <div />}
        <span
          className="text-[10px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-md"
          style={{
            color: league.textColor,
            background: `${league.borderColor}22`,
            border: `1px solid ${league.borderColor}44`,
          }}
        >
          {league.name}
        </span>
      </div>

      {/* Username + archetype */}
      <div className="relative mb-4">
        <h2
          className="text-3xl font-black text-white uppercase tracking-tight leading-none"
          style={{ textShadow: `0 0 24px ${archetypeConfig.color}50` }}
        >
          @{username}
        </h2>
        <p
          className="text-[11px] font-black uppercase tracking-[0.2em] mt-1.5"
          style={{ color: archetypeConfig.textColor }}
        >
          {archetype}
        </p>
        <p className="text-[10px] text-gray-600 mt-0.5 uppercase tracking-widest">{archetypeConfig.label}</p>
      </div>

      {/* Stats row */}
      <div className="relative flex gap-2 mb-3">
        <StatChip label="Iron Score" value={ironScore || '—'} color={ironScore ? ironScoreColor : undefined} />
        <StatChip label="Level" value={level} color="#fff" />
        <StatChip label="W / L" value={`${winsDisplay} / ${lossesDisplay}`} color={wlColor} />
      </div>

      {/* Forge count */}
      <div className="relative flex items-center gap-1.5">
        <Flame size={12} className="text-orange-500 flex-shrink-0" />
        <span className="text-[11px] text-gray-400 font-bold">
          {forgeCount != null ? `Forge: ${forgeCount} days` : 'Forge: —'}
        </span>
      </div>
    </div>
  );
});

// ─── Main PlayerCard (with buttons + share modal) ─────────────────
export const PlayerCard = ({
  isOwn = true,
  overrideData = {},      // { username, xp, ironScore, wins, losses, guildTag, archetype }
  onAddFriend,
  onChallenge,
}) => {
  const { profile, userDoc, workouts, meals, user } = useStore();
  const toast = useToast();

  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const [guildTag, setGuildTag] = useState(null);
  const cardRef = useRef(null);

  // Resolve data
  const xp        = isOwn ? (profile?.xp || 0)         : (overrideData.xp        || 0);
  const username   = isOwn ? (profile?.username || user?.displayName || 'Athlete') : (overrideData.username   || 'Athlete');
  const ironScore  = isOwn ? (userDoc?.ironScore || 0)  : (overrideData.ironScore  || 0);
  const wins       = isOwn ? (userDoc?.wins ?? null)    : (overrideData.wins       ?? null);
  const losses     = isOwn ? (userDoc?.losses ?? null)  : (overrideData.losses     ?? null);
  const archetype  = isOwn
    ? computeArchetype(workouts, profile, userDoc)
    : (overrideData.archetype || 'THE IRON');

  // Forge count (own card: compute from meals; other: not available)
  const forgeCount = useMemo(() => {
    if (!isOwn) return null;
    const today = new Date().toISOString().split('T')[0];
    const dates = [...new Set(meals.map(m => m.date))].sort().reverse();
    let count = 0;
    let checkDate = new Date(today);
    if (!dates.includes(today)) checkDate.setDate(checkDate.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dates.includes(dateStr)) {
        count++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else break;
    }
    return count;
  }, [isOwn, meals]);

  // Guild tag (own card: fetch from Firestore; other: from overrideData)
  const displayGuildTag = isOwn ? guildTag : (overrideData.guildTag || null);

  useEffect(() => {
    const guildId = isOwn ? userDoc?.guildId : null;
    if (!guildId) { setGuildTag(null); return; }
    (async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../../firebase');
        const snap = await getDoc(doc(db, 'guilds', guildId));
        if (snap.exists()) {
          setGuildTag('[' + (snap.data().name || '').slice(0, 4).toUpperCase() + ']');
        }
      } catch { /* non-fatal */ }
    })();
  }, [isOwn, userDoc?.guildId]);

  const handleShare = useCallback(async () => {
    const url = `https://ironcore.fit/card/${username}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast?.addToast('Link copied!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast?.addToast('Copy failed', 'error');
    }
    setShowShareModal(true);
  }, [username, toast]);

  const handleSaveImage = useCallback(async () => {
    if (!cardRef.current) return;
    setSharingImage(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, { backgroundColor: '#0a0a0a', pixelRatio: 3 });
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        const fileName = `ironcore-${username}-card-${Date.now()}.png`;
        const result = await Filesystem.writeFile({ path: fileName, data: dataUrl.split(',')[1], directory: Directory.Cache });
        await Share.share({ title: 'My IronCore Player Card', url: result.uri });
      } else {
        const link = document.createElement('a');
        link.download = `ironcore-${username}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (e) {
      console.error('Image save error:', e);
      toast?.addToast('Save failed', 'error');
    } finally {
      setSharingImage(false);
    }
  }, [username, toast]);

  const league = getLeague(xp);

  return (
    <>
      {/* Card */}
      <CardVisual
        ref={cardRef}
        username={username}
        xp={xp}
        ironScore={ironScore}
        wins={wins}
        losses={losses}
        guildTag={displayGuildTag}
        archetype={archetype}
        forgeCount={forgeCount}
      />

      {/* Action buttons below card */}
      <div className="flex gap-2 mt-3">
        {isOwn && (
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
            style={{
              background: `${league.borderColor}18`,
              border: `1px solid ${league.borderColor}55`,
              color: league.textColor,
            }}
          >
            {copied ? <Check size={13} /> : <Share2 size={13} />}
            {copied ? 'Copied!' : 'Share Card'}
          </button>
        )}
        {!isOwn && onAddFriend && (
          <button
            onClick={onAddFriend}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 text-white"
            style={{
              background: 'linear-gradient(135deg, rgba(220,38,38,0.6), rgba(185,28,28,0.6))',
              border: '1px solid rgba(239,68,68,0.4)',
            }}
          >
            <UserPlus size={13} />
            Add Friend
          </button>
        )}
        {!isOwn && onChallenge && (
          <button
            onClick={onChallenge}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
            style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', color: '#d8b4fe' }}
          >
            <Swords size={13} />
            Challenge
          </button>
        )}
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-black text-white uppercase tracking-widest">Share Card</p>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1.5 rounded-lg bg-white/10"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>

              {/* Preview (non-interactive) */}
              <CardVisual
                username={username}
                xp={xp}
                ironScore={ironScore}
                wins={wins}
                losses={losses}
                guildTag={displayGuildTag}
                archetype={archetype}
                forgeCount={forgeCount}
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://ironcore.fit/card/${username}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-white border border-white/10 bg-white/5 transition-all hover:bg-white/10"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={handleSaveImage}
                  disabled={sharingImage}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 8px 25px rgba(220,38,38,0.3)' }}
                >
                  {sharingImage ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                  {sharingImage ? 'Saving…' : 'Save Image'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ─── Player Card Modal (for viewing another player's card) ─────────
export const PlayerCardModal = ({ player, isOpen, onClose, onAddFriend, onChallenge }) => (
  <AnimatePresence>
    {isOpen && player && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 pb-6"
        style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-sm"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black text-white uppercase tracking-widest">Player Profile</p>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
          <PlayerCard
            isOwn={false}
            overrideData={player}
            onAddFriend={onAddFriend}
            onChallenge={onChallenge}
          />
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
