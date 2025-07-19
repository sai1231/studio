
'use server';

import pdf from 'pdf-parse';
import { addLog } from '@/services/loggingService';

/**
 * Fetches a PDF from a URL and extracts its text content.
 * @param url The public URL of the PDF file.
 * @returns A string containing the extracted text, or null if an error occurs.
 */
export async function extractTextFromPdf(url: string): Promise<string | null> {
  try {
    await addLog('INFO', `[PDF Extractor] Fetching PDF from URL: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF. Status: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const data = await pdf(Buffer.from(buffer));

    if (!data || !data.text) {
      await addLog('WARN', '[PDF Extractor] pdf-parse did not return any text content.');
      return null;
    }
    
    await addLog('INFO', `[PDF Extractor] Successfully extracted ${data.text.length} characters.`);
    return data.text;

  } catch (error: any) {
    await addLog('ERROR', `[PDF Extractor] Failed to extract text from PDF at ${url}`, { 
      error: error.message,
      stack: error.stack 
    });
    // We re-throw the error so the calling flow knows that this step failed
    // and can mark the content item's status as 'failed-analysis'.
    throw error;
  }
}
