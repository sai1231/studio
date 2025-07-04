import nlp from 'wink-nlp';
import model from 'wink-eng-lite-web-model';

const nlpInstance = nlp(model);

export function generateTitle(text: string): string {
  const doc = nlpInstance.readDoc(text);

  const nouns = doc.tokens().filter(t => t.out(nlpInstance.its.pos) === 'NOUN').out(nlpInstance.its.value);
  const adjectives = doc.tokens().filter(t => t.out(nlpInstance.its.pos) === 'ADJ').out(nlpInstance.its.value);

  const keywords = Array.from(new Set([...nouns, ...adjectives]));

  const selectedKeywords = keywords.slice(0, 4);

  const title = selectedKeywords.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return title;
}