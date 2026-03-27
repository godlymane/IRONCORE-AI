import { db } from '../firebase';
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    updateDoc,
    doc,
    serverTimestamp,
    getDocs
} from 'firebase/firestore';

/**
 * Send a notification to a specific user
 */
export const sendNotification = async (userId, title, message, type = 'info', actionLink = null) => {
    try {
        await addDoc(collection(db, `users/${userId}/notifications`), {
            title,
            message,
            type, // 'info', 'warning', 'success', 'achievement', 'social'
            read: false,
            actionLink,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (userId, notificationId) => {
    try {
        const notifRef = doc(db, `users/${userId}/notifications`, notificationId);
        await updateDoc(notifRef, {
            read: true
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (userId) => {
    try {
        const q = query(
            collection(db, `users/${userId}/notifications`),
            where('read', '==', false)
        );
        const snapshot = await getDocs(q);
        const batchPromises = snapshot.docs.map(doc =>
            updateDoc(doc.ref, { read: true })
        );
        await Promise.all(batchPromises);
    } catch (error) {
        console.error('Error marking all as read:', error);
    }
};

/**
 * Subscribe to user's notifications
 */
export const subscribeToNotifications = (userId, callback) => {
    const q = query(
        collection(db, `users/${userId}/notifications`),
        orderBy('createdAt', 'desc'),
        limit(50)
    );

    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(notifications);
    }, (err) => console.error('Notifications listener error:', err.code || err.message));
};

/**
 * AI Trigger Check — contextual notifications based on user state.
 * Called on app load. Uses localStorage to prevent duplicate sends per day.
 */
const TRIGGER_KEY = 'ironcore_ai_triggers';

const hasSentToday = (triggerId) => {
    try {
        const record = JSON.parse(localStorage.getItem(TRIGGER_KEY) || '{}');
        const today = new Date().toISOString().split('T')[0];
        return record[triggerId] === today;
    } catch { return false; }
};

const markSent = (triggerId) => {
    try {
        const record = JSON.parse(localStorage.getItem(TRIGGER_KEY) || '{}');
        record[triggerId] = new Date().toISOString().split('T')[0];
        localStorage.setItem(TRIGGER_KEY, JSON.stringify(record));
    } catch { /* skip */ }
};

export const checkAITriggers = async (user) => {
    if (!user || !user.id) return;
    const now = new Date();

    // 1. Forge Risk — evening reminder if no workout today
    if (now.getHours() >= 20 && !user.lastWorkoutToday && !hasSentToday('forge_risk')) {
        const streak = user.currentStreak || 0;
        const msg = streak > 0
            ? `You have a ${streak}-day streak on the line. One quick set keeps it alive.`
            : "No workout logged today. Even 10 minutes counts — don't let the day slip.";
        await sendNotification(user.id, 'Forge at Risk', msg, 'warning');
        markSent('forge_risk');
    }

    // 2. Milestone approaching — within 100 XP of next level-up (every 1000 XP)
    if (user.xp && user.xp % 1000 >= 900 && !hasSentToday('milestone')) {
        const remaining = 1000 - (user.xp % 1000);
        await sendNotification(
            user.id,
            'Almost There',
            `Only ${remaining} XP to your next level. One workout could push you over.`,
            'info'
        );
        markSent('milestone');
    }

    // 3. Win streak — celebrate 5+ consecutive wins
    if (user.currentStreak >= 5 && user.currentStreak % 5 === 0 && !hasSentToday('win_streak')) {
        await sendNotification(
            user.id,
            'Unstoppable',
            `${user.currentStreak} wins in a row. The arena fears you.`,
            'achievement'
        );
        markSent('win_streak');
    }

    // 4. Inactivity nudge — no workout in 3+ days
    if (user.lastWorkoutTime) {
        const daysSince = (Date.now() - new Date(user.lastWorkoutTime).getTime()) / 86400000;
        if (daysSince >= 3 && !hasSentToday('inactivity')) {
            await sendNotification(
                user.id,
                'Missing in Action',
                `${Math.floor(daysSince)} days since your last session. Your rivals aren't resting.`,
                'warning'
            );
            markSent('inactivity');
        }
    }
};

/**
 * Contextual motivational quote based on user activity pattern.
 */
export const getAIQuote = (userContext) => {
    const streak = userContext?.currentStreak || 0;
    const xp = userContext?.xp || 0;

    if (streak >= 7) {
        const quotes = [
            "A week of iron. You're forging something permanent.",
            "Seven days, zero excuses. This is who you are now.",
            "Consistency is the real superpower. Keep stacking."
        ];
        return quotes[Math.floor(Math.random() * quotes.length)];
    }

    if (xp > 10000) {
        const quotes = [
            "You've earned over 10K XP. Most people quit at 100.",
            "The leaderboard notices. Keep climbing.",
            "Elite territory. Don't look back."
        ];
        return quotes[Math.floor(Math.random() * quotes.length)];
    }

    const quotes = [
        "Pain is strictly mental. Force it out.",
        "The iron never lies to you.",
        "You can have results or excuses. Not both.",
        "One more rep. One more step. That's the difference.",
        "Your future self is watching. Make them proud."
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
};
