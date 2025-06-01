
'use server';
/**
 * @fileOverview Analyzes the sentiment of the content behind a saved link.
 *
 * - analyzeLinkSentiment - A function that handles the link sentiment analysis process.
 * - AnalyzeLinkSentimentInput - The input type for the analyzeLinkSentiment function.
 * - AnalyzeLinkSentimentOutput - The return type for the analyzeLinkSentiment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeLinkSentimentInputSchema = z.object({
  url: z.string().url().describe('The URL of the link to analyze.'),
  content: z.string().describe('The content of the link.'),
});
export type AnalyzeLinkSentimentInput = z.infer<typeof AnalyzeLinkSentimentInputSchema>;

const AnalyzeLinkSentimentOutputSchema = z.object({
  sentiment: z.string().describe('The sentiment of the content (e.g., positive, negative, neutral).'),
  score: z.number().describe('A numerical score representing the sentiment strength (e.g., -1 to 1).'),
});
export type AnalyzeLinkSentimentOutput = z.infer<typeof AnalyzeLinkSentimentOutputSchema>;

export async function analyzeLinkSentiment(input: AnalyzeLinkSentimentInput): Promise<AnalyzeLinkSentimentOutput> {
  return analyzeLinkSentimentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeLinkSentimentPrompt',
  input: {schema: AnalyzeLinkSentimentInputSchema},
  output: {schema: AnalyzeLinkSentimentOutputSchema},
  prompt: `Analyze the sentiment of the following content from the URL: {{{url}}}.\n\nContent: {{{content}}}\n\nDetermine the overall sentiment (positive, negative, or neutral) and provide a sentiment score between -1 (very negative) and 1 (very positive).  Return the sentiment and score in JSON format.\n`,
});

const analyzeLinkSentimentFlow = ai.defineFlow(
  {
    name: 'analyzeLinkSentimentFlow',
    inputSchema: AnalyzeLinkSentimentInputSchema,
    outputSchema: AnalyzeLinkSentimentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output || { sentiment: 'neutral', score: 0 }; // Provide a default if output is null
  }
);

