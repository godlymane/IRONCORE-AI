import React, { useState, useEffect, useRef } from 'react';
import {
  Flame, Search, Plus, Droplets, Zap, Settings, Target,
  X, Check, Camera, ScanLine, ShoppingBag, Snowflake, ArrowUpCircle,
  ChefHat, Utensils, Trophy, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, MacroBadge, Button, useToast, Skeleton, GlassCard, staggerContainer, slideUp } from '../components/UIComponents';
import { DashboardSkeleton } from '../components/ViewSkeletons';
import { PremiumIcon } from '../components/PremiumIcon';

// Import Quick Log Icons
import { WaterDropIcon, ProteinBoltIcon, EggIcon, ChickenIcon } from '../components/IronCoreIcons';

import { callGemini, cleanAIResponse } from '../utils/helpers';
import { SFX } from '../utils/audio';
import { NutritionView } from './NutritionView';

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
  completeDailyDrop, buyItem, isStorageReady, dataLoaded = true
}) => {
  const { addToast } = useToast();
  const [mealText, setMealText] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [streak, setStreak] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);
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

  // Show skeleton while waiting for first Firestore data
  if (!dataLoaded) return <DashboardSkeleton />;

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-5 pb-4 relative">

      {/* Header Section */}
      <motion.div variants={slideUp} className="flex justify-between items-center">
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
              className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-lg text-[11px] font-black"
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
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
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
      </motion.div>

      {/* Main Stats Card - Calories & Protein Rings */}
      <GlassCard highlight className="!p-6" onClick={() => setShowNutrition(true)}>
        <div className="flex items-center justify-between">
          {/* Calorie Ring */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <ProgressRing progress={calorieProgress} size={100} strokeWidth={8} color="#dc2626" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white">{displayNetCals}</span>
                <span className="text-[11px] text-gray-400 uppercase">kcal</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 font-bold mt-2 uppercase">Net Calories</p>
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
                <span className="text-[11px] text-gray-400 uppercase">protein</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 font-bold mt-2 uppercase">Protein</p>
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
                className="text-[11px] font-bold px-2 py-0.5 rounded uppercase"
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
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95 touch-target flex items-center justify-center"
          >
            {showManual ? "Close" : "Manual Entry"}
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'cals', label: 'Cals' },
                { key: 'p', label: 'P' },
                { key: 'c', label: 'C' },
                { key: 'f', label: 'F' }
              ].map(field => (
                <input
                  key={field.key}
                  type="number"
                  inputMode="numeric"
                  enterKeyHint="done"
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
            <p className="text-[11px] font-bold uppercase text-red-400">{aiStatus}</p>
          </div>
        )}
      </GlassCard>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-4 gap-2">
        <QuickActionBtn
          icon={<PremiumIcon src={WaterDropIcon} alt="Water" size="sm" fallback={Droplets} className="!w-6 !h-6" />}
          label="Water"
          color="cyan"
          onClick={async () => {
            await updateData('add', 'meals', { mealName: 'Water', calories: 0, protein: 0, carbs: 0, fat: 0 });
            addToast('+250ml Water Logged! 💧', 'success');
          }}
        />
        <QuickActionBtn
          icon={<PremiumIcon src={ProteinBoltIcon} alt="Protein" size="sm" fallback={Zap} className="!w-6 !h-6" />}
          label="Protein"
          color="yellow"
          onClick={async () => {
            await updateData('add', 'meals', { mealName: 'Protein Shake', calories: 120, protein: 25, carbs: 3, fat: 1 });
            addToast('Protein Shake Logged! 💪', 'success');
          }}
        />
        <QuickActionBtn
          icon={<PremiumIcon src={EggIcon} alt="Eggs" size="sm" fallback={ChefHat} className="!w-6 !h-6" />}
          label="Eggs"
          color="orange"
          onClick={async () => {
            await updateData('add', 'meals', { mealName: '2 Whole Eggs', calories: 155, protein: 13, carbs: 1, fat: 11 });
            addToast('2 Eggs Logged! 🥚', 'success');
          }}
        />
        <QuickActionBtn
          icon={<PremiumIcon src={ChickenIcon} alt="Chicken" size="sm" fallback={Utensils} className="!w-6 !h-6" />}
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
              <h3 className="text-2xl font-black italic text-white uppercase">Reward Shop</h3>
              <p className="text-xs text-gray-500 mt-1">Spend XP. Unlock Rewards.</p>
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

      {/* Profile Settings Modal */}
      {showSettings && (
        <ProfileSettingsModal
          profile={profile}
          userPhoto={userPhoto}
          user={user}
          uploadProfilePic={uploadProfilePic}
          fileInputRef={fileInputRef}
          uploadingPhoto={uploadingPhoto}
          setUploadingPhoto={setUploadingPhoto}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Nutrition View Overlay */}
      {showNutrition && (
        <div className="fixed inset-0 z-50 bg-black animate-in fade-in overflow-y-auto">
          <div className="p-4">
            <NutritionView
              meals={meals}
              burned={burned}
              profile={profile}
              updateData={updateData}
              onBack={() => setShowNutrition(false)}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Mini Macro Display
const MacroMini = ({ label, value, color }) => (
  <div className="flex items-center gap-2">
    <div
      className={`w-2 h-2 rounded-full bg-${color}-500`}
      style={{ boxShadow: `0 0 6px var(--tw-shadow-color)` }}
    />
    <span className="text-[11px] text-gray-500 font-bold uppercase w-12">{label}</span>
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
        <p className="text-[11px] text-gray-500">{desc}</p>
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
    <span className="text-[11px] text-gray-400 font-bold uppercase">{label}</span>
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
            <p className="text-[11px] text-gray-500 font-bold uppercase mb-1">Daily Motivation</p>
            <p className="text-sm text-white font-medium italic leading-relaxed">
              "{quote.text}"
            </p>
            <p className="text-[11px] text-red-400 font-bold mt-2">— {quote.author}</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
// Profile Settings Modal — lightweight profile viewer (replaces old Goal Architect)
const ProfileSettingsModal = ({ profile, userPhoto, user, uploadProfilePic, fileInputRef, uploadingPhoto, setUploadingPhoto, onClose }) => {
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadProfilePic) return;
    setUploadingPhoto(true);
    try {
      await uploadProfilePic(file);
    } catch (err) {
      console.error('Photo upload error:', err);
    }
    setUploadingPhoto(false);
  };

  const dailyCalories = profile?.dailyCalories || 2000;
  const dailyProtein = profile?.dailyProtein || 150;
  const dailyCarbs = profile?.dailyCarbs || 200;
  const dailyFat = profile?.dailyFat || 60;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
      <div
        className="w-full max-w-sm rounded-3xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.7)',
        }}
      >
        <div className="p-6">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-20">
            <X size={20} />
          </button>

          {/* Profile Photo */}
          <div className="flex flex-col items-center mb-6">
            <button onClick={() => fileInputRef.current?.click()} className="relative group mb-3">
              <div
                className="w-20 h-20 rounded-2xl overflow-hidden"
                style={{
                  border: '2px solid rgba(220, 38, 38, 0.6)',
                  boxShadow: '0 8px 25px rgba(220, 38, 38, 0.3)',
                }}
              >
                {uploadingPhoto ? (
                  <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : userPhoto ? (
                  <img src={userPhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <Camera size={24} className="text-gray-400" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-red-600">
                <Camera size={12} className="text-white" />
              </div>
            </button>
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
            <h3 className="text-lg font-black italic text-white uppercase">{user?.displayName || 'Athlete'}</h3>
            <p className="text-[11px] text-gray-500">{user?.email}</p>
          </div>

          {/* Current Protocol Summary */}
          <div
            className="p-4 rounded-2xl text-center mb-4"
            style={{
              background: 'linear-gradient(145deg, rgba(220, 38, 38, 0.12) 0%, rgba(185, 28, 28, 0.06) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <p className="text-[11px] text-gray-400 uppercase mb-1">Daily Target</p>
            <p className="text-3xl font-black italic text-white">{dailyCalories}</p>
            <p className="text-[11px] text-red-400 font-bold uppercase">Calories</p>
            <div className="flex justify-center gap-5 mt-3">
              <div className="text-center">
                <p className="text-sm font-black text-amber-400">{dailyProtein}g</p>
                <p className="text-[10px] text-gray-500 uppercase">Protein</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-yellow-400">{dailyCarbs}g</p>
                <p className="text-[10px] text-gray-500 uppercase">Carbs</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-pink-400">{dailyFat}g</p>
                <p className="text-[10px] text-gray-500 uppercase">Fat</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: 'Goal', value: (profile?.goal || 'maintain').toUpperCase() },
              { label: 'TDEE', value: `${profile?.tdee || '—'} kcal` },
              { label: 'Weight', value: profile?.weight ? `${profile.weight} kg` : '—' },
              { label: 'Height', value: profile?.height ? `${profile.height} cm` : '—' },
            ].map(stat => (
              <div
                key={stat.label}
                className="p-3 rounded-xl text-center"
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <p className="text-[10px] text-gray-500 uppercase font-bold">{stat.label}</p>
                <p className="text-sm font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.8) 0%, rgba(185, 28, 28, 0.8) 100%)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};



