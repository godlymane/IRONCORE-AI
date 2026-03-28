import React from 'react';

// --- SHARED DEFINITIONS (Gradients & Filters) ---
const IconDefs = () => (
    <defs>
        {/* Common Gradients */}
        <linearGradient id="ic-grad-glass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="50%" stopColor="white" stopOpacity="0.1" />
            <stop offset="100%" stopColor="white" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="ic-grad-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.8" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Icon Specific Gradients */}
        <linearGradient id="ic-grad-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id="ic-grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="ic-grad-purple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="ic-grad-orange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="ic-grad-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <linearGradient id="ic-grad-pink" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
        <linearGradient id="ic-grad-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
        <linearGradient id="ic-grad-silver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="ic-grad-egg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <linearGradient id="ic-grad-red" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff4444" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>

        {/* Filters */}
        <filter id="ic-glow-inner">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
    </defs>
);

// Helper Wrapper for all icons
const IconBase = ({ children, className = "w-full h-full" }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <IconDefs />
        {children}
    </svg>
);

// Reusable Aura Icon Wrapper (Updated to accept Icon Element)
export const AuraIcon = ({ children, color = '#3b82f6', size = 60, className = '' }) => {
    return (
        <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            {/* Background Glow */}
            <div
                className="absolute inset-0 rounded-full blur-2xl opacity-40"
                style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
            />
            <div
                className="absolute inset-0 rounded-full blur-md opacity-60"
                style={{ background: `radial-gradient(circle, ${color} 0%, transparent 60%)` }}
            />

            {/* Container for the IconBase */}
            <div className="relative z-10 w-full h-full" style={{ filter: `drop-shadow(0 0 5px ${color}80)` }}>
                {children}
            </div>
        </div>
    );
};

// --- HIGH FIDELITY ICONS (BlayzEx Angular Design) ---
// ALL paths use ONLY M (move) and L (line-to) commands
// NO curves (C, Q, S, T, A) — sharp geometric edges only

// ========================================
// 1. WATER DROP ICON (Quick Log Water)
// ========================================
// Concept: Sharp angular hydration power-up droplet.
//   Pentagon-like shape with aggressive pointed top,
//   NOT organic/flowing. Looks like an energy crystal.
//
// Geometric Breakdown:
//   - Outer droplet: 8-vertex polygon, symmetrical L-R
//     Sharp 30° point at top, widening at 45° angles,
//     angular bottom forming a truncated diamond
//   - Inner highlight: Offset 6-vertex polygon (glass)
//   - Shine accent: Angular slash line on left edge
//   - Sparkle: Small diamond shape on right side
//
// Layers:
//   1. Base: Outer droplet body (cyan gradient)
//   2. Glass: Inner highlight polygon (white 40%→5%)
//   3. Depth: Inner shadow polygon (darker cyan)
//   4. Shine: Angular accent line (white stroke)
//   5. Sparkle: Small diamond detail (white)
//
// Animation: Scale pulse 1.0→1.05 on tap,
//   shine line pulses opacity 0.4→0.8
// ========================================
export const WaterDropIcon = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Outer droplet body - sharp 8-vertex polygon */}
        <path d="M50 3 L65 28 L75 50 L72 72 L60 88 L40 88 L28 72 L25 50 L35 28 Z"
              fill="url(#ic-grad-cyan)" stroke="#0c4a6e" strokeWidth="2" strokeLinejoin="miter" />
        {/* Layer 2: Glass highlight - inner polygon offset */}
        <path d="M50 10 L62 30 L70 50 L67 68 L57 82 L43 82 L33 68 L30 50 L38 30 Z"
              fill="url(#ic-grad-glass)" />
        {/* Layer 3: Depth shadow - lower inner shape */}
        <path d="M50 50 L62 58 L58 78 L50 85 L42 78 L38 58 Z"
              fill="#0369a1" opacity="0.3" />
        {/* Layer 4: Shine accent - angular slash on left */}
        <path d="M34 38 L30 55 L33 72" stroke="white" strokeWidth="3" fill="none" opacity="0.5" strokeLinejoin="miter" />
        {/* Layer 5: Sparkle - small diamond on right */}
        <path d="M63 45 L66 48 L63 51 L60 48 Z" fill="white" opacity="0.4" />
    </IconBase>
);

// ========================================
// 2. PROTEIN BOLT ICON (Quick Log Protein)
// ========================================
// Concept: Aggressive lightning bolt representing
//   energy/power. Sharp zigzag with angular turns,
//   layered depth, radiating energy lines.
//
// Geometric Breakdown:
//   - Outer bolt: Classic 7-vertex zigzag polygon
//     All angles at 30° or 60° creating aggressive shape
//   - Inner bolt: Slightly smaller offset for depth
//   - Energy lines: 4 short angular lines radiating
//     from bolt edges at 45° angles
//   - Core highlight: Thin angular slash through center
//
// Layers:
//   1. Base: Outer bolt body (blue gradient)
//   2. Glass: Full bolt overlay (glass gradient)
//   3. Core: Inner bright line (white, thin)
//   4. Energy: Radiating accent lines (white, faint)
//
// Animation: Bolt flashes opacity 0.8→1.0,
//   energy lines pulse outward
// ========================================
export const ProteinBoltIcon = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Outer bolt body - sharp zigzag 7-vertex */}
        <path d="M62 3 L22 52 L44 52 L32 97 L82 42 L58 42 L68 3 Z"
              fill="url(#ic-grad-blue)" stroke="#1e3a8a" strokeWidth="2" strokeLinejoin="miter" />
        {/* Layer 2: Glass overlay - same bolt shape */}
        <path d="M62 3 L22 52 L44 52 L32 97 L82 42 L58 42 L68 3 Z"
              fill="url(#ic-grad-glass)" />
        {/* Layer 3: Inner highlight bolt - narrower path */}
        <path d="M58 15 L35 48 L48 48 L40 82 L70 45 L56 45 L62 15 Z"
              fill="white" opacity="0.12" />
        {/* Layer 4: Core slash - bright center line */}
        <path d="M55 20 L38 52 M42 55 L36 80" stroke="white" strokeWidth="1.5" fill="none" opacity="0.5" />
        {/* Layer 5: Energy radiation lines */}
        <path d="M18 48 L12 42" stroke="white" strokeWidth="1.5" opacity="0.3" />
        <path d="M85 38 L92 32" stroke="white" strokeWidth="1.5" opacity="0.3" />
        <path d="M28 92 L22 96" stroke="white" strokeWidth="1.5" opacity="0.25" />
        <path d="M72 8 L78 2" stroke="white" strokeWidth="1.5" opacity="0.25" />
    </IconBase>
);

// ========================================
// 3. EGG ICON (Quick Log Eggs)
// ========================================
// Concept: Geometric egg shape built from straight
//   lines with angular yolk in center. Stylized
//   power-up, not realistic. Has crack detail.
//
// Geometric Breakdown:
//   - Outer shell: 10-vertex polygon forming an angular
//     egg shape - narrower at top (30° angles),
//     wider at bottom (45° angles), symmetrical L-R
//   - Inner yolk: Hexagon shape centered slightly below
//     middle, filled with gold gradient
//   - Crack detail: Angular zigzag line near top
//   - Glass highlight: Upper-left angular shine
//
// Layers:
//   1. Base: Outer shell (white/cream fill)
//   2. Glass: Shell overlay (glass gradient)
//   3. Yolk: Inner hexagon (gold gradient)
//   4. Crack: Angular zigzag line (amber stroke)
//   5. Shine: Upper highlight polygon (white, faint)
//
// Animation: Yolk pulses scale 1.0→1.05,
//   crack line flickers opacity
// ========================================
export const EggIcon = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Outer shell - angular 10-vertex egg polygon */}
        <path d="M50 3 L62 12 L74 28 L80 48 L78 68 L70 82 L58 92 L42 92 L30 82 L22 68 L20 48 L26 28 L38 12 Z"
              fill="#fefce8" stroke="#d4d4d8" strokeWidth="1.5" strokeLinejoin="miter" />
        {/* Layer 2: Glass overlay on shell */}
        <path d="M50 3 L62 12 L74 28 L80 48 L78 68 L70 82 L58 92 L42 92 L30 82 L22 68 L20 48 L26 28 L38 12 Z"
              fill="url(#ic-grad-glass)" />
        {/* Layer 3: Yolk - inner hexagon, gold gradient */}
        <path d="M50 45 L62 52 L62 66 L50 73 L38 66 L38 52 Z"
              fill="url(#ic-grad-gold)" opacity="0.85" />
        {/* Layer 3b: Yolk highlight - small diamond */}
        <path d="M50 50 L55 55 L50 60 L45 55 Z"
              fill="url(#ic-grad-egg)" opacity="0.6" />
        {/* Layer 4: Crack detail - angular zigzag near top */}
        <path d="M42 22 L48 30 L52 24 L58 32 L62 26"
              stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.5" strokeLinejoin="miter" />
        {/* Layer 5: Shine - upper left angular highlight */}
        <path d="M38 14 L44 10 L50 8 L48 18 L40 22 Z"
              fill="white" opacity="0.3" />
    </IconBase>
);

