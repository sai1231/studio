

import { db, storage } from '@/lib/firebase';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  where,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
  limit,
  startAfter,
  type DocumentSnapshot,
  setDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { ContentItem, Zone, Tag, MovieDetails, SearchFilters, TaskList, Task } from '@/types';
import { enrichContent } from '@/ai/flows/enrich-content-flow';
import { addLog } from '@/services/loggingService';

// Firestore collection references
const contentCollection = collection(db, 'content');
const zonesCollection = collection(db, 'zones');
const taskListsCollection = collection(db, 'taskLists');

// --- ContentItem Functions ---

export async function getContentItemsPaginated({
  userId,
  pageSize,
  lastDoc,
}: {
  userId: string;
  pageSize: number;
  lastDoc?: DocumentSnapshot;
}): Promise<{ items: ContentItem[]; lastVisibleDoc: DocumentSnapshot | null }> {
  try {
    if (!userId) {
      console.warn('getContentItemsPaginated called without a userId.');
      return { items: [], lastVisibleDoc: null };
    }
    
    const queryConstraints: any[] = [
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    ];

    if (lastDoc) {
      queryConstraints.push(startAfter(lastDoc));
    }

    const q = query(contentCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);

    const items = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt;
      return {
        id: doc.id,
        ...data,
        createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : new Date().toISOString(),
      } as ContentItem;
    });

    const lastVisibleDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;

    return { items, lastVisibleDoc };
  } catch (error) {
    console.error('Failed to get paginated content items from Firestore:', error);
    throw error;
  }
}

export async function getContentCount(userId: string): Promise<number> {
  try {
    if (!userId) {
      console.warn('getContentCount called without a userId.');
      return 0;
    }
    const q = query(contentCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Failed to get content count from Firestore:', error);
    throw error;
  }
}


// Function to get all content items for a specific user
export async function getContentItems(userId: string, contentLimit?: number): Promise<ContentItem[]> {
  try {
    if (!userId) {
        console.warn("getContentItems called without a userId. Returning empty array.");
        return [];
    }
    const qConstraints: any[] = [
        where("userId", "==", userId),
        orderBy('createdAt', 'desc')
    ];

    if (contentLimit && contentLimit !== -1) {
        qConstraints.push(limit(contentLimit));
    }

    const q = query(contentCollection, ...qConstraints);
    const querySnapshot = await getDocs(q);
    const items: ContentItem[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt; // Firestore Timestamp
      items.push({
        id: doc.id,
        ...data,
        // Ensure createdAt is always a string for components
        createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : (createdAt || new Date().toISOString()),
      } as ContentItem);
    });
    return items;
  } catch (error) {
    console.error("Failed to get content items from Firestore:", error);
    throw error;
  }
}

// New function for real-time updates
export function subscribeToContentItems(
  userId: string,
  callback: (items: ContentItem[], error?: any) => void,
  contentLimit?: number,
): Unsubscribe {
  if (!userId) {
    console.warn("subscribeToContentItems called without a userId.");
    callback([]);
    return () => {}; // Return a no-op unsubscribe function
  }
  
  const qConstraints: any[] = [
      where("userId", "==", userId),
      orderBy('createdAt', 'desc')
  ];

  if (contentLimit && contentLimit !== -1) {
      qConstraints.push(limit(contentLimit));
  }
  
  const q = query(contentCollection, ...qConstraints);
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const items: ContentItem[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt; // Firestore Timestamp
      items.push({
        id: doc.id,
        ...data,
        createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : (createdAt || new Date().toISOString()),
      } as ContentItem);
    });
    callback(items);
  }, (error) => {
    console.error("Failed to subscribe to content items from Firestore:", error);
    callback([], error);
  });

  return unsubscribe;
}


// Function to get a single content item by ID
export async function getContentItemById(id: string): Promise<ContentItem | undefined> {
  try {
    const docRef = doc(db, 'content', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const createdAt = data.createdAt;
      return {
        id: docSnap.id,
        ...data,
        createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : (createdAt || new Date().toISOString()),
      } as ContentItem;
    }
    return undefined;
  } catch (error) {
    console.error(`Failed to get content item with ID ${id} from Firestore:`, error);
    throw error;
  }
}

