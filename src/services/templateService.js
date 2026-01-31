// Workout Templates Service
// Save, load, and manage reusable workout templates

import { db } from '../firebase';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';

const TEMPLATES_COLLECTION = 'workoutTemplates';

// Default templates for new users
export const DEFAULT_TEMPLATES = [
    {
        id: 'default_push',
        name: 'Push Day',
        description: 'Chest, shoulders, and triceps',
        category: 'strength',
        exercises: [
            { name: 'Bench Press', sets: 4, reps: 8, restSeconds: 90 },
            { name: 'Overhead Press', sets: 3, reps: 10, restSeconds: 60 },
            { name: 'Incline Dumbbell Press', sets: 3, reps: 12, restSeconds: 60 },
            { name: 'Lateral Raises', sets: 3, reps: 15, restSeconds: 45 },
            { name: 'Tricep Pushdowns', sets: 3, reps: 12, restSeconds: 45 },
        ],
        estimatedDuration: 45,
        difficulty: 'intermediate',
        isDefault: true,
    },
    {
        id: 'default_pull',
        name: 'Pull Day',
        description: 'Back and biceps',
        category: 'strength',
        exercises: [
            { name: 'Pull-ups', sets: 4, reps: 8, restSeconds: 90 },
            { name: 'Barbell Rows', sets: 4, reps: 8, restSeconds: 90 },
            { name: 'Lat Pulldowns', sets: 3, reps: 12, restSeconds: 60 },
            { name: 'Face Pulls', sets: 3, reps: 15, restSeconds: 45 },
            { name: 'Bicep Curls', sets: 3, reps: 12, restSeconds: 45 },
        ],
        estimatedDuration: 45,
        difficulty: 'intermediate',
        isDefault: true,
    },
    {
        id: 'default_legs',
        name: 'Leg Day',
        description: 'Quads, hamstrings, and glutes',
        category: 'strength',
        exercises: [
            { name: 'Squats', sets: 4, reps: 8, restSeconds: 120 },
            { name: 'Romanian Deadlifts', sets: 3, reps: 10, restSeconds: 90 },
            { name: 'Leg Press', sets: 3, reps: 12, restSeconds: 60 },
            { name: 'Leg Curls', sets: 3, reps: 12, restSeconds: 45 },
            { name: 'Calf Raises', sets: 4, reps: 15, restSeconds: 30 },
        ],
        estimatedDuration: 50,
        difficulty: 'intermediate',
        isDefault: true,
    },
    {
        id: 'default_hiit',
        name: 'HIIT Cardio',
        description: '20-minute fat burner',
        category: 'cardio',
        exercises: [
            { name: 'Jumping Jacks', duration: 30, restSeconds: 10 },
            { name: 'Burpees', duration: 30, restSeconds: 10 },
            { name: 'Mountain Climbers', duration: 30, restSeconds: 10 },
            { name: 'High Knees', duration: 30, restSeconds: 10 },
            { name: 'Box Jumps', duration: 30, restSeconds: 30 },
        ],
        rounds: 4,
        estimatedDuration: 20,
        difficulty: 'advanced',
        isDefault: true,
    },
    {
        id: 'default_core',
        name: 'Core Crusher',
        description: 'Abs and core stability',
        category: 'core',
        exercises: [
            { name: 'Planks', duration: 60, restSeconds: 30 },
            { name: 'Bicycle Crunches', reps: 20, restSeconds: 30 },
            { name: 'Leg Raises', reps: 15, restSeconds: 30 },
            { name: 'Russian Twists', reps: 20, restSeconds: 30 },
            { name: 'Dead Bug', reps: 12, restSeconds: 30 },
        ],
        rounds: 3,
        estimatedDuration: 15,
        difficulty: 'beginner',
        isDefault: true,
    },
];

/**
 * Get all templates for a user (includes defaults)
 */
export const getUserTemplates = async (userId) => {
    try {
        const q = query(
            collection(db, TEMPLATES_COLLECTION),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const userTemplates = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        // Combine with defaults
        return [...userTemplates, ...DEFAULT_TEMPLATES];
    } catch (error) {
        console.error('Error getting templates:', error);
        return DEFAULT_TEMPLATES;
    }
};

/**
 * Save a custom template
 */
export const saveTemplate = async (userId, template) => {
    try {
        const docRef = await addDoc(collection(db, TEMPLATES_COLLECTION), {
            ...template,
            userId,
            isDefault: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error saving template:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Update an existing template
 */
export const updateTemplate = async (templateId, updates) => {
    try {
        await updateDoc(doc(db, TEMPLATES_COLLECTION, templateId), {
            ...updates,
            updatedAt: serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating template:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Delete a custom template
 */
export const deleteTemplate = async (templateId) => {
    try {
        await deleteDoc(doc(db, TEMPLATES_COLLECTION, templateId));
        return { success: true };
    } catch (error) {
        console.error('Error deleting template:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Duplicate a template (including defaults)
 */
export const duplicateTemplate = async (userId, template, newName) => {
    const copy = {
        ...template,
        name: newName || `${template.name} (Copy)`,
        isDefault: false,
    };
    delete copy.id;

    return saveTemplate(userId, copy);
};

/**
 * Create template from completed workout
 */
export const createTemplateFromWorkout = async (userId, workout, name) => {
    const template = {
        name: name || `Workout on ${new Date(workout.date).toLocaleDateString()}`,
        description: workout.notes || '',
        category: workout.type || 'strength',
        exercises: workout.exercises || [],
        estimatedDuration: workout.duration || 30,
        difficulty: 'custom',
    };

    return saveTemplate(userId, template);
};

/**
 * Get templates by category
 */
export const getTemplatesByCategory = async (userId, category) => {
    const all = await getUserTemplates(userId);
    return all.filter(t => t.category === category);
};

/**
 * Search templates
 */
export const searchTemplates = async (userId, searchTerm) => {
    const all = await getUserTemplates(userId);
    const term = searchTerm.toLowerCase();
    return all.filter(t =>
        t.name.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term)
    );
};


