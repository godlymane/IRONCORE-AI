import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, Search, Plus, Droplets, Zap, Settings, Target, 
  X, Check, Scroll, Sword, Camera, Upload, Pill, ChevronRight, ChevronLeft,
  AlertCircle, ScanLine, AlertTriangle, ShoppingBag, Snowflake, ArrowUpCircle, 
  ChefHat, Utensils
} from 'lucide-react';
import { Card, MacroBadge, Button, useToast, Skeleton } from '../components/UIComponents';
import { callGemini, cleanAIResponse } from '../utils/helpers';
import { SFX } from '../utils/audio';

export const DashboardView = ({ 
  meals, burned, workouts, updateData, deleteEntry, 
  profile, uploadProfilePic, user, 
  completeDailyDrop, buyItem, isStorageReady 
}) => {
  const { addToast } = useToast(); // Use Toast Hook
  const [mealText, setMealText] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [streak, setStreak] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShop, setShowShop] = useState(false); 
  const [manualMeal, setManualMeal] = useState({ name: '', cals: '', p: '', c: '', f: '' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [chefSuggestion, setChefSuggestion] = useState(null);
  const [chefLoading, setChefLoading] = useState(false);
  const [archStep, setArchStep] = useState(1); 
  
  const fileInputRef = useRef(null);
  const foodInputRef = useRef(null); 
  
  const [waterIntake, setWaterIntake] = useState(0); 
  const WATER_GOAL = 3000; 
  const DEFAULT_STACK = ['Creatine', 'Pre-Workout', 'Whey Protein', 'Multivitamin'];
  const [stackConfig, setStackConfig] = useState(profile?.stackConfig || DEFAULT_STACK);
  const [newSupp, setNewSupp] = useState("");
  const [supps, setSupps] = useState({});

  const userPhoto = profile?.photoURL || user?.photoURL;
  const xp = profile?.xp || 0;

  // Calculate Data
  const today = new Date().toISOString().split('T')[0];
  const dropCompleted = profile?.dailyDrops?.[today];
  const challenges = [{ t: "50 Pushups", xp: 300 }, { t: "30 Min Run", xp: 400 }, { t: "100 Air Squats", xp: 350 }, { t: "No Sugar Today", xp: 500 }, { t: "2min Plank", xp: 250 }];
  const dailyDrop = challenges[new Date().getDate() % challenges.length];

  const todaysMeals = meals.filter(m => m.date === today);
  const todaysBurned = burned.filter(b => b.date === today);
  const todaysWorkouts = workouts.filter(w => { 
      const d = w.createdAt?.seconds ? new Date(w.createdAt.seconds * 1000) : new Date(w.createdAt || w.date); 
      return d.toISOString().split('T')[0] === today; 
  });
  
  const calsIn = todaysMeals.reduce((s, m) => s + (m.calories || 0), 0);
  const calsOut = todaysBurned.reduce((s, b) => s + (b.calories || 0), 0);
  const netCals = calsIn - calsOut;
  const displayNetCals = Math.max(0, netCals);
  const macros = todaysMeals.reduce((acc, m) => ({ p: acc.p + (m.protein || 0), c: acc.c + (m.carbs || 0), f: acc.f + (m.fat || 0) }), { p: 0, c: 0, f: 0 });

  const dailyTarget = profile?.dailyCalories || 2000; 
  const dailyProteinTarget = profile?.dailyProtein || 150;

  useEffect(() => { const loggedWater = todaysMeals.filter(m => m.mealName === 'Water').reduce((sum, m) => sum + 250, 0); setWaterIntake(loggedWater); if (profile?.supps && profile.supps[today]) { setSupps(profile.supps[today]); } else { setSupps({}); } }, [meals, profile, today]);
  useEffect(() => { const dates = [...new Set(meals.map(m => m.date))].sort(); let currentStreak = 0; if (dates.includes(today)) currentStreak = 1; setStreak(currentStreak); }, [meals]);

  const handleDropComplete = () => {
      if (completeDailyDrop) { 
          completeDailyDrop(dailyDrop.xp); 
          addToast(`Boom! ${dailyDrop.xp} XP Claimed!`, 'success');
      }
  };

  const handleBuy = async (item, cost) => {
      if (confirm(`Buy ${item} for ${cost} XP?`)) { 
          const success = await buyItem(item, cost); 
          if (success) addToast("Purchase Successful!", "success");
          else addToast("Not enough XP", "error");
      }
  };

  const toggleSupp = async (item) => { 
      const newSupps = { ...supps, [item]: !supps[item] }; 
      setSupps(newSupps); 
      if(!supps[item]) SFX?.click();
      await updateData('add', 'profile', { supps: { ...(profile?.supps || {}), [today]: newSupps } }); 
  };

  const spotMacros = async () => { 
      if(!mealText) return; 
      setAiStatus("Thinking..."); 
      try { 
          const prompt = `Return JSON: { "mealName": "string", "calories": number, "protein": number, "carbs": number, "fat": number } for "${mealText}"`; 
          const res = await callGemini(prompt, "Nutrition API. JSON Only.", null, true); 
          const result = cleanAIResponse(res); 
          if(result && result.mealName) { 
              await updateData('add', 'meals', result); 
              setMealText(""); 
              setAiStatus("");
              addToast(`Logged: ${result.mealName}`, 'success');
          } else { 
              setAiStatus("Failed"); 
              setShowManual(true); 
          } 
      } catch (e) { 
          setAiStatus("Net Error"); 
          setShowManual(true); 
      } 
  };

  // --- RENDERING ---
  return (
    <div className="space-y-6 animate-in fade-in pb-20 relative">
      <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSettings(true)} className="relative group">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500/50 shadow-lg transition-transform active:scale-95">
                {uploadingPhoto ? (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
                    </div>
                ) : userPhoto ? (
                  <img src={userPhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-400">
                    <Settings size={20}/>
                  </div>
                )}
              </div>
            </button>
            <div>
              <h1 className="text-xl font-black italic text-white uppercase tracking-tighter">Dashboard</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                 {profile?.goal ? `${profile.goal} Phase` : <Skeleton className="w-20 h-3"/>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <button onClick={() => setShowShop(true)} className="bg-gray-900 border border-yellow-500/30 text-yellow-500 p-2 rounded-xl flex items-center gap-1 hover:bg-gray-800 transition-colors">
                  <ShoppingBag size={18}/> <span className="text-xs font-bold">{xp}</span>
              </button>
              <div className="flex items-center gap-2 bg-gray-900 border border-orange-500/30 px-3 py-1.5 rounded-full">
                <Flame size={16} className="text-orange-500 fill-orange-500 animate-pulse" />
                <span className="text-sm font-black text-orange-400">{streak}</span>
              </div>
          </div>
      </div>

      {/* DAILY DROP CARD */}
      <div className="bg-gradient-to-r from-violet-900/50 to-fuchsia-900/50 border border-violet-500/30 p-4 rounded-3xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-white/5 -skew-x-12 transform translate-x-8 group-hover:translate-x-4 transition-transform"></div>
          <div className="flex justify-between items-center relative z-10">
              <div>
                  <div className="flex items-center gap-2 mb-1">
                      <span className="bg-violet-500 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">Daily Drop</span>
                      <span className="text-violet-300 text-[10px] uppercase font-bold tracking-widest">Resets in 24h</span>
                  </div>
                  <h3 className="text-2xl font-black italic text-white uppercase">{dailyDrop.t}</h3>
                  <p className="text-xs text-gray-300">Complete for <span className="text-yellow-400 font-bold">+{dailyDrop.xp} XP</span></p>
              </div>
              {dropCompleted ? (
                  <div className="bg-green-500 text-black px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1"><Check size={16}/> Done</div>
              ) : (
                  <Button onClick={handleDropComplete} className="bg-white text-violet-900 px-5 py-3 shadow-lg border-0">Complete</Button>
              )}
          </div>
      </div>

      {/* NET CALORIES SECTION */}
      <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-2xl cursor-pointer hover:border-indigo-500/30 transition-colors space-y-4" onClick={() => setShowSettings(true)}>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase flex items-center gap-1 mb-1"><ScanLine size={12}/> Net Calories</p>
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">{displayNetCals}</span>
                <span className="text-xs text-gray-500 font-medium">of {dailyTarget} kcal</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Remaining</p>
            <span className={`text-xl font-mono font-black ${dailyTarget - netCals < 0 ? 'text-red-400' : 'text-indigo-400'}`}>{Math.floor(dailyTarget - netCals)}</span>
          </div>
        </div>
        
        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
          <div className={`h-full ${dailyTarget - netCals < 0 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{width: `${Math.min((Math.max(0, netCals) / dailyTarget) * 100, 100)}%`}}></div>
        </div>

        {/* PROTEIN SECTION */}
        <div className="pt-2 border-t border-gray-800">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Protein</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">{macros.p}g</span>
                    <span className="text-xs text-gray-500 font-medium">of {dailyProteinTarget}g</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Left</p>
                <span className={`text-lg font-mono font-black ${dailyProteinTarget - macros.p < 0 ? 'text-green-400' : 'text-blue-400'}`}>{Math.max(0, dailyProteinTarget - macros.p)}g</span>
              </div>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{width: `${Math.min((macros.p / dailyProteinTarget) * 100, 100)}%`}}></div>
            </div>
        </div>
      </div>

      {/* QUICK LOG */}
      <Card className="space-y-4">
        <div className="flex justify-between items-center"><h3 className="text-sm font-bold text-gray-300 flex items-center gap-2"><Search size={14}/> Quick Log</h3><button onClick={() => setShowManual(!showManual)} className="text-xs text-indigo-400 font-bold">{showManual ? "Close Manual" : "Manual Entry"}</button></div>
        {showManual ? (
            <div className="space-y-2 bg-gray-950 p-3 rounded-2xl border border-gray-800">
                <input placeholder="Meal Name" value={manualMeal.name} onChange={e=>setManualMeal({...manualMeal, name: e.target.value})} className="w-full bg-gray-900 p-2 rounded-lg text-white text-sm outline-none"/>
                <div className="grid grid-cols-4 gap-2"><input type="number" placeholder="Cals" value={manualMeal.cals} onChange={e=>setManualMeal({...manualMeal, cals: e.target.value})} className="bg-gray-900 p-2 rounded-lg text-white text-sm outline-none text-center"/><input type="number" placeholder="P" value={manualMeal.p} onChange={e=>setManualMeal({...manualMeal, p: e.target.value})} className="bg-gray-900 p-2 rounded-lg text-white text-sm outline-none text-center"/><input type="number" placeholder="C" value={manualMeal.c} onChange={e=>setManualMeal({...manualMeal, c: e.target.value})} className="bg-gray-900 p-2 rounded-lg text-white text-sm outline-none text-center"/><input type="number" placeholder="F" value={manualMeal.f} onChange={e=>setManualMeal({...manualMeal, f: e.target.value})} className="bg-gray-900 p-2 rounded-lg text-white text-sm outline-none text-center"/></div>
                <button onClick={async () => { await updateData('add', 'meals', { mealName: manualMeal.name, calories: Number(manualMeal.cals), protein: Number(manualMeal.p || 0), carbs: Number(manualMeal.c || 0), fat: Number(manualMeal.f || 0) }); setShowManual(false); addToast("Manual Meal Added", "success"); }} className="w-full bg-indigo-600 py-2 rounded-lg text-sm font-bold text-white mt-2">Add Meal</button>
            </div>
        ) : (
            <div className="flex gap-2">
                <div className="relative flex-grow"><input value={mealText} onChange={e => setMealText(e.target.value)} placeholder="e.g. 200g chicken breast and rice" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 pr-12 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white" onKeyDown={e => e.key === 'Enter' && spotMacros()}/><button onClick={spotMacros} className="absolute right-2 top-2 bottom-2 bg-indigo-600 w-10 rounded-xl flex items-center justify-center hover:bg-indigo-500 text-white shadow-lg"><Plus size={18} /></button></div>
                <div className="relative group cursor-pointer" onClick={() => foodInputRef.current?.click()}><div className="bg-gray-900 border border-gray-800 rounded-2xl h-full w-14 flex items-center justify-center hover:border-indigo-500 transition-colors"><ScanLine size={20} className="text-white"/></div><input type="file" ref={foodInputRef} onChange={() => addToast("Scanning...", "info")} className="hidden" accept="image/*"/></div>
            </div>
        )}
        {aiStatus && <p className="text-[10px] font-bold uppercase text-indigo-400 text-center animate-pulse">{aiStatus}</p>}
      </Card>

      {/* SHOP MODAL */}
      {showShop && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-gray-950 border border-gray-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                  <button onClick={() => setShowShop(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X/></button>
                  <div className="text-center mb-6">
                      <ShoppingBag size={32} className="mx-auto text-yellow-500 mb-2"/>
                      <h3 className="text-2xl font-black italic text-white uppercase">Black Market</h3>
                      <p className="text-xs text-gray-500">Spend XP. Gain Advantages.</p>
                  </div>
                  <div className="space-y-3">
                      <button onClick={() => handleBuy("Streak Freeze", 500)} className="w-full flex items-center justify-between p-4 bg-gray-900 border border-blue-500/30 rounded-2xl hover:bg-gray-800 transition-colors">
                          <div className="flex items-center gap-3">
                              <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400"><Snowflake size={20}/></div>
                              <div className="text-left"><p className="text-sm font-bold text-white">Streak Freeze</p><p className="text-[10px] text-gray-500">Protect streak for 24h</p></div>
                          </div>
                          <span className="text-xs font-bold text-yellow-500 bg-yellow-900/20 px-2 py-1 rounded">500 XP</span>
                      </button>
                      <button onClick={() => handleBuy("Double XP Token", 1000)} className="w-full flex items-center justify-between p-4 bg-gray-900 border border-purple-500/30 rounded-2xl hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-500/20 p-2 rounded-xl text-purple-400"><ArrowUpCircle size={20}/></div>
                            <div className="text-left"><p className="text-sm font-bold text-white">Double XP</p><p className="text-[10px] text-gray-500">2x XP on next workout</p></div>
                        </div>
                        <span className="text-xs font-bold text-yellow-500 bg-yellow-900/20 px-2 py-1 rounded">1000 XP</span>
                      </button> 
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};