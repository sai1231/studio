
'use server';
/**
 * @fileOverview Analyzes an image to extract dominant colors and any visible text.
 *
 * - analyzeImageContent - A function that handles the image analysis process.
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
  dominantColors: z.array(z.string()).describe('An array of dominant color hex codes or common color names extracted from the image. If no distinct colors are found, return an empty array.'),
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
  prompt: `You are an expert image analyst. Your task is to extract dominant colors (as an array of hex codes or common color names, e.g., ["#FF0000", "blue", "#0000FF"]) and all text/code visible in the provided image.
If no text is clearly discernible, return an empty string for the extractedText field.
If no distinct colors can be identified, return an empty array for the dominantColors field.

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
      return output || { dominantColors: [], extractedText: '' };
    } catch (error) {
      console.error('Error in analyzeImageContentFlow (color/text extraction):', error);
      // Return a default valid output structure in case of any error
      return { dominantColors: [], extractedText: '' };
    }
  }
);
