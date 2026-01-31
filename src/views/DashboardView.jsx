import React, { useState, useEffect, useRef } from 'react';
import {
  Flame, Search, Plus, Droplets, Zap, Settings, Target,
  X, Check, Scroll, Sword, Camera, Upload, Pill, ChevronRight, ChevronLeft,
  AlertCircle, ScanLine, AlertTriangle, ShoppingBag, Snowflake, ArrowUpCircle,
  ChefHat, Utensils, TrendingUp, Trophy, Sparkles
} from 'lucide-react';
import { Card, MacroBadge, Button, useToast, Skeleton } from '../components/UIComponents';
import { callGemini, cleanAIResponse } from '../utils/helpers';
import { SFX } from '../utils/audio';

// Glass Card Component for Dashboard
const GlassCard = ({ children, className = "", onClick, highlight = false }) => (
  <div
    onClick={onClick}
    className={`relative overflow-hidden rounded-3xl p-5 transition-all duration-500 ${onClick ? 'cursor-pointer hover:scale-[1.01]' : ''} ${className}`}
    style={{
      background: highlight
        ? 'linear-gradient(145deg, rgba(220, 38, 38, 0.15) 0%, rgba(153, 27, 27, 0.08) 50%, rgba(220, 38, 38, 0.12) 100%)'
        : 'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 50%, rgba(255, 255, 255, 0.02) 100%)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: highlight ? '1px solid rgba(220, 38, 38, 0.3)' : '1px solid rgba(220, 38, 38, 0.1)',
      boxShadow: highlight
        ? '0 10px 40px rgba(220, 38, 38, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
        : '0 10px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
    }}
  >
    {/* Subtle top shine */}
    <div
      className="absolute top-0 left-0 right-0 h-[40%] rounded-t-3xl pointer-events-none"
      style={{
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, transparent 100%)',
      }}
    />
    <div className="relative z-10">
      {children}
    </div>
  </div>
);

// Circular Progress Ring
const ProgressRing = ({ progress, size = 120, strokeWidth = 8, color = "#dc2626" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
        style={{
          filter: `drop-shadow(0 0 8px ${color})`,
        }}
      />
    </svg>
  );
};

