import React, { useState } from 'react';
import { Lock, HeartPulse, Gauge, Footprints, Mountain } from 'lucide-react';
import { Card, Button } from '../components/UIComponents';

export const CardioView = ({ progress, profile, updateData, setActiveTab }) => {
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

    // --- ROBUST STATS FETCHING ---
    // 1. Try Profile (Goal Architect) first - it's the most up-to-date
    // 2. Fallback to Progress History
    // 3. Handle key variations (height vs heightCm)
    const weight = profile.weight || progress.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).find(p => p.weight)?.weight;
    const height = profile.height || profile.heightCm;

    // --- LOCKED STATE ---
    if (!weight || !height) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center text-center px-6 animate-in fade-in">
                <div className="bg-gray-900 p-8 rounded-full border border-gray-800 shadow-2xl mb-6">
                    <Lock size={48} className="text-gray-500"/>
                </div>
                <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter mb-2">Pulse Locked</h2>
                <p className="text-sm text-gray-500 mb-6 max-w-xs">
                    We need your weight to calculate energy expenditure physics.
                </p>
                <div className="flex gap-2 text-xs text-gray-600 mb-6">
                    <span className={weight ? "text-green-500" : "text-red-500"}>Weight: {weight ? 'OK' : 'Missing'}</span>
                    <span>•</span>
                    <span className={height ? "text-green-500" : "text-red-500"}>Height: {height ? 'OK' : 'Missing'}</span>
                </div>
                <Button onClick={() => setActiveTab('dashboard')} className="w-full max-w-xs">Go to Dashboard Setup</Button>
            </div>
        );
    }

    // --- CALCULATORS ---
    const calculate = () => {
        let cals = 0;

        if (activity === 'treadmill') {
            // ACSM Running Formula
            const speedMmin = tmSpeed * 16.6667;
            const grade = tmIncline / 100;
            const vo2 = (0.2 * speedMmin) + (0.9 * speedMmin * grade) + 3.5;
            cals = (vo2 * weight / 200) * tmDuration;
        } 
        else if (activity === 'walking') {
            let met = 2.5; 
            if (walkIntensity === 'moderate') met = 3.5;
            if (walkIntensity === 'aggressive') met = 5.0; 
            const approxMins = walkSteps / 100; 
            cals = (met * 3.5 * weight / 200) * approxMins;
        }
        else if (activity === 'cycling') {
            let met = 6.0; 
            if (cycIntensity === 'low') met = 4.0;
            if (cycIntensity === 'high') met = 8.5; 
            if (cycIntensity === 'extreme') met = 12.0; 
            cals = (met * 3.5 * weight / 200) * cycDuration;
        }

        setBurn(Math.round(cals));
    };

    const logSession = async () => {
        if(!burn) return;
        let details = "";
        if(activity === 'treadmill') details = `${tmSpeed}km/h @ ${tmIncline}% inc`;
        if(activity === 'walking') details = `${walkSteps} steps (${walkIntensity})`;
        if(activity === 'cycling') details = `${cycDuration}m (${cycIntensity})`;
        
        // FIX: Changed collection from 'calories' to 'burned' to match useFitnessData listener
        await updateData('add', 'burned', { 
            activityType: activity.charAt(0).toUpperCase() + activity.slice(1), 
            calories: burn,
            details: details,
            duration: activity === 'walking' ? Math.round(walkSteps/100) : (activity === 'treadmill' ? tmDuration : cycDuration)
        });
        setBurn(null);
    };

    return (
        <div className="space-y-6 animate-in fade-in pb-20">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic text-white flex items-center gap-2">
                <HeartPulse className="text-red-500"/> Pulse Lab
            </h2>
            
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {['treadmill', 'walking', 'cycling'].map(type => (
                    <button 
                        key={type} 
                        onClick={() => { setActivity(type); setBurn(null); }}
                        className={`flex-shrink-0 px-4 py-3 rounded-xl border text-xs font-bold transition-all uppercase tracking-wider ${activity === type ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-500'}`}
                    >
                        {type}
                    </button>
                ))}
            </div>

            <Card className="space-y-6">
                
                {activity === 'treadmill' && (
                    <div className="space-y-4 animate-in slide-in-from-right-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1"><Gauge size={10}/> Speed (km/h)</label>
                                <input type="number" value={tmSpeed} onChange={e=>setTmSpeed(e.target.value)} className="w-full bg-gray-950 p-3 rounded-xl text-white font-bold outline-none border border-gray-800 focus:border-indigo-500"/>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1"><Mountain size={10}/> Incline (%)</label>
                                <input type="number" value={tmIncline} onChange={e=>setTmIncline(e.target.value)} className="w-full bg-gray-950 p-3 rounded-xl text-white font-bold outline-none border border-gray-800 focus:border-indigo-500"/>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1">Duration (Mins)</label>
                            <input type="number" value={tmDuration} onChange={e=>setTmDuration(e.target.value)} className="w-full bg-gray-950 p-3 rounded-xl text-white font-bold outline-none border border-gray-800 focus:border-indigo-500"/>
                        </div>
                    </div>
                )}

                {activity === 'walking' && (
                    <div className="space-y-4 animate-in slide-in-from-right-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1"><Footprints size={10}/> Total Steps</label>
                            <input type="number" value={walkSteps} onChange={e=>setWalkSteps(e.target.value)} className="w-full bg-gray-950 p-3 rounded-xl text-white font-bold outline-none border border-gray-800 focus:border-indigo-500"/>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1">Intensity</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['low', 'moderate', 'aggressive'].map(lvl => (
                                    <button key={lvl} onClick={()=>setWalkIntensity(lvl)} className={`p-2 rounded-lg text-[10px] uppercase font-bold border ${walkIntensity === lvl ? 'bg-indigo-900/50 border-indigo-500 text-indigo-400' : 'bg-gray-900 border-gray-800 text-gray-600'}`}>
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activity === 'cycling' && (
                    <div className="space-y-4 animate-in slide-in-from-right-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1">Duration (Mins)</label>
                            <input type="number" value={cycDuration} onChange={e=>setCycDuration(e.target.value)} className="w-full bg-gray-950 p-3 rounded-xl text-white font-bold outline-none border border-gray-800 focus:border-indigo-500"/>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1">Intensity</label>
                            <select value={cycIntensity} onChange={e=>setCycIntensity(e.target.value)} className="w-full bg-gray-950 p-3 rounded-xl text-white font-bold outline-none border border-gray-800">
                                <option value="low">Casual (Leisure)</option>
                                <option value="moderate">Moderate (Commute)</option>
                                <option value="high">High (Spin Class)</option>
                                <option value="extreme">Extreme (Race)</option>
                            </select>
                        </div>
                    </div>
                )}

                {burn === null ? (
                     <Button onClick={calculate} variant="secondary" className="w-full">Calculate Burn</Button>
                ) : (
                    <div className="bg-gray-950 border border-indigo-500/30 p-6 rounded-2xl text-center animate-in zoom-in-95">
                        <p className="text-xs font-bold uppercase text-indigo-500 mb-1">Energy Output</p>
                        <p className="text-4xl font-black italic text-white mb-4">{burn} <span className="text-sm text-gray-600 not-italic">kcal</span></p>
                        <Button onClick={logSession} variant="primary" className="w-full bg-indigo-600 hover:bg-indigo-500">Log Session</Button>
                        <button onClick={()=>setBurn(null)} className="mt-3 text-xs text-gray-500 hover:text-white">Recalculate</button>
                    </div>
                )}
            </Card>

            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                    Calculations use Metabolic Equivalent (MET) formulas based on your weight of <span className="text-white font-bold">{weight}kg</span>.
                    <br/>Treadmill logic accounts for gravity on incline.
                </p>
            </div>
        </div>
    );
};