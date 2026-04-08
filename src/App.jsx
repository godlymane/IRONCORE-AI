import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';

// Static imports — needed before auth resolves
import { PlayerCardView } from './views/PlayerCardView';
import { LoginScreen } from './views/LoginScreen';
import { RecoveryView } from './views/RecoveryView';
import { PinEntryView } from './views/PinEntryView';
import { OnboardingView } from './views/OnboardingView';

// Lazy-loaded views — only fetched when user navigates to tab
const DashboardView = React.lazy(() => import('./views/DashboardView').then(m => ({ default: m.DashboardView })));
const TrainView = React.lazy(() => import('./views/TrainView').then(m => ({ default: m.TrainView })));
const ArenaView = React.lazy(() => import('./views/ArenaView').then(m => ({ default: m.ArenaView })));
const ProfileHub = React.lazy(() => import('./views/ProfileHub').then(m => ({ default: m.ProfileHub })));
const AILabView = React.lazy(() => import('./views/AILabView').then(m => ({ default: m.AILabView })));
const AchievementsView = React.lazy(() => import('./views/AchievementsView').then(m => ({ default: m.AchievementsView })));
const GhostMatchView = React.lazy(() => import('./views/GhostMatchView').then(m => ({ default: m.GhostMatchView })));

import { NavBtn, ToastProvider, useToast, SkeletonCard } from './components/UIComponents';
import { OfflineIndicator } from './components/StatusComponents';
import { PullToRefresh } from './components/PremiumUI';
import AmbientFX from './components/AmbientFX';
import VoiceCoach from './components/VoiceCoach';
import { DashboardSkeleton, WorkoutSkeleton, ArenaSkeleton, ProfileSkeleton, AILabSkeleton } from './components/ViewSkeletons';
import { EliteFlameIcon, EliteSwordsIcon, EliteDumbbellIcon, EliteBrainIcon, EliteCrownIcon } from './components/EliteIcons';
import { useFitnessData } from './hooks/useFitnessData';
import { useStore } from './hooks/useStore';
import { useIsMobile } from './hooks/useIsMobile';
import { useScrollIntoView } from './hooks/useScrollIntoView';
import { SFX, Haptics } from './utils/audio';
import { initKeyboardHandling } from './utils/keyboardSetup';
import { ThemeProvider } from './context/ThemeContext';
// ArenaProvider removed — Arena now uses useFitnessData leaderboard directly
import { PremiumProvider } from './context/PremiumContext';
import PaywallModal from './components/PaywallModal';
import { ExpBar } from './components/Gamification/ExpBar';
import { ForgeHUD } from './components/Gamification/ForgeHUD';
import * as Sentry from '@sentry/react';

// Tab order for directional page transitions
const TAB_ORDER = { dashboard: 0, arena: 1, train: 2, ailab: 3, profile: 4 };
const TAB_KEYS = ['dashboard', 'arena', 'train', 'ailab', 'profile'];

