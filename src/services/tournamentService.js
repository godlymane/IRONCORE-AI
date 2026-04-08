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
    startAfter,
    serverTimestamp,
    increment,
    onSnapshot,
    runTransaction
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
        const tournamentRef = doc(db, 'tournaments', tournamentId);

        await runTransaction(db, async (transaction) => {
            // Check for duplicate join
            const participantSnap = await transaction.get(participantRef);
            if (participantSnap.exists()) {
                throw new Error('Already joined this tournament');
            }

            // Verify tournament exists and is joinable
            const tournamentSnap = await transaction.get(tournamentRef);
            if (!tournamentSnap.exists()) {
                throw new Error('Tournament not found');
            }

            // Atomically create participant and increment count
            transaction.set(participantRef, {
                userId: user.userId,
                username: user.username,
                avatarUrl: user.avatarUrl || '',
                score: 0,
                rank: 0,
                joinedAt: serverTimestamp()
            });

            transaction.update(tournamentRef, {
                participantCount: increment(1)
            });
        });

        return true;
    } catch (error) {
        console.error('Error joining tournament:', error);
        throw error;
    }
};

/**
 * Get tournament leaderboard with pagination
 * @param {string} tournamentId
 * @param {number} pageSize
 * @param {object|null} lastDoc - Last document snapshot for cursor pagination
 * @returns {{ participants: Array, lastDoc: object|null, hasMore: boolean }}
 */
export const getTournamentLeaderboard = async (tournamentId, pageSize = 50, lastDoc = null) => {
    try {
        const constraints = [
            collection(db, `tournaments/${tournamentId}/participants`),
            orderBy('score', 'desc'),
            limit(pageSize)
        ];
        if (lastDoc) constraints.push(startAfter(lastDoc));
        const q = query(...constraints);
        const snapshot = await getDocs(q);
        const startRank = lastDoc ? (lastDoc._rankOffset || 0) : 0;
        const participants = snapshot.docs.map((d, index) => ({
            id: d.id,
            rank: startRank + index + 1,
            ...d.data()
        }));
        const lastSnap = snapshot.docs[snapshot.docs.length - 1] || null;
        if (lastSnap) lastSnap._rankOffset = startRank + snapshot.docs.length;
        return {
            participants,
            lastDoc: lastSnap,
            hasMore: snapshot.docs.length === pageSize
        };
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
    }, (err) => console.error('Tournament leaderboard listener error:', err.code || err.message));
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


