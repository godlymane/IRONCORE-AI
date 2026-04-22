import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Copy, Check, Download, ChevronRight, AlertCircle, Loader2, LogIn, UserPlus } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { generatePhrase, hashPhrase, validateUsername } from '../utils/playerIdentity';
import { PinEntryView } from './PinEntryView';
import { SFX, Haptics } from '../utils/audio';
import { setPinHash as storePinHash } from '../utils/securePin';

// Stoic quotes
const QUOTES = [
  { text: "The impediment to action advances action.", author: "Marcus Aurelius" },
  { text: "We suffer more in imagination than in reality.", author: "Seneca" },
  { text: "No man is free who is not master of himself.", author: "Epictetus" },
  { text: "You could leave life right now. Let that determine what you do.", author: "Marcus Aurelius" },
  { text: "He who has a why can bear almost any how.", author: "Nietzsche" },
  { text: "The only way out is through.", author: "Robert Frost" },
];
const TAGLINES = ["Your discipline.", "Your strength.", "Your legacy.", "Your phone. Your trainer."];

const RotatingQuote = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % QUOTES.length), 6000);
    return () => clearInterval(t);
  }, []);
  return (
    <AnimatePresence mode="wait">
      <motion.div key={idx} className="text-center px-4"
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.5 }}>
        <p className="text-[11px] text-white/30 italic leading-relaxed">"{QUOTES[idx].text}"</p>
        <p className="text-[9px] text-red-500/40 mt-1 uppercase tracking-[0.2em] font-medium">— {QUOTES[idx].author}</p>
      </motion.div>
    </AnimatePresence>
  );
};

const TypewriterTagline = () => {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const current = TAGLINES[lineIdx];
  useEffect(() => {
    if (!deleting && charIdx < current.length) {
      const t = setTimeout(() => setCharIdx(c => c + 1), 60 + Math.random() * 40);
      return () => clearTimeout(t);
    }
    if (!deleting && charIdx === current.length) {
      const t = setTimeout(() => setDeleting(true), 2000);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx > 0) {
      const t = setTimeout(() => setCharIdx(c => c - 1), 30);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx === 0) { setDeleting(false); setLineIdx(i => (i + 1) % TAGLINES.length); }
  }, [charIdx, deleting, current.length]);
  return (
    <div className="h-5 flex items-center justify-center">
      <span className="text-xs text-gray-400 tracking-[0.25em] uppercase font-medium">{current.slice(0, charIdx)}</span>
      <motion.span className="inline-block w-[2px] h-3.5 bg-red-500 ml-0.5" animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }} />
    </div>
  );
};

// ─── Landing Screen ─────────────────────────────────────────────
const LandingScreen = ({ onCreateAccount, onLogin }) => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 overflow-hidden relative">

    {/* Breathing glow */}
    <motion.div
      className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full blur-[150px]"
      style={{ background: 'radial-gradient(circle, #dc2626 0%, #991b1b 30%, transparent 70%)' }}
      animate={{ opacity: [0.1, 0.22, 0.1], scale: [0.92, 1.05, 0.92] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    />

    {/* Ember particles */}
    {[...Array(6)].map((_, i) => (
      <motion.div key={i} className="absolute rounded-full pointer-events-none"
        style={{ width: 1.5 + (i % 3), height: 1.5 + (i % 3), left: `${15 + i * 13}%`, background: '#dc2626', boxShadow: '0 0 4px rgba(220,38,38,0.4)' }}
        animate={{ y: ['100vh', '-10vh'], opacity: [0, 0.35, 0.35, 0] }}
        transition={{ duration: 9 + i * 2, delay: i * 1.5, repeat: Infinity, ease: 'linear' }}
      />
    ))}

    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      className="w-full max-w-sm text-center relative z-10 flex flex-col items-center">

      {/* Logo with breathing glow */}
      <motion.div className="flex justify-center mb-6"
        initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}>
        <div className="relative">
          <motion.div className="absolute inset-0 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.7), transparent 55%)', transform: 'scale(2.5)' }}
            animate={{ opacity: [0.2, 0.38, 0.2] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.img src="/logo.png" alt="IronCore"
            className="relative w-32 h-32 object-contain"
            style={{
              WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 68%)',
              maskImage: 'radial-gradient(circle at center, black 40%, transparent 68%)',
              filter: 'drop-shadow(0 0 25px rgba(220,38,38,0.4))',
            }}
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
      </motion.div>

      <motion.h1 className="text-4xl font-black text-white uppercase tracking-tight mb-2"
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}>
        IronCore
      </motion.h1>

      {/* Breathing accent line */}
      <motion.div className="h-[2px] rounded-full bg-red-600 mb-4"
        animate={{ width: [36, 48, 36], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />

      {/* Typewriter tagline */}
      <div className="mb-10"><TypewriterTagline /></div>

      {/* Buttons */}
      <motion.button onClick={onCreateAccount}
        className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white mb-3 flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 15px 50px rgba(220,38,38,0.3)' }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }} whileTap={{ scale: 0.97 }}>
        <UserPlus size={18} />
        Create Account
      </motion.button>

      <motion.button onClick={onLogin}
        className="w-full py-4 rounded-2xl font-bold uppercase tracking-wider text-sm text-white border border-white/10 bg-white/5 active:bg-white/10 transition-all flex items-center justify-center gap-2"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }} whileTap={{ scale: 0.97 }}>
        <LogIn size={18} className="text-red-400" />
        Log In
      </motion.button>

      {/* Rotating quote */}
      <div className="mt-10 min-h-[40px]"><RotatingQuote /></div>
    </motion.div>
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
        <button onClick={onBack} aria-label="Go back" className="flex items-center gap-1 text-xs text-gray-500 mb-8 self-start">
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
            aria-label="Choose your username"
            aria-required="true"
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
  const [step, setStep] = useState('landing'); // landing | username | pin | creating | reveal
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

      // PIN hash → platform secure storage (Keychain / Keystore / sessionStorage)
      await storePinHash(user.uid, hash);

      setStep('reveal');
    } catch (e) {
      if (import.meta.env.DEV) console.error('Account creation error:', e?.code, e?.message);
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

    // Stored in localStorage for the returning-user gate: auto-fills the login username,
    // skips the landing screen, and restores biometric preference on next app launch.
    // TODO [native-rebuild]: Move to secure storage (Keychain on iOS, EncryptedSharedPreferences on Android)
    localStorage.setItem('ironcore_uid', uid);
    localStorage.setItem('ironcore_username', username);
    localStorage.setItem('ironcore_bio', bioEnabled ? 'true' : 'false');

    onComplete({ username, biometricsEnabled: bioEnabled });
  };

  // ── Render by step ──
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
