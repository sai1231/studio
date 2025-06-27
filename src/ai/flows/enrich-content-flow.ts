
'use server';
/**
 * @fileOverview An AI flow to enrich image content items with descriptions and tags.
 *
 * - enrichContent - A function that takes a content item ID, analyzes it if it's an image, and updates it.
 */
import {z} from 'genkit';
import {ai} from '@/ai/genkit';
import {getContentItemById, updateContentItem} from '@/services/contentService';
import type {ContentItem} from '@/types';

const EnrichInputSchema = z.object({
  contentId: z.string().describe('The ID of the content item to enrich.'),
});

const ImageEnrichmentSchema = z.object({
    description: z.string().describe('A detailed, one-paragraph description of the image.'),
    tags: z.array(z.string()).describe('An array of 3 to 5 relevant tags for the image.'),
});

export async function enrichContent(contentId: string) {
    // We don't need to return anything, this is a "fire and forget" background task
    enrichContentFlow({contentId});
}

const imageAnalysisPrompt = ai.definePrompt({
    name: 'imageAnalysisPrompt',
    input: { schema: z.object({ imageUrl: z.string() }) },
    output: { schema: ImageEnrichmentSchema },
    prompt: `You are an expert image analyst. Analyze the following image and generate a concise one-paragraph description and 3-5 relevant tags.
Image: {{media url=imageUrl}}`
});

const enrichContentFlow = ai.defineFlow(
    {
        name: 'enrichContentFlow',
        inputSchema: EnrichInputSchema,
        outputSchema: z.void(),
    },
    async (input) => {
        const {contentId} = input;
        console.log(`Starting enrichment for image item: ${contentId}`);

        const item = await getContentItemById(contentId);

        // Only process images that are pending analysis
        if (!item || item.type !== 'image' || !item.imageUrl || item.status !== 'pending-analysis') {
            console.warn(`Item ${contentId} is not a valid image pending analysis. Skipping.`);
            // If the item exists but was invalid, mark it as completed to avoid retries
            if (item && item.status === 'pending-analysis') {
                await updateContentItem(item.id, { status: 'completed' });
            }
            return;
        }

        try {
            const {output} = await imageAnalysisPrompt({imageUrl: item.imageUrl});

            if (output) {
                const newTags = output.tags.map(tag => ({id: tag.toLowerCase().replace(/\s+/g, '-'), name: tag}));
                
                const existingTagNames = new Set((item.tags || []).map(t => t.name.toLowerCase()));
                const combinedTags = [...(item.tags || [])];
                newTags.forEach(newTag => {
                    if (!existingTagNames.has(newTag.name.toLowerCase())) {
                        combinedTags.push(newTag);
                    }
                });

                const updates: Partial<ContentItem> = {
                    description: item.description ? `${item.description}\n\n${output.description}` : output.description, // Append to existing description if any
                    tags: combinedTags,
                    status: 'completed',
                };
                await updateContentItem(item.id, updates);
                console.log(`Successfully enriched image item: ${contentId}`);
            } else {
                 console.log(`Image enrichment for ${contentId} produced no output. Marking as complete.`);
                 await updateContentItem(item.id, { status: 'completed' });
            }
        } catch (e) {
            console.error(`Error enriching image item ${contentId}:`, e);
            // Mark as completed anyway to avoid retries
            await updateContentItem(item.id, { status: 'completed' });
        }
    }
);
