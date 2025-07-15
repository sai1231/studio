import sharp from 'sharp';
import { extractColors } from 'extract-colors';
import convert from 'color-convert';
import colorNameList from 'color-name-list';
import { addLog } from '@/services/loggingService';

type ColorResult = {
  hex: string;
  keyword?: string;
  name: string;
};

export async function fetchImageColorsWithNames(buffer: Buffer, contentId: string): Promise<ColorResult[]> {
  await addLog('INFO', `[${contentId}] Starting named color extraction.`);

  const img = sharp(buffer).raw().ensureAlpha();
  const { data, info } = await img.toBuffer({ resolveWithObject: true });
  const uintData = new Uint8Array(data);

  const colors = await extractColors(
    { data: uintData, width: info.width, height: info.height },
    { pixels: 64000, distance: 0.22, saturation: 0.2, lightness: 0.6, colors: 10 }
  );

  const results: ColorResult[] = colors
    .filter(c => c.red !== null && c.green !== null && c.blue !== null)
    .sort((a, b) => b.area - a.area)
    .slice(0, 10)
    .map(c => {
      const hex = c.hex.toLowerCase();
      // 1️⃣ Try CSS keyword (basic)
      let keyword = convert.keyword(hex.replace('#', '')) ?? undefined;

      // 2️⃣ Fallback to nearest from large name list
      let name = keyword ?? (() => {
        const [r, g, b] = convert.hex.rgb(hex.replace('#', ''));
        let minDist = Infinity;
        let best: string = hex;

        for (const entry of colorNameList) {
          const [cr, cg, cb] = convert.hex.rgb(entry.hex.replace('#', ''));
          const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
          if (dist < minDist) {
            minDist = dist;
            best = entry.name;
          }
        }
        return best;
      })();

      return { hex, keyword, name };
    });

  await addLog('INFO', `[${contentId}] Named colors: ${JSON.stringify(results)}`);
  return results;
}
