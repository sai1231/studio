import { extractColors } from 'extract-colors';
import { addLog } from '@/services/loggingService';

export async function fetchImageColors(buffer: Buffer, contentId: string, mimeType: string): Promise<string[]> {
  try {
    await addLog('INFO', `[${contentId}] Attempting to extract colors from image buffer with extract-colors.`);
    
    // The options object is now the second argument.
    // We can specify the number of colors to extract.
    const colors = await extractColors(buffer, {
      distance: 0.22, // Lower value means more colors, default is 0.22
      saturation: 0.2, // Lower value means more colors, default is 0.2
      lightness: 0.6, // Lower value means more colors, default is 0.6
      colors: 10, // Max number of colors to return
    });

    if (!colors || colors.length === 0) {
      await addLog('WARN', `[${contentId}] No colors extracted.`);
      return [];
    }
    
    const hexColors: string[] = colors.map(color => color.hex);

    await addLog('INFO', `[${contentId}] Extracted hex codes: ${JSON.stringify(hexColors)}`);
    return hexColors;

  } catch (error: any) {
    console.error(`Error extracting colors with extract-colors:`, error);
    await addLog('ERROR', `[${contentId}] Failed to extract colors with extract-colors: ${error.message}`);
    return [];
  }
}
