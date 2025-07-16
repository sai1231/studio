
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { ClassificationRule } from '@/types';

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

    for (const rule of rules) {
        try {
            const regex = new RegExp(rule.regex, 'i'); // Case-insensitive matching
            if (regex.test(url)) {
                return rule.contentType; // First matching rule wins
            }
        } catch (error) {
            console.error(`Invalid regex in rule for contentType "${rule.contentType}": ${rule.regex}`, error);
            // Skip this rule and continue
        }
    }

    return 'Article'; // Default if no rules match
}
