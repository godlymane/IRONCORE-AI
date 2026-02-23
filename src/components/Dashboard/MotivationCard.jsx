import React from 'react';
import { GlassCard } from '../UIComponents';
import { Sparkles } from 'lucide-react';

// Motivational Quotes Data
const MOTIVATION_QUOTES = [
    { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
    { text: "Your body can stand almost anything. It's your mind you have to convince.", author: "Unknown" },
    { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
    { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" },
    { text: "Success isn't always about greatness. It's about consistency.", author: "Dwayne Johnson" },
    { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
    { text: "The resistance that you fight in the gym and the resistance that you fight in life can only build a strong character.", author: "Arnold Schwarzenegger" },
    { text: "Champions are made from something deep inside them — a desire, a dream, a vision.", author: "Muhammad Ali" },
    { text: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi" },
    { text: "The last three or four reps is what makes the muscle grow.", author: "Arnold Schwarzenegger" },
    { text: "Your health is an investment, not an expense.", author: "Unknown" },
    { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
];

export const MotivationCard = () => {
    // Get quote based on day of year for daily rotation
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const quoteIndex = dayOfYear % MOTIVATION_QUOTES.length;
    const quote = MOTIVATION_QUOTES[quoteIndex];

    return (
        <GlassCard className="!p-4 relative overflow-hidden">
            {/* Subtle flame background */}
            <div
                className="absolute top-0 right-0 w-24 h-24 opacity-10 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(220, 38, 38, 0.8) 0%, transparent 70%)',
                }}
            />
            <div className="relative z-10">
                <div className="flex items-start gap-3">
                    <div
                        className="p-2 rounded-xl flex-shrink-0"
                        style={{
                            background: 'linear-gradient(145deg, rgba(220, 38, 38, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)',
                            border: '1px solid rgba(220, 38, 38, 0.2)',
                        }}
                    >
                        <Sparkles size={16} className="text-red-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[11px] text-gray-500 font-bold uppercase mb-1">Daily Motivation</p>
                        <p className="text-sm text-white font-medium italic leading-relaxed">
                            "{quote.text}"
                        </p>
                        <p className="text-[11px] text-red-400 font-bold mt-2">— {quote.author}</p>
                    </div>
                </div>
            </div>
        </GlassCard>
    );
};
