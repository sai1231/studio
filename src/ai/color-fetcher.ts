// Install dependencies:
// npm install sharp extract-colors color-2-name

import sharp from 'sharp';
import { extractColors } from 'extract-colors';
import { closest } from 'color-2-name';
import { addLog } from '@/services/loggingService';

export interface NamedColor {
  hex: string;
  name: string;
}

/**
 * Extracts top colors from an image buffer and returns hex + CSS name.
 * @param buffer - image file buffer
 * @param contentId - identifier for logging
 */
export async function fetchImageColors(
  buffer: Buffer,
  contentId: string,
): Promise<NamedColor[]> {
  try {
    await addLog('INFO', `[${contentId}] Starting color extraction with sharp.`);

    // Decode image to raw RGBA
    const img = sharp(buffer)
      .raw()
      .ensureAlpha();
    const { data, info } = await img.toBuffer({ resolveWithObject: true });
    await addLog(
      'DEBUG',
      `[${contentId}] Image decoded: ${info.width}×${info.height}, ${info.channels} channels`
    );

    const uintData = new Uint8Array(data);

    // Extract dominant colors
    const colors = await extractColors(
      { data: uintData, width: info.width, height: info.height },
      {
        pixels: 64000,
        distance: 0.22,
        saturation: 0.2,
        lightness: 0.6,
        colors: 20,
      }
    );

    if (!colors.length) {
      await addLog('WARN', `[${contentId}] No colors found.`);
      return [];
    }

    // Sort by area and pick top 10
    const topColors = colors
      .filter(c => c.red !== null && c.green !== null && c.blue !== null)
      .sort((a, b) => b.area - a.area)
      .slice(0, 10);

    // Map to {hex, name}
    const namedColors: NamedColor[] = topColors.map(c => {
      const hex = c.hex;
      try {
        const colorInfo = closest(hex);
        return { hex, name: colorInfo.name };
      } catch (e) {
        // Fallback for colors that might not be in the list
        return { hex, name: 'unknown' };
      }
    });

    await addLog(
      'INFO',
      `[${contentId}] Extracted named colors: ${JSON.stringify(namedColors)}`
    );
    return namedColors;
  } catch (err: any) {
    console.error(err);
    await addLog(
      'ERROR',
      `[${contentId}] Color extraction failed: ${err.message}`
    );
    throw err;
  }
}
