// ========================================
// IRONCORE v2 — BLAYZEX THEME
// Sharp, aggressive, geometric SVG icons
// ALL paths use M/L only - NO curves (C/Q/S/T)
// ViewBox: 24x24 | Stroke: 2px | Angular design
// ========================================

import React from 'react';
import { motion } from 'framer-motion';

// ========================================
// 1. ELITE FLAME (HOME/DASHBOARD)
// ========================================
// Concept: Sharp aggressive flame built from 3 stacked
// angular triangular shapes. Represents home/energy.
//
// Geometric Breakdown:
//   - Outer flame: 7-point polygon with inward notches
//     at 60° angles creating aggressive silhouette
//   - Middle flame: 5-point polygon offset upward
//   - Inner flame: Small sharp triangle (glass highlight)
//   - All straight lines, zero curves
//
// Layers:
//   1. Base: Outer flame (red gradient #991b1b → #dc2626)
//   2. Mid: Middle flame (semi-transparent red)
//   3. Highlight: Inner white flame (glass 15% opacity)
//   4. Detail: Center bright core
//   5. Glow: Gaussian blur filter when active
//
// Animation: All layers pulse scale (1.0 → 1.08),
//   outer flame glows red, inner core flickers opacity
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
      <filter id="ef-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="ef-grad" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#7F0000" />
        <stop offset="35%" stopColor="#991b1b" />
        <stop offset="60%" stopColor="#b91c1c" />
        <stop offset="85%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#FF3333" />
      </linearGradient>
      <linearGradient id="ef-mid" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#b91c1c" />
        <stop offset="100%" stopColor="#FF4444" />
      </linearGradient>
      <linearGradient id="ef-glass" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
      </linearGradient>
    </defs>

    {/* Layer 1: Outer flame - 7-point angular polygon */}
    <motion.path
      d="M12 1 L15.5 7 L20 11 L18 15 L16 20 L12 23 L8 20 L6 15 L4 11 L8.5 7 Z"
      fill={active ? "url(#ef-grad)" : "none"}
      stroke={active ? "#dc2626" : "#6b7280"}
      strokeWidth="1.5"
      strokeLinejoin="miter"
      filter={active ? "url(#ef-glow)" : "none"}
    />

    {/* Layer 2: Middle flame - sharper inner shape */}
    {active && (
      <motion.path
        d="M12 4 L15 9 L17 13 L15 17.5 L12 20 L9 17.5 L7 13 L9 9 Z"
        fill="url(#ef-mid)"
        opacity="0.8"
        animate={{ opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
    )}

    {/* Layer 3: Inner flame - glass highlight triangle */}
    {active && (
      <motion.path
        d="M12 7 L14.5 13 L12 18 L9.5 13 Z"
        fill="url(#ef-glass)"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 0.6, repeat: Infinity }}
      />
    )}

    {/* Layer 4: Hot core - bright center diamond */}
    {active && (
      <motion.path
        d="M12 11 L13.5 14 L12 17 L10.5 14 Z"
        fill="#FF4444"
        opacity="0.9"
        animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      />
    )}

    {/* Inactive detail lines for depth */}
    {!active && (
      <>
        <path d="M12 4 L14 9 L12 20 L10 9 Z" fill="none" stroke="#6b7280" strokeWidth="0.5" opacity="0.4" />
      </>
    )}
  </motion.svg>
);

