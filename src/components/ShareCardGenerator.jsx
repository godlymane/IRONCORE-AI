import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Download, Trophy, Zap, Shield, TrendingUp } from 'lucide-react';
import { GlassCard } from './UIComponents';

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

const LEAGUE_ICONS = {
  iron: Shield,
  bronze: Shield,
  silver: Shield,
  gold: Trophy,
  platinum: Trophy,
  diamond: Trophy,
};

const LEAGUE_COLORS = {
  iron: '#6b7280',
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  platinum: '#e5e4e2',
  diamond: '#b9f2ff',
};

/**
 * ShareCardGenerator
 *
 * Renders an off-screen 1080x1920 card, captures it as PNG via html-to-image,
 * then presents a modal with Share / Download options.
 *
 * Props:
 *   type: 'battle_victory' | 'league_promotion' | 'level_up' | 'weekly_recap' | 'achievement'
 *   data: object with relevant fields depending on type
 *   onClose: callback
 */
export const ShareCardGenerator = ({ type, data, onClose }) => {
  const cardRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageBlob, setImageBlob] = useState(null);
  const [generating, setGenerating] = useState(true);
  const [error, setError] = useState(null);
  // Only render the off-screen card while we're generating (issue 15)
  const [renderCard, setRenderCard] = useState(true);

  const generateImage = useCallback(async () => {
    setRenderCard(true);
    setGenerating(true);
    setError(null);
    // Wait a tick for the off-screen card to mount and render
    await new Promise(r => setTimeout(r, 300));
    if (!cardRef.current) {
      setError('Failed to generate image. Please try again.');
      setGenerating(false);
      return;
    }
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        pixelRatio: 1,
        cacheBust: true,
      });
      setImageUrl(dataUrl);

      // Convert to blob for sharing
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      setImageBlob(blob);
      // Remove the large off-screen DOM node now that capture is done
      setRenderCard(false);
    } catch (err) {
      console.error('Failed to generate share card:', err);
      setError('Failed to generate image. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    generateImage();
  }, [generateImage]);

  const handleShare = async () => {
    if (!imageBlob) return;
    const file = new File([imageBlob], 'ironcore-share.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: 'IronCore AI',
          text: getShareText(),
          files: [file],
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: download
      handleDownload();
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.download = `ironcore-${type}-${Date.now()}.png`;
    link.href = imageUrl;
    link.click();
  };

  const getShareText = () => {
    switch (type) {
      case 'battle_victory':
        return `I just won a battle on IronCore AI! ${data.xpEarned || 0} XP earned. Join me!`;
      case 'league_promotion':
        return `I just got promoted to ${data.leagueName || 'a new league'} on IronCore AI!`;
      case 'level_up':
        return `Level ${data.level || '?'} on IronCore AI! Let's go!`;
      case 'weekly_recap':
        return `My week on IronCore AI: ${data.workouts || 0} workouts, ${data.xp || 0} XP. Join me!`;
      case 'achievement':
        return `I just unlocked "${data.name || 'an achievement'}" on IronCore AI!`;
      default:
        return 'Check out IronCore AI!';
    }
  };

  return (
    <>
      {/* Hidden off-screen card for capture — only mounted while generating (issue 15) */}
      {renderCard && (
        <div
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            overflow: 'hidden',
            zIndex: -1,
          }}
        >
          <div ref={cardRef}>
            <ShareCardContent type={type} data={data} />
          </div>
        </div>
      )}

      {/* Modal overlay */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="relative w-full max-w-sm flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-2 -right-2 z-10 w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Card preview */}
            <GlassCard className="w-full overflow-hidden p-0">
              {generating ? (
                <div className="flex items-center justify-center py-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-2 border-white/20 border-t-red-500 rounded-full"
                  />
                  <span className="ml-3 text-white/60 text-sm">Generating card...</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <p className="text-red-400 text-sm">{error}</p>
                  <button
                    onClick={generateImage}
                    className="text-sm text-white/60 underline hover:text-white transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Share Card"
                  className="w-full h-auto rounded-xl"
                  style={{ aspectRatio: `${CARD_WIDTH}/${CARD_HEIGHT}` }}
                />
              ) : null}
            </GlassCard>

            {/* Action buttons */}
            {!generating && imageUrl && (
              <div className="flex gap-3 w-full">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm uppercase tracking-tight transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 text-white font-bold text-sm uppercase tracking-tight transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

/* ─── Card Content (rendered off-screen at 1080x1920) ─── */

const ShareCardContent = ({ type, data }) => {
  return (
    <div
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        background: '#000',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '80px 60px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, rgba(220,38,38,0.05) 40%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Subtle grid pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }}
      />

      {/* Top: Logo */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-2px',
            textTransform: 'uppercase',
          }}
        >
          IronCore AI
        </div>
        <div
          style={{
            fontSize: 20,
            color: '#dc2626',
            fontWeight: 700,
            letterSpacing: '6px',
            textTransform: 'uppercase',
            marginTop: 8,
          }}
        >
          Your Phone. Your Trainer.
        </div>
      </div>

      {/* Middle: Dynamic content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, width: '100%' }}>
        {type === 'battle_victory' && <BattleVictoryCard data={data} />}
        {type === 'league_promotion' && <LeaguePromotionCard data={data} />}
        {type === 'level_up' && <LevelUpCard data={data} />}
        {type === 'weekly_recap' && <WeeklyRecapCard data={data} />}
        {type === 'achievement' && <AchievementCard data={data} />}
      </div>

      {/* Bottom: CTA */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '-0.5px',
            marginBottom: 16,
          }}
        >
          Join me on IronCore AI
        </div>
        {data?.referralCode && (
          <div
            style={{
              display: 'inline-block',
              padding: '16px 40px',
              background: 'rgba(220,38,38,0.15)',
              border: '2px solid rgba(220,38,38,0.4)',
              borderRadius: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 16, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: 4 }}>
              Referral Code
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#dc2626', letterSpacing: '4px' }}>
              {data.referralCode}
            </div>
          </div>
        )}
        {/* QR-like decorative visual */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 20 }}>
          {Array.from({ length: 7 }).map((_, row) => (
            <div key={row} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {Array.from({ length: 7 }).map((_, col) => {
                const filled = (row + col) % 3 !== 1;
                return (
                  <div
                    key={col}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      background: filled ? 'rgba(220,38,38,0.5)' : 'rgba(255,255,255,0.05)',
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 16, color: '#6b7280', marginTop: 16 }}>
          ironcore.ai
        </div>
      </div>
    </div>
  );
};

/* ─── Type-specific inner cards ─── */

const BattleVictoryCard = ({ data }) => (
  <div style={{ textAlign: 'center', width: '100%' }}>
    <div
      style={{
        fontSize: 120,
        fontWeight: 900,
        color: '#dc2626',
        textTransform: 'uppercase',
        letterSpacing: '-4px',
        lineHeight: 1,
        textShadow: '0 0 80px rgba(220,38,38,0.5)',
      }}
    >
      VICTORY
    </div>
    <div style={{ fontSize: 32, color: '#6b7280', fontWeight: 700, marginTop: 24, textTransform: 'uppercase', letterSpacing: '2px' }}>
      vs {data?.opponentName || 'Opponent'}
    </div>
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 60,
        marginTop: 60,
      }}
    >
      <StatBlock label="SCORE" value={data?.score ?? '—'} />
      <StatBlock label="XP EARNED" value={`+${data?.xpEarned || 0}`} accent />
      <StatBlock label="ELO" value={data?.eloDelta > 0 ? `+${data.eloDelta}` : `${data?.eloDelta || 0}`} accent={data?.eloDelta > 0} />
    </div>
  </div>
);

const LeaguePromotionCard = ({ data }) => {
  const leagueKey = (data?.leagueName || 'iron').toLowerCase();
  const color = LEAGUE_COLORS[leagueKey] || '#dc2626';

  return (
    <div style={{ textAlign: 'center', width: '100%' }}>
      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '6px',
        }}
      >
        PROMOTED
      </div>
      {/* League icon circle */}
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: '50%',
          border: `4px solid ${color}`,
          background: `radial-gradient(circle, ${color}20, transparent)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '48px auto',
          boxShadow: `0 0 60px ${color}40`,
        }}
      >
        <div style={{ fontSize: 80 }}>
          {leagueKey === 'diamond' ? '💎' : leagueKey === 'gold' || leagueKey === 'platinum' ? '🏆' : '🛡️'}
        </div>
      </div>
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: color,
          textTransform: 'uppercase',
          letterSpacing: '-2px',
          textShadow: `0 0 40px ${color}60`,
        }}
      >
        {data?.leagueName || 'NEW LEAGUE'}
      </div>
      <div style={{ fontSize: 24, color: '#6b7280', marginTop: 16, fontWeight: 600 }}>
        LEAGUE
      </div>
    </div>
  );
};

const LevelUpCard = ({ data }) => (
  <div style={{ textAlign: 'center', width: '100%' }}>
    <div
      style={{
        fontSize: 36,
        fontWeight: 800,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '6px',
      }}
    >
      LEVEL UP
    </div>
    <div
      style={{
        fontSize: 180,
        fontWeight: 900,
        color: '#ffffff',
        lineHeight: 1,
        marginTop: 24,
        textShadow: '0 0 80px rgba(220,38,38,0.4)',
      }}
    >
      {data?.level || '?'}
    </div>
    {/* XP bar */}
    <div
      style={{
        width: '80%',
        height: 24,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        margin: '48px auto 0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.min(data?.xpProgress || 100, 100)}%`,
          background: 'linear-gradient(90deg, #dc2626, #ef4444)',
          borderRadius: 12,
        }}
      />
    </div>
    <div style={{ fontSize: 20, color: '#6b7280', marginTop: 12, fontWeight: 600 }}>
      {data?.xpCurrent || 0} / {data?.xpNeeded || '???'} XP
    </div>
  </div>
);

