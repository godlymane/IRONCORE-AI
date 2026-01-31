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
        const fileRef = ref(storage, `users/${userId}/progress_photos/${Date.now()}_${file.name}`);
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
 * Get user's progress photos
 * @param {string} userId 
 */
export const getPhotos = async (userId) => {
    try {
        const q = query(
            collection(db, `users/${userId}/photos`),
            orderBy('date', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
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


