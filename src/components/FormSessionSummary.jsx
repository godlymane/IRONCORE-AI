import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingDown, TrendingUp, AlertTriangle, Zap, Brain } from 'lucide-react';
import { Button } from './UIComponents';
import { callGemini } from '../utils/helpers';

/**
 * Post-set session summary modal for Elite Form Coach
 *
 * Shows:
 * - Overall score + rep count
 * - Fatigue curve sparkline (SVG)
 * - Per-rep breakdown: score, tempo, ROM
 * - Injury flags
 * - "Get AI Analysis" button → Gemini tips (elite only)
 */

export function FormSessionSummary({ summary, isElite = false, onClose }) {
    const [aiTips, setAiTips] = useState(null);
    const [loadingAI, setLoadingAI] = useState(false);

    if (!summary || summary.totalReps === 0) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-white/10 text-center">
                    <p className="text-gray-400 text-sm">No reps recorded this set.</p>
                    <Button onClick={onClose} variant="secondary" className="mt-4">Close</Button>
                </div>
            </motion.div>
        );
    }

    const { exerciseName, totalReps, avgScore, bestRep, worstRep, tempo, rom, fatigueIndex, injuryFlags, scoreTrend, reps } = summary;

    const scoreColor = avgScore >= 80 ? 'text-green-400' : avgScore >= 60 ? 'text-yellow-400' : 'text-red-400';
    const fatigueColor = fatigueIndex > 50 ? 'text-red-400' : fatigueIndex > 25 ? 'text-yellow-400' : 'text-green-400';

    // Build sparkline path from score trend
    const sparklinePath = buildSparkline(scoreTrend, 200, 40);

    // Get AI analysis
    const getAIAnalysis = async () => {
        setLoadingAI(true);
        try {
            const prompt = `You are an elite strength coach. Analyze this form data and give exactly 3 specific, actionable tips. Be direct and concise (1 sentence each).

Exercise: ${exerciseName}
Total Reps: ${totalReps}
Average Score: ${avgScore}/100
Best Rep: #${bestRep?.number} (${bestRep?.score}/100)
Worst Rep: #${worstRep?.number} (${worstRep?.score}/100)
Avg Eccentric Tempo: ${tempo.avgEccentricMs}ms
Avg Concentric Tempo: ${tempo.avgConcentricMs}ms
ROM Range: ${rom.avgRange}°
Fatigue Index: ${fatigueIndex}%
Injury Flags: ${injuryFlags.length > 0 ? injuryFlags.join(', ') : 'none'}
Per-rep scores: ${scoreTrend.join(', ')}

Respond with JSON: {"tips": ["tip1", "tip2", "tip3"]}`;

            const result = await callGemini(prompt, 'You are a precision strength coach.', null, true);
            if (result?.tips) {
                setAiTips(result.tips);
            }
        } catch (err) {
            setAiTips(['Could not generate AI analysis. Try again later.']);
        }
        setLoadingAI(false);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }}
                className="bg-gray-900 rounded-t-3xl sm:rounded-2xl p-5 max-w-sm w-full border border-white/10 max-h-[85vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-white font-black text-lg">Set Complete</h2>
                        <p className="text-gray-500 text-xs">{exerciseName} — {totalReps} reps</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
                        <X size={16} />
                    </button>
                </div>

                {/* Score + Stats Row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                        <div className={`text-2xl font-black ${scoreColor}`}>{avgScore}</div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Avg Score</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                        <div className="text-2xl font-black text-white">{totalReps}</div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Reps</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                        <div className={`text-2xl font-black ${fatigueColor}`}>{fatigueIndex}%</div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Fatigue</div>
                    </div>
                </div>

                {/* Tempo */}
                <div className="flex gap-3 mb-4">
                    <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/5">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingDown size={12} className="text-blue-400" />
                            <span className="text-[10px] text-gray-500 uppercase font-bold">Eccentric</span>
                        </div>
                        <div className="text-white font-bold text-sm">{(tempo.avgEccentricMs / 1000).toFixed(1)}s</div>
                    </div>
                    <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/5">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp size={12} className="text-green-400" />
                            <span className="text-[10px] text-gray-500 uppercase font-bold">Concentric</span>
                        </div>
                        <div className="text-white font-bold text-sm">{(tempo.avgConcentricMs / 1000).toFixed(1)}s</div>
                    </div>
                    <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/5">
                        <div className="flex items-center gap-2 mb-1">
                            <Zap size={12} className="text-amber-400" />
                            <span className="text-[10px] text-gray-500 uppercase font-bold">ROM</span>
                        </div>
                        <div className="text-white font-bold text-sm">{rom.avgRange}°</div>
                    </div>
                </div>

                {/* Fatigue Sparkline */}
                {scoreTrend.length > 2 && (
                    <div className="mb-4">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Score Trend</p>
                        <svg viewBox="0 0 200 40" className="w-full h-10">
                            <defs>
                                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={avgScore >= 80 ? '#22c55e' : avgScore >= 60 ? '#eab308' : '#ef4444'} stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="transparent" />
                                </linearGradient>
                            </defs>
                            {sparklinePath.area && <path d={sparklinePath.area} fill="url(#sparkGrad)" />}
                            <path d={sparklinePath.line} fill="none" stroke={avgScore >= 80 ? '#22c55e' : avgScore >= 60 ? '#eab308' : '#ef4444'} strokeWidth="2" />
                        </svg>
                    </div>
                )}

                {/* Injury Flags */}
                {injuryFlags.length > 0 && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle size={14} className="text-red-400" />
                            <span className="text-xs text-red-400 font-bold">Injury Risk Detected</span>
                        </div>
                        <p className="text-[11px] text-red-400/80">
                            {injuryFlags.map(f => f.replace(/_/g, ' ')).join(', ')}
                        </p>
                    </div>
                )}

                {/* Per-rep breakdown (collapsible for > 5 reps) */}
                {isElite && reps.length > 0 && (
                    <div className="mb-4">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Per-Rep Breakdown</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                            {reps.map((rep, i) => (
                                <div key={i} className="flex items-center gap-2 text-[11px]">
                                    <span className="text-gray-500 w-6">#{rep.number}</span>
                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${
                                            rep.score >= 80 ? 'bg-green-500' : rep.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`} style={{ width: `${rep.score}%` }} />
                                    </div>
                                    <span className={`font-bold w-8 text-right ${
                                        rep.score >= 80 ? 'text-green-400' : rep.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                                    }`}>{rep.score}</span>
                                    <span className="text-gray-600 w-12 text-right">{(rep.totalMs / 1000).toFixed(1)}s</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* AI Analysis */}
                {isElite && (
                    <div className="mb-4">
                        {aiTips ? (
                            <div className="space-y-2">
                                <p className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
                                    <Brain size={12} /> AI Coach Tips
                                </p>
                                {aiTips.map((tip, i) => (
                                    <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/5">
                                        <p className="text-xs text-gray-300">{tip}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Button onClick={getAIAnalysis} variant="secondary" className="w-full" disabled={loadingAI}>
                                <Brain className="w-4 h-4 mr-2" />
                                {loadingAI ? 'Analyzing...' : 'Get AI Analysis'}
                            </Button>
                        )}
                    </div>
                )}

                {/* Close */}
                <Button onClick={onClose} variant="primary" className="w-full">Done</Button>
            </motion.div>
        </motion.div>
    );
}

/**
 * Build SVG sparkline path from scores array
 */
function buildSparkline(scores, width, height) {
    if (!scores || scores.length < 2) return { line: '', area: '' };

    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min || 1;
    const padding = 2;

    const points = scores.map((s, i) => ({
        x: (i / (scores.length - 1)) * width,
        y: padding + ((max - s) / range) * (height - padding * 2),
    }));

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = line + ` L ${width} ${height} L 0 ${height} Z`;

    return { line, area };
}

export default FormSessionSummary;
