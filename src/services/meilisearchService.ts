

'use server';

import MeiliSearch, { MeiliSearchCommunicationError, MeiliSearchApiError } from 'meilisearch';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import type { ContentItem, SearchFilters, Zone } from '@/types';
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

// Generic error handler for Meilisearch communication issues.
const handleMeiliError = (error: any, context: string): Error => {
    let errorMessage = `[MeiliSearch] An unknown error occurred during ${context}.`;
    
    if (error instanceof MeiliSearchCommunicationError) {
        errorMessage = `Could not communicate with the Meilisearch server during ${context}. Please ensure your Docker container is running and that MEILISEARCH_HOST is set correctly in your .env file (e.g., 'http://host.docker.internal:7700'). You may need to restart the dev server after changes.`;
    } else if (error instanceof MeiliSearchApiError && error.code === 'index_not_found') {
        errorMessage = `The 'content' index doesn't exist yet. Please run a full re-index from the System admin page to create it.`;
    } else if (error instanceof Error) {
        errorMessage = `[MeiliSearch] Error during ${context}: ${error.message}`;
    }
    
    addLog('ERROR', errorMessage, { 
        host: process.env.MEILISEARCH_HOST,
        originalError: error?.message,
        errorCode: error?.code,
    });
    console.error(errorMessage, error);
    
    return new Error(errorMessage);
};

// Store all fields needed to render a card to avoid a second DB fetch
const formatForIndex = async (item: ContentItem): Promise<any> => {
  let zoneNames: string[] = [];
  if (db && item.zoneIds && item.zoneIds.length > 0) {
    const zonePromises = item.zoneIds.map(zoneId => getDoc(doc(db, 'zones', zoneId)));
    const zoneDocs = await Promise.all(zonePromises);
    zoneNames = zoneDocs
      .filter(docSnap => docSnap.exists())
      .map(docSnap => (docSnap.data() as Zone).name);
  }

  return {
    id: item.id,
    userId: item.userId,
    type: item.type,
    title: item.title,
    description: item.description || '',
    url: item.url,
    imageUrl: item.imageUrl,
    faviconUrl: item.faviconUrl,
    tags: item.tags?.map(t => t.name) || [],
    zoneIds: item.zoneIds || [],
    zoneNames: zoneNames, // Add zone names to the document
    domain: item.domain,
    contentType: item.contentType,
    createdAt: new Date(item.createdAt).getTime(), // for sorting
    movieDetails: item.movieDetails,
  };
};

export const searchContent = async (
  userId: string,
  query: string,
  filters: SearchFilters = {},
  limit: number = 20,
  offset: number = 0
): Promise<{ hits: ContentItem[], total: number }> => {
  if (!index) throw new Error("Meilisearch not configured in meilisearchService.");
  
  try {
    const filterClauses = [`userId = "${userId}"`];
    if (filters.zoneId) {
      // Updated to search within the zoneIds array
      filterClauses.push(`zoneIds = "${filters.zoneId}"`);
    }
    if (filters.contentType) {
      filterClauses.push(`contentType = "${filters.contentType}"`);
    }
    if (filters.domain) {
      filterClauses.push(`domain = "${filters.domain}"`);
    }
    if (filters.tagNames && filters.tagNames.length > 0) {
      const tagFilters = filters.tagNames.map(tag => `tags = "${tag}"`);
      filterClauses.push(`(${tagFilters.join(' OR ')})`);
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
    throw handleMeiliError(error, 'search');
  }
};


export const addOrUpdateDocument = async (item: ContentItem) => {
  if (!index) return; // Silently fail if not configured
  try {
    const doc = await formatForIndex(item);
    await index.addDocuments([doc]);
    addLog('INFO', `[MeiliSearch] Indexed document ${item.id}`);
  } catch (error) {
    handleMeiliError(error, `indexing document ${item.id}`);
  }
};

export const deleteDocument = async (itemId: string) => {
  if (!index) return; // Silently fail if not configured
  try {
    await index.deleteDocument(itemId);
    addLog('INFO', `[MeiliSearch] Deleted document ${itemId}`);
  } catch (error) {
    handleMeiliError(error, `deleting document ${itemId}`);
  }
};

export const getIndexStats = async () => {
    if (!index) {
        throw new Error("Meilisearch not configured. Please check your .env file and ensure MEILISEARCH_HOST and MEILISEARCH_MASTER_KEY are set.");
    }
    try {
        return await index.getStats();
    } catch (error: any) {
        throw handleMeiliError(error, 'getting stats');
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
            filterableAttributes: ['userId', 'zoneIds', 'contentType', 'tags', 'domain'],
            sortableAttributes: ['createdAt'],
            searchableAttributes: ['title', 'description', 'tags', 'url', 'domain', 'zoneNames']
        });
        await client.waitForTask(settingsTask.taskUid);
        addLog('INFO', '[MeiliSearch] Index settings updated.');

        const contentSnapshot = await getDocs(collection(db, 'content'));
        const allItems = contentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContentItem));
        
        if (allItems.length === 0) {
            addLog('INFO', '[MeiliSearch] No content to index.');
            return { count: 0 };
        }

        const formattedItems = await Promise.all(allItems.map(formatForIndex));
        
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
        throw handleMeiliError(error, 'full re-index');
    }
};

    
