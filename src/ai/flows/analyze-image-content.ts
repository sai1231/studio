
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
  dominantColors: z.array(z.string()).describe('An array of dominant color names identified in the image (e.g., "blue", "green"). Provide up to 5 colors.'),
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
  prompt: `You are an expert image analyst. Analyze the provided image.
Identify the dominant colors present in the image. List them as an array of common color names (e.g., "blue", "red", "green", "black", "white", "yellow"). Provide up to 5 distinct colors.
Extract all text and code visible in the image. If no text is clearly discernible, return an empty string for the extractedText field.

Image: {{media url=imageDataUri}}`,
});

const analyzeImageContentFlow = ai.defineFlow(
  {
    name: 'analyzeImageContentFlow',
    inputSchema: AnalyzeImageContentInputSchema,
    outputSchema: AnalyzeImageContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Ensure output is not null, providing default empty values if necessary.
    return output || { dominantColors: [], extractedText: '' };
  }
);
