
'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-ai';
import { firebase } from '@genkit-ai/firebase';

export const ai = genkit({
    plugins: [
        googleAI(),
        firebase(), // Allows flows to work with Firebase auth context
    ],
    enableTracing: true,
});
