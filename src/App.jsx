import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Flame
} from 'lucide-react';

import { DashboardView } from './views/DashboardView';
import { WorkoutView } from './views/WorkoutView';
import { StatsView } from './views/StatsView';
import { TrackView } from './views/TrackView';
import { CardioView } from './views/CardioView';
import { CoachView } from './views/CoachView';
// import { CommunityView } from './views/CommunityView'; // Replacing with ArenaTab
import { ArenaView } from './views/ArenaView';
import { ProfileHub } from './views/ProfileHub';
import { ChronicleView } from './views/ChronicleView';
import { LoginView } from './views/LoginView';
import { OnboardingView } from './views/OnboardingView';
import { AILabView } from './views/AILabView';
import { NavBtn, ToastProvider, useToast, ThemeToggle, PageTransition, SkeletonCard } from './components/UIComponents';
import { OfflineIndicator } from './components/StatusComponents';
import { SplashScreen, ParticleBackground } from './components/PremiumUI';
import { EliteFlameIcon, EliteSwordsIcon, EliteDumbbellIcon, EliteBrainIcon, EliteHeartIcon, EliteCrownIcon } from './components/EliteIcons';
import { useFitnessData } from './hooks/useFitnessData';
import { ThemeProvider } from './context/ThemeContext';
import { ArenaProvider } from './context/ArenaContext';
import { PremiumProvider } from './context/PremiumContext';
import PremiumPaywall from './components/PremiumPaywall';

