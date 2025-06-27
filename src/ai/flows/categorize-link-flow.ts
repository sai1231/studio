
'use server';
/**
 * @fileOverview A link categorization AI agent.
 *
 * - categorizeLink - A function that handles the link categorization process.
 * - CategorizeLinkInput - The input type for the categorizeLink function.
 * - CategorizeLinkOutput - The return type for the categorizeLink function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit/zod';

// These types are based on the available icons in the sidebar.
const supportedContentTypes = [
  'Post',
  'Reel',
  'Note',
  'Repositories',
  'Tweet',
  'Thread',
  'Article',
  'PDF',
] as const;

export const CategorizeLinkInputSchema = z.object({
  url: z.string().url().describe('The URL of the link to categorize.'),
});
export type CategorizeLinkInput = z.infer<typeof CategorizeLinkInputSchema>;

export const CategorizeLinkOutputSchema = z.object({
  contentType: z.enum(supportedContentTypes).describe('The determined content type.')
});
export type CategorizeLinkOutput = z.infer<typeof CategorizeLinkOutputSchema>;

export async function categorizeLink(input: CategorizeLinkInput): Promise<CategorizeLinkOutput> {
  return categorizeLinkFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeLinkPrompt',
  input: { schema: CategorizeLinkInputSchema },
  output: { schema: CategorizeLinkOutputSchema },
  prompt: `You are an expert content classifier. Your task is to analyze a URL and determine its content type.

  Analyze the provided URL: {{{url}}}

  Based on the URL's structure and domain, classify it into one of the supported categories.
  If you are unsure, default to 'Article'. For anything from 'x.com' or 'twitter.com', classify it as a 'Tweet'.
  `,
});

const categorizeLinkFlow = ai.defineFlow(
  {
    name: 'categorizeLinkFlow',
    inputSchema: CategorizeLinkInputSchema,
    outputSchema: CategorizeLinkOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      // Ensure output is not null, otherwise return a default
      return output || { contentType: 'Article' };
    } catch (e) {
      console.error("Error in categorizeLinkFlow, defaulting to 'Article'", e);
      return { contentType: 'Article' };
    }
  }
);
