
'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-ai';

export const ai = genkit({
    plugins: [
        googleAI(),
    ],
    enableTracing: true,
});
