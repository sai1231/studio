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

export async function fetchImageColors(
  buffer: Buffer,
  contentId: string
): Promise<NamedColor[]> {
  try {
    await addLog('INFO', `[${contentId}] Starting color extraction with sharp.`);

    const img = sharp(buffer).raw().ensureAlpha();
    const { data, info } = await img.toBuffer({ resolveWithObject: true });
    await addLog(
      'DEBUG',
      `[${contentId}] Decoded image – width: ${info.width}, height: ${info.height}, channels: ${info.channels}`
    );

    const uintData = new Uint8Array(data);

    const colors = await extractColors(
      { data: uintData, width: info.width, height: info.height },
      {
        pixels: 64000,
        distance: 0.22,
        saturation: 0.2,
        lightness: 0.6,
        colors: 10,
      }
    );

    if (!colors.length) {
      await addLog('WARN', `[${contentId}] No colors found.`);
      return [];
    }

    const top = colors
      .filter(c => c.red !== null && c.green !== null && c.blue !== null)
      .sort((a, b) => b.area - a.area)
      .slice(0, 10);

    const namedColors: NamedColor[] = top.map(c => {
      const hex = c.hex;
      const info = closest(hex, undefined, { info: true });
      return { hex, name: info.name };
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
