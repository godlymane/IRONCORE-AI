import { db } from '../firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    addDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    increment,
    arrayUnion,
    arrayRemove,
    onSnapshot,
    runTransaction
} from 'firebase/firestore';

/**
 * Create a new guild
 * @param {string} name
 * @param {string} description
 * @param {Object} owner - { userId, username, avatarUrl }
 * @param {Object} options - { tag, focusType, membershipType, minJoinLevel }
 */
export const createGuild = async (name, description, owner, options = {}) => {
    try {
        const { tag = '', focusType = 'Mixed', membershipType = 'Open', minJoinLevel = 5 } = options;

        // Check if name exists
        const q = query(collection(db, 'guilds'), where('name', '==', name));
        const existing = await getDocs(q);
        if (!existing.empty) throw new Error('Guild name already taken');

        // Check if tag exists
        if (tag) {
            const tq = query(collection(db, 'guilds'), where('tag', '==', tag));
            const texisting = await getDocs(tq);
            if (!texisting.empty) throw new Error('Guild tag already taken');
        }

        const guildRef = doc(collection(db, 'guilds'));
        const guildId = guildRef.id;

        const guildData = {
            id: guildId,
            name,
            tag: tag.toUpperCase(),
            description,
            focusType,
            membershipType,
            minJoinLevel,
            level: 1,
            xp: 0,
            weeklyXp: 0,
            ownerId: owner.userId,
            ownerUsername: owner.username,
            memberCount: 1,
            maxMembers: 30,
            isPublic: membershipType === 'Open',
            memberIds: [owner.userId],
            members: [{
                userId: owner.userId,
                username: owner.username,
                avatarUrl: owner.avatarUrl || '',
                role: 'leader',
                joinedAt: new Date().toISOString(),
                weeklyXpContribution: 0,
                forgeStreak: 0,
            }],
            war: {
                weeklyXp: 0,
                rank: null,
                lastResult: null,
                weekStart: new Date().toISOString(),
            },
            createdAt: serverTimestamp(),
        };

        await setDoc(guildRef, guildData);

        // Update user root doc with guildId and guildTag
        const userRef = doc(db, 'users', owner.userId);
        await updateDoc(userRef, { guildId, guildTag: tag.toUpperCase() });

        return guildId;
    } catch (error) {
        console.error('Error creating guild:', error);
        throw error;
    }
};

/**
 * Join a guild
 * @param {string} guildId 
 * @param {Object} user - { userId, username, avatarUrl }
 */
export const joinGuild = async (guildId, user) => {
    try {
        const guildRef = doc(db, 'guilds', guildId);
        const guildSnap = await getDoc(guildRef);

        if (!guildSnap.exists()) throw new Error('Guild not found');

        const guildData = guildSnap.data();
        if (guildData.memberCount >= guildData.maxMembers) {
            throw new Error('Guild is full');
        }

        if (guildData.members.some(m => m.userId === user.userId)) {
            throw new Error('Already a member');
        }

        await updateDoc(guildRef, {
            members: arrayUnion({
                userId: user.userId,
                username: user.username,
                avatarUrl: user.avatarUrl || '',
                role: 'member',
                joinedAt: new Date().toISOString()
            }),
            memberCount: increment(1)
        });

        // Update user profile
        const userRef = doc(db, 'users', user.userId);
        await updateDoc(userRef, { guildId });

        return true;
    } catch (error) {
        console.error('Error joining guild:', error);
        throw error;
    }
};

/**
 * Leave a guild
 * @param {string} guildId 
 * @param {string} userId 
 */
export const leaveGuild = async (guildId, userId) => {
    try {
        const guildRef = doc(db, 'guilds', guildId);
        const userRef = doc(db, 'users', userId);

        await runTransaction(db, async (transaction) => {
            const guildSnap = await transaction.get(guildRef);
            if (!guildSnap.exists()) throw new Error('Guild not found');

            const guildData = guildSnap.data();
            const memberIndex = guildData.members.findIndex(m => m.userId === userId);

            if (memberIndex === -1) throw new Error('Not a member');
            if (guildData.members[memberIndex].role === 'leader' && guildData.memberCount > 1) {
                throw new Error('Leader must transfer ownership before leaving');
            }

            // Remove member by filtering — avoids stale-object arrayRemove issue
            const updatedMembers = guildData.members.filter(m => m.userId !== userId);
            const newCount = updatedMembers.length;

            if (newCount === 0) {
                // Last member — delete the guild
                transaction.delete(guildRef);
            } else {
                transaction.update(guildRef, {
                    members: updatedMembers,
                    memberCount: newCount,
                    memberIds: updatedMembers.map(m => m.userId)
                });
            }

            // Clear guild from user profile
            transaction.update(userRef, { guildId: null, guildTag: null });
        });

        return true;
    } catch (error) {
        console.error('Error leaving guild:', error);
        throw error;
    }
};

/**
 * Get guild details
 * @param {string} guildId 
 */
export const getGuild = async (guildId) => {
    try {
        const guildRef = doc(db, 'guilds', guildId);
        const snapshot = await getDoc(guildRef);
        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting guild:', error);
        throw error;
    }
};

/**
 * Subscribe to guild updates
 * @param {string} guildId 
 * @param {Function} callback 
 */
export const subscribeToGuild = (guildId, callback) => {
    const guildRef = doc(db, 'guilds', guildId);
    return onSnapshot(guildRef, (doc) => {
        if (doc.exists()) {
            callback({ id: doc.id, ...doc.data() });
        } else {
            callback(null);
        }
    }, (err) => console.error('Guild listener error:', err.code || err.message));
};

/**
 * Get list of guilds
 * @param {number} limitCount 
 */
export const getGuilds = async (limitCount = 20) => {
    try {
        const q = query(
            collection(db, 'guilds'),
            orderBy('level', 'desc'), // Sort by level first
            orderBy('memberCount', 'desc'),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting guilds:', error);
        throw error;
    }
};

/**
 * Send guild chat message
 * @param {string} guildId 
 * @param {Object} messageData 
 */
export const sendGuildMessage = async (guildId, messageData) => {
    try {
        await addDoc(collection(db, `guilds/${guildId}/chat`), {
            ...messageData,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error('Error sending guild message:', error);
        throw error;
    }
};

/**
 * Subscribe to guild chat
 * @param {string} guildId 
 * @param {Function} callback 
 */
export const subscribeToGuildChat = (guildId, callback) => {
    const q = query(
        collection(db, `guilds/${guildId}/chat`),
        orderBy('timestamp', 'desc'),
        limit(50)
    );
    return onSnapshot(q, snapshot => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse());
    }, (err) => console.error('Guild chat listener error:', err.code || err.message));
};


