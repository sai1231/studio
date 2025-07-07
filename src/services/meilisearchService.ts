

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

export const searchContent = async (
  userId: string,
  query: string,
  filters: SearchFilters = {},
  limit: number = 20,
  offset: number = 0
): Promise<{ hits: ContentItem[], total: number }> => {
  if (!index) return { hits: [], total: 0 };
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
      limit,
      offset,
      sort: ['createdAt:desc']
    });

    const hits = searchResults.hits.map((hit: any) => ({
      ...hit,
      tags: hit.tags.map((t: string) => ({ id: t.toLowerCase(), name: t })),
      createdAt: new Date(hit.createdAt).toISOString(),
    }));
    
    return { hits, total: searchResults.estimatedTotalHits };
  } catch (error) {
    addLog('ERROR', `[MeiliSearch] Failed to search`, { error });
    console.error(`[MeiliSearch] Failed to search`, error);
    return { hits: [], total: 0 };
  }
};


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
        throw new Error("Meilisearch not configured. Please check your .env file and ensure MEILISEARCH_HOST and MEILISEARCH_MASTER_KEY are set.");
    }
    try {
        return await index.getStats();
    } catch (error: any) {
        console.error("[MeiliSearch] Failed to get stats", error);
        
        let errorMessage = "Could not connect to Meilisearch to get stats.";
        if (error.code === 'index_not_found') {
             errorMessage = "The 'content' index doesn't exist yet. Please run a full re-index from the button below to create it.";
        } else if (error.code === 'meilisearch_communication_error') {
            errorMessage = "Could not communicate with the Meilisearch server. Please ensure your Docker container is running and that MEILISEARCH_HOST is set correctly (e.g., 'http://host.docker.internal:7700'). Remember to restart the dev server after changes.";
        }
        
        addLog('ERROR', 'Meilisearch connection failed', { 
            host: process.env.MEILISEARCH_HOST,
            originalError: (error as Error).message,
        });

        throw new Error(errorMessage);
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
        
        addLog('INFO', '[MeiliSearch] Updating index settings...');
        const settingsTask = await index.updateSettings({
            filterableAttributes: ['userId', 'zoneId', 'contentType', 'tags', 'domain'],
            sortableAttributes: ['createdAt'],
            searchableAttributes: ['title', 'description', 'tags', 'url', 'domain']
        });
        await client.waitForTask(settingsTask.taskUid);
        addLog('INFO', '[MeiliSearch] Index settings updated.');

        const contentSnapshot = await getDocs(collection(db, 'content'));
        const allItems = contentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContentItem));
        
        if (allItems.length === 0) {
            addLog('INFO', '[MeiliSearch] No content to index.');
            return { count: 0 };
        }

        const formattedItems = allItems.map(formatForIndex);
        
        // Batch the documents to avoid hitting payload limits
        const batchSize = 1000;
        for (let i = 0; i < formattedItems.length; i += batchSize) {
            const batch = formattedItems.slice(i, i + batchSize);
            const documentsTask = await index.addDocuments(batch, { primaryKey: 'id' });
            await client.waitForTask(documentsTask.taskUid);
            addLog('INFO', `[MeiliSearch] Indexed batch ${i / batchSize + 1}`);
        }
        
        addLog('INFO', `[MeiliSearch] Re-index complete. ${allItems.length} documents processed.`);
        return { count: allItems.length };
    } catch (error: any) {
        addLog('ERROR', '[MeiliSearch] Full re-index failed.', {
            error: error.message,
            code: error.code,
            type: error.type,
        });
        console.error("[MeiliSearch] Full re-index failed.", error);
        throw new Error(error.message || "An unknown error occurred during re-indexing.");
    }
};
