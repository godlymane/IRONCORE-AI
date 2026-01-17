export const EXERCISE_DB = [
    // LEGS
    { name: "Barbell Squat", muscle: "quads", secondary: ["glutes", "lower_back"] },
    { name: "Leg Press", muscle: "quads", secondary: ["glutes"] },
    { name: "Bulgarian Split Squat", muscle: "glutes", secondary: ["quads", "hamstrings"] },
    { name: "Romanian Deadlift", muscle: "hamstrings", secondary: ["glutes", "lower_back"] },
    { name: "Leg Extension", muscle: "quads", secondary: [] },
    { name: "Hamstring Curl", muscle: "hamstrings", secondary: [] },
    { name: "Calf Raise", muscle: "calves", secondary: [] },

    // PUSH (Chest/Shoulders/Tri)
    { name: "Bench Press", muscle: "chest", secondary: ["front_delts", "triceps"] },
    { name: "Incline Bench Press", muscle: "chest", secondary: ["front_delts", "triceps"] },
    { name: "Overhead Press", muscle: "front_delts", secondary: ["triceps", "upper_chest"] },
    { name: "Lateral Raise", muscle: "side_delts", secondary: ["traps"] },
    { name: "Tricep Extension", muscle: "triceps", secondary: [] },
    { name: "Push Up", muscle: "chest", secondary: ["core", "triceps"] },
    { name: "Dips", muscle: "triceps", secondary: ["chest", "front_delts"] },

    // PULL (Back/Bi)
    { name: "Deadlift", muscle: "lower_back", secondary: ["hamstrings", "glutes", "traps"] },
    { name: "Pull Up", muscle: "lats", secondary: ["biceps", "rear_delts"] },
    { name: "Lat Pulldown", muscle: "lats", secondary: ["biceps"] },
    { name: "Barbell Row", muscle: "lats", secondary: ["lower_back", "biceps", "rear_delts"] },
    { name: "Face Pull", muscle: "rear_delts", secondary: ["traps", "rotator_cuff"] },
    { name: "Dumbbell Curl", muscle: "biceps", secondary: ["forearms"] },
    { name: "Hammer Curl", muscle: "biceps", secondary: ["forearms"] },
    
    // CORE
    { name: "Plank", muscle: "abs", secondary: ["core"] },
    { name: "Crunches", muscle: "abs", secondary: [] }
];

export const LEVELS = [
    { name: "Iron Novice", min: 0, color: "text-gray-400", border: 'border-gray-500', bg: 'bg-gray-500/10' },
    { name: "Bronze", min: 1000, color: "text-orange-700", border: 'border-orange-700', bg: 'bg-orange-700/10' },
    { name: "Silver", min: 2500, color: "text-slate-300", border: 'border-slate-300', bg: 'bg-slate-300/10' },
    { name: "Gold", min: 5000, color: "text-yellow-400", border: 'border-yellow-400', bg: 'bg-yellow-400/10' },
    { name: "Platinum", min: 10000, color: "text-cyan-400", border: 'border-cyan-400', bg: 'bg-cyan-400/10' },
    { name: "Diamond", min: 25000, color: "text-indigo-400", border: 'border-indigo-400', bg: 'bg-indigo-400/10' }
];