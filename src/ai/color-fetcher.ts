import { extractColors } from 'extract-colors';

/**
 * Extracts the 5 most dominant colors from an image buffer.
 * @param buffer The image data as a Buffer.
 * @returns A promise that resolves to an array of 5 RGB color arrays.
 */
export async function fetchImageColors(buffer: Buffer): Promise<number[][]> {
  try {
    // extractColors returns colors sorted by dominance
    const colors = await extractColors(buffer, {
        pixels: 64000, // default is 64000
        distance: 0.22, // default is 0.22
    });

    if (colors && colors.length > 0) {
      // The library returns colors sorted by dominance. We'll take the top 5.
      return colors.slice(0, 5).map(color => [color.red, color.green, color.blue]);
    }
    return [];
  } catch (error) {
    console.error(`Error extracting colors with 'extract-colors':`, error);
    // Re-throw so the calling flow can handle and log it appropriately
    throw error;
  }
}
