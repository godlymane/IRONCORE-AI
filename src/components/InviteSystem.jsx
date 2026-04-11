import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Share2, Gift, Users, CheckCircle, ExternalLink, Zap } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { GlassCard } from './UIComponents';

/**
 * InviteSystem
 *
 * Full-screen overlay for the referral / invite flow.
 *
 * Props:
 *   user     – Firebase Auth user object
 *   profile  – user profile doc from Firestore
 *   onClose  – callback to dismiss
 */
export const InviteSystem = ({ user, profile, onClose }) => {
  const [referralCode, setReferralCode] = useState(profile?.referralCode || null);
  const [loading, setLoading] = useState(!profile?.referralCode);
  const [copied, setCopied] = useState(false);
  const [claimCode, setClaimCode] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResult, setClaimResult] = useState(null); // { success, message }
  // AbortController for cancelling in-flight async ops on unmount (issue 24)
  const abortRef = React.useRef(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const referralCount = profile?.referralCount || 0;

  // Generate referral code on mount if the user doesn't have one (issue 24: AbortController)
  useEffect(() => {
    if (referralCode) return;
    const abortController = new AbortController();

    const generate = async () => {
      try {
        setLoading(true);
        const functions = getFunctions();
        const generateReferralCode = httpsCallable(functions, 'generateReferralCode');
        const result = await generateReferralCode();
        if (!abortController.signal.aborted && result?.data?.code) {
          setReferralCode(result.data.code);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error('Failed to generate referral code:', err);
        }
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    };

    generate();
    return () => { abortController.abort(); };
  }, [referralCode]);

  const inviteUrl = referralCode
    ? `https://ironcore.ai/invite/${referralCode}`
    : 'https://ironcore.ai';

  const shareText = referralCode
    ? `Join me on IronCore AI! Use my code ${referralCode} for 7 days free premium. Download: ${inviteUrl}`
    : 'Join me on IronCore AI! Download: https://ironcore.ai';

  const handleCopyCode = useCallback(async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = referralCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [referralCode]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent
    }
  }, [inviteUrl]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'IronCore AI',
          text: shareText,
          url: inviteUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      handleCopyLink();
    }
  }, [shareText, inviteUrl, handleCopyLink]);

  const handleWhatsApp = useCallback(() => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  }, [shareText]);

  const handleTwitter = useCallback(() => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  }, [shareText]);

  const handleClaimCode = useCallback(async () => {
    if (!claimCode.trim()) return;
    // Cancel any previous in-flight claim (issue 24)
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setClaimLoading(true);
    setClaimResult(null);

    try {
      const functions = getFunctions();
      const claimReferralReward = httpsCallable(functions, 'claimReferralReward');
      const result = await claimReferralReward({ code: claimCode.trim().toUpperCase() });
      if (controller.signal.aborted) return;
      setClaimResult({
        success: true,
        message: result?.data?.message || '7 days of Premium activated!',
      });
      setClaimCode('');
    } catch (err) {
      if (controller.signal.aborted) return;
      const msg = err?.message || 'Failed to claim code. Please try again.';
      setClaimResult({ success: false, message: msg });
    } finally {
      if (!controller.signal.aborted) setClaimLoading(false);
    }
  }, [claimCode]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm overflow-y-auto"
      >
        <div className="min-h-full flex flex-col items-center px-4 py-8 pb-24">
          {/* Header */}
          <div className="w-full max-w-md flex items-center justify-between mb-6">
            <h1 className="text-xl font-black uppercase tracking-tight text-white">
              Invite Friends
            </h1>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="w-full max-w-md flex flex-col gap-4">
            {/* Reward banner */}
            <GlassCard className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="w-5 h-5 text-red-500" />
                <span className="text-sm font-bold uppercase tracking-tight text-red-500">
                  Referral Reward
                </span>
              </div>
              <p className="text-white font-bold text-lg">
                Both you and your friend get 7 days Premium!
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Unlimited form correction, AI coaching, and full leagues
              </p>
            </GlassCard>

            {/* Referral code */}
            <GlassCard>
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                  Your Referral Code
                </p>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-6 h-6 border-2 border-white/20 border-t-red-500 rounded-full"
                    />
                  </div>
                ) : referralCode ? (
                  <>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-3xl font-black tracking-widest text-white">
                        {referralCode}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleCopyCode}
                        className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                      >
                        {copied ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-white" />
                        )}
                      </motion.button>
                    </div>
                    {copied && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-green-400 text-xs mt-2 font-semibold"
                      >
                        Copied to clipboard!
                      </motion.p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">Could not generate code</p>
                )}
              </div>
            </GlassCard>

            {/* Share invite button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm uppercase tracking-tight transition-colors"
            >
              <Share2 className="w-5 h-5" />
              Share Invite
            </motion.button>

            {/* Quick share buttons */}
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 hover:bg-[#25D366]/25 transition-colors"
              >
                <span className="text-[#25D366] font-bold text-sm">WhatsApp</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleTwitter}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <span className="text-white font-bold text-sm">X / Twitter</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-white/60" />
                <span className="text-white font-bold text-sm">Copy Link</span>
              </motion.button>
            </div>

            {/* Stats */}
            <GlassCard>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/15 flex items-center justify-center">
                    <Users className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Friends Invited</p>
                    <p className="text-gray-500 text-xs">Successful referrals</p>
                  </div>
                </div>
                <span className="text-2xl font-black text-white">{referralCount}</span>
              </div>
            </GlassCard>

            {/* Claim a referral code */}
            <GlassCard>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                Have a Referral Code?
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  maxLength={12}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold tracking-widest placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 transition-colors"
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClaimCode}
                  disabled={claimLoading || !claimCode.trim()}
                  className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white font-bold text-sm uppercase tracking-tight transition-colors flex items-center gap-2"
                >
                  {claimLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Claim
                    </>
                  )}
                </motion.button>
              </div>

              {/* Claim result */}
              <AnimatePresence>
                {claimResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mt-3 p-3 rounded-xl text-sm font-semibold ${
                      claimResult.success
                        ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}
                  >
                    {claimResult.success && <CheckCircle className="w-4 h-4 inline mr-1.5 -mt-0.5" />}
                    {claimResult.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>

            {/* How it works */}
            <GlassCard>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
                How It Works
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { step: '1', text: 'Share your unique code with friends' },
                  { step: '2', text: 'They sign up and enter your code' },
                  { step: '3', text: 'You both get 7 days of Premium free' },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-600/15 flex items-center justify-center shrink-0">
                      <span className="text-red-500 font-black text-xs">{step}</span>
                    </div>
                    <p className="text-white/80 text-sm">{text}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InviteSystem;