// ========================================
// 4. CHICKEN ICON (Quick Log Chicken)
// ========================================
// Concept: Stylized angular bird/chicken silhouette.
//   Geometric side profile with sharp triangular beak,
//   angular body, straight-line wing detail. Minimal
//   but instantly recognizable as poultry.
//
// Geometric Breakdown:
//   - Body: Large angular polygon, wider at chest
//     tapering to tail, ~8 vertices
//   - Head: Smaller polygon sitting atop body
//   - Beak: Sharp triangle extending from head
//   - Wing: Angular V-shape overlaid on body
//   - Comb: Small triangular crown on top of head
//   - Legs: Two angular V-shapes at bottom
//
// Layers:
//   1. Base: Body polygon (orange gradient)
//   2. Head: Head polygon (same gradient, overlaps)
//   3. Detail: Beak triangle (dark amber)
//   4. Wing: Angular line detail (darker, semi-transparent)
//   5. Comb: Small triangular crest (red-orange)
//   6. Legs: Angular leg lines (gray)
//   7. Glass: Shine highlight on body (white overlay)
//
// Animation: Body pulses scale 1.0→1.03 on tap,
//   wing detail shimmers opacity
// ========================================
export const ChickenIcon = (props) => (
    <IconBase {...props}>
        {/* Layer 6: Legs - angular V-shapes (behind body) */}
        <path d="M40 78 L35 92 L30 92 M40 78 L38 92 L42 92"
              stroke="#a8a29e" strokeWidth="3" fill="none" strokeLinejoin="miter" />
        <path d="M60 78 L55 92 L50 92 M60 78 L58 92 L62 92"
              stroke="#a8a29e" strokeWidth="3" fill="none" strokeLinejoin="miter" />
        {/* Layer 1: Body - large angular polygon */}
        <path d="M25 42 L35 30 L65 28 L80 38 L85 55 L78 72 L68 80 L32 80 L20 70 L15 55 Z"
              fill="url(#ic-grad-orange)" stroke="#92400e" strokeWidth="1.5" strokeLinejoin="miter" />
        {/* Layer 7: Glass shine on body */}
        <path d="M35 32 L60 30 L72 38 L62 42 L38 40 Z"
              fill="white" opacity="0.2" />
        {/* Layer 2: Head - angular polygon on top */}
        <path d="M20 35 L28 18 L42 12 L52 16 L50 30 L35 35 Z"
              fill="url(#ic-grad-orange)" stroke="#92400e" strokeWidth="1.5" strokeLinejoin="miter" />
        {/* Layer 5: Comb - triangular crest on head */}
        <path d="M32 18 L35 6 L38 15 L42 4 L44 14"
              stroke="#dc2626" strokeWidth="3" fill="#ef4444" strokeLinejoin="miter" />
        {/* Layer 3: Beak - sharp triangle extending right */}
        <path d="M18 28 L8 32 L18 36 Z"
              fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
        {/* Layer 3b: Eye - small diamond */}
        <path d="M30 24 L32 22 L34 24 L32 26 Z"
              fill="#1c1917" />
        {/* Layer 4: Wing detail - angular V-shapes on body */}
        <path d="M40 45 L55 38 L75 48 M42 52 L58 45 L72 55 M44 60 L60 52 L70 62"
              stroke="#7c2d12" strokeWidth="2" fill="none" opacity="0.2" strokeLinejoin="miter" />
        {/* Tail feathers - angular lines at back */}
        <path d="M78 55 L90 48 L88 55 L92 60 L82 62"
              fill="#ea580c" stroke="#92400e" strokeWidth="1" strokeLinejoin="miter" />
    </IconBase>
);

// 5. Chef Hat
// Concept: Angular chef's toque with geometric pleats rising from
//   a rigid hatband. Stacked trapezoidal puffs create the classic
//   tall chef hat silhouette using only sharp angles.
//
// Layers: hatband base → angular dome body → glass overlay →
//   pleat detail lines → highlight accent
export const ChefHatIcon = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Hatband base - rigid trapezoid */}
        <path d="M18 72 L82 72 L80 95 L20 95 Z" fill="url(#ic-grad-silver)" />
        <path d="M18 72 L82 72 L80 80 L20 80 Z" fill="#94a3b8" opacity="0.4" />

        {/* Layer 2: Angular dome - stacked trapezoidal puffs */}
        <path d="M18 72 L10 60 L5 42 L12 25 L25 12 L38 5 L50 2 L62 5 L75 12 L88 25 L95 42 L90 60 L82 72 Z"
              fill="white" />

        {/* Layer 3: Glass overlay on dome */}
        <path d="M18 72 L10 60 L5 42 L12 25 L25 12 L38 5 L50 2 L62 5 L75 12 L88 25 L95 42 L90 60 L82 72 Z"
              fill="url(#ic-grad-glass)" />

        {/* Layer 4: Pleat lines - angular vertical creases */}
        <path d="M35 72 L37 45 L40 18" stroke="#94a3b8" strokeWidth="1.5" opacity="0.25" fill="none" strokeLinejoin="miter" />
        <path d="M50 72 L50 40 L50 5" stroke="#94a3b8" strokeWidth="1.5" opacity="0.25" fill="none" strokeLinejoin="miter" />
        <path d="M65 72 L63 45 L60 18" stroke="#94a3b8" strokeWidth="1.5" opacity="0.25" fill="none" strokeLinejoin="miter" />

        {/* Layer 5: Left highlight accent */}
        <path d="M12 25 L18 38 L15 55 L18 72" stroke="white" strokeWidth="2" opacity="0.35" fill="none" strokeLinejoin="miter" />

        {/* Layer 6: Hatband detail line */}
        <path d="M22 76 L78 76" stroke="#64748b" strokeWidth="1" opacity="0.3" />
    </IconBase>
);

// 6. Utensils
// Concept: Angular crossed fork and knife forming an X pattern.
//   Fork has sharp geometric tines, knife has chamfered blade edge.
//   Both rendered with only M/L commands for maximum angularity.
//
// Layers: knife body → knife edge highlight → fork body →
//   fork tine details → glass overlay → crossing point accent
export const UtensilsIcon = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Knife - angled blade with sharp edge */}
        <g transform="rotate(25, 50, 50)">
            {/* Knife blade */}
            <path d="M44 8 L52 8 L54 15 L54 55 L48 55 L44 15 Z" fill="url(#ic-grad-silver)" />
            {/* Knife edge highlight */}
            <path d="M44 8 L44 15 L48 55" stroke="white" strokeWidth="1.5" opacity="0.4" fill="none" strokeLinejoin="miter" />
            {/* Knife handle */}
            <path d="M44 55 L56 55 L56 60 L58 60 L58 92 L42 92 L42 60 L44 60 Z" fill="#64748b" />
            {/* Handle rivet diamonds */}
            <path d="M50 68 L52 70 L50 72 L48 70 Z" fill="#94a3b8" />
            <path d="M50 78 L52 80 L50 82 L48 80 Z" fill="#94a3b8" />
        </g>

        {/* Layer 2: Fork - angular tines */}
        <g transform="rotate(-25, 50, 50)">
            {/* Fork tines - 3 sharp prongs */}
            <path d="M38 8 L42 8 L42 32 L38 32 Z" fill="url(#ic-grad-silver)" />
            <path d="M46 8 L54 8 L54 32 L46 32 Z" fill="url(#ic-grad-silver)" />
            <path d="M58 8 L62 8 L62 32 L58 32 Z" fill="url(#ic-grad-silver)" />

            {/* Fork neck - connecting tines to handle */}
            <path d="M36 32 L64 32 L58 48 L42 48 Z" fill="url(#ic-grad-silver)" />

            {/* Fork handle */}
            <path d="M44 48 L56 48 L55 92 L45 92 Z" fill="#64748b" />

            {/* Glass overlay on tines */}
            <path d="M38 8 L42 8 L42 32 L38 32 Z" fill="url(#ic-grad-glass)" />
            <path d="M46 8 L54 8 L54 32 L46 32 Z" fill="url(#ic-grad-glass)" />
            <path d="M58 8 L62 8 L62 32 L58 32 Z" fill="url(#ic-grad-glass)" />
        </g>

        {/* Layer 3: Center crossing accent diamond */}
        <path d="M50 42 L54 46 L50 50 L46 46 Z" fill="white" opacity="0.3" />
    </IconBase>
);

