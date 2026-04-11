import { db, storage } from '../firebase';
import {
    collection,
    doc,
    getDocs,
    addDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Upload a progress photo
 * @param {File} file 
 * @param {string} userId 
 * @param {string} note 
 * @param {string} type - 'front', 'side', 'back', 'other'
 */
export const uploadPhoto = async (file, userId, note = '', type = 'front') => {
    try {
        // 1. Upload to Firebase Storage
        // Sanitize filename to prevent path traversal and special character issues
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileRef = ref(storage, `users/${userId}/photos/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(fileRef, file);
        const url = await getDownloadURL(snapshot.ref);

        // 2. Add metadata to Firestore
        const docRef = await addDoc(collection(db, `users/${userId}/photos`), {
            url,
            storagePath: snapshot.ref.fullPath,
            note,
            type,
            date: new Date().toISOString(),
            createdAt: serverTimestamp()
        });

        return {
            id: docRef.id,
            url,
            note,
            type,
            date: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error uploading photo:', error);
        throw error;
    }
};

/**
 * Get user's progress photos with pagination
 * @param {string} userId
 * @param {number} pageSize - Number of photos per page (default 20)
 * @param {object|null} lastDoc - Last document snapshot for cursor-based pagination
 * @returns {{ photos: Array, lastDoc: object|null, hasMore: boolean }}
 */
export const getPhotos = async (userId, pageSize = 20, lastDoc = null) => {
    try {
        const constraints = [
            collection(db, `users/${userId}/photos`),
            orderBy('date', 'desc'),
            limit(pageSize)
        ];
        if (lastDoc) constraints.push(startAfter(lastDoc));
        const q = query(...constraints);
        const snapshot = await getDocs(q);
        const photos = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));
        return {
            photos,
            lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
            hasMore: snapshot.docs.length === pageSize
        };
    } catch (error) {
        console.error('Error fetching photos:', error);
        throw error;
    }
};

/**
 * Delete a progress photo
 * @param {string} userId 
 * @param {string} photoId 
 * @param {string} storagePath 
 */
export const deletePhoto = async (userId, photoId, storagePath) => {
    try {
        // 1. Delete from Storage (if path exists)
        if (storagePath) {
            const fileRef = ref(storage, storagePath);
            await deleteObject(fileRef).catch(e => console.warn('Storage delete fail:', e));
        }

        // 2. Delete from Firestore
        await deleteDoc(doc(db, `users/${userId}/photos`, photoId));
        return true;
    } catch (error) {
        console.error('Error deleting photo:', error);
        throw error;
    }
};


