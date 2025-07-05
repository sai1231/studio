import winkNLPFactory from 'wink-nlp';
import model from 'wink-eng-lite-web-model'; // Full model (POS tagging supported)
import { addLog } from '@/services/loggingService';
import { eng } from 'stopword'; // Optional: for English stopword filtering

interface Tag {
  id: string;
  name: string;
}

const nlp = winkNLPFactory(model);

// Basic stopword set — use `eng` from 'stopword' package
const stopwords = new Set(eng);

export async function extractTagsFromText(text: string): Promise<Tag[]> {
  await addLog('INFO', 'Starting tag extraction...test');
  if (!text || typeof text !== 'string') {
    await addLog('INFO', '[Tag Extraction] Skipping tag extraction: input text is empty or not a string.');
    return [];
  }

  try {
    const doc = nlp.readDoc(text);
    // The .length() method is only on the result of doc.tokens(), not the doc itself
    const totalTokens = doc.tokens().length();
    const tokens = doc.tokens();
    await addLog('INFO', 'Tokens:', tokens.out());            // logs array of token strings

    await addLog('INFO', `Document read. Total tokens: ${totalTokens}`);
    await addLog('INFO', '[Tag Extraction] Type of tokens:', { type: typeof tokens });
    if (tokens && typeof tokens.length() !== 'undefined') {
      await addLog('INFO', '[Tag Extraction] Length of tokens:', { length: tokens.length() });
    }

    const phrases: string[] = [];
    let phraseTokens: string[] = [];

    if (tokens && typeof tokens.length() !== 'undefined' && tokens.length() > 0) {
      tokens.each((token: any) => {
        const pos = token.out(nlp.its.pos);
        const value = token.out();

        if ((pos === 'NOUN' || pos === 'PROPN') && /^[a-zA-Z]/.test(value)) {
          phraseTokens.push(value);
        } else if (phraseTokens.length > 0) {
          const raw = phraseTokens.join(' ');
          const lower = raw.toLowerCase();

          const words = lower.split(/\s+/);
          const validWords = words.filter(w => !stopwords.has(w) && w.length > 1);
          if (validWords.length > 0) {
            phrases.push(lower);
          }

          phraseTokens = [];
        }
      }); // End of tokens.each()
    }  else {
      await addLog('WARN', '[Tag Extraction] Tokens variable is not valid or empty, skipping loop.');
    }

    await addLog('INFO', `Initial extracted phrases count: ${phrases.length}`);
    // Final phrase (at end of loop)
    if (phraseTokens.length > 0) { // Check if there are remaining phraseTokens after the loop
      const raw = phraseTokens.join(' ');
      const lower = raw.toLowerCase();
      const words = lower.split(/\s+/);
      const validWords = words.filter(w => !stopwords.has(w) && w.length > 1); // Use length > 1 consistently
      if (validWords.length > 0) {
        phrases.push(lower);
      }
    }

    await addLog('INFO', `Phrases after final phrase check: ${phrases.length}`);
    const uniqueTags = [...new Set(phrases)].slice(0, 10);

    const formattedTags: Tag[] = uniqueTags.map((tag) => ({
      id: tag,
      name: tag.replace(/\b\w/g, c => c.toUpperCase()), // Capitalize each word
    }));

    await addLog('INFO', `[Tag Extraction] Extracted tags: ${formattedTags.map(t => t.name).join(', ')}`);
    return formattedTags;

  } catch (error: any) {
    await addLog('ERROR', 'Error during tag extraction:', { error: error.message });
    return [];
  }
}
