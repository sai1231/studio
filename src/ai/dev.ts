import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-tags.ts';
import '@/ai/flows/analyze-sentiment.ts';
import '@/ai/flows/analyze-image-content.ts'; // Add new flow
