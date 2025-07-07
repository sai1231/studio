
'use server';

import MeiliSearch from 'meilisearch';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { ContentItem, SearchFilters } from '@/types';
import { addLog } from './loggingService';

// Initialize client only if host and key are provided. This prevents client-side crashes.
const client =
  process.env.MEILISEARCH_HOST && process.env.MEILISEARCH_MASTER_KEY
    ? new MeiliSearch({
        host: process.env.MEILISEARCH_HOST,
        apiKey: process.env.MEILISEARCH_MASTER_KEY,
      })
    : null;

const index = client ? client.index('content') : null;

// Store all fields needed to render a card to avoid a second DB fetch
const formatForIndex = (item: ContentItem) => ({
  id: item.id,
  userId: item.userId,
  type: item.type,
  title: item.title,
  description: item.description || '',
  url: item.url,
  imageUrl: item.imageUrl,
  faviconUrl: item.faviconUrl,
  tags: item.tags?.map(t => t.name) || [],
  zoneId: item.zoneId,
  domain: item.domain,
  contentType: item.contentType,
  createdAt: new Date(item.createdAt).getTime(), // for sorting
  movieDetails: item.movieDetails,
});

export const searchContent = async (userId: string, query: string, filters: SearchFilters = {}): Promise<ContentItem[]> => {
  if (!index) return [];
  try {
    const filterClauses = [`userId = "${userId}"`];
    if (filters.zoneId) {
      filterClauses.push(`zoneId = "${filters.zoneId}"`);
    }
    if (filters.contentType) {
      filterClauses.push(`contentType = "${filters.contentType}"`);
    }
    if (filters.tagNames && filters.tagNames.length > 0) {
      const tagFilters = filters.tagNames.map(tag => `tags = "${tag}"`);
      filterClauses.push(`(${tagFilters.join(' AND ')})`);
    }
    
    const searchResults = await index.search(query, {
      filter: filterClauses,
      limit: 100, // Limit results for performance
    });

    // The hits from Meilisearch will have the same structure as what we indexed.
    // We just need to reconstruct it into our ContentItem type.
    return searchResults.hits.map((hit: any) => ({
      ...hit,
      // Reconstruct the tags array of objects
      tags: hit.tags.map((t: string) => ({ id: t.toLowerCase(), name: t })),
      // Convert timestamp back to ISO string for consistency
      createdAt: new Date(hit.createdAt).toISOString(),
    }));
  } catch (error) {
    addLog('ERROR', `[MeiliSearch] Failed to search`, { error });
    console.error(`[MeiliSearch] Failed to search`, error);
    return [];
  }
}

export const addOrUpdateDocument = async (item: ContentItem) => {
  if (!index) return; // Silently fail if not configured
  try {
    const doc = formatForIndex(item);
    await index.addDocuments([doc]);
    addLog('INFO', `[MeiliSearch] Indexed document ${item.id}`);
  } catch (error) {
    addLog('ERROR', `[MeiliSearch] Failed to index document ${item.id}`, { error });
    console.error(`[MeiliSearch] Failed to index document ${item.id}`, error);
  }
};

export const deleteDocument = async (itemId: string) => {
  if (!index) return; // Silently fail if not configured
  try {
    await index.deleteDocument(itemId);
    addLog('INFO', `[MeiliSearch] Deleted document ${itemId}`);
  } catch (error) {
    addLog('ERROR', `[MeiliSearch] Failed to delete document ${itemId}`, { error });
    console.error(`[MeiliSearch] Failed to delete document ${itemId}`, error);
  }
};

export const getIndexStats = async () => {
    if (!index) {
        throw new Error("Meilisearch not configured.");
    }
    try {
        return await index.getStats();
    } catch (error) {
        console.error("[MeiliSearch] Failed to get stats", error);
        throw new Error("Could not connect to Meilisearch to get stats.");
    }
}

export const reindexAllContent = async (): Promise<{ count: number }> => {
    if (!index || !client) {
        throw new Error("Meilisearch not configured.");
    }
    if (!db) {
        throw new Error("Firestore is not configured, cannot re-index.");
    }
    try {
        addLog('INFO', '[MeiliSearch] Starting full re-index.');
        const contentSnapshot = await getDocs(collection(db, 'content'));
        const allItems = contentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContentItem));
        
        if (allItems.length === 0) {
            addLog('INFO', '[MeiliSearch] No content to index.');
            return { count: 0 };
        }

        const formattedItems = allItems.map(formatForIndex);
        
        // Use addDocuments which is an upsert operation
        const task = await index.addDocuments(formattedItems, { primaryKey: 'id' });
        await client.waitForTask(task.taskUid);
        
        addLog('INFO', `[MeiliSearch] Re-index complete. ${allItems.length} documents processed.`);
        return { count: allItems.length };
    } catch (error) {
        addLog('ERROR', '[MeiliSearch] Full re-index failed.', { error });
        console.error("[MeiliSearch] Full re-index failed.", error);
        throw error;
    }
};