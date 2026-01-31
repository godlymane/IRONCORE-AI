import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, Target, Calendar, ChevronRight, Crown, Medal } from 'lucide-react';
import { useArena } from '../../context/ArenaContext';
import { getCurrentTournament, joinTournament, subscribeToTournamentLeaderboard, createDemoTournament } from '../../services/tournamentService';
import { Button } from '../UIComponents';

const Tournaments = () => {
    const { currentUser } = useArena();
    const [tournament, setTournament] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        const fetchTournament = async () => {
            try {
                const updated = await getCurrentTournament();

                if (!updated && currentUser?.username === 'IronWarrior') { // Demo logic
                    // Auto-create demo tournament if none exists
                    await createDemoTournament();
                    const newTourney = await getCurrentTournament();
                    setTournament(newTourney);
                } else {
                    setTournament(updated);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchTournament();
    }, [currentUser]);

    useEffect(() => {
        if (!tournament) return;

        const unsubscribe = subscribeToTournamentLeaderboard(tournament.id, (data) => {
            setParticipants(data);
        });
        return () => unsubscribe();
    }, [tournament]);

    const handleJoin = async () => {
        if (!currentUser || !tournament) return;
        setJoining(true);
        try {
            await joinTournament(tournament.id, {
                userId: currentUser.id,
                username: currentUser.username,
                avatarUrl: currentUser.avatarUrl
            });
            // Update local state is handled by real-time subscription usually, 
            // but we might need to refresh tournament details if participantCount is crucial
        } catch (error) {
            alert(error.message);
        } finally {
            setJoining(false);
        }
    };

    const isParticipant = tournament && participants.some(p => p.userId === currentUser?.id);
    const myRank = isParticipant ? participants.find(p => p.userId === currentUser?.id)?.rank : null;

    if (loading) return <div className="text-center py-12 text-white/50">Loading Tournaments...</div>;

    if (!tournament) return (
        <div className="text-center py-16 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <Trophy size={48} className="mx-auto text-white/20 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Active Tournaments</h3>
            <p className="text-white/50">Check back later for the next competition!</p>
        </div>
    );

    const timeLeft = () => {
        const end = new Date(tournament.endDate);
        const now = new Date();
        const diff = end - now;
        if (diff <= 0) return 'Ended';
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${days}d ${hours}h remaining`;
    };

    return (
        <div className="space-y-6">
            {/* Header / Hero */}
            <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-r from-red-900 to-orange-900 border border-orange-500/30">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-12 -translate-y-4">
                    <Trophy size={160} />
                </div>

                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-200 text-xs font-bold uppercase tracking-wider mb-4 border border-orange-500/30">
                        <Calendar size={12} />
                        Active Tournament
                    </div>

                    <h2 className="text-3xl md:text-4xl font-black text-white italic uppercase mb-2">
                        {tournament.title}
                    </h2>
                    <p className="text-orange-100/80 max-w-lg mb-6">
                        {tournament.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-orange-100/60 mb-8">
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-orange-400" />
                            {timeLeft()}
                        </div>
                        <div className="flex items-center gap-2">
                            <Target size={16} className="text-orange-400" />
                            {tournament.rules}
                        </div>
                    </div>

                    {!isParticipant ? (
                        <Button
                            onClick={handleJoin}
                            disabled={joining}
                            className="bg-white text-orange-900 hover:bg-orange-100 !py-3 !px-8 text-lg shadow-lg shadow-orange-900/50"
                        >
                            {joining ? 'Joining...' : 'Participate Now'}
                        </Button>
                    ) : (
                        <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 inline-block border border-orange-500/30">
                            <p className="text-xs text-orange-200 uppercase font-bold mb-1">Your Rank</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-white">#{myRank}</span>
                                <span className="text-sm text-white/50">of {participants.length}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Leaderboard Section */}
            <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Medal className="text-yellow-400" />
                    Live Standings
                </h3>

                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-xs text-white/40 uppercase">
                            <tr>
                                <th className="px-6 py-4 font-bold">Rank</th>
                                <th className="px-6 py-4 font-bold">Gladiator</th>
                                <th className="px-6 py-4 font-bold text-right">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {participants.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-8 text-center text-white/30">
                                        No participants yet. Be the first!
                                    </td>
                                </tr>
                            ) : (
                                participants.map((participant) => (
                                    <tr key={participant.userId} className={participant.userId === currentUser?.id ? 'bg-red-500/20' : ''}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 font-bold text-white/70">
                                                {participant.rank}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={participant.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.username}`}
                                                    className="w-8 h-8 rounded-full"
                                                    alt=""
                                                />
                                                <span className={`font-bold ${participant.userId === currentUser?.id ? 'text-red-300' : 'text-white'}`}>
                                                    {participant.username}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-yellow-400">
                                            {participant.score.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Tournaments;



