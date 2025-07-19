'use server';

import { enrichContent } from '@/ai/flows/enrich-content-flow';
import { updateContentItem } from '@/services/contentService';

/**
 * A server action to safely re-trigger the AI enrichment flow for a given content item.
 * @param contentId The ID of the content item to re-enrich.
 */
export async function reEnrichContentAction(contentId: string): Promise<void> {
  if (!contentId) {
    throw new Error('Content ID is required to re-enrich content.');
  }

  // First, reset the status to 'pending-analysis' so the flow will run.
  await updateContentItem(contentId, { status: 'pending-analysis' });

  // Trigger the enrichment flow. This runs in the background.
  await enrichContent(contentId);
}
