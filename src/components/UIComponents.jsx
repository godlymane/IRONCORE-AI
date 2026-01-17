import React, { createContext, useContext, useState } from 'react';
import { X, Check, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { SFX } from '../utils/audio';

// --- TOAST CONTEXT ---
const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    
    // Simple Audio Cue logic if SFX exists
    if (SFX?.click) SFX.click();
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`pointer-events-auto max-w-sm mx-auto w-full animate-in slide-in-from-top-5 fade-in duration-300 flex items-center gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-md border border-white/10 ${
              t.type === 'success' ? 'bg-green-500/90 text-white shadow-green-900/20' :
              t.type === 'error' ? 'bg-red-500/90 text-white shadow-red-900/20' :
              'bg-gray-900/90 text-gray-200 shadow-black/50'
            }`}
          >
            {t.type === 'success' && <Check size={18} className="text-white fill-white/20"/>}
            {t.type === 'error' && <AlertTriangle size={18} className="text-white fill-white/20"/>}
            {t.type === 'info' && <Info size={18} className="text-blue-400"/>}
            <p className="text-xs font-bold flex-grow">{t.msg}</p>
            <button onClick={() => removeToast(t.id)}><X size={14} className="opacity-50 hover:opacity-100"/></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

// --- SKELETON LOADER ---
export const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-800/50 rounded-xl ${className}`}></div>
);

// --- BUTTON COMPONENT ---
export const Button = ({ children, onClick, className = "", variant = "primary", disabled = false, loading = false }) => {
  const handleClick = (e) => {
    if (disabled || loading) return;
    if (navigator.vibrate) navigator.vibrate(10); 
    if (SFX?.click) SFX.click();
    onClick && onClick(e);
  };

  const styles = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 border-t border-white/10",
    secondary: "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700",
    cyan: "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/40",
    danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20",
    ghost: "bg-transparent hover:bg-gray-800 text-gray-400 hover:text-white"
  };

  return (
    <button 
      onClick={handleClick} 
      disabled={disabled || loading} 
      className={`relative overflow-hidden px-4 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 ${styles[variant]} ${className}`}
    >
      {loading ? <Loader2 className="animate-spin w-4 h-4"/> : children}
    </button>
  );
};

export const Card = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-3xl p-5 shadow-xl transition-all hover:border-indigo-500/30 ${className}`}>
    {children}
  </div>
);

export const MacroBadge = ({ label, value, color }) => (
    <div className={`bg-gray-900/80 border border-${color}-500/20 p-2 rounded-xl text-center min-w-[70px]`}>
        <p className={`text-[9px] uppercase font-bold text-${color}-400`}>{label}</p>
        <p className="text-sm font-black text-white">{value}g</p>
    </div>
);

// --- UPDATED NAV BTN WITH HOVER EFFECT ---
export const NavBtn = ({ active, onClick, icon, label }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (navigator.vibrate) navigator.vibrate(5);
    onClick();
  };

  return (
    <button 
      onClick={handleClick} 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex flex-col items-center gap-1 min-w-[50px] transition-all duration-300 ${active ? 'text-indigo-400 scale-110' : isHovered ? 'text-purple-400 scale-105' : 'text-gray-600'}`}
    >
      <div className={`p-2 rounded-2xl transition-colors ${active ? 'bg-indigo-500/10' : isHovered ? 'bg-purple-500/10' : 'bg-transparent'}`}>
        {icon}
      </div>
      <span className={`text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${isHovered ? 'text-purple-400' : ''}`}>
        {isHovered ? "LET'S WORK" : label}
      </span>
    </button>
  );
};