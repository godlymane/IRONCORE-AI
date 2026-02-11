// ========================================
// IRONCORE — PREMIUM UI COMPONENTS
// Particles, Animations, Micro-Interactions
// ========================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';

// ========================================
// ANIMATED PARTICLE BACKGROUND
// Creates floating particles with red/gold glow
// ========================================
export const ParticleBackground = ({ count = 30, colors = ['#dc2626', '#f59e0b', '#991b1b'] }) => {
    const particles = Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
    }));

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
export const GoldConfetti = ({ trigger, onComplete }) => {
    const [particles, setParticles] = useState([]);

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

            setTimeout(() => {
                setParticles([]);
                onComplete?.();
            }, 2000);
        }
    }, [trigger, onComplete]);

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
            setTimeout(() => setPhase(1), 500),
            setTimeout(() => setPhase(2), 1200),
            setTimeout(() => setPhase(3), 1800),
            setTimeout(() => onComplete?.(), 2500),
        ];
        return () => timers.forEach(clearTimeout);
    }, [onComplete]);

    return (
        <motion.div
            className="fixed inset-0 z-[10000] flex items-center justify-center"
            style={{
                background: 'linear-gradient(145deg, #000000 0%, #0a0a0a 100%)',
            }}
            initial={{ opacity: 1 }}
            animate={{ opacity: phase === 3 ? 0 : 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Background particles */}
            <ParticleBackground count={20} />

            {/* Logo container */}
            <div className="relative flex flex-col items-center">
                {/* Glowing orb */}
                <motion.div
                    className="w-24 h-24 rounded-full mb-6"
                    style={{
                        background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                        boxShadow: '0 0 60px rgba(220, 38, 38, 0.6), 0 0 120px rgba(220, 38, 38, 0.3)',
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: phase >= 1 ? 1 : 0,
                        opacity: phase >= 1 ? 1 : 0,
                    }}
                    transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
                >
                    <motion.div
                        className="w-full h-full rounded-full flex items-center justify-center"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    >
                        <span className="text-4xl font-black text-white">🔥</span>
                    </motion.div>
                </motion.div>

                {/* Brand text */}
                <motion.h1
                    className="text-3xl font-black italic uppercase tracking-tighter text-white"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                        opacity: phase >= 2 ? 1 : 0,
                        y: phase >= 2 ? 0 : 20,
                    }}
                    transition={{ duration: 0.4 }}
                >
                    <span className="text-red-500">IRON</span>CORE
                </motion.h1>

                {/* Tagline */}
                <motion.p
                    className="text-xs text-gray-500 mt-2 uppercase tracking-widest"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: phase >= 2 ? 1 : 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                >
                    Your Fitness. Your Way.
                </motion.p>
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



