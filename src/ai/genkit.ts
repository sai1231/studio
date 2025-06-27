
'use server';
/**
 * @fileOverview Central Genkit AI configuration.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Configure Genkit with the Google AI plugin.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  logLevel: 'info', // Use 'debug' for more verbose logging
  enableTracingAndMetrics: true,
});
