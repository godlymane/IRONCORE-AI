import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Copy, Check, Download, ChevronRight, AlertCircle, Loader2, Dumbbell, KeyRound } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { generatePhrase, hashPhrase, validateUsername } from '../utils/playerIdentity';
import { PinEntryView } from './PinEntryView';
import { SFX, Haptics } from '../utils/audio';

// ─── Username Creation Screen ───────────────────────────────────
const UsernameScreen = ({ onNext, onRecover, createError }) => {
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [available, setAvailable] = useState(null);
  const debounceRef = useRef(null);

  const checkAvailability = useCallback(async (name) => {
    const { valid, clean, error: validErr } = validateUsername(name);
    if (!valid) { setError(validErr); setAvailable(null); return; }
    setChecking(true);
    setError('');
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      const snap = await getDoc(doc(db, 'usernames', clean));
      setAvailable(!snap.exists());
      if (snap.exists()) setError('Already taken');
    } catch {
      setError('Connection error');
    } finally {
      setChecking(false);
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
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl blur-xl opacity-60" style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.8), rgba(185,28,28,0.8))', transform: 'scale(1.2)' }} />
            <div className="relative p-4 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.9), rgba(185,28,28,0.9))', boxShadow: '0 20px 60px rgba(220,38,38,0.4), inset 0 2px 0 rgba(255,255,255,0.2)' }}>
              <Dumbbell size={48} className="text-white" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-1">Choose Your Handle</h1>
        <p className="text-xs text-gray-500 mb-8">This is your identity. No email. No password. Just you.</p>

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

        {/* Create Button */}
        <button
          onClick={handleSubmit}
          disabled={!available || checking}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white transition-all disabled:opacity-30"
          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: available ? '0 15px 50px rgba(220,38,38,0.3)' : 'none' }}
        >
          Create My Identity
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mt-8 mb-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] text-gray-600 uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Recovery / Login Button */}
        <button
          onClick={onRecover}
          className="w-full py-3.5 rounded-2xl font-bold uppercase tracking-wider text-sm text-white border border-white/10 bg-white/5 active:bg-white/10 transition-all flex items-center justify-center gap-2"
        >
          <KeyRound size={16} className="text-red-400" />
          I Have a Recovery Phrase
        </button>
      </motion.div>
    </div>
  );
};

