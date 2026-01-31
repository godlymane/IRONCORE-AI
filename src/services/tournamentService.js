import { db } from '../firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    increment,
    onSnapshot
} from 'firebase/firestore';

/**
 * Get current active tournament
 */
export const getCurrentTournament = async () => {
    try {
        const q = query(
            collection(db, 'tournaments'),
            where('status', '==', 'active'),
            limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }

        // If no active tournament, check for upcoming
        const upcomingQ = query(
            collection(db, 'tournaments'),
            where('status', '==', 'upcoming'),
            orderBy('startDate', 'asc'),
            limit(1)
        );
        const upcomingSnapshot = await getDocs(upcomingQ);
        if (!upcomingSnapshot.empty) {
            const doc = upcomingSnapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }

        return null;
    } catch (error) {
        console.error('Error getting tournament:', error);
        throw error;
    }
};

/**
 * Join a tournament
 * @param {string} tournamentId 
 * @param {Object} user 
 */
export const joinTournament = async (tournamentId, user) => {
    try {
        const participantRef = doc(db, `tournaments/${tournamentId}/participants`, user.userId);
        await setDoc(participantRef, {
            userId: user.userId,
            username: user.username,
            avatarUrl: user.avatarUrl || '',
            score: 0,
            rank: 0,
            joinedAt: serverTimestamp()
        });

        // Increment participant count
        const tournamentRef = doc(db, 'tournaments', tournamentId);
        await updateDoc(tournamentRef, {
            participantCount: increment(1)
        });

        return true;
    } catch (error) {
        console.error('Error joining tournament:', error);
        throw error;
    }
};

/**
 * Get tournament leaderboard
 * @param {string} tournamentId 
 * @param {number} limitCount 
 */
export const getTournamentLeaderboard = async (tournamentId, limitCount = 50) => {
    try {
        const q = query(
            collection(db, `tournaments/${tournamentId}/participants`),
            orderBy('score', 'desc'),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc, index) => ({
            id: doc.id,
            rank: index + 1,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting tournament leaderboard:', error);
        throw error;
    }
};

/**
 * Subscribe to tournament leaderboard
 * @param {string} tournamentId 
 * @param {Function} callback 
 */
export const subscribeToTournamentLeaderboard = (tournamentId, callback) => {
    const q = query(
        collection(db, `tournaments/${tournamentId}/participants`),
        orderBy('score', 'desc'),
        limit(50)
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map((doc, index) => ({
            id: doc.id,
            rank: index + 1,
            ...doc.data()
        })));
    });
};

/**
 * Create a demo tournament (for testing)
 */
export const createDemoTournament = async () => {
    try {
        const tournamentRef = doc(collection(db, 'tournaments'));
        await setDoc(tournamentRef, {
            title: 'Iron Summer Slam',
            description: 'Compete for the highest total workout volume this week!',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active',
            rules: '1 point per kg lifted. 100 points per workout session.',
            rewards: [
                { rank: 1, reward: '1000 XP + "Summer Champion" Badge' },
                { rank: 2, reward: '500 XP' },
                { rank: 3, reward: '250 XP' }
            ],
            participantCount: 0,
            createdAt: serverTimestamp()
        });
        return tournamentRef.id;
    } catch (error) {
        console.error('Error creating demo tournament:', error);
        throw error;
    }
};


