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
  if (!text || typeof text !== 'string') {
    await addLog('INFO', 'Skipping tag extraction: input text is empty or not a string.');
    return [];
  }

  try {
    const doc = nlp.readDoc(text);
    const tokens = doc.tokens().items();

    const phrases: string[] = [];
    let phraseTokens: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const pos = token.pos();
      const value = token.out();

      if ((pos === 'NOUN' || pos === 'PROPN') && /^[a-zA-Z]/.test(value)) {
        phraseTokens.push(value);
      } else if (phraseTokens.length > 0) {
        const raw = phraseTokens.join(' ');
        const lower = raw.toLowerCase();

        // ✨ Filter: skip if all words are stopwords or phrase is too short
        const words = lower.split(/\s+/);
        const validWords = words.filter(w => !stopwords.has(w) && w.length > 2);
        if (validWords.length > 0) {
          phrases.push(lower);
        }

        phraseTokens = [];
      }
    }

    // Final phrase (at end of loop)
    if (phraseTokens.length > 0) {
      const raw = phraseTokens.join(' ');
      const lower = raw.toLowerCase();
      const words = lower.split(/\s+/);
      const validWords = words.filter(w => !stopwords.has(w) && w.length > 2);
      if (validWords.length > 0) {
        phrases.push(lower);
      }
    }

    const uniqueTags = [...new Set(phrases)].slice(0, 10);

    const formattedTags: Tag[] = uniqueTags.map((tag) => ({
      id: tag,
      name: tag.replace(/\b\w/g, c => c.toUpperCase()), // Capitalize each word
    }));

    await addLog('INFO', `Extracted tags: ${formattedTags.map(t => t.name).join(', ')}`);
    return formattedTags;

  } catch (error: any) {
    await addLog('ERROR', 'Error during tag extraction:', { error: error.message });
    return [];
  }
}
