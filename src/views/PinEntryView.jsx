import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Delete, AlertTriangle } from 'lucide-react';
import { Haptics } from '../utils/audio';

export const PinEntryView = ({ mode = 'verify', onComplete, onForgot, storedPinHash }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState(mode === 'setup' ? 'create' : 'verify');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 3;

  const handleDigit = (digit) => {
    Haptics.light();
    const current = step === 'confirm' ? confirmPin : pin;
    if (current.length >= 6) return;

    const next = current + digit;
    if (step === 'confirm') setConfirmPin(next);
    else setPin(next);

    if (next.length === 6) {
      setTimeout(() => handleSubmit(next), 200);
    }
  };

  const handleDelete = () => {
    Haptics.light();
    if (step === 'confirm') setConfirmPin(prev => prev.slice(0, -1));
    else setPin(prev => prev.slice(0, -1));
  };

  const handleSubmit = async (value) => {
    const { hashPin } = await import('../utils/playerIdentity');

    if (step === 'create') {
      setStep('confirm');
      setConfirmPin('');
      return;
    }

    if (step === 'confirm') {
      if (value !== pin) {
        setError("PINs don't match. Try again.");
        setConfirmPin('');
        setStep('create');
        setPin('');
        return;
      }
      const hashed = await hashPin(value);
      onComplete(hashed);
      return;
    }

    // Verify mode
    const hashed = await hashPin(value);
    if (hashed === storedPinHash) {
      onComplete();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');
      Haptics.error();
      if (newAttempts >= MAX_ATTEMPTS) {
        setError('Too many attempts');
      } else {
        setError(`Wrong PIN (${MAX_ATTEMPTS - newAttempts} tries left)`);
      }
    }
  };

  const dots = step === 'confirm' ? confirmPin : pin;
  const title = step === 'create' ? 'Create Your PIN' : step === 'confirm' ? 'Confirm Your PIN' : 'Enter PIN';
  const subtitle = step === 'create' ? 'Choose a 6-digit PIN for quick access' : step === 'confirm' ? 'Enter the same PIN again' : 'Unlock IronCore';

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center w-full max-w-xs">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <ShieldCheck size={32} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{title}</h1>
        <p className="text-xs text-gray-500 mb-8">{subtitle}</p>

        {/* PIN Dots */}
        <div className="flex justify-center gap-3 mb-8">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <motion.div
              key={i}
              className={`w-4 h-4 rounded-full border-2 ${i < dots.length ? 'bg-red-500 border-red-500' : 'border-gray-700'}`}
              animate={i < dots.length ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.15 }}
            />
          ))}
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 flex items-center justify-center gap-2 text-red-400 text-xs">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((key, i) => (
            key === null ? <div key={i} /> :
              key === 'del' ? (
                <button key={i} onClick={handleDelete} className="h-16 rounded-2xl bg-white/5 flex items-center justify-center active:bg-white/10 transition-colors">
                  <Delete size={22} className="text-gray-400" />
                </button>
              ) : (
                <button key={i} onClick={() => handleDigit(String(key))} className="h-16 rounded-2xl bg-white/5 text-white text-2xl font-bold active:bg-white/10 transition-colors">
                  {key}
                </button>
              )
          ))}
        </div>

        {/* Forgot PIN — use recovery */}
        {step === 'verify' && attempts >= MAX_ATTEMPTS && onForgot && (
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={onForgot}
            className="text-xs text-red-400 font-bold uppercase tracking-wide"
          >
            Use Recovery Phrase
          </motion.button>
        )}
      </motion.div>
    </div>
  );
};
