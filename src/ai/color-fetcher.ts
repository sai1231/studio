'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ColorPaletteInputSchema = z.object({
  imageUrl: z.string().describe('The public URL of the image to analyze.'),
});

const ColorPaletteOutputSchema = z.object({
  colors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color code'))
          .length(5, 'Must return exactly 5 colors.')
          .describe('An array of 5 dominant hex color codes from the image.'),
});

const colorPalettePrompt = ai.definePrompt({
  name: 'colorPalettePrompt',
  input: { schema: ColorPaletteInputSchema },
  output: { schema: ColorPaletteOutputSchema },
  prompt: `Analyze the following image and identify the 5 most dominant colors. Return them as an array of hex color codes.

Image: {{media url=imageUrl}}`,
});

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

export async function fetchImageColors(imageUrl: string): Promise<number[][]> {
  try {
    const { output } = await colorPalettePrompt({ imageUrl });
    if (output?.colors) {
      return output.colors.map(hexToRgb);
    }
    // Return an empty array or throw an error if no colors are found
    return [];
  } catch (error) {
    console.error(`Error fetching AI-generated color palette for ${imageUrl}:`, error);
    throw error; // Re-throw the error for the calling flow to handle
  }
}