const WeeklyRecapCard = ({ data }) => (
  <div style={{ textAlign: 'center', width: '100%' }}>
    <div
      style={{
        fontSize: 36,
        fontWeight: 800,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '6px',
        marginBottom: 48,
      }}
    >
      WEEKLY RECAP
    </div>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 32,
        width: '100%',
        maxWidth: 700,
        margin: '0 auto',
      }}
    >
      <RecapTile label="WORKOUTS" value={data?.workouts ?? 0} icon="💪" />
      <RecapTile label="CALORIES" value={data?.calories ? data.calories.toLocaleString() : '0'} icon="🔥" />
      <RecapTile label="XP EARNED" value={data?.xp ? `+${data.xp.toLocaleString()}` : '+0'} icon="⚡" />
      <RecapTile label="STREAK" value={`${data?.streak ?? 0} days`} icon="🔥" />
    </div>
  </div>
);

const AchievementCard = ({ data }) => (
  <div style={{ textAlign: 'center', width: '100%' }}>
    <div
      style={{
        fontSize: 36,
        fontWeight: 800,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '6px',
      }}
    >
      ACHIEVEMENT UNLOCKED
    </div>
    {/* Trophy circle */}
    <div
      style={{
        width: 200,
        height: 200,
        borderRadius: '50%',
        border: '4px solid #dc2626',
        background: 'radial-gradient(circle, rgba(220,38,38,0.15), transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '48px auto',
        boxShadow: '0 0 60px rgba(220,38,38,0.3)',
      }}
    >
      <div style={{ fontSize: 80 }}>🏆</div>
    </div>
    <div
      style={{
        fontSize: 56,
        fontWeight: 900,
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: '-2px',
        lineHeight: 1.1,
      }}
    >
      {data?.name || 'Achievement'}
    </div>
    {data?.description && (
      <div style={{ fontSize: 24, color: '#6b7280', marginTop: 20, fontWeight: 500, lineHeight: 1.4, maxWidth: 700, margin: '20px auto 0' }}>
        {data.description}
      </div>
    )}
  </div>
);

/* ─── Helpers ─── */

const StatBlock = ({ label, value, accent = false }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 16, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: 8 }}>
      {label}
    </div>
    <div
      style={{
        fontSize: 48,
        fontWeight: 900,
        color: accent ? '#dc2626' : '#ffffff',
        letterSpacing: '-1px',
      }}
    >
      {value}
    </div>
  </div>
);

const RecapTile = ({ label, value, icon }) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 24,
      padding: '40px 24px',
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 44, fontWeight: 900, color: '#ffffff', letterSpacing: '-1px' }}>{value}</div>
    <div style={{ fontSize: 16, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', marginTop: 8 }}>
      {label}
    </div>
  </div>
);

export default ShareCardGenerator;
