'use server';

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a buffer to Firebase Storage.
 * This is intended for server-side use, e.g., in Genkit flows or other server components.
 * @param buffer The buffer to upload.
 * @param path The full path in storage where the file should be saved (e.g., 'display/userId/file.webp').
 * @param contentType The MIME type of the content (e.g., 'image/webp').
 * @returns The public download URL of the uploaded file.
 */
export async function uploadBufferToStorage(buffer: Buffer, path: string, contentType: string): Promise<string> {
  try {
    const storageRef = ref(storage, path);
    const metadata = { contentType };
    await uploadBytes(storageRef, buffer, metadata);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error: any) {
    console.error(`Failed to upload buffer to Storage at path ${path}:`, error);
    throw error;
  }
}
