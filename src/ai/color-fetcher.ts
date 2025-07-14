import { extractColors } from 'extract-colors';
import { addLog } from '@/services/loggingService';

export async function fetchImageColors(buffer: Buffer, contentId: string): Promise<string[]> {
  try {
    await addLog('INFO', `[${contentId}] Attempting to extract colors from image buffer.`);


    const imageData = {
      data: new Uint8Array(buffer),
      width: 100,  // Replace with actual dimensions if known
      height: 100,
    };


    // Extract colors (already sorted by dominance)
    const colors = await extractColors(imageData, {
      pixels: 64000,
      distance: 0.22, // Lower value means more colors, default is 0.22
      saturation: 0.2, // Lower value means more colors, default is 0.2
      lightness: 0.6, // Lower value means more colors, default is 0.6
      colors: 2, // Max number of colors to return

    });

    if (!colors || colors.length === 0) {
      await addLog('WARN', `[${contentId}] No colors extracted.`);
      return [];
    }

    // 1. Filter out invalid colors (e.g., where red/green/blue is null)
    const validColors = colors.filter(
      color => color.red !== null && color.green !== null && color.blue !== null
    );

    // 2. Sort by area (descending)
    const sortedByArea = [...validColors].sort((a, b) => b.area - a.area);

    // 3. Extract top 10 hex codes
    const top10HexCodes = sortedByArea.slice(0, 10).map(color => color.hex);

    await addLog('INFO', `[${contentId}] Extracted top 10 hex codes: ${JSON.stringify(top10HexCodes)}`);
    return top10HexCodes;
  } catch (error: any) {
    console.error(`Error extracting colors:`, error);
    await addLog('ERROR', `[${contentId}] Failed to extract colors: ${error.message}`);
    throw error;
  }
}