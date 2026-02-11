import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Card } from './UIComponents';

export const MacroRing = ({ current, target, color, label, unit }) => {
  const percentage = Math.min(100, Math.max(0, (current / target) * 100));
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`${color} transition-all duration-1000 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-gray-900">{Math.round(current)}</span>
          <span className="text-[11px] text-gray-400">{unit}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-600 mt-1">{label}</span>
    </div>
  );
};

export const AddMealForm = ({ onAdd }) => {
  const [meal, setMeal] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });

  const handleSubmit = () => {
    if (!meal.name || !meal.calories) return;
    onAdd({
      ...meal,
      id: Date.now(),
      calories: Number(meal.calories),
      protein: Number(meal.protein),
      carbs: Number(meal.carbs),
      fat: Number(meal.fat),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    setMeal({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  };

  return (
    <div className="p-6 rounded-3xl backdrop-blur-xl border border-white/10 bg-black/60 shadow-2xl space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
          <Plus size={20} className="text-red-500" />
        </div>
        <h3 className="text-lg font-black text-white uppercase italic">Add Fuel</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase ml-1">Meal Name</label>
          <input
            placeholder="e.g., Chicken & Rice"
            value={meal.name}
            onChange={(e) => setMeal({ ...meal, name: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder:text-gray-600 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Calories</label>
            <input
              type="number" placeholder="0"
              inputMode="numeric"
              enterKeyHint="done"
              value={meal.calories}
              onChange={(e) => setMeal({ ...meal, calories: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-red-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Protein (g)</label>
            <input
              type="number" placeholder="0"
              inputMode="numeric"
              enterKeyHint="done"
              value={meal.protein}
              onChange={(e) => setMeal({ ...meal, protein: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Carbs (g)</label>
            <input
              type="number" placeholder="0"
              inputMode="numeric"
              enterKeyHint="done"
              value={meal.carbs}
              onChange={(e) => setMeal({ ...meal, carbs: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-orange-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Fat (g)</label>
            <input
              type="number" placeholder="0"
              inputMode="numeric"
              enterKeyHint="done"
              value={meal.fat}
              onChange={(e) => setMeal({ ...meal, fat: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-4 rounded-xl font-bold uppercase tracking-wider text-white shadow-lg transform active:scale-95 transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}
        >
          Log Meal
        </button>
      </div>
    </div>
  );
};



