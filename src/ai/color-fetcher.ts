
import { extractColors } from 'extract-colors';
import { addLog } from '@/services/loggingService';

export async function fetchImageColors(buffer: Buffer, contentId: string, mimeType: string): Promise<string[]> {
  try {
    await addLog('INFO', `[${contentId}] Attempting to extract colors from image buffer.`);

    const colors = await extractColors(buffer, {
      pixels: 64000, 
      distance: 0.22, 
      saturation: 0.2, 
      lightness: 0.6,
      colors: 10,
    });

    if (!colors || colors.length === 0) {
      await addLog('WARN', `[${contentId}] No colors extracted.`);
      return [];
    }

    const validColors = colors.filter(
      color => color.red !== null && color.green !== null && color.blue !== null
    );

    const sortedByArea = [...validColors].sort((a, b) => b.area - a.area);
    const top10HexCodes = sortedByArea.slice(0, 10).map(color => color.hex);
    
    await addLog('INFO', `[${contentId}] Extracted top 10 hex codes: ${JSON.stringify(top10HexCodes)}`);
    return top10HexCodes;

  } catch (error: any) {
    console.error(`Error extracting colors:`, error);
    await addLog('ERROR', `[${contentId}] Failed to extract colors: ${error.message}`);
    throw error;
  }
}
