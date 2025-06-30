import { extractColors } from 'extract-colors';
import { addLog } from '@/services/loggingService';

export async function fetchImageColors(buffer: Buffer, contentId: string): Promise<string[]> {
  try {
    await addLog('INFO', `[${contentId}] Attempting to extract colors from image buffer.`);

    // Convert buffer to imageData format expected by extractColors
    const imageData = {
      data: new Uint8Array(buffer),
      width: 100,  // Adjust based on actual image dimensions
      height: 100, // Adjust based on actual image dimensions
    };

    // Extract colors (already sorted by dominance)
    const colors = await extractColors(imageData, {
      pixels: 64000,
      distance: 0.22,
    });

    if (!colors || colors.length === 0) {
      await addLog('WARN', `[${contentId}] No colors extracted.`);
      return [];
    }

    // Extract top 10 hex codes
    const top10HexCodes = colors.slice(0, 10).map(color => color.hex);
    
    await addLog('INFO', `[${contentId}] Extracted top 10 hex codes: ${JSON.stringify(top10HexCodes)}`);
    return top10HexCodes;
  } catch (error) {
    console.error(`Error extracting colors:`, error);
    await addLog('ERROR', `[${contentId}] Failed to extract colors: ${error.message}`);
    throw error;
  }
}