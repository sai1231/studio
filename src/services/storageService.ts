'use server';

import { getAdminStorage } from '@/lib/firebase-admin';
import { addLog } from '@/services/loggingService';

/**
 * Uploads a buffer to Firebase Storage using the Admin SDK, bypassing security rules.
 * This is intended for server-side use only.
 * @param buffer The buffer to upload.
 * @param path The full path in storage where the file should be saved (e.g., 'display/userId/file.webp').
 * @param contentType The MIME type of the content (e.g., 'image/webp').
 * @returns The public download URL of the uploaded file.
 */
export async function uploadBufferToStorage(buffer: Buffer, path: string, contentType: string): Promise<string> {
  try {
    addLog(`Attempting to upload buffer to Storage at path: ${path} with content type: ${contentType}`);
    const adminStorage = getAdminStorage();
    const bucket = adminStorage.bucket();
    const file = bucket.file(path);
    
    // Upload the buffer to the specified path in the bucket.
    await file.save(buffer, {
      metadata: {
        contentType: contentType,
        // Set a long cache control header for public images to improve performance.
        cacheControl: 'public, max-age=31536000',
      },
    });

    // Firebase Storage files are private by default, so we need to make them public to get a URL.
    await file.makePublic();
    
    // The publicUrl property gives us the direct https link to the file.
    const publicUrl = file.publicUrl();
    addLog(`Successfully uploaded buffer to Storage at path: ${path}. Public URL: ${publicUrl}`);
    return publicUrl;

  } catch (error: any) {
    addLog(`Admin SDK: Failed to upload buffer to Storage at path ${path}: ${error}`, 'error');
    // Re-throw the error so the calling function can handle it.
    throw error;
  }
}
