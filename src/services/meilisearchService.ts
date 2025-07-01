
'use server';

import { MeiliSearch } from 'meilisearch';
import type { ContentItem, SearchFilters } from '@/types';
import { addLog } from './loggingService';
import { getContentItems } from './contentService';

const host = process.env.MEILISEARCH_HOST;
const apiKey = process.env.MEILISEARCH_MASTER_KEY;

const indexName = 'content';

let client: MeiliSearch;
let isMeiliConfigured = false;

if (host && apiKey) {
  try {
    client = new MeiliSearch({ host, apiKey });
    isMeiliConfigured = true;
  } catch (error) {
    console.error("Meilisearch client initialization failed:", error);
    addLog('ERROR', 'Meilisearch client initialization failed', { error: (error as Error).message });
  }
} else {
  console.warn("Meilisearch environment variables (MEILISEARCH_HOST, MEILISEARCH_MASTER_KEY) are not set. Search functionality will be disabled.");
}

async function initializeIndex() {
  if (!isMeiliConfigured) return;
  try {
    const index = await client.getIndex(indexName).catch(() => null);
    if (!index) {
        await client.createIndex(indexName, { primaryKey: 'id' });
        await addLog('INFO', `[Meili] Index '${indexName}' created.`);
    }

    const indexToUpdate = client.index(indexName);
    await indexToUpdate.updateSettings({
      searchableAttributes: [
        'title',
        'description',
        'tags.name',
        'mindNote',
        'contentType',
        'domain',
        'movieDetails.director',
        'movieDetails.cast',
        'movieDetails.genres',
      ],
      filterableAttributes: ['userId', 'zoneId', 'contentType', 'type', 'tags.name', 'domain'],
      sortableAttributes: ['createdAt'],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
        'createdAt:desc',
      ],
      facetting: {
        maxValuesPerFacet: 100,
      }
    });
    await addLog('INFO', `[Meili] Index '${indexName}' configured successfully.`);
  } catch (error) {
    await addLog('ERROR', `[Meili] Failed to initialize index '${indexName}'`, { error: (error as Error).message });
    console.error(`[Meili] Failed to initialize index '${indexName}':`, error)
  }
}

if (isMeiliConfigured) {
  initializeIndex();
}

export async function syncItemWithMeili(item: ContentItem): Promise<void> {
  if (!isMeiliConfigured) return;
  
  const documentToIndex = {
    ...item,
    'tags.name': item.tags.map(t => t.name),
  };

  try {
    const index = client.index(indexName);
    await index.addDocuments([documentToIndex], { primaryKey: 'id' });
  } catch (error) {
    await addLog('ERROR', `[Meili] Failed to sync item ${item.id}`, { error: (error as Error).message, item });
    console.error(`[Meili] Failed to sync item ${item.id}:`, error);
  }
}

export async function deleteItemFromMeili(itemId: string): Promise<void> {
  if (!isMeiliConfigured) return;
  try {
    const index = client.index(indexName);
    await index.deleteDocument(itemId);
  } catch (error) {
    await addLog('ERROR', `[Meili] Failed to delete item ${itemId}`, { error: (error as Error).message });
    console.error(`[Meili] Failed to delete item ${itemId}:`, error);
  }
}

export async function searchMeili(
  userId: string,
  searchQuery: string,
  filters: SearchFilters = {},
  limit: number = 20,
  offset: number = 0,
): Promise<{ hits: ContentItem[], estimatedTotalHits: number, facetDistribution?: Record<string, Record<string, number>> }> {
  if (!isMeiliConfigured) return { hits: [], estimatedTotalHits: 0 };
  
  const searchId = `meili-search-${Date.now()}`;
  await addLog('INFO', `[${searchId}] Meilisearch search initiated for user ${userId}`, { searchQuery, filters, limit, offset });
  
  try {
    const index = client.index(indexName);
    const filterClauses = [`userId = '${userId}'`];

    if (filters?.zoneId) filterClauses.push(`zoneId = '${filters.zoneId}'`);
    if (filters?.contentType) filterClauses.push(`contentType = '${filters.contentType}'`);
    if (filters?.tagNames && filters.tagNames.length > 0) {
      filters.tagNames.forEach(tagName => {
        filterClauses.push(`'${tagName}' IN tags.name`);
      });
    }

    const searchResult = await index.search(searchQuery, {
      limit,
      offset,
      filter: filterClauses.join(' AND '),
      sort: ['createdAt:desc'],
      facets: ['contentType', 'tags.name'],
    });

    await addLog('INFO', `[${searchId}] Meilisearch returned ${searchResult.hits.length} hits`, { total: searchResult.estimatedTotalHits });

    return {
      hits: searchResult.hits as ContentItem[],
      estimatedTotalHits: searchResult.estimatedTotalHits,
      facetDistribution: searchResult.facetDistribution
    };
  } catch (error) {
    await addLog('ERROR', `[${searchId}] Meilisearch search failed`, { error: (error as Error).message });
    console.error(`[${searchId}] Meilisearch search failed:`, error);
    return { hits: [], estimatedTotalHits: 0 };
  }
}

export async function resyncAllData(userId: string): Promise<{ count: number }> {
  if (!isMeiliConfigured) {
    await addLog('WARN', '[Meili] Resync called but Meilisearch is not configured.');
    return { count: 0 };
  }

  await addLog('INFO', `[Meili] Starting full data resync for user: ${userId}`);
  try {
    const allItems = await getContentItems(userId);
    if (allItems.length === 0) {
      await addLog('INFO', `[Meili] No items found for user ${userId} to sync.`);
      return { count: 0 };
    }

    const documentsToIndex = allItems.map(item => ({
      ...item,
      'tags.name': item.tags.map(t => t.name), // Ensure tags are flattened for filtering
    }));
    
    const index = client.index(indexName);
    const task = await index.addDocuments(documentsToIndex, { primaryKey: 'id' });

    await addLog('INFO', `[Meili] Submitted ${allItems.length} documents for indexing. Task ID: ${task.taskUid}`);
    
    return { count: allItems.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await addLog('ERROR', `[Meili] Full data resync failed for user ${userId}`, { error: errorMessage });
    console.error(`[Meili] Full data resync failed for user ${userId}:`, error);
    throw error;
  }
}
