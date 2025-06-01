
'use server';
/**
 * @fileOverview Analyzes an image to extract any visible text.
 *
 * - analyzeImageContent - A function that handles the image text extraction process.
 * - AnalyzeImageContentInput - The input type for the analyzeImageContent function.
 * - AnalyzeImageContentOutput - The return type for the analyzeImageContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeImageContentInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of an image, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeImageContentInput = z.infer<typeof AnalyzeImageContentInputSchema>;

const AnalyzeImageContentOutputSchema = z.object({
  extractedText: z.string().describe('All text or code extracted from the image. If no text is found, return an empty string.'),
});
export type AnalyzeImageContentOutput = z.infer<typeof AnalyzeImageContentOutputSchema>;

export async function analyzeImageContent(input: AnalyzeImageContentInput): Promise<AnalyzeImageContentOutput> {
  return analyzeImageContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeImageContentPrompt',
  input: {schema: AnalyzeImageContentInputSchema},
  output: {schema: AnalyzeImageContentOutputSchema},
  prompt: `You are an expert image analyst. Your task is to extract all text and code visible in the provided image.
If no text is clearly discernible, return an empty string for the extractedText field.

Image: {{media url=imageDataUri}}`,
});

const analyzeImageContentFlow = ai.defineFlow(
  {
    name: 'analyzeImageContentFlow',
    inputSchema: AnalyzeImageContentInputSchema,
    outputSchema: AnalyzeImageContentOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      return output || { extractedText: '' };
    } catch (error) {
      console.error('Error in analyzeImageContentFlow (text extraction):', error);
      return { extractedText: '' };
    }
  }
);