export const DashboardView = ({
  meals, burned, workouts, updateData, deleteEntry,
  profile, uploadProfilePic, user,
  completeDailyDrop, buyItem, isStorageReady
}) => {
  const { addToast } = useToast();
  const [mealText, setMealText] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [streak, setStreak] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [manualMeal, setManualMeal] = useState({ name: '', cals: '', p: '', c: '', f: '' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
  const level = Math.floor(xp / 500) + 1;

  // Calculate Data
  const today = new Date().toISOString().split('T')[0];
  const dropCompleted = profile?.dailyDrops?.[today];
  const challenges = [
    { t: "50 Pushups", xp: 300, emoji: "💪" },
    { t: "30 Min Run", xp: 400, emoji: "🏃" },
    { t: "100 Air Squats", xp: 350, emoji: "🦵" },
    { t: "No Sugar Today", xp: 500, emoji: "🚫" },
    { t: "2min Plank", xp: 250, emoji: "🧘" }
  ];
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
  const calorieProgress = Math.min((displayNetCals / dailyTarget) * 100, 100);
  const proteinProgress = Math.min((macros.p / dailyProteinTarget) * 100, 100);

  useEffect(() => {
    const loggedWater = todaysMeals.filter(m => m.mealName === 'Water').reduce((sum, m) => sum + 250, 0);
    setWaterIntake(loggedWater);
    if (profile?.supps && profile.supps[today]) { setSupps(profile.supps[today]); }
    else { setSupps({}); }
  }, [meals, profile, today]);

  useEffect(() => {
    const dates = [...new Set(meals.map(m => m.date))].sort();
    let currentStreak = 0;
    if (dates.includes(today)) currentStreak = 1;
    setStreak(currentStreak);
  }, [meals]);

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
    if (!supps[item]) SFX?.click();
    await updateData('add', 'profile', { supps: { ...(profile?.supps || {}), [today]: newSupps } });
  };

  const spotMacros = async () => {
    if (!mealText) return;
    setAiStatus("Analyzing...");
    try {
      const prompt = `Return JSON: { "mealName": "string", "calories": number, "protein": number, "carbs": number, "fat": number } for "${mealText}"`;
      const res = await callGemini(prompt, "Nutrition API. JSON Only.", null, true);
      const result = cleanAIResponse(res);
      if (result && result.mealName) {
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

  return (
    <div className="space-y-5 animate-in fade-in pb-20 relative">

      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSettings(true)} className="relative group">
            <div
              className="w-12 h-12 rounded-2xl overflow-hidden transition-transform active:scale-95"
              style={{
                boxShadow: '0 8px 25px rgba(220, 38, 38, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                border: '2px solid rgba(220, 38, 38, 0.6)',
              }}
            >
              {uploadingPhoto ? (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : userPhoto ? (
                <img src={userPhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-400">
                  <Settings size={20} />
                </div>
              )}
            </div>
            {/* Level Badge */}
            <div
              className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-lg text-[10px] font-black"
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.6)',
              }}
            >
              {level}
            </div>
          </button>
          <div>
            <h1 className="text-xl font-black italic text-white uppercase tracking-tighter">Dashboard</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
              {profile?.goal ? (
                <>
                  <span className="text-red-400">{profile.goal}</span> Protocol
                </>
              ) : (
                <Skeleton className="w-20 h-3" />
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* XP/Shop Button */}
          <button
            onClick={() => setShowShop(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(145deg, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.05) 100%)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
            }}
          >
            <Trophy size={16} className="text-yellow-500" />
            <span className="text-xs font-black text-yellow-400">{xp}</span>
          </button>

          {/* Streak Badge */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: 'linear-gradient(145deg, rgba(249, 115, 22, 0.15) 0%, rgba(249, 115, 22, 0.05) 100%)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
            }}
          >
            <Flame size={16} className="text-orange-500 fill-orange-500 animate-pulse" />
            <span className="text-xs font-black text-orange-400">{streak}</span>
          </div>
        </div>
      </div>

      {/* Main Stats Card - Calories & Protein Rings */}
      <GlassCard highlight className="!p-6">
        <div className="flex items-center justify-between">
          {/* Calorie Ring */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <ProgressRing progress={calorieProgress} size={100} strokeWidth={8} color="#dc2626" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white">{displayNetCals}</span>
                <span className="text-[9px] text-gray-400 uppercase">kcal</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 font-bold mt-2 uppercase">Net Calories</p>
            <p className="text-xs text-red-400 font-bold">{Math.max(0, dailyTarget - netCals)} left</p>
          </div>

          {/* Divider */}
          <div className="h-20 w-px bg-gradient-to-b from-transparent via-gray-700 to-transparent" />

          {/* Protein Ring */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <ProgressRing progress={proteinProgress} size={100} strokeWidth={8} color="#f59e0b" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white">{macros.p}g</span>
                <span className="text-[9px] text-gray-400 uppercase">protein</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 font-bold mt-2 uppercase">Protein</p>
            <p className="text-xs text-amber-400 font-bold">{Math.max(0, dailyProteinTarget - macros.p)}g left</p>
          </div>

          {/* Divider */}
          <div className="h-20 w-px bg-gradient-to-b from-transparent via-gray-700 to-transparent" />

          {/* Macros */}
          <div className="flex flex-col gap-2">
            <MacroMini label="Carbs" value={macros.c} color="yellow" />
            <MacroMini label="Fat" value={macros.f} color="pink" />
            <MacroMini label="Burned" value={calsOut} color="orange" />
          </div>
        </div>
      </GlassCard>

      {/* Daily Drop Card */}
      <GlassCard className="!p-4">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(153, 27, 27, 0.1) 100%)',
          }}
        />
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded uppercase"
                style={{
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                }}
              >
                Daily Drop
              </span>
              <Sparkles size={12} className="text-red-400 animate-pulse" />
            </div>
            <h3 className="text-xl font-black italic text-white uppercase flex items-center gap-2">
              <span>{dailyDrop.emoji}</span>
              {dailyDrop.t}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Complete for <span className="text-yellow-400 font-bold">+{dailyDrop.xp} XP</span>
            </p>
          </div>
          {dropCompleted ? (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
              }}
            >
              <Check size={16} className="text-green-500" />
              <span className="text-green-400">Done!</span>
            </div>
          ) : (
            <Button onClick={handleDropComplete} className="!bg-white !text-red-900 !shadow-lg">
              Complete
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Quick Log Card */}
      <GlassCard className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
            <Search size={14} className="text-red-400" />
            Quick Log
          </h3>
          <button
            onClick={() => setShowManual(!showManual)}
            className="text-xs text-red-400 font-bold hover:text-red-300 transition-colors"
          >
            {showManual ? "Close Manual" : "Manual Entry"}
          </button>
        </div>

        {showManual ? (
          <div className="space-y-3 p-4 rounded-2xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <input
              placeholder="Meal Name"
              value={manualMeal.name}
              onChange={e => setManualMeal({ ...manualMeal, name: e.target.value })}
              className="w-full bg-gray-900/80 p-3 rounded-xl text-white text-sm outline-none border border-gray-800 focus:border-red-600 transition-colors"
            />
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'cals', label: 'Cals' },
                { key: 'p', label: 'P' },
                { key: 'c', label: 'C' },
                { key: 'f', label: 'F' }
              ].map(field => (
                <input
                  key={field.key}
                  type="number"
                  placeholder={field.label}
                  value={manualMeal[field.key]}
                  onChange={e => setManualMeal({ ...manualMeal, [field.key]: e.target.value })}
                  className="bg-gray-900/80 p-3 rounded-xl text-white text-sm outline-none text-center border border-gray-800 focus:border-red-600 transition-colors"
                />
              ))}
            </div>
            <Button
              onClick={async () => {
                await updateData('add', 'meals', {
                  mealName: manualMeal.name,
                  calories: Number(manualMeal.cals),
                  protein: Number(manualMeal.p || 0),
                  carbs: Number(manualMeal.c || 0),
                  fat: Number(manualMeal.f || 0)
                });
                setShowManual(false);
                setManualMeal({ name: '', cals: '', p: '', c: '', f: '' });
                addToast("Manual Meal Added", "success");
              }}
              className="w-full"
            >
              Add Meal
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <input
                value={mealText}
                onChange={e => setMealText(e.target.value)}
                placeholder="e.g. 200g chicken breast and rice"
                className="w-full p-4 pr-14 rounded-2xl text-sm focus:ring-2 focus:ring-red-600 outline-none text-white transition-all"
                style={{
                  background: 'linear-gradient(145deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onKeyDown={e => e.key === 'Enter' && spotMacros()}
              />
              <button
                onClick={spotMacros}
                className="absolute right-2 top-2 bottom-2 w-10 rounded-xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  boxShadow: '0 4px 15px rgba(220, 38, 38, 0.5)',
                }}
              >
                <Plus size={18} />
              </button>
            </div>
            <button
              onClick={() => foodInputRef.current?.click()}
              className="rounded-2xl h-[52px] w-14 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <ScanLine size={20} className="text-white" />
            </button>
            <input type="file" ref={foodInputRef} onChange={() => addToast("Scanning...", "info")} className="hidden" accept="image/*" />
          </div>
        )}

        {aiStatus && (
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <p className="text-[10px] font-bold uppercase text-red-400">{aiStatus}</p>
          </div>
        )}
      </GlassCard>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-4 gap-2">
        <QuickActionBtn
          icon={<Droplets size={18} className="text-cyan-400" />}
          label="Water"
          color="cyan"
          onClick={async () => {
            await updateData('add', 'meals', { mealName: 'Water', calories: 0, protein: 0, carbs: 0, fat: 0 });
            addToast('+250ml Water Logged! 💧', 'success');
          }}
        />
        <QuickActionBtn
          icon={<Zap size={18} className="text-yellow-400" />}
          label="Protein"
          color="yellow"
          onClick={async () => {
            await updateData('add', 'meals', { mealName: 'Protein Shake', calories: 120, protein: 25, carbs: 3, fat: 1 });
            addToast('Protein Shake Logged! 💪', 'success');
          }}
        />
        <QuickActionBtn
          icon={<ChefHat size={18} className="text-orange-400" />}
          label="Eggs"
          color="orange"
          onClick={async () => {
            await updateData('add', 'meals', { mealName: '2 Whole Eggs', calories: 155, protein: 13, carbs: 1, fat: 11 });
            addToast('2 Eggs Logged! 🥚', 'success');
          }}
        />
        <QuickActionBtn
          icon={<Utensils size={18} className="text-green-400" />}
          label="Chicken"
          color="green"
          onClick={async () => {
            await updateData('add', 'meals', { mealName: 'Chicken Breast 150g', calories: 247, protein: 46, carbs: 0, fat: 5 });
            addToast('Chicken Logged! 🍗', 'success');
          }}
        />
      </div>

      {/* Daily Motivation Card */}
      <MotivationCard />

      {/* Shop Modal */}
      {showShop && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
          <GlassCard className="w-full max-w-sm !p-6 relative">
            <button onClick={() => setShowShop(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div
                className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(234, 179, 8, 0.1) 100%)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                }}
              >
                <ShoppingBag size={28} className="text-yellow-500" />
              </div>
              <h3 className="text-2xl font-black italic text-white uppercase">Black Market</h3>
              <p className="text-xs text-gray-500 mt-1">Spend XP. Gain Advantages.</p>
            </div>

            <div className="space-y-3">
              <ShopItem
                icon={<Snowflake size={20} className="text-amber-400" />}
                title="Streak Freeze"
                desc="Protect streak for 24h"
                cost={500}
                color="blue"
                onBuy={() => handleBuy("Streak Freeze", 500)}
              />
              <ShopItem
                icon={<ArrowUpCircle size={20} className="text-red-400" />}
                title="Double XP"
                desc="2x XP on next workout"
                cost={1000}
                color="purple"
                onBuy={() => handleBuy("Double XP Token", 1000)}
              />
            </div>
          </GlassCard>
        </div>
      )}

      {/* Goal Architect Modal */}
      {showSettings && (
        <GoalArchitectModal
          profile={profile}
          updateData={updateData}
          addToast={addToast}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

// Mini Macro Display
const MacroMini = ({ label, value, color }) => (
  <div className="flex items-center gap-2">
    <div
      className={`w-2 h-2 rounded-full bg-${color}-500`}
      style={{ boxShadow: `0 0 6px var(--tw-shadow-color)` }}
    />
    <span className="text-[10px] text-gray-500 font-bold uppercase w-12">{label}</span>
    <span className="text-xs text-white font-bold">{value}{label !== 'Burned' ? 'g' : ''}</span>
  </div>
);

// Shop Item Component
const ShopItem = ({ icon, title, desc, cost, color, onBuy }) => (
  <button
    onClick={onBuy}
    className="w-full flex items-center justify-between p-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
    style={{
      background: `linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)`,
      border: '1px solid rgba(255,255,255,0.1)',
    }}
  >
    <div className="flex items-center gap-3">
      <div
        className="p-2 rounded-xl"
        style={{
          background: `linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)`,
        }}
      >
        {icon}
      </div>
      <div className="text-left">
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-[10px] text-gray-500">{desc}</p>
      </div>
    </div>
    <span
      className="text-xs font-bold px-2 py-1 rounded"
      style={{
        background: 'rgba(234, 179, 8, 0.15)',
        color: '#eab308',
      }}
    >
      {cost} XP
    </span>
  </button>
);

// Quick Action Button Component
const QuickActionBtn = ({ icon, label, color, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl transition-all hover:scale-105 active:scale-95"
    style={{
      background: `linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)`,
      border: '1px solid rgba(255,255,255,0.08)',
    }}
  >
    <div
      className="p-2 rounded-xl"
      style={{
        background: `linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)`,
      }}
    >
      {icon}
    </div>
    <span className="text-[9px] text-gray-400 font-bold uppercase">{label}</span>
  </button>
);

// Motivational Quotes Data
const MOTIVATION_QUOTES = [
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Your body can stand almost anything. It's your mind you have to convince.", author: "Unknown" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" },
  { text: "Success isn't always about greatness. It's about consistency.", author: "Dwayne Johnson" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "The resistance that you fight in the gym and the resistance that you fight in life can only build a strong character.", author: "Arnold Schwarzenegger" },
  { text: "Champions are made from something deep inside them — a desire, a dream, a vision.", author: "Muhammad Ali" },
  { text: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi" },
  { text: "The last three or four reps is what makes the muscle grow.", author: "Arnold Schwarzenegger" },
  { text: "Your health is an investment, not an expense.", author: "Unknown" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
];

// Daily Motivation Card Component
const MotivationCard = () => {
  // Get quote based on day of year for daily rotation
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const quoteIndex = dayOfYear % MOTIVATION_QUOTES.length;
  const quote = MOTIVATION_QUOTES[quoteIndex];

  return (
    <GlassCard className="!p-4 relative overflow-hidden">
      {/* Subtle flame background */}
      <div
        className="absolute top-0 right-0 w-24 h-24 opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(220, 38, 38, 0.8) 0%, transparent 70%)',
        }}
      />
      <div className="relative z-10">
        <div className="flex items-start gap-3">
          <div
            className="p-2 rounded-xl flex-shrink-0"
            style={{
              background: 'linear-gradient(145deg, rgba(220, 38, 38, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
            }}
          >
            <Sparkles size={16} className="text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Daily Motivation</p>
            <p className="text-sm text-white font-medium italic leading-relaxed">
              "{quote.text}"
            </p>
            <p className="text-[10px] text-red-400 font-bold mt-2">— {quote.author}</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
// SMART GOAL ARCHITECT - Auto-calculates calories using Mifflin-St Jeor formula
const GoalArchitectModal = ({ profile, updateData, addToast, onClose }) => {
  const [step, setStep] = useState(1); // Multi-step wizard
  const [formData, setFormData] = useState({
    weight: profile?.weight || '',
    height: profile?.height || '',
    age: profile?.age || '',
    gender: profile?.gender || 'male',
    activityLevel: profile?.activityLevel || 1.55, // Moderately active
    goal: profile?.goal || 'maintain',
    intensity: profile?.intensity || 'moderate', // conservative, moderate, aggressive
    bodyFat: profile?.bodyFat || '',
  });
  const [saving, setSaving] = useState(false);

  // Activity Level Multipliers
  const activityLevels = [
    { value: 1.2, label: 'Sedentary', desc: 'Desk job, no exercise', icon: '🛋️' },
    { value: 1.375, label: 'Light', desc: '1-2 days/week', icon: '🚶' },
    { value: 1.55, label: 'Moderate', desc: '3-5 days/week', icon: '🏃' },
    { value: 1.725, label: 'Active', desc: '6-7 days/week', icon: '💪' },
    { value: 1.9, label: 'Athlete', desc: 'Intense daily training', icon: '🔥' },
  ];

  // Goal Adjustments
  const goalConfigs = {
    lose: { label: 'Fat Loss', icon: <Flame size={18} />, color: 'orange', emoji: '🔥' },
    maintain: { label: 'Maintain', icon: <Target size={18} />, color: 'red', emoji: '⚖️' },
    gain: { label: 'Build Muscle', icon: <TrendingUp size={18} />, color: 'green', emoji: '💪' },
  };

  // Intensity adjustments (calories)
  const intensityConfigs = {
    conservative: { lose: -300, gain: 200, label: 'Conservative', desc: 'Slow & steady' },
    moderate: { lose: -500, gain: 350, label: 'Moderate', desc: 'Balanced approach' },
    aggressive: { lose: -750, gain: 500, label: 'Aggressive', desc: 'Faster results' },
  };

  // Calculate TDEE using Mifflin-St Jeor
  const calculateTDEE = () => {
    const w = parseFloat(formData.weight) || 70;
    const h = parseFloat(formData.height) || 170;
    const a = parseFloat(formData.age) || 25;
    const activity = parseFloat(formData.activityLevel) || 1.55;

    // Mifflin-St Jeor Equation
    let bmr;
    if (formData.gender === 'male') {
      bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
    } else {
      bmr = (10 * w) + (6.25 * h) - (5 * a) - 161;
    }

    const tdee = Math.round(bmr * activity);
    return tdee;
  };

  // Calculate target calories based on goal and intensity
  const calculateTargetCalories = () => {
    const tdee = calculateTDEE();
    if (formData.goal === 'maintain') return tdee;

    const adjustment = intensityConfigs[formData.intensity]?.[formData.goal] || 0;
    return Math.max(1200, tdee + adjustment); // Never below 1200
  };

  // Calculate macros based on goal
  const calculateMacros = () => {
    const calories = calculateTargetCalories();
    const weight = parseFloat(formData.weight) || 70;

    let proteinMultiplier, fatPercent;
    switch (formData.goal) {
      case 'lose':
        proteinMultiplier = 2.2; // Higher protein for muscle retention
        fatPercent = 0.25;
        break;
      case 'gain':
        proteinMultiplier = 2.0;
        fatPercent = 0.25;
        break;
      default:
        proteinMultiplier = 1.8;
        fatPercent = 0.30;
    }

    const protein = Math.round(weight * proteinMultiplier);
    const fat = Math.round((calories * fatPercent) / 9);
    const carbCals = calories - (protein * 4) - (fat * 9);
    const carbs = Math.round(carbCals / 4);

    return { protein, carbs, fat };
  };

  const targetCalories = calculateTargetCalories();
  const macros = calculateMacros();
  const tdee = calculateTDEE();

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateData('add', 'profile', {
        weight: parseFloat(formData.weight) || null,
        height: parseFloat(formData.height) || null,
        age: parseInt(formData.age) || null,
        gender: formData.gender,
        activityLevel: formData.activityLevel,
        goal: formData.goal,
        intensity: formData.intensity,
        bodyFat: parseFloat(formData.bodyFat) || null,
        dailyCalories: targetCalories,
        dailyProtein: macros.protein,
        dailyCarbs: macros.carbs,
        dailyFat: macros.fat,
        tdee: tdee,
      });
      addToast("🎯 Goal Protocol Activated!", "success");
      onClose();
    } catch (e) {
      addToast("Save failed", "error");
    }
    setSaving(false);
  };

  const inputStyle = {
    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  };

  const isStep1Valid = formData.weight && formData.height && formData.age;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 animate-in fade-in">
      <div
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl relative"
        style={{
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.7), 0 0 100px rgba(220, 38, 38, 0.15)',
        }}
      >
        {/* Animated gradient border */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(153, 27, 27, 0.1), rgba(220, 38, 38, 0.2))',
            backgroundSize: '200% 200%',
            animation: 'gradient-shift 4s ease infinite',
            opacity: 0.5,
            zIndex: 0,
          }}
        />

        <div className="relative z-10 p-5">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-20">
            <X size={20} />
          </button>

          {/* Header */}
          <div className="text-center mb-5">
            <div
              className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3 animate-pulse-glow"
              style={{
                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.5) 0%, rgba(153, 27, 27, 0.4) 100%)',
                border: '1px solid rgba(220, 38, 38, 0.5)',
              }}
            >
              <Zap size={24} className="text-red-300" />
            </div>
            <h3 className="text-xl font-black italic text-white uppercase tracking-tight">Goal Architect</h3>
            <p className="text-[10px] text-gray-400 mt-1">AI-Powered Calorie Calculator</p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center gap-2 mb-5">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-all ${step >= s ? 'bg-red-600 scale-125' : 'bg-gray-700'}`}
                style={step >= s ? { boxShadow: '0 0 10px rgba(220, 38, 38, 0.7)' } : {}}
              />
            ))}
          </div>

          {/* STEP 1: Body Stats */}
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <div className="text-center mb-4">
                <span className="text-2xl">📊</span>
                <h4 className="text-sm font-bold text-white mt-1">Body Stats</h4>
              </div>

              {/* Gender Selection */}
              <div className="grid grid-cols-2 gap-3">
                {['male', 'female'].map(g => (
                  <button
                    key={g}
                    onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                    className={`p-3 rounded-xl transition-all flex items-center justify-center gap-2 ${formData.gender === g ? 'scale-105' : 'opacity-60'}`}
                    style={{
                      background: formData.gender === g
                        ? 'linear-gradient(145deg, rgba(220, 38, 38, 0.35) 0%, rgba(220, 38, 38, 0.15) 100%)'
                        : 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                      border: formData.gender === g ? '1px solid rgba(220, 38, 38, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <span className="text-lg">{g === 'male' ? '👨' : '👩'}</span>
                    <span className={`text-xs font-bold uppercase ${formData.gender === g ? 'text-white' : 'text-gray-500'}`}>
                      {g}
                    </span>
                  </button>
                ))}
              </div>

              {/* Weight, Height, Age, Body Fat */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 rounded-xl" style={inputStyle}>
                  <label className="text-[9px] uppercase font-bold text-gray-500 block mb-1">Weight</label>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      value={formData.weight}
                      onChange={e => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                      placeholder="70"
                      className="w-full bg-transparent text-lg font-black text-white outline-none placeholder:text-gray-700"
                    />
                    <span className="text-[10px] text-gray-500">kg</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl" style={inputStyle}>
                  <label className="text-[9px] uppercase font-bold text-gray-500 block mb-1">Height</label>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      value={formData.height}
                      onChange={e => setFormData(prev => ({ ...prev, height: e.target.value }))}
                      placeholder="175"
                      className="w-full bg-transparent text-lg font-black text-white outline-none placeholder:text-gray-700"
                    />
                    <span className="text-[10px] text-gray-500">cm</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl" style={inputStyle}>
                  <label className="text-[9px] uppercase font-bold text-gray-500 block mb-1">Age</label>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      value={formData.age}
                      onChange={e => setFormData(prev => ({ ...prev, age: e.target.value }))}
                      placeholder="25"
                      className="w-full bg-transparent text-lg font-black text-white outline-none placeholder:text-gray-700"
                    />
                    <span className="text-[10px] text-gray-500">yrs</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl" style={inputStyle}>
                  <label className="text-[9px] uppercase font-bold text-gray-500 block mb-1">Body Fat</label>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      value={formData.bodyFat}
                      onChange={e => setFormData(prev => ({ ...prev, bodyFat: e.target.value }))}
                      placeholder="15"
                      className="w-full bg-transparent text-lg font-black text-white outline-none placeholder:text-gray-700"
                    />
                    <span className="text-[10px] text-gray-500">%</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
                className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
                style={{
                  background: isStep1Valid
                    ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.8) 0%, rgba(185, 28, 28, 0.8) 100%)'
                    : 'rgba(255,255,255,0.1)',
                }}
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* STEP 2: Activity & Goal */}
          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <div className="text-center mb-2">
                <span className="text-2xl">🎯</span>
                <h4 className="text-sm font-bold text-white mt-1">Activity & Goal</h4>
              </div>

              {/* Activity Level */}
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-2">Activity Level</label>
                <div className="space-y-2">
                  {activityLevels.map(level => (
                    <button
                      key={level.value}
                      onClick={() => setFormData(prev => ({ ...prev, activityLevel: level.value }))}
                      className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 ${formData.activityLevel === level.value ? 'scale-[1.02]' : 'opacity-60'}`}
                      style={{
                        background: formData.activityLevel === level.value
                          ? 'linear-gradient(145deg, rgba(220, 38, 38, 0.25) 0%, rgba(220, 38, 38, 0.1) 100%)'
                          : inputStyle.background,
                        border: formData.activityLevel === level.value ? '1px solid rgba(239, 68, 68, 0.4)' : inputStyle.border,
                      }}
                    >
                      <span className="text-lg">{level.icon}</span>
                      <div className="text-left flex-1">
                        <p className={`text-xs font-bold ${formData.activityLevel === level.value ? 'text-white' : 'text-gray-400'}`}>{level.label}</p>
                        <p className="text-[10px] text-gray-500">{level.desc}</p>
                      </div>
                      {formData.activityLevel === level.value && <Check size={14} className="text-red-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal Selection */}
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-2">Your Goal</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(goalConfigs).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setFormData(prev => ({ ...prev, goal: key }))}
                      className={`p-3 rounded-xl transition-all flex flex-col items-center gap-1 ${formData.goal === key ? 'scale-105' : 'opacity-60'}`}
                      style={{
                        background: formData.goal === key
                          ? 'linear-gradient(145deg, rgba(220, 38, 38, 0.3) 0%, rgba(220, 38, 38, 0.1) 100%)'
                          : inputStyle.background,
                        border: formData.goal === key ? '1px solid rgba(239, 68, 68, 0.4)' : inputStyle.border,
                      }}
                    >
                      <span className="text-lg">{config.emoji}</span>
                      <span className={`text-[10px] font-bold uppercase ${formData.goal === key ? 'text-white' : 'text-gray-500'}`}>{config.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="px-4 py-3 rounded-xl text-gray-400 text-sm font-bold" style={inputStyle}>
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.8) 0%, rgba(185, 28, 28, 0.8) 100%)' }}
                >
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Intensity & Results */}
          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <div className="text-center mb-2">
                <span className="text-2xl">⚡</span>
                <h4 className="text-sm font-bold text-white mt-1">Your Protocol</h4>
              </div>

              {/* Intensity Slider */}
              {formData.goal !== 'maintain' && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-2">Intensity</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(intensityConfigs).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => setFormData(prev => ({ ...prev, intensity: key }))}
                        className={`p-3 rounded-xl transition-all flex flex-col items-center gap-1 ${formData.intensity === key ? 'scale-105' : 'opacity-60'}`}
                        style={{
                          background: formData.intensity === key
                            ? 'linear-gradient(145deg, rgba(220, 38, 38, 0.3) 0%, rgba(220, 38, 38, 0.1) 100%)'
                            : inputStyle.background,
                          border: formData.intensity === key ? '1px solid rgba(239, 68, 68, 0.4)' : inputStyle.border,
                        }}
                      >
                        <span className={`text-xs font-bold ${formData.intensity === key ? 'text-white' : 'text-gray-500'}`}>{config.label}</span>
                        <span className="text-[9px] text-gray-500">{config.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results Display */}
              <div
                className="p-4 rounded-2xl text-center"
                style={{
                  background: 'linear-gradient(145deg, rgba(220, 38, 38, 0.15) 0%, rgba(185, 28, 28, 0.1) 100%)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <p className="text-[10px] text-gray-400 uppercase mb-1">Your Daily Target</p>
                <p className="text-4xl font-black italic text-white mb-1">{targetCalories}</p>
                <p className="text-xs text-red-400 font-bold">CALORIES</p>
                <div className="flex justify-center gap-4 mt-3">
                  <div className="text-center">
                    <p className="text-lg font-black text-amber-400">{macros.protein}g</p>
                    <p className="text-[9px] text-gray-500 uppercase">Protein</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-yellow-400">{macros.carbs}g</p>
                    <p className="text-[9px] text-gray-500 uppercase">Carbs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-pink-400">{macros.fat}g</p>
                    <p className="text-[9px] text-gray-500 uppercase">Fat</p>
                  </div>
                </div>
              </div>

              {/* TDEE Info */}
              <div className="text-center text-[10px] text-gray-500">
                Base TDEE: {tdee} kcal • {formData.goal === 'lose' ? 'Deficit' : formData.goal === 'gain' ? 'Surplus' : 'Maintenance'} Protocol
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="px-4 py-3 rounded-xl text-gray-400 text-sm font-bold" style={inputStyle}>
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-4 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(22, 163, 74, 0.9) 100%)',
                    boxShadow: '0 10px 40px rgba(34, 197, 94, 0.4)',
                  }}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Activate Protocol
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



