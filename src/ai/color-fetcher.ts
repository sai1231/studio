import { extractColors } from 'extract-colors';
import { addLog } from '@/services/loggingService';

export async function fetchImageColors(buffer: Buffer, contentId: string, mimeType: string): Promise<string[]> {
  try {
    await addLog('INFO', `[${contentId}] Attempting to extract colors from image buffer using 'extract-colors'.`);
    
    const options = {
      pixels: 20000, // Amount of pixels to resize the image to, default: 64000
      distance: 0.2, // Color distance, default: 0.22
      saturation: 0.2, // Saturation threshold, default: 0.2
      lightness: 0.2, // Lightness threshold, default: 0.2
    };

    const colors = await extractColors(buffer, options);

    if (!colors || colors.length === 0) {
      await addLog('WARN', `[${contentId}] No colors extracted.`);
      return [];
    }

    const hexColors = colors.map(color => color.hex);

    await addLog('INFO', `[${contentId}] Extracted hex codes: ${JSON.stringify(hexColors)}`);
    return hexColors;
  } catch (error: any) {
    console.error(`Error extracting colors:`, error);
    await addLog('ERROR', `[${contentId}] Failed to extract colors with 'extract-colors': ${error.message}`);
    throw error;
  }
}
