
'use server';

import { addLog } from '@/services/loggingService';

/**
 * Fetches a PDF from a URL and extracts its text content from the first two pages.
 * @param url The public URL of the PDF file.
 * @returns A string containing the extracted text, or null if an error occurs.
 */
export async function extractTextFromPdf(url: string): Promise<string | null> {
  const pdf = (await import('pdf-parse')).default;
  try {
    await addLog('INFO', `[PDF Extractor] Fetching PDF from URL: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF. Status: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    // Options object to limit parsing to the first 2 pages
    const options = {
      max: 2,
    };
    const data = await pdf(Buffer.from(buffer), options);

    if (!data || !data.text) {
      await addLog('WARN', '[PDF Extractor] pdf-parse did not return any text content.');
      return null;
    }
    
    const extractedText = data.text.trim();
    await addLog('INFO', `[PDF Extractor] Successfully extracted ${extractedText.length} characters from the first ${data.numpages} pages.`);
    
    // Create a simple summary by taking the first 500 characters.
    const summary = extractedText.length > 500
      ? extractedText.substring(0, 500) + '...'
      : extractedText;
      
    const markdown = `## PDF Summary\n\n${summary}`;
    return markdown;

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