// 7. Flame
// Concept: Angular stacked flame with outer fire envelope and
//   inner hot core. Sharp zigzag edges create aggressive fire
//   silhouette. Multi-layered for depth with glow accent.
//
// Layers: outer flame body → inner hot core → highlight edge →
//   base ember accent
export const FlameIcon = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Outer flame - angular zigzag silhouette */}
        <path d="M50 2 L62 18 L58 28 L72 15 L78 35 L85 30 L88 55 L82 68 L75 78 L68 88 L58 95 L50 97 L42 95 L32 88 L25 78 L18 68 L12 55 L15 30 L22 35 L28 15 L42 28 L38 18 Z"
              fill="url(#ic-grad-orange)" />

        {/* Layer 2: Inner hot core - brighter angular shape */}
        <path d="M50 25 L58 38 L55 48 L65 42 L68 58 L62 72 L55 82 L50 85 L45 82 L38 72 L32 58 L35 42 L45 48 L42 38 Z"
              fill="#fbbf24" opacity="0.85" />

        {/* Layer 3: Inner hottest core */}
        <path d="M50 48 L55 58 L52 68 L50 72 L48 68 L45 58 Z"
              fill="#fef3c7" opacity="0.6" />

        {/* Layer 4: Left edge highlight */}
        <path d="M15 30 L22 35 L28 15 L42 28 L38 18 L50 2"
              stroke="white" strokeWidth="1.5" opacity="0.25" fill="none" strokeLinejoin="miter" />

        {/* Layer 5: Base ember glow line */}
        <path d="M35 90 L42 95 L50 97 L58 95 L65 90"
              stroke="#dc2626" strokeWidth="2" opacity="0.5" fill="none" strokeLinejoin="miter" />
    </IconBase>
);

// 8. Water Full
// Concept: Angular filled water droplet using polygon approximation.
//   Sharp pointed top tapering to a wide angular base. Internal
//   wave line and highlight diamond for liquid feel.
//
// Layers: droplet body → wave detail → glass overlay →
//   highlight diamond → top point accent
export const WaterFullIcon = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Angular droplet body - pointed top, wide angular base */}
        <path d="M50 5 L62 28 L75 48 L82 62 L85 72 L82 82 L75 88 L65 93 L50 95 L35 93 L25 88 L18 82 L15 72 L18 62 L25 48 L38 28 Z"
              fill="url(#ic-grad-blue)" />

        {/* Layer 2: Angular wave line across middle */}
        <path d="M22 62 L30 58 L38 64 L46 56 L54 64 L62 56 L70 62 L78 58"
              stroke="white" strokeWidth="3" opacity="0.25" fill="none" strokeLinejoin="miter" />

        {/* Layer 3: Glass overlay - upper portion */}
        <path d="M50 5 L62 28 L75 48 L82 62 L50 62 L18 62 L25 48 L38 28 Z"
              fill="url(#ic-grad-glass)" />

        {/* Layer 4: Highlight diamond - specular reflection */}
        <path d="M68 48 L72 52 L68 56 L64 52 Z" fill="white" opacity="0.5" />

        {/* Layer 5: Top point accent */}
        <path d="M50 5 L55 15 L50 12 L45 15 Z" fill="white" opacity="0.3" />
    </IconBase>
);

// ========================================
// 9. FORM COACH ICON (AI Form Analysis)
// ========================================
// Concept: Angular camera viewfinder / crosshair representing
//   AI watching and analyzing workout form. Recording indicator
//   in corner. Feels like precision targeting.
//
// Geometric Breakdown:
//   - Outer frame: Octagonal viewfinder (8-vertex polygon)
//   - Corner brackets: 4 angular L-shapes at corners
//   - Crosshair: Vertical + horizontal lines through center
//   - Target: Small diamond at center intersection
//   - Recording: Angular rectangle + diamond indicator top-right
//   - Grid lines: Faint pose-detection grid overlay
//
// Layers:
//   1. Base: Octagonal frame (dark fill, cyan stroke)
//   2. Brackets: Corner L-shapes (cyan gradient)
//   3. Crosshair: Center lines (cyan)
//   4. Target: Center diamond (solid cyan)
//   5. Recording: Indicator (red pulsing diamond)
//   6. Grid: Faint detection lines (white, low opacity)
//
// Animation: Target diamond pulses scale,
//   recording indicator blinks opacity
// ========================================
export const FormCoachIconShape = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Octagonal viewfinder frame */}
        <path d="M20 10 L80 10 L95 25 L95 75 L80 90 L20 90 L5 75 L5 25 Z"
              fill="#1e293b" stroke="url(#ic-grad-cyan)" strokeWidth="3" strokeLinejoin="miter" />
        {/* Layer 2: Corner brackets - top-left */}
        <path d="M12 20 L12 12 L20 12" stroke="url(#ic-grad-cyan)" strokeWidth="4" fill="none" strokeLinejoin="miter" />
        {/* Corner bracket - top-right */}
        <path d="M80 12 L88 12 L88 20" stroke="url(#ic-grad-cyan)" strokeWidth="4" fill="none" strokeLinejoin="miter" />
        {/* Corner bracket - bottom-left */}
        <path d="M12 80 L12 88 L20 88" stroke="url(#ic-grad-cyan)" strokeWidth="4" fill="none" strokeLinejoin="miter" />
        {/* Corner bracket - bottom-right */}
        <path d="M80 88 L88 88 L88 80" stroke="url(#ic-grad-cyan)" strokeWidth="4" fill="none" strokeLinejoin="miter" />
        {/* Layer 3: Crosshair lines */}
        <path d="M50 20 L50 42 M50 58 L50 80" stroke="url(#ic-grad-cyan)" strokeWidth="2" fill="none" />
        <path d="M20 50 L42 50 M58 50 L80 50" stroke="url(#ic-grad-cyan)" strokeWidth="2" fill="none" />
        {/* Layer 4: Center target diamond */}
        <path d="M50 42 L58 50 L50 58 L42 50 Z"
              fill="url(#ic-grad-cyan)" opacity="0.8" />
        {/* Layer 5: Recording indicator - top right */}
        <path d="M72 8 L88 8 L88 20 L72 20 Z"
              fill="#1e293b" stroke="url(#ic-grad-cyan)" strokeWidth="2" strokeLinejoin="miter" />
        <path d="M80 11 L83 14 L80 17 L77 14 Z"
              fill="red" className="animate-pulse" />
        {/* Layer 6: Grid detection lines */}
        <path d="M30 25 L30 75 M70 25 L70 75 M15 35 L85 35 M15 65 L85 65"
              stroke="white" strokeWidth="0.5" fill="none" opacity="0.12" />
    </IconBase>
);

// 10. AI Brain
export const BrainIconShape = (props) => (
    <IconBase {...props}>
        <path d="M20 50 C20 20, 40 10, 50 10 C60 10, 80 20, 80 50 C80 80, 60 90, 50 90 C40 90, 20 80, 20 50 Z" fill="none" stroke="url(#ic-grad-purple)" strokeWidth="3" />
        <path d="M30 40 Q50 30 70 40 M30 60 Q50 70 70 60" stroke="url(#ic-grad-purple)" strokeWidth="2" opacity="0.5" fill="none" />
        <circle cx="50" cy="50" r="5" fill="url(#ic-grad-purple)">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <line x1="50" y1="50" x2="20" y2="50" stroke="url(#ic-grad-purple)" strokeWidth="1" strokeDasharray="4 2" />
        <line x1="50" y1="50" x2="80" y2="30" stroke="url(#ic-grad-purple)" strokeWidth="1" strokeDasharray="4 2" />
        <line x1="50" y1="50" x2="60" y2="80" stroke="url(#ic-grad-purple)" strokeWidth="1" strokeDasharray="4 2" />
    </IconBase>
);

