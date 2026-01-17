import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Card, Input } from './UI';

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
          <span className="text-[10px] text-gray-400">{unit}</span>
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
      fat: Number(meal.fat)
    });
    setMeal({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  };

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold text-gray-900">Add Meal</h3>
      <Input 
        placeholder="Meal Name (e.g., Chicken & Rice)" 
        value={meal.name}
        onChange={(e) => setMeal({...meal, name: e.target.value})}
      />
      <div className="grid grid-cols-4 gap-2">
        <Input 
          type="number" placeholder="Cals" 
          value={meal.calories}
          onChange={(e) => setMeal({...meal, calories: e.target.value})}
        />
        <Input 
          type="number" placeholder="Prot" 
          value={meal.protein}
          onChange={(e) => setMeal({...meal, protein: e.target.value})}
        />
        <Input 
          type="number" placeholder="Carb" 
          value={meal.carbs}
          onChange={(e) => setMeal({...meal, carbs: e.target.value})}
        />
        <Input 
          type="number" placeholder="Fat" 
          value={meal.fat}
          onChange={(e) => setMeal({...meal, fat: e.target.value})}
        />
      </div>
      <Button onClick={handleSubmit} className="w-full" size="sm">
        <Plus size={16} className="mr-2" /> Add Entry
      </Button>
    </Card>
  );
};