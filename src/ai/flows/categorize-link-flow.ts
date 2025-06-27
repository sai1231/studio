'use server';
/**
 * @fileOverview An AI flow to categorize a link based on its URL and title.
 *
 * - categorizeLink - A function that suggests a content type for a given link.
 * - CategorizeLinkInput - The input type for the categorizeLink function.
 * - CategorizeLinkOutput - The return type for the categorizeLink function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  'Other', // Fallback
];

export const CategorizeLinkInputSchema = z.object({
  url: z.string().describe('The URL of the link to categorize.'),
  title: z.string().describe('The title of the link.'),
});
export type CategorizeLinkInput = z.infer<typeof CategorizeLinkInputSchema>;

export const CategorizeLinkOutputSchema = z.object({
  contentType: z.enum(supportedContentTypes).describe('The suggested content type for the link.'),
});
export type CategorizeLinkOutput = z.infer<typeof CategorizeLinkOutputSchema>;

export async function categorizeLink(input: CategorizeLinkInput): Promise<CategorizeLinkOutput> {
  return categorizeLinkFlow(input);
}

const categorizeLinkPrompt = ai.definePrompt({
  name: 'categorizeLinkPrompt',
  input: {schema: CategorizeLinkInputSchema},
  output: {schema: CategorizeLinkOutputSchema},
  prompt: `You are a content categorization expert. Based on the provided URL and title, determine the most appropriate content type from the following list: ${supportedContentTypes.join(
    ', '
  )}.

If the URL is from twitter.com or x.com, it is a 'Tweet' or 'Thread'.
If it is from a code hosting site like github.com, gitlab.com, or bitbucket.org, it is 'Repositories'.
If it is a long-form article from a blog or news site, it is an 'Article'.
If it is a short video from Instagram, TikTok, or YouTube Shorts, it is a 'Reel'.
If the URL ends in .pdf, it is a 'PDF'.
For anything else that doesn't fit, use 'Other'.

URL: {{{url}}}
Title: {{{title}}}
`,
});

const categorizeLinkFlow = ai.defineFlow(
  {
    name: 'categorizeLinkFlow',
    inputSchema: CategorizeLinkInputSchema,
    outputSchema: CategorizeLinkOutputSchema,
  },
  async (input) => {
    const {output} = await categorizeLinkPrompt(input);
    return output!;
  }
);
