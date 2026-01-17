import React, { useMemo, useState } from 'react';
import { 
  ComposedChart, Line, Bar, CartesianGrid, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { Trophy, Medal, Crown, Star, Lock, Activity, Zap, Grid, Flame, TrendingUp, Shield } from 'lucide-react';
import { getLevel } from '../utils/helpers';
import { LEVELS, EXERCISE_DB } from '../utils/constants';
import { BodyHeatmap } from '../components/BodyHeatmap';

const LEAGUES = [
    { name: 'Iron', min: 0, color: 'text-gray-400', border: 'border-gray-500', bg: 'bg-gray-500/10' },
    { name: 'Bronze', min: 1000, color: 'text-orange-700', border: 'border-orange-700', bg: 'bg-orange-700/10' },
    { name: 'Silver', min: 2500, color: 'text-slate-300', border: 'border-slate-300', bg: 'bg-slate-300/10' },
    { name: 'Gold', min: 5000, color: 'text-yellow-400', border: 'border-yellow-400', bg: 'bg-yellow-400/10' },
    { name: 'Platinum', min: 10000, color: 'text-cyan-400', border: 'border-cyan-400', bg: 'bg-cyan-400/10' },
    { name: 'Diamond', min: 25000, color: 'text-indigo-400', border: 'border-indigo-400', bg: 'bg-indigo-400/10' }
];

export const StatsView = ({ leaderboard, profile, progress, meals, workouts }) => {
  const currentXP = profile.xp || 0;
  const currentLeague = LEAGUES.slice().reverse().find(l => currentXP >= l.min) || LEAGUES[0];
  const nextLeague = LEAGUES.find(l => l.min > currentXP);
  const progressToNext = nextLeague 
    ? Math.min(((currentXP - currentLeague.min) / (nextLeague.min - currentLeague.min)) * 100, 100)
    : 100;

  const muscleIntensity = useMemo(() => {
      const stats = { 
          chest:0, lats:0, traps:0, lower_back:0, 
          quads:0, hamstrings:0, calves:0, glutes:0, 
          front_delts:0, side_delts:0, rear_delts:0, 
          biceps:0, triceps:0, forearms:0, abs:0, core:0 
      };
      
      workouts.forEach(w => {
          if (w.exercises) {
              w.exercises.forEach(ex => {
                  const dbEntry = EXERCISE_DB.find(e => e.name.toLowerCase() === ex.name.toLowerCase()) 
                               || EXERCISE_DB.find(e => ex.name.toLowerCase().includes(e.name.toLowerCase()));
                  
                  if (dbEntry) {
                      let hardSets = 0;
                      ex.sets.forEach(s => {
                          const rpe = parseFloat(s.rpe) || 7; 
                          hardSets += Math.max(rpe / 10, 0.5); 
                      });

                      if (stats[dbEntry.muscle] !== undefined) stats[dbEntry.muscle] += hardSets;
                      if (dbEntry.secondary) {
                          dbEntry.secondary.forEach(sec => {
                              if (stats[sec] !== undefined) stats[sec] += (hardSets * 0.5);
                          });
                      }
                  }
              });
          }
      });
      return stats;
  }, [workouts]);

  const totalHardSets = Object.values(muscleIntensity).reduce((a, b) => a + b, 0);

  const disciplineGrid = useMemo(() => {
      const days = [];
      const today = new Date();
      const dailyTarget = profile.dailyCalories || 2500; 
      
      for(let i=89; i>=0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          
          const hasWorkout = workouts.some(w => {
               const wDate = w.createdAt?.seconds ? new Date(w.createdAt.seconds*1000) : new Date(w.date);
               return wDate.toISOString().split('T')[0] === dateStr;
          });
          const dayMeals = meals.filter(m => m.date === dateStr);
          const dayCals = dayMeals.reduce((s, m) => s + (m.calories || 0), 0);
          const hasLoggedFood = dayMeals.length > 0;

          let score = 0;
          if (hasWorkout) {
              if (hasLoggedFood) {
                  score = (dayCals > (dailyTarget * 1.1)) ? 3 : 2; 
              } else score = 1;
          } else {
              if (hasLoggedFood) score = 1;
          }
          days.push({ date: dateStr, score });
      }
      return days;
  }, [workouts, meals, profile.dailyCalories]);

  const trendData = useMemo(() => {
      const sortedProgress = [...progress].sort((a,b) => new Date(a.date) - new Date(b.date));
      const dailyMap = {};
      disciplineGrid.forEach(d => {
          let height = 0;
          if (d.score === 2) height = 100;
          if (d.score === 3) height = 100; 
          if (d.score === 1) height = 50;
          dailyMap[d.date] = { date: d.date, val: height, type: d.score };
      });

      const chartDates = Object.keys(dailyMap).sort().slice(-14);
      const firstChartDate = new Date(chartDates[0]);
      let lastKnownWeight = sortedProgress.filter(p => new Date(p.date) < firstChartDate && p.weight).pop()?.weight || profile.weight || 0;

      return chartDates.map(dateStr => {
          const log = sortedProgress.find(p => p.date === dateStr && p.weight);
          if (log) lastKnownWeight = log.weight;
          return {
              date: new Date(dateStr).toLocaleDateString('en-US', {month:'short', day:'numeric'}),
              score: dailyMap[dateStr].val,
              type: dailyMap[dateStr].type,
              weight: lastKnownWeight > 0 ? lastKnownWeight : null
          };
      });
  }, [progress, disciplineGrid, profile]);

  const achievements = [
      { id: 'a1', title: 'First Blood', desc: 'Log 1st workout', icon: <Star size={14}/>, unlocked: (workouts?.length || 0) > 0, rarity: 'common' },
      { id: 'a2', title: 'Iron Addict', desc: '10 workouts total', icon: <Activity size={14}/>, unlocked: (workouts?.length || 0) >= 10, rarity: 'rare' },
      { id: 'a3', title: 'Savage', desc: '50 Hard Sets', icon: <Zap size={14}/>, unlocked: totalHardSets >= 50, rarity: 'rare' },
      { id: 'a4', title: 'Warlord', desc: 'Reach Level 5', icon: <Medal size={14}/>, unlocked: (profile.xp || 0) >= 5000, rarity: 'epic' },
      { id: 'a5', title: 'God Mode', desc: 'Reach 10,000 XP', icon: <Crown size={14}/>, unlocked: (profile.xp || 0) >= 10000, rarity: 'legendary' },
  ];

  const getRarityColor = (r) => {
      if(r === 'legendary') return 'border-yellow-500 bg-yellow-500/10 text-yellow-500';
      if(r === 'epic') return 'border-purple-500 bg-purple-500/10 text-purple-500';
      if(r === 'rare') return 'border-blue-500 bg-blue-500/10 text-blue-500';
      return 'border-gray-700 bg-gray-800 text-gray-400';
  }

  const archetypeData = useMemo(() => {
    return [
        { subject: 'Consistency', A: 80, fullMark: 100 },
        { subject: 'Intensity', A: 75, fullMark: 100 },
        { subject: 'Discipline', A: 90, fullMark: 100 },
        { subject: 'Frequency', A: 70, fullMark: 100 },
        { subject: 'Legacy', A: 60, fullMark: 100 },
    ];
  }, []);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
        <div className="flex items-center justify-between">
             <h2 className="text-2xl font-black uppercase tracking-tighter italic text-white">Flex Analytics</h2>
             <div className="px-3 py-1 bg-gray-900 rounded-full border border-gray-800 text-[10px] font-mono text-gray-400">INTENSITY OS</div>
        </div>
        
        {/* LEAGUE CARD */}
        <div className={`p-1 rounded-3xl border ${currentLeague.border} shadow-2xl relative overflow-hidden`}>
            <div className={`absolute inset-0 ${currentLeague.bg} opacity-50`}></div>
            <div className="p-6 text-center relative z-10">
                <div className="flex justify-center mb-2"><Shield size={48} className={currentLeague.color} fill="currentColor" fillOpacity={0.2}/></div>
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Current League</h2>
                <div className={`text-4xl font-black italic ${currentLeague.color} drop-shadow-md`}>{currentLeague.name}</div>
                <div className="mt-4 relative">
                    <div className="flex justify-between text-[9px] font-mono text-gray-400 uppercase mb-1"><span>{currentXP} XP</span><span>{nextLeague ? nextLeague.min : 'MAX'} XP</span></div>
                    <div className="w-full bg-gray-900 h-3 rounded-full overflow-hidden border border-gray-700"><div className={`h-full transition-all duration-1000 ${currentLeague.color.replace('text-', 'bg-')}`} style={{width: `${progressToNext}%`}}></div></div>
                </div>
            </div>
        </div>

        {/* LIFTER ARCHETYPE */}
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-3xl">
            <h3 className="text-xs font-black uppercase text-gray-500 flex items-center gap-2 mb-4"><Activity size={14} className="text-cyan-500"/> Lifter Archetype</h3>
            <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={archetypeData}>
                        <PolarGrid stroke="#374151" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false}/>
                        <Radar name="Stats" dataKey="A" stroke="#6366f1" strokeWidth={2} fill="#6366f1" fillOpacity={0.4} />
                        <Tooltip contentStyle={{backgroundColor: '#111827', border: 'none', borderRadius: '8px', fontSize: '12px'}} itemStyle={{color: '#fff'}} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* GRIND GRID */}
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-3xl">
             <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-black uppercase text-gray-500 flex items-center gap-2"><Grid size={14} className="text-green-500"/> Discipline Grid</h3>
                <div className="flex gap-2"><div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-[8px] text-gray-500">Perfect</span></div><div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-[8px] text-gray-500">Dirty</span></div></div>
             </div>
             <div className="flex flex-wrap gap-1 justify-center">
                 {disciplineGrid.map((day, i) => {
                     let color = 'bg-gray-800'; 
                     if (day.score === 1) color = 'bg-gray-700'; 
                     if (day.score === 2) color = 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.8)]'; 
                     if (day.score === 3) color = 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]'; 

                     return ( <div key={i} className={`w-2 h-2 rounded-sm ${color}`} title={day.date} /> );
                 })}
             </div>
        </div>

        {/* ANATOMY INTELLIGENCE */}
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-3xl relative overflow-hidden">
            <div className="flex justify-between items-start mb-2 relative z-10">
                <h3 className="text-xs font-black uppercase text-gray-500 flex items-center gap-2"><Flame size={14} className="text-red-500"/> Bio-Scan</h3>
                <div className="text-right"><p className="text-[10px] text-gray-500 uppercase font-bold">Hard Sets</p><p className="text-lg font-black text-white italic">{Math.round(totalHardSets)}</p></div>
            </div>
            <BodyHeatmap muscleScores={muscleIntensity} />
            <p className="text-[9px] text-center text-gray-600 mt-2 italic">Based on training intensity (RPE).</p>
        </div>

        {/* TRENDS CHART */}
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-3xl h-64">
            <div className="flex justify-between items-center mb-4"><h3 className="text-xs font-black uppercase text-gray-500 flex items-center gap-2"><TrendingUp size={14} className="text-indigo-500"/> Correlation</h3></div>
            <ResponsiveContainer width="100%" height="80%">
                <ComposedChart data={trendData}>
                     <defs><linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.5}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient></defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                     <XAxis dataKey="date" tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                     <YAxis yAxisId="left" orientation="left" stroke="#22c55e" hide/>
                     <YAxis yAxisId="right" orientation="right" stroke="#eab308" hide domain={['dataMin - 2', 'dataMax + 2']}/>
                     <Tooltip contentStyle={{backgroundColor: '#111827', border: 'none', borderRadius: '8px'}} itemStyle={{color: '#fff'}} />
                     <Bar yAxisId="left" dataKey="score" fill="url(#volGrad)" barSize={8} radius={[4,4,0,0]} />
                     <Line yAxisId="right" type="monotone" dataKey="weight" stroke="#eab308" strokeWidth={2} dot={false} />
                </ComposedChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-green-500"></div><span className="text-[9px] text-gray-500">Discipline</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div><span className="text-[9px] text-gray-500">Weight</span></div>
            </div>
        </div>

        {/* HALL OF FAME */}
        <div className="space-y-3">
             <h3 className="text-xs font-black uppercase text-gray-500 flex items-center gap-2 px-1"><Trophy size={14} className="text-yellow-500"/> Hall of Fame</h3>
             <div className="grid grid-cols-2 gap-3">
                 {achievements.map(a => (
                     <div key={a.id} className={`p-4 rounded-2xl border relative overflow-hidden group ${a.unlocked ? getRarityColor(a.rarity) : 'bg-gray-900 border-gray-800 opacity-60'}`}>
                         {a.unlocked && <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>}
                         <div className="flex justify-between items-start mb-2"><div className={`p-1.5 rounded-lg ${a.unlocked ? 'bg-black/20' : 'bg-gray-800'}`}>{a.unlocked ? a.icon : <Lock size={14}/>}</div>{a.unlocked && <span className="text-[8px] font-black uppercase tracking-widest opacity-70">{a.rarity}</span>}</div>
                         <p className="text-xs font-black uppercase">{a.title}</p>
                         <p className="text-[9px] opacity-80 leading-tight mt-1">{a.desc}</p>
                     </div>
                 ))}
             </div>
        </div>
    </div>
  );
};