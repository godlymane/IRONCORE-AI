// ========================================
// AMBIENT PARTICLE FX (UI OVERHAUL)
// Renders slow-moving, glowing ambient orbs
// ========================================

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

import { useIsMobile } from '../hooks/useIsMobile';

export const AmbientFX = ({ count = 15 }) => {
    // Detect mobile once — fewer particles + smaller blur to reduce GPU load
    const isMobile = useIsMobile();
    const effectiveCount = isMobile ? Math.min(count, 6) : count;
    const blurRadius = isMobile ? 20 : 40;

    // Generate particles only once
    const particles = useMemo(() => {
        const colors = [
            'rgba(220, 38, 38, 0.4)',  // BlayzEx Red
            'rgba(153, 27, 27, 0.3)',  // Deep Red
            'rgba(245, 158, 11, 0.2)', // Amber Gold
        ];

        return Array.from({ length: effectiveCount }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: isMobile ? Math.random() * 120 + 40 : Math.random() * 200 + 50,
            duration: Math.random() * 30 + 20, // Very slow movement
            delay: Math.random() * -20, // Random start points
            color: colors[Math.floor(Math.random() * colors.length)],
            // Pre-compute random animation targets so they're stable
            dx: Math.random() * 200 - 100,
            dy: Math.random() * 200 - 100,
            peakScale: Math.random() * 0.5 + 1,
        }));
    }, [effectiveCount, isMobile]);

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 mix-blend-screen opacity-60">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size,
                        background: `radial-gradient(circle, ${p.color} 0%, transparent 70%)`,
                        filter: `blur(${blurRadius}px)`,
                        willChange: 'transform, opacity',
                    }}
                    animate={{
                        x: [0, p.dx, 0],
                        y: [0, p.dy, 0],
                        scale: [1, p.peakScale, 1],
                        opacity: [0.3, 0.8, 0.3],
                    }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                />
            ))}
        </div>
    );
};

export default AmbientFX;
