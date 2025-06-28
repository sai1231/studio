'use server';
/**
 * @fileOverview A flow for enriching content after it has been created.
 *
 * - enrichContent - A function that takes a content ID, fetches the content,
 *   and updates its status to 'completed'. This simulates a background job.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const contentCollectionRef = collection(db, 'content');

const EnrichContentInputSchema = z.string().describe("The ID of the content item to enrich.");
export type EnrichContentInput = z.infer<typeof EnrichContentInputSchema>;

export async function enrichContent(contentId: EnrichContentInput): Promise<void> {
  await enrichContentFlow(contentId);
}

const enrichContentFlow = ai.defineFlow(
  {
    name: 'enrichContentFlow',
    inputSchema: EnrichContentInputSchema,
    outputSchema: z.void(),
  },
  async (contentId) => {
    console.log(`Starting enrichment for content ID: ${contentId}`);

    const docRef = doc(contentCollectionRef, contentId);
    
    try {
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.error(`Enrichment failed: Document with ID ${contentId} does not exist.`);
        return;
      }
      
      const contentData = docSnap.data();
      if (contentData.status === 'pending-analysis') {
        // For now, we just update the status.
        // Later, this is where actual AI enrichment would happen.
        await updateDoc(docRef, {
          status: 'completed'
        });
        console.log(`Successfully enriched content ID: ${contentId}, status updated to 'completed'.`);
      } else {
         console.log(`Skipping enrichment for content ID: ${contentId}, status is not 'pending-analysis'.`);
      }

    } catch (error) {
      console.error(`Error during enrichment for content ID ${contentId}:`, error);
      // Optionally update status to 'failed-analysis'
      await updateDoc(docRef, {
        status: 'failed-analysis'
      }).catch(e => console.error(`Failed to update status to failed-analysis for ${contentId}`, e));
    }
  }
);
