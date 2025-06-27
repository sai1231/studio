
'use server';
/**
 * @fileOverview This AI flow has been temporarily disabled to allow for testing of the Python-based Cloud Function which handles the same 'pending-analysis' status.
 */
import {z} from 'genkit';
import {ai} from '@/ai/genkit';

// This function is intentionally left empty to prevent conflicts.
export async function enrichContent(contentId: string) {
    console.log(`enrichContent flow is currently disabled. Processing for ${contentId} will be handled by the Python Cloud Function.`);
}
