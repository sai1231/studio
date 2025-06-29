import { retext } from 'retext';
import retextPos from 'retext-pos';
import retextKeywords from 'retext-keywords';
import { toString } from 'nlcst-to-string';
import { addLog } from '@/services/loggingService';

interface Tag {
  id: string;
  name: string;
}

export async function extractTagsFromText(text: string): Promise<Tag[]> {
  if (!text || typeof text !== 'string') {
    return [];
 await addLog('INFO', 'Skipping tag extraction: input text is empty or not a string.');
  }

  try {
    const file = await retext()
      .use(retextPos)
      .use(retextKeywords)
      .process(text);

    const sortedKeywords = [...(file.data.keywords || [])]
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5);

    const sortedKeyphrases = [...(file.data.keyphrases || [])]
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5);

    const keywordTexts = sortedKeywords.map((kw: any) =>
      toString(kw.matches[0].node).toLowerCase()
    );

    const keyphraseTexts = sortedKeyphrases.map((ph: any) =>
      ph.matches[0].nodes.map((n: any) => toString(n)).join('').toLowerCase()
    );

    const allTags = [...keywordTexts, ...keyphraseTexts];
    const uniqueTags = [...new Set(allTags)];

    const formattedTags: Tag[] = uniqueTags.map((tag) => ({
      id: tag,
      name: tag,
    }));

 await addLog('INFO', `Successfully extracted tags: ${formattedTags.map(t => t.name).join(', ')}`);
    return formattedTags;

  } catch (error: any) {
 await addLog('ERROR', 'Error during tag extraction:', { error: error.message });
    // Depending on desired error handling, you might throw the error
    // throw error;
    return [];
  }
}