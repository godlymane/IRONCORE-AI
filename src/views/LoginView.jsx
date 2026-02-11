import React from 'react';
import { Dumbbell, Activity, ShieldCheck, Sparkles, Zap, Target } from 'lucide-react';

export const LoginView = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-15%] w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(220, 38, 38, 0.3) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-[-20%] right-[-15%] w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(185, 28, 28, 0.25) 0%, transparent 70%)',
            animationDelay: '1s',
          }}
        />
        <div
          className="absolute top-[30%] right-[-10%] w-[300px] h-[300px] rounded-full blur-[100px] animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(249, 115, 22, 0.15) 0%, transparent 70%)',
            animationDelay: '0.5s',
          }}
        />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Main Content */}
      <div className="z-10 text-center space-y-8 max-w-sm w-full">

        {/* Logo with Glass Effect */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* Glow ring */}
            <div
              className="absolute inset-0 rounded-3xl blur-xl opacity-60"
              style={{
                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.8) 0%, rgba(185, 28, 28, 0.8) 100%)',
                transform: 'scale(1.2)',
              }}
            />
            {/* Glass container */}
            <div
              className="relative p-5 rounded-3xl"
              style={{
                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
                boxShadow: '0 20px 60px rgba(220, 38, 38, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.2)',
              }}
            >
              <Dumbbell size={52} className="text-white drop-shadow-lg" />
            </div>
          </div>
        </div>

        {/* Title with Gradient */}
        <div className="space-y-3">
          <h1 className="text-5xl font-black italic tracking-tighter uppercase">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #c7d2fe 50%, #a5b4fc 100%)',
              }}
            >
              IronCore
            </span>
          </h1>
          <p
            className="text-sm font-semibold tracking-wide"
            style={{
              background: 'linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AI-Powered Fitness Evolution
          </p>
        </div>

        {/* Feature Cards - Glass Style */}
        <div className="space-y-3 py-6">
          <FeatureCard
            icon={<Zap className="text-yellow-400" size={20} />}
            title="Smart Tracking"
            desc="AI-powered nutrition & workout logging"
            color="yellow"
          />
          <FeatureCard
            icon={<Target className="text-orange-400" size={20} />}
            title="Goal Precision"
            desc="Custom protocols for your body type"
            color="orange"
          />
          <FeatureCard
            icon={<Sparkles className="text-red-400" size={20} />}
            title="AI Coach"
            desc="24/7 personalized guidance & plans"
            color="red"
          />
        </div>

        {/* Sign In Button - Premium Glass */}
        <button
          onClick={onLogin}
          className="relative w-full group overflow-hidden rounded-2xl"
        >
          {/* Shimmer effect */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
              animation: 'shimmer 2s infinite',
            }}
          />

          <div
            className="relative flex items-center justify-center gap-3 py-5 px-8 font-black uppercase tracking-widest text-sm transition-all duration-300 group-hover:scale-[1.02] group-active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
              boxShadow: '0 15px 50px rgba(255, 255, 255, 0.2), 0 5px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
            }}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              className="w-5 h-5"
              alt="Google"
            />
            <span className="text-gray-800">Continue with Google</span>
          </div>
        </button>

        {/* Version Badge */}
        <div className="pt-8">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] text-gray-500 uppercase tracking-widest font-bold">
              v2.0 • Cloud Ready
            </span>
          </div>
        </div>
      </div>

      {/* Add shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

// Glass Feature Card Component
const FeatureCard = ({ icon, title, desc, color }) => (
  <div
    className="relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] group"
    style={{
      background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    }}
  >
    {/* Top shine */}
    <div
      className="absolute top-0 left-0 right-0 h-[50%] rounded-t-2xl pointer-events-none opacity-50"
      style={{
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%)',
      }}
    />

    <div className="relative z-10 flex items-center gap-4">
      <div
        className="p-3 rounded-xl transition-transform duration-300 group-hover:scale-110"
        style={{
          background: `linear-gradient(145deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)`,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {icon}
      </div>
      <div className="text-left">
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
  </div>
);



