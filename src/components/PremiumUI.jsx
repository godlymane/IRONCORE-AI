// ========================================
// IRONCORE — PREMIUM UI COMPONENTS
// Particles, Animations, Micro-Interactions
// ========================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';

// ========================================
// ANIMATED PARTICLE BACKGROUND
// Creates floating particles with red/gold glow
// ========================================
export const ParticleBackground = ({ count = 30, colors = ['#dc2626', '#f59e0b', '#991b1b'] }) => {
    const particles = useMemo(() => Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
    })), [count, colors]);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size,
                        background: p.color,
                        boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
                    }}
                    animate={{
                        y: [0, -30, 0],
                        x: [0, Math.random() * 20 - 10, 0],
                        opacity: [0.2, 0.6, 0.2],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
};

// ========================================
// GOLD CONFETTI EXPLOSION
// Triggers on achievements, level ups, etc.
// ========================================
const CONFETTI_DURATION_MS = 2000;

export const GoldConfetti = ({ trigger, onComplete }) => {
    const [particles, setParticles] = useState([]);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    useEffect(() => {
        if (trigger) {
            const newParticles = Array.from({ length: 50 }, (_, i) => ({
                id: i,
                x: 50 + (Math.random() - 0.5) * 20,
                color: Math.random() > 0.5 ? '#f59e0b' : '#fbbf24',
                size: Math.random() * 8 + 4,
                angle: Math.random() * 360,
                velocity: Math.random() * 15 + 10,
                rotation: Math.random() * 720 - 360,
            }));
            setParticles(newParticles);

            const tid = setTimeout(() => {
                setParticles([]);
                onCompleteRef.current?.();
            }, CONFETTI_DURATION_MS);

            return () => clearTimeout(tid);
        }
    }, [trigger]);

    return (
        <AnimatePresence>
            {particles.map((p) => {
                const radians = (p.angle * Math.PI) / 180;
                const endX = Math.cos(radians) * p.velocity * 10;
                const endY = Math.sin(radians) * p.velocity * 10 - 50;

                return (
                    <motion.div
                        key={p.id}
                        className="fixed pointer-events-none z-[9999]"
                        style={{
                            left: `${p.x}%`,
                            top: '50%',
                            width: p.size,
                            height: p.size,
                            background: p.color,
                            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                            boxShadow: `0 0 10px ${p.color}`,
                        }}
                        initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                        animate={{
                            x: endX,
                            y: [0, endY - 100, endY + 200],
                            opacity: [1, 1, 0],
                            rotate: p.rotation,
                            scale: [1, 1.2, 0.5],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2, ease: 'easeOut' }}
                    />
                );
            })}
        </AnimatePresence>
    );
};

// ========================================
// ANIMATED NUMBER COUNTER
// Smoothly animates number changes
// ========================================
export const AnimatedNumber = ({
    value,
    duration = 1,
    className = '',
    suffix = '',
    prefix = ''
}) => {
    const spring = useSpring(0, { duration: duration * 1000 });
    const display = useTransform(spring, (v) => Math.round(v));
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        spring.set(value);
    }, [value, spring]);

    useEffect(() => {
        const unsubscribe = display.on('change', (v) => setDisplayValue(v));
        return unsubscribe;
    }, [display]);

    return (
        <span className={className}>
            {prefix}{displayValue.toLocaleString()}{suffix}
        </span>
    );
};

// ========================================
// RIPPLE BUTTON EFFECT
// Premium water ripple on click
// ========================================
export const RippleButton = ({ children, onClick, className = '', style = {} }) => {
    const [ripples, setRipples] = useState([]);
    const buttonRef = useRef(null);

    const handleClick = (e) => {
        const rect = buttonRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const size = Math.max(rect.width, rect.height) * 2;

        const newRipple = {
            id: Date.now(),
            x: x - size / 2,
            y: y - size / 2,
            size,
        };

        setRipples((prev) => [...prev, newRipple]);

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(10);

        setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
        }, 600);

        onClick?.(e);
    };

    return (
        <motion.button
            ref={buttonRef}
            onClick={handleClick}
            className={`relative overflow-hidden ${className}`}
            style={style}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {children}
            {ripples.map((ripple) => (
                <motion.span
                    key={ripple.id}
                    className="absolute rounded-full bg-white/30 pointer-events-none"
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        width: ripple.size,
                        height: ripple.size,
                    }}
                    initial={{ scale: 0, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                />
            ))}
        </motion.button>
    );
};

