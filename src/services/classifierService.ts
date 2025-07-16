
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { ClassificationRule } from '@/types';
import { JSDOM } from 'jsdom';

const CLASSIFIER_DOC_PATH = 'settings/classifier';

/**
 * Fetches the classification rules from Firestore.
 * @returns An array of ClassificationRule objects.
 */
export async function getClassificationRules(): Promise<ClassificationRule[]> {
  if (!db) return [];
  const docRef = doc(db, CLASSIFIER_DOC_PATH);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists() && Array.isArray(docSnap.data().rules)) {
    // Sort by priority, highest first
    return docSnap.data().rules.sort((a: ClassificationRule, b: ClassificationRule) => b.priority - a.priority);
  }
  return [];
}

/**
 * Saves the entire array of classification rules to Firestore.
 * @param rules - The complete array of rules to save.
 */
export async function saveClassificationRules(rules: ClassificationRule[]): Promise<void> {
  if (!db) throw new Error("Firestore is not configured.");
  const docRef = doc(db, CLASSIFIER_DOC_PATH);
  await setDoc(docRef, { rules });
}


/**
 * The core classification engine.
 * Takes a URL and applies the stored rules to determine its content type.
 * @param url - The URL of the content to classify.
 * @returns The determined contentType string, or 'Article' as a default.
 */
export async function classifyUrl(url: string): Promise<string> {
    const rules = await getClassificationRules();
    if (rules.length === 0) {
        return 'Article'; // Default if no rules are configured
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            signal: AbortSignal.timeout(8000),
        });
        const html = await response.text();
        const dom = new JSDOM(html);
        const urlObj = new URL(url);

        for (const rule of rules) {
            const conditionsMet = rule.conditions.every(condition => {
                let subject = '';
                switch (condition.fact) {
                    case 'domain':
                        subject = urlObj.hostname;
                        break;
                    case 'path':
                        subject = urlObj.pathname;
                        break;
                    case 'full_url':
                        subject = url;
                        break;
                    case 'meta_tag_value':
                        const metaSelector = `meta[property="${condition.metaProperty}"], meta[name="${condition.metaProperty}"]`;
                        subject = dom.window.document.querySelector(metaSelector)?.getAttribute('content') || '';
                        break;
                }

                switch (condition.operator) {
                    case 'equals': return subject === condition.value;
                    case 'contains': return subject.includes(condition.value);
                    case 'startsWith': return subject.startsWith(condition.value);
                    case 'endsWith': return subject.endsWith(condition.value);
                    case 'matchesRegex': return new RegExp(condition.value).test(subject);
                    default: return false;
                }
            });

            if (conditionsMet) {
                return rule.contentType; // First matching rule wins
            }
        }

    } catch (error) {
        console.error(`Error during URL classification for ${url}:`, error);
        // Fallback to default if fetching or parsing fails
    }

    return 'Article'; // Default if no rules match
}
