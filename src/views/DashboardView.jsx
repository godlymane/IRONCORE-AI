import React, { useState, useEffect, useRef } from 'react';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import {
  Flame, Search, Plus, Droplets, Zap, Settings, Target,
  Check, Camera, ScanLine, ShoppingBag, Snowflake, ArrowUpCircle,
  ChefHat, Utensils, Trophy, Sparkles, X, Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { analyzeFood, cleanAIResponse, calculateForgeStreak } from '../utils/helpers';
import { SFX } from '../utils/audio';

import { Card, MacroBadge, Button, useToast, Skeleton, GlassCard, staggerContainer, slideUp } from '../components/UIComponents';
import { DashboardSkeleton } from '../components/ViewSkeletons';
import { PremiumIcon } from '../components/PremiumIcon';
import { WaterDropIcon, ProteinBoltIcon, EggIcon, ChickenIcon } from '../components/IronCoreIcons';
import { NeuroHackSection } from '../components/NeuroHackSection';
import { NutritionView } from './NutritionView';
import { MotivationCard } from '../components/Dashboard/MotivationCard';
import { ProfileSettingsModal } from '../components/Dashboard/ProfileSettingsModal';
import { QuickActionBtn } from '../components/Dashboard/QuickActionBtn';
import { ShopItem } from '../components/Dashboard/ShopItem';
import { MacroMini } from '../components/Dashboard/MacroMini';

import { useStore } from '../hooks/useStore';
import { useFitnessData } from '../hooks/useFitnessData';

// Static data — extracted to module scope to avoid re-creation on every render
const DAILY_CHALLENGES = [
  { t: "50 Pushups", xp: 300, emoji: "💪" },
  { t: "30 Min Run", xp: 400, emoji: "🏃" },
  { t: "100 Air Squats", xp: 350, emoji: "🦵" },
  { t: "No Sugar Today", xp: 500, emoji: "🚫" },
  { t: "2min Plank", xp: 250, emoji: "🧘" }
];
const DEFAULT_SUPPLEMENT_STACK = ['Creatine', 'Pre-Workout', 'Whey Protein', 'Multivitamin'];

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

// Iron Score color scale
const getIronScoreColor = (score) => {
  if (score >= 80) return '#eab308'; // gold
  if (score >= 60) return '#f97316'; // orange
  if (score >= 30) return '#dc2626'; // red
  return '#6b7280'; // grey
};

export const DashboardView = () => {
  // Read state from Zustand store for optimal performance!
  const {
    user, dataLoaded, profileLoaded, profileExists,
    meals, burned, profile, workouts, progress, userDoc
  } = useStore();

  // Read functions from the refactored useFitnessData
  const {
    logout,
    uploadProgressPhoto,
    uploadProfilePic,
    buyItem,
    completeDailyDrop,
    updateData,
    deleteEntry,
    isStorageReady
  } = useFitnessData();
  const { addToast } = useToast();
  const [mealText, setMealText] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [forge, setForge] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);
  const [manualMeal, setManualMeal] = useState({ name: '', cals: '', p: '', c: '', f: '' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [dropClaiming, setDropClaiming] = useState(false);
  const [quickLogLoading, setQuickLogLoading] = useState(false);
  const [weighInValue, setWeighInValue] = useState('');
  const [weighInLoading, setWeighInLoading] = useState(false);
  const [weighInDismissed, setWeighInDismissed] = useState(() => {
    const d = new Date().toISOString().split('T')[0];
    return localStorage.getItem(`ironcore_weigh_dismissed_${d}`) === '1';
  });
  const [scoreDelta, setScoreDelta] = useState(null);

  const fileInputRef = useRef(null);
  const foodInputRef = useRef(null);

  const [waterIntake, setWaterIntake] = useState(0);
  const WATER_GOAL = 3000;
  const [stackConfig, setStackConfig] = useState(profile?.stackConfig || DEFAULT_SUPPLEMENT_STACK);
  const [newSupp, setNewSupp] = useState("");
  const [supps, setSupps] = useState({});

  const userPhoto = profile?.photoURL || user?.photoURL;
  const xp = profile?.xp || 0;
  const level = Math.floor(xp / 500) + 1;

  // Calculate Data
  const today = new Date().toISOString().split('T')[0];
  const dropCompleted = profile?.dailyDrops?.[today];

  // Iron Score
  const ironScore = userDoc?.ironScore || 0;
  const forgeShields = profile?.forgeShields || 0;
  const ironScoreColor = getIronScoreColor(ironScore);
  const hasLoggedWeightToday = progress.some(p => p.date === today && typeof p.weight === 'number');
  const showWeighIn = !hasLoggedWeightToday && !weighInDismissed;
  const dailyDrop = DAILY_CHALLENGES[new Date().getDate() % DAILY_CHALLENGES.length];

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
    setForge(calculateForgeStreak(meals));
  }, [meals, today]);

  // Iron Score delta tracking (compare to last cached score)
  useEffect(() => {
    if (!ironScore) return;
    try {
      const raw = localStorage.getItem('ironcore_iron_score_snapshot');
      if (raw) {
        const { score: prevScore, date: prevDate } = JSON.parse(raw);
        const daysSince = (Date.now() - new Date(prevDate).getTime()) / 86400000;
        const delta = ironScore - prevScore;
        if (delta !== 0) setScoreDelta(delta);
        // Refresh snapshot weekly
        if (daysSince >= 7) {
          localStorage.setItem('ironcore_iron_score_snapshot', JSON.stringify({ score: ironScore, date: new Date().toISOString() }));
        }
      } else {
        localStorage.setItem('ironcore_iron_score_snapshot', JSON.stringify({ score: ironScore, date: new Date().toISOString() }));
      }
    } catch (e) { /* ignore */ }
  }, [ironScore]);

  const handleDropComplete = async () => {
    if (!completeDailyDrop || dropClaiming || dropCompleted) return;
    setDropClaiming(true);
    try {
      await completeDailyDrop(dailyDrop.xp);
      addToast(`Boom! ${dailyDrop.xp} XP Claimed!`, 'success');
    } catch (e) {
      console.error('Drop claim failed:', e);
      addToast('Failed to claim drop. Try again.', 'error');
    } finally {
      setDropClaiming(false);
    }
  };

  const logWeight = async () => {
    const w = parseFloat(weighInValue);
    if (!w || w < 20 || w > 500) {
      addToast('Enter a valid weight between 20–500 kg', 'error');
      return;
    }
    setWeighInLoading(true);
    try {
      const fn = getFunctions(getApp());
      const logWeightEntry = httpsCallable(fn, 'logWeightEntry');
      const result = await logWeightEntry({ weight: w });
      const { weightStatus, xpAwarded } = result.data;
      if (weightStatus === 'on_track') {
        addToast(`On track 🔥 +${xpAwarded || 50} XP`, 'success');
      } else if (weightStatus === 'off_track') {
        addToast('Off track — adjust your nutrition', 'error');
      } else {
        addToast('Keep logging — trend building', 'info');
      }
      setWeighInValue('');
    } catch (e) {
      const msg = (e?.message || '').toLowerCase();
      const code = e?.code || '';
      if (msg.includes('rate') || msg.includes('already')) addToast('Already logged today', 'error');
      else if (msg.includes('invalid')) addToast('Invalid weight value', 'error');
      else if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded' || msg.includes('internal')) {
        // Cloud Function not deployed or server cold start — save locally
        addToast('Server busy — weight saved locally, will sync later', 'warning');
        try {
          const existing = JSON.parse(localStorage.getItem('ironcore_pending_weights') || '[]');
          existing.push({ weight: w, date: new Date().toISOString().split('T')[0], timestamp: Date.now() });
          localStorage.setItem('ironcore_pending_weights', JSON.stringify(existing));
          setWeighInDismissed(true);
          localStorage.setItem(`ironcore_weigh_dismissed_${new Date().toISOString().split('T')[0]}`, '1');
        } catch { /* localStorage full */ }
      }
      else addToast('Failed to log weight — check your connection', 'error');
    } finally {
      setWeighInLoading(false);
    }
  };

  const dismissWeighIn = () => {
    localStorage.setItem(`ironcore_weigh_dismissed_${today}`, '1');
    setWeighInDismissed(true);
  };

  const [pendingBuy, setPendingBuy] = useState(null);

  const handleBuy = (item, cost) => {
    setPendingBuy({ item, cost });
  };

  const confirmBuy = async () => {
    if (!pendingBuy) return;
    const success = await buyItem(pendingBuy.item, pendingBuy.cost);
    setPendingBuy(null);
    if (success) addToast("Purchase Successful!", "success");
    else addToast("Not enough XP", "error");
  };

  const toggleSupp = async (item) => {
    const newSupps = { ...supps, [item]: !supps[item] };
    setSupps(newSupps);
    if (!supps[item]) SFX?.click();
    await updateData('add', 'profile', { supps: { ...(profile?.supps || {}), [today]: newSupps } });
  };

  const spotMacros = async (imageBase64 = null) => {
    if (!mealText && !imageBase64) return;
    setQuickLogLoading(true);
    setAiStatus("Analyzing...");
    try {
      const res = await analyzeFood(mealText || null, imageBase64);
      const result = cleanAIResponse(res);
      if (result && result.mealName) {
        await updateData('add', 'meals', result);
        setMealText("");
        setAiStatus("");
        addToast(`Logged: ${result.mealName}`, 'success');
      } else {
        setAiStatus("");
        addToast("AI couldn't identify food. Try manual entry.", "error");
        setShowManual(true);
      }
    } catch (e) {
      setAiStatus("");
      addToast("Network error. Try manual entry.", "error");
      setShowManual(true);
    } finally {
      setQuickLogLoading(false);
    }
  };

  const handleFoodScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiStatus("Scanning...");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        await spotMacros(base64);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setAiStatus("");
      addToast("Failed to read image", "error");
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  // Show skeleton while waiting for first Firestore data
  if (!dataLoaded) return <DashboardSkeleton />;

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-5 pb-4 relative">
      <AnimatePresence>
        {aiStatus === "Scanning..." && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <div className="relative">
              <ScanLine size={80} className="text-red-500 animate-pulse" />
              <div className="absolute top-0 left-0 w-full h-1 bg-white/50 shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
            </div>
            <p className="absolute bottom-1/3 text-red-500 font-bold uppercase tracking-widest text-sm animate-pulse">Running Neural Vision...</p>
          </motion.div>
        )}
      </AnimatePresence>

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

          {/* Forge Badge */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: 'linear-gradient(145deg, rgba(249, 115, 22, 0.15) 0%, rgba(249, 115, 22, 0.05) 100%)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
            }}
          >
            <Flame size={16} className="text-orange-500 fill-orange-500 animate-pulse" />
            <span className="text-xs font-black text-orange-400">{forge}</span>
          </div>
        </div>
      </motion.div>

      {/* Neuro-Hack Binaural Frequencies */}
      <motion.div variants={slideUp}>
        <NeuroHackSection />
      </motion.div>

      {/* Daily Weigh-In Card — TOP of dashboard, shown if not logged today */}
      <AnimatePresence>
        {showWeighIn && (
          <motion.div
            key="weigh-in"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="relative rounded-2xl p-5 overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(0,0,0,0.6) 0%, rgba(20,0,0,0.4) 100%)',
                border: '1px solid rgba(220, 38, 38, 0.5)',
                boxShadow: '0 0 20px rgba(220, 38, 38, 0.08)',
              }}
            >
              <button
                onClick={dismissWeighIn}
                className="absolute top-3 right-3 text-gray-600 hover:text-gray-400 transition-colors"
              >
                <X size={16} />
              </button>
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(220,38,38,0.2)' }}
                >
                  <Scale size={16} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Log Today's Weight</h3>
                  <p className="text-[10px] text-gray-500">
                    {profile?.goal === 'cut' || profile?.goal === 'Cut'
                      ? "You're on a cut — track your progress"
                      : profile?.goal === 'bulk' || profile?.goal === 'Bulk'
                      ? "You're on a bulk — track your gains"
                      : "Stay accountable — log your weight"}
                  </p>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="20"
                    max="500"
                    placeholder="0.0"
                    value={weighInValue}
                    onChange={e => setWeighInValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && logWeight()}
                    className="w-full text-center text-4xl font-black bg-transparent text-white outline-none py-2 border-b-2 border-red-500/30 focus:border-red-500 transition-colors placeholder:text-gray-700"
                  />
                  <span className="absolute right-0 bottom-3 text-xs text-gray-500 font-bold uppercase">kg</span>
                </div>
                <Button
                  onClick={logWeight}
                  disabled={weighInLoading || !weighInValue}
                  loading={weighInLoading}
                  className="!px-5 whitespace-nowrap"
                >
                  {weighInLoading ? 'Logging...' : 'LOG WEIGHT'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Iron Score Card */}
      <motion.div variants={slideUp}>
        <div
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            border: `1px solid ${ironScoreColor}33`,
          }}
        >
          {/* Score Ring */}
          <div className="relative flex-shrink-0">
            <ProgressRing
              progress={Math.min(ironScore, 100)}
              size={76}
              strokeWidth={7}
              color={ironScoreColor}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-black text-white">{ironScore || '—'}</span>
            </div>
          </div>
          {/* Score Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[11px] font-black uppercase tracking-widest"
                style={{ color: ironScoreColor }}
              >
                Iron Score
              </span>
              {scoreDelta !== null && scoreDelta !== 0 && (
                <span className={`text-[11px] font-bold ${scoreDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {scoreDelta > 0 ? '+' : ''}{scoreDelta} this week
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-600 mt-0.5 leading-tight">
              League 40% · Consistency 25% · Nutrition 20% · Wins 10% · Body 5%
            </p>
            <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
              <Flame size={11} className="text-orange-500 flex-shrink-0" />
              <span>Forge: {forge} days · {forgeShields} shield{forgeShields !== 1 ? 's' : ''}</span>
            </p>
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
            <Button
              onClick={handleDropComplete}
              disabled={dropClaiming}
              loading={dropClaiming}
              className="!bg-white !text-red-900 !shadow-lg"
            >
              {dropClaiming ? 'Claiming...' : 'Complete'}
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Quick Log Card */}
      <GlassCard className="p-5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
            <Search size={14} className="text-red-400" />
            Quick Log
          </h3>
          <button
            onClick={() => setShowManual(!showManual)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95 touch-target flex items-center justify-center"
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
          <div className="space-y-5">
            {/* Premium AI Vision Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => foodInputRef.current?.click()}
              className="w-full relative overflow-hidden rounded-2xl h-14 flex items-center justify-center gap-2 transition-all border border-red-500/30 group shadow-[0_0_20px_rgba(220,38,38,0.15)]"
              style={{
                background: 'linear-gradient(135deg, rgba(220,38,38,0.2) 0%, rgba(185,28,28,0.05) 100%)',
              }}
            >
              {/* Animated Background Shine */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

              <ScanLine size={20} className="text-red-400 group-hover:text-red-300 transition-colors" />
              <span className="font-black italic text-red-100 uppercase tracking-widest text-sm drop-shadow-md">
                Log with AI Vision
              </span>
            </motion.button>
            <input type="file" ref={foodInputRef} onChange={handleFoodScan} className="hidden" accept="image/*" capture="environment" />

            {/* Manual Text Input Fallback */}
            <div className="relative flex-grow">
              <input
                value={mealText}
                onChange={e => setMealText(e.target.value)}
                placeholder="Or type e.g. 200g chicken..."
                className="w-full p-4 pr-14 rounded-2xl text-sm focus:ring-2 focus:ring-red-600 outline-none text-gray-300 transition-all placeholder:text-gray-600"
                style={{
                  background: 'linear-gradient(145deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
                onKeyDown={e => e.key === 'Enter' && spotMacros()}
              />
              <button
                onClick={spotMacros}
                disabled={quickLogLoading || (!mealText && !foodInputRef.current?.value)}
                className="absolute right-2 top-2 bottom-2 w-10 rounded-xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-30"
                style={{
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                }}
              >
                {quickLogLoading && aiStatus !== "Scanning..." ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={18} />}
              </button>
            </div>
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
                title="Forge Shield"
                desc="Protect your Forge for 24h"
                cost={500}
                color="blue"
                onBuy={() => handleBuy("Forge Shield", 500)}
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

      {/* Buy Confirm Dialog */}
      {pendingBuy && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="w-full max-w-xs rounded-3xl p-6 space-y-4" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-white font-bold text-center">Buy {pendingBuy.item}?</p>
            <p className="text-yellow-400 text-sm font-black text-center">{pendingBuy.cost} XP</p>
            <p className="text-gray-500 text-xs text-center">You have {xp} XP</p>
            <div className="flex gap-3">
              <button onClick={() => setPendingBuy(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-400 bg-white/5 border border-white/10">Cancel</button>
              <button onClick={confirmBuy} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>Buy</button>
            </div>
          </div>
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
          updateData={updateData}
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

export default DashboardView;
