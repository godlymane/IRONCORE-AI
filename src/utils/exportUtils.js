// Data Export Utilities
// Export workout and meal data as CSV files

/**
 * Convert array of objects to CSV string
 */
const arrayToCSV = (data, columns) => {
    if (!data || data.length === 0) return '';

    const headers = columns.map(c => c.label).join(',');
    const rows = data.map(item =>
        columns.map(col => {
            let value = col.key.split('.').reduce((obj, key) => obj?.[key], item);
            // Handle dates
            if (value instanceof Date) {
                value = value.toISOString();
            }
            // Handle Firestore timestamps
            if (value?.toDate) {
                value = value.toDate().toISOString();
            }
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
        }).join(',')
    ).join('\n');

    return `${headers}\n${rows}`;
};

/**
 * Download CSV file
 */
const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Export workouts to CSV
 */
export const exportWorkouts = (workouts) => {
    const columns = [
        { key: 'date', label: 'Date' },
        { key: 'type', label: 'Type' },
        { key: 'name', label: 'Name' },
        { key: 'duration', label: 'Duration (min)' },
        { key: 'caloriesBurned', label: 'Calories Burned' },
        { key: 'sets', label: 'Sets' },
        { key: 'reps', label: 'Reps' },
        { key: 'weight', label: 'Weight' },
        { key: 'notes', label: 'Notes' },
    ];

    const csv = arrayToCSV(workouts, columns);
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `ironcore-workouts-${date}.csv`);
    return { success: true, count: workouts.length };
};

/**
 * Export meals to CSV
 */
export const exportMeals = (meals) => {
    const columns = [
        { key: 'date', label: 'Date' },
        { key: 'name', label: 'Food Name' },
        { key: 'mealType', label: 'Meal Type' },
        { key: 'calories', label: 'Calories' },
        { key: 'protein', label: 'Protein (g)' },
        { key: 'carbs', label: 'Carbs (g)' },
        { key: 'fat', label: 'Fat (g)' },
        { key: 'servings', label: 'Servings' },
    ];

    const csv = arrayToCSV(meals, columns);
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `ironcore-meals-${date}.csv`);
    return { success: true, count: meals.length };
};

/**
 * Export all user data as JSON
 */
export const exportAllData = (data) => {
    const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        ...data
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ironcore-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true };
};

/**
 * Generate weekly summary data
 */
export const generateWeeklySummary = (workouts, meals, startDate = null) => {
    const now = new Date();
    const weekStart = startDate || new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const weekWorkouts = workouts.filter(w => {
        const date = new Date(w.date);
        return date >= weekStart && date <= weekEnd;
    });

    const weekMeals = meals.filter(m => {
        const date = new Date(m.date);
        return date >= weekStart && date <= weekEnd;
    });

    const totalCaloriesBurned = weekWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
    const totalCaloriesConsumed = weekMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const totalProtein = weekMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
    const totalWorkoutMinutes = weekWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);

    // Calculate workout types breakdown
    const workoutTypes = {};
    weekWorkouts.forEach(w => {
        const type = w.type || 'Other';
        workoutTypes[type] = (workoutTypes[type] || 0) + 1;
    });

    return {
        period: {
            start: weekStart.toISOString(),
            end: weekEnd.toISOString(),
        },
        workouts: {
            count: weekWorkouts.length,
            totalMinutes: totalWorkoutMinutes,
            caloriesBurned: totalCaloriesBurned,
            byType: workoutTypes,
        },
        nutrition: {
            mealsLogged: weekMeals.length,
            totalCalories: totalCaloriesConsumed,
            totalProtein: Math.round(totalProtein),
            avgCaloriesPerDay: Math.round(totalCaloriesConsumed / 7),
        },
        netCalories: totalCaloriesConsumed - totalCaloriesBurned,
    };
};


