import winkNLP from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
import { addLog } from '@/services/loggingService';

interface Tag {
  id: string;
  name: string;
}

const nlp = winkNLP(model);

export async function extractTagsFromText(text: string): Promise<Tag[]> {
  if (!text || typeof text !== 'string') {
    await addLog('INFO', 'Skipping tag extraction: input text is empty or not a string.');
    return [];
  }

  try {
    const doc = nlp.read(text);

    // Extract tokens that are nouns or proper nouns, filter out very short words and stopwords
    const tags = doc.tokens()
      .filter(token =>
        (token.pos() === 'NOUN' || token.pos() === 'PROPN') &&
        !token.out().match(/^[^a-zA-Z]+$/) && // exclude symbols
        token.out().length > 2                // exclude very short words
      )
      .out('array')
      .map((t: string) => t.toLowerCase());

    const uniqueTags = [...new Set(tags)].slice(0, 10); // Limit to top 10 unique tags

    const formattedTags: Tag[] = uniqueTags.map((tag) => ({
      id: tag,
      name: tag,
    }));

    await addLog('INFO', `Successfully extracted tags: ${formattedTags.map(t => t.name).join(', ')}`);
    return formattedTags;

  } catch (error: any) {
    await addLog('ERROR', 'Error during tag extraction:', { error: error.message });
    return [];
  }
}
