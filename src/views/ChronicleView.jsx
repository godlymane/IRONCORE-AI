import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    BarChart, Bar,
    Tooltip, ResponsiveContainer, XAxis, Cell
} from 'recharts';
import { Utensils, Dumbbell, Droplets, Flame, Trash2, Scale, Lock } from 'lucide-react';
import { Card } from '../components/UIComponents';
import { usePremium } from '../context/PremiumContext';
import { useStore } from '../hooks/useStore';

export const ChronicleView = ({ deleteEntry = () => {} }) => {
    const { meals, burned, workouts, progress, user, profile } = useStore();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const scrollRef = useRef(null);
    const { isPremium, requirePremium } = usePremium();
    const FREE_HISTORY_DAYS = 7;

    const getDayLabel = (dateStr) => {
        const d = new Date(dateStr);
        return {
            day: d.toLocaleDateString('en-US', { weekday: 'short' }),
            num: d.getDate()
        };
    };

    const today = useMemo(() => new Date(), []);

    const allDates = useMemo(() => {
        const dates = [];
        const startDate = user?.metadata?.creationTime ? new Date(Number(user.metadata.creationTime) || user.metadata.creationTime) : new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const current = new Date(startDate);
        current.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        while (current <= end) {
            dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }
        return dates;
    }, [user?.metadata?.creationTime, today]);

    // Free users: last 7 days only
    const freeWindowStart = useMemo(() => new Date(today.getTime() - FREE_HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0], [today]);
    const dates = isPremium ? allDates : allDates.filter(d => d >= freeWindowStart);
    const hasLockedHistory = !isPremium && allDates.length > dates.length;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
    }, []);

    const dayMeals = meals.filter(m => m.date === selectedDate);
    const dayWeightEntry = progress.find(p => p.date === selectedDate && p.weight);
    const dayWeight = dayWeightEntry ? dayWeightEntry.weight : "--";

    const dayBurned = burned.filter(b => b.date === selectedDate);
    const totalBurned = dayBurned.reduce((acc, b) => acc + (b.calories || 0), 0);

    const dayWorkouts = workouts.filter(w => {
        const d = w.createdAt?.seconds ? new Date(w.createdAt.seconds * 1000) : new Date(w.createdAt || w.date);
        return d.toISOString().split('T')[0] === selectedDate;
    });

    const totals = dayMeals.reduce((acc, m) => ({
        cals: acc.cals + (m.calories || 0),
        p: acc.p + (m.protein || 0),
        c: acc.c + (m.carbs || 0),
        f: acc.f + (m.fat || 0)
    }), { cals: 0, p: 0, c: 0, f: 0 });

    const waterIntake = dayMeals.filter(m => m.mealName === 'Water').reduce((sum, m) => sum + 250, 0);
    const netCals = totals.cals - totalBurned;
    const dailyTarget = profile?.dailyCalories || 2000;
    const dailyProtein = profile?.dailyProtein || 150;

    const timeline = [
        ...dayMeals.map(m => ({ ...m, type: 'meal', time: m.createdAt?.seconds || 0 })),
        ...dayWorkouts.map(w => ({ ...w, type: 'workout', time: w.createdAt?.seconds || 0 })),
        ...dayBurned.map(b => ({ ...b, type: 'cardio', time: b.createdAt?.seconds || 0 }))
    ].sort((a, b) => b.time - a.time);

    const macroGraphData = [
        { name: 'Protein', val: totals.p, color: '#dc2626' },
        { name: 'Carbs', val: totals.c, color: '#facc15' },
        { name: 'Fats', val: totals.f, color: '#f87171' }
    ];

    const [pendingDelete, setPendingDelete] = useState(null);

    const handleDelete = (item) => {
        setPendingDelete(item);
    };

    const confirmDelete = () => {
        if (!pendingDelete) return;
        let collection = '';
        if (pendingDelete.type === 'meal') collection = 'meals';
        else if (pendingDelete.type === 'workout') collection = 'workouts';
        else if (pendingDelete.type === 'cardio') collection = 'burned';
        if (collection && typeof deleteEntry === 'function') {
            deleteEntry(collection, pendingDelete.id);
        }
        setPendingDelete(null);
    };

    return (
        <div className="space-y-6 animate-in fade-in pb-4">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic text-white">Chronicle</h2>

            {/* Glass confirm dialog — replaces window.confirm */}
            {pendingDelete && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title" onKeyDown={(e) => e.key === 'Escape' && setPendingDelete(null)}>
                    <div className="w-full max-w-xs rounded-3xl p-6 space-y-4" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <p id="delete-confirm-title" className="text-white font-bold text-center">Delete this entry?</p>
                        <p className="text-gray-500 text-xs text-center">This can't be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setPendingDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-400 bg-white/5 border border-white/10">Cancel</button>
                            <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide scroll-smooth">
                {hasLockedHistory && (
                    <button
                        onClick={() => requirePremium('pro', 'workoutHistory')}
                        aria-label="Unlock full history with Pro"
                        className="flex-shrink-0 flex flex-col items-center justify-center w-14 h-20 rounded-2xl transition-all bg-yellow-500/10 border border-yellow-500/30 text-yellow-400"
                    >
                        <Lock size={14} />
                        <span className="text-[9px] font-bold mt-1">PRO</span>
                    </button>
                )}
                {dates.map(date => {
                    const { day, num } = getDayLabel(date);
                    const isSelected = selectedDate === date;
                    return (
                        <button key={date} onClick={() => setSelectedDate(date)} aria-label={`${day} ${num}, ${isSelected ? 'selected' : 'select this date'}`} aria-pressed={isSelected} className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-20 rounded-2xl transition-all ${isSelected ? 'bg-red-600 text-white shadow-lg shadow-red-900/50 scale-105' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>
                            <span className="text-[11px] font-bold uppercase">{day}</span><span className="text-xl font-black">{num}</span>
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900 border border-gray-800 p-3 rounded-2xl flex flex-col justify-center items-center"><p className="text-[11px] uppercase font-bold text-gray-500 mb-1">Cals / Target</p><p className="text-xl font-black italic text-white">{totals.cals} <span className="text-xs text-gray-600">/ {dailyTarget}</span></p></div>
                <div className="bg-gray-900 border border-gray-800 p-3 rounded-2xl flex flex-col justify-center items-center"><p className="text-[11px] uppercase font-bold text-gray-500 mb-1">Prot / Target</p><p className="text-xl font-black italic text-red-400">{totals.p} <span className="text-xs text-gray-600">/ {dailyProtein}</span></p></div>

                <div className="col-span-2 bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 p-4 rounded-2xl flex justify-between items-center relative overflow-hidden">
                    <div className="absolute right-0 top-0 bottom-0 w-32 bg-red-500/10 -skew-x-12 transform translate-x-10"></div>
                    <div><p className="text-[11px] uppercase font-bold text-gray-400 mb-1 flex items-center gap-1"><Scale size={12} /> Net Balance</p><p className="text-4xl font-black italic text-white">{netCals}</p></div>
                    <div className="text-right z-10"><p className="text-[11px] text-gray-400 font-mono mb-1">Calculation</p><p className="text-xs font-bold text-gray-300">{totals.cals} - {totalBurned}</p></div>
                </div>

                <div className="bg-gray-900 border border-gray-800 p-3 rounded-2xl flex flex-col justify-center items-center"><p className="text-[11px] uppercase font-bold text-gray-500 mb-1">Water</p><p className="text-2xl font-black italic text-amber-400">{waterIntake}</p><p className="text-[8px] text-gray-600 font-bold">ML</p></div>
                <div className="bg-gray-900 border border-gray-800 p-3 rounded-2xl flex flex-col justify-center items-center"><p className="text-[11px] uppercase font-bold text-gray-500 mb-1">Weigh-In</p><p className="text-2xl font-black italic text-white">{dayWeight}</p><p className="text-[8px] text-gray-600 font-bold">KG</p></div>
            </div>

            <Card className="h-64 flex flex-col" role="img" aria-label="Bar chart showing macro breakdown: protein, carbs, and fats"><p className="text-xs font-black uppercase text-gray-500 mb-4">Macro Analysis</p><ResponsiveContainer width="100%" height="100%"><BarChart data={macroGraphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #374151', color: 'white' }} /><Bar dataKey="val" radius={[6, 6, 0, 0]}>{macroGraphData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Bar></BarChart></ResponsiveContainer></Card>

            <div className="space-y-3"><h3 className="text-xs font-black uppercase text-gray-500 tracking-widest pl-2">Timeline</h3>{timeline.length === 0 ? (<p className="text-xs text-gray-600 pl-2 italic py-4 text-center">No records found for this date.</p>) : timeline.map((item, idx) => (<div key={idx} className="bg-gray-900 border border-gray-800 p-4 rounded-2xl flex items-center justify-between gap-4 group"><div className="flex items-center gap-4 flex-grow"><div className={`p-3 rounded-full ${item.type === 'meal' ? (item.mealName === 'Water' ? 'bg-amber-900/20 text-amber-400' : 'bg-red-900/20 text-red-400') : item.type === 'cardio' ? 'bg-orange-900/20 text-orange-400' : 'bg-green-900/20 text-green-400'}`}>{item.type === 'meal' ? (item.mealName === 'Water' ? <Droplets size={16} /> : <Utensils size={16} />) : item.type === 'cardio' ? <Flame size={16} /> : <Dumbbell size={16} />}</div><div><p className="text-sm font-bold text-white">{item.type === 'meal' ? item.mealName : item.type === 'cardio' ? item.activityType : item.name}</p><p className="text-[11px] text-gray-500 font-mono">{item.type === 'meal' ? (item.mealName === 'Water' ? '250ml' : `${item.calories} kcal • ${item.protein}P ${item.carbs}C ${item.fat}F`) : item.type === 'cardio' ? `${item.calories} kcal • ${item.details || ''}` : `Workout Session`}</p></div></div><div className="flex flex-col items-end gap-1"><span className="text-[11px] text-gray-600 font-mono">{new Date(item.time * 1000 || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><button onClick={() => handleDelete(item)} className="text-gray-600 hover:text-red-500 transition-colors p-1" aria-label="Delete entry"><Trash2 size={14} /></button></div></div>))}</div>
        </div>
    );
};