// ─── Card Reveal Screen ─────────────────────────────────────────
const CardRevealScreen = ({ username, phrase, onSaved }) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const cardRef = useRef(null);
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
      const dataUrl = await toPng(cardRef.current, { backgroundColor: '#000', pixelRatio: 3 });

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
          title: 'IronCore Player Card',
          text: 'My IronCore Player Identity',
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
        {/* ── The Player Card ── */}
        <div
          ref={cardRef}
          className="relative rounded-3xl overflow-hidden mb-6"
          style={{
            background: 'linear-gradient(145deg, rgba(20,20,20,0.95), rgba(10,10,10,0.98))',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Holographic shimmer */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              background: 'linear-gradient(135deg, transparent 20%, rgba(220,38,38,0.3) 30%, rgba(249,115,22,0.2) 40%, rgba(168,85,247,0.2) 50%, rgba(59,130,246,0.2) 60%, transparent 80%)',
              backgroundSize: '200% 200%',
              animation: 'holographic 4s ease-in-out infinite',
            }}
          />
          {/* Border glow */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ boxShadow: 'inset 0 0 30px rgba(220,38,38,0.1), 0 0 40px rgba(220,38,38,0.05)' }} />

          <div className="relative p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Dumbbell size={18} className="text-red-500" />
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Player Identity</span>
              </div>
              <Shield size={16} className="text-red-500/50" />
            </div>

            {/* Username */}
            <h2 className="text-3xl font-black text-white mb-1" style={{ textShadow: '0 0 30px rgba(220,38,38,0.3)' }}>
              @{username}
            </h2>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-6">IronCore Athlete</p>

            {/* QR + Date */}
            <div className="flex items-end justify-between">
              <div className="bg-white p-2 rounded-xl">
                <QRCodeSVG value={phrase} size={100} level="M" />
              </div>
              <div className="text-right">
                <p className="text-[9px] text-gray-600 uppercase tracking-widest">Member Since</p>
                <p className="text-xs text-gray-400 font-bold">
                  {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Recovery Phrase ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Recovery Phrase</p>
            <button onClick={copyPhrase} className="flex items-center gap-1 text-[10px] text-red-400 font-bold uppercase">
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {words.map((word, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5"
              >
                <span className="text-[10px] text-gray-600 font-bold w-4">{i + 1}</span>
                <span className="text-sm text-white font-bold">{word}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 mb-4">
          <p className="text-[11px] text-red-400/80 leading-relaxed">
            This phrase is your <strong>ONLY</strong> way to recover your account on a new device. Save it now. IronCore cannot reset it.
          </p>
        </div>

        {/* Confirmation checkbox */}
        <button className="flex items-center gap-3 mb-4 w-full text-left" onClick={() => setConfirmed(!confirmed)}>
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${confirmed ? 'bg-red-500 border-red-500' : 'border-gray-700'}`}>
            {confirmed && <Check size={12} className="text-white" />}
          </div>
          <span className="text-xs text-gray-400">I've saved my recovery phrase</span>
        </button>

        {/* Save + Continue */}
        <div className="flex flex-col gap-3">
          <button
            onClick={saveToDevice}
            disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Save Card to Device
          </button>
          <button
            onClick={onSaved}
            disabled={!confirmed}
            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white transition-all disabled:opacity-30"
            style={{
              background: confirmed ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'rgba(255,255,255,0.05)',
              boxShadow: confirmed ? '0 15px 50px rgba(220,38,38,0.3)' : 'none',
            }}
          >
            Continue <ChevronRight size={14} className="inline ml-1" />
          </button>
        </div>
      </motion.div>

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
export const PlayerCardView = ({ onComplete, onRecover }) => {
  const [step, setStep] = useState('username'); // 'username' | 'creating' | 'pin' | 'reveal'
  const [username, setUsername] = useState('');
  const [phrase, setPhrase] = useState('');
  const [uid, setUid] = useState('');
  const [createError, setCreateError] = useState('');

  const handleUsernameChosen = async (name) => {
    setUsername(name);
    setStep('creating');
    setCreateError('');

    try {
      // Step 1: Anonymous sign-in
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

      // Step 2: Claim username
      try {
        const { getDoc: gd } = await import('firebase/firestore');
        const unSnap = await gd(doc(db, 'usernames', name));
        if (unSnap.exists() && unSnap.data().uid !== user.uid) {
          throw new Error('Username taken by another account. Try a different name.');
        }
        await setDoc(doc(db, 'usernames', name), {
          uid: user.uid,
          createdAt: serverTimestamp(),
        });
      } catch (unErr) {
        if (unErr.message?.includes('Try a different')) throw unErr;
        throw new Error(`Username claim failed: ${unErr.code || unErr.message}`);
      }

      // Step 3: Write profile
      try {
        await setDoc(doc(db, 'users', user.uid, 'data', 'profile'), {
          username: name,
          phraseHash: phraseH,
          createdAt: serverTimestamp(),
        }, { merge: true });
      } catch (profErr) {
        throw new Error(`Profile write failed: ${profErr.code || profErr.message}`);
      }

      setStep('pin');
    } catch (e) {
      console.error('Account creation error:', e);
      setCreateError(e.message || String(e));
      setStep('username');
    }
  };

  const handlePinSet = async (pinHash) => {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      await setDoc(doc(db, 'users', uid, 'data', 'profile'), { pinHash }, { merge: true });
      // Save PIN hash to localStorage — auth gate needs this on return visits
      localStorage.setItem(`ironcore_pin_${uid}`, pinHash);
      setStep('reveal');
    } catch (e) {
      console.error('PIN save error:', e);
      setCreateError(`PIN save failed: ${e.code || e.message}`);
      setStep('username');
    }
  };

  const handleCardSaved = async () => {
    const { isBiometricAvailable, authenticateWithBiometrics } = await import('../utils/biometrics');
    const bioAvail = await isBiometricAvailable();
    let bioEnabled = false;

    if (bioAvail) {
      bioEnabled = await authenticateWithBiometrics('Enable biometric login for IronCore');
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

  if (step === 'creating') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 font-black uppercase tracking-widest animate-pulse">Forging Identity...</p>
      </div>
    );
  }

  if (step === 'pin') return <PinEntryView mode="setup" onComplete={handlePinSet} />;
  if (step === 'reveal') return <CardRevealScreen username={username} phrase={phrase} onSaved={handleCardSaved} />;
  return <UsernameScreen onNext={handleUsernameChosen} onRecover={onRecover} createError={createError} />;
};
