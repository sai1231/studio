'use server';

import { searchContent } from '@/services/meilisearchService';
import type { SearchFilters } from '@/types';

/**
 * A Server Action to perform a search query against Meilisearch.
 * This function is safe to call from the client because it runs on the server
 * and does not expose any sensitive credentials.
 * @param userId - The ID of the user performing the search.
 * @param query - The search query string.
 * @param filters - Optional filters for the search.
 * @returns A promise that resolves to an array of ContentItem objects.
 */
export async function performSearch(userId: string, query: string, filters: SearchFilters) {
  if (!userId) {
    throw new Error('User ID is required for search.');
  }
  return searchContent(userId, query, filters);
}
