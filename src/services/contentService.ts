
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
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { ContentItem, Zone, Tag, MovieDetails } from '@/types';
import { enrichContent } from '@/ai/flows/enrich-content-flow';
import { addLog } from '@/services/loggingService';

// Firestore collection references
const contentCollection = collection(db, 'content');
const zonesCollection = collection(db, 'zones');

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
      where('type', '!=', 'todo'), // Exclude todos from main feed
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

export async function getTodoItems(userId: string): Promise<ContentItem[]> {
  try {
    if (!userId) {
        console.warn("getTodoItems called without a userId. Returning empty array.");
        return [];
    }
    const q = query(contentCollection, where("userId", "==", userId), where("type", "==", "todo"));
    const querySnapshot = await getDocs(q);
    const items: ContentItem[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt;
      items.push({
        id: doc.id,
        ...data,
        createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : new Date().toISOString(),
      } as ContentItem);
    });
    return items;
  } catch (error) {
    console.error("Failed to get todo items from Firestore:", error);
    throw error;
  }
}


// Function to get all content items for a specific user
export async function getContentItems(userId: string): Promise<ContentItem[]> {
  try {
    if (!userId) {
        console.warn("getContentItems called without a userId. Returning empty array.");
        return [];
    }
    const q = query(contentCollection, where("userId", "==", userId), orderBy('createdAt', 'desc'));
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
  callback: (items: ContentItem[], error?: any) => void
): Unsubscribe {
  if (!userId) {
    console.warn("subscribeToContentItems called without a userId.");
    callback([]);
    return () => {}; // Return a no-op unsubscribe function
  }
  const q = query(contentCollection, where("userId", "==", userId), orderBy('createdAt', 'desc'));
  
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

    // Set initial status for enrichment for links, images, voice notes and PDFs.
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

    // After successfully adding the document, trigger the enrichment flow asynchronously
    if (dataToSave.status === 'pending-analysis') {
      // We do not await this. Let it run in the background.
      enrichContent(docRef.id).catch(err => {
        console.error(`Failed to trigger enrichment for ${docRef.id}:`, err);
      });
    }

    const finalItem = {
      id: docRef.id,
      ...dataToSave,
    };
    finalItem.createdAt = (finalItem.createdAt as Timestamp).toDate().toISOString();

    return finalItem as ContentItem;

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

    if (updateData.dueDate === null) {
      // Handle removal if needed
    } else if (updateData.dueDate) {
      updateData.dueDate = updateData.dueDate;
    }

    await updateDoc(docRef, updateData);
    return await getContentItemById(itemId);
  } catch(error) {
    console.error(`Failed to update content item with ID ${itemId}:`, error);
    throw error;
  }
}

export interface SearchFilters {
  zoneId?: string | null;
  contentType?: string | null;
  tagNames?: string[];
}


export async function searchContentItems({
  userId,
  searchQuery,
  filters = {},
  pageSize,
  lastDoc,
}: {
  userId: string;
  searchQuery: string;
  filters?: SearchFilters;
  pageSize: number;
  lastDoc?: DocumentSnapshot;
}): Promise<{ items: ContentItem[]; lastVisibleDoc: DocumentSnapshot | null }> {
    const searchId = `search-${Date.now()}`;
    await addLog('INFO', `[${searchId}] Search initiated for user ${userId}`, { searchQuery, filters, pageSize });

    try {
        if (!userId || !searchQuery.trim()) {
            await addLog('WARN', `[${searchId}] Search aborted: missing user ID or search query.`);
            return { items: [], lastVisibleDoc: null };
        }

        const queryWords = [...new Set(searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 1))];
        if (queryWords.length === 0) {
            await addLog('WARN', `[${searchId}] Search aborted: no valid query words.`);
            return { items: [], lastVisibleDoc: null };
        }
        
        const primaryKeyword = queryWords[0];
        await addLog('INFO', `[${searchId}] Primary keyword for Firestore query: '${primaryKeyword}'`);
        
        const queryConstraints: any[] = [
            where('userId', '==', userId),
            where('searchableKeywords', 'array-contains', primaryKeyword),
            orderBy('createdAt', 'desc'),
            limit(pageSize),
        ];

        if (filters.zoneId) {
            queryConstraints.push(where('zoneId', '==', filters.zoneId));
        }
        if (filters.contentType) {
            queryConstraints.push(where('contentType', '==', filters.contentType));
        }
        if (lastDoc) {
            queryConstraints.push(startAfter(lastDoc));
        }
        
        await addLog('INFO', `[${searchId}] Executing Firestore query.`);
        const q = query(contentCollection, ...queryConstraints);
        const querySnapshot = await getDocs(q);
        await addLog('INFO', `[${searchId}] Firestore query returned ${querySnapshot.docs.length} documents.`);
        
        let items = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt;
            return {
                id: doc.id,
                ...data,
                createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : new Date().toISOString(),
            } as ContentItem;
        });
        
        const preFilterCount = items.length;

        const remainingKeywords = queryWords.slice(1);
        if (remainingKeywords.length > 0) {
            items = items.filter(item => 
                remainingKeywords.every(kw => 
                    item.searchableKeywords?.includes(kw)
                )
            );
        }

        if (filters.tagNames && filters.tagNames.length > 0) {
            const filterTagNamesLower = filters.tagNames.map(t => t.toLowerCase());
            items = items.filter(item => {
                const itemTagNames = item.tags.map(tag => tag.name.toLowerCase());
                return filterTagNamesLower.every(filterTag => itemTagNames.includes(filterTag));
            });
        }
        
        await addLog('INFO', `[${searchId}] Client-side filtering complete. Pre-filter count: ${preFilterCount}, Post-filter count: ${items.length}.`);

        const lastVisibleDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;

        await addLog('INFO', `[${searchId}] Search successful. Returning ${items.length} items.`);
        return { items, lastVisibleDoc };
    } catch (error: any) {
        console.error("Failed to search content items from Firestore:", error);
        await addLog('ERROR', `[${searchId}] Search failed catastrophically.`, { error: error.message, stack: error.stack });
        throw error;
    }
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