// ========================================
// 2. CROSSED SWORDS (ARENA/COMPETITION)
// ========================================
// Concept: Two swords crossing at 45° with angular
// blades, geometric hilts, and spark at intersection.
//
// Geometric Breakdown:
//   - Blade 1: Elongated diamond from top-left to
//     bottom-right at 45° angle, sharp tip
//   - Blade 2: Mirrored diamond top-right to bottom-left
//   - Hilts: Rectangular crossguards perpendicular to blade
//   - Handles: Short rectangular grips
//   - Spark: 4-point star at intersection
//
// Layers:
//   1. Base: Blade bodies (red gradient)
//   2. Edge: Blade edge highlights (white 20% overlay)
//   3. Hilts: Dark red crossguards
//   4. Detail: Clash spark at center
//   5. Glow: Red outer glow active state
//
// Animation: Slight rotate wobble on hover,
//   spark pulses and scales at intersection
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
      <linearGradient id="es-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF3333" />
        <stop offset="50%" stopColor="#b91c1c" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
      <linearGradient id="es-edge" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.0" />
        <stop offset="50%" stopColor="#ffffff" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
      </linearGradient>
      <filter id="es-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Layer 1: Left sword blade - elongated diamond 45° */}
    <motion.path
      d="M3 3 L5 2 L14 11 L15 13 L13 15 L11 14 L2 5 Z"
      fill={active ? "url(#es-grad)" : "none"}
      stroke={active ? "#dc2626" : "#6b7280"}
      strokeWidth="1.5"
      strokeLinejoin="miter"
      filter={active ? "url(#es-glow)" : "none"}
    />

    {/* Layer 1: Right sword blade - mirrored diamond */}
    <motion.path
      d="M21 3 L19 2 L10 11 L9 13 L11 15 L13 14 L22 5 Z"
      fill={active ? "url(#es-grad)" : "none"}
      stroke={active ? "#dc2626" : "#6b7280"}
      strokeWidth="1.5"
      strokeLinejoin="miter"
      filter={active ? "url(#es-glow)" : "none"}
    />

    {/* Layer 2: Blade edge highlights (glass) */}
    {active && (
      <>
        <path d="M4 3 L5 2.5 L13 10.5 L12 12 Z" fill="url(#es-edge)" />
        <path d="M20 3 L19 2.5 L11 10.5 L12 12 Z" fill="url(#es-edge)" />
      </>
    )}

    {/* Layer 3: Left hilt - angular crossguard + grip */}
    <path
      d="M5 16 L4 14 L6 14 L7 16 Z"
      fill={active ? "#991b1b" : "#4b5563"}
      stroke={active ? "#b91c1c" : "#6b7280"}
      strokeWidth="1"
    />
    <path d="M5 16 L4.5 19 L6.5 19 L6 16 Z"
      fill={active ? "#660000" : "#374151"}
    />

    {/* Layer 3: Right hilt - angular crossguard + grip */}
    <path
      d="M19 16 L20 14 L18 14 L17 16 Z"
      fill={active ? "#991b1b" : "#4b5563"}
      stroke={active ? "#b91c1c" : "#6b7280"}
      strokeWidth="1"
    />
    <path d="M19 16 L19.5 19 L17.5 19 L18 16 Z"
      fill={active ? "#660000" : "#374151"}
    />

    {/* Layer 4: Clash spark - 4-point angular star */}
    {active && (
      <motion.path
        d="M12 9 L13 12 L12 15 L11 12 Z M9 12 L12 11 L15 12 L12 13 Z"
        fill="#FF4444"
        animate={{
          scale: [0.8, 1.3, 0.8],
          opacity: [0.7, 1, 0.7]
        }}
        transition={{ duration: 0.4, repeat: Infinity }}
      />
    )}
  </motion.svg>
);

// ========================================
// 3. POWER DUMBBELL (LIFT/WORKOUT)
// ========================================
// Concept: Geometric dumbbell with rectangular weight
// plates (NOT circular), angular edges, layered depth.
//
// Geometric Breakdown:
//   - Center bar: Horizontal rectangle connecting plates
//   - Outer plates (x2): Large rectangles with angled
//     corners (chamfered at 45°)
//   - Inner plates (x2): Smaller rectangles stacked
//     for depth effect
//   - Edge bevels: 45° chamfers on plate corners
//
// Layers:
//   1. Base: Outer weight plates (dark red gradient)
//   2. Depth: Inner plates (mid red, offset)
//   3. Bar: Center connecting bar (bright red)
//   4. Glass: White highlight on top edge of plates
//   5. Detail: Power indicator diamonds
//
// Animation: Slight rotate wobble (-3° to 3°),
//   power diamond pulses at center
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
      <linearGradient id="ed-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FF3333" />
        <stop offset="40%" stopColor="#b91c1c" />
        <stop offset="100%" stopColor="#7F0000" />
      </linearGradient>
      <linearGradient id="ed-inner" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#b91c1c" />
        <stop offset="100%" stopColor="#660000" />
      </linearGradient>
      <linearGradient id="ed-glass" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
      </linearGradient>
      <filter id="ed-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="0.8" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Layer 1: Left outer plate - chamfered rectangle */}
    <motion.path
      d="M1 6 L2 5 L6 5 L7 6 L7 18 L6 19 L2 19 L1 18 Z"
      fill={active ? "url(#ed-grad)" : "#4b5563"}
      stroke={active ? "#dc2626" : "#6b7280"}
      strokeWidth="1"
      strokeLinejoin="miter"
      filter={active ? "url(#ed-glow)" : "none"}
    />

    {/* Layer 2: Left inner plate - depth layer */}
    <path
      d="M3 7.5 L3.5 7 L5.5 7 L6 7.5 L6 16.5 L5.5 17 L3.5 17 L3 16.5 Z"
      fill={active ? "url(#ed-inner)" : "#374151"}
    />

    {/* Layer 1: Right outer plate - chamfered rectangle */}
    <motion.path
      d="M17 6 L18 5 L22 5 L23 6 L23 18 L22 19 L18 19 L17 18 Z"
      fill={active ? "url(#ed-grad)" : "#4b5563"}
      stroke={active ? "#dc2626" : "#6b7280"}
      strokeWidth="1"
      strokeLinejoin="miter"
      filter={active ? "url(#ed-glow)" : "none"}
    />

    {/* Layer 2: Right inner plate - depth layer */}
    <path
      d="M18 7.5 L18.5 7 L20.5 7 L21 7.5 L21 16.5 L20.5 17 L18.5 17 L18 16.5 Z"
      fill={active ? "url(#ed-inner)" : "#374151"}
    />

    {/* Layer 3: Center bar */}
    <path
      d="M7 10.5 L17 10.5 L17 13.5 L7 13.5 Z"
      fill={active ? "#b91c1c" : "#6b7280"}
      stroke={active ? "#991b1b" : "#4b5563"}
      strokeWidth="0.5"
    />

    {/* Layer 4: Glass highlight - top edge of plates */}
    {active && (
      <>
        <path d="M2 5.5 L6 5.5 L6 7 L2 7 Z" fill="url(#ed-glass)" />
        <path d="M18 5.5 L22 5.5 L22 7 L18 7 Z" fill="url(#ed-glass)" />
      </>
    )}

    {/* Layer 5: Center power diamond */}
    {active && (
      <motion.path
        d="M12 10 L13 12 L12 14 L11 12 Z"
        fill="#FF4444"
        animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 0.6, repeat: Infinity }}
      />
    )}

    {/* Plate detail lines for visual richness */}
    <path d="M4 9 L4 15" stroke={active ? "#dc262633" : "#55555533"} strokeWidth="0.5" />
    <path d="M20 9 L20 15" stroke={active ? "#dc262633" : "#55555533"} strokeWidth="0.5" />
  </motion.svg>
);

