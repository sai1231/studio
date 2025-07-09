'use server';

import sharp from 'sharp';
import { addLog } from '@/services/loggingService';
import { uploadBufferToStorage } from '@/services/storageService';
import type { ContentItem } from '@/types';

/**
 * Compresses an image for a given content item.
 * Fetches the image, resizes and compresses it, and uploads the new version to storage.
 * @param content The content item containing the imageUrl to compress.
 * @returns The public URL of the newly compressed image, or null if compression fails.
 */
export async function compressAndStoreImage(content: ContentItem): Promise<string | null> {
    if (!content.imageUrl) {
        await addLog('WARN', `[${content.id}] No imageUrl provided for compression.`);
        return null;
    }

    await addLog('INFO', `[${content.id}] Attempting image compression.`);
    try {
        const imageResponse = await fetch(content.imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch original image for compression: ${imageResponse.statusText}`);
        }
        
        const originalBuffer = Buffer.from(await imageResponse.arrayBuffer());
        
        const compressedBuffer = await sharp(originalBuffer)
            .resize({ width: 1920, withoutEnlargement: true }) // Resize to max 1920px width, don't enlarge smaller images
            .webp({ quality: 80 }) // Compress to WEBP format with 80% quality
            .toBuffer();

        const newPath = `display/${content.userId}/${content.id}.webp`;
        const compressedImageUrl = await uploadBufferToStorage(compressedBuffer, newPath, 'image/webp');
        
        await addLog('INFO', `[${content.id}] ✅ Successfully compressed and stored new image.`, { newUrl: compressedImageUrl });
        return compressedImageUrl;

    } catch (e: any) {
        await addLog('ERROR', `[${content.id}] Image compression failed:`, { error: e.message });
        // Return null to indicate failure, allowing the flow to continue without a new image URL.
        return null;
    }
}