// ========================================
// 11. SMART TIMER ICON (Rest Timer/Stopwatch)
// ========================================
// Concept: Angular stopwatch with geometric clock face,
//   segmented progress indicator, and precise tick marks.
//   Technical, precise feel.
//
// Geometric Breakdown:
//   - Clock face: 12-sided polygon (dodecagon) ~30° per side
//   - Progress arc: 8 filled segments (angular pie slices)
//   - Crown button: Angular trapezoid at top
//   - Clock hands: Angular minute + second hands
//   - Center hub: Small diamond shape
//   - Tick marks: 12 short lines around edge at 30° intervals
//
// Layers:
//   1. Base: Dodecagonal clock face (dark fill)
//   2. Progress: Filled angular segments (orange gradient)
//   3. Ticks: 12 tick marks around edge (gray)
//   4. Hands: Angular clock hands (white)
//   5. Hub: Center diamond (white)
//   6. Crown: Top button (silver)
//
// Animation: Second hand rotates,
//   progress segments fill sequentially
// ========================================
export const SmartTimerIconShape = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Dodecagonal clock face - 12 sides */}
        <path d="M50 12 L63 14 L74 22 L82 35 L84 50 L82 65 L74 78 L63 86 L50 88 L37 86 L26 78 L18 65 L16 50 L18 35 L26 22 L37 14 Z"
              fill="#1e293b" stroke="#334155" strokeWidth="4" strokeLinejoin="miter" />
        {/* Layer 2: Progress segments - 270° filled (orange gradient) */}
        <path d="M50 50 L50 14 L63 16 L74 24 L82 37 L84 50 L82 65 L74 78 L63 86 L50 88 L37 86 L26 78 L18 65 L16 50 Z"
              fill="url(#ic-grad-orange)" opacity="0.35" />
        {/* Layer 3: Tick marks - 12 positions at 30° intervals */}
        <path d="M50 14 L50 20" stroke="#94a3b8" strokeWidth="2" />
        <path d="M74 22 L70 27" stroke="#94a3b8" strokeWidth="2" />
        <path d="M84 50 L78 50" stroke="#94a3b8" strokeWidth="2" />
        <path d="M74 78 L70 73" stroke="#94a3b8" strokeWidth="2" />
        <path d="M50 88 L50 82" stroke="#94a3b8" strokeWidth="2" />
        <path d="M26 78 L30 73" stroke="#94a3b8" strokeWidth="2" />
        <path d="M16 50 L22 50" stroke="#94a3b8" strokeWidth="2" />
        <path d="M26 22 L30 27" stroke="#94a3b8" strokeWidth="2" />
        {/* Layer 4: Minute hand - points to 12 o'clock */}
        <path d="M48 50 L50 24 L52 50 Z" fill="white" opacity="0.9" />
        {/* Layer 4b: Second hand - points to 8 o'clock area */}
        <path d="M50 50 L24 62" stroke="url(#ic-grad-orange)" strokeWidth="2" />
        {/* Layer 5: Center hub diamond */}
        <path d="M50 46 L54 50 L50 54 L46 50 Z" fill="white" />
        {/* Layer 6: Crown button at top */}
        <path d="M43 4 L57 4 L55 12 L45 12 Z"
              fill="#94a3b8" stroke="#64748b" strokeWidth="1" strokeLinejoin="miter" />
        {/* Side button */}
        <path d="M85 38 L92 34 L94 40 L87 44 Z"
              fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
    </IconBase>
);

// ========================================
// 12. MOON/SLEEP ICON (Recovery/Sleep)
// ========================================
// Concept: Angular crescent moon with sharp points
//   and geometric star. Celestial but aggressive.
//   Sleep wave pattern at bottom for recovery feel.
//
// Geometric Breakdown:
//   - Crescent: Two overlapping polygons creating moon shape
//     Outer polygon (10-vertex) minus inner polygon cutout
//     Sharp points at tips of crescent
//   - Star: 8-point angular star (overlapping diamonds)
//   - Sleep waves: 2-3 angular zigzag lines at bottom
//   - Small stars: Tiny diamonds scattered
//
// Layers:
//   1. Base: Crescent moon body (cyan gradient)
//   2. Inner cutout: Dark polygon creating crescent shape
//   3. Glass: Highlight on crescent edge (white overlay)
//   4. Star: 8-point geometric star (white, pulsing)
//   5. Small stars: Tiny diamond accents
//   6. Sleep waves: Angular zigzag lines (cyan, faint)
//
// Animation: Star pulses opacity 0.4→1.0,
//   small stars twinkle with staggered delays
// ========================================
export const MoonIconShape = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Crescent moon - angular polygon body */}
        <path d="M55 5 L65 10 L72 20 L75 35 L72 52 L65 65 L55 75 L42 78 L30 75 L22 65 L18 52 L18 35 L22 22 L30 12 L40 7 Z"
              fill="url(#ic-grad-cyan)" filter="url(#ic-glow-inner)" />
        {/* Layer 2: Inner cutout - creates crescent shape */}
        <path d="M48 15 L58 20 L64 30 L66 42 L64 55 L58 64 L48 70 L38 68 L32 60 L28 48 L30 35 L35 25 L42 18 Z"
              fill="#1e293b" />
        {/* Layer 3: Glass highlight on crescent edge */}
        <path d="M40 8 L50 6 L55 8 L48 16 L42 15 Z"
              fill="white" opacity="0.2" />
        {/* Layer 4: 8-point star - two overlapping diamonds */}
        <path d="M80 22 L84 14 L88 22 L96 26 L88 30 L84 38 L80 30 L72 26 Z"
              fill="white" opacity="0.8">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="3s" repeatCount="indefinite" />
        </path>
        {/* Layer 5: Small star accents */}
        <path d="M70 55 L72 52 L74 55 L72 58 Z" fill="white" opacity="0.5">
            <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2.5s" repeatCount="indefinite" />
        </path>
        <path d="M82 48 L83 46 L84 48 L83 50 Z" fill="white" opacity="0.4">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
        </path>
        {/* Layer 6: Sleep wave pattern - angular zigzags */}
        <path d="M15 85 L22 80 L29 85 L36 80 L43 85 L50 80 L57 85"
              stroke="url(#ic-grad-cyan)" strokeWidth="2" fill="none" opacity="0.25" strokeLinejoin="miter" />
        <path d="M25 92 L30 88 L35 92 L40 88 L45 92 L50 88"
              stroke="url(#ic-grad-cyan)" strokeWidth="1.5" fill="none" opacity="0.15" strokeLinejoin="miter" />
    </IconBase>
);

// ========================================
// 13. TROPHY ICON (Goals/Achievements)
// ========================================
// Concept: Angular championship chalice with sharp
//   edges, geometric handles, tiered base, and star
//   emblem. Prestigious, premium feel.
//
// Geometric Breakdown:
//   - Cup body: Trapezoid wider at top, narrowing to stem
//     6-vertex polygon with straight angled sides
//   - Handles: Angular L-shapes on both sides (mirrored)
//   - Stem: Narrow rectangle connecting cup to base
//   - Base: Three-tier stacked rectangles with chamfers
//   - Star: 5-point geometric star on cup face
//   - Glass: Highlight strip on left edge of cup
//
// Layers:
//   1. Base: Cup body (gold gradient)
//   2. Handles: Angular L-shapes (gold stroke)
//   3. Stem + base tiers (dark gold)
//   4. Star emblem (white)
//   5. Glass highlight (white overlay)
//
// Animation: Cup body pulses scale 1.0→1.05,
//   star flickers opacity 0.6→1.0
// ========================================
export const TrophyIconShape = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Cup body - angular trapezoid */}
        <path d="M25 15 L75 15 L70 22 L65 55 L55 62 L45 62 L35 55 L30 22 Z"
              fill="url(#ic-grad-gold)" stroke="#a16207" strokeWidth="2" strokeLinejoin="miter" />
        {/* Layer 1b: Cup inner depth */}
        <path d="M30 18 L70 18 L66 24 L62 52 L53 58 L47 58 L38 52 L34 24 Z"
              fill="url(#ic-grad-glass)" />
        {/* Layer 2: Left handle - angular L-shape */}
        <path d="M25 22 L15 22 L12 28 L12 45 L16 50 L22 50 L22 42 L18 38 L18 28 L25 28"
              fill="none" stroke="#facc15" strokeWidth="3" strokeLinejoin="miter" />
        {/* Layer 2b: Right handle - mirrored L-shape */}
        <path d="M75 22 L85 22 L88 28 L88 45 L84 50 L78 50 L78 42 L82 38 L82 28 L75 28"
              fill="none" stroke="#facc15" strokeWidth="3" strokeLinejoin="miter" />
        {/* Layer 3: Stem */}
        <path d="M45 62 L45 72 L55 72 L55 62 Z"
              fill="#a16207" />
        {/* Layer 3b: Base tier 1 (small) */}
        <path d="M40 72 L60 72 L60 78 L40 78 Z"
              fill="#ca8a04" stroke="#92400e" strokeWidth="1" />
        {/* Layer 3c: Base tier 2 (medium) */}
        <path d="M35 78 L65 78 L65 84 L35 84 Z"
              fill="#b45309" stroke="#92400e" strokeWidth="1" />
        {/* Layer 3d: Base tier 3 (wide) */}
        <path d="M28 84 L72 84 L72 92 L28 92 Z"
              fill="#92400e" stroke="#78350f" strokeWidth="1" />
        {/* Layer 4: Star emblem on cup face */}
        <path d="M50 25 L52.5 33 L60 33 L54 38 L56 46 L50 42 L44 46 L46 38 L40 33 L47.5 33 Z"
              fill="white" opacity="0.75" />
        {/* Layer 5: Glass highlight on left edge */}
        <path d="M28 18 L32 18 L34 50 L30 42 Z"
              fill="white" opacity="0.15" />
    </IconBase>
);

