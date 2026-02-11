import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Plus, ScanLine, Search, Droplets, Flame, ChefHat, Utensils, Coffee } from 'lucide-react';
import { Button, Card, useToast } from '../components/UIComponents';
import { PremiumIcon } from '../components/PremiumIcon';
import { MacroPieChart, WaterTracker, FastingTimer, SupplementTracker, CalorieBurnCard } from '../components/NutritionEnhancements';
import { AddMealForm } from '../components/Nutrition';

// Import Icons
import { ChefHatIcon, UtensilsIcon } from '../components/IronCoreIcons';

export const NutritionView = ({ meals, burned, profile, updateData, onBack }) => {
    const { addToast } = useToast();
    const [showAddMeal, setShowAddMeal] = useState(false);

    // Calculate daily totals
    const today = new Date().toISOString().split('T')[0];
    const todaysMeals = meals.filter(m => m.date === today);
    const totalCals = todaysMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
    const totalProtein = todaysMeals.reduce((acc, m) => acc + (m.protein || 0), 0);
    const totalCarbs = todaysMeals.reduce((acc, m) => acc + (m.carbs || 0), 0);
    const totalFat = todaysMeals.reduce((acc, m) => acc + (m.fat || 0), 0);
    const totalBurned = burned.filter(b => b.date === today).reduce((acc, b) => acc + (b.calories || 0), 0);

    // Goals (default or from profile)
    const goals = {
        calories: profile.dailyCalories || 2000,
        protein: profile.dailyProtein || 150,
        carbs: profile.dailyCarbs || 200,
        fats: profile.dailyFats || 60,
    };

    const handleAddMeal = async (mealData) => {
        await updateData('add', 'meals', mealData);
        addToast(`Logged: ${mealData.name}`, 'success');
        setShowAddMeal(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in pb-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {onBack && (
                        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <ChevronLeft size={24} className="text-white" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-black text-white flex items-center gap-3">
                            <PremiumIcon src={ChefHatIcon} alt="Nutrition" size="md" fallback={ChefHat} className="shadow-red-500/20" />
                            Nutrition Command
                        </h1>
                        <p className="text-xs text-white/50 ml-12">Fuel your performance</p>
                    </div>
                </div>
                <Button onClick={() => setShowAddMeal(true)} variant="primary" size="sm">
                    <Plus size={16} className="mr-1" /> Log
                </Button>
            </div>

            {/* Main Visuals - Macros & Hydration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-5">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-3">
                        <PremiumIcon src={UtensilsIcon} alt="Macros" size="sm" fallback={Utensils} />
                        Macro Breakdown
                    </h3>
                    <MacroPieChart
                        protein={totalProtein}
                        carbs={totalCarbs}
                        fats={totalFat}
                        goals={goals}
                    />
                </Card>

                <div className="space-y-4">
                    <WaterTracker
                        glasses={profile.waterGlasses || 0}
                        goal={profile.waterGoal || 8}
                        onAdd={() => updateData('update', 'profile', { waterGlasses: (profile.waterGlasses || 0) + 1 })}
                        onRemove={() => updateData('update', 'profile', { waterGlasses: Math.max(0, (profile.waterGlasses || 0) - 1) })}
                    />
                    <CalorieBurnCard
                        burned={totalBurned}
                        goal={profile.burnGoal || 500}
                        activities={burned.filter(b => b.date === today)}
                    />
                </div>
            </div>

            {/* Advanced Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FastingTimer
                    fastingHours={16}
                    eatingHours={8}
                    startTime={profile.fastingStartTime}
                    onStart={() => updateData('update', 'profile', { fastingStartTime: new Date().toISOString() })}
                    onEnd={() => updateData('update', 'profile', { fastingStartTime: null })}
                />
                <SupplementTracker
                    supplements={profile.supplements || []}
                    onToggle={(id) => {
                        const supps = profile.supplements || [];
                        const updated = supps.map(s => s.id === id ? { ...s, taken: !s.taken } : s);
                        updateData('update', 'profile', { supplements: updated });
                    }}
                />
            </div>

            {/* Recent Meals List */}
            <div className="space-y-3">
                <h3 className="font-bold text-white ml-1">Today's Fuel</h3>
                {todaysMeals.length === 0 ? (
                    <div className="text-center p-8 border border-white/5 rounded-2xl bg-white/5">
                        <p className="text-white/40 text-sm">No meals logged yet today.</p>
                    </div>
                ) : (
                    todaysMeals.map((meal, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0, transition: { delay: i * 0.05 } }}
                            className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex justify-between items-center"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white/5 text-xl">
                                    {meal.mealName.toLowerCase().includes('coffee') ? '☕' :
                                        meal.mealName.toLowerCase().includes('chicken') ? '🍗' :
                                            meal.mealName.toLowerCase().includes('egg') ? '🥚' : '🍽️'}
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">{meal.mealName}</p>
                                    <p className="text-[11px] text-white/40">
                                        {meal.calories} kcal • {meal.protein}P • {meal.carbs}C • {meal.fat}F
                                    </p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-white/30">{meal.time || 'Today'}</span>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Add Meal Modal/Overlay */}
            {showAddMeal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-black text-white">Log Meal</h2>
                            <button onClick={() => setShowAddMeal(false)} className="text-white/50 hover:text-white">Close</button>
                        </div>
                        <AddMealForm onAdd={handleAddMeal} />
                    </div>
                </div>
            )}
        </div>
    );
};
