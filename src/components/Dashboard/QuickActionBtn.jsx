import React from 'react';

export const QuickActionBtn = ({ icon, label, color, onClick }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl transition-all hover:scale-105 active:scale-95"
        style={{
            background: `linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)`,
            border: '1px solid rgba(255,255,255,0.08)',
        }}
    >
        <div
            className="p-2 rounded-xl"
            style={{
                background: `linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)`,
            }}
        >
            {icon}
        </div>
        <span className="text-[11px] text-gray-400 font-bold uppercase">{label}</span>
    </button>
);