// Function to add a new content item
export async function addContentItem(
  itemData: Omit<ContentItem, 'id' | 'createdAt'>
): Promise<ContentItem> {
  try {
    if (!itemData.userId) {
      throw new Error("User ID is required to add a content item.");
    }
    
    const dataToSave: { [key: string]: any } = { ...itemData };
    dataToSave.createdAt = Timestamp.fromDate(new Date());

    if (['link', 'image', 'voice', 'note'].includes(dataToSave.type) || (dataToSave.type === 'link' && dataToSave.contentType === 'PDF')) {
      dataToSave.status = 'pending-analysis';
    }

    if (dataToSave.type === 'link' && dataToSave.url && !dataToSave.domain) {
      try {
        dataToSave.domain = new URL(dataToSave.url).hostname.replace(/^www\./, '');
      } catch (e) {
        console.warn("Could not extract domain from URL:", dataToSave.url);
      }
    }
    
    Object.keys(dataToSave).forEach(key => {
      if (dataToSave[key] === undefined) {
        delete dataToSave[key];
      }
    });

    const docRef = await addDoc(contentCollection, dataToSave);

    const finalItem: ContentItem = {
      id: docRef.id,
      ...dataToSave,
      createdAt: (dataToSave.createdAt as Timestamp).toDate().toISOString(),
    };

    if (dataToSave.status === 'pending-analysis') {
      enrichContent(docRef.id).catch(err => {
        console.error(`Failed to trigger enrichment for ${docRef.id}:`, err);
      });
    }

    return finalItem;

  } catch (error) {
    console.error("Failed to add content item to Firestore:", error);
    throw error;
  }
}

// Function to delete a content item
export async function deleteContentItem(itemId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'content', itemId));
  } catch(error) {
    console.error(`Failed to delete content item with ID ${itemId}:`, error);
    throw error;
  }
}

// Function to update a content item
export async function updateContentItem(
  itemId: string,
  updates: Partial<Omit<ContentItem, 'id' | 'createdAt' | 'userId'>>
): Promise<ContentItem | undefined> {
  try {
    const docRef = doc(db, 'content', itemId);
    const updateData: { [key: string]: any } = { ...updates };
    
    if (Object.prototype.hasOwnProperty.call(updates, 'expiresAt') && updates.expiresAt === undefined) {
        updateData.expiresAt = null; 
    }

    await updateDoc(docRef, updateData);
    const updatedItem = await getContentItemById(itemId);
    return updatedItem;
  } catch(error) {
    console.error(`Failed to update content item with ID ${itemId}:`, error);
    throw error;
  }
}


// --- TaskList Functions ---

export async function getOrCreateTaskList(userId: string): Promise<TaskList> {
  const docRef = doc(taskListsCollection, userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as TaskList;
  } else {
    const newTaskList: Omit<TaskList, 'id'> = {
      userId: userId,
      tasks: [],
    };
    await setDoc(docRef, newTaskList);
    return { id: userId, ...newTaskList };
  }
}

export async function updateTaskList(userId: string, tasks: Task[]): Promise<void> {
  const docRef = doc(taskListsCollection, userId);
  const sortedTasks = tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  await updateDoc(docRef, { tasks: sortedTasks });
}

export function subscribeToTaskList(
  userId: string,
  callback: (taskList: TaskList | null, error?: any) => void
): Unsubscribe {
  if (!userId) {
    callback(null);
    return () => {};
  }
  const docRef = doc(taskListsCollection, userId);
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const sortedTasks = ((data.tasks || []) as Task[]).sort((a, b) => {
          if (a.status === 'pending' && b.status === 'completed') return -1;
          if (a.status === 'completed' && b.status === 'pending') return 1;
          if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          if (a.dueDate && !b.dueDate) return -1;
          if (!a.dueDate && b.dueDate) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      callback({ id: docSnap.id, userId, tasks: sortedTasks });
    } else {
      // Document doesn't exist, create it and then callback
      getOrCreateTaskList(userId).then(newTaskList => {
        // The listener will pick up this creation, so we can just callback with the new list
        // No need to manually call callback here as the listener will fire.
      }).catch(err => callback(null, err));
    }
  }, (error) => {
    console.error("Failed to subscribe to task list:", error);
    callback(null, error);
  });
  return unsubscribe;
}


// --- Zone Functions ---

