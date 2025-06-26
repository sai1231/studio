
'use server';

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
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { ContentItem, Zone, Tag, MovieDetails } from '@/types';

// Firestore collection references
const contentCollection = collection(db, 'content');
const zonesCollection = collection(db, 'zones');

// --- ContentItem Functions ---

// Function to get all content items
export async function getContentItems(userId?: string): Promise<ContentItem[]> {
  // TODO: Add where('userId', '==', userId) to the query when auth is implemented
  const q = query(contentCollection, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  const items: ContentItem[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    items.push({
      id: doc.id,
      ...data,
      // Ensure createdAt is a string to match the type, Firestore Timestamps need conversion
      createdAt: data.createdAt,
    } as ContentItem);
  });
  return items;
}

// Function to get a single content item by ID
export async function getContentItemById(id: string): Promise<ContentItem | undefined> {
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
}

// Function to add a new content item
export async function addContentItem(
  itemData: Omit<ContentItem, 'id' | 'createdAt'>
): Promise<{ success: boolean, itemId: string, itemTitle: string, error?: string }> {
  try {
    let extractedDomain: string | undefined = itemData.domain;
    let itemType = itemData.type;
    let finalContentType = itemData.contentType;
    let finalImageUrl = itemData.imageUrl;
    let finalDescription = itemData.description;
    let movieDetailsData: MovieDetails | undefined = itemData.type === 'movie' ? itemData.movieDetails : undefined;

    // Movie details fetching logic (requires TMDB_API_KEY in .env)
    if (itemType === 'link' && itemData.url && itemData.url.includes('imdb.com/title/') && process.env.TMDB_API_KEY) {
      itemType = 'movie';
      finalContentType = 'Movie';
      const imdbId = itemData.url.split('/title/')[1].split('/')[0];
      if (imdbId) {
        try {
          const tmdbResponse = await fetch(`https://api.themoviedb.org/3/find/${imdbId}?api_key=${process.env.TMDB_API_KEY}&external_source=imdb_id`);
          const tmdbFindData = await tmdbResponse.json();
          if (tmdbFindData.movie_results && tmdbFindData.movie_results.length > 0) {
            const movieId = tmdbFindData.movie_results[0].id;
            const movieDetailResponse = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.TMDB_API_KEY}&append_to_response=credits`);
            const movieData = await movieDetailResponse.json();
            finalImageUrl = movieData.poster_path ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}` : finalImageUrl;
            finalDescription = movieData.overview || finalDescription;
            movieDetailsData = {
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
    } else if (itemType === 'link' && itemData.url && !extractedDomain) {
      try {
        extractedDomain = new URL(itemData.url).hostname.replace(/^www\./, '');
      } catch (e) {
        console.warn("Could not extract domain from URL:", itemData.url);
      }
    }

    const newItemData = {
      ...itemData,
      type: itemType,
      domain: extractedDomain,
      contentType: finalContentType,
      description: finalDescription,
      imageUrl: finalImageUrl,
      movieDetails: movieDetailsData,
      createdAt: new Date().toISOString(),
    };
    
    const newDocRef = await addDoc(contentCollection, newItemData);
    return { success: true, itemId: newDocRef.id, itemTitle: itemData.title };

  } catch (error) {
    console.error("Error in addContentItem:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, itemId: '', itemTitle: '', error: errorMessage };
  }
}

// Function to delete a content item
export async function deleteContentItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'content', itemId));
}

// Function to update a content item
export async function updateContentItem(
  itemId: string,
  updates: Partial<Omit<ContentItem, 'id' | 'createdAt' | 'userId'>>
): Promise<ContentItem | undefined> {
  const docRef = doc(db, 'content', itemId);
  await updateDoc(docRef, updates);
  return await getContentItemById(itemId); // Fetch the updated document
}

// --- Zone Functions ---

export async function getZones(userId?: string): Promise<Zone[]> {
  const querySnapshot = await getDocs(zonesCollection);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Zone));
}

export async function getZoneById(id: string): Promise<Zone | undefined> {
  const docRef = doc(db, 'zones', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Zone : undefined;
}

export async function addZone(name: string): Promise<Zone> {
  const newZone = { name: name.trim(), icon: 'Bookmark' }; // Default icon
  const docRef = await addDoc(zonesCollection, newZone);
  return { id: docRef.id, ...newZone };
}

// --- Utility & File Functions ---

// Function for file upload to Firebase Storage
export async function uploadFile(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

// --- Efficient Data Extraction Functions ---

export async function getUniqueDomainsFromItems(items: ContentItem[]): Promise<string[]> {
  const domains = new Set<string>();
  items.forEach(item => {
    if (item.domain) {
      domains.add(item.domain);
    }
  });
  return Array.from(domains).sort();
}

export async function getUniqueContentTypesFromItems(items: ContentItem[]): Promise<string[]> {
  const contentTypes = new Set<string>();
  items.forEach(item => {
    if (item.contentType) {
      contentTypes.add(item.contentType);
    }
  });
  return Array.from(contentTypes).sort();
}

export async function getUniqueTagsFromItems(items: ContentItem[]): Promise<Tag[]> {
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