// --- MAIN CONTENT WRAPPER ---
const MainContent = () => {
  console.log('App rendering...');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const { addToast } = useToast();

  const {
    user, loading, login, logout, profileLoaded,
    uploadProfilePic, uploadProgressPhoto,
    meals, progress, burned, workouts, profile, photos,
    leaderboard, chat, following, posts, inbox, globalFeed,
    sendMessage, toggleFollow, createPost, sendPrivateMessage,
    updateData, deleteEntry, completeDailyDrop, buyItem, createBattle,
    isStorageReady, battles,
    error
  } = useFitnessData();

  // CHECK FOR ONBOARDING STATUS - Only after profile is loaded from Firestore
  useEffect(() => {
    if (user && profileLoaded && !loading) {
      // If profile is empty OR 'onboarded' is NOT true, show wizard
      const needsOnboarding = Object.keys(profile).length === 0 || !profile.onboarded;
      if (needsOnboarding) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
    }
  }, [user, profile, loading, profileLoaded]);

  const handleOnboardingComplete = async (data) => {
    // Save all wizard data AND the 'onboarded' flag
    await updateData('add', 'profile', {
      ...data,
      onboarded: true,
      lastUpdated: new Date()
    });

    // Also save initial weight to progress history
    if (data.weight) {
      await updateData('add', 'progress', {
        weight: parseFloat(data.weight),
        date: new Date().toISOString().split('T')[0]
      });
    }

    setShowOnboarding(false);
    addToast("Profile Initialized. Welcome to the Team.", "success");
  };

  if (error) return <div className="p-10 text-red-500 text-center font-mono">System Error: {error}</div>;

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (loading) return <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" /><p className="text-xs text-gray-500 font-black uppercase tracking-widest animate-pulse">Syncing Cloud Data...</p></div>;
  if (!user) return <LoginView onLogin={login} />;

  if (showOnboarding) return <OnboardingView user={user} onComplete={handleOnboardingComplete} />;

  const latestWeight = progress.find(p => p.weight)?.weight;

  return (
    <PremiumProvider user={user}>
      <div className="min-h-screen text-gray-100 font-sans selection:bg-red-500/30 pb- safe-area-inset-bottom" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
        {/* Background Particles */}
        <ParticleBackground count={20} />

        {/* Offline Indicator */}
        <OfflineIndicator />

        {/* Premium Paywall Overlay */}
        <PremiumPaywall />

        <div className="max-w-md mx-auto min-h-screen relative shadow-2xl border-x border-gray-900/50 overflow-hidden" style={{ backgroundColor: 'var(--color-background)' }}>

          {/* THEME TOGGLE - TOP RIGHT */}
          <div className="fixed top-4 right-4 z-50 md:absolute md:right-6">
            <ThemeToggle />
          </div>

          {/* VIEWPORT */}
          <div className="p-5 overflow-y-auto h-screen scrollbar-hide pb-32">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <PageTransition key="dashboard">
                  <DashboardView meals={meals} burned={burned} workouts={workouts} updateData={updateData} deleteEntry={deleteEntry} profile={profile} uploadProfilePic={uploadProfilePic} user={user} completeDailyDrop={completeDailyDrop} buyItem={buyItem} isStorageReady={isStorageReady} />
                </PageTransition>
              )}
              {activeTab === 'workout' && (
                <PageTransition key="workout">
                  <WorkoutView workouts={workouts} updateData={updateData} deleteEntry={deleteEntry} />
                </PageTransition>
              )}
              {activeTab === 'chronicle' && (
                <PageTransition key="chronicle">
                  <ChronicleView meals={meals} burned={burned} workouts={workouts} progress={progress} user={user} deleteEntry={deleteEntry} profile={profile} />
                </PageTransition>
              )}
              {activeTab === 'cardio' && (
                <PageTransition key="cardio">
                  <CardioView progress={progress} profile={profile} updateData={updateData} setActiveTab={setActiveTab} />
                </PageTransition>
              )}
              {activeTab === 'arena' && (
                <PageTransition key="arena">
                  <ArenaProvider user={user}>
                    <ArenaView user={user} workouts={workouts} meals={meals} burned={burned} />
                  </ArenaProvider>
                </PageTransition>
              )}
              {activeTab === 'profile' && (
                <PageTransition key="profile">
                  <ProfileHub profile={profile} progress={progress} meals={meals} burned={burned} workouts={workouts} leaderboard={leaderboard} photos={photos} deleteEntry={deleteEntry} uploadProfilePic={uploadProfilePic} uploadProgressPhoto={uploadProgressPhoto} onLogout={logout} isStorageReady={isStorageReady} />
                </PageTransition>
              )}
              {activeTab === 'coach' && (
                <PageTransition key="coach">
                  <CoachView weight={latestWeight} meals={meals} workouts={workouts} profile={profile} />
                </PageTransition>
              )}
              {activeTab === 'ailab' && (
                <PageTransition key="ailab">
                  <AILabView workouts={workouts} meals={meals} profile={profile} updateData={updateData} />
                </PageTransition>
              )}
            </AnimatePresence>
          </div>

          {/* FAB - COACH AI - ELITE RED STYLE */}
          <div className="fixed bottom-28 right-4 z-50 md:absolute md:bottom-32 md:right-6">
            <button
              onClick={() => setActiveTab('coach')}
              className="relative group"
            >
              {/* Outer Glow Ring */}
              <div
                className={`absolute inset-0 rounded-full transition-all duration-500 ${activeTab === 'coach' ? 'scale-125 opacity-100' : 'scale-100 opacity-0 group-hover:scale-110 group-hover:opacity-50'
                  }`}
                style={{
                  background: 'radial-gradient(circle, rgba(220, 38, 38, 0.5) 0%, transparent 70%)',
                  filter: 'blur(10px)',
                }}
              />

              {/* Main Button */}
              <div
                className={`relative p-4 rounded-full transition-all duration-300 transform group-hover:scale-105 active:scale-95 ${activeTab === 'coach' ? 'rotate-12' : ''
                  }`}
                style={{
                  background: activeTab === 'coach'
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)'
                    : 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 1) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: activeTab === 'coach'
                    ? '0 10px 40px rgba(220, 38, 38, 0.5), 0 0 60px rgba(220, 38, 38, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
                    : '0 10px 40px rgba(220, 38, 38, 0.5), 0 0 30px rgba(220, 38, 38, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                }}
              >
                <Flame
                  size={24}
                  fill={activeTab === 'coach' ? 'currentColor' : 'none'}
                  className={`${activeTab === 'coach' ? 'text-red-600' : 'text-white'} ${activeTab === 'coach' ? 'animate-pulse' : ''}`}
                />
              </div>
            </button>
          </div>

          {/* BOTTOM NAV - LIQUID GLASS FLOATING DOCK */}
          <div className="fixed bottom-0 left-0 right-0 z-40 p-3 pb-6 md:pb-4">
            <div className="max-w-md mx-auto">
              {/* Liquid Glass Container */}
              <div
                className="relative rounded-[28px] p-1 overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 50%, rgba(255, 255, 255, 0.05) 100%)',
                  backdropFilter: 'blur(40px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: `
                  0 25px 60px rgba(0, 0, 0, 0.6),
                  0 10px 30px rgba(0, 0, 0, 0.4),
                  0 -5px 30px rgba(220, 38, 38, 0.15),
                  inset 0 2px 0 rgba(220, 38, 38, 0.2),
                  inset 0 -1px 0 rgba(255, 255, 255, 0.05)
                `
                }}
              >
                {/* Top Shine Effect */}
                <div
                  className="absolute top-0 left-0 right-0 h-[50%] rounded-t-[28px] pointer-events-none"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%)',
                  }}
                />

                {/* Animated Shimmer */}
                <div
                  className="absolute inset-0 pointer-events-none overflow-hidden rounded-[28px]"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.03) 45%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.03) 55%, transparent 100%)',
                    animation: 'liquid-shimmer 8s ease-in-out infinite',
                    transform: 'translateX(-100%)',
                  }}
                />

                {/* Nav Items Grid */}
                <div className="relative z-10 grid grid-cols-6 gap-0">
                  <NavBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<EliteFlameIcon active={activeTab === 'dashboard'} size={22} />} label="Home" />
                  <NavBtn active={activeTab === 'arena'} onClick={() => setActiveTab('arena')} icon={<EliteSwordsIcon active={activeTab === 'arena'} size={22} />} label="Arena" />
                  <NavBtn active={activeTab === 'workout'} onClick={() => setActiveTab('workout')} icon={<EliteDumbbellIcon active={activeTab === 'workout'} size={22} />} label="Lift" />
                  <NavBtn active={activeTab === 'ailab'} onClick={() => setActiveTab('ailab')} icon={<EliteBrainIcon active={activeTab === 'ailab'} size={22} />} label="AI Lab" />
                  <NavBtn active={activeTab === 'cardio'} onClick={() => setActiveTab('cardio')} icon={<EliteHeartIcon active={activeTab === 'cardio'} size={22} />} label="Pulse" />
                  <NavBtn active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<EliteCrownIcon active={activeTab === 'profile'} size={22} />} label="Me" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PremiumProvider>
  );
};

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
      return <div className="p-10 text-red-500"><h1>Something went wrong.</h1><pre>{this.state.error.toString()}</pre></div>;
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


