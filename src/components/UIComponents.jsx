import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Check, AlertTriangle, Info, Loader2, Image, History, Swords, Dumbbell } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { SFX } from '../utils/audio';
import { useIsMobile } from '../hooks/useIsMobile';

// --- ANIMATION VARIANTS ---
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } }
};

// --- TOAST CONTEXT ---
const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timeoutIdsRef = useRef(new Map());

  // Clear all pending timeouts on unmount
  useEffect(() => {
    const timeoutIds = timeoutIdsRef.current;
    return () => {
      timeoutIds.forEach((tid) => clearTimeout(tid));
      timeoutIds.clear();
    };
  }, []);

  const addToast = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    const tid = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timeoutIdsRef.current.delete(id);
    }, 3000);
    timeoutIdsRef.current.set(id, tid);
    SFX?.click?.();
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const tid = timeoutIdsRef.current.get(id);
    if (tid) {
      clearTimeout(tid);
      timeoutIdsRef.current.delete(id);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none" role="region" aria-label="Notifications" aria-live="assertive" style={{ top: 'calc(env(safe-area-inset-top, 16px) + 4px)' }}>
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              role="alert"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className={`pointer-events-auto max-w-sm mx-auto w-full flex items-center gap-3 p-4 rounded-2xl shadow-2xl border ${t.type === 'success' ? 'bg-green-500/95 text-white border-green-400/30' :
                t.type === 'error' ? 'bg-red-600/95 text-white border-red-500/30' :
                  'bg-black/95 text-gray-200 border-red-500/20'
                }`}
            >
              {t.type === 'success' && <Check size={18} className="text-white" />}
              {t.type === 'error' && <AlertTriangle size={18} className="text-white" />}
              {t.type === 'info' && <Info size={18} className="text-red-400" />}
              <p className="text-xs font-bold flex-grow">{t.msg}</p>
              <button onClick={() => removeToast(t.id)} aria-label="Dismiss notification"><X size={14} className="opacity-50 hover:opacity-100 transition-opacity" /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

// --- SKELETON LOADERS ---
export const Skeleton = ({ className, variant = 'default' }) => {
  const variants = {
    default: 'rounded-xl',
    circle: 'rounded-full',
    text: 'rounded-md h-4',
    card: 'rounded-3xl h-32',
    avatar: 'rounded-full w-12 h-12',
  };

  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-800/50 via-gray-700/50 to-gray-800/50 bg-[length:200%_100%] ${variants[variant]} ${className}`}
      style={{ animation: 'skeleton-loading 1.5s ease-in-out infinite' }}
    />
  );
};

export const SkeletonCard = () => (
  <div className="p-5 rounded-3xl backdrop-blur-xl border border-white/5 bg-white/[0.02]">
    <div className="flex items-center gap-3 mb-4">
      <Skeleton variant="avatar" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-20 w-full rounded-2xl" />
  </div>
);

// --- PAGE TRANSITION WRAPPER (Cinematic Direction-aware) ---
export const PageTransition = ({ children, className = '', direction = 0 }) => (
  <motion.div
    initial={{ opacity: 0, x: direction * 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: direction * -20 }}
    transition={{ duration: 0.15, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

// --- EMPTY STATES ---
export const EmptyState = ({ type = 'default', title, description, action, isMobile: isMobileProp }) => {
  const isMobileHook = useIsMobile();
  const isMobile = isMobileProp !== undefined ? isMobileProp : isMobileHook;
  const configs = {
    gallery: {
      icon: <Image size={48} className="text-red-400/50" />,
      title: title || 'No Progress Photos Yet',
      description: description || 'Start documenting your fitness journey by adding your first progress photo.',
      gradient: 'from-red-500/10 to-purple-500/10',
    },
    history: {
      icon: <History size={48} className="text-cyan-400/50" />,
      title: title || 'No Workout History',
      description: description || 'Complete your first workout to start building your training history.',
      gradient: 'from-cyan-500/10 to-red-500/10',
    },
    arena: {
      icon: <Swords size={48} className="text-orange-400/50" />,
      title: title || 'No Active Battles',
      description: description || 'Challenge other athletes in the Arena to test your limits!',
      gradient: 'from-orange-500/10 to-red-500/10',
    },
    workouts: {
      icon: <Dumbbell size={48} className="text-green-400/50" />,
      title: title || 'No Exercises Added',
      description: description || 'Add exercises to build your workout session.',
      gradient: 'from-green-500/10 to-emerald-500/10',
    },
    default: {
      icon: <Info size={48} className="text-gray-400/50" />,
      title: title || 'Nothing Here Yet',
      description: description || 'This section is empty.',
      gradient: 'from-gray-500/10 to-gray-600/10',
    },
  };

  const config = configs[type] || configs.default;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={`flex flex-col items-center justify-center p-8 rounded-3xl bg-gradient-to-br ${config.gradient} backdrop-blur-xl border border-white/5`}
    >
      <motion.div
        animate={isMobile ? {} : { y: [0, -5, 0] }}
        transition={isMobile ? {} : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="mb-4 p-4 rounded-2xl bg-white/5"
      >
        {config.icon}
      </motion.div>
      <h3 className="text-lg font-bold text-white/90 mb-2">{config.title}</h3>
      <p className="text-sm text-white/50 text-center max-w-xs mb-4">{config.description}</p>
      {action && (
        <Button onClick={action.onClick} variant="primary" className="mt-2">
          {action.label}
        </Button>
      )}
    </motion.div>
  );
};

// --- BUTTON COMPONENT ---
export const Button = ({ children, onClick, className = "", variant = "primary", disabled = false, loading = false, isMobile: isMobileProp }) => {
  const isMobileHook = useIsMobile();
  const isMobile = isMobileProp !== undefined ? isMobileProp : isMobileHook;
  const handleClick = (e) => {
    if (disabled || loading) return;
    if (navigator.vibrate) navigator.vibrate(10);
    if (SFX?.click) SFX.click();
    onClick && onClick(e);
  };

  const getButtonStyles = () => {
    // Skip backdrop-blur on mobile for performance
    const baseStyles = isMobile ? {} : {
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.9) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 10px 30px rgba(220, 38, 38, 0.4), 0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        };
      case 'secondary':
        return {
          ...baseStyles,
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
          border: '1px solid rgba(220, 38, 38, 0.15)',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        };
      case 'cyan':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.95) 0%, rgba(217, 119, 6, 0.9) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 10px 30px rgba(245, 158, 11, 0.35), 0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        };
      case 'danger':
        return {
          ...baseStyles,
          background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.08) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        };
      case 'ghost':
        return {
          ...baseStyles,
          background: 'transparent',
          border: '1px solid transparent',
          boxShadow: 'none',
        };
      default:
        return baseStyles;
    }
  };

  const textColors = {
    primary: "text-white",
    secondary: "text-gray-200",
    cyan: "text-white",
    danger: "text-red-400",
    ghost: "text-gray-400 hover:text-white"
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97, filter: 'brightness(1.2)' }}
      className={`group relative overflow-hidden px-5 py-3 rounded-2xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-300 ${textColors[variant]} ${className}`}
      style={getButtonStyles()}
    >
      {/* Light Sweep Effect */}
      <div
        className="absolute inset-0 -translate-x-full group-hover:animate-[sweep_1.5s_ease-in-out_infinite] opacity-0 group-hover:opacity-100 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
          transform: 'skewX(-20deg)',
          width: '50%'
        }}
      />
      {loading ? <Loader2 className="animate-spin w-4 h-4" /> : children}
    </motion.button>
  );
};

// --- GLASS CARD ---
export const Card = ({ children, className = "", onClick, isMobile: isMobileProp }) => {
  const isMobileHook = useIsMobile();
  const isMobile = isMobileProp !== undefined ? isMobileProp : isMobileHook;
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: onClick ? 1.01 : 1, y: onClick ? -2 : 0 }}
      transition={{ duration: 0.3 }}
      className={`relative overflow-hidden rounded-3xl p-5 cursor-${onClick ? 'pointer' : 'default'} ${className}`}
      style={isMobile ? {
        background: 'rgba(15, 15, 15, 0.92)',
        border: '1px solid rgba(220, 38, 38, 0.12)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
      } : {
        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 50%, rgba(255, 255, 255, 0.02) 100%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(220, 38, 38, 0.12)',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      }}
    >
      {!isMobile && <div className="absolute top-0 left-0 right-0 h-[40%] rounded-t-3xl pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, transparent 100%)' }} />}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

// --- CONSOLIDATED GLASS CARD ---
// Single source of truth for all glass card styling across the app
export const GlassCard = ({ children, className = "", onClick, highlight = false, animated = false, isMobile: isMobileProp }) => {
  // Detect mobile once — skip GPU-heavy blur, 3D tilts, and shine layers
  const isMobileHook = useIsMobile();
  const isMobile = isMobileProp !== undefined ? isMobileProp : isMobileHook;

  // 3D Magnetic Tilt Logic — hooks always called (React rules) but values unused on mobile
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useTransform(y, [0, 1], [3, -3]);
  const rotateY = useTransform(x, [0, 1], [-3, 3]);
  // Hoist shine gradient out of JSX (was violating hooks-in-JSX pattern)
  const shineGradient = useTransform(
    [x, y],
    ([latestX, latestY]) => `radial-gradient(circle at ${latestX * 100}% ${latestY * 100}%, rgba(255,255,255,0.05) 0%, transparent 60%)`
  );

  const handleMouseMove = useCallback((e) => {
    if (isMobile) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  }, [isMobile, x, y]);

  const handleMouseLeave = useCallback(() => {
    if (isMobile) return;
    x.set(0.5);
    y.set(0.5);
  }, [isMobile, x, y]);

  const mobileStyle = useMemo(() => ({
    background: highlight ? 'rgba(40, 10, 10, 0.95)' : 'rgba(18, 18, 18, 0.95)',
    border: highlight ? '1px solid rgba(220, 38, 38, 0.4)' : '1px solid rgba(220, 38, 38, 0.1)',
    boxShadow: highlight
      ? '0 0 20px rgba(220, 38, 38, 0.15), 0 4px 16px rgba(0, 0, 0, 0.5)'
      : '0 4px 16px rgba(0, 0, 0, 0.5)',
  }), [highlight]);

  const desktopStyle = useMemo(() => ({
    background: highlight
      ? 'linear-gradient(145deg, rgba(220, 38, 38, 0.15) 0%, rgba(153, 27, 27, 0.08) 50%, rgba(220, 38, 38, 0.12) 100%)'
      : 'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 50%, rgba(255, 255, 255, 0.02) 100%)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: highlight ? '1px solid rgba(220, 38, 38, 0.35)' : '1px solid rgba(220, 38, 38, 0.1)',
    boxShadow: highlight
      ? '0 0 30px rgba(220, 38, 38, 0.12), 0 10px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
      : '0 10px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
  }), [highlight]);

  const content = (
    <motion.div
      onClick={onClick}
      onMouseMove={isMobile ? undefined : handleMouseMove}
      onMouseLeave={isMobile ? undefined : handleMouseLeave}
      style={{
        rotateX: isMobile ? 0 : rotateX,
        rotateY: isMobile ? 0 : rotateY,
        transformPerspective: isMobile ? undefined : 1000,
        ...(isMobile ? mobileStyle : desktopStyle)
      }}
      className={`group relative overflow-hidden rounded-3xl p-5 transition-colors duration-300 ${onClick ? 'cursor-pointer hover:border-red-500/30' : ''} ${className}`}
    >
      {/* Dynamic Shine Layer based on Mouse Position */}
      {!isMobile && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-3xl z-20"
          style={{ background: shineGradient }}
        />
      )}

      {/* Subtle top shine — static */}
      {!isMobile && (
        <div
          className="absolute top-0 left-0 right-0 h-[40%] rounded-t-3xl pointer-events-none z-10"
          style={{ background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, transparent 100%)' }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
};

export const MacroBadge = ({ label, value, color }) => (
  <div className={`bg-gray-900/80 border border-${color}-500/20 p-2 rounded-xl text-center min-w-[70px] backdrop-blur-xl`}>
    <p className={`text-[11px] uppercase font-bold text-${color}-400`}>{label}</p>
    <p className="text-sm font-black text-white">{value}g</p>
  </div>
);

// --- ULTRA-PREMIUM LIQUID GLASS NAV BTN ---
export const NavBtn = ({ active, onClick, icon, label, controls }) => {
  const [isPressed, setIsPressed] = useState(false);
  const pressTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pressTimeoutRef.current) clearTimeout(pressTimeoutRef.current);
    };
  }, []);

  const handleClick = () => {
    if (navigator.vibrate) navigator.vibrate(5);
    setIsPressed(true);
    if (pressTimeoutRef.current) clearTimeout(pressTimeoutRef.current);
    pressTimeoutRef.current = setTimeout(() => setIsPressed(false), 150);
    onClick();
  };

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.92 }}
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      aria-label={`${label} tab`}
      className="relative flex flex-col items-center justify-center gap-0.5 min-h-[48px] w-full py-1.5 px-0 touch-target"
    >
      {/* Icon Container */}
      <motion.div
        animate={{
          scale: isPressed ? 0.85 : active ? 1.1 : 1,
          y: active ? -2 : 0,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        className="relative z-10 p-1.5 rounded-xl"
      >
        <div className={`transition-all duration-300 ${active ? 'text-red-400 drop-shadow-[0_0_8px_rgba(220,38,38,0.7)]' : 'text-gray-500'}`}>
          {icon}
        </div>
      </motion.div>

      {/* Label */}
      <span
        className={`relative z-10 text-[10px] font-bold uppercase tracking-[0.02em] transition-all duration-300 leading-none ${active ? 'text-red-400' : 'text-gray-600'}`}
        style={{ textShadow: active ? '0 0 10px rgba(220, 38, 38, 0.6)' : 'none' }}
      >
        {label}
      </span>
    </motion.button>
  );
};

// --- FLOATING ACTION BUTTON ---
export const FloatingActionButton = ({ actions = [], mainIcon }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div data-keyboard-hide className="fixed right-4 z-50" style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px) + 16px)' }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-16 right-0 flex flex-col gap-3 mb-2"
          >
            {actions.map((action, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0, transition: { delay: i * 0.05 } }}
                exit={{ opacity: 0, x: 20 }}
                onClick={() => { action.onClick(); setIsOpen(false); }}
                aria-label={action.label}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-xl border border-white/10 shadow-xl"
                style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)' }}
              >
                <span className="text-sm font-medium text-white whitespace-nowrap">{action.label}</span>
                {action.icon}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => { setIsOpen(!isOpen); if (SFX?.click) SFX.click(); }}
        animate={{ rotate: isOpen ? 45 : 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
        aria-expanded={isOpen}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(153, 27, 27, 0.95) 100%)',
          boxShadow: '0 10px 40px rgba(220, 38, 38, 0.5), 0 4px 15px rgba(0, 0, 0, 0.4)',
        }}
      >
        {mainIcon}
      </motion.button>
    </div>
  );
};