// ========================================
// 14. NUTRITION LEAF ICON (Meal Tracking)
// ========================================
// Concept: Geometric leaf shape with angular veins
//   and sharp points on edges. Represents healthy
//   nutrition and growth. Stylized, not organic.
//
// Geometric Breakdown:
//   - Leaf body: 10-vertex polygon with sharp points
//     at tip and serrated edges, symmetrical
//   - Central vein: Straight vertical line through center
//   - Side veins: 4 angled lines branching from center
//     at 45° angles (2 per side)
//   - Stem: Angular line extending from leaf bottom
//   - Glass: Highlight polygon on upper-left area
//
// Layers:
//   1. Base: Leaf body polygon (green gradient)
//   2. Glass: Highlight overlay (white)
//   3. Veins: Central + branching lines (dark green)
//   4. Stem: Angular line at bottom (brown/dark green)
//   5. Detail: Small serration notches on edges
//
// Animation: Leaf sways slightly (rotate -2° to 2°),
//   vein lines pulse opacity
// ========================================
export const NutritionIconShape = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Leaf body - 10-vertex angular polygon */}
        <path d="M50 5 L62 15 L75 28 L82 45 L78 60 L68 75 L55 85 L50 92 L45 85 L32 75 L22 60 L18 45 L25 28 L38 15 Z"
              fill="url(#ic-grad-green)" stroke="#166534" strokeWidth="2" strokeLinejoin="miter" />
        {/* Layer 2: Glass highlight - upper left */}
        <path d="M50 8 L40 18 L28 32 L24 45 L30 35 L42 20 Z"
              fill="white" opacity="0.2" />
        {/* Layer 3: Central vein */}
        <path d="M50 12 L50 88" stroke="#166534" strokeWidth="2.5" fill="none" opacity="0.4" />
        {/* Layer 3b: Side veins - left branches at 45° */}
        <path d="M50 32 L32 22" stroke="#166534" strokeWidth="2" fill="none" opacity="0.3" />
        <path d="M50 52 L25 42" stroke="#166534" strokeWidth="2" fill="none" opacity="0.3" />
        <path d="M50 68 L35 60" stroke="#166534" strokeWidth="1.5" fill="none" opacity="0.25" />
        {/* Layer 3c: Side veins - right branches at 45° */}
        <path d="M50 32 L68 22" stroke="#166534" strokeWidth="2" fill="none" opacity="0.3" />
        <path d="M50 52 L75 42" stroke="#166534" strokeWidth="2" fill="none" opacity="0.3" />
        <path d="M50 68 L65 60" stroke="#166534" strokeWidth="1.5" fill="none" opacity="0.25" />
        {/* Layer 4: Stem at bottom */}
        <path d="M50 88 L48 96 L44 100" stroke="#166534" strokeWidth="3" fill="none" strokeLinejoin="miter" />
    </IconBase>
);

// ========================================
// 15. ANALYTICS CHART ICON (Stats/Dashboard)
// ========================================
// Concept: Angular bar chart with ascending bars,
//   sharp upward trend arrow, and geometric grid.
//   Represents growth, progress, and data analysis.
//
// Geometric Breakdown:
//   - Bars: 4 ascending rectangular bars with chamfered
//     top edges (45° angles), increasing height L→R
//   - Axis: L-shaped axis lines (90° corner)
//   - Trend arrow: Angular arrow line connecting bar tops
//     with pointed arrowhead at end
//   - Grid: Faint horizontal reference lines
//   - Arrow tip: Triangular arrowhead (sharp point)
//
// Layers:
//   1. Grid: Faint horizontal reference lines
//   2. Axis: L-shaped baseline (gray)
//   3. Bars: 4 ascending bars (pink gradient, increasing opacity)
//   4. Trend: Angular arrow line connecting tops (white)
//   5. Arrow tip: Triangular point (white)
//
// Animation: Bars grow upward sequentially,
//   trend arrow draws with pathLength
// ========================================
export const AnalyticsIconShape = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Grid reference lines */}
        <path d="M8 30 L92 30 M8 50 L92 50 M8 70 L92 70"
              stroke="white" strokeWidth="0.5" fill="none" opacity="0.08" />
        {/* Layer 2: Axis lines - L-shape */}
        <path d="M8 10 L8 92 L92 92" stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinejoin="miter" />
        {/* Layer 3: Bar 1 (shortest) - chamfered top */}
        <path d="M14 92 L14 72 L16 68 L24 68 L26 72 L26 92 Z"
              fill="url(#ic-grad-pink)" opacity="0.4" />
        {/* Bar 2 */}
        <path d="M34 92 L34 55 L36 51 L44 51 L46 55 L46 92 Z"
              fill="url(#ic-grad-pink)" opacity="0.6" />
        {/* Bar 3 */}
        <path d="M54 92 L54 38 L56 34 L64 34 L66 38 L66 92 Z"
              fill="url(#ic-grad-pink)" opacity="0.8" />
        {/* Bar 4 (tallest) */}
        <path d="M74 92 L74 18 L76 14 L84 14 L86 18 L86 92 Z"
              fill="url(#ic-grad-pink)" />
        {/* Layer 4: Trend arrow line */}
        <path d="M20 65 L40 48 L60 30 L78 12"
              stroke="white" strokeWidth="3" fill="none" strokeLinejoin="miter" />
        {/* Layer 5: Arrow tip - triangle */}
        <path d="M78 12 L85 8 L82 18 Z" fill="white" />
    </IconBase>
);

// 16. Pulse Heart
export const PulseHeartIcon = (props) => (
    <IconBase {...props}>
        <path d="M50 90 C20 70, 10 40, 10 30 C10 15, 25 5, 40 5 C55 5, 50 25, 50 25 C50 25, 45 5, 60 5 C75 5, 90 15, 90 30 C90 40, 80 70, 50 90 Z" fill="url(#ic-grad-pink)" />
        <path d="M50 90 C20 70, 10 40, 10 30 C10 15, 25 5, 40 5 C55 5, 50 25, 50 25 C50 25, 45 5, 60 5 C75 5, 90 15, 90 30 C90 40, 80 70, 50 90 Z" fill="url(#ic-grad-glass)" />
        <path d="M15 50 L30 50 L40 25 L50 75 L60 35 L70 50 L85 50" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" className="animate-pulse" />
    </IconBase>
);

// ========================================
// 17. TREADMILL ICON (Cardio Activity)
// ========================================
// Concept: Angular treadmill machine silhouette with
//   geometric frame, display screen, belt platform,
//   and stick-figure runner. Instantly recognizable.
//
// Geometric Breakdown:
//   - Belt/platform: Parallelogram with angular edges
//   - Upright post: Angular line from belt to top
//   - Display: Rectangular screen at top with data lines
//   - Handrails: Angular lines from post sides
//   - Runner figure: Geometric stick figure (diamond head,
//     angular limbs using only straight lines)
//   - Belt lines: Horizontal detail lines on platform
//
// Layers:
//   1. Base: Belt platform (dark gray)
//   2. Frame: Upright post + handrails (silver/gray)
//   3. Display: Screen rectangle (blue gradient)
//   4. Figure: Stick runner (white)
//   5. Belt detail: Horizontal running lines
//
// Animation: Belt lines scroll horizontally,
//   figure limbs alternate position
// ========================================
export const TreadmillIcon = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Belt platform - angular parallelogram */}
        <path d="M5 78 L88 78 L92 88 L2 88 Z"
              fill="#334155" stroke="#1e293b" strokeWidth="2" strokeLinejoin="miter" />
        {/* Layer 1b: Belt surface detail lines */}
        <path d="M10 82 L85 82 M12 85 L82 85"
              stroke="black" strokeWidth="1" fill="none" opacity="0.3" />
        {/* Layer 2: Upright post */}
        <path d="M78 78 L72 32 L76 28" stroke="#94a3b8" strokeWidth="4" fill="none" strokeLinejoin="miter" />
        {/* Layer 2b: Left handrail */}
        <path d="M72 45 L60 50" stroke="#94a3b8" strokeWidth="3" fill="none" />
        {/* Layer 2c: Right handrail */}
        <path d="M78 40 L88 38" stroke="#94a3b8" strokeWidth="3" fill="none" />
        {/* Layer 3: Display screen */}
        <path d="M68 14 L90 10 L92 24 L70 28 Z"
              fill="url(#ic-grad-blue)" stroke="#1e3a8a" strokeWidth="1.5" strokeLinejoin="miter" />
        {/* Display data lines */}
        <path d="M72 17 L86 14 M72 22 L82 20"
              stroke="white" strokeWidth="1" fill="none" opacity="0.5" />
        {/* Layer 4: Runner figure - angular stick figure */}
        {/* Head - diamond */}
        <path d="M40 22 L43 18 L46 22 L43 26 Z" fill="white" />
        {/* Torso */}
        <path d="M43 26 L43 48" stroke="white" strokeWidth="3.5" fill="none" />
        {/* Arms - reaching forward */}
        <path d="M43 34 L55 30 M43 38 L32 42" stroke="white" strokeWidth="3" fill="none" strokeLinejoin="miter" />
        {/* Front leg - extended */}
        <path d="M43 48 L56 60 L58 74" stroke="white" strokeWidth="3" fill="none" strokeLinejoin="miter" />
        {/* Back leg - pushing off */}
        <path d="M43 48 L30 58 L35 74" stroke="white" strokeWidth="3" fill="none" strokeLinejoin="miter" />
    </IconBase>
);