// ========================================
// 4. AI BRAIN (AI COACH)
// ========================================
// Concept: Geometric brain with angular lobes and
// neural connection lines. Represents AI intelligence.
// Sharp angular brain silhouette (NOT organic blob).
//
// Geometric Breakdown:
//   - Brain outline: Angular polygon with 10+ vertices
//     creating two hemispheres with jagged lobe shapes
//   - Center divide: Vertical line splitting hemispheres
//   - Neural nodes: Small diamonds at key positions
//   - Connection lines: Straight lines between nodes
//   - Energy rays: Short angular lines radiating outward
//
// Layers:
//   1. Base: Brain silhouette (red gradient)
//   2. Structure: Center divide + lobe segment lines
//   3. Glass: White highlight on upper-left lobe
//   4. Neural: Connection dots + lines (white, animated)
//   5. Energy: Outer ray lines (active state only)
//
// Animation: Neural nodes pulse sequentially,
//   connection lines fade in/out, energy rays flicker
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
      <linearGradient id="eb-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF4444" />
        <stop offset="50%" stopColor="#b91c1c" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
      <linearGradient id="eb-glass" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
      </linearGradient>
      <filter id="eb-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Layer 1: Brain silhouette - angular polygon */}
    <motion.path
      d="M12 2 L15 3 L18 4 L20 6 L21 9 L21 12 L20 15 L18 17 L16 18 L14 19 L14 22 L10 22 L10 19 L8 18 L6 17 L4 15 L3 12 L3 9 L4 6 L6 4 L9 3 Z"
      fill={active ? "url(#eb-grad)" : "none"}
      stroke={active ? "#dc2626" : "#6b7280"}
      strokeWidth="1.5"
      strokeLinejoin="miter"
      filter={active ? "url(#eb-glow)" : "none"}
    />

    {/* Layer 2: Center divide line */}
    <path
      d="M12 3.5 L12 18.5"
      stroke={active ? "#991b1b" : "#555555"}
      strokeWidth="1"
    />

    {/* Layer 2: Lobe segment lines */}
    <path d="M6 8 L10 9" stroke={active ? "#991b1b88" : "#55555544"} strokeWidth="0.8" />
    <path d="M14 9 L18 8" stroke={active ? "#991b1b88" : "#55555544"} strokeWidth="0.8" />
    <path d="M5 13 L10 12" stroke={active ? "#991b1b88" : "#55555544"} strokeWidth="0.8" />
    <path d="M14 12 L19 13" stroke={active ? "#991b1b88" : "#55555544"} strokeWidth="0.8" />

    {/* Layer 3: Glass highlight - upper left lobe */}
    {active && (
      <path
        d="M9 3.5 L12 2.5 L14 3.5 L12 5 Z"
        fill="url(#eb-glass)"
      />
    )}

    {/* Layer 4: Neural network nodes + connections */}
    {active && (
      <>
        {/* Node: Left upper */}
        <motion.path
          d="M7 8 L8 7 L9 8 L8 9 Z"
          fill="#ffffff"
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.15, 0.9] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: 0 }}
        />
        {/* Node: Right upper */}
        <motion.path
          d="M15 8 L16 7 L17 8 L16 9 Z"
          fill="#ffffff"
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.15, 0.9] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: 0.2 }}
        />
        {/* Node: Center */}
        <motion.path
          d="M12 12 L13 11 L14 12 L13 13 Z"
          fill="#ffffff"
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.15, 0.9] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: 0.35 }}
        />
        {/* Node: Left lower */}
        <motion.path
          d="M7 14 L8 13 L9 14 L8 15 Z"
          fill="#ffffff"
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.15, 0.9] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: 0.5 }}
        />

        {/* Connection lines between nodes */}
        <motion.path
          d="M8 8 L13 12 M16 8 L13 12 M8 8 L16 8 M8 14 L13 12"
          stroke="#ffffff"
          strokeWidth="0.6"
          fill="none"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      </>
    )}

    {/* Layer 5: Energy rays - outward bursts */}
    {active && (
      <motion.g
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <path d="M2 9 L3 9" stroke="#FF4444" strokeWidth="1.5" />
        <path d="M21 9 L22 9" stroke="#FF4444" strokeWidth="1.5" />
        <path d="M3 6 L4 6.5" stroke="#FF4444" strokeWidth="1" />
        <path d="M20 6 L21 6.5" stroke="#FF4444" strokeWidth="1" />
      </motion.g>
    )}

    {/* Layer: Base band / stem */}
    <path
      d="M10 20 L14 20 L14 22 L10 22 Z"
      fill={active ? "#660000" : "#4b5563"}
      stroke={active ? "#991b1b" : "#555555"}
      strokeWidth="0.5"
    />
  </motion.svg>
);

