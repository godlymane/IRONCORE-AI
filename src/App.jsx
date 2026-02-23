import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Flame, Plus, Utensils, Dumbbell, Heart
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';

// Static imports — needed before auth resolves
import { LoginView } from './views/LoginView';
import { OnboardingView } from './views/OnboardingView';

// Lazy-loaded views — only fetched when user navigates to tab
const DashboardView = React.lazy(() => import('./views/DashboardView').then(m => ({ default: m.DashboardView })));
const WorkoutView = React.lazy(() => import('./views/WorkoutView').then(m => ({ default: m.WorkoutView })));
const CardioView = React.lazy(() => import('./views/CardioView').then(m => ({ default: m.CardioView })));
const ArenaView = React.lazy(() => import('./views/ArenaView').then(m => ({ default: m.ArenaView })));
const ProfileHub = React.lazy(() => import('./views/ProfileHub').then(m => ({ default: m.ProfileHub })));
const AILabView = React.lazy(() => import('./views/AILabView').then(m => ({ default: m.AILabView })));

import { NavBtn, ToastProvider, useToast, PageTransition, SkeletonCard, FloatingActionButton } from './components/UIComponents';
import { OfflineIndicator } from './components/StatusComponents';
import { SplashScreen, PullToRefresh } from './components/PremiumUI';
import AmbientFX from './components/AmbientFX';
import VoiceCoach from './components/VoiceCoach';
import { DashboardSkeleton, WorkoutSkeleton, CardioSkeleton, ArenaSkeleton, ProfileSkeleton, AILabSkeleton } from './components/ViewSkeletons';
import { EliteFlameIcon, EliteSwordsIcon, EliteDumbbellIcon, EliteBrainIcon, EliteHeartIcon, EliteCrownIcon } from './components/EliteIcons';
import { useFitnessData } from './hooks/useFitnessData';
import { useStore } from './hooks/useStore';
import { SFX, Haptics } from './utils/audio';
import { ThemeProvider } from './context/ThemeContext';
// ArenaProvider removed — Arena now uses useFitnessData leaderboard directly
import { PremiumProvider } from './context/PremiumContext';
import PremiumPaywall from './components/PremiumPaywall';

// Tab order for directional page transitions
const TAB_ORDER = { dashboard: 0, arena: 1, workout: 2, ailab: 3, cardio: 4, profile: 5 };
const TAB_KEYS = ['dashboard', 'arena', 'workout', 'ailab', 'cardio', 'profile'];

