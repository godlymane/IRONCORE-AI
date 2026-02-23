// ========================================
// AMBIENT PARTICLE FX (UI OVERHAUL)
// Renders slow-moving, glowing ambient orbs
// ========================================

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export const AmbientFX = ({ count = 15 }) => {
    // Generate particles only once
    const particles = useMemo(() => {
        const colors = [
            'rgba(220, 38, 38, 0.4)',  // BlayzEx Red
            'rgba(153, 27, 27, 0.3)',  // Deep Red
            'rgba(245, 158, 11, 0.2)', // Amber Gold
        ];

        return Array.from({ length: count }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 200 + 50, // Huge glowing orbs
            duration: Math.random() * 30 + 20, // Very slow movement
            delay: Math.random() * -20, // Random start points
            color: colors[Math.floor(Math.random() * colors.length)],
        }));
    }, [count]);

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
                        filter: 'blur(40px)', // Make them look like soft light
                    }}
                    animate={{
                        x: [0, Math.random() * 200 - 100, 0],
                        y: [0, Math.random() * 200 - 100, 0],
                        scale: [1, Math.random() * 0.5 + 1, 1],
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