// ========================================
// 18. WALKING ICON (Step Tracking)
// ========================================
// Concept: Angular footprint pairs showing motion path
//   with direction arrows. Geometric shoe prints,
//   NOT organic. Conveys forward movement / steps.
//
// Geometric Breakdown:
//   - Footprints: 2 angular shoe-shaped polygons (6-vertex
//     each), arranged as a walking pair
//   - Toe detail: Triangular toe points on each footprint
//   - Motion arrows: Small angular arrows showing direction
//   - Path dots: Diamond shapes trailing behind
//
// Layers:
//   1. Base: Two footprint polygons (cyan gradient)
//   2. Toe: Triangular toe detail on each
//   3. Internal: Arch detail lines inside foot
//   4. Arrows: Direction indicators (white)
//   5. Trail: Diamond dot path behind (faint)
//
// Animation: Footprints alternate opacity (walking rhythm),
//   arrows pulse forward
// ========================================
export const WalkingIcon = (props) => (
    <IconBase {...props}>
        {/* Layer 5: Trail dots behind - diamond shapes */}
        <path d="M28 90 L30 88 L32 90 L30 92 Z" fill="url(#ic-grad-cyan)" opacity="0.2" />
        <path d="M58 88 L60 86 L62 88 L60 90 Z" fill="url(#ic-grad-cyan)" opacity="0.15" />

        {/* Layer 1: Left footprint (back foot) - angular polygon */}
        <g transform="translate(12, 42) rotate(-15)">
            {/* Foot body */}
            <path d="M5 0 L22 0 L25 4 L25 32 L22 38 L18 40 L8 40 L4 38 L0 32 L0 4 Z"
                  fill="url(#ic-grad-cyan)" opacity="0.55" stroke="#0e7490" strokeWidth="1.5" strokeLinejoin="miter" />
            {/* Toe bumps */}
            <path d="M6 0 L8 -4 L11 0 M14 0 L16 -5 L19 0" stroke="#0e7490" strokeWidth="1.5" fill="url(#ic-grad-cyan)" opacity="0.55" strokeLinejoin="miter" />
            {/* Arch detail */}
            <path d="M8 15 L8 28 M18 15 L18 28" stroke="#0c4a6e" strokeWidth="1" fill="none" opacity="0.3" />
        </g>

        {/* Layer 1b: Right footprint (front foot) - angular polygon */}
        <g transform="translate(48, 10) rotate(12)">
            {/* Foot body */}
            <path d="M5 0 L22 0 L25 4 L25 32 L22 38 L18 40 L8 40 L4 38 L0 32 L0 4 Z"
                  fill="url(#ic-grad-cyan)" stroke="#0e7490" strokeWidth="1.5" strokeLinejoin="miter" />
            {/* Toe bumps */}
            <path d="M6 0 L8 -4 L11 0 M14 0 L16 -5 L19 0" stroke="#0e7490" strokeWidth="1.5" fill="url(#ic-grad-cyan)" strokeLinejoin="miter" />
            {/* Arch detail */}
            <path d="M8 15 L8 28 M18 15 L18 28" stroke="#0c4a6e" strokeWidth="1" fill="none" opacity="0.3" />
        </g>

        {/* Layer 4: Direction arrow - angular pointing up-right */}
        <path d="M72 18 L82 8 L78 18 Z" fill="white" opacity="0.5" />
        <path d="M68 22 L82 8" stroke="white" strokeWidth="2" fill="none" opacity="0.4" />
    </IconBase>
);

// ========================================
// 19. CYCLING ICON (Bike Activity)
// ========================================
// Concept: Angular bicycle with two dodecagonal wheels,
//   diamond frame, and geometric handlebars/pedals.
//   Recognizable as a bicycle at small sizes.
//
// Geometric Breakdown:
//   - Wheels: Two 12-sided polygons (dodecagons)
//   - Frame: Diamond/triangle connecting hubs
//   - Handlebars: Angular lines from stem
//   - Seat: Small angular shape on top tube
//   - Pedal/crank: Small angular detail at bottom bracket
//   - Spokes: Straight lines from hub to rim (4 per wheel)
//
// Layers:
//   1. Wheels: Dodecagonal rims (orange gradient stroke)
//   2. Spokes: Hub-to-rim lines (faint white)
//   3. Frame: Diamond triangle (white)
//   4. Handlebars + seat (white)
//   5. Pedal crank detail (orange)
//
// Animation: Wheels rotate, frame pulses scale
// ========================================
export const CyclingIcon = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Rear wheel - 12-sided polygon */}
        <path d="M25 52 L29 54 L32 58 L33 63 L32 68 L29 72 L25 74 L21 72 L18 68 L17 63 L18 58 L21 54 Z"
              fill="none" stroke="url(#ic-grad-orange)" strokeWidth="3.5" strokeLinejoin="miter" />
        {/* Layer 1b: Front wheel - 12-sided polygon */}
        <path d="M75 52 L79 54 L82 58 L83 63 L82 68 L79 72 L75 74 L71 72 L68 68 L67 63 L68 58 L71 54 Z"
              fill="none" stroke="url(#ic-grad-orange)" strokeWidth="3.5" strokeLinejoin="miter" />
        {/* Layer 2: Spokes - rear wheel */}
        <path d="M25 54 L25 72 M18 63 L32 63" stroke="url(#ic-grad-orange)" strokeWidth="1" opacity="0.4" />
        {/* Layer 2b: Spokes - front wheel */}
        <path d="M75 54 L75 72 M68 63 L82 63" stroke="url(#ic-grad-orange)" strokeWidth="1" opacity="0.4" />
        {/* Layer 3: Frame - diamond triangle */}
        <path d="M25 63 L45 35 L75 63 M45 35 L62 35 L75 63 M25 63 L50 63"
              stroke="white" strokeWidth="3" fill="none" strokeLinejoin="miter" />
        {/* Layer 4: Handlebars */}
        <path d="M62 35 L62 28 M58 28 L66 28 L68 25"
              stroke="white" strokeWidth="2.5" fill="none" strokeLinejoin="miter" />
        {/* Layer 4b: Seat */}
        <path d="M40 33 L50 33 L48 35 L42 35 Z" fill="white" />
        {/* Layer 5: Pedal crank detail */}
        <path d="M50 63 L46 70 M50 63 L54 56" stroke="url(#ic-grad-orange)" strokeWidth="2.5" fill="none" />
        <path d="M43 70 L49 70 M51 56 L57 56" stroke="url(#ic-grad-orange)" strokeWidth="2" fill="none" />
    </IconBase>
);

// ========================================
// 20. SUN ICON (Daylight/Energy)
// ========================================
// Concept: Powerful geometric sun with octagonal body
//   and 8 sharp triangular rays radiating outward.
//   Symmetrical, energetic, aggressive feel.
//
// Geometric Breakdown:
//   - Body: Octagon (8-sided, 45° per vertex)
//   - Rays: 8 triangular rays at 45° intervals
//     Each ray is a pointed triangle radiating outward
//   - Inner highlight: Smaller octagon (glass overlay)
//   - Center: Small diamond at exact center
//
// Layers:
//   1. Rays: 8 triangular rays (gold gradient)
//   2. Body: Outer octagon (gold gradient)
//   3. Glass: Inner octagon (white overlay)
//   4. Center: Small diamond (white)
//
// Animation: Rays pulse opacity 0.7→1.0,
//   body scales 1.0→1.05
// ========================================
export const SunIcon = (props) => (
    <IconBase {...props}>
        {/* Layer 1: 8 triangular rays at 45° intervals */}
        {/* Top ray */}
        <path d="M46 30 L50 5 L54 30 Z" fill="url(#ic-grad-gold)" />
        {/* Top-right ray */}
        <path d="M62 34 L82 18 L66 38 Z" fill="url(#ic-grad-gold)" />
        {/* Right ray */}
        <path d="M70 46 L95 50 L70 54 Z" fill="url(#ic-grad-gold)" />
        {/* Bottom-right ray */}
        <path d="M66 62 L82 82 L62 66 Z" fill="url(#ic-grad-gold)" />
        {/* Bottom ray */}
        <path d="M54 70 L50 95 L46 70 Z" fill="url(#ic-grad-gold)" />
        {/* Bottom-left ray */}
        <path d="M38 66 L18 82 L34 62 Z" fill="url(#ic-grad-gold)" />
        {/* Left ray */}
        <path d="M30 54 L5 50 L30 46 Z" fill="url(#ic-grad-gold)" />
        {/* Top-left ray */}
        <path d="M34 38 L18 18 L38 34 Z" fill="url(#ic-grad-gold)" />
        {/* Layer 2: Outer octagon body */}
        <path d="M50 28 L64 32 L72 44 L72 56 L64 68 L50 72 L36 68 L28 56 L28 44 L36 32 Z"
              fill="url(#ic-grad-gold)" stroke="#a16207" strokeWidth="2" strokeLinejoin="miter" />
        {/* Layer 3: Glass highlight - inner octagon */}
        <path d="M50 34 L60 37 L66 46 L66 54 L60 63 L50 66 L40 63 L34 54 L34 46 L40 37 Z"
              fill="url(#ic-grad-glass)" />
        {/* Layer 4: Center diamond */}
        <path d="M50 44 L56 50 L50 56 L44 50 Z" fill="white" opacity="0.4" />
    </IconBase>
);

