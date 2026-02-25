import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { getApp } from 'firebase/app';
import { auth as firebaseAuth } from '../firebase';
import { Haptics } from '../utils/audio';

export const RecoveryView = ({ onRecovered, onBack }) => {
  const [phrase, setPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRecover = async () => {
    const trimmed = phrase.trim().toLowerCase();
    const words = trimmed.split(/\s+/);
    if (words.length !== 12) {
      setError('Enter all 12 words separated by spaces');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const functions = getFunctions(getApp());
      const recoverAccount = httpsCallable(functions, 'recoverAccount');
      const result = await recoverAccount({ phrase: trimmed });

      const { token, username } = result.data;
      await signInWithCustomToken(firebaseAuth, token);

      localStorage.setItem('ironcore_uid', firebaseAuth.currentUser.uid);
      localStorage.setItem('ironcore_username', username);

      Haptics.success();
      onRecovered({ username });
    } catch (e) {
      console.error('Recovery error:', e);
      if (e.code === 'functions/not-found') {
        setError('No account matches this phrase. Check your words.');
      } else {
        setError('Recovery failed. Check your connection and try again.');
      }
      Haptics.error();
    } finally {
      setLoading(false);
    }
  };

  const wordCount = phrase.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-500 mb-8">
          <ArrowLeft size={14} /> Back
        </button>

        <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <KeyRound size={28} className="text-red-500" />
        </div>

        <h1 className="text-2xl font-black text-white uppercase tracking-tight text-center mb-1">Recover Account</h1>
        <p className="text-xs text-gray-500 text-center mb-8">Enter your 12-word recovery phrase</p>

        <textarea
          value={phrase}
          onChange={(e) => { setPhrase(e.target.value); setError(''); }}
          placeholder="iron forge titan apex blade thunder storm fury squat press flex pump"
          rows={4}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm placeholder-gray-700 outline-none focus:border-red-500/50 focus:bg-white/10 transition-all resize-none mb-2"
        />

        <p className="text-[10px] text-gray-600 mb-4 text-right">{wordCount}/12 words</p>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs mb-4">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleRecover}
          disabled={loading || wordCount !== 12}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white transition-all disabled:opacity-30"
          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
        >
          {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Recover My Account'}
        </button>
      </motion.div>
    </div>
  );
};
