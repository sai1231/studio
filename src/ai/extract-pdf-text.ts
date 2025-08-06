'use server';

import { addLog } from '@/services/loggingService';
import { pipeline } from '@xenova/transformers';
import type { PDFData } from 'pdf-parse';

// Use a dynamic import that is more robust in different module environments.
const pdf = (buffer: Buffer, options: any): Promise<PDFData> => 
    import('pdf-parse').then(mod => mod.default(buffer, options));


/**
 * Fetches a PDF from a URL, extracts its text content, and generates a summary.
 * @param url The public URL of the PDF file.
 * @returns A string containing the generated summary, or null if an error occurs.
 */
export async function extractTextFromPdf(url: string): Promise<string | null> {
  try {
    await addLog('INFO', `[PDF Extractor] Fetching PDF from URL: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF. Status: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await addLog('INFO', `[PDF Extractor] PDF buffer downloaded, size: ${buffer.byteLength}. Parsing text...`);
    
    const options = { max: 2 }; // Limit parsing to the first 2 pages
    const data = await pdf(Buffer.from(buffer), options);

    if (!data || !data.text) {
      await addLog('WARN', '[PDF Extractor] pdf-parse did not return any text content.');
      return null;
    }

    const extractedText = data.text.trim();
    await addLog('INFO', `[PDF Extractor] Successfully extracted ${extractedText.length} characters from the first ${data.numpages} pages.`);

    // Initialize the summarization pipeline with BART large CNN model
    const summarizer = await pipeline('summarization', 'Xenova/long-t5-tglobal-base');

    // Generate the summary
    const result = await summarizer(extractedText, {
      max_length: 450,       // Target output length in tokens (~4–5 sentences)
      min_length: 220,        // Prevent ultra-short summaries
      no_repeat_ngram_size: 3,
      do_sample: false,      // Use beam search for coherence
      num_beams: 4,
      early_stopping: true
    });

    if (!result || !Array.isArray(result) || result.length === 0 || !result[0].summary_text) {
        await addLog('WARN', '[PDF Extractor] Summarization pipeline did not return a valid summary.');
        return null;
    }

    const summary = result[0].summary_text; 

    await addLog('INFO', `[PDF Extractor] Successfully generated summary of length ${summary.length}.`);

    const markdown = `## PDF Summary

${summary}`;
    return markdown;

  } catch (error: any) {
    await addLog('ERROR', `[PDF Extractor] Failed to process PDF at ${url}`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}