export async function getZones(userId: string): Promise<Zone[]> {
  try {
    if (!userId) {
        console.warn("getZones called without a userId. Returning empty array.");
        return [];
    }
    const q = query(zonesCollection, where("userId", "==", userId), orderBy("name", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Zone));
  } catch (error) {
    console.error("Failed to get zones from Firestore:", error);
    throw error;
  }
}

export function subscribeToZones(
  userId: string,
  callback: (zones: Zone[], error?: any) => void
): Unsubscribe {
  if (!userId) {
    console.warn("subscribeToZones called without a userId.");
    callback([]);
    return () => {}; // Return a no-op unsubscribe function
  }
  const q = query(zonesCollection, where("userId", "==", userId), orderBy("name", "asc"));
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const zones: Zone[] = [];
    querySnapshot.forEach((doc) => {
      zones.push({ id: doc.id, ...doc.data() } as Zone);
    });
    callback(zones);
  }, (error) => {
    console.error("Failed to subscribe to zones from Firestore:", error);
    callback([], error);
  });

  return unsubscribe;
}

export async function getZoneById(id: string): Promise<Zone | undefined> {
  try {
    const docRef = doc(db, 'zones', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Zone : undefined;
  } catch (error) {
    console.error(`Failed to get zone with ID ${id} from Firestore:`, error);
    throw error;
  }
}

export async function addZone(name: string, userId: string): Promise<Zone> {
  try {
    if (!userId) {
        throw new Error("User ID is required to add a zone.");
    }
    const newZone = { name: name.trim(), icon: 'Bookmark', userId }; // Default icon and add userId
    const docRef = await addDoc(zonesCollection, newZone);
    return { id: docRef.id, ...newZone };
  } catch (error) {
    console.error(`Failed to add zone "${name}" to Firestore:`, error);
    throw error;
  }
}

// --- Utility & File Functions ---

// New function to delete expired content
export async function deleteExpiredContent(userId: string): Promise<void> {
    try {
        if (!userId) {
            console.warn('deleteExpiredContent called without a userId.');
            return;
        }
        
        const now = new Date().toISOString();
        const q = query(contentCollection, where('userId', '==', userId), where('expiresAt', '<=', now));
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return; // No expired items to delete
        }

        const deletePromises: Promise<void>[] = [];
        querySnapshot.forEach((doc) => {
            console.log(`Deleting expired item: ${doc.id}`);
            addLog('INFO', `Auto-deleting expired content item: ${doc.id}`);
            deletePromises.push(deleteDoc(doc.ref));
        });

        await Promise.all(deletePromises);
        console.log(`Successfully deleted ${querySnapshot.size} expired items.`);

    } catch (error) {
        console.error('Failed to delete expired content items from Firestore:', error);
        addLog('ERROR', 'Failed to run expired content cleanup', { error: (error as Error).message });
        // We don't throw here as this is a background cleanup task
    }
}


// Function for file upload to Firebase Storage, returns the public download URL
export async function uploadFile(file: File, path: string): Promise<string> {
  try {
    if (!storage.app.options.storageBucket) {
      throw new Error("Firebase Storage bucket is not configured. Please check NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in your .env file.");
    }
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error: any) {
    console.error(`Failed to upload file to Storage at path ${path}:`, error);
    throw error;
  }
}

// --- Efficient Data Extraction Functions ---

export function getUniqueDomainsFromItems(items: ContentItem[]): string[] {
  const domains = new Set<string>();
  items.forEach(item => {
    if (item.domain) {
      domains.add(item.domain);
    }
  });
  return Array.from(domains).sort();
}

export function getUniqueContentTypesFromItems(items: ContentItem[]): string[] {
  const contentTypes = new Set<string>();
  items.forEach(item => {
    if (item.contentType) {
      contentTypes.add(item.contentType);
    }
  });
  return Array.from(contentTypes).sort();
}

export function getUniqueTagsFromItems(items: ContentItem[]): Tag[] {
  const allTagsMap = new Map<string, Tag>();
  items.forEach(item => {
    (item.tags || []).forEach(tag => { 
      if (tag && tag.name && !allTagsMap.has(tag.name.toLowerCase())) { 
        allTagsMap.set(tag.name.toLowerCase(), tag);
      }
    });
  });
  return Array.from(allTagsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}