// --- MAIN CONTENT WRAPPER ---
const MainContent = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [direction, setDirection] = useState(0);
  const prevTabRef = useRef('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const { addToast } = useToast();

  const {
    user, loading, profileLoaded, profileExists, dataLoaded,
    meals, progress, burned, workouts, profile, photos,
    leaderboard, chat, following, posts, inbox, globalFeed,
    battles, error, setActiveTab: setStoreActiveTab
  } = useStore();

  const {
    login, logout, uploadProfilePic, uploadProgressPhoto,
    sendMessage, toggleFollow, createPost, sendPrivateMessage,
    updateData, deleteEntry, completeDailyDrop, buyItem, createBattle,
    isStorageReady, refreshData, clearError
  } = useFitnessData();

  // Sync local activeTab to the Zustand store
  useEffect(() => {
    setStoreActiveTab(activeTab);
  }, [activeTab, setStoreActiveTab]);

  // Surface hook errors as toasts
  useEffect(() => {
    if (error) {
      addToast(error, 'error');
      clearError();
    }
  }, [error, addToast, clearError]);

  // Nav auto-hide on scroll
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = useCallback((e) => {
    const currentY = e.target.scrollTop;
    if (currentY < 50) { setNavVisible(true); }
    else if (currentY > lastScrollY.current + 10) { setNavVisible(false); }
    else if (currentY < lastScrollY.current - 10) { setNavVisible(true); }
    lastScrollY.current = currentY;
  }, []);

  // Direction-aware tab switching
  const handleTabChange = useCallback((newTab) => {
    const d = (TAB_ORDER[newTab] ?? 0) - (TAB_ORDER[prevTabRef.current] ?? 0);
    setDirection(d > 0 ? 1 : d < 0 ? -1 : 0);
    prevTabRef.current = newTab;
    setActiveTab(newTab);
    setNavVisible(true);
    SFX.pageTransition();
  }, []);

  // Lightweight touch-based swipe navigation (no Framer drag overhead)
  const touchRef = useRef({ startX: 0, startY: 0, startTime: 0 });
  const viewportRef = useRef(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, startTime: Date.now() };
    };

    const onTouchEnd = (e) => {
      const dx = e.changedTouches[0].clientX - touchRef.current.startX;
      const dy = e.changedTouches[0].clientY - touchRef.current.startY;
      const dt = Date.now() - touchRef.current.startTime;
      // Only trigger if horizontal swipe > vertical and meets threshold
      if (Math.abs(dx) > Math.abs(dy) * 1.5 && (Math.abs(dx) > 60 || (Math.abs(dx) > 30 && dt < 300))) {
        const currentIdx = TAB_ORDER[activeTab];
        if (dx < 0 && currentIdx < TAB_KEYS.length - 1) {
          handleTabChange(TAB_KEYS[currentIdx + 1]);
        } else if (dx > 0 && currentIdx > 0) {
          handleTabChange(TAB_KEYS[currentIdx - 1]);
        } else {
          Haptics.light();
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [activeTab, handleTabChange]);

  // Configure status bar on native platforms
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: Style.Dark });
        StatusBar.setBackgroundColor({ color: '#000000' });
        StatusBar.setOverlaysWebView({ overlay: true });
      }).catch(() => { });
    }
  }, []);

  // Prefetch likely next views after dashboard loads
  useEffect(() => {
    if (!user || loading) return;
    const timer = setTimeout(() => {
      import('./views/WorkoutView');
      import('./views/ArenaView');
    }, 3000);
    return () => clearTimeout(timer);
  }, [user, loading]);

  // CHECK FOR ONBOARDING STATUS
  // Check once per user login
  const checkedUid = useRef(null);
  useEffect(() => {
    if (!user || !profileLoaded || loading) return;

    // If UID changed, reset check (handles logout/login as different user)
    if (checkedUid.current === user.uid) return;
    checkedUid.current = user.uid;

    // Check localStorage first (instant, survives offline/slow Firestore)
    const localOnboarded = localStorage.getItem(`ironai_onboarded_${user.uid}`);
    if (localOnboarded === 'true') {
      setShowOnboarding(false);
      return;
    }

    // Fallback: check Firestore profile
    // Robust check: needs onboarding if profile doesn't exist OR it lacks the onboarded flag AND lacks basic calorie targets
    const hasData = meals.length > 0 || workouts.length > 0;
    const needsOnboarding = (!profileExists || (!profile.onboarded && !profile.dailyCalories)) && !hasData;

    setShowOnboarding(needsOnboarding);
  }, [user, profile, loading, profileLoaded, profileExists, meals, workouts]);

  const handleOnboardingComplete = (data) => {
    // Dismiss onboarding IMMEDIATELY — don't block on Firestore write
    setShowOnboarding(false);
    addToast("Profile Initialized. Welcome to the Team.", "success");

    // Persist to localStorage FIRST (instant, survives app restart even if Firestore write fails)
    if (user?.uid) {
      localStorage.setItem(`ironai_onboarded_${user.uid}`, 'true');
      localStorage.setItem(`ironai_profile_${user.uid}`, JSON.stringify({ ...data, onboarded: true }));
    }

    // Save data to Firestore in background (non-blocking)
    updateData('add', 'profile', {
      ...data,
      onboarded: true,
      lastUpdated: new Date()
    }).catch(e => console.error('Profile save error:', e));

    // Also save initial weight to progress history
    if (data.weight) {
      updateData('add', 'progress', {
        weight: parseFloat(data.weight),
        date: new Date().toISOString().split('T')[0]
      }).catch(e => console.error('Weight save error:', e));
    }
  };

  if (error) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
        <span className="text-2xl">!</span>
      </div>
      <h3 className="text-lg font-black text-white uppercase mb-2">Connection Error</h3>
      <p className="text-xs text-gray-500 max-w-xs mb-4">{error}</p>
      <button
        onClick={() => { clearError(); refreshData(); }}
        className="px-6 py-2 rounded-xl text-xs font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)' }}
      >
        Retry
      </button>
    </div>
  );

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (loading) return <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" /><p className="text-xs text-gray-500 font-black uppercase tracking-widest animate-pulse">Syncing Cloud Data...</p></div>;
  if (!user) return <LoginView onLogin={login} />;

  // Wait for Firestore profile to load before deciding onboarding — prevents flash
  if (!profileLoaded) return <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" /><p className="text-xs text-gray-500 font-black uppercase tracking-widest animate-pulse">Loading Profile...</p></div>;

  if (showOnboarding) return <OnboardingView user={user} onComplete={handleOnboardingComplete} />;

  const latestWeight = progress.find(p => p.weight)?.weight;

  return (
    <PremiumProvider user={user}>
      <div className="min-h-screen text-gray-100 font-sans selection:bg-red-500/30 pb-safe-area-inset-bottom" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
        {/* Background Ambient Living Light — disabled on mobile for performance */}
        {window.innerWidth > 768 && <AmbientFX count={15} />}

        {/* Offline Indicator */}
        <OfflineIndicator />

        {/* Premium Paywall Overlay */}
        <PremiumPaywall />

        <div className="max-w-md mx-auto min-h-screen relative shadow-2xl overflow-hidden md:border-x md:border-gray-900/50" style={{ backgroundColor: 'var(--color-background)' }}>

          {/* THEME TOGGLE REMOVED */}
          {/* <div className="fixed top-4 right-4 z-50 md:absolute md:right-6">
            <ThemeToggle />
          </div> */}

          {/* VIEWPORT */}
          <PullToRefresh onRefresh={async () => {
            SFX.refresh();
            refreshData();
            await new Promise(r => setTimeout(r, 600));
            addToast('Data synced', 'info');
          }}>
            <div
              ref={viewportRef}
              onScroll={handleScroll}
              className="p-5 overflow-y-auto overflow-x-hidden scrollbar-hide"
              style={{ height: '100dvh', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
            >
              <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                  <PageTransition key="dashboard" direction={direction}>
                    <ViewErrorBoundary viewName="Dashboard">
                      <React.Suspense fallback={<DashboardSkeleton />}>
                        <DashboardView meals={meals} burned={burned} workouts={workouts} updateData={updateData} deleteEntry={deleteEntry} profile={profile} uploadProfilePic={uploadProfilePic} user={user} completeDailyDrop={completeDailyDrop} buyItem={buyItem} isStorageReady={isStorageReady} dataLoaded={dataLoaded} />
                      </React.Suspense>
                    </ViewErrorBoundary>
                  </PageTransition>
                )}
                {activeTab === 'workout' && (
                  <PageTransition key="workout" direction={direction}>
                    <ViewErrorBoundary viewName="Workout">
                      <React.Suspense fallback={<WorkoutSkeleton />}>
                        <WorkoutView />
                      </React.Suspense>
                    </ViewErrorBoundary>
                  </PageTransition>
                )}
                {activeTab === 'cardio' && (
                  <PageTransition key="cardio" direction={direction}>
                    <ViewErrorBoundary viewName="Cardio">
                      <React.Suspense fallback={<CardioSkeleton />}>
                        <CardioView />
                      </React.Suspense>
                    </ViewErrorBoundary>
                  </PageTransition>
                )}
                {activeTab === 'arena' && (
                  <PageTransition key="arena" direction={direction}>
                    <ViewErrorBoundary viewName="Arena">
                      <React.Suspense fallback={<ArenaSkeleton />}>
                        <ArenaView user={user} workouts={workouts} meals={meals} burned={burned} leaderboard={leaderboard} profile={profile} chat={chat} sendMessage={sendMessage} battles={battles} createBattle={createBattle} />
                      </React.Suspense>
                    </ViewErrorBoundary>
                  </PageTransition>
                )}
                {activeTab === 'profile' && (
                  <PageTransition key="profile" direction={direction}>
                    <ViewErrorBoundary viewName="Profile">
                      <React.Suspense fallback={<ProfileSkeleton />}>
                        <ProfileHub deleteEntry={deleteEntry} onLogout={logout} />
                      </React.Suspense>
                    </ViewErrorBoundary>
                  </PageTransition>
                )}
                {activeTab === 'ailab' && (
                  <PageTransition key="ailab" direction={direction}>
                    <ViewErrorBoundary viewName="AI Lab">
                      <React.Suspense fallback={<AILabSkeleton />}>
                        <AILabView workouts={workouts} meals={meals} profile={profile} updateData={updateData} weight={latestWeight} />
                      </React.Suspense>
                    </ViewErrorBoundary>
                  </PageTransition>
                )}
              </AnimatePresence>
            </div>
          </PullToRefresh>



          {/* FLOATING ACTION BUTTON */}
          {['dashboard', 'workout', 'cardio'].includes(activeTab) && (
            <FloatingActionButton
              mainIcon={<Plus size={24} className="text-white" />}
              actions={[
                { label: 'Quick Meal', icon: <Utensils size={18} className="text-red-400" />, onClick: () => handleTabChange('dashboard') },
                { label: 'Quick Workout', icon: <Dumbbell size={18} className="text-red-400" />, onClick: () => handleTabChange('workout') },
                { label: 'Quick Cardio', icon: <Heart size={18} className="text-red-400" />, onClick: () => handleTabChange('cardio') },
              ]}
            />
          )}

          {/* VOICE COACH — Floating Mic Button */}
          <VoiceCoach updateData={updateData} />
          {/* BOTTOM NAV - LIQUID GLASS FLOATING DOCK */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-40 p-3"
            animate={{ y: navVisible ? 0 : 120 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 8px)' }}
          >
            <div className="max-w-md mx-auto">
              {/* Liquid Glass Container */}
              <div className="relative rounded-[28px] p-1 overflow-hidden glass-nav-pill">
                {/* Sliding Active Indicator */}
                <motion.div
                  className="absolute z-0 nav-active-indicator rounded-2xl"
                  style={{
                    width: `calc((100% - 8px) / 6)`,
                    height: '80%',
                    top: '10%',
                  }}
                  animate={{
                    left: `calc(${TAB_ORDER[activeTab]} * (100% - 8px) / 6 + 4px)`,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />

                {/* Nav Items Grid */}
                <div className="relative z-10 grid grid-cols-6 gap-0">
                  <NavBtn active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} icon={<EliteFlameIcon active={activeTab === 'dashboard'} size={22} />} label="Home" />
                  <NavBtn active={activeTab === 'arena'} onClick={() => handleTabChange('arena')} icon={<EliteSwordsIcon active={activeTab === 'arena'} size={22} />} label="Arena" />
                  <NavBtn active={activeTab === 'workout'} onClick={() => handleTabChange('workout')} icon={<EliteDumbbellIcon active={activeTab === 'workout'} size={22} />} label="Lift" />
                  <NavBtn active={activeTab === 'ailab'} onClick={() => handleTabChange('ailab')} icon={<EliteBrainIcon active={activeTab === 'ailab'} size={22} />} label="AI" />
                  <NavBtn active={activeTab === 'cardio'} onClick={() => handleTabChange('cardio')} icon={<EliteHeartIcon active={activeTab === 'cardio'} size={22} />} label="Pulse" />
                  <NavBtn active={activeTab === 'profile'} onClick={() => handleTabChange('profile')} icon={<EliteCrownIcon active={activeTab === 'profile'} size={22} />} label="Me" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PremiumProvider>
  );
};

// Per-view error boundary — isolates crashes to individual views
class ViewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[${this.props.viewName || 'View'}] Error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <span className="text-2xl">!</span>
          </div>
          <h3 className="text-lg font-black text-white uppercase">
            {this.props.viewName || 'This view'} crashed
          </h3>
          <p className="text-xs text-gray-500 max-w-xs">{this.state.error?.message || 'Unknown error'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-2 rounded-xl text-xs font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// App-level error boundary (fatal)
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6"
            style={{ boxShadow: '0 0 40px rgba(220, 38, 38, 0.2)' }}
          >
            <span className="text-4xl font-black text-red-500">!</span>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Something Broke</h1>
          <p className="text-sm text-gray-400 max-w-xs mb-6">
            IronCore hit an unexpected error. This has been noted. Restart the app to get back on track.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              boxShadow: '0 10px 30px rgba(220, 38, 38, 0.4)',
            }}
          >
            Restart App
          </button>
          <p className="text-[11px] text-gray-600 mt-4">
            If this keeps happening, contact support.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- APP ENTRY POINT ---
export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ErrorBoundary>
          <MainContent />
        </ErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  );
}


