import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogIn, ChevronRight, Loader2, AlertCircle, KeyRound, QrCode, Camera, Upload, X, Delete } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Haptics } from '../utils/audio';

// ─── QR Scanner (lazy-loads html5-qrcode) ───────────────────────
const QRScannerModal = ({ onDecoded, onClose }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef(null);

  const startCamera = async () => {
    setError('');
    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          scanner.stop().catch(() => {});
          handleDecoded(text);
        },
        () => {} // ignore scan failures
      );
    } catch (e) {
      setScanning(false);
      setError('Camera access denied. Try uploading an image instead.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader-file');
      const text = await scanner.scanFile(file, false);
      handleDecoded(text);
    } catch {
      setError('Could not read QR code from image. Try a clearer photo.');
    }
  };

  const handleDecoded = (text) => {
    const words = text.trim().toLowerCase().split(/\s+/);
    if (words.length === 12) {
      Haptics.success();
      onDecoded(text.trim().toLowerCase());
    } else {
      setError('QR code does not contain a valid recovery phrase.');
    }
  };

  // Ensure camera is stopped on unmount (prevents leaked stream)
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const cleanup = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-[env(safe-area-inset-top,16px)]">
        <h2 className="text-white font-bold text-sm uppercase tracking-wide">Scan Recovery QR</h2>
        <button onClick={cleanup} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <X size={16} className="text-white" />
        </button>
      </div>

      {/* Camera view */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div id="qr-reader" className="w-full max-w-sm rounded-2xl overflow-hidden mb-6" style={{ minHeight: scanning ? '300px' : '0' }} />
        <div id="qr-reader-file" style={{ display: 'none' }} />

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs mb-4 p-3 bg-red-500/10 rounded-xl">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {!scanning && (
          <div className="flex flex-col gap-3 w-full max-w-sm">
            <button
              onClick={startCamera}
              className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
            >
              <Camera size={18} />
              Open Camera
            </button>
            <label className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 bg-white/5 border border-white/10 cursor-pointer active:bg-white/10 transition-colors">
              <Upload size={18} />
              Upload QR Image
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Login Screen ───────────────────────────────────────────────
export const LoginScreen = ({ defaultUsername = '', onLoggedIn, onBack, onRecovery }) => {
  const [username, setUsername] = useState(defaultUsername);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [failCount, setFailCount] = useState(0);
  const [showQR, setShowQR] = useState(false);

  const handleDigit = (digit) => {
    if (pin.length >= 6) return;
    Haptics.light();
    const next = pin + digit;
    setPin(next);
    if (next.length === 6) {
      setTimeout(() => handleLogin(next), 200);
    }
  };

  const handleDelete = () => {
    Haptics.light();
    setPin(prev => prev.slice(0, -1));
  };

  const handleLogin = async (pinValue) => {
    const cleanUser = username.replace(/^@/, '').toLowerCase().trim();
    if (!cleanUser || cleanUser.length < 3) {
      setError('Enter your username first');
      setPin('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const { getApp } = await import('firebase/app');
      const functions = getFunctions(getApp());
      const loginWithPin = httpsCallable(functions, 'loginWithPin');
      // Send raw PIN — server does PBKDF2 verification (HTTPS encrypted in transit)
      const result = await loginWithPin({ username: cleanUser, pin: pinValue });

      const { token, username: returnedUser } = result.data;

      const { signInWithCustomToken } = await import('firebase/auth');
      const { auth } = await import('../firebase');
      await signInWithCustomToken(auth, token);

      // Save to localStorage for returning-user flow
      const { hashPin } = await import('../utils/playerIdentity');
      const localPinHash = await hashPin(pinValue);
      localStorage.setItem('ironcore_uid', auth.currentUser.uid);
      localStorage.setItem('ironcore_username', returnedUser);
      localStorage.setItem(`ironcore_pin_${auth.currentUser.uid}`, localPinHash);

      Haptics.success();
      setFailCount(0); // Reset fail count on successful login
      onLoggedIn({ username: returnedUser });
    } catch (e) {
      console.error('Login error:', e?.code, e?.message, e?.details, JSON.stringify(e));
      const newFails = failCount + 1;
      setFailCount(newFails);

      const code = e?.code || '';
      if (code === 'functions/resource-exhausted') {
        setError('Too many attempts. Try again later.');
      } else if (code === 'functions/not-found' || code === 'functions/invalid-argument') {
        setError('Invalid username or PIN.');
      } else if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded') {
        setError('Server is waking up. Try again in a few seconds.');
      } else if (code === 'functions/internal') {
        setError('Server error. Please try again.');
      } else if (code === 'functions/unauthenticated' || code === 'functions/permission-denied') {
        setError('Auth error. Please try again.');
      } else if (!navigator.onLine) {
        setError('No internet connection.');
      } else {
        // Show actual error for debugging — most "connection errors" are actually server errors
        const msg = e?.message || '';
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network')) {
          setError('Connection error. Check your network.');
        } else if (msg.includes('CORS') || msg.includes('blocked')) {
          setError('Connection blocked. Try refreshing the app.');
        } else {
          setError(msg.length > 80 ? 'Login failed. Please try again.' : (msg || 'Login failed. Please try again.'));
        }
      }
      Haptics.error();
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // QR scan decoded → use recoverAccount
  const handleQRDecoded = async (phrase) => {
    setShowQR(false);
    setLoading(true);
    setError('');

    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const { getApp } = await import('firebase/app');
      const functions = getFunctions(getApp());
      const recoverAccount = httpsCallable(functions, 'recoverAccount');
      const result = await recoverAccount({ phrase });

      const { token, username: recoveredUser } = result.data;

      const { signInWithCustomToken } = await import('firebase/auth');
      const { auth } = await import('../firebase');
      await signInWithCustomToken(auth, token);

      localStorage.setItem('ironcore_uid', auth.currentUser.uid);
      localStorage.setItem('ironcore_username', recoveredUser);

      Haptics.success();
      onLoggedIn({ username: recoveredUser });
    } catch (e) {
      console.error('QR recovery error:', e);
      const code = e?.code || '';
      if (code === 'functions/not-found') {
        setError('No account found for this QR code.');
      } else if (code === 'functions/resource-exhausted') {
        setError('Too many attempts. Try again later.');
      } else if (code === 'functions/invalid-argument') {
        setError('Invalid QR code format.');
      } else if (code === 'functions/internal') {
        setError('Server error. Please try again in a moment.');
      } else if (!navigator.onLine) {
        setError('No internet connection.');
      } else {
        setError(e?.message?.slice(0, 80) || 'QR recovery failed. Try entering your phrase manually.');
      }
      setLoading(false);
    }
  };

  if (showQR) return <QRScannerModal onDecoded={handleQRDecoded} onClose={() => setShowQR(false)} />;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs text-center">
        {/* Back */}
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-500 mb-8">
          <ChevronRight size={14} className="rotate-180" /> Back
        </button>

        {/* Header */}
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <LogIn size={28} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-1">Welcome Back</h1>
        <p className="text-xs text-gray-500 mb-6">Enter your username and PIN</p>

        {/* Username Input */}
        <div className="relative mb-6">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '')); setError(''); }}
            placeholder="username"
            maxLength={20}
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-10 pr-4 text-white text-lg font-bold placeholder-gray-700 outline-none focus:border-red-500/50 focus:bg-white/10 transition-all"
          />
        </div>

        {/* PIN label */}
        <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">PIN</p>

        {/* PIN Dots — shake on wrong PIN */}
        <motion.div
          className="flex justify-center gap-3 mb-6"
          animate={error && error.includes('PIN') ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          {[0, 1, 2, 3, 4, 5].map(i => (
            <motion.div
              key={i}
              className={`w-4 h-4 rounded-full border-2 ${error && error.includes('PIN') ? 'bg-red-700 border-red-700' : i < pin.length ? 'bg-red-500 border-red-500' : 'border-gray-700'}`}
              animate={i < pin.length ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.15 }}
            />
          ))}
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 flex items-center justify-center gap-2 text-red-400 text-xs">
            <AlertCircle size={14} />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mb-4">
            <Loader2 size={20} className="text-red-500 animate-spin mx-auto" />
          </div>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((key, i) => (
            key === null ? <div key={i} /> :
              key === 'del' ? (
                <button key={i} onClick={handleDelete} className="h-14 rounded-2xl bg-white/5 flex items-center justify-center active:bg-white/10 transition-colors">
                  <Delete size={20} className="text-gray-400" />
                </button>
              ) : (
                <button key={i} onClick={() => handleDigit(String(key))} disabled={loading} className="h-14 rounded-2xl bg-white/5 text-white text-xl font-bold active:bg-white/10 transition-colors disabled:opacity-30">
                  {key}
                </button>
              )
          ))}
        </div>

        {/* Fallback options */}
        <div className="flex flex-col gap-2 mt-2">
          {failCount >= 2 && (
            <button onClick={onRecovery} className="flex items-center justify-center gap-2 text-xs text-red-400 font-bold uppercase tracking-wide py-2">
              <KeyRound size={14} />
              Use Recovery Phrase
            </button>
          )}
          <button onClick={() => setShowQR(true)} className="flex items-center justify-center gap-2 text-xs text-gray-500 font-bold uppercase tracking-wide py-2">
            <QrCode size={14} />
            Scan Recovery QR
          </button>
        </div>
      </motion.div>
    </div>
  );
};
