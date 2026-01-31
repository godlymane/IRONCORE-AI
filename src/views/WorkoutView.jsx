import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Play, Dumbbell, Trophy, Edit2, List, Calculator, X, Ghost, CheckCircle2, Circle, Timer, StopCircle, Clock, Zap } from 'lucide-react';
import { Card, Button } from '../components/UIComponents';
import { EXERCISE_DB } from '../utils/constants';
import { SFX } from '../utils/audio';

// Glass Card Component
const GlassCard = ({ children, className = "", onClick }) => (
    <div
        onClick={onClick}
        className={`relative overflow-hidden rounded-3xl p-5 ${className}`}
        style={{
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
    >
        <div
            className="absolute top-0 left-0 right-0 h-[40%] rounded-t-3xl pointer-events-none"
            style={{
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, transparent 100%)',
            }}
        />
        <div className="relative z-10">{children}</div>
    </div>
);

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
            sets: [{ w: '', r: '', completed: false }],
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

            if (isNowComplete) {
                SFX.completeSet();
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
                <div
                    className="sticky top-0 z-20 py-4 mb-4 flex justify-between items-center"
                    style={{
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 80%, transparent 100%)',
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <p className="text-[10px] text-green-400 font-black uppercase tracking-widest">Live Session</p>
                        </div>
                        <input
                            value={sessionName}
                            onChange={e => setSessionName(e.target.value)}
                            className="bg-transparent text-xl font-black text-white outline-none w-44"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowTools(true)}
                            className="p-2.5 rounded-xl transition-all hover:scale-105"
                            style={{
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <Calculator size={18} className="text-red-400" />
                        </button>
                        <div
                            className="font-mono text-xl font-bold text-white tabular-nums px-4 py-2 rounded-xl"
                            style={{
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            {formatTime(elapsed)}
                        </div>
                    </div>
                </div>

                {/* Rest Timer Overlay - Glass Style */}
                {isResting && (
                    <div
                        className="fixed top-20 left-1/2 -translate-x-1/2 z-30 py-3 px-6 rounded-full flex items-center gap-4 animate-in slide-in-from-top-4"
                        style={{
                            background: 'linear-gradient(145deg, rgba(220, 38, 38, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            boxShadow: '0 20px 50px rgba(220, 38, 38, 0.3)',
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <Timer size={16} className="text-red-400 animate-pulse" />
                            <span className="text-xl font-black text-white font-mono tabular-nums">{formatTime(restTimer)}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">Rest</span>
                        </div>
                        <div className="h-4 w-[1px] bg-gray-700"></div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setRestTimer(t => t + 30)}
                                className="text-[10px] px-3 py-1.5 rounded-lg font-bold text-white transition-all hover:scale-105"
                                style={{
                                    background: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                                }}
                            >
                                +30s
                            </button>
                            <button onClick={cancelRest} className="text-red-400 hover:text-red-300 transition-colors">
                                <StopCircle size={18} />
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {sessionExercises.map((ex, i) => (
                        <GlassCard key={ex.id} className="!p-4">
                            {/* Exercise Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col flex-grow mr-2">
                                    <div className="flex items-center gap-2">
                                        {ex.isCustom ? (
                                            <input
                                                value={ex.name}
                                                autoFocus
                                                placeholder="Exercise Name..."
                                                onChange={(e) => updateExerciseName(ex.id, e.target.value)}
                                                className="bg-transparent text-white font-bold text-lg outline-none w-full p-2 rounded-xl"
                                                style={{
                                                    background: 'linear-gradient(145deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                }}
                                            />
                                        ) : (
                                            <select
                                                value={ex.name}
                                                onChange={(e) => updateExerciseName(ex.id, e.target.value)}
                                                className="bg-transparent text-white font-bold text-lg outline-none w-full appearance-none"
                                            >
                                                {EXERCISE_DB.map(e => <option key={e.name} value={e.name} className="bg-gray-900">{e.name}</option>)}
                                            </select>
                                        )}
                                        <button
                                            onClick={() => toggleCustomMode(ex.id)}
                                            className="p-2 rounded-xl text-gray-400 hover:text-white transition-colors"
                                            style={{
                                                background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                                            }}
                                        >
                                            {ex.isCustom ? <List size={14} /> : <Edit2 size={14} />}
                                        </button>
                                    </div>
                                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1 flex items-center gap-1">
                                        <Trophy size={10} className="text-yellow-500" />
                                        PR: {ex.pr > 0 ? `${ex.pr}kg` : 'None'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setSessionExercises(sessionExercises.filter(e => e.id !== ex.id))}
                                    className="text-gray-500 hover:text-red-400 p-2 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {/* Sets Table Header */}
                            <div className="flex text-[10px] text-gray-500 uppercase font-bold px-2 mb-2">
                                <span className="w-8 text-center">#</span>
                                <span className="flex-1 text-center">Kg</span>
                                <span className="flex-1 text-center">Reps</span>
                                <span className="w-12 text-center">Done</span>
                            </div>

                            {/* Sets */}
                            <div className="space-y-2">
                                {ex.sets.map((set, sIdx) => {
                                    const isPR = parseFloat(set.w) > ex.pr && ex.pr > 0;
                                    const ghost = getGhostSet(ex.name, sIdx);
                                    return (
                                        <div key={sIdx} className={`relative transition-all duration-300 ${set.completed ? 'opacity-50' : 'opacity-100'}`}>
                                            <div className="flex gap-2 items-center relative z-10">
                                                <span className="w-8 text-gray-500 text-xs font-mono text-center">{sIdx + 1}</span>

                                                <input
                                                    type="number"
                                                    placeholder={ghost ? ghost.w : "-"}
                                                    value={set.w}
                                                    onChange={e => updateSet(ex.id, sIdx, 'w', e.target.value)}
                                                    className="flex-1 p-3 rounded-xl text-white text-center outline-none text-sm placeholder:text-gray-600"
                                                    style={{
                                                        background: 'linear-gradient(145deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
                                                        border: isPR ? '1px solid rgba(234, 179, 8, 0.5)' : '1px solid rgba(255,255,255,0.08)',
                                                        boxShadow: isPR ? '0 0 20px rgba(234, 179, 8, 0.2)' : 'none',
                                                    }}
                                                />

                                                <input
                                                    type="number"
                                                    placeholder={ghost ? ghost.r : "-"}
                                                    value={set.r}
                                                    onChange={e => updateSet(ex.id, sIdx, 'r', e.target.value)}
                                                    className="flex-1 p-3 rounded-xl text-white text-center outline-none text-sm placeholder:text-gray-600"
                                                    style={{
                                                        background: 'linear-gradient(145deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                    }}
                                                />

                                                <button
                                                    onClick={() => toggleSetComplete(ex.id, sIdx)}
                                                    className="w-12 flex justify-center items-center transition-all"
                                                >
                                                    {set.completed ? (
                                                        <CheckCircle2 size={24} className="text-green-500" />
                                                    ) : (
                                                        <Circle size={24} className="text-gray-600 hover:text-green-400" />
                                                    )}
                                                </button>

                                                {isPR && <Trophy size={14} className="absolute -right-1 -top-1 text-yellow-500 animate-bounce" />}
                                            </div>
                                        </div>
                                    );
                                })}
                                <button
                                    onClick={() => addSet(ex.id)}
                                    className="w-full py-3 rounded-xl text-xs font-bold text-gray-400 mt-2 transition-all hover:text-white"
                                    style={{
                                        background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                                        border: '1px dashed rgba(255,255,255,0.1)',
                                    }}
                                >
                                    + Add Set
                                </button>
                            </div>
                        </GlassCard>
                    ))}

                    <button
                        onClick={addExercise}
                        className="w-full py-5 rounded-3xl text-gray-500 font-bold flex items-center justify-center gap-2 transition-all hover:text-red-400"
                        style={{
                            border: '2px dashed rgba(255,255,255,0.1)',
                        }}
                    >
                        <Plus size={18} /> Add Exercise
                    </button>
                </div>

                {/* Bottom Action Buttons */}
                <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto z-40">
                    <div className="grid grid-cols-2 gap-3">
                        <Button onClick={() => setIsSessionActive(false)} variant="danger" className="!py-4">
                            Discard
                        </Button>
                        <button
                            onClick={finishSession}
                            className="py-4 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-95"
                            style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(22, 163, 74, 0.9) 100%)',
                                boxShadow: '0 10px 30px rgba(34, 197, 94, 0.3)',
                            }}
                        >
                            Finish Workout
                        </button>
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
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Training Log</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowTools(true)}
                        className="p-3 rounded-xl transition-all hover:scale-105"
                        style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <Calculator size={20} className="text-red-400" />
                    </button>
                    <button
                        onClick={startSession}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95"
                        style={{
                            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
                            boxShadow: '0 10px 30px rgba(220, 38, 38, 0.3)',
                        }}
                    >
                        <Play size={16} fill="currentColor" /> Start Session
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {workouts.length === 0 ? (
                    <div
                        className="text-center py-16 rounded-3xl"
                        style={{
                            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                            border: '2px dashed rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <Dumbbell size={48} className="mx-auto mb-3 text-gray-600" />
                        <p className="text-sm text-gray-400 font-medium">No workouts logged yet</p>
                        <p className="text-xs text-gray-600 mt-1">Start a session to track your lifts</p>
                    </div>
                ) : (
                    workouts.map(w => (
                        <GlassCard key={w.id}>
                            <div className="flex justify-between items-start mb-3 border-b border-gray-800/50 pb-3">
                                <div>
                                    <h3 className="font-bold text-base text-white">{w.name}</h3>
                                    <p className="text-[10px] text-gray-500 flex items-center gap-2 mt-1">
                                        <Clock size={10} />
                                        {new Date(w.date).toDateString()} • {formatTime(w.duration || 0)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => deleteEntry('workouts', w.id)}
                                    className="text-gray-600 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="space-y-1.5">
                                {w.exercises?.slice(0, 5).map((ex, i) => (
                                    <div
                                        key={i}
                                        className="flex justify-between text-xs text-gray-400 pl-3 py-1"
                                        style={{
                                            borderLeft: '2px solid rgba(239, 68, 68, 0.3)',
                                        }}
                                    >
                                        <span>{ex.sets.length} × {ex.name}</span>
                                        <span className="font-mono text-gray-500">{Math.max(...ex.sets.map(s => parseFloat(s.w) || 0))}kg max</span>
                                    </div>
                                ))}
                                {w.exercises?.length > 5 && (
                                    <p className="text-[10px] text-gray-600 italic pl-3">+{w.exercises.length - 5} more exercises</p>
                                )}
                            </div>
                        </GlassCard>
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

    const calculatePlates = () => {
        const target = parseFloat(targetW);
        if (!target || target < 20) return [];
        let remaining = (target - 20) / 2;
        const plates = [];
        const types = [
            { w: 25, c: 'bg-red-600' }, { w: 20, c: 'bg-amber-600' },
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
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
            <div
                className="w-full max-w-sm rounded-3xl p-6 animate-in zoom-in-95"
                style={{
                    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
                    backdropFilter: 'blur(40px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
                }}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black italic text-white uppercase flex items-center gap-2">
                        <Calculator className="text-red-400" />
                        Iron Tools
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div
                    className="flex p-1 rounded-xl mb-6"
                    style={{
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                    }}
                >
                    <button
                        onClick={() => setTab('plate')}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${tab === 'plate' ? 'text-white' : 'text-gray-500'}`}
                        style={tab === 'plate' ? {
                            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.8) 0%, rgba(185, 28, 28, 0.8) 100%)',
                        } : {}}
                    >
                        Plate Loader
                    </button>
                    <button
                        onClick={() => setTab('1rm')}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${tab === '1rm' ? 'text-white' : 'text-gray-500'}`}
                        style={tab === '1rm' ? {
                            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.8) 0%, rgba(185, 28, 28, 0.8) 100%)',
                        } : {}}
                    >
                        1RM Calc
                    </button>
                </div>

                {tab === '1rm' ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Weight (kg)</label>
                                <input
                                    type="number"
                                    value={w}
                                    onChange={e => setW(e.target.value)}
                                    className="w-full p-3 rounded-xl text-white outline-none"
                                    style={{
                                        background: 'linear-gradient(145deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Reps</label>
                                <input
                                    type="number"
                                    value={r}
                                    onChange={e => setR(e.target.value)}
                                    className="w-full p-3 rounded-xl text-white outline-none"
                                    style={{
                                        background: 'linear-gradient(145deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                    }}
                                />
                            </div>
                        </div>
                        <div
                            className="p-5 rounded-2xl text-center"
                            style={{
                                background: 'linear-gradient(145deg, rgba(220, 38, 38, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                            }}
                        >
                            <p className="text-xs font-bold text-red-400 uppercase mb-1">Estimated Max</p>
                            <p className="text-4xl font-black text-white">{calculate1RM()} <span className="text-lg text-gray-500">kg</span></p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Target Weight (kg)</label>
                            <input
                                type="number"
                                value={targetW}
                                onChange={e => setTargetW(e.target.value)}
                                className="w-full p-4 rounded-xl text-white outline-none text-center text-xl font-bold"
                                style={{
                                    background: 'linear-gradient(145deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                }}
                                placeholder="e.g. 100"
                            />
                        </div>

                        {/* Visual Barbell */}
                        <div
                            className="p-6 rounded-2xl flex items-center justify-center overflow-hidden"
                            style={{
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}
                        >
                            <div className="relative flex items-center">
                                <div className="w-64 h-4 bg-gray-600 rounded-full absolute left-0 right-0 mx-auto z-0"></div>
                                <div className="flex items-center gap-1 z-10 relative">
                                    <div className="w-4 h-16 bg-gray-400 rounded-sm border-r-2 border-gray-500"></div>
                                    {calculatePlates().map((p, i) => (
                                        <div key={i} className={`w-3 ${p.c} rounded-sm border border-black/20 shadow-xl`} style={{ height: `${40 + (p.w * 1.5)}px` }}></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-2">
                            {calculatePlates().length > 0 ? calculatePlates().map((p, i) => (
                                <span
                                    key={i}
                                    className={`text-[10px] font-bold px-2 py-1 rounded ${p.c.includes('text-black') ? 'bg-gray-200 text-black' : ''}`}
                                    style={!p.c.includes('text-black') ? {
                                        background: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                                        color: '#9ca3af',
                                    } : {}}
                                >
                                    {p.w}
                                </span>
                            )) : <p className="text-xs text-gray-600">Enter weight ≥20kg</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};