// ========================================
// 21. BATTERY ICON (Energy Levels)
// ========================================
// Concept: Angular battery with sharp edges, positive
//   terminal, charge level bars, and lightning bolt
//   overlay. Technical, sharp appearance.
//
// Geometric Breakdown:
//   - Body: Rectangle with 45° chamfered corners (8-vertex)
//   - Terminal: Small angular trapezoid on top
//   - Charge bars: 4 horizontal rectangles with chamfers
//   - Bolt: Angular lightning bolt overlay (white)
//   - Glass: Highlight strip on left edge
//
// Layers:
//   1. Body: Battery outline (green gradient stroke)
//   2. Terminal: Positive contact (green fill)
//   3. Bars: 4 charge levels (green, increasing opacity)
//   4. Bolt: Lightning overlay (white)
//   5. Glass: Left edge highlight
//
// Animation: Charge bars fill up sequentially,
//   bolt pulses opacity
// ========================================
export const BatteryIcon = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Battery body - chamfered rectangle */}
        <path d="M27 22 L29 20 L71 20 L73 22 L73 82 L71 84 L29 84 L27 82 Z"
              fill="none" stroke="url(#ic-grad-green)" strokeWidth="3.5" strokeLinejoin="miter" />
        {/* Layer 2: Positive terminal */}
        <path d="M40 12 L42 10 L58 10 L60 12 L60 20 L40 20 Z"
              fill="url(#ic-grad-green)" stroke="#166534" strokeWidth="1" strokeLinejoin="miter" />
        {/* Layer 3: Charge bar 1 (bottom, lowest charge) */}
        <path d="M33 72 L35 70 L65 70 L67 72 L67 78 L65 80 L35 80 L33 78 Z"
              fill="url(#ic-grad-green)" opacity="0.4" />
        {/* Charge bar 2 */}
        <path d="M33 57 L35 55 L65 55 L67 57 L67 63 L65 65 L35 65 L33 63 Z"
              fill="url(#ic-grad-green)" opacity="0.6" />
        {/* Charge bar 3 */}
        <path d="M33 42 L35 40 L65 40 L67 42 L67 48 L65 50 L35 50 L33 48 Z"
              fill="url(#ic-grad-green)" opacity="0.8" />
        {/* Charge bar 4 (top, full) */}
        <path d="M33 27 L35 25 L65 25 L67 27 L67 33 L65 35 L35 35 L33 33 Z"
              fill="url(#ic-grad-green)" opacity="0.95" />
        {/* Layer 4: Lightning bolt overlay */}
        <path d="M56 32 L44 52 L52 52 L44 72 Z"
              fill="white" opacity="0.3" stroke="white" strokeWidth="1" strokeLinejoin="miter" />
        {/* Layer 5: Glass highlight on left edge */}
        <path d="M29 22 L32 22 L32 80 L29 80 Z" fill="white" opacity="0.1" />
    </IconBase>
);

// 22. Dumbbell (Strength/Workouts)
export const DumbbellIcon = (props) => (
    <IconBase {...props}>
        {/* Bar */}
        <line x1="20" y1="50" x2="80" y2="50" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
        {/* Weights Left */}
        <rect x="10" y="30" width="10" height="40" rx="2" fill="url(#ic-grad-blue)" />
        <rect x="5" y="35" width="5" height="30" rx="1" fill="url(#ic-grad-blue)" opacity="0.8" />
        {/* Weights Right */}
        <rect x="80" y="30" width="10" height="40" rx="2" fill="url(#ic-grad-blue)" />
        <rect x="90" y="35" width="5" height="30" rx="1" fill="url(#ic-grad-blue)" opacity="0.8" />
    </IconBase>
);

// ========================================
// 23. SCALE ICON (Weight Tracking)
// ========================================
// Concept: Angular digital scale with geometric platform,
//   display screen showing weight, and support feet.
//   Modern, technical measurement device.
//
// Geometric Breakdown:
//   - Platform: Large chamfered rectangle (main body)
//   - Display: Inset rectangle with angular screen
//   - Weight readout: "97.0" text or segment indicators
//   - Feet: 4 small angular supports underneath
//   - Glass: Highlight on platform surface
//   - Edge bevel: 45° chamfers on all platform corners
//
// Layers:
//   1. Base: Platform body (silver gradient)
//   2. Display: Inset screen (dark fill)
//   3. Readout: Weight text (cyan)
//   4. Feet: Support blocks (dark)
//   5. Glass: Surface highlight (white)
//   6. Edge: Bevel detail line
//
// Animation: Display digits pulse,
//   platform scales on weight change
// ========================================
export const ScaleIcon = (props) => (
    <IconBase {...props}>
        {/* Layer 4: Feet - small supports underneath */}
        <path d="M18 88 L22 85 L26 88 Z" fill="#334155" />
        <path d="M74 88 L78 85 L82 88 Z" fill="#334155" />
        <path d="M18 92 L22 89 L26 92 Z" fill="#334155" />
        <path d="M74 92 L78 89 L82 92 Z" fill="#334155" />
        {/* Layer 1: Platform body - chamfered rectangle */}
        <path d="M12 20 L16 16 L84 16 L88 20 L88 82 L84 86 L16 86 L12 82 Z"
              fill="url(#ic-grad-silver)" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="miter" />
        {/* Layer 5: Glass highlight on surface */}
        <path d="M16 18 L84 18 L82 24 L18 24 Z" fill="white" opacity="0.3" />
        {/* Layer 2: Display screen - inset rectangle */}
        <path d="M24 28 L28 26 L72 26 L76 28 L76 62 L72 64 L28 64 L24 62 Z"
              fill="#0f172a" stroke="#334155" strokeWidth="1.5" strokeLinejoin="miter" />
        {/* Layer 3: Weight readout text */}
        <text x="50" y="54" textAnchor="middle" fill="#22d3ee" fontSize="22" fontWeight="bold" fontFamily="monospace">97.0</text>
        {/* Layer 3b: Unit label */}
        <text x="50" y="62" textAnchor="middle" fill="#22d3ee" fontSize="8" opacity="0.5" fontFamily="monospace">KG</text>
        {/* Layer 6: Platform edge bevel line */}
        <path d="M16 78 L84 78" stroke="rgba(0,0,0,0.15)" strokeWidth="2" />
        {/* Platform surface texture lines */}
        <path d="M30 70 L70 70 M35 74 L65 74" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
    </IconBase>
);

// ========================================
// 24. RULER ICON (Height Measurement)
// ========================================
// Concept: Angular ruler at 15° angle with alternating
//   tick marks (small/medium/large), precise edges.
//   Measurement/precision feel.
//
// Geometric Breakdown:
//   - Body: Long chamfered rectangle at 15° angle
//   - Major ticks: Long lines at every 3rd position
//   - Minor ticks: Short lines between major ticks
//   - Number indicators: At major tick positions
//   - Glass: Highlight stripe along top edge
//   - Edge bevel: 45° chamfer on all corners
//
// Layers:
//   1. Body: Ruler rectangle (orange gradient)
//   2. Major ticks: Long measurement lines (white)
//   3. Minor ticks: Short measurement lines (white, faint)
//   4. Glass: Top edge highlight (white)
//
// Animation: Glow pulse on edges,
//   tick marks brighten sequentially
// ========================================
export const RulerIcon = (props) => (
    <IconBase {...props}>
        <g transform="rotate(12 50 50)">
            {/* Layer 1: Ruler body - chamfered rectangle */}
            <path d="M33 6 L35 4 L67 4 L69 6 L69 96 L67 98 L35 98 L33 96 Z"
                  fill="url(#ic-grad-orange)" stroke="#92400e" strokeWidth="1.5" strokeLinejoin="miter" />
            {/* Layer 4: Glass highlight - top edge */}
            <path d="M35 5 L67 5 L66 10 L36 10 Z" fill="white" opacity="0.2" />
            {/* Layer 2: Major ticks (long) - every 20 units */}
            <path d="M33 15 L52 15" stroke="white" strokeWidth="2" opacity="0.7" />
            <path d="M33 35 L52 35" stroke="white" strokeWidth="2" opacity="0.7" />
            <path d="M33 55 L52 55" stroke="white" strokeWidth="2" opacity="0.7" />
            <path d="M33 75 L52 75" stroke="white" strokeWidth="2" opacity="0.7" />
            <path d="M33 95 L52 95" stroke="white" strokeWidth="2" opacity="0.7" />
            {/* Layer 3: Minor ticks (short) - every 10 units */}
            <path d="M33 25 L44 25" stroke="white" strokeWidth="1.5" opacity="0.4" />
            <path d="M33 45 L44 45" stroke="white" strokeWidth="1.5" opacity="0.4" />
            <path d="M33 65 L44 65" stroke="white" strokeWidth="1.5" opacity="0.4" />
            <path d="M33 85 L44 85" stroke="white" strokeWidth="1.5" opacity="0.4" />
            {/* Tiny ticks between */}
            <path d="M33 20 L40 20 M33 30 L40 30 M33 40 L40 40 M33 50 L40 50 M33 60 L40 60 M33 70 L40 70 M33 80 L40 80 M33 90 L40 90"
                  stroke="white" strokeWidth="1" opacity="0.25" />
        </g>
    </IconBase>
);

