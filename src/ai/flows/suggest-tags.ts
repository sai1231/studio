// This file is intentionally left empty as AI functionality has been removed.
// // This file holds the Genkit flow for suggesting tags for a newly saved link using AI.

// 'use server';

// /**
//  * @fileOverview An AI agent to suggest relevant tags for a newly saved link.
//  *
//  * - suggestTags - A function that handles the tag suggestion process.
//  * - SuggestTagsInput - The input type for the suggestTags function.
//  * - SuggestTagsOutput - The return type for the suggestTags function.
//  */

// import {ai} from '@/ai/genkit';
// import {z} from 'genkit';

// const SuggestTagsInputSchema = z.object({
//   url: z.string().url().describe('The URL of the link to suggest tags for.'),
//   title: z.string().describe('The title of the link.'),
//   content: z.string().describe('The content of the link.'),
// });
// export type SuggestTagsInput = z.infer<typeof SuggestTagsInputSchema>;

// const SuggestTagsOutputSchema = z.object({
//   tags: z.array(z.string()).describe('An array of suggested tags for the link.'),
// });
// export type SuggestTagsOutput = z.infer<typeof SuggestTagsOutputSchema>;

// export async function suggestTags(input: SuggestTagsInput): Promise<SuggestTagsOutput> {
//   return suggestTagsFlow(input);
// }

// const prompt = ai.definePrompt({
//   name: 'suggestTagsPrompt',
//   input: {schema: SuggestTagsInputSchema},
//   output: {schema: SuggestTagsOutputSchema},
//   prompt: `You are a tagging expert, skilled at suggesting relevant tags for web links.

//   Based on the URL, title and content of the link, suggest a list of tags that would be helpful for categorizing and organizing the link.

//   URL: {{{url}}}
//   Title: {{{title}}}
//   Content: {{{content}}}

//   Tags:`, // Ensure the model knows what it is providing
// });

// const suggestTagsFlow = ai.defineFlow(
//   {
//     name: 'suggestTagsFlow',
//     inputSchema: SuggestTagsInputSchema,
//     outputSchema: SuggestTagsOutputSchema,
//   },
//   async input => {
//     const {output} = await prompt(input);
//     return output || { tags: [] }; // Provide a default if output is null
//   }
// );
