import React from 'react';
import { Card } from '../components/UIComponents';
import { calculateBMI } from '../utils/helpers';
import { Lock, TrendingUp } from 'lucide-react';
import { PremiumIcon } from '../components/PremiumIcon';
import { ScaleIcon, RulerIcon, PulseHeartIcon, ProteinBoltIcon } from '../components/IronCoreIcons';

export const TrackView = ({ progress, profile }) => {
    const sortedProgress = [...progress].sort((a, b) => {
        const dateA = a.createdAt?.seconds || new Date(a.date).getTime();
        const dateB = b.createdAt?.seconds || new Date(b.date).getTime();
        return dateB - dateA;
    });

    const currentWeight = profile.weight || "--";
    const currentHeight = profile.height || profile.heightCm || "--";
    const currentFat = profile.bodyFat || "--";
    const targetWeight = profile.targetWeight || 0;
    const photoURL = profile.photoURL;

    // --- FFMI Calculation ---
    const calculateFFMI = () => {
        if (!currentWeight || !currentHeight || !currentFat || currentWeight === "--" || currentHeight === "--" || currentFat === "--") return "--";
        const weightKg = parseFloat(currentWeight);
        const heightM = parseFloat(currentHeight) / 100;
        const bodyFatDec = parseFloat(currentFat) / 100;
        const leanMass = weightKg * (1 - bodyFatDec);
        const ffmi = (leanMass / (heightM * heightM)) + (6.1 * (1.8 - heightM));
        return !isNaN(ffmi) ? ffmi.toFixed(1) : "--";
    };

    // Progress Calculation
    let goalPercent = 0;
    if (targetWeight && currentWeight !== "--") {
        const startWeight = 80;
        const totalDiff = Math.abs(startWeight - targetWeight);
        const currentDiff = Math.abs(currentWeight - targetWeight);
        // SAFETY CHECK: Avoid division by zero if startWeight == targetWeight
        if (totalDiff > 0) {
            goalPercent = Math.min(Math.max(100 - ((currentDiff / totalDiff) * 100), 0), 100);
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in pb-4">
            {/* HERO PROFILE HEADER */}
            <div className="flex items-center gap-4 bg-gray-900/50 p-4 rounded-3xl border border-gray-800">
                <div className="w-20 h-20 rounded-full border-2 border-red-500 p-1 flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-gray-800 overflow-hidden relative">
                        {photoURL ? (
                            <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No Pic</div>
                        )}
                    </div>
                </div>
                <div className="flex-grow">
                    <div className="flex justify-between items-start">
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">My Stats</h2>
                        <div className="bg-red-900/30 text-red-400 px-2 py-1 rounded text-[11px] font-bold border border-red-500/30">PRO</div>
                    </div>
                    <div className="flex gap-2 mt-2">
                        <span className="text-[11px] bg-black border border-gray-700 px-3 py-1 rounded-full text-gray-300 font-bold uppercase">{profile.gender || 'Athlete'}</span>
                        <span className="text-[11px] bg-black border border-gray-700 px-3 py-1 rounded-full text-gray-300 font-bold uppercase">{profile.age || '?'} YRS</span>
                    </div>
                </div>
            </div>

            <div className="bg-gray-900/50 border border-red-500/20 p-3 rounded-xl flex items-center gap-3 text-xs text-gray-400">
                <div className="bg-red-500/10 p-1.5 rounded-lg"><Lock size={12} className="text-red-400" /></div>
                <p>Stats are managed in <span className="text-red-400 font-bold">Goal Architect</span> (Home)</p>
            </div>

            {/* MAIN GOAL TRACKER */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-3xl p-4 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="text-xs font-bold uppercase text-gray-500 z-10 flex items-center gap-1">
                        <PremiumIcon src={ScaleIcon} size="sm" className="!w-4 !h-4" fallback={null} /> Weight
                    </div>
                    <div className="z-10 mt-2">
                        <span className="text-4xl font-black text-white italic tracking-tighter">{currentWeight}</span>
                        <span className="text-sm text-gray-600 font-bold">kg</span>
                    </div>
                    {targetWeight > 0 && (
                        <div className="mt-2 relative z-10">
                            <div className="flex justify-between items-end mb-1">
                                <p className="text-[11px] text-red-400 font-bold uppercase">Target: {targetWeight}kg</p>
                                <p className="text-[11px] text-gray-600">{Math.round(goalPercent)}%</p>
                            </div>
                            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-red-500 h-full rounded-full transition-all duration-1000" style={{ width: `${goalPercent}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex-1 flex flex-col justify-center relative overflow-hidden">
                        <div className="text-[11px] font-bold uppercase text-gray-500 flex items-center gap-1 relative z-10">
                            <PremiumIcon src={RulerIcon} size="sm" className="!w-4 !h-4" fallback={null} /> Height
                        </div>
                        <p className="text-xl font-black text-white relative z-10">{currentHeight} <span className="text-[11px] text-gray-500">cm</span></p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex-1 flex flex-col justify-center relative overflow-hidden">
                        <div className="text-[11px] font-bold uppercase text-gray-500 flex items-center gap-1 relative z-10">
                            <PremiumIcon src={PulseHeartIcon} size="sm" className="!w-4 !h-4" fallback={null} /> Body Fat
                        </div>
                        <p className="text-xl font-black text-cyan-400 relative z-10">{currentFat}<span className="text-[11px] text-gray-500">%</span></p>
                    </div>
                </div>
            </div>

            {/* ADVANCED METRICS (BMI & FFMI) */}
            {currentWeight !== "--" && currentHeight !== "--" && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800">
                        <span className="text-[11px] text-gray-500 font-bold uppercase block mb-1">BMI Score</span>
                        <span className="font-mono text-xl font-black text-white">{calculateBMI(currentWeight, currentHeight)}</span>
                        <p className="text-[11px] text-gray-500 uppercase mt-1 opacity-70">General Health</p>
                    </div>
                    <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800 relative overflow-hidden">
                        <div className="absolute right-0 top-0 p-2 opacity-10">
                            <PremiumIcon src={ProteinBoltIcon} size="lg" className="!w-16 !h-16" fallback={null} />
                        </div>
                        <span className="text-[11px] text-gray-500 font-bold uppercase block mb-1">FFMI Score</span>
                        <span className="font-mono text-xl font-black text-yellow-400">{calculateFFMI()}</span>
                        <p className="text-[11px] text-gray-500 uppercase mt-1 opacity-70">Muscle Potential</p>
                    </div>
                </div>
            )}

            {/* HISTORY LIST */}
            <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><TrendingUp size={14} /> Weight Log</h3>
                {sortedProgress.length === 0 ? <p className="text-xs text-gray-600 italic text-center py-4">No history recorded yet.</p> : sortedProgress.slice(0, 5).map((p, i) => (
                    p.weight ? (
                        <div key={i} className="flex items-center justify-between py-3 px-4 bg-gray-900 rounded-2xl border border-gray-800/50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-gray-400 font-bold text-[11px] border border-gray-800">
                                    {new Date(p.date).getDate()}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white">Weigh In</p>
                                    <p className="text-[11px] text-gray-500">{new Date(p.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</p>
                                </div>
                            </div>
                            <span className="text-sm font-mono font-black text-white">{p.weight} kg</span>
                        </div>
                    ) : null
                ))}
            </div>
        </div>
    );
};



