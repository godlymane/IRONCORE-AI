import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Dumbbell, 
  User, HeartPulse, Sparkles, Users, Activity
} from 'lucide-react';

import { DashboardView } from './views/DashboardView';
import { WorkoutView } from './views/WorkoutView';
import { StatsView } from './views/StatsView';
import { TrackView } from './views/TrackView';
import { CardioView } from './views/CardioView';
import { CoachView } from './views/CoachView';
import { CommunityView } from './views/CommunityView';
import { ProfileHub } from './views/ProfileHub';
import { ChronicleView } from './views/ChronicleView'; 
import { LoginView } from './views/LoginView';
import { OnboardingView } from './views/OnboardingView'; // NEW
import { NavBtn, ToastProvider, useToast } from './components/UIComponents';
import { useFitnessData } from './hooks/useFitnessData';

// --- MAIN CONTENT WRAPPER ---
const MainContent = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { addToast } = useToast();
  
  const { 
    user, loading, login, logout, 
    uploadProfilePic, uploadProgressPhoto,
    meals, progress, burned, workouts, profile, photos, 
    leaderboard, chat, following, posts, inbox, globalFeed,
    sendMessage, toggleFollow, createPost, sendPrivateMessage, 
    updateData, deleteEntry, completeDailyDrop, buyItem, createBattle,
    isStorageReady, battles,
    error 
  } = useFitnessData();

  // Check for onboarding status
  useEffect(() => {
    if (user && profile && !loading) {
       // If profile exists but has no goal set, show onboarding
       // Or we can add a specific 'onboarded' flag
       if (!profile.goal && !profile.onboarded) {
          setShowOnboarding(true);
       }
    }
  }, [user, profile, loading]);

  const handleOnboardingComplete = async (data) => {
    await updateData('add', 'profile', { ...data, onboarded: true });
    setShowOnboarding(false);
    addToast("Profile Initialized. Welcome to the Team.", "success");
  };

  if (error) return <div className="p-10 text-red-500 text-center font-mono">System Error: {error}</div>;
  if (loading) return <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"/><p className="text-xs text-gray-500 font-black uppercase tracking-widest animate-pulse">Syncing Cloud Data...</p></div>;
  if (!user) return <LoginView onLogin={login} />;
  
  if (showOnboarding) return <OnboardingView user={user} onComplete={handleOnboardingComplete} />;

  const latestWeight = progress.find(p => p.weight)?.weight;

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-indigo-500/30 pb- safe-area-inset-bottom">
      <div className="max-w-md mx-auto min-h-screen relative shadow-2xl bg-black border-x border-gray-900 overflow-hidden">
        
        {/* VIEWPORT */}
        <div className="p-5 overflow-y-auto h-screen scrollbar-hide pb-32">
          {activeTab === 'dashboard' && <DashboardView meals={meals} burned={burned} workouts={workouts} updateData={updateData} deleteEntry={deleteEntry} profile={profile} uploadProfilePic={uploadProfilePic} user={user} completeDailyDrop={completeDailyDrop} buyItem={buyItem} isStorageReady={isStorageReady} />}
          {activeTab === 'workout' && <WorkoutView workouts={workouts} updateData={updateData} deleteEntry={deleteEntry} />}
          {activeTab === 'chronicle' && <ChronicleView meals={meals} burned={burned} workouts={workouts} progress={progress} user={user} deleteEntry={deleteEntry} profile={profile} />}
          {activeTab === 'cardio' && <CardioView progress={progress} profile={profile} updateData={updateData} setActiveTab={setActiveTab} />}
          
          {activeTab === 'community' && <CommunityView leaderboard={leaderboard} profile={profile} updateData={updateData} workouts={workouts} setActiveTab={setActiveTab} chat={chat} sendMessage={sendMessage} following={following} toggleFollow={toggleFollow} user={user} posts={posts} createPost={createPost} sendPrivateMessage={sendPrivateMessage} inbox={inbox} globalFeed={globalFeed} isStorageReady={isStorageReady} battles={battles} createBattle={createBattle} />}
          
          {activeTab === 'profile' && <ProfileHub profile={profile} progress={progress} meals={meals} burned={burned} workouts={workouts} leaderboard={leaderboard} photos={photos} deleteEntry={deleteEntry} uploadProfilePic={uploadProfilePic} uploadProgressPhoto={uploadProgressPhoto} onLogout={logout} isStorageReady={isStorageReady} />}
          
          {activeTab === 'coach' && <CoachView weight={latestWeight} meals={meals} workouts={workouts} profile={profile} />}
        </div>

        {/* FAB - COACH AI */}
        <div className="fixed bottom-24 right-4 z-50 md:absolute md:bottom-28 md:right-6">
            <button onClick={() => setActiveTab('coach')} className={`p-4 rounded-full shadow-2xl shadow-indigo-500/40 transition-all transform hover:scale-110 active:scale-95 border-2 border-indigo-400 ${activeTab === 'coach' ? 'bg-white text-indigo-600 rotate-12' : 'bg-indigo-600 text-white'}`}>
                <Sparkles size={24} fill="currentColor" className={activeTab === 'coach' ? "animate-pulse" : ""}/>
            </button>
        </div>

        {/* BOTTOM NAV */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-950/90 backdrop-blur-xl border-t border-gray-800 p-2 z-40 pb-6 md:pb-4">
           <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
              <NavBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Home" />
              <NavBtn active={activeTab === 'community'} onClick={() => setActiveTab('community')} icon={<Users size={20} />} label="Arena" />
              <NavBtn active={activeTab === 'workout'} onClick={() => setActiveTab('workout')} icon={<Dumbbell size={20} />} label="Lift" />
              <NavBtn active={activeTab === 'cardio'} onClick={() => setActiveTab('cardio')} icon={<HeartPulse size={20} />} label="Pulse" />
              <NavBtn active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={20} />} label="Me" />
           </div>
        </div>
      </div>
    </div>
  );
};

// --- APP ENTRY POINT ---
export default function App() {
  return (
    <ToastProvider>
       <MainContent />
    </ToastProvider>
  );
}