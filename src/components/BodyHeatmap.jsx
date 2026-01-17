import React, { useState } from 'react';
import { RotateCw } from 'lucide-react';

const Muscle = ({ d, id, tier, label }) => {
    const colors = {
        0: "#1f2937", 1: "#374151", 2: "#0ea5e9", 
        3: "#eab308", 4: "#f97316", 5: "#ef4444"
    };

    const fill = colors[tier] || colors[0];
    const glow = tier >= 4 ? `drop-shadow(0px 0px ${tier * 1.5}px ${fill})` : "none";

    return (
        <path 
            d={d} id={id} fill={fill} stroke="#111827" strokeWidth="0.5"
            style={{ filter: glow, transition: "all 0.5s ease" }}
        >
            <title>{label || id}</title>
        </path>
    );
};

export const BodyHeatmap = ({ muscleScores }) => {
    const [view, setView] = useState('front');

    const getTier = (muscle) => {
        const score = muscleScores[muscle] || 0;
        if (score === 0) return 0;
        if (score < 2) return 1;
        if (score < 5) return 2;
        if (score < 8) return 3;
        if (score < 12) return 4;
        return 5;
    };

    return (
        <div className="relative w-full h-full flex items-center justify-center p-4 group">
            <button 
                onClick={() => setView(v => v === 'front' ? 'back' : 'front')}
                className="absolute top-4 right-4 bg-gray-800 p-2 rounded-full text-white hover:bg-indigo-600 transition-colors z-20 shadow-lg border border-gray-700"
            >
                <RotateCw size={16} />
            </button>

            <svg viewBox="0 0 200 420" className="h-64 w-auto drop-shadow-2xl">
                {view === 'front' ? (
                    <g id="front-view">
                        <circle cx="100" cy="25" r="12" fill="#111827" stroke="#374151" />
                        <Muscle id="traps" tier={getTier('traps')} d="M85,35 L70,45 L130,45 L115,35 Z" />
                        <Muscle id="shoulders_L" tier={getTier('front_delts')} d="M70,45 Q55,55 50,75 L65,70 Z" />
                        <Muscle id="shoulders_R" tier={getTier('front_delts')} d="M130,45 Q145,55 150,75 L135,70 Z" />
                        <Muscle id="chest_L" tier={getTier('chest')} d="M100,45 L70,45 L65,85 Q80,95 100,90 Z" />
                        <Muscle id="chest_R" tier={getTier('chest')} d="M100,45 L130,45 L135,85 Q120,95 100,90 Z" />
                        <Muscle id="biceps_L" tier={getTier('biceps')} d="M50,75 L45,110 L60,105 L65,70 Z" />
                        <Muscle id="biceps_R" tier={getTier('biceps')} d="M150,75 L155,110 L140,105 L135,70 Z" />
                        <Muscle id="forearms_L" tier={getTier('forearms')} d="M45,110 L40,150 L55,150 L60,105 Z" />
                        <Muscle id="forearms_R" tier={getTier('forearms')} d="M155,110 L160,150 L145,150 L140,105 Z" />
                        <Muscle id="abs_upper" tier={getTier('abs')} d="M85,90 L115,90 L110,110 L90,110 Z" />
                        <Muscle id="abs_mid" tier={getTier('abs')} d="M88,112 L112,112 L110,130 L90,130 Z" />
                        <Muscle id="abs_lower" tier={getTier('abs')} d="M90,132 L110,132 L108,150 L92,150 Z" />
                        <Muscle id="quads_L" tier={getTier('quads')} d="M60,150 L95,155 L90,230 L65,220 Z" />
                        <Muscle id="quads_R" tier={getTier('quads')} d="M140,150 L105,155 L110,230 L135,220 Z" />
                        <Muscle id="calves_L" tier={getTier('calves')} d="M68,230 L90,230 L85,290 L70,280 Z" />
                        <Muscle id="calves_R" tier={getTier('calves')} d="M132,230 L110,230 L115,290 L130,280 Z" />
                    </g>
                ) : (
                    <g id="back-view">
                        <circle cx="100" cy="25" r="12" fill="#111827" stroke="#374151" />
                        <Muscle id="traps_back" tier={getTier('traps')} d="M85,35 L115,35 L100,60 Z" />
                        <Muscle id="rear_delts_L" tier={getTier('rear_delts')} d="M70,45 L50,55 L55,75 L75,65 Z" />
                        <Muscle id="rear_delts_R" tier={getTier('rear_delts')} d="M130,45 L150,55 L145,75 L125,65 Z" />
                        <Muscle id="triceps_L" tier={getTier('triceps')} d="M50,55 L40,100 L55,95 L60,65 Z" />
                        <Muscle id="triceps_R" tier={getTier('triceps')} d="M150,55 L160,100 L145,95 L140,65 Z" />
                        <Muscle id="lats_back_L" tier={getTier('lats')} d="M75,65 L60,110 L95,140 L100,60 Z" />
                        <Muscle id="lats_back_R" tier={getTier('lats')} d="M125,65 L140,110 L105,140 L100,60 Z" />
                        <Muscle id="lower_back" tier={getTier('lower_back')} d="M90,140 L110,140 L105,160 L95,160 Z" />
                        <Muscle id="glutes_L" tier={getTier('glutes')} d="M60,160 L95,160 L90,210 L55,190 Z" />
                        <Muscle id="glutes_R" tier={getTier('glutes')} d="M140,160 L105,160 L110,210 L145,190 Z" />
                        <Muscle id="hams_L" tier={getTier('hamstrings')} d="M60,210 L90,220 L85,280 L65,270 Z" />
                        <Muscle id="hams_R" tier={getTier('hamstrings')} d="M140,210 L110,220 L115,280 L135,270 Z" />
                        <Muscle id="calves_back_L" tier={getTier('calves')} d="M65,280 L85,280 L80,340 L70,330 Z" />
                        <Muscle id="calves_back_R" tier={getTier('calves')} d="M135,280 L115,280 L120,340 L130,330 Z" />
                    </g>
                )}
            </svg>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                 <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest bg-black/50 px-3 py-1 rounded-full border border-gray-800">
                     {view === 'front' ? 'Anterior' : 'Posterior'} View
                 </span>
            </div>
        </div>
    );
};