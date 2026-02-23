import React from 'react';

export const MacroMini = ({ label, value, color }) => (
    <div className="flex items-center gap-2">
        <div
            className={`w-2 h-2 rounded-full bg-${color}-500`}
            style={{ boxShadow: `0 0 6px var(--tw-shadow-color)` }}
        />
        <span className="text-[11px] text-gray-500 font-bold uppercase w-12">{label}</span>
        <span className="text-xs text-white font-bold">{value}{label !== 'Burned' ? 'g' : ''}</span>
    </div>
);
