import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Copy, Check, Download, ChevronRight, AlertCircle, Loader2, LogIn, UserPlus } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { generatePhrase, hashPhrase, validateUsername } from '../utils/playerIdentity';
import { PinEntryView } from './PinEntryView';
import { SFX, Haptics } from '../utils/audio';

// ─── Cinematic Splash Intro ──────────────────────────────────────
const SplashIntro = ({ onComplete }) => {
  const [phase, setPhase] = useState(0); // 0=black, 1=lines, 2=logo, 3=text, 4=exit

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),   // Start line animation
      setTimeout(() => setPhase(2), 1200),   // Logo reveal
      setTimeout(() => setPhase(3), 2200),   // Text
      setTimeout(() => setPhase(4), 3400),   // Begin exit
      setTimeout(() => onComplete(), 4200),  // Done — show landing
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden"
      animate={phase >= 4 ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      {/* Grid of converging lines — like a targeting system locking on */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Horizontal lines converge to center */}
        {[-35, -20, -8, 8, 20, 35].map((offset, i) => (
          <motion.line
            key={`h${i}`}
            x1="0" y1={50 + offset} x2="100" y2={50 + offset}
            stroke="#dc2626"
            strokeWidth="0.08"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={phase >= 1 ? {
              pathLength: 1,
              opacity: [0, 0.4, phase >= 3 ? 0.06 : 0.25],
              y1: [50 + offset, 50 + offset, 50 + offset * 0.15],
              y2: [50 + offset, 50 + offset, 50 + offset * 0.15],
            } : {}}
            transition={{ duration: 1.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
        {/* Vertical lines converge to center */}
        {[-30, -15, 15, 30].map((offset, i) => (
          <motion.line
            key={`v${i}`}
            x1={50 + offset} y1="0" x2={50 + offset} y2="100"
            stroke="#dc2626"
            strokeWidth="0.08"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={phase >= 1 ? {
              pathLength: 1,
              opacity: [0, 0.3, phase >= 3 ? 0.04 : 0.2],
              x1: [50 + offset, 50 + offset, 50 + offset * 0.2],
              x2: [50 + offset, 50 + offset, 50 + offset * 0.2],
            } : {}}
            transition={{ duration: 1.8, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
        {/* Center crosshair that appears at convergence */}
        <motion.circle
          cx="50" cy="50" r="8"
          fill="none" stroke="#dc2626" strokeWidth="0.12"
          initial={{ scale: 0, opacity: 0 }}
          animate={phase >= 2 ? { scale: [0, 1.5, 1], opacity: [0, 0.5, 0.15] } : {}}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        <motion.circle
          cx="50" cy="50" r="3"
          fill="none" stroke="#dc2626" strokeWidth="0.15"
          initial={{ scale: 0, opacity: 0 }}
          animate={phase >= 2 ? { scale: [0, 2, 1], opacity: [0, 0.6, 0.2] } : {}}
          transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
        />
      </svg>

      {/* Red glow ignites at center */}
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full blur-[100px]"
        style={{ background: 'radial-gradient(circle, #dc2626, transparent 70%)' }}
        initial={{ opacity: 0, scale: 0.2 }}
        animate={phase >= 2 ? { opacity: [0, 0.5, 0.2], scale: [0.2, 1.3, 1] } : {}}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />

      {/* Logo + text — completely hidden until their phase, no flash possible */}
      {phase >= 2 && (
        <motion.div
          className="relative z-10 flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.01 }}
        >
          <motion.img
            src="/logo.png"
            alt=""
            className="w-28 h-28 object-contain"
            style={{
              WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 68%)',
              maskImage: 'radial-gradient(circle at center, black 40%, transparent 68%)',
            }}
            initial={{ scale: 1.6, filter: 'blur(30px) brightness(3)' }}
            animate={{ scale: 1, filter: 'blur(0px) brightness(1)' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />

          {phase >= 3 && (
            <motion.div
              className="mt-5 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <motion.p
                className="text-[10px] text-red-500/60 uppercase font-medium"
                initial={{ letterSpacing: '1em' }}
                animate={{ letterSpacing: '0.5em' }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                Discipline is freedom
              </motion.p>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── Warrior's Shadow — Cinematic Silhouette Animation ───────────
const WarriorScene = () => {
  const LOOP = 14;
  const [time, setTime] = useState(0);

  useEffect(() => {
    let raf;
    const start = Date.now();
    const tick = () => {
      setTime(((Date.now() - start) / 1000) % LOOP);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const p = (s, e) => Math.max(0, Math.min(1, (time - s) / (e - s)));
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  // Timeline
  const fadeIn = ease(p(0, 2));
  const drawSword = ease(p(3.5, 6));
  const slashWind = ease(p(6.5, 8));
  const logoReveal = ease(p(8, 9.5));
  const logoHold = p(9.5, 11);
  const dissolve = ease(p(11.5, 14));
  const isSlashing = time >= 6.5 && time < 8;
  const isLogoUp = time >= 8 && time < 11.5;
  const isDying = time >= 11.5;

  // Wind oscillation
  const w1 = Math.sin(time * 1.3);
  const w2 = Math.sin(time * 1.8 + 1);
  const w3 = Math.sin(time * 0.9 + 2);

  // Warrior opacity
  const wOp = isDying ? Math.max(0, 1 - dissolve) : fadeIn;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg viewBox="0 0 400 500" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="wg" cx="50%" cy="40%" r="40%">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="blade" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#991b1b" />
            <stop offset="40%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#fca5a5" />
          </linearGradient>
          <linearGradient id="rimLight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0" />
            <stop offset="85%" stopColor="#dc2626" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.7" />
          </linearGradient>
          <filter id="gl"><feGaussianBlur stdDeviation="2" /></filter>
          <filter id="gl2"><feGaussianBlur stdDeviation="4" /></filter>
          <filter id="glSm"><feGaussianBlur stdDeviation="1" /></filter>
        </defs>

        {/* ── Ash / wind particles ── */}
        {Array.from({ length: 18 }, (_, i) => {
          const seed = i * 13.7;
          const baseY = 80 + (seed % 350);
          const speed = 8 + (seed % 12);
          const xOff = ((time * speed + seed * 5) % 460) - 30;
          const yOff = baseY - time * (3 + i % 4) * 2;
          const yFinal = ((yOff % 520) + 520) % 520;
          return (
            <circle key={i} cx={xOff} cy={yFinal}
              r={0.8 + (i % 3) * 0.4}
              fill="#dc2626"
              opacity={(0.15 + Math.sin(time + seed) * 0.1) * wOp} />
          );
        })}

        {/* ── Ground reflection ── */}
        <line x1="50" y1="430" x2="350" y2="430"
          stroke="#dc2626" strokeWidth="0.3" opacity={0.06 * wOp} />

        {/* ── THE WARRIOR — proper filled silhouette ── */}
        <g transform="translate(200,210)" opacity={wOp}>

          {/* === RED RIM LIGHT on right edge === */}
          <path
            d={`M12,-95 Q18,-80 16,-55 Q14,-30 18,-5 Q20,20 16,50 Q14,70 18,95
                Q20,110 15,140 Q10,160 14,195`}
            fill="none" stroke="#dc2626" strokeWidth="1.5" opacity={0.25 + w1 * 0.1}
            filter="url(#glSm)"
          />

          {/* === HEAD — proper oval with jaw === */}
          <path d="M-10,-100 Q-12,-115 0,-118 Q12,-115 10,-100 Q8,-92 0,-90 Q-8,-92 -10,-100 Z"
            fill="#0a0a0a" />

          {/* === HAIR — flowing strands in wind === */}
          <path d={`M-5,-118 Q${-15 + w1 * 4},${-125 + w2 * 3} ${-25 + w1 * 8},${-118 + w2 * 4}
                     M-2,-119 Q${-12 + w2 * 5},${-128 + w1 * 2} ${-22 + w2 * 7},${-122 + w1 * 5}
                     M2,-119 Q${-8 + w1 * 3},${-130 + w3 * 3} ${-18 + w1 * 6},${-125 + w3 * 4}
                     M5,-117 Q${-5 + w3 * 4},${-127 + w1 * 2} ${-15 + w3 * 7},${-120 + w1 * 3}`}
            fill="none" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" />

          {/* === NECK === */}
          <path d="M-5,-90 L-6,-78 L6,-78 L5,-90 Z" fill="#0a0a0a" />

          {/* === SHOULDERS — broad, powerful === */}
          <path d="M-35,-78 Q-30,-82 -6,-78 L6,-78 Q30,-82 35,-78 Q38,-74 35,-70 L-35,-70 Q-38,-74 -35,-78 Z"
            fill="#0a0a0a" />

          {/* === TORSO — V-taper, muscular === */}
          <path d="M-35,-70 Q-33,-40 -28,-10 Q-25,10 -22,40 L22,40 Q25,10 28,-10 Q33,-40 35,-70 Z"
            fill="#0a0a0a" />

          {/* === CLOAK / CAPE — flowing in wind === */}
          <path d={`M-35,-78 Q${-45 + w1 * 3},-60 ${-50 + w1 * 5},${-30 + w2 * 4}
                     Q${-55 + w2 * 6},${0 + w1 * 5} ${-52 + w3 * 7},${40 + w2 * 6}
                     Q${-48 + w1 * 8},${80 + w3 * 5} ${-42 + w2 * 10},${120 + w1 * 8}
                     Q${-38 + w3 * 6},${150 + w2 * 4} ${-35 + w1 * 4},180
                     L-22,40 L-28,-10 Q-33,-40 -35,-70 Z`}
            fill="#080808" opacity="0.9" />
          {/* Cape edge highlight */}
          <path d={`M${-50 + w1 * 5},${-30 + w2 * 4}
                     Q${-55 + w2 * 6},${0 + w1 * 5} ${-52 + w3 * 7},${40 + w2 * 6}
                     Q${-48 + w1 * 8},${80 + w3 * 5} ${-42 + w2 * 10},${120 + w1 * 8}`}
            fill="none" stroke="#dc2626" strokeWidth="0.5" opacity={0.15 + w1 * 0.05} />

          {/* === SHIELD ON BACK — IronCore emblem === */}
          <g transform="translate(0,-30)">
            <circle cx="0" cy="0" r="22" fill="url(#wg)"
              opacity={0.2 + Math.sin(time * 1.5) * 0.1} filter="url(#gl2)" />
            {/* Shield outline */}
            <path d="M0,-18 L14,-12 L14,4 L0,18 L-14,4 L-14,-12 Z"
              fill="none" stroke="#dc2626" strokeWidth="0.8"
              opacity={0.35 + Math.sin(time * 1.5) * 0.2} />
            {/* Shield inner V */}
            <path d="M0,-12 L-8,-4 L0,14 L8,-4 Z"
              fill="none" stroke="#dc2626" strokeWidth="0.5"
              opacity={0.25 + Math.sin(time * 1.5) * 0.15} />
            {/* Wing accents */}
            <path d="M-14,-8 L-22,-14 L-18,-5" fill="none" stroke="#dc2626" strokeWidth="0.5" opacity="0.2" />
            <path d="M14,-8 L22,-14 L18,-5" fill="none" stroke="#dc2626" strokeWidth="0.5" opacity="0.2" />
          </g>

          {/* === LEFT ARM — at side, fist clenched === */}
          <path d="M-35,-70 Q-38,-50 -36,-30 Q-35,-15 -33,0 Q-32,8 -30,12 L-26,10 Q-28,5 -29,0 Q-30,-15 -31,-30 Q-33,-50 -30,-70"
            fill="#0a0a0a" />

          {/* === RIGHT ARM — draws then slashes === */}
          {(() => {
            const armUp = drawSword;
            const armSlash = slashWind;
            const elbowY = -50 + armUp * -30 + armSlash * 25;
            const handX = 30 + armUp * 5 + armSlash * 20;
            const handY = -10 + armUp * -60 + armSlash * 30;
            return (
              <path d={`M35,-70 Q38,${elbowY} ${handX},${handY} Q${handX - 3},${handY + 4} ${handX - 5},${handY + 2}`}
                fill="#0a0a0a" strokeWidth="0" />
            );
          })()}

          {/* === BELT / WAIST === */}
          <rect x="-24" y="35" width="48" height="6" rx="2" fill="#111" />
          <rect x="-2" y="35" width="4" height="6" rx="1" fill="#1a1a1a" stroke="#dc2626" strokeWidth="0.3" opacity="0.4" />

          {/* === LEGS — planted, strong === */}
          <path d="M-22,40 Q-24,80 -26,120 Q-27,150 -28,180 Q-30,192 -35,195 L-22,195 Q-20,190 -18,180 Q-16,150 -15,120 Q-14,80 -12,40 Z"
            fill="#0a0a0a" />
          <path d="M22,40 Q24,80 26,120 Q27,150 28,180 Q30,192 35,195 L22,195 Q20,190 18,180 Q16,150 15,120 Q14,80 12,40 Z"
            fill="#0a0a0a" />

          {/* === BOOTS === */}
          <path d="M-35,192 Q-38,198 -40,200 L-18,200 Q-18,196 -22,192 Z" fill="#0a0a0a" />
          <path d="M35,192 Q38,198 40,200 L18,200 Q18,196 22,192 Z" fill="#0a0a0a" />

          {/* === THE SWORD — red energy blade === */}
          {drawSword > 0.05 && (
            <g opacity={(isDying ? 1 - dissolve : 1)}>
              {(() => {
                const handX = 30 + drawSword * 5 + slashWind * 20;
                const handY = -10 + drawSword * -60 + slashWind * 30;
                const bladeLen = 70 * drawSword;
                const angle = -90 + drawSword * 85 + (isSlashing ? slashWind * -50 : 0);
                const rad = angle * Math.PI / 180;
                const tipX = handX + Math.sin(rad) * bladeLen;
                const tipY = handY - Math.cos(rad) * bladeLen;
                return (
                  <>
                    {/* Blade glow outer */}
                    <line x1={handX} y1={handY} x2={tipX} y2={tipY}
                      stroke="#dc2626" strokeWidth="4" opacity="0.2" filter="url(#gl)" />
                    {/* Blade glow inner */}
                    <line x1={handX} y1={handY} x2={tipX} y2={tipY}
                      stroke="#ef4444" strokeWidth="2" opacity="0.4" filter="url(#glSm)" />
                    {/* Blade core */}
                    <line x1={handX} y1={handY} x2={tipX} y2={tipY}
                      stroke="url(#blade)" strokeWidth="1" strokeLinecap="round" />
                    {/* Tip spark */}
                    <circle cx={tipX} cy={tipY} r={1.5} fill="#fca5a5" opacity={0.5 + w1 * 0.2} filter="url(#glSm)" />
                    {/* Hilt */}
                    <circle cx={handX} cy={handY} r="2.5" fill="#222" stroke="#555" strokeWidth="0.5" />
                  </>
                );
              })()}
            </g>
          )}
        </g>

        {/* ── SLASH TRAIL → LOGO ── */}
        {(isSlashing || isLogoUp || (isDying && dissolve < 0.6)) && (
          <g transform="translate(200,180)">
            {/* Energy slash arc */}
            {isSlashing && (
              <path d={`M${-60 * slashWind},${-40 * slashWind} Q0,${-20 * slashWind} ${60 * slashWind},${40 * slashWind}`}
                fill="none" stroke="#dc2626" strokeWidth="1" opacity={0.6} filter="url(#glSm)" />
            )}

            {/* IronCore logo forming */}
            {(isLogoUp || isDying) && (
              <g opacity={isDying ? Math.max(0, 1 - dissolve * 2) : logoReveal}>
                <path d="M0,-28 L24,-16 L24,8 L0,28 L-24,8 L-24,-16 Z"
                  fill="none" stroke="#dc2626" strokeWidth="1.2" filter="url(#glSm)" />
                <path d="M0,-18 L-12,-6 L0,18 L12,-6 Z"
                  fill="none" stroke="#ef4444" strokeWidth="0.8" />
                <path d="M-24,-12 L-38,-20 L-32,-8" fill="none" stroke="#dc2626" strokeWidth="0.8" opacity="0.6" />
                <path d="M24,-12 L38,-20 L32,-8" fill="none" stroke="#dc2626" strokeWidth="0.8" opacity="0.6" />
                <circle cx="0" cy="0" r="35" fill="url(#wg)" opacity={0.3 * logoReveal} filter="url(#gl2)" />
              </g>
            )}
          </g>
        )}

        {/* ── Dissolve particles ── */}
        {isDying && Array.from({ length: 30 }, (_, i) => {
          const ang = (i / 30) * Math.PI * 2;
          const dist = dissolve * (40 + (i % 6) * 15);
          return (
            <circle key={`dp${i}`}
              cx={200 + Math.cos(ang + dissolve * 3) * dist}
              cy={180 + Math.sin(ang + dissolve * 3) * dist}
              r={1.2 * (1 - dissolve)}
              fill="#dc2626" opacity={(1 - dissolve) * 0.5} />
          );
        })}
      </svg>
    </div>
  );
};

// ─── Landing Screen ──────────────────────────────────────────────
const LandingScreen = ({ onCreateAccount, onLogin }) => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 overflow-hidden relative">

    {/* The Warrior's Shadow — continuous cinematic animation */}
    <WarriorScene />

    {/* Ambient glow behind content */}
    <motion.div
      className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full blur-[130px]"
      style={{ background: 'radial-gradient(circle, #dc2626, transparent 65%)' }}
      animate={{ opacity: [0.08, 0.18, 0.08] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    />

    {/* ═══ CONTENT — sits on top of animation ═══ */}
    <div className="w-full max-w-sm relative z-10 mt-auto pb-12">
      {/* Title */}
      <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-2 text-center"
        style={{ textShadow: '0 0 40px rgba(220,38,38,0.2)' }}>
        IronCore
      </h1>

      {/* Accent line */}
      <motion.div
        className="mx-auto mb-2 h-[2px] rounded-full bg-red-600"
        animate={{ width: [36, 48, 36], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <p className="text-[11px] text-gray-500 mb-10 tracking-[0.3em] uppercase font-medium text-center">
        Your Phone. Your Trainer.
      </p>

      {/* Buttons */}
      <motion.button
        onClick={onCreateAccount}
        className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white mb-3 flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 10px 40px rgba(220,38,38,0.25)' }}
        whileTap={{ scale: 0.97 }}
      >
        <UserPlus size={18} />
        Create Account
      </motion.button>

      <motion.button
        onClick={onLogin}
        className="w-full py-4 rounded-2xl font-bold uppercase tracking-wider text-sm text-white/70 border border-white/8 bg-white/[0.03] active:bg-white/10 transition-all flex items-center justify-center gap-2"
        whileTap={{ scale: 0.97 }}
      >
        <LogIn size={18} className="text-red-500/70" />
        Log In
      </motion.button>
    </div>
  </div>
);

// ─── Username Creation Screen ───────────────────────────────────
const UsernameScreen = ({ onNext, onBack, createError }) => {
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [available, setAvailable] = useState(null);
  const debounceRef = useRef(null);
  const checkSeqRef = useRef(0);

  const checkAvailability = useCallback(async (name) => {
    const { valid, clean, error: validErr } = validateUsername(name);
    if (!valid) { setError(validErr); setAvailable(null); return; }
    const seq = ++checkSeqRef.current;
    setChecking(true);
    setError('');
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      const snap = await getDoc(doc(db, 'usernames', clean));
      if (seq !== checkSeqRef.current) return; // stale result — discard
      setAvailable(!snap.exists());
      if (snap.exists()) setError('Already taken');
    } catch {
      if (seq !== checkSeqRef.current) return;
      setError('Connection error');
    } finally {
      if (seq === checkSeqRef.current) setChecking(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(val);
    setAvailable(null);
    setError('');
    clearTimeout(debounceRef.current);
    if (val.length >= 3) {
      debounceRef.current = setTimeout(() => checkAvailability(val), 500);
    }
  };

  const handleSubmit = () => {
    if (!available || checking) return;
    Haptics.medium();
    SFX.success();
    onNext(username);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
        {/* Back */}
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-500 mb-8 self-start">
          <ChevronRight size={14} className="rotate-180" /> Back
        </button>

        <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-1">Choose Your Handle</h1>
        <p className="text-xs text-gray-500 mb-8">This is your identity in IronCore.</p>

        {/* Username Input */}
        <div className="relative mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">@</span>
          <input
            type="text"
            value={username}
            onChange={handleChange}
            placeholder="username"
            maxLength={20}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-12 text-white text-lg font-bold placeholder-gray-700 outline-none focus:border-red-500/50 focus:bg-white/10 transition-all"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {checking && <Loader2 size={18} className="text-gray-500 animate-spin" />}
            {!checking && available === true && <Check size={18} className="text-green-500" />}
            {!checking && available === false && <AlertCircle size={18} className="text-red-500" />}
          </div>
        </div>

        {error && <p className="text-xs text-red-400 mb-4">{error}</p>}
        {createError && <p className="text-xs text-orange-400 mb-4 p-2 bg-orange-500/10 rounded-lg">{createError}</p>}
        {available && <p className="text-xs text-green-400 mb-4">@{username} is available</p>}

        <button
          onClick={handleSubmit}
          disabled={!available || checking}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white transition-all disabled:opacity-30"
          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: available ? '0 15px 50px rgba(220,38,38,0.3)' : 'none' }}
        >
          Next
        </button>
      </motion.div>
    </div>
  );
};

// ─── Card Reveal Screen (QR + words as composite image) ─────────
const CardRevealScreen = ({ username, phrase, onSaved }) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const cardRef = useRef(null);
  const compositeRef = useRef(null);
  const words = phrase.split(' ');

  const copyPhrase = async () => {
    try {
      await navigator.clipboard.writeText(phrase);
      setCopied(true);
      Haptics.light();
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard might fail */ }
  };

  const saveToDevice = async () => {
    setSaving(true);
    try {
      const { toPng } = await import('html-to-image');
      // Use composite ref which includes QR + recovery words
      const dataUrl = await toPng(compositeRef.current, { backgroundColor: '#000', pixelRatio: 3 });

      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        const fileName = `ironcore-${username}-${Date.now()}.png`;
        const result = await Filesystem.writeFile({
          path: fileName,
          data: dataUrl.split(',')[1],
          directory: Directory.Cache,
        });
        await Share.share({
          title: 'IronCore Recovery Card',
          text: 'My IronCore recovery card — DO NOT SHARE',
          url: result.uri,
        });
      } else {
        const link = document.createElement('a');
        link.download = `ironcore-${username}.png`;
        link.href = dataUrl;
        link.click();
      }
      setSaved(true);
      SFX.success();
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center p-6 pt-[env(safe-area-inset-top,24px)] overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, rotateY: 90 }}
        animate={{ opacity: 1, rotateY: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-sm pb-[env(safe-area-inset-bottom,24px)]"
      >
        {/* ── The Player Card (on-screen display) ── */}
        <div
          ref={cardRef}
          className="relative rounded-3xl overflow-hidden mb-6"
          style={{
            background: 'linear-gradient(145deg, rgba(20,20,20,0.95), rgba(10,10,10,0.98))',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: 'linear-gradient(135deg, transparent 20%, rgba(220,38,38,0.3) 30%, rgba(249,115,22,0.2) 40%, rgba(168,85,247,0.2) 50%, rgba(59,130,246,0.2) 60%, transparent 80%)', backgroundSize: '200% 200%', animation: 'holographic 4s ease-in-out infinite' }} />
          <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ boxShadow: 'inset 0 0 30px rgba(220,38,38,0.1), 0 0 40px rgba(220,38,38,0.05)' }} />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="" className="w-5 h-5 object-contain" />
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Player Identity</span>
              </div>
              <Shield size={16} className="text-red-500/50" />
            </div>
            <h2 className="text-3xl font-black text-white mb-1" style={{ textShadow: '0 0 30px rgba(220,38,38,0.3)' }}>@{username}</h2>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-6">IronCore Athlete</p>
            <div className="flex items-end justify-between">
              <div className="bg-white p-2 rounded-xl">
                <QRCodeSVG value={phrase} size={100} level="M" />
              </div>
              <div className="text-right">
                <p className="text-[9px] text-gray-600 uppercase tracking-widest">Member Since</p>
                <p className="text-xs text-gray-400 font-bold">{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Recovery Phrase (on-screen) ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Recovery Phrase</p>
            <button onClick={copyPhrase} className="flex items-center gap-1 text-[10px] text-red-400 font-bold uppercase">
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {words.map((word, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.08 }} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-gray-600 font-bold w-4">{i + 1}</span>
                <span className="text-sm text-white font-bold">{word}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Security Warning */}
        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 mb-2">
          <p className="text-[11px] text-red-400/80 leading-relaxed">
            This phrase is your <strong>ONLY</strong> way to recover your account. Save it now. IronCore cannot reset it.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10 mb-4">
          <p className="text-[11px] text-yellow-400/80 leading-relaxed">
            <strong>Keep these words private.</strong> Anyone with this phrase can access your account. Never share it, screenshot it in public, or enter it on any site other than IronCore.
          </p>
        </div>

        {/* Confirm + Save + Continue */}
        <button className="flex items-center gap-3 mb-4 w-full text-left" onClick={() => setConfirmed(!confirmed)}>
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${confirmed ? 'bg-red-500 border-red-500' : 'border-gray-700'}`}>
            {confirmed && <Check size={12} className="text-white" />}
          </div>
          <span className="text-xs text-gray-400">I've saved my recovery phrase</span>
        </button>

        <div className="flex flex-col gap-3">
          <button onClick={saveToDevice} disabled={saving} className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 bg-white/5 border border-white/10 active:bg-white/10 transition-colors">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Save Card to Device
          </button>
          <button
            onClick={onSaved}
            disabled={!confirmed}
            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white transition-all disabled:opacity-30"
            style={{ background: confirmed ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'rgba(255,255,255,0.05)', boxShadow: confirmed ? '0 15px 50px rgba(220,38,38,0.3)' : 'none' }}
          >
            Continue <ChevronRight size={14} className="inline ml-1" />
          </button>
        </div>
      </motion.div>

      {/* ── Hidden Composite for save (QR + words in one image) ── */}
      <div
        ref={compositeRef}
        style={{ position: 'absolute', left: '-9999px', width: '375px', padding: '24px', background: '#000', fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <p style={{ color: '#dc2626', fontWeight: 900, fontSize: '10px', letterSpacing: '0.2em', marginBottom: '4px', textTransform: 'uppercase' }}>IronCore Recovery Card</p>
          <p style={{ color: '#fff', fontWeight: 900, fontSize: '28px' }}>@{username}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ background: '#fff', padding: '10px', borderRadius: '12px' }}>
            <QRCodeSVG value={phrase} size={160} level="M" />
          </div>
        </div>
        <p style={{ color: '#666', fontSize: '9px', textAlign: 'center', fontWeight: 700, letterSpacing: '0.15em', marginBottom: '12px', textTransform: 'uppercase' }}>Recovery Phrase</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '16px' }}>
          {words.map((word, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
              <span style={{ color: '#666', fontSize: '10px', fontWeight: 700, width: '16px' }}>{i + 1}</span>
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>{word}</span>
            </div>
          ))}
        </div>
        <p style={{ color: '#dc2626', fontSize: '9px', textAlign: 'center', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          DO NOT SHARE — THIS IS YOUR ONLY RECOVERY METHOD
        </p>
      </div>

      <style>{`
        @keyframes holographic {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
};

// ─── Main Orchestrator ──────────────────────────────────────────
export const PlayerCardView = ({ onComplete, onLogin }) => {
  const [step, setStep] = useState('splash'); // splash | landing | username | pin | creating | reveal
  const [username, setUsername] = useState('');
  const [phrase, setPhrase] = useState('');
  const [uid, setUid] = useState('');
  const [pinHash, setPinHash] = useState('');
  const [createError, setCreateError] = useState('');

  // Step 1: Username chosen → go to PIN
  const handleUsernameChosen = (name) => {
    setUsername(name);
    setCreateError('');
    setStep('pin');
  };

  // Step 2: PIN set → create account (single Firestore write with all data)
  const handlePinSet = async (hash) => {
    setPinHash(hash);
    setStep('creating');
    setCreateError('');

    try {
      // Anonymous sign-in
      let user;
      try {
        const { signInAnonymously } = await import('firebase/auth');
        const { auth } = await import('../firebase');
        const result = await signInAnonymously(auth);
        user = result.user;
      } catch (authErr) {
        throw new Error(`Auth failed: ${authErr.code || authErr.message}`);
      }
      setUid(user.uid);

      const newPhrase = generatePhrase();
      setPhrase(newPhrase);
      const phraseH = await hashPhrase(newPhrase);

      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../firebase');

      // Claim username atomically via transaction to prevent race conditions
      try {
        const { runTransaction } = await import('firebase/firestore');
        await runTransaction(db, async (transaction) => {
          const unRef = doc(db, 'usernames', username);
          const unSnap = await transaction.get(unRef);
          if (unSnap.exists() && unSnap.data().uid !== user.uid) {
            throw new Error('Username taken. Go back and try a different name.');
          }
          transaction.set(unRef, {
            uid: user.uid,
            createdAt: serverTimestamp(),
          });
        });
      } catch (unErr) {
        if (unErr.message?.includes('taken')) throw unErr;
        throw new Error(`Username claim failed: ${unErr.code || unErr.message}`);
      }

      // Write full profile in one shot (username + phraseHash + pinHash)
      try {
        await setDoc(doc(db, 'users', user.uid, 'data', 'profile'), {
          username,
          phraseHash: phraseH,
          pinHash: hash,
          createdAt: serverTimestamp(),
        }, { merge: true });
      } catch (profErr) {
        throw new Error(`Profile write failed: ${profErr.code || profErr.message}`);
      }

      // Save PIN to localStorage for returning-user gate
      localStorage.setItem(`ironcore_pin_${user.uid}`, hash);

      setStep('reveal');
    } catch (e) {
      console.error('Account creation error:', e);
      setCreateError(e.message || String(e));
      setStep('username');
    }
  };

  // Step 3: Card saved → biometric prompt → main app
  const handleCardSaved = async () => {
    let bioEnabled = false;

    try {
      const { isBiometricAvailable, authenticateWithBiometrics } = await import('../utils/biometrics');
      const bioAvail = await isBiometricAvailable();

      if (bioAvail) {
        bioEnabled = await authenticateWithBiometrics('Enable biometric login for IronCore');
      }
    } catch (bioErr) {
      // Biometrics unavailable (web or unsupported device) — skip silently
      console.warn('Biometrics not available:', bioErr.message);
    }

    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      await setDoc(doc(db, 'users', uid, 'data', 'profile'), { biometricsEnabled: bioEnabled }, { merge: true });
    } catch { /* non-fatal */ }

    localStorage.setItem('ironcore_uid', uid);
    localStorage.setItem('ironcore_username', username);
    localStorage.setItem('ironcore_bio', bioEnabled ? 'true' : 'false');

    onComplete({ username, biometricsEnabled: bioEnabled });
  };

  // ── Render by step ──
  if (step === 'splash') return <SplashIntro onComplete={() => setStep('landing')} />;
  if (step === 'landing') return <LandingScreen onCreateAccount={() => setStep('username')} onLogin={onLogin} />;
  if (step === 'username') return <UsernameScreen onNext={handleUsernameChosen} onBack={() => setStep('landing')} createError={createError} />;
  if (step === 'pin') return <PinEntryView mode="setup" skipConfirm onComplete={handlePinSet} />;
  if (step === 'creating') return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-gray-500 font-black uppercase tracking-widest animate-pulse">Forging Identity...</p>
    </div>
  );
  if (step === 'reveal') return <CardRevealScreen username={username} phrase={phrase} onSaved={handleCardSaved} />;
  return null;
};
