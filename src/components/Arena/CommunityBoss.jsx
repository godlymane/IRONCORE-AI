import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Crosshair, Users, Sparkles, Trophy, Skull } from 'lucide-react';
import { GlassCard } from '../UIComponents';
import { subscribeToBoss, createCommunityBoss } from '../../services/arenaService';
import { useStore } from '../../hooks/useStore';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';

export const CommunityBoss = () => {
    const { user, profile, updateState } = useStore();
    const [boss, setBoss] = useState(null);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);

    useEffect(() => {
        let unsubscribe;
        const initBoss = async () => {
            try {
                unsubscribe = subscribeToBoss((data) => {
                    setBoss(data);
                    setLoading(false);
                });
            } catch (err) {
                console.error("Failed to subscribe to boss", err);
                setLoading(false);
            }
        };
        initBoss();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    // Helper to spawn a boss for development if none exists
    const handleSpawnBoss = async () => {
        await createCommunityBoss({
            name: "Ironclad Behemoth",
            totalHP: 1000000
        });
    };

    const claimReward = async () => {
        if (!boss || !user || claiming) return;
        setClaiming(true);

        try {
            const bossRef = doc(db, 'community_boss', 'current');
            const profileRef = doc(db, 'users', user.uid, 'data', 'profile');
            const leaderboardRef = doc(db, 'leaderboard', user.uid);
            const rewardAmount = 500; // Base reward for participation

            await runTransaction(db, async (txn) => {
                const bSnap = await txn.get(bossRef);
                const pSnap = await txn.get(profileRef);

                if (!bSnap.exists()) throw new Error("Boss not found");

                const bData = bSnap.data();
                const pData = pSnap.exists() ? pSnap.data() : { xp: 0 };

                const contributors = bData.contributors || [];
                const meIndex = contributors.findIndex(c => c.userId === user.uid);

                if (meIndex === -1) throw new Error("You didn't participate!");
                if (contributors[meIndex].claimedXP) throw new Error("Already claimed");

                // Mark as claimed
                contributors[meIndex].claimedXP = true;
                txn.update(bossRef, { contributors });

                // Add XP
                const oldXp = pData.xp || 0;
                const newXp = oldXp + rewardAmount;
                txn.set(profileRef, { xp: newXp }, { merge: true });
                txn.set(leaderboardRef, { xp: newXp }, { merge: true });
            });

            // Update local state so UI reflects it immediately
            const currentProfile = useStore.getState().profile;
            updateState({ profile: { ...currentProfile, xp: (currentProfile.xp || 0) + rewardAmount } });

        } catch (e) {
            console.error("Failed to claim reward", e);
            alert(e.message);
        } finally {
            setClaiming(false);
        }
    };

    if (loading) return null;

    if (!boss) {
        return (
            <GlassCard className="p-6 mb-4 text-center border-dashed border-white/20">
                <ShieldAlert size={32} className="mx-auto text-gray-500 mb-3" />
                <h3 className="text-lg font-black uppercase text-gray-400">All Clear</h3>
                <p className="text-xs text-gray-500 mb-4">No active threat detected in the sector.</p>
                {import.meta.env.DEV && (
                    <button
                        onClick={handleSpawnBoss}
                        className="px-4 py-2 bg-red-600/20 text-red-500 rounded-lg text-xs font-bold border border-red-500/30 uppercase tracking-wider"
                    >
                        Spawn Boss (Dev)
                    </button>
                )}
            </GlassCard>
        );
    }

    const hpPercent = Math.max(0, Math.min(100, (boss.currentHP / boss.totalHP) * 100));
    const isDefeated = boss.status === 'defeated' || boss.currentHP <= 0;

    // Check if user participated and hasn't claimed
    const myContribution = (boss.contributors || []).find(c => c.userId === user?.uid);
    const canClaim = isDefeated && myContribution && !myContribution.claimedXP;

    // Sort contributors by damage
    const sortedContributors = [...(boss.contributors || [])].sort((a, b) => b.damageDealt - a.damageDealt);

    return (
        <GlassCard className="p-0 overflow-hidden mb-6 relative border-red-500/30">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-0 right-[-10%] w-48 h-48 bg-red-600 rounded-full blur-[80px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 bg-orange-600 rounded-full blur-[60px]" />
            </div>

            <div className="p-5 relative z-10">
                {/* Boss Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {isDefeated ? (
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-black uppercase rounded border border-green-500/30 flex items-center gap-1">
                                    <Sparkles size={10} /> Sector Cleared
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-black uppercase rounded border border-red-500/30 flex items-center gap-1">
                                    <ShieldAlert size={10} /> Action Required
                                </span>
                            )}
                        </div>
                        <h2 className={`text-2xl font-black italic uppercase tracking-tighter ${isDefeated ? 'text-gray-400 line-through' : 'text-white'}`}>
                            {boss.name}
                        </h2>
                    </div>
                    {isDefeated ? (
                        <Skull size={32} className="text-green-500/50" />
                    ) : (
                        <Crosshair size={32} className="text-red-500/50 animate-pulse" />
                    )}
                </div>

                {/* Main HP Bar */}
                <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                        <span className="text-gray-400">Boss Integrity</span>
                        <span className={isDefeated ? 'text-green-400' : 'text-red-400'}>
                            {Math.round(boss.currentHP).toLocaleString()} / {boss.totalHP.toLocaleString()}
                        </span>
                    </div>

                    <div className="h-4 w-full bg-black/50 rounded-full overflow-hidden border border-white/10 relative">
                        <motion.div
                            className="absolute top-0 left-0 h-full rounded-full"
                            style={{
                                background: isDefeated ? '#22c55e' : 'linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)',
                                boxShadow: isDefeated ? '0 0 10px #22c55e' : '0 0 10px #ef4444'
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${hpPercent}%` }}
                            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                        />
                        {/* Static segmented grid effect over the bar */}
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjEwMCI+PHJlY3Qgd2lkdGg9IjEiIGhlaWdodD0iMTAwIiBmaWxsPSJyZ2JhKDAsMCwwLDAuNCkiLz48L3N2Zz4=')] opacity-50" />
                    </div>
                </div>

                {/* Reward Claim Segment */}
                <AnimatePresence>
                    {canClaim && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 flex items-center justify-between"
                        >
                            <div>
                                <h4 className="text-green-400 font-black text-sm uppercase">Bounty Available</h4>
                                <p className="text-xs text-gray-400">Claim your 500 XP reward.</p>
                            </div>
                            <button
                                onClick={claimReward}
                                disabled={claiming}
                                className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-black uppercase text-xs rounded-lg transition-colors disabled:opacity-50"
                            >
                                {claiming ? 'Claiming...' : 'Claim'}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Top Contributors */}
                {sortedContributors.length > 0 && (
                    <div className="border-t border-white/10 pt-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Users size={14} className="text-gray-400" />
                            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Top Contributors</h3>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                            {sortedContributors.slice(0, 10).map((c, i) => (
                                <div key={c.userId} className="flex justify-between items-center text-sm p-2 rounded-lg bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-black w-4 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                                            {i + 1}
                                        </span>
                                        <span className={`font-bold ${c.userId === user?.uid ? 'text-red-400' : 'text-white'}`}>
                                            {c.username}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-red-400">{Math.round(c.damageDealt).toLocaleString()}</p>
                                        <p className="text-[9px] uppercase text-gray-500">Damage</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </GlassCard>
    );
};
