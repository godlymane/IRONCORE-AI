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
 * AI Trigger Check
 * Run this on app load or periodic interval
 */
export const checkAITriggers = async (user) => {
    if (!user) return;

    // 1. Forge Risk
    const now = new Date();
    // If it's after 8 PM and no workout logged today
    if (now.getHours() >= 20 && !user.lastWorkoutToday) {
        // Check if we already sent a reminder today to avoid spam (simple check logic omitted for brevity, assumes client handles frequency)
        // In real app, we'd check last notification timestamp
    }

    // 2. Milestone approach (e.g. 990 XP)
    if (user.xp && user.xp % 1000 >= 900) {
        // "Close to leveling up!"
    }
};

/**
 * Generate a motivational quote based on user's recent activity (Mock AI)
 */
export const getAIQuote = (userContext) => {
    // Determine context: 'lazy', 'beast_mode', 'injured', etc.
    const quotes = [
        "Pain is strictly mental. Force it out.",
        "The iron never lies to you.",
        "You can have results or excuses. Not both."
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
};


