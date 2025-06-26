

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
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { ContentItem, Zone, Tag, MovieDetails } from '@/types';

// Firestore collection references
const contentCollection = collection(db, 'content');
const zonesCollection = collection(db, 'zones');

// --- ContentItem Functions ---

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
      items.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt,
      } as ContentItem);
    });
    return items;
  } catch (error) {
    console.error("Failed to get content items from Firestore:", error);
    throw error;
  }
}

// Function to get a single content item by ID
export async function getContentItemById(id: string): Promise<ContentItem | undefined> {
  try {
    const docRef = doc(db, 'content', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt,
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
    
    // Create a mutable copy to work with
    const dataToSave: { [key: string]: any } = { ...itemData };
    dataToSave.createdAt = new Date().toISOString();

    // Movie details fetching logic (requires TMDB_API_KEY in .env)
    if (dataToSave.type === 'link' && dataToSave.url && dataToSave.url.includes('imdb.com/title/') && process.env.TMDB_API_KEY) {
      dataToSave.type = 'movie';
      dataToSave.contentType = 'Movie';
      const imdbId = dataToSave.url.split('/title/')[1].split('/')[0];
      if (imdbId) {
        try {
          const tmdbResponse = await fetch(`https://api.themoviedb.org/3/find/${imdbId}?api_key=${process.env.TMDB_API_KEY}&external_source=imdb_id`);
          const tmdbFindData = await tmdbResponse.json();
          if (tmdbFindData.movie_results && tmdbFindData.movie_results.length > 0) {
            const movieId = tmdbFindData.movie_results[0].id;
            const movieDetailResponse = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.TMDB_API_KEY}&append_to_response=credits`);
            const movieData = await movieDetailResponse.json();
            
            dataToSave.imageUrl = movieData.poster_path ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}` : dataToSave.imageUrl;
            dataToSave.description = movieData.overview || dataToSave.description;
            dataToSave.movieDetails = {
              posterPath: movieData.poster_path,
              releaseYear: movieData.release_date?.split('-')[0],
              rating: movieData.vote_average ? parseFloat(movieData.vote_average.toFixed(1)) : undefined,
              director: movieData.credits?.crew?.find((c: any) => c.job === 'Director')?.name,
              cast: movieData.credits?.cast?.slice(0, 5).map((c: any) => c.name) || [],
              genres: movieData.genres?.map((g: any) => g.name) || [],
            };
          }
        } catch (e) {
          console.error("Error fetching movie details from TMDb:", e);
        }
      }
    } else if (dataToSave.type === 'link' && dataToSave.url && !dataToSave.domain) {
      try {
        dataToSave.domain = new URL(dataToSave.url).hostname.replace(/^www\./, '');
      } catch (e) {
        console.warn("Could not extract domain from URL:", dataToSave.url);
      }
    }

    // This is the key fix: remove any top-level properties that are undefined.
    // Firestore does not allow 'undefined' as a field value.
    Object.keys(dataToSave).forEach(key => {
      if (dataToSave[key] === undefined) {
        delete dataToSave[key];
      }
    });

    const docRef = await addDoc(contentCollection, dataToSave);

    return {
      id: docRef.id,
      ...dataToSave
    } as ContentItem;

  } catch (error) {
    console.error("Failed to add content item to Firestore:", error);
    throw error; // Re-throw for the caller to handle
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
    await updateDoc(docRef, updates);
    return await getContentItemById(itemId); // Fetch the updated document
  } catch(error) {
    console.error(`Failed to update content item with ID ${itemId}:`, error);
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
    const q = query(zonesCollection, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Zone));
  } catch (error) {
    console.error("Failed to get zones from Firestore:", error);
    throw error;
  }
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

// Function for file upload to Firebase Storage
export async function uploadFile(file: File, path: string): Promise<string> {
  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
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
