// ========================================
// IRONCORE ELITE - ULTRA-PREMIUM CUSTOM ICONS
// Hand-crafted SVGs with premium animations
// Unique IDs to prevent filter conflicts
// ========================================

import React from 'react';
import { motion } from 'framer-motion';

// ========================================
// ELITE FLAME (HOME) - Aggressive fire icon
// ========================================
export const EliteFlameIcon = ({ active, size = 24 }) => (
    <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{ overflow: 'visible' }}
        animate={active ? { scale: [1, 1.08, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    >
        <defs>
            <filter id="elite-flame-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
            <linearGradient id="elite-flame-grad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#7F0000" />
                <stop offset="40%" stopColor="#CC0000" />
                <stop offset="70%" stopColor="#FF0000" />
                <stop offset="100%" stopColor="#FF3333" />
            </linearGradient>
            <linearGradient id="elite-flame-inner" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#FF0000" />
                <stop offset="100%" stopColor="#FF4444" />
            </linearGradient>
        </defs>

        {/* Main flame body */}
        <motion.path
            d="M12 2C12 2 4 10 4 15C4 19.4183 7.58172 23 12 23C16.4183 23 20 19.4183 20 15C20 10 12 2 12 2Z"
            fill={active ? "url(#elite-flame-grad)" : "none"}
            stroke={active ? "#FF0000" : "#6b7280"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={active ? "url(#elite-flame-glow)" : "none"}
        />

        {/* Inner flame core */}
        {active && (
            <>
                <motion.path
                    d="M12 10C12 10 8 14 8 16C8 18.2091 9.79086 20 12 20C14.2091 20 16 18.2091 16 16C16 14 12 10 12 10Z"
                    fill="url(#elite-flame-inner)"
                    animate={{ opacity: [0.7, 1, 0.7], scale: [0.95, 1, 0.95] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                />
                {/* Bright center highlight */}
                <motion.ellipse
                    cx="12"
                    cy="17"
                    rx="2"
                    ry="1.5"
                    fill="#FF0000"
                    opacity="0.8"
                    animate={{ opacity: [0.6, 0.9, 0.6] }}
                    transition={{ duration: 0.4, repeat: Infinity }}
                />
            </>
        )}
    </motion.svg>
);

// ========================================
// CROSSED SWORDS (ARENA) - Battle icon
// ========================================
export const EliteSwordsIcon = ({ active, size = 24 }) => (
    <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{ overflow: 'visible' }}
        whileHover={{ rotate: 5 }}
    >
        <defs>
            <linearGradient id="elite-sword-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="50%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
            <filter id="elite-sword-glow">
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>

        {/* Left sword blade */}
        <motion.path
            d="M4 4L14 14M4 4L2 6L4 8M4 4L6 2"
            fill="none"
            stroke={active ? "url(#elite-sword-grad)" : "#6b7280"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={active ? "url(#elite-sword-glow)" : "none"}
        />

        {/* Right sword blade */}
        <motion.path
            d="M20 4L10 14M20 4L22 6L20 8M20 4L18 2"
            fill="none"
            stroke={active ? "url(#elite-sword-grad)" : "#6b7280"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={active ? "url(#elite-sword-glow)" : "none"}
        />

        {/* Left guard */}
        <path
            d="M6 12L4 14L6 16"
            fill="none"
            stroke={active ? "#FF0000" : "#6b7280"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />

        {/* Right guard */}
        <path
            d="M18 12L20 14L18 16"
            fill="none"
            stroke={active ? "#f59e0b" : "#6b7280"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />

        {/* Center clash spark */}
        {active && (
            <motion.circle
                cx="12"
                cy="14"
                r="2"
                fill="#FF0000"
                animate={{
                    r: [1.5, 2.5, 1.5],
                    opacity: [1, 0.6, 1]
                }}
                transition={{ duration: 0.4, repeat: Infinity }}
            />
        )}
    </motion.svg>
);

// ========================================
// POWER DUMBBELL (LIFT) - Heavy iron icon
// ========================================
export const EliteDumbbellIcon = ({ active, size = 24 }) => (
    <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{ overflow: 'visible' }}
        animate={active ? { rotate: [-3, 3, -3] } : {}}
        transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
    >
        <defs>
            <linearGradient id="elite-iron-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="50%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
            <filter id="elite-iron-glow">
                <feGaussianBlur stdDeviation="0.8" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>

        {/* Center bar */}
        <rect
            x="7"
            y="11"
            width="10"
            height="2"
            rx="1"
            fill={active ? "#dc2626" : "#6b7280"}
        />

        {/* Left weight stack outer */}
        <rect
            x="2"
            y="7"
            width="4"
            height="10"
            rx="1.5"
            fill={active ? "url(#elite-iron-grad)" : "#4b5563"}
            filter={active ? "url(#elite-iron-glow)" : "none"}
        />
        {/* Left weight stack inner */}
        <rect
            x="5"
            y="9"
            width="2.5"
            height="6"
            rx="0.75"
            fill={active ? "#b91c1c" : "#374151"}
        />

        {/* Right weight stack outer */}
        <rect
            x="18"
            y="7"
            width="4"
            height="10"
            rx="1.5"
            fill={active ? "url(#elite-iron-grad)" : "#4b5563"}
            filter={active ? "url(#elite-iron-glow)" : "none"}
        />
        {/* Right weight stack inner */}
        <rect
            x="16.5"
            y="9"
            width="2.5"
            height="6"
            rx="0.75"
            fill={active ? "#b91c1c" : "#374151"}
        />

        {/* Power indicator when active */}
        {active && (
            <motion.circle
                cx="12"
                cy="12"
                r="1"
                fill="#FF0000"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
            />
        )}
    </motion.svg>
);

// ========================================
// AI BRAIN (AI LAB) - Neural network icon
// ========================================
export const EliteBrainIcon = ({ active, size = 24 }) => (
    <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{ overflow: 'visible' }}
    >
        <defs>
            <linearGradient id="elite-brain-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF4444" />
                <stop offset="50%" stopColor="#FF0000" />
                <stop offset="100%" stopColor="#CC0000" />
            </linearGradient>
            <filter id="elite-brain-glow">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>

        {/* Brain outline - simplified bulb shape */}
        <motion.path
            d="M12 3C7.5 3 5 6.5 5 10C5 12.5 6 14 7 15V19C7 20.1 7.9 21 9 21H15C16.1 21 17 20.1 17 19V15C18 14 19 12.5 19 10C19 6.5 16.5 3 12 3Z"
            fill={active ? "url(#elite-brain-grad)" : "none"}
            stroke={active ? "#FF0000" : "#6b7280"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={active ? "url(#elite-brain-glow)" : "none"}
        />

        {/* Neural connections - creative lines inside */}
        {active && (
            <>
                {/* Left synapse */}
                <motion.circle
                    cx="9"
                    cy="9"
                    r="1.2"
                    fill="#fff"
                    animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: 0 }}
                />
                {/* Right synapse */}
                <motion.circle
                    cx="15"
                    cy="9"
                    r="1.2"
                    fill="#fff"
                    animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: 0.2 }}
                />
                {/* Center synapse */}
                <motion.circle
                    cx="12"
                    cy="13"
                    r="1.2"
                    fill="#fff"
                    animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: 0.4 }}
                />
                {/* Connection lines */}
                <line x1="9" y1="9" x2="12" y2="13" stroke="#fff" strokeWidth="0.5" opacity="0.6" />
                <line x1="15" y1="9" x2="12" y2="13" stroke="#fff" strokeWidth="0.5" opacity="0.6" />
                <line x1="9" y1="9" x2="15" y2="9" stroke="#fff" strokeWidth="0.5" opacity="0.6" />
            </>
        )}

        {/* Base band */}
        <rect
            x="8"
            y="17"
            width="8"
            height="1.5"
            rx="0.75"
            fill={active ? "#990000" : "#4b5563"}
        />
    </motion.svg>
);

// ========================================
// PULSE HEART (CARDIO) - Heartbeat icon
// ========================================
export const EliteHeartIcon = ({ active, size = 24 }) => (
    <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{ overflow: 'visible' }}
        animate={active ? { scale: [1, 1.12, 1, 1.08, 1] } : {}}
        transition={{ duration: 0.7, repeat: Infinity, ease: "easeOut" }}
    >
        <defs>
            <linearGradient id="elite-heart-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <filter id="elite-heart-glow">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>

        {/* Heart shape */}
        <motion.path
            d="M12 21C12 21 3 13.5 3 8.5C3 5.5 5.5 3 8.5 3C10.5 3 12 4.5 12 4.5C12 4.5 13.5 3 15.5 3C18.5 3 21 5.5 21 8.5C21 13.5 12 21 12 21Z"
            fill={active ? "url(#elite-heart-grad)" : "none"}
            stroke={active ? "#ef4444" : "#6b7280"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={active ? "url(#elite-heart-glow)" : "none"}
        />

        {/* EKG heartbeat line */}
        {active && (
            <motion.path
                d="M4 12H7L9 9L11 15L13 11L15 13H20"
                stroke="#fff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
            />
        )}
    </motion.svg>
);

// ========================================
// ELITE CROWN (PROFILE) - Royal status icon
// ========================================
export const EliteCrownIcon = ({ active, size = 24 }) => (
    <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{ overflow: 'visible' }}
    >
        <defs>
            <linearGradient id="elite-crown-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FF4444" />
                <stop offset="30%" stopColor="#FF0000" />
                <stop offset="60%" stopColor="#CC0000" />
                <stop offset="100%" stopColor="#990000" />
            </linearGradient>
            <filter id="elite-crown-glow">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>

        {/* Crown shape */}
        <motion.path
            d="M3 18V8L7 12L12 6L17 12L21 8V18H3Z"
            fill={active ? "url(#elite-crown-grad)" : "none"}
            stroke={active ? "#FF0000" : "#6b7280"}
            strokeWidth="2"
            strokeLinejoin="round"
            filter={active ? "url(#elite-crown-glow)" : "none"}
        />

        {/* Crown jewels */}
        {active && (
            <>
                {/* Center jewel */}
                <motion.circle
                    cx="12"
                    cy="9"
                    r="1.5"
                    fill="#dc2626"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                />
                {/* Side jewels */}
                <circle cx="7" cy="13" r="1" fill="#ef4444" />
                <circle cx="17" cy="13" r="1" fill="#ef4444" />
            </>
        )}

        {/* Base band with detail */}
        <rect
            x="3"
            y="18"
            width="18"
            height="2.5"
            rx="1"
            fill={active ? "#7F0000" : "#4b5563"}
        />
        {/* Band highlight */}
        {active && (
            <rect
                x="4"
                y="18.5"
                width="16"
                height="0.8"
                rx="0.4"
                fill="#FF3333"
                opacity="0.5"
            />
        )}
    </motion.svg>
);

// ========================================
// EXPORT NAV ICON SET
// ========================================
export const NavIcons = {
    home: EliteFlameIcon,
    arena: EliteSwordsIcon,
    lift: EliteDumbbellIcon,
    ailab: EliteBrainIcon,
    pulse: EliteHeartIcon,
    profile: EliteCrownIcon,
};

export default NavIcons;

