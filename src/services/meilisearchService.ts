
import MeiliSearch from 'meilisearch';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { ContentItem } from '@/types';
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

const formatForIndex = (item: ContentItem) => ({
  id: item.id,
  title: item.title,
  description: item.description || '',
  tags: item.tags?.map(t => t.name) || [],
  domain: item.domain || '',
  contentType: item.contentType || '',
  zoneId: item.zoneId || '',
  createdAt: new Date(item.createdAt).getTime(),
  userId: item.userId,
});

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