// ========================================
// GLASS CARD WITH NOISE TEXTURE
// Premium depth with grain overlay
// ========================================
export const PremiumGlassCard = ({
    children,
    className = '',
    highlight = false,
    onClick,
    animated = true
}) => {
    return (
        <motion.div
            onClick={onClick}
            whileHover={animated && onClick ? { scale: 1.01, y: -2 } : {}}
            whileTap={animated && onClick ? { scale: 0.99 } : {}}
            className={`relative overflow-hidden rounded-3xl p-5 ${onClick ? 'cursor-pointer' : ''} ${className}`}
            style={{
                background: highlight
                    ? 'linear-gradient(145deg, rgba(220, 38, 38, 0.12) 0%, rgba(153, 27, 27, 0.06) 50%, rgba(220, 38, 38, 0.1) 100%)'
                    : 'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 50%, rgba(255, 255, 255, 0.02) 100%)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: highlight ? '1px solid rgba(220, 38, 38, 0.25)' : '1px solid rgba(220, 38, 38, 0.1)',
                boxShadow: highlight
                    ? '0 10px 40px rgba(220, 38, 38, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                    : '0 10px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
            }}
        >
            {/* Noise texture overlay */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-3xl"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />
            {/* Top shine */}
            <div
                className="absolute top-0 left-0 right-0 h-[40%] rounded-t-3xl pointer-events-none"
                style={{ background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, transparent 100%)' }}
            />
            <div className="relative z-10">{children}</div>
        </motion.div>
    );
};

// ========================================
// ANIMATED GRADIENT BORDER
// Flowing gradient animation on borders
// ========================================
export const GradientBorderCard = ({ children, className = '' }) => {
    return (
        <div className={`relative p-[1px] rounded-3xl overflow-hidden ${className}`}>
            {/* Animated gradient border */}
            <motion.div
                className="absolute inset-0 rounded-3xl"
                style={{
                    background: 'linear-gradient(90deg, #dc2626, #f59e0b, #dc2626, #991b1b, #dc2626)',
                    backgroundSize: '300% 100%',
                }}
                animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'linear',
                }}
            />
            {/* Inner content */}
            <div
                className="relative rounded-3xl p-5"
                style={{
                    background: 'linear-gradient(145deg, rgba(0, 0, 0, 0.95) 0%, rgba(10, 10, 10, 0.95) 100%)',
                }}
            >
                {children}
            </div>
        </div>
    );
};

// ========================================
// SKELETON WITH RED SHIMMER
// Premium loading state
// ========================================
export const EliteSkeleton = ({ className = '', variant = 'default' }) => {
    const variants = {
        default: 'rounded-xl',
        circle: 'rounded-full',
        text: 'rounded-md h-4',
        card: 'rounded-3xl h-32',
        avatar: 'rounded-full w-12 h-12',
    };

    return (
        <div
            className={`relative overflow-hidden ${variants[variant]} ${className}`}
            style={{
                background: 'linear-gradient(90deg, rgba(220, 38, 38, 0.05) 0%, rgba(220, 38, 38, 0.1) 50%, rgba(220, 38, 38, 0.05) 100%)',
            }}
        >
            <motion.div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(220, 38, 38, 0.15) 50%, transparent 100%)',
                }}
                animate={{
                    x: ['-100%', '100%'],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
        </div>
    );
};

// ========================================
// SPLASH SCREEN / LOADING ANIMATION
// Premium app loading state
// ========================================
export const SplashScreen = ({ onComplete }) => {
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase(1), 100),   // logo slam
            setTimeout(() => setPhase(2), 500),    // text reveal
            setTimeout(() => setPhase(3), 1000),   // fade out
            setTimeout(() => onComplete?.(), 1300), // done
        ];
        return () => timers.forEach(clearTimeout);
    }, [onComplete]);

    return (
        <motion.div
            className="fixed inset-0 z-[10000] flex items-center justify-center"
            style={{ background: '#000' }}
            initial={{ opacity: 1 }}
            animate={{ opacity: phase === 3 ? 0 : 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Red flash on logo slam */}
            <motion.div
                className="absolute inset-0"
                style={{ background: 'radial-gradient(circle at center, rgba(220,38,38,0.3) 0%, transparent 60%)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: phase >= 1 ? [0, 1, 0] : 0 }}
                transition={{ duration: 0.4 }}
            />

            {/* Logo container */}
            <div className="relative flex flex-col items-center">
                {/* Brand Logo — slams in */}
                <motion.div
                    className="w-32 h-32 mb-4"
                    initial={{ scale: 2, opacity: 0 }}
                    animate={{
                        scale: phase >= 1 ? 1 : 2,
                        opacity: phase >= 1 ? 1 : 0,
                    }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        filter: 'drop-shadow(0 0 40px rgba(220, 38, 38, 0.6))',
                    }}
                >
                    <img
                        src="/logo.png"
                        alt="IronCore"
                        className="w-full h-full object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    {/* SVG fallback — renders if img fails */}
                    <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0" style={{ display: 'none' }}
                         ref={(el) => {
                             if (!el) return;
                             const img = el.previousElementSibling;
                             img.addEventListener('error', () => { el.style.display = 'block'; }, { once: true });
                         }}>
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#dc2626" strokeWidth="3"/>
                        <text x="50" y="56" textAnchor="middle" fill="#dc2626" fontSize="28" fontWeight="900" fontFamily="sans-serif">IC</text>
                    </svg>
                </motion.div>

                {/* Brand text — sharp cut-in */}
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{
                        opacity: phase >= 2 ? 1 : 0,
                        y: phase >= 2 ? 0 : 8,
                    }}
                    transition={{ duration: 0.2 }}
                >
                    <h1 className="text-2xl font-black uppercase tracking-tight text-white">
                        <span className="text-red-500">IRON</span>CORE
                    </h1>
                    <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em] mt-1">
                        Your Phone. Your Trainer.
                    </p>
                </motion.div>
            </div>
        </motion.div>
    );
};

// ========================================
// PULL TO REFRESH COMPONENT
// Custom animated refresh indicator
// ========================================
export const PullToRefresh = ({ onRefresh, children }) => {
    const [pulling, setPulling] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const containerRef = useRef(null);
    const startY = useRef(0);

    const handleTouchStart = (e) => {
        if (containerRef.current?.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
            setPulling(true);
        }
    };

    const handleTouchMove = (e) => {
        if (!pulling) return;
        const currentY = e.touches[0].clientY;
        const distance = Math.max(0, Math.min((currentY - startY.current) / 2, 100));
        setPullDistance(distance);
    };

    const handleTouchEnd = async () => {
        if (pullDistance > 60) {
            setRefreshing(true);
            if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
            await onRefresh?.();
            setRefreshing(false);
        }
        setPulling(false);
        setPullDistance(0);
    };

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative overflow-auto"
        >
            {/* Refresh indicator */}
            <motion.div
                className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
                style={{ top: pullDistance - 50 }}
                animate={{
                    opacity: pullDistance > 20 ? 1 : 0,
                    rotate: refreshing ? 360 : pullDistance * 3,
                }}
                transition={refreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
            >
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                        background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                        boxShadow: '0 0 20px rgba(220, 38, 38, 0.5)',
                    }}
                >
                    <span className="text-white text-lg">🔥</span>
                </div>
            </motion.div>

            <motion.div
                animate={{ y: pulling ? pullDistance : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                {children}
            </motion.div>
        </div>
    );
};

export default {
    ParticleBackground,
    GoldConfetti,
    AnimatedNumber,
    RippleButton,
    PremiumGlassCard,
    GradientBorderCard,
    EliteSkeleton,
    SplashScreen,
    PullToRefresh,
};