// --- MAIN CONTENT WRAPPER ---
const MainContent = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [authGate, setAuthGate] = useState('checking'); // checking | card | login | recovery | biometric | pin | pin_setup | passed
  const authGateResolved = useRef(false);
  const isMobile = useIsMobile();
  const { addToast } = useToast();

  const {
    user, loading, profileLoaded, profileExists, dataLoaded,
    meals, progress, burned, workouts, profile, photos,
    leaderboard, chat, following, posts, inbox, globalFeed,
    battles, error, setActiveTab: setStoreActiveTab
  } = useStore();

  const {
    logout, uploadProfilePic, uploadProgressPhoto,
    sendMessage, toggleFollow, createPost, sendPrivateMessage,
    updateData, deleteEntry, completeDailyDrop, buyItem, createBattle,
    isStorageReady, refreshData, clearError
  } = useFitnessData();

  // LOGOUT DETECTION — reset auth gate when user signs out while app is active
  useEffect(() => {
    if (!loading && !user && authGate === 'passed') {
      authGateResolved.current = false;
      const savedUid = localStorage.getItem('ironcore_uid');
      const savedUser = localStorage.getItem('ironcore_username');
      setAuthGate(savedUid && savedUser ? 'login' : 'card');
    }
  }, [user, loading, authGate]);

  // AUTH GATE — decide initial auth screen once Firebase auth resolves
  useEffect(() => {
    if (loading || authGateResolved.current) return;

    if (!user) {
      // Check if there's a saved uid — returning user whose session expired
      const savedUid = localStorage.getItem('ironcore_uid');
      const savedUser = localStorage.getItem('ironcore_username');
      setAuthGate(savedUid && savedUser ? 'login' : 'card');
      authGateResolved.current = true;
      return;
    }

    authGateResolved.current = true;

    // Returning user — check for PIN/biometric gate
    const storedPin = localStorage.getItem(`ironcore_pin_${user.uid}`);
    if (!storedPin) {
      // No PIN on this device — skip gate
      setAuthGate('passed');
      return;
    }

    // Try biometric first, fall back to PIN
    (async () => {
      try {
        const { isBiometricAvailable, authenticateWithBiometrics } = await import('./utils/biometrics');
        const available = await isBiometricAvailable();
        if (available) {
          const success = await authenticateWithBiometrics('Unlock IronCore');
          if (success) {
            Haptics.success();
            setAuthGate('passed');
            return;
          }
        }
      } catch {}
      setAuthGate('pin');
    })();
  }, [user, loading]);

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
  const rafRef = useRef(null);

  const handleScroll = useCallback((e) => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
        const currentY = e.target.scrollTop;
        if (currentY < 50) { setNavVisible(true); }
        else if (currentY > lastScrollY.current + 10) { setNavVisible(false); }
        else if (currentY < lastScrollY.current - 10) { setNavVisible(true); }
        lastScrollY.current = currentY;
        rafRef.current = null;
    });
  }, []);

  // Instant tab switching — no animation delay
  const handleTabChange = useCallback((newTab) => {
    setActiveTab(newTab);
    setNavVisible(true);
    SFX.pageTransition();
  }, []);

  // Edge-only swipe navigation — only triggers when swipe starts within 30px of screen edge
  const touchRef = useRef({ startX: 0, startY: 0, startTime: 0, edgeSwipe: false });
  const viewportRef = useRef(null);

  useScrollIntoView(viewportRef);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const EDGE_ZONE = 30; // px from screen edge

    const onTouchStart = (e) => {
      const x = e.touches[0].clientX;
      const screenW = window.innerWidth;
      touchRef.current = {
        startX: x,
        startY: e.touches[0].clientY,
        startTime: Date.now(),
        edgeSwipe: x < EDGE_ZONE || x > screenW - EDGE_ZONE,
      };
    };

    const onTouchEnd = (e) => {
      if (!touchRef.current.edgeSwipe) return; // ignore non-edge swipes
      const dx = e.changedTouches[0].clientX - touchRef.current.startX;
      const dy = e.changedTouches[0].clientY - touchRef.current.startY;
      const dt = Date.now() - touchRef.current.startTime;
      // Horizontal swipe > vertical, minimum 80px or fast flick 50px
      if (Math.abs(dx) > Math.abs(dy) * 2 && (Math.abs(dx) > 80 || (Math.abs(dx) > 50 && dt < 250))) {
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

  // Configure status bar + keyboard on native platforms
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: Style.Dark });
        StatusBar.setBackgroundColor({ color: '#000000' });
        StatusBar.setOverlaysWebView({ overlay: true });
      }).catch(() => { });

      // Initialize keyboard handling for native
      initKeyboardHandling();
    }
  }, []);

  // Prefetch likely next views after dashboard loads
  useEffect(() => {
    if (!user || loading) return;
    const timer = setTimeout(() => {
      import('./views/TrainView');
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

  if (loading || authGate === 'checking') return <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4" aria-busy="true" aria-live="polite" role="status"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" /><p className="text-xs text-gray-500 font-black uppercase tracking-widest animate-pulse">Syncing Cloud Data...</p></div>;

  // AUTH GATE — new Web3-style Player Card flow
  if (authGate === 'card') return <PlayerCardView onComplete={() => setAuthGate('passed')} onLogin={() => setAuthGate('login')} />;
  if (authGate === 'login') return (
    <LoginScreen
      defaultUsername={localStorage.getItem('ironcore_username') || ''}
      onLoggedIn={() => {
        authGateResolved.current = true; // login already verified PIN server-side
        setAuthGate('passed');
      }}
      onBack={() => setAuthGate('card')}
      onRecovery={() => setAuthGate('recovery')}
    />
  );
  if (authGate === 'recovery') return (
    <RecoveryView
      onRecovered={() => {
        // After recovery, set up PIN on this new device
        authGateResolved.current = true; // prevent auth gate effect from overriding
        const uid = localStorage.getItem('ironcore_uid');
        const hasPin = uid && localStorage.getItem(`ironcore_pin_${uid}`);
        setAuthGate(hasPin ? 'passed' : 'pin_setup');
      }}
      onBack={() => setAuthGate('card')}
    />
  );
  if (authGate === 'pin') return (
    <PinEntryView
      mode="verify"
      storedPinHash={localStorage.getItem(`ironcore_pin_${user?.uid || localStorage.getItem('ironcore_uid')}`)}
      onComplete={() => { Haptics.success(); setAuthGate('passed'); }}
      onForgot={() => setAuthGate('recovery')}
    />
  );
  if (authGate === 'pin_setup') return (
    <PinEntryView
      mode="setup"
      onComplete={(hashedPin) => {
        const uid = user?.uid || localStorage.getItem('ironcore_uid');
        if (uid) localStorage.setItem(`ironcore_pin_${uid}`, hashedPin);
        authGateResolved.current = true;
        Haptics.success();
        setAuthGate('passed');
      }}
    />
  );
  if (authGate !== 'passed') return <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4" aria-busy="true" role="status"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" /><span className="sr-only">Authenticating...</span></div>;

  // Wait for Firestore profile to load before deciding onboarding — prevents flash
  if (!profileLoaded) return <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4" aria-busy="true" aria-live="polite" role="status"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" /><p className="text-xs text-gray-500 font-black uppercase tracking-widest animate-pulse">Loading Profile...</p></div>;

  if (showOnboarding) return <OnboardingView user={user} onComplete={handleOnboardingComplete} />;

  const latestWeight = progress.find(p => p.weight)?.weight;

  return (
    <PremiumProvider user={user}>
      <div className="min-h-screen text-gray-100 font-sans selection:bg-red-500/30 pb-safe-area-inset-bottom" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
        {/* Background Ambient Living Light — disabled on mobile for performance */}
        {!isMobile && <AmbientFX count={15} />}

        {/* Offline Indicator */}
        <OfflineIndicator />

        {/* Premium Paywall Overlay */}
        <PaywallModal />

        <div className="max-w-md mx-auto min-h-screen relative shadow-2xl overflow-hidden md:border-x md:border-gray-900/50" style={{ backgroundColor: 'var(--color-background)' }}>

          {/* GAMIFICATION HUD — Global EXP Bar + Forge Counter */}
          <div className="sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)]" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 70%, transparent 100%)' }}>
            <div className="px-3 pt-1 pb-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 pt-1">
                  <ExpBar xp={profile?.xp || 0} />
                </div>
                <ForgeHUD
                  currentForge={profile?.currentForge ?? profile?.currentStreak ?? 0}
                  longestForge={profile?.longestForge ?? profile?.longestStreak ?? 0}
                  forgeShieldCount={profile?.forgeShieldCount ?? profile?.streakFreezeCount ?? 0}
                />
              </div>
            </div>
          </div>

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
              role="tabpanel"
              id={`tabpanel-${activeTab}`}
              aria-label={`${activeTab} content`}
              className="p-5 overflow-y-auto overflow-x-hidden scrollbar-hide"
              style={{ height: '100dvh', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
            >
              {activeTab === 'dashboard' && (
                  <ViewErrorBoundary viewName="Dashboard">
                    <SuspenseWithTimeout fallback={<DashboardSkeleton />}>
                      <DashboardView meals={meals} burned={burned} workouts={workouts} updateData={updateData} deleteEntry={deleteEntry} profile={profile} uploadProfilePic={uploadProfilePic} user={user} completeDailyDrop={completeDailyDrop} buyItem={buyItem} isStorageReady={isStorageReady} dataLoaded={dataLoaded} />
                    </SuspenseWithTimeout>
                  </ViewErrorBoundary>
              )}
              {activeTab === 'train' && (
                  <ViewErrorBoundary viewName="Train">
                    <SuspenseWithTimeout fallback={<WorkoutSkeleton />}>
                      <TrainView />
                    </SuspenseWithTimeout>
                  </ViewErrorBoundary>
              )}
              {activeTab === 'arena' && (
                  <ViewErrorBoundary viewName="Arena">
                    <SuspenseWithTimeout fallback={<ArenaSkeleton />}>
                      <ArenaView user={user} workouts={workouts} meals={meals} burned={burned} leaderboard={leaderboard} profile={profile} chat={chat} sendMessage={sendMessage} battles={battles} createBattle={createBattle} />
                    </SuspenseWithTimeout>
                  </ViewErrorBoundary>
              )}
              {activeTab === 'profile' && (
                  <ViewErrorBoundary viewName="Profile">
                    <SuspenseWithTimeout fallback={<ProfileSkeleton />}>
                      <ProfileHub deleteEntry={deleteEntry} onLogout={logout} />
                    </SuspenseWithTimeout>
                  </ViewErrorBoundary>
              )}
              {activeTab === 'ailab' && (
                  <ViewErrorBoundary viewName="AI Lab">
                    <SuspenseWithTimeout fallback={<AILabSkeleton />}>
                      <AILabView workouts={workouts} meals={meals} profile={profile} updateData={updateData} weight={latestWeight} />
                    </SuspenseWithTimeout>
                  </ViewErrorBoundary>
              )}
            </div>
          </PullToRefresh>



          {/* Voice Coach — only on dashboard, positioned above nav */}
          {activeTab === 'dashboard' && <VoiceCoach updateData={updateData} />}
          {/* BOTTOM NAV - LIQUID GLASS FLOATING DOCK */}
          <motion.div
            data-nav="bottom"
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
                    width: `calc((100% - 8px) / 5)`,
                    height: '80%',
                    top: '10%',
                  }}
                  animate={{
                    left: `calc(${TAB_ORDER[activeTab]} * (100% - 8px) / 5 + 4px)`,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />

                {/* Nav Items Grid */}
                <div className="relative z-10 grid grid-cols-5 gap-0" role="tablist" aria-label="Main navigation">
                  <NavBtn active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} icon={<EliteFlameIcon active={activeTab === 'dashboard'} size={22} />} label="Home" controls="tabpanel-dashboard" />
                  <NavBtn active={activeTab === 'arena'} onClick={() => handleTabChange('arena')} icon={<EliteSwordsIcon active={activeTab === 'arena'} size={22} />} label="Arena" controls="tabpanel-arena" />
                  <NavBtn active={activeTab === 'train'} onClick={() => handleTabChange('train')} icon={<EliteDumbbellIcon active={activeTab === 'train'} size={22} />} label="Train" controls="tabpanel-train" />
                  <NavBtn active={activeTab === 'ailab'} onClick={() => handleTabChange('ailab')} icon={<EliteBrainIcon active={activeTab === 'ailab'} size={22} />} label="AI" controls="tabpanel-ailab" />
                  <NavBtn active={activeTab === 'profile'} onClick={() => handleTabChange('profile')} icon={<EliteCrownIcon active={activeTab === 'profile'} size={22} />} label="Me" controls="tabpanel-profile" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PremiumProvider>
  );
};

// Suspense wrapper with timeout — shows error UI only if the JS chunk fails to load
// Uses a longer timeout (30s) to avoid false positives during slow data fetches
const SuspenseWithTimeout = ({ fallback, children, timeoutMs = 30000 }) => {
  const [timedOut, setTimedOut] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (loaded) return; // Don't timeout after chunk has loaded
    setTimedOut(false);
    const timer = setTimeout(() => { if (!loaded) setTimedOut(true); }, timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs, loaded]);

  if (timedOut && !loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <span className="text-2xl">!</span>
        </div>
        <h3 className="text-lg font-black text-white uppercase">Load Timeout</h3>
        <p className="text-xs text-gray-500 max-w-xs">This view took too long to load. Check your connection.</p>
        <button
          onClick={() => { setTimedOut(false); setLoaded(false); }}
          className="px-6 py-2 rounded-xl text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)' }}
        >
          Retry
        </button>
      </div>
    );
  }

  const handleLoaded = React.useCallback(() => setLoaded(true), []);

  return (
    <React.Suspense fallback={fallback}>
      <SuspenseLoadedMarker onLoaded={handleLoaded} />
      {children}
    </React.Suspense>
  );
};

// Tiny component that fires onLoaded once when mounted (meaning Suspense resolved)
const SuspenseLoadedMarker = ({ onLoaded }) => {
  const fired = React.useRef(false);
  React.useEffect(() => {
    if (!fired.current) {
      fired.current = true;
      onLoaded();
    }
  }, [onLoaded]);
  return null;
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
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo?.componentStack } },
      tags: { view: this.props.viewName || 'unknown' },
    });
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
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo?.componentStack } },
      tags: { boundary: 'app-root' },
    });
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

