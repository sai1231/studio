
'use server'; // Can be used by Server Actions or called from client components that then call server actions

import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, Timestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { ContentItem, ContentItemFirestoreData, Tag } from '@/types';

// Function to upload a file to Firebase Storage
export async function uploadFile(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

// Function to add a new content item to Firestore
export async function addContentItem(
  itemData: Omit<ContentItemFirestoreData, 'createdAt'> // createdAt will be set by serverTimestamp
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'contentItems'), {
      ...itemData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw new Error("Failed to add content item");
  }
}

// Function to get all content items from Firestore
export async function getContentItems(userId?: string): Promise<ContentItem[]> {
  // TODO: Implement filtering by userId when authentication is in place
  const q = query(collection(db, 'contentItems'), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  const items: ContentItem[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data() as ContentItemFirestoreData;
    items.push({
      ...data,
      id: doc.id,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      // Ensure tags are an array, even if undefined in Firestore for some old data
      tags: data.tags || [], 
    });
  });
  return items;
}

// Function to delete a content item from Firestore
export async function deleteContentItemFromFirestore(itemId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'contentItems', itemId));
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw new Error("Failed to delete content item");
  }
}

// Function to update a content item in Firestore
export async function updateContentItemInFirestore(
  itemId: string,
  updates: Partial<Omit<ContentItemFirestoreData, 'createdAt' | 'userId'>>
): Promise<void> {
  try {
    const itemRef = doc(db, 'contentItems', itemId);
    // You might want to add an 'updatedAt: serverTimestamp()' field here as well
    await updateDoc(itemRef, updates);
  } catch (e) {
    console.error("Error updating document: ", e);
    throw new Error("Failed to update content item");
  }
}
