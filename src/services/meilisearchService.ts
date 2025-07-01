'use server';

import { MeiliSearch } from 'meilisearch';
import type { ContentItem, SearchFilters } from '@/types';
import { addLog } from './loggingService';

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
    // Check if the index exists. If it does, update settings. If not, create it.
    const index = await client.getIndex(indexName).catch(() => null);
    if (!index) {
        await client.createIndex(indexName, { primaryKey: 'id' });
        await addLog('INFO', `Meilisearch index '${indexName}' created.`);
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
    });
    await addLog('INFO', `Meilisearch index '${indexName}' configured successfully.`);
  } catch (error) {
    await addLog('ERROR', `Failed to initialize Meilisearch index '${indexName}'`, { error: (error as Error).message });
    console.error(`Failed to initialize Meilisearch index '${indexName}':`, error)
  }
}

// Call this once on startup
if (isMeiliConfigured) {
  initializeIndex();
}

export async function syncItemWithMeili(item: ContentItem): Promise<void> {
  if (!isMeiliConfigured) return;
  
  // Meilisearch expects flat objects for filtering/sorting on nested fields.
  const documentToIndex = {
    ...item,
    'tags.name': item.tags.map(t => t.name),
  };

  try {
    const index = client.index(indexName);
    await index.addDocuments([documentToIndex], { primaryKey: 'id' });
    await addLog('INFO', `[Meili] Synced item ${item.id}`);
  } catch (error) {
    await addLog('ERROR', `[Meili] Failed to sync item ${item.id}`, { error: (error as Error).message });
    console.error(`[Meili] Failed to sync item ${item.id}:`, error);
  }
}

export async function deleteItemFromMeili(itemId: string): Promise<void> {
  if (!isMeiliConfigured) return;
  try {
    const index = client.index(indexName);
    await index.deleteDocument(itemId);
    await addLog('INFO', `[Meili] Deleted item ${itemId}`);
  } catch (error) {
    await addLog('ERROR', `[Meili] Failed to delete item ${itemId}`, { error: (error as Error).message });
    console.error(`[Meili] Failed to delete item ${itemId}:`, error);
  }
}

export async function searchMeili(
  userId: string,
  searchQuery: string,
  filters?: SearchFilters,
  limit: number = 20,
  offset: number = 0,
): Promise<{ hits: ContentItem[], estimatedTotalHits: number }> {
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
        filterClauses.push(`tags.name = '${tagName}'`);
      });
    }

    const searchResult = await index.search(searchQuery, {
      limit,
      offset,
      filter: filterClauses.join(' AND '),
      sort: ['createdAt:desc'],
    });

    await addLog('INFO', `[${searchId}] Meilisearch returned ${searchResult.hits.length} hits`, { total: searchResult.estimatedTotalHits });

    return {
      hits: searchResult.hits as ContentItem[],
      estimatedTotalHits: searchResult.estimatedTotalHits,
    };
  } catch (error) {
    await addLog('ERROR', `[${searchId}] Meilisearch search failed`, { error: (error as Error).message });
    console.error(`[${searchId}] Meilisearch search failed:`, error);
    return { hits: [], estimatedTotalHits: 0 };
  }
}