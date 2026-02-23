import React from 'react';

export const ShopItem = ({ icon, title, desc, cost, color, onBuy }) => (
    <button
        onClick={onBuy}
        className="w-full flex items-center justify-between p-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{
            background: `linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)`,
            border: '1px solid rgba(255,255,255,0.1)',
        }}
    >
        <div className="flex items-center gap-3">
            <div
                className="p-2 rounded-xl"
                style={{
                    background: `linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)`,
                }}
            >
                {icon}
            </div>
            <div className="text-left">
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="text-[11px] text-gray-500">{desc}</p>
            </div>
        </div>
        <span
            className="text-xs font-bold px-2 py-1 rounded"
            style={{
                background: 'rgba(234, 179, 8, 0.15)',
                color: '#eab308',
            }}
        >
            {cost} XP
        </span>
    </button>
);
