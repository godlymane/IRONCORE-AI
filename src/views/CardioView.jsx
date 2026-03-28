import React, { useState } from 'react';
import { Lock, Gauge, Mountain, Flame, Check, Settings, Footprints } from 'lucide-react';
import { PulseHeartIcon, TreadmillIcon, WalkingIcon, CyclingIcon } from '../components/IronCoreIcons';
import { PremiumIcon } from '../components/PremiumIcon';
import { GlassCard } from '../components/UIComponents';
import { useStore } from '../hooks/useStore';
import { useFitnessData } from '../hooks/useFitnessData';

// Activity Card Component
const ActivityCard = ({ id, label, icon, active, onClick, color }) => (
    <button
        onClick={onClick}
        className={`flex-1 p-4 rounded-2xl transition-all duration-300 flex flex-col items-center gap-2 ${active ? 'scale-105' : 'hover:scale-102 opacity-60 hover:opacity-80'}`}
        style={{
            background: active
                ? `linear-gradient(145deg, rgba(220, 38, 38, 0.25) 0%, rgba(185, 28, 28, 0.15) 100%)`
                : 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
            border: active ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: active ? '0 8px 25px rgba(220, 38, 38, 0.25)' : 'none',
        }}
    >
        <div className={active ? 'text-red-400' : 'text-gray-500'}>{icon}</div>
        <span className={`text-[11px] font-bold uppercase tracking-wider ${active ? 'text-white' : 'text-gray-500'}`}>{label}</span>
    </button>
);

// Glass Input Component
const GlassInput = ({ label, value, onChange, placeholder, unit, icon, inputMode = "decimal" }) => (
    <div
        className="p-4 rounded-2xl transition-all"
        style={{
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
    >
        <label className="text-[11px] uppercase font-bold text-gray-500 block mb-2 flex items-center gap-1">
            {icon} {label}
        </label>
        <div className="flex items-center gap-2">
            <input
                type="number"
                inputMode={inputMode}
                enterKeyHint="done"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-transparent text-xl font-black text-white outline-none placeholder:text-gray-700"
            />
            {unit && <span className="text-xs text-gray-500 font-bold">{unit}</span>}
        </div>
    </div>
);
export const CardioView = () => {
    const { progress, profile, setActiveTab } = useStore();
    const { updateData } = useFitnessData();
    const [burn, setBurn] = useState(null);
    const [activity, setActivity] = useState("treadmill");

    // Form States
    const [tmSpeed, setTmSpeed] = useState(8);
    const [tmIncline, setTmIncline] = useState(1);
    const [tmDuration, setTmDuration] = useState(30);

    const [walkSteps, setWalkSteps] = useState(5000);
    const [walkIntensity, setWalkIntensity] = useState("moderate");

    const [cycDuration, setCycDuration] = useState(45);
    const [cycIntensity, setCycIntensity] = useState("moderate");

    // Robust Stats Fetching
    const weight = profile.weight || [...progress].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).find(p => p.weight)?.weight;
    const height = profile.height || profile.heightCm;

    // Locked State - Premium Version
    if (!weight || !height) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center text-center px-6 animate-in fade-in">
                {/* Animated background orb */}
                <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle at center, rgba(239, 68, 68, 0.3) 0%, transparent 50%)',
                    }}
                />

                <GlassCard className="!p-8 max-w-sm mx-auto">
                    <div
                        className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-6"
                        style={{
                            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            boxShadow: '0 8px 30px rgba(239, 68, 68, 0.2)',
                        }}
                    >
                        <Lock size={32} className="text-red-400" />
                    </div>

                    <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter mb-2">Pulse Locked</h2>
                    <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                        We need your biometrics to calculate accurate energy expenditure.
                    </p>

                    {/* Status Indicators */}
                    <div className="flex justify-center gap-4 mb-6">
                        <div
                            className="px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-bold"
                            style={{
                                background: weight ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                border: weight ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                                color: weight ? '#4ade80' : '#f87171',
                            }}
                        >
                            {weight ? <Check size={12} /> : <Lock size={12} />}
                            Weight
                        </div>
                        <div
                            className="px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-bold"
                            style={{
                                background: height ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                border: height ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                                color: height ? '#4ade80' : '#f87171',
                            }}
                        >
                            {height ? <Check size={12} /> : <Lock size={12} />}
                            Height
                        </div>
                    </div>

                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                        style={{
                            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
                            boxShadow: '0 10px 40px rgba(220, 38, 38, 0.4)',
                        }}
                    >
                        <Settings size={16} />
                        Open Goal Architect
                    </button>
                </GlassCard>
            </div>
        );
    }

    // Calculators
    const calculate = () => {
        let cals = 0;

        if (activity === 'treadmill') {
            const speedMmin = tmSpeed * 16.6667;
            const grade = tmIncline / 100;
            const vo2 = (0.2 * speedMmin) + (0.9 * speedMmin * grade) + 3.5;
            cals = (vo2 * weight / 200) * tmDuration;
        } else if (activity === 'walking') {
            let met = 2.5;
            if (walkIntensity === 'moderate') met = 3.5;
            if (walkIntensity === 'aggressive') met = 5.0;
            const approxMins = walkSteps / 100;
            cals = (met * 3.5 * weight / 200) * approxMins;
        } else if (activity === 'cycling') {
            let met = 6.0;
            if (cycIntensity === 'low') met = 4.0;
            if (cycIntensity === 'high') met = 8.5;
            if (cycIntensity === 'extreme') met = 12.0;
            cals = (met * 3.5 * weight / 200) * cycDuration;
        } else {
            // Default MET for unknown/general activity
            const met = 3.5;
            cals = (met * 3.5 * weight / 200) * 30; // assume 30 min default
        }

        // Ensure we always return a valid number
        setBurn(Math.round(cals) || 0);
    };

    const logSession = async () => {
        if (!burn) return;
        let details = "";
        if (activity === 'treadmill') details = `${tmSpeed}km/h @ ${tmIncline}% inc`;
        if (activity === 'walking') details = `${walkSteps} steps (${walkIntensity})`;
        if (activity === 'cycling') details = `${cycDuration}m (${cycIntensity})`;

        await updateData('add', 'burned', {
            activityType: activity.charAt(0).toUpperCase() + activity.slice(1),
            calories: burn,
            details: details,
            duration: activity === 'walking' ? Math.round(walkSteps / 100) : (activity === 'treadmill' ? tmDuration : cycDuration)
        });
        setBurn(null);
    };

    return (
        <div className="space-y-5 animate-in fade-in pb-4 relative">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div
                    className="p-2 rounded-2xl"
                    style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(249, 115, 22, 0.1) 100%)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                >
                    <PremiumIcon src={PulseHeartIcon} size="md" className="!w-6 !h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter italic text-white">Pulse Lab</h2>
                    <p className="text-[11px] text-gray-500 uppercase">Cardio Energy Tracking</p>
                </div>
            </div>

            {/* Activity Selector */}
            <div className="flex gap-3">
                <ActivityCard
                    id="treadmill"
                    label="Treadmill"
                    icon={<PremiumIcon src={TreadmillIcon} size="md" className="!w-8 !h-8" />}
                    active={activity === 'treadmill'}
                    onClick={() => { setActivity('treadmill'); setBurn(null); }}
                />
                <ActivityCard
                    id="walking"
                    label="Walking"
                    icon={<PremiumIcon src={WalkingIcon} size="md" className="!w-8 !h-8" />}
                    active={activity === 'walking'}
                    onClick={() => { setActivity('walking'); setBurn(null); }}
                />
                <ActivityCard
                    id="cycling"
                    label="Cycling"
                    icon={<PremiumIcon src={CyclingIcon} size="md" className="!w-8 !h-8" />}
                    active={activity === 'cycling'}
                    onClick={() => { setActivity('cycling'); setBurn(null); }}
                />
            </div>

            {/* Activity Form */}
            <GlassCard className="space-y-4">
                {activity === 'treadmill' && (
                    <div className="space-y-4 animate-in slide-in-from-right-4">
                        <div className="grid grid-cols-2 gap-3">
                            <GlassInput
                                label="Speed"
                                value={tmSpeed}
                                onChange={setTmSpeed}
                                placeholder="8"
                                unit="km/h"
                                icon={<Gauge size={10} />}
                            />
                            <GlassInput
                                label="Incline"
                                value={tmIncline}
                                onChange={setTmIncline}
                                placeholder="1"
                                unit="%"
                                icon={<Mountain size={10} />}
                            />
                        </div>
                        <GlassInput
                            label="Duration"
                            value={tmDuration}
                            onChange={setTmDuration}
                            placeholder="30"
                            unit="mins"
                            inputMode="numeric"
                        />
                    </div>
                )}

                {activity === 'walking' && (
                    <div className="space-y-4 animate-in slide-in-from-right-4">
                        <GlassInput
                            label="Total Steps"
                            value={walkSteps}
                            onChange={setWalkSteps}
                            placeholder="5000"
                            icon={<Footprints size={10} />}
                            inputMode="numeric"
                        />
                        <div>
                            <label className="text-[11px] uppercase font-bold text-gray-500 mb-2 block">Intensity</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['low', 'moderate', 'aggressive'].map(lvl => (
                                    <button
                                        key={lvl}
                                        onClick={() => setWalkIntensity(lvl)}
                                        className="p-3 rounded-xl text-[11px] uppercase font-bold transition-all"
                                        style={{
                                            background: walkIntensity === lvl
                                                ? 'linear-gradient(145deg, rgba(220, 38, 38, 0.3) 0%, rgba(220, 38, 38, 0.1) 100%)'
                                                : 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                            border: walkIntensity === lvl ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                                            color: walkIntensity === lvl ? '#dc2626' : '#6b7280',
                                        }}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activity === 'cycling' && (
                    <div className="space-y-4 animate-in slide-in-from-right-4">
                        <GlassInput
                            label="Duration"
                            value={cycDuration}
                            onChange={setCycDuration}
                            placeholder="45"
                            unit="mins"
                            inputMode="numeric"
                        />
                        <div>
                            <label className="text-[11px] uppercase font-bold text-gray-500 mb-2 block">Intensity</label>
                            <select
                                value={cycIntensity}
                                onChange={e => setCycIntensity(e.target.value)}
                                className="w-full p-4 rounded-2xl text-white font-bold outline-none"
                                style={{
                                    background: 'linear-gradient(145deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                }}
                            >
                                <option value="low" className="bg-gray-900">Casual (Leisure)</option>
                                <option value="moderate" className="bg-gray-900">Moderate (Commute)</option>
                                <option value="high" className="bg-gray-900">High (Spin Class)</option>
                                <option value="extreme" className="bg-gray-900">Extreme (Race)</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Result Section */}
                {burn === null ? (
                    <button
                        onClick={calculate}
                        className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-95"
                        style={{
                            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                        }}
                    >
                        Calculate Burn
                    </button>
                ) : (
                    <div
                        className="p-6 rounded-2xl text-center animate-in zoom-in-95"
                        style={{
                            background: 'linear-gradient(145deg, rgba(220, 38, 38, 0.15) 0%, rgba(185, 28, 28, 0.08) 100%)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            boxShadow: '0 10px 40px rgba(220, 38, 38, 0.2)',
                        }}
                    >
                        <p className="text-xs font-bold uppercase text-red-400 mb-1">Energy Output</p>
                        <p className="text-5xl font-black italic text-white mb-4">
                            {burn} <span className="text-lg text-gray-500 not-italic">kcal</span>
                        </p>
                        <button
                            onClick={logSession}
                            className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-95 mb-2"
                            style={{
                                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
                                boxShadow: '0 10px 30px rgba(220, 38, 38, 0.4)',
                            }}
                        >
                            Log Session
                        </button>
                        <button
                            onClick={() => setBurn(null)}
                            className="text-xs text-gray-500 hover:text-white transition-colors"
                        >
                            Recalculate
                        </button>
                    </div>
                )}
            </GlassCard>

            {/* Info Footer */}
            <div
                className="p-4 rounded-2xl"
                style={{
                    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
            >
                <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                    Calculations use Metabolic Equivalent (MET) formulas based on your weight of <span className="text-white font-bold">{weight}kg</span>.
                    <br />Treadmill logic accounts for gravity on incline.
                </p>
            </div>
        </div>
    );
};