// ========================================
// 25. TARGET ICON (Goals/Precision)
// ========================================
// Concept: Concentric octagonal rings with crosshair,
//   bullseye center diamond. Angular, not circular.
//   Precision, focus, goal-targeting feel.
//
// Geometric Breakdown:
//   - Outer ring: Large octagon (8-sided, ~45° per vertex)
//   - Middle ring: Medium octagon (same proportions)
//   - Inner ring: Small octagon (filled bullseye)
//   - Crosshair: 4 lines extending beyond outer ring
//     meeting at exact center (gap in middle)
//   - Bullseye: Small diamond at center point
//
// Layers:
//   1. Crosshair: Extended lines (red gradient)
//   2. Outer ring: Large octagon (red stroke)
//   3. Middle ring: Medium octagon (red, semi-transparent)
//   4. Inner ring: Small octagon (red fill)
//   5. Bullseye: Center diamond (white)
//
// Animation: Rings pulse scale 1.0→1.03,
//   crosshair pulses opacity, bullseye throbs
// ========================================
export const TargetIcon = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Crosshair lines - extending beyond rings */}
        <path d="M50 5 L50 20 M50 80 L50 95 M5 50 L20 50 M80 50 L95 50"
              stroke="url(#ic-grad-red)" strokeWidth="3" />
        {/* Layer 2: Outer octagonal ring */}
        <path d="M50 12 L70 18 L82 32 L88 50 L82 68 L70 82 L50 88 L30 82 L18 68 L12 50 L18 32 L30 18 Z"
              fill="none" stroke="url(#ic-grad-red)" strokeWidth="3.5" strokeLinejoin="miter" />
        {/* Layer 3: Middle octagonal ring */}
        <path d="M50 22 L64 26 L74 38 L78 50 L74 62 L64 74 L50 78 L36 74 L26 62 L22 50 L26 38 L36 26 Z"
              fill="none" stroke="url(#ic-grad-red)" strokeWidth="3" strokeLinejoin="miter" opacity="0.6" />
        {/* Layer 4: Inner octagonal ring - filled */}
        <path d="M50 34 L58 37 L64 44 L66 50 L64 56 L58 63 L50 66 L42 63 L36 56 L34 50 L36 44 L42 37 Z"
              fill="url(#ic-grad-red)" stroke="#991b1b" strokeWidth="1.5" strokeLinejoin="miter" />
        {/* Layer 4b: Inner ring glass highlight */}
        <path d="M42 38 L50 35 L58 38 L55 44 L45 44 Z"
              fill="white" opacity="0.15" />
        {/* Layer 5: Bullseye center diamond */}
        <path d="M50 44 L56 50 L50 56 L44 50 Z" fill="white" opacity="0.9" />
    </IconBase>
);

// ========================================
// 26. PLATE ICON (Weight Plate/Gym)
// ========================================
// Concept: Angular weight plate with dodecagonal outline,
//   octagonal center hole, grip ridges, and "45" marking.
//   Gym equipment, heavy iron feel.
//
// Geometric Breakdown:
//   - Outer rim: 12-sided polygon (dodecagon) for plate edge
//   - Inner ring: 12-sided polygon slightly smaller for depth
//   - Center hole: Octagon (8-sided) for barbell insertion
//   - Grip notches: 4 angular indentations at N/S/E/W
//   - Text: "45" weight marking
//   - "IRON" label text
//   - Detail: Radial ridge lines from center to rim
//
// Layers:
//   1. Outer rim: Dodecagonal plate body (dark, silver stroke)
//   2. Inner ring: Concentric dodecagon (dark, faint stroke)
//   3. Ridges: Radial lines from center (faint)
//   4. Grip notches: Angular indentations (dark)
//   5. Center hole: Octagon (darker fill)
//   6. Text: Weight marking + label
//
// Animation: Plate rotates slowly,
//   grip notches highlight on hover
// ========================================
export const PlateIcon = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Outer rim - 12-sided polygon */}
        <path d="M50 8 L62 10 L73 16 L81 27 L85 40 L85 60 L81 73 L73 84 L62 90 L50 92 L38 90 L27 84 L19 73 L15 60 L15 40 L19 27 L27 16 L38 10 Z"
              fill="#1e293b" stroke="url(#ic-grad-silver)" strokeWidth="3.5" strokeLinejoin="miter" />
        {/* Layer 2: Inner ring - concentric dodecagon */}
        <path d="M50 20 L58 21 L66 25 L72 32 L75 40 L75 60 L72 68 L66 75 L58 79 L50 80 L42 79 L34 75 L28 68 L25 60 L25 40 L28 32 L34 25 L42 21 Z"
              fill="none" stroke="#334155" strokeWidth="2" opacity="0.5" strokeLinejoin="miter" />
        {/* Layer 3: Radial ridge lines */}
        <path d="M50 20 L50 32 M50 68 L50 80 M20 50 L32 50 M68 50 L80 50"
              stroke="#334155" strokeWidth="2.5" />
        <path d="M30 26 L38 34 M62 66 L70 74 M70 26 L62 34 M38 66 L30 74"
              stroke="#334155" strokeWidth="1.5" opacity="0.3" />
        {/* Layer 4: Grip notches - angular indentations */}
        <path d="M46 9 L46 15 L54 15 L54 9" stroke="#0f172a" strokeWidth="3" fill="#0f172a" />
        <path d="M46 85 L46 91 L54 91 L54 85" stroke="#0f172a" strokeWidth="3" fill="#0f172a" />
        <path d="M9 46 L15 46 L15 54 L9 54" stroke="#0f172a" strokeWidth="3" fill="#0f172a" />
        <path d="M85 46 L85 54 L91 54 L91 46" stroke="#0f172a" strokeWidth="3" fill="#0f172a" />
        {/* Layer 5: Center hole - octagon */}
        <path d="M50 36 L57 38 L62 44 L62 56 L57 62 L50 64 L43 62 L38 56 L38 44 L43 38 Z"
              fill="#0f172a" stroke="#334155" strokeWidth="2" strokeLinejoin="miter" />
        {/* Layer 6: Weight text */}
        <text x="50" y="88" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="monospace">IRON</text>
    </IconBase>
);

// 27. Chat (Message/Coach)
// Concept: Angular speech bubble with chamfered corners and a sharp
//   triangular tail pointing down-left. Three diamond dots inside
//   represent typing/message activity. Clean geometric communication icon.
//
// Layers: bubble body → bubble stroke → typing diamonds →
//   glass overlay → highlight accent
export const ChatIcon = (props) => (
    <IconBase {...props}>
        {/* Layer 1: Angular speech bubble body with sharp tail */}
        <path d="M15 18 L75 18 L82 22 L85 30 L85 60 L82 68 L75 72 L38 72 L20 90 L22 72 L15 72 L8 68 L5 60 L5 30 L8 22 Z"
              fill="url(#ic-grad-blue)" />

        {/* Layer 2: Bubble outline stroke */}
        <path d="M15 18 L75 18 L82 22 L85 30 L85 60 L82 68 L75 72 L38 72 L20 90 L22 72 L15 72 L8 68 L5 60 L5 30 L8 22 Z"
              fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinejoin="miter" />

        {/* Layer 3: Three typing indicator diamonds */}
        <path d="M30 45 L34 49 L30 53 L26 49 Z" fill="white" opacity="0.9" />
        <path d="M45 45 L49 49 L45 53 L41 49 Z" fill="white" opacity="0.65" />
        <path d="M60 45 L64 49 L60 53 L56 49 Z" fill="white" opacity="0.4" />

        {/* Layer 4: Glass overlay - top portion of bubble */}
        <path d="M15 18 L75 18 L82 22 L85 30 L85 45 L5 45 L5 30 L8 22 Z"
              fill="url(#ic-grad-glass)" />

        {/* Layer 5: Top edge highlight */}
        <path d="M15 18 L75 18 L82 22" stroke="white" strokeWidth="1.5" opacity="0.3" fill="none" strokeLinejoin="miter" />
    </IconBase>
);
