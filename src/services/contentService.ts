

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
  arrayUnion,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { ContentItem, Zone, Tag, MovieDetails, SearchFilters, TaskList, Task } from '@/types';
import { enrichContent } from '@/ai/flows/enrich-content-flow';
import { addLog } from '@/services/loggingService';
import { addOrUpdateDocument, deleteDocument } from './meilisearchService';
import { classifyUrl } from './classifierService';

// --- ContentItem Functions ---

export async function getContentItems(userId: string, contentLimit?: number): Promise<ContentItem[]> {
  try {
    if (!db) {
        console.warn("Firestore is not configured. Returning empty array.");
        return [];
    }
    if (!userId) {
        console.warn("getContentItems called without a userId. Returning empty array.");
        return [];
    }
    
    const contentCollection = collection(db, 'content');
    const qConstraints: any[] = [
        where("userId", "==", userId),
        where("isTrashed", "==", false),
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
  if (!db) {
    callback([], new Error("Firestore is not configured."));
    return () => {};
  }
  if (!userId) {
    console.warn("subscribeToContentItems called without a userId.");
    callback([]);
    return () => {}; // Return a no-op unsubscribe function
  }
  
  const contentCollection = collection(db, 'content');
  const qConstraints: any[] = [
      where("userId", "==", userId),
      where("isTrashed", "==", false),
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
    if (!db) return undefined;
    const docRef = doc(db, 'content', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const createdAt = data.createdAt;
      const trashedAt = data.trashedAt;
      return {
        id: docSnap.id,
        ...data,
        createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : (createdAt || new Date().toISOString()),
        trashedAt: trashedAt?.toDate ? trashedAt.toDate().toISOString() : undefined,
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
    if (!db) throw new Error("Firestore is not initialized.");
    if (!itemData.userId) {
      throw new Error("User ID is required to add a content item.");
    }
    
    const contentCollection = collection(db, 'content');
    const dataToSave: { [key: string]: any } = { ...itemData };
    dataToSave.createdAt = Timestamp.fromDate(new Date());
    dataToSave.isTrashed = false; // Ensure new items are not in trash

    if (['link', 'image', 'voice', 'note'].includes(dataToSave.type) || (dataToSave.type === 'link' && dataToSave.contentType === 'PDF')) {
      dataToSave.status = 'pending-analysis';
    }

    if (dataToSave.type === 'link' && dataToSave.url && !dataToSave.domain) {
      try {
        const url = new URL(dataToSave.url);
        dataToSave.domain = url.hostname.replace(/^www\./, '');
        // Classify the URL to set a smart content type
        if (!dataToSave.contentType) {
          dataToSave.contentType = await classifyUrl(dataToSave.url);
        }
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
    
    addOrUpdateDocument(finalItem);

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

export async function moveItemToTrash(itemId: string): Promise<void> {
  try {
    if (!db) throw new Error("Firestore is not initialized.");
    const docRef = doc(db, 'content', itemId);
    const updateData = {
      isTrashed: true,
      trashedAt: Timestamp.now(),
    };
    await updateDoc(docRef, updateData);
    
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const plainItem: ContentItem = {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt.toDate().toISOString(),
        trashedAt: data.trashedAt?.toDate() ? data.trashedAt.toDate().toISOString() : new Date().toISOString(),
      } as ContentItem;
      addOrUpdateDocument(plainItem);
    }
    
  } catch(error) {
    console.error(`Failed to move item ${itemId} to trash:`, error);
    throw error;
  }
}

export async function restoreItemFromTrash(itemId: string): Promise<void> {
  try {
    if (!db) throw new Error("Firestore is not initialized.");
    const docRef = doc(db, 'content', itemId);
    const updateData = {
      isTrashed: false,
      trashedAt: null, // Remove the timestamp
    };
    await updateDoc(docRef, updateData);
    const updatedDoc = await getContentItemById(itemId);
    if (updatedDoc) {
      addOrUpdateDocument(updatedDoc);
    }
  } catch(error) {
    console.error(`Failed to restore item ${itemId} from trash:`, error);
    throw error;
  }
}

// Function to permanently delete a content item
export async function permanentlyDeleteContentItem(itemId: string): Promise<void> {
  try {
    if (!db) throw new Error("Firestore is not initialized.");
    await deleteDoc(doc(db, 'content', itemId));
    deleteDocument(itemId);
  } catch(error) {
    console.error(`Failed to delete content item with ID ${itemId}:`, error);
    throw error;
  }
}

// Function to update a content item
export async function updateContentItem(
  itemId: string,
  updates: Partial<Omit<ContentItem, 'id' | 'createdAt' | 'userId'>>
): Promise<void> {
  try {
    if (!db) throw new Error("Firestore is not initialized.");
    const docRef = doc(db, 'content', itemId);
    const updateData: { [key: string]: any } = { ...updates };
    
    if (Object.prototype.hasOwnProperty.call(updates, 'expiresAt') && updates.expiresAt === undefined) {
        updateData.expiresAt = null; 
    }
    
    // Special handling for memoryNote to append
    if (updates.memoryNote) {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const existingNote = docSnap.data().memoryNote || '';
            updateData.memoryNote = existingNote ? `${existingNote}\n\n${updates.memoryNote}` : updates.memoryNote;
        }
    }

    // Special handling for adding items to a moodboard (a specific zone)
    if (updates.zoneIds && updates.zoneIds.length > 0) {
      await updateDoc(docRef, {
        zoneIds: arrayUnion(...updates.zoneIds)
      });
      delete updateData.zoneIds; // Remove from main update payload
    }


    await updateDoc(docRef, updateData);
    
    const updatedDoc = await getContentItemById(itemId);
    if(updatedDoc) {
      addOrUpdateDocument(updatedDoc);
    }

  } catch(error) {
    console.error(`Failed to update content item with ID ${itemId}:`, error);
    throw error;
  }
}


// --- TaskList Functions ---

export async function getOrCreateTaskList(userId: string): Promise<TaskList> {
  if (!db) throw new Error("Firestore is not initialized.");
  const taskListsCollection = collection(db, 'taskLists');
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
  if (!db) throw new Error("Firestore is not initialized.");
  const taskListsCollection = collection(db, 'taskLists');
  const docRef = doc(taskListsCollection, userId);

  // Firestore doesn't allow 'undefined' values. We clean the tasks array to remove them.
  const cleanedTasks = tasks.map(task => {
    const taskObject: { [key: string]: any } = { ...task };
    Object.keys(taskObject).forEach(key => {
      if (taskObject[key] === undefined) {
        delete taskObject[key];
      }
    });
    return taskObject as Task;
  });

  const sortedTasks = cleanedTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  await updateDoc(docRef, { tasks: sortedTasks });
}

export function subscribeToTaskList(
  userId: string,
  callback: (taskList: TaskList | null, error?: any) => void
): Unsubscribe {
  if (!db) {
    callback(null, new Error("Firestore is not configured."));
    return () => {};
  }
  if (!userId) {
    callback(null);
    return () => {};
  }
  const taskListsCollection = collection(db, 'taskLists');
  const docRef = doc(taskListsCollection, userId);
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const tasks: Task[] = (Array.isArray(data.tasks) ? data.tasks : []).filter(
        (task: any): task is Task => task && typeof task === 'object' && task.createdAt
      );
      
      const sortedTasks = tasks.sort((a, b) => {
          if (a.status === 'pending' && b.status === 'completed') return -1;
          if (a.status === 'completed' && b.status === 'pending') return 1;
          if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          if (a.dueDate && !b.dueDate) return -1;
          if (!a.dueDate && b.dueDate) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      callback({ id: docSnap.id, userId, tasks: sortedTasks });
    } else {
      getOrCreateTaskList(userId).catch(err => callback(null, err));
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
    if (!db) return [];
    if (!userId) {
        console.warn("getZones called without a userId. Returning empty array.");
        return [];
    }
    const zonesCollection = collection(db, 'zones');
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
  if (!db) {
    callback([], new Error("Firestore is not configured."));
    return () => {};
  }
  if (!userId) {
    console.warn("subscribeToZones called without a userId.");
    callback([]);
    return () => {}; // Return a no-op unsubscribe function
  }
  const zonesCollection = collection(db, 'zones');
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
    if (!db) return undefined;
    const docRef = doc(db, 'zones', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Zone : undefined;
  } catch (error) {
    console.error(`Failed to get zone with ID ${id} from Firestore:`, error);
    throw error;
  }
}

export async function addZone(name: string, userId: string, isMoodboard: boolean = false): Promise<Zone> {
  try {
    if (!db) throw new Error("Firestore is not initialized.");
    if (!userId) {
        throw new Error("User ID is required to add a zone.");
    }
    const zonesCollection = collection(db, 'zones');
    const newZone = { 
        name: name.trim(), 
        icon: 'Bookmark', 
        userId,
        isMoodboard: isMoodboard
    };
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
        if (!db) return;
        if (!userId) {
            console.warn('deleteExpiredContent called without a userId.');
            return;
        }
        
        const contentCollection = collection(db, 'content');
        const now = new Date().toISOString();
        const q = query(contentCollection, where('userId', '==', userId), where('isTrashed', '==', false), where('expiresAt', '<=', now));
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return; // No expired items to delete
        }

        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
            console.log(`Moving expired item to trash: ${doc.id}`);
            addLog('INFO', `Auto-trashing expired content item: ${doc.id}`);
            batch.update(doc.ref, { isTrashed: true, trashedAt: Timestamp.now() });
        });

        await batch.commit();
        console.log(`Successfully moved ${querySnapshot.size} expired items to trash.`);

    } catch (error) {
        console.error('Failed to process expired content items:', error);
        addLog('ERROR', 'Failed to run expired content cleanup', { error: (error as Error).message });
    }
}


// Function for file upload to Firebase Storage, returns the public download URL
export async function uploadFile(file: File, path: string): Promise<string> {
  try {
    if (!storage) throw new Error("Firebase Storage is not configured.");
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

// New function to get only trashed items
export function subscribeToTrashedItems(
  userId: string,
  callback: (items: ContentItem[], error?: any) => void
): Unsubscribe {
  if (!db) {
    callback([], new Error("Firestore is not configured."));
    return () => {};
  }
  const contentCollection = collection(db, 'content');
  const q = query(
    contentCollection,
    where("userId", "==", userId),
    where("isTrashed", "==", true),
    orderBy('trashedAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const items: ContentItem[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt;
      const trashedAt = data.trashedAt;
      
      items.push({
        id: doc.id,
        ...data,
        createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : createdAt,
        trashedAt: trashedAt?.toDate ? trashedAt.toDate().toISOString() : trashedAt,
      } as ContentItem);
    });
    callback(items);
  }, (error) => {
    console.error("Failed to subscribe to trashed items:", error);
    callback([], error);
  });

  return unsubscribe;
}
