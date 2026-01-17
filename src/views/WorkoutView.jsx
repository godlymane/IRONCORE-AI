import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Play, Dumbbell, Trophy, Edit2, List, Calculator, X, Ghost, CheckCircle2, Circle, Timer, StopCircle } from 'lucide-react';
import { Card, Button } from '../components/UIComponents';
import { EXERCISE_DB } from '../utils/constants';
import { SFX } from '../utils/audio';

export const WorkoutView = ({ workouts, updateData, deleteEntry }) => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [sessionName, setSessionName] = useState("");
    const [sessionExercises, setSessionExercises] = useState([]);
    const [elapsed, setElapsed] = useState(0);
    const [showTools, setShowTools] = useState(false);
    
    // REST TIMER STATE
    const [restTimer, setRestTimer] = useState(0);
    const [isResting, setIsResting] = useState(false);
    const [defaultRest, setDefaultRest] = useState(90);

    // ... Helper functions ...
    const getGhostSet = (exerciseName, setIndex) => {
        const history = workouts.find(w => w.exercises && w.exercises.some(e => e.name === exerciseName));
        if (!history) return null;
        const ex = history.exercises.find(e => e.name === exerciseName);
        if (!ex || !ex.sets[setIndex]) return null;
        return ex.sets[setIndex];
    };

    const getPR = (exerciseName) => {
        let maxWeight = 0;
        workouts.forEach(w => {
            if (w.exercises) {
                w.exercises.forEach(ex => {
                    if (ex.name === exerciseName) {
                        ex.sets.forEach(s => {
                            const weight = parseFloat(s.w);
                            if (weight > maxWeight) maxWeight = weight;
                        });
                    }
                });
            }
        });
        return maxWeight;
    };

    // Main Workout Timer
    useEffect(() => {
        let interval;
        if (isSessionActive) interval = setInterval(() => setElapsed(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, [isSessionActive]);

    // Rest Timer Logic
    useEffect(() => {
        let interval;
        if (isResting && restTimer > 0) {
            interval = setInterval(() => setRestTimer(t => t - 1), 1000);
        } else if (isResting && restTimer === 0) {
            SFX.timerFinished();
            setIsResting(false);
        }
        return () => clearInterval(interval);
    }, [isResting, restTimer]);

    const formatTime = (s) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startSession = () => {
        setSessionName(`Workout #${workouts.length + 1}`);
        setSessionExercises([]);
        setElapsed(0);
        setIsSessionActive(true);
        SFX.click();
    };

    const addExercise = () => {
        const defaultEx = EXERCISE_DB[0].name;
        setSessionExercises([...sessionExercises, { 
            id: Date.now(), 
            name: defaultEx, 
            isCustom: false, 
            sets: [{ w: '', r: '', completed: false }], // Added 'completed'
            pr: getPR(defaultEx) 
        }]);
    };

    const updateExerciseName = (id, newName) => {
        setSessionExercises(prev => prev.map(ex => ex.id === id ? { ...ex, name: newName, pr: getPR(newName) } : ex));
    };

    const toggleCustomMode = (id) => {
        setSessionExercises(prev => prev.map(ex => ex.id === id ? { ...ex, isCustom: !ex.isCustom, name: ex.isCustom ? EXERCISE_DB[0].name : '' } : ex));
    };

    const updateSet = (exId, setIdx, field, val) => {
        setSessionExercises(prev => prev.map(ex => {
            if (ex.id !== exId) return ex;
            const newSets = [...ex.sets];
            newSets[setIdx] = { ...newSets[setIdx], [field]: val };
            return { ...ex, sets: newSets };
        }));
    };

    const toggleSetComplete = (exId, setIdx) => {
        setSessionExercises(prev => prev.map(ex => {
            if (ex.id !== exId) return ex;
            const newSets = [...ex.sets];
            const isNowComplete = !newSets[setIdx].completed;
            newSets[setIdx] = { ...newSets[setIdx], completed: isNowComplete };
            
            // Trigger Logic
            if (isNowComplete) {
                SFX.completeSet();
                // Start Rest Timer
                setRestTimer(defaultRest);
                setIsResting(true);
            }
            
            return { ...ex, sets: newSets };
        }));
    };

    const addSet = (exId) => {
        setSessionExercises(prev => prev.map(ex => {
            if (ex.id !== exId) return ex;
            return { ...ex, sets: [...ex.sets, { w: '', r: '', completed: false }] };
        }));
    };

    const finishSession = async () => {
        if (sessionExercises.length === 0) { setIsSessionActive(false); return; }
        await updateData('add', 'workouts', { name: sessionName, exercises: sessionExercises, duration: elapsed });
        setIsSessionActive(false);
        SFX.levelUp();
    };

    const cancelRest = () => {
        setIsResting(false);
        setRestTimer(0);
    };

    if (isSessionActive) {
        return (
            <div className="pb-24 animate-in slide-in-from-bottom-5 relative">
                {/* Sticky Header */}
                <div className="sticky top-0 bg-black/80 backdrop-blur-md z-20 py-4 border-b border-gray-800 mb-4 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] text-green-400 font-black uppercase tracking-widest animate-pulse">Live Session</p>
                        <input value={sessionName} onChange={e => setSessionName(e.target.value)} className="bg-transparent text-xl font-black text-white outline-none w-40" />
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowTools(true)} className="p-2 bg-gray-900 rounded-full text-indigo-400 border border-gray-800 hover:border-indigo-500"><Calculator size={18}/></button>
                        <div className="font-mono text-xl font-bold text-white tabular-nums">{formatTime(elapsed)}</div>
                    </div>
                </div>

                {/* Rest Timer Overlay */}
                {isResting && (
                    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 bg-gray-950 border border-indigo-500 rounded-full py-2 px-6 shadow-2xl shadow-indigo-500/20 flex items-center gap-4 animate-in slide-in-from-top-4">
                        <div className="flex items-center gap-2">
                            <Timer size={16} className="text-indigo-400 animate-pulse"/>
                            <span className="text-xl font-black text-white font-mono tabular-nums">{formatTime(restTimer)}</span>
                            <span className="text-[10px] text-gray-500 font-bold uppercase">Resting</span>
                        </div>
                        <div className="h-4 w-[1px] bg-gray-800"></div>
                        <div className="flex gap-2">
                            <button onClick={() => setRestTimer(t => t + 30)} className="text-[10px] bg-gray-800 px-2 py-1 rounded hover:bg-gray-700 text-white font-bold">+30s</button>
                            <button onClick={cancelRest} className="text-red-400 hover:text-red-300"><StopCircle size={18}/></button>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {sessionExercises.map((ex, i) => (
                        <div key={ex.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-xl transition-all hover:border-gray-700">
                            {/* Exercise Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col flex-grow mr-2">
                                    <div className="flex items-center gap-2">
                                        {ex.isCustom ? (
                                            <input value={ex.name} autoFocus placeholder="Exercise Name..." onChange={(e) => updateExerciseName(ex.id, e.target.value)} className="bg-gray-950 text-white font-bold text-lg outline-none w-full p-2 rounded border border-indigo-500/50" />
                                        ) : (
                                            <select value={ex.name} onChange={(e) => updateExerciseName(ex.id, e.target.value)} className="bg-transparent text-white font-bold text-lg outline-none w-full appearance-none">
                                                {EXERCISE_DB.map(e => <option key={e.name} value={e.name} className="bg-gray-900">{e.name}</option>)}
                                            </select>
                                        )}
                                        <button onClick={() => toggleCustomMode(ex.id)} className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white">{ex.isCustom ? <List size={14}/> : <Edit2 size={14}/>}</button>
                                    </div>
                                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1">PR: {ex.pr > 0 ? `${ex.pr}kg` : 'None'}</span>
                                </div>
                                <button onClick={() => setSessionExercises(sessionExercises.filter(e => e.id !== ex.id))} className="text-gray-500 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                            </div>

                            {/* Sets */}
                            <div className="space-y-2">
                                <div className="flex text-[10px] text-gray-500 uppercase font-bold px-2 mb-1">
                                    <span className="w-8 text-center">#</span>
                                    <span className="flex-1 text-center">Kg</span>
                                    <span className="flex-1 text-center">Reps</span>
                                    <span className="w-10 text-center">Done</span>
                                </div>
                                {ex.sets.map((set, sIdx) => {
                                    const isPR = parseFloat(set.w) > ex.pr && ex.pr > 0;
                                    const ghost = getGhostSet(ex.name, sIdx);
                                    return (
                                        <div key={sIdx} className={`relative transition-all duration-300 ${set.completed ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                                            <div className="flex gap-2 items-center relative z-10">
                                                <span className="w-8 text-gray-500 text-xs font-mono text-center">{sIdx + 1}</span>
                                                
                                                <input type="number" placeholder={ghost ? ghost.w : "-"} value={set.w} onChange={e => updateSet(ex.id, sIdx, 'w', e.target.value)} className={`flex-1 bg-gray-950 p-3 rounded-xl text-white text-center outline-none text-sm border focus:border-indigo-500 ${isPR ? 'border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'border-gray-800'} placeholder:text-gray-700`} />
                                                
                                                <input type="number" placeholder={ghost ? ghost.r : "-"} value={set.r} onChange={e => updateSet(ex.id, sIdx, 'r', e.target.value)} className="flex-1 bg-gray-950 p-3 rounded-xl text-white text-center outline-none text-sm border border-gray-800 focus:border-indigo-500 placeholder:text-gray-700" />
                                                
                                                <button onClick={() => toggleSetComplete(ex.id, sIdx)} className="w-10 flex justify-center items-center text-gray-500 hover:text-green-400 transition-colors">
                                                    {set.completed ? <CheckCircle2 className="text-green-500" size={24} /> : <Circle size={24} />}
                                                </button>

                                                {isPR && <Trophy size={14} className="absolute -right-2 -top-2 text-yellow-500 animate-bounce" />}
                                            </div>
                                        </div>
                                    );
                                })}
                                <button onClick={() => addSet(ex.id)} className="w-full py-3 bg-gray-800/50 border border-gray-800 rounded-xl text-xs font-bold text-gray-400 mt-2 hover:bg-gray-800 hover:text-white transition-colors">+ Add Set</button>
                            </div>
                        </div>
                    ))}
                    <button onClick={addExercise} className="w-full py-4 border-2 border-dashed border-gray-800 rounded-2xl text-gray-500 font-bold hover:border-indigo-500 hover:text-indigo-500 transition-all flex items-center justify-center gap-2"><Plus size={18}/> Add Exercise</button>
                </div>

                <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto z-40">
                    <div className="grid grid-cols-2 gap-3">
                        <Button onClick={() => setIsSessionActive(false)} variant="secondary" className="bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/30">Discard</Button>
                        <Button onClick={finishSession} variant="primary" className="bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/40">Finish Workout</Button>
                    </div>
                </div>
                {showTools && <IronToolsModal onClose={() => setShowTools(false)} />}
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 animate-in fade-in">
             <div className="flex justify-between items-center">
                 <div>
                    <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">My Lifts</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Training Log</p>
                 </div>
                 <div className="flex gap-2">
                     <button onClick={() => setShowTools(true)} className="p-3 bg-gray-900 rounded-xl text-indigo-400 border border-gray-800 hover:border-indigo-500"><Calculator size={20}/></button>
                     <Button onClick={startSession} className="px-6 shadow-indigo-500/20"><Play size={16} fill="currentColor" /> Start Session</Button>
                 </div>
             </div>
             
            <div className="space-y-3">
                {workouts.length === 0 ? (
                    <div className="text-center py-12 opacity-50">
                        <Dumbbell size={48} className="mx-auto mb-2 text-gray-600"/>
                        <p className="text-sm text-gray-400">No workouts logged yet.</p>
                    </div>
                ) : (
                    workouts.map(w => (
                        <Card key={w.id}>
                            <div className="flex justify-between items-start mb-2 border-b border-gray-800 pb-2">
                                <div>
                                    <h3 className="font-bold text-base text-white">{w.name}</h3>
                                    <p className="text-[10px] text-gray-500">{new Date(w.date).toDateString()} • {formatTime(w.duration || 0)}</p>
                                </div>
                                <button onClick={() => deleteEntry('workouts', w.id)} className="text-gray-600 hover:text-red-500"><Trash2 size={16} /></button>
                            </div>
                            <div className="space-y-1">
                                {w.exercises?.slice(0, 5).map((ex, i) => (
                                    <div key={i} className="flex justify-between text-xs text-gray-400 border-l-2 border-gray-800 pl-2 my-1">
                                        <span>{ex.sets.length} x {ex.name}</span>
                                        <span className="font-mono text-gray-500">{Math.max(...ex.sets.map(s=>parseFloat(s.w) || 0))}kg max</span>
                                    </div>
                                ))}
                                {w.exercises?.length > 5 && <p className="text-[10px] text-gray-600 italic">+{w.exercises.length - 5} more exercises</p>}
                            </div>
                        </Card>
                    ))
                )}
            </div>
            {showTools && <IronToolsModal onClose={() => setShowTools(false)} />}
        </div>
    );
};

const IronToolsModal = ({ onClose }) => {
    const [tab, setTab] = useState('plate'); 
    const [w, setW] = useState('');
    const [r, setR] = useState('');
    const [targetW, setTargetW] = useState('');

    const calculate1RM = () => Math.round(parseFloat(w || 0) * (1 + parseFloat(r || 0) / 30));
    
    // VISUAL PLATE CALCULATOR
    const calculatePlates = () => {
        const target = parseFloat(targetW);
        if (!target || target < 20) return [];
        let remaining = (target - 20) / 2;
        const plates = [];
        const types = [
            { w: 25, c: 'bg-red-600' }, { w: 20, c: 'bg-blue-600' }, 
            { w: 15, c: 'bg-yellow-500' }, { w: 10, c: 'bg-green-600' }, 
            { w: 5, c: 'bg-gray-100 text-black' }, { w: 2.5, c: 'bg-gray-800' }, 
            { w: 1.25, c: 'bg-gray-500' }
        ];
        
        types.forEach(p => {
            while (remaining >= p.w) {
                plates.push(p);
                remaining -= p.w;
            }
        });
        return plates;
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-950 border border-gray-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black italic text-white uppercase flex items-center gap-2"><Calculator className="text-indigo-500"/> Iron Tools</h3>
                    <button onClick={onClose}><X className="text-gray-500"/></button>
                </div>

                <div className="flex bg-gray-900 p-1 rounded-xl mb-6">
                    <button onClick={() => setTab('plate')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'plate' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>Plate Loader</button>
                    <button onClick={() => setTab('1rm')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === '1rm' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>1RM Calc</button>
                </div>

                {tab === '1rm' ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase">Weight (kg)</label><input type="number" value={w} onChange={e=>setW(e.target.value)} className="w-full bg-black border border-gray-800 p-3 rounded-xl text-white outline-none"/></div>
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase">Reps</label><input type="number" value={r} onChange={e=>setR(e.target.value)} className="w-full bg-black border border-gray-800 p-3 rounded-xl text-white outline-none"/></div>
                        </div>
                        <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-2xl text-center"><p className="text-xs font-bold text-indigo-400 uppercase">Estimated Max</p><p className="text-4xl font-black text-white">{calculate1RM()} <span className="text-lg text-gray-500">kg</span></p></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Target Weight (kg)</label>
                            <input type="number" value={targetW} onChange={e=>setTargetW(e.target.value)} className="w-full bg-black border border-gray-800 p-3 rounded-xl text-white outline-none text-center text-xl font-bold" placeholder="e.g. 100"/>
                        </div>
                        
                        {/* VISUAL BARBELL */}
                        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex items-center justify-center overflow-hidden">
                            <div className="relative flex items-center">
                                {/* Bar */}
                                <div className="w-64 h-4 bg-gray-600 rounded-full absolute left-0 right-0 mx-auto z-0"></div>
                                {/* Plates */}
                                <div className="flex items-center gap-1 z-10 relative">
                                    <div className="w-4 h-16 bg-gray-400 rounded-sm border-r-2 border-gray-500"></div> {/* Collar */}
                                    {calculatePlates().map((p, i) => (
                                        <div key={i} className={`w-3 ${p.c} rounded-sm border border-black/20 shadow-xl`} style={{height: `${40 + (p.w * 1.5)}px`}}></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap justify-center gap-2">
                             {calculatePlates().length > 0 ? calculatePlates().map((p, i) => (
                                 <span key={i} className={`text-[10px] font-bold px-2 py-1 rounded ${p.c.includes('text-black') ? 'bg-gray-200 text-black' : 'bg-gray-800 text-gray-300 border border-gray-700'}`}>{p.w}</span>
                             )) : <p className="text-xs text-gray-600">Enter weight 20kg</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};