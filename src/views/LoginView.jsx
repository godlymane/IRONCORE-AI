import React from 'react';
import { Dumbbell, Activity, ShieldCheck } from 'lucide-react';

export const LoginView = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"/>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-orange-600/20 rounded-full blur-[100px] pointer-events-none"/>

      <div className="z-10 text-center space-y-8 max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-tr from-indigo-600 to-indigo-400 p-4 rounded-3xl shadow-2xl shadow-indigo-500/20">
            <Dumbbell size={48} className="text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Iron Track</h1>
          <p className="text-gray-400 text-sm font-medium">The AI-Powered Fitness Ecosystem</p>
        </div>

        <div className="space-y-4 py-8">
            <Feature icon={<Activity className="text-orange-400"/>} text="Smart Cardio & Lift Tracking" />
            <Feature icon={<ShieldCheck className="text-green-400"/>} text="Secure Data Storage" />
            <Feature icon={<Dumbbell className="text-indigo-400"/>} text="AI Coaching & Analytics" />
        </div>

        <button 
          onClick={onLogin}
          className="w-full bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
          Sign in with Google
        </button>
        
        <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-8">Version 1.0.0 • Launch Ready</p>
      </div>
    </div>
  );
};

const Feature = ({icon, text}) => (
    <div className="flex items-center gap-3 bg-gray-900/50 border border-gray-800 p-3 rounded-xl">
        {icon}
        <span className="text-xs font-bold text-gray-300">{text}</span>
    </div>
);