// ========================================
// 5. PULSE HEART (CARDIO)
// ========================================
// Concept: Geometric angular heart (NOT rounded) with
// a prominent EKG pulse line cutting across it.
//
// Geometric Breakdown:
//   - Heart: Built from straight lines only - two
//     angular "humps" at top meeting at sharp V at bottom
//     8 vertices forming the angular heart shape
//   - EKG line: Sharp zigzag across heart center with
//     prominent peak/valley pattern (M, L commands only)
//   - Detail: Small angular notch at top center
//
// Layers:
//   1. Base: Heart body (red gradient fill)
//   2. Depth: Inner shadow polygon (dark red)
//   3. Glass: Top-left highlight (white 15%)
//   4. EKG: Pulse line across center (white, animated)
//   5. Glow: Red outer glow on heartbeat
//
// Animation: Heartbeat scale pulse (1→1.12→1→1.08→1),
//   EKG line draws with pathLength animation
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
      <linearGradient id="eh-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FF3333" />
        <stop offset="40%" stopColor="#EF4444" />
        <stop offset="70%" stopColor="#DC2626" />
        <stop offset="100%" stopColor="#991B1B" />
      </linearGradient>
      <linearGradient id="eh-depth" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#b91c1c" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#660000" stopOpacity="0.6" />
      </linearGradient>
      <linearGradient id="eh-glass" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
      </linearGradient>
      <filter id="eh-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Layer 1: Angular heart body - 8 vertices, all straight */}
    <motion.path
      d="M12 5 L9 2 L5 2 L2 5 L2 9 L5 14 L12 22 L19 14 L22 9 L22 5 L19 2 L15 2 Z"
      fill={active ? "url(#eh-grad)" : "none"}
      stroke={active ? "#EF4444" : "#6b7280"}
      strokeWidth="1.5"
      strokeLinejoin="miter"
      filter={active ? "url(#eh-glow)" : "none"}
    />

    {/* Layer 2: Inner depth shadow */}
    {active && (
      <path
        d="M12 7 L10 4 L7 4 L5 6 L5 9 L7 13 L12 19 L17 13 L19 9 L19 6 L17 4 L14 4 Z"
        fill="url(#eh-depth)"
      />
    )}

    {/* Layer 3: Glass highlight - upper left lobe */}
    {active && (
      <path
        d="M9 2.5 L5 2.5 L3 5 L3 7 L5 4.5 L9 3.5 Z"
        fill="url(#eh-glass)"
      />
    )}

    {/* Layer 4: EKG pulse line - sharp zigzag */}
    {active && (
      <motion.path
        d="M3 11 L6 11 L7.5 11 L9 7 L10.5 14 L12 9 L13.5 13 L15 11 L17 11 L21 11"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinejoin="miter"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
    )}

    {/* Inactive: subtle EKG hint */}
    {!active && (
      <path
        d="M5 12 L8 12 L9.5 9 L11 14 L12.5 10 L14 12 L19 12"
        stroke="#6b7280"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
    )}
  </motion.svg>
);

// ========================================
// 6. ELITE CROWN (PROFILE/USER)
// ========================================
// Concept: Royal crown with 5 sharp points, angular
// base band, and geometric jewel details. Symmetrical.
//
// Geometric Breakdown:
//   - Crown body: 5 sharp pointed peaks connected by
//     angular valleys at 90° angles
//   - Base band: Thick rectangle beneath crown
//   - Center jewel: Diamond shape (rotated square)
//   - Side jewels: Smaller triangular shapes
//   - Band detail: Horizontal highlight line
//
// Layers:
//   1. Base: Crown body (red gradient)
//   2. Depth: Inner crown shadow (dark red)
//   3. Band: Base rectangle (deep red)
//   4. Jewels: Diamond shapes at peaks (bright red/white)
//   5. Glass: White highlight stripe on band
//   6. Glow: Red outer glow active state
//
// Animation: Center jewel pulses scale,
//   band highlight shimmers opacity
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
      <linearGradient id="ec-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FF4444" />
        <stop offset="30%" stopColor="#dc2626" />
        <stop offset="60%" stopColor="#b91c1c" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
      <linearGradient id="ec-depth" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#b91c1c" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#660000" stopOpacity="0.7" />
      </linearGradient>
      <linearGradient id="ec-glass" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.0" />
        <stop offset="50%" stopColor="#ffffff" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
      </linearGradient>
      <filter id="ec-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Layer 1: Crown body - 5 sharp points with angular valleys */}
    <motion.path
      d="M2 17 L2 10 L5 5 L6 10 L9 4 L10 9 L12 2 L14 9 L15 4 L18 10 L19 5 L22 10 L22 17 Z"
      fill={active ? "url(#ec-grad)" : "none"}
      stroke={active ? "#dc2626" : "#6b7280"}
      strokeWidth="1.5"
      strokeLinejoin="miter"
      filter={active ? "url(#ec-glow)" : "none"}
    />

    {/* Layer 2: Inner depth shadow */}
    {active && (
      <path
        d="M4 16 L4 11 L6 7 L7 11 L9.5 6 L10.5 10 L12 4.5 L13.5 10 L14.5 6 L17 11 L18 7 L20 11 L20 16 Z"
        fill="url(#ec-depth)"
      />
    )}

    {/* Layer 3: Base band */}
    <path
      d="M2 17 L22 17 L22 20 L2 20 Z"
      fill={active ? "#7F0000" : "#4b5563"}
      stroke={active ? "#991b1b" : "#555555"}
      strokeWidth="0.5"
    />

    {/* Layer 4: Center jewel - large diamond */}
    {active && (
      <motion.path
        d="M12 8 L13.5 10.5 L12 13 L10.5 10.5 Z"
        fill="#FF4444"
        stroke="#FF6666"
        strokeWidth="0.5"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
    )}

    {/* Layer 4: Side jewels - small triangles */}
    {active && (
      <>
        {/* Left jewel */}
        <path d="M6 10 L7 9 L7.5 11 Z" fill="#EF4444" />
        {/* Right jewel */}
        <path d="M18 10 L17 9 L16.5 11 Z" fill="#EF4444" />
        {/* Far left jewel */}
        <path d="M4 12 L5 11 L5 13 Z" fill="#DC2626" opacity="0.7" />
        {/* Far right jewel */}
        <path d="M20 12 L19 11 L19 13 Z" fill="#DC2626" opacity="0.7" />
      </>
    )}

    {/* Layer 5: Glass highlight - band shimmer */}
    {active && (
      <motion.path
        d="M3 17.5 L21 17.5 L21 18.3 L3 18.3 Z"
        fill="url(#ec-glass)"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    )}

    {/* Band detail notches */}
    {active && (
      <>
        <path d="M8 17 L8 20" stroke="#991b1b44" strokeWidth="0.5" />
        <path d="M12 17 L12 20" stroke="#991b1b44" strokeWidth="0.5" />
        <path d="M16 17 L16 20" stroke="#991b1b44" strokeWidth="0.5" />
      </>
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
