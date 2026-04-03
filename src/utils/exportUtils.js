// Data Export Utilities
// Export workout and meal data as CSV files

const escapeHtml = (str) => {
    if (typeof str !== 'string') return String(str ?? '');
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};

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
 * Generate and download a printable HTML report as PDF
 * Opens a new window with styled HTML the user can print/save as PDF
 */
export const exportPDFReport = ({ workouts = [], meals = [], profile = {}, progress = [] }) => {
    const summary = generateWeeklySummary(workouts, meals);
    const latestWeight = progress.find(p => p.weight)?.weight || profile.weight || '--';
    const totalWorkouts = workouts.length;
    const totalMeals = meals.length;
    const avgProtein = meals.length > 0
        ? Math.round(meals.reduce((s, m) => s + (m.protein || 0), 0) / meals.length)
        : 0;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>IronCore Fitness Report</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:700px;margin:0 auto;padding:40px 24px;color:#1a1a1a;background:#fff}
  h1{font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;border-bottom:3px solid #dc2626;padding-bottom:8px}
  h2{font-size:16px;font-weight:800;text-transform:uppercase;color:#dc2626;margin-top:32px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0}
  .card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
  .card .label{font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280}
  .card .value{font-size:28px;font-weight:900;color:#111}
  .meta{font-size:12px;color:#9ca3af;margin-top:24px;text-align:center}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th,td{text-align:left;padding:8px 12px;font-size:13px;border-bottom:1px solid #e5e7eb}
  th{font-weight:700;font-size:11px;text-transform:uppercase;color:#6b7280}
  @media print{body{padding:20px}}
</style></head><body>
<h1>IronCore Fitness Report</h1>
<p style="color:#6b7280;font-size:13px">${escapeHtml(profile.displayName) || 'Athlete'} &mdash; Generated ${new Date().toLocaleDateString()}</p>

<h2>Overview</h2>
<div class="grid">
  <div class="card"><div class="label">Current Weight</div><div class="value">${escapeHtml(latestWeight)} kg</div></div>
  <div class="card"><div class="label">Total XP</div><div class="value">${escapeHtml(profile.xp || 0)}</div></div>
  <div class="card"><div class="label">Total Workouts</div><div class="value">${totalWorkouts}</div></div>
  <div class="card"><div class="label">Meals Logged</div><div class="value">${totalMeals}</div></div>
</div>

<h2>This Week</h2>
<div class="grid">
  <div class="card"><div class="label">Workouts</div><div class="value">${summary.workouts.count}</div></div>
  <div class="card"><div class="label">Avg Calories/Day</div><div class="value">${summary.nutrition.avgCaloriesPerDay}</div></div>
  <div class="card"><div class="label">Total Protein</div><div class="value">${summary.nutrition.totalProtein}g</div></div>
  <div class="card"><div class="label">Net Calories</div><div class="value">${summary.netCalories}</div></div>
</div>

<h2>Recent Workouts</h2>
<table>
  <tr><th>Date</th><th>Name</th><th>Exercises</th></tr>
  ${workouts.slice(0, 10).map(w => `<tr><td>${escapeHtml(w.date || '--')}</td><td>${escapeHtml(w.name || 'Workout')}</td><td>${escapeHtml(w.exercises?.length || 0)}</td></tr>`).join('')}
</table>

<h2>Weight History</h2>
<table>
  <tr><th>Date</th><th>Weight (kg)</th></tr>
  ${progress.filter(p => p.weight).slice(0, 10).map(p => `<tr><td>${escapeHtml(p.date)}</td><td>${escapeHtml(p.weight)}</td></tr>`).join('')}
</table>

<p class="meta">IronCore AI &mdash; Your Fitness Companion</p>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
        win.addEventListener('load', () => {
            win.print();
        });
        // Revoke when window unloads or after 60s fallback
        win.addEventListener('unload', () => URL.revokeObjectURL(url));
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else {
        // Fallback for blocked popups: download the HTML file
        const link = document.createElement('a');
        link.href = url;
        link.download = `ironcore-report-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
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


