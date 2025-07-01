
'use server';

/**
 * @fileOverview A flow for enriching content after it has been created.
 *
 * - enrichContent - A function that takes a content ID, fetches the content,
 *   and updates its status to 'completed'. This simulates a background job.
 */
import { ai } from '@/ai/genkit';
import { generateCaptionFromImage } from '@/ai/moondream';
import { fetchImageColors } from '@/ai/color-fetcher';
import { extractTagsFromText } from '@/ai/tag-extraction';
import { z } from 'zod';
import { collection, doc, getDoc, updateDoc, type Firestore, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Keep using client 'db' for consistency here
import { addLog } from '@/services/loggingService';
import { syncItemWithMeili } from '@/services/meilisearchService';
import type { ContentItem } from '@/types';

const contentCollectionRef = collection(db, 'content');

const EnrichContentInputSchema = z.string().describe("The ID of the content item to enrich.");
export type EnrichContentInput = z.infer<typeof EnrichContentInputSchema>;

export async function enrichContent(contentId: EnrichContentInput): Promise<void> {
  await enrichContentFlow(contentId);
}

const enrichContentFlow = ai.defineFlow(
  {
    name: 'enrichContentFlow',
    inputSchema: EnrichContentInputSchema,
    outputSchema: z.void(),
  },
  async (contentId) => {

    const docRef = doc(contentCollectionRef, contentId);

    try {
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await addLog('WARN', `[${contentId}] Document does not exist, skipping enrichment.`);
        return;
      }

      const contentData = docSnap.data();

      if (contentData.status === 'pending-analysis') {
        let enrichmentFailed = false;
        let updatePayload: { [key: string]: any } = { status: 'completed' };

        // Check if the item is an IMDb link to enrich with movie data
        if (contentData.type === 'link' && contentData.url && contentData.url.includes('imdb.com/title/') && process.env.NEXT_PUBLIC_TMDB_API_KEY) {
          const imdbId = contentData.url.split('/title/')[1].split('/')[0];
          if (imdbId) {
            try {
              await addLog('INFO', `[${contentId}] 🎬 Found IMDb link, fetching details...`);
              const tmdbResponse = await fetch(`https://api.themoviedb.org/3/find/${imdbId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&external_source=imdb_id`);
              const tmdbFindData = await tmdbResponse.json();

              if (tmdbFindData.movie_results && tmdbFindData.movie_results.length > 0) {
                const movieId = tmdbFindData.movie_results[0].id;
                const movieDetailResponse = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&append_to_response=credits`);
                const movieData = await movieDetailResponse.json();

                updatePayload = {
                  ...updatePayload,
                  type: 'movie',
                  contentType: 'Movie',
                  title: movieData.title || contentData.title,
                  imageUrl: movieData.poster_path ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}` : contentData.imageUrl,
                  description: movieData.overview || contentData.description,
                  movieDetails: {
                    posterPath: movieData.poster_path,
                    releaseYear: movieData.release_date?.split('-')[0],
                    rating: movieData.vote_average ? parseFloat(movieData.vote_average.toFixed(1)) : undefined,
                    director: movieData.credits?.crew?.find((c: any) => c.job === 'Director')?.name,
                    cast: movieData.credits?.cast?.slice(0, 5).map((c: any) => c.name) || [],
                    genres: movieData.genres?.map((g: any) => g.name) || [],
                  },
                };
                await addLog('INFO', `[${contentId}] 🎬✅ Successfully processed movie data.`);
              } else {
                await addLog('WARN', `[${contentId}] 🎬⚠️ No movie results found on TMDb for IMDb ID ${imdbId}.`);
              }
            } catch (e: any) {
              enrichmentFailed = true;
              await addLog('ERROR', `[${contentId}] 🎬❌ Error fetching movie details from TMDb:`, { error: e.message });
            }
          }
        }

        // Check if the item is an image to enrich with a caption
        if ((contentData.type === 'image' || contentData.type === 'link') && contentData.imageUrl) {
          await addLog('INFO', `[${contentId}] 🖼️ Image found. Generating caption...`);
          try {
            const caption = await generateCaptionFromImage(contentData.imageUrl);

            if (caption) {
              updatePayload.description = (contentData.description || '') + (contentData.description ? '\\n' : '') + caption;
              await addLog('INFO', `[${contentId}] 🖼️✅ Successfully generated caption.`, { caption });
            } else {
              await addLog('WARN', `[${contentId}] 🖼️⚠️ Moondream returned no caption.`);
            }

          } catch (e: any) {
            enrichmentFailed = true;
            await addLog('WARN', `[${contentId}] 🖼️❌ Error generating caption:`, { error: e.message });
          }
        }
        
        // Fetch and save image colors
        if ((contentData.type === 'image' || contentData.type === 'link') && contentData.imageUrl && contentData.contentType !== 'PDF') {
            await addLog('INFO', `[${contentId}] 🖼️ Image found. Starting color analysis...`);
            try {
                const imageResponse = await fetch(contentData.imageUrl);
                if (!imageResponse.ok) {
                    throw new Error(`Failed to fetch image for analysis: ${imageResponse.statusText}`);
                }
                const arrayBuffer = await imageResponse.arrayBuffer();
                const imageBuffer = Buffer.from(arrayBuffer);

                const colors = await fetchImageColors(imageBuffer, contentId);
                if (colors && colors.length > 0) {
                    updatePayload.colorPalette = colors;
                    await addLog('INFO', `[${contentId}] 🎨✅ Successfully fetched color palette.`);
                } else {
                    await addLog('WARN', `[${contentId}] 🎨⚠️ No color palette extracted.`);
                }
            } catch (e: any) {
                await addLog('WARN', `[${contentId}] 🎨❌ Error analyzing image colors:`, { error: e.message });
            }
        }
        
        if (contentData.imageUrl && !updatePayload.imageDimensions) {
            try {
                const imageResponse = await fetch(contentData.imageUrl);
                if (imageResponse.ok) {
                    const buffer = await imageResponse.arrayBuffer();
                    // This is a placeholder for a real image size calculation library
                    // For now, we will assume we can't get dimensions server-side easily
                    // and rely on client-side aspect ratio.
                }
            } catch(e) {
                 await addLog('WARN', `[${contentId}] Could not get image dimensions:`, { error: (e as Error).message });
            }
        }

      // Keyword and Key Phrase Extraction
      const descriptionToAnalyze = updatePayload.description || contentData.description;

      if (descriptionToAnalyze && typeof descriptionToAnalyze === 'string') {
        await addLog('INFO', `[${contentId}] 📝 Extracting keywords and key phrases...`);

        try {
          const formattedTags = await extractTagsFromText(descriptionToAnalyze);

          if (formattedTags.length > 0) {

            // Get existing tags from contentData, default to empty array if none
            const existingTags = contentData.tags || [];

            // Combine existing and new tags
            const combinedTags = [...existingTags, ...formattedTags];
            await addLog('INFO', `[${contentId}] 📝 combinedTags tags:`, { combinedTags });

            // Remove duplicates based on tag name (assuming name is unique identifier)
            const uniqueTags = combinedTags.filter((tag, index, self) =>
              index === self.findIndex((t) => (
                t.name === tag.name
              ))
            );

            updatePayload = {
              ...updatePayload,
              tags: [...(updatePayload.tags || []), ...uniqueTags],
            };
            await addLog('INFO', `[${contentId}] 📝✅ Successfully extracted keywords.`, { formattedTags });
          } else {
            await addLog('INFO', `[${contentId}] 📝ℹ️ No keywords extracted.`);
          }

        } catch (e: any) {
          await addLog('ERROR', `[${contentId}] 📝❌ Error during keyword extraction:`, { error: e.message });
        }
      } else {
        await addLog('INFO', `[${contentId}] 📝ℹ️ Skipping keyword extraction: description is empty or not a string.`);
      }

      // Generate searchable keywords array
      const keywords = new Set<string>();
      const stopWords = new Set(['a', 'an', 'and', 'the', 'is', 'in', 'it', 'of', 'for', 'on', 'with', 'to', 'was', 'i', 'you', 'he', 'she', 'they', 'we', 'about', 'as', 'at', 'by', 'from', 'how', 'what', 'when', 'where', 'why', 'which']);
      
      const generatePrefixes = (word: string): string[] => {
        if (!word) return [];
        const prefixes = new Set<string>();
        // For short words, just add the word itself
        if (word.length <= 2) {
          prefixes.add(word);
        } else {
          // For longer words, generate prefixes from length 2 up to the full word length
          for (let i = 2; i <= word.length; i++) {
            prefixes.add(word.substring(0, i));
          }
        }
        return Array.from(prefixes);
      };

      const processTextForKeywords = (text: string) => {
          if (!text) return;
          text.toLowerCase().split(/[\s,.\-!?"'()]+/).forEach(word => {
              if (word && !stopWords.has(word)) {
                  generatePrefixes(word).forEach(p => keywords.add(p));
              }
          });
      };
      
      const textToProcess = [
        contentData.title,
        updatePayload.title,
        contentData.description,
        updatePayload.description,
        contentData.domain,
        contentData.contentType,
        updatePayload.contentType
      ].filter(Boolean).join(' ');
      
      processTextForKeywords(textToProcess);

      const tagsToProcess = updatePayload.tags || contentData.tags || [];
      tagsToProcess.forEach((tag: any) => {
        if (tag.name) {
          processTextForKeywords(tag.name);
        }
      });

      const colorsToProcess = updatePayload.colorPalette || contentData.colorPalette || [];
      colorsToProcess.forEach((color: string) => keywords.add(color.toLowerCase()));

      if (keywords.size > 0) {
        updatePayload.searchableKeywords = Array.from(keywords);
        await addLog('INFO', `[${contentId}] 📝✅ Generated searchable keywords.`, { count: keywords.size });
      }


      if (enrichmentFailed) {
        updatePayload.status = 'failed-analysis';
        await addLog('WARN', `[${contentId}] ⚠️ Setting status to 'failed-analysis' due to errors.`);
      }

      await updateDoc(docRef, updatePayload);
      await addLog('INFO', `[${contentId}] ✅ Successfully updated document with payload:`, { payload: updatePayload });

      // After all updates, sync the final state to Meilisearch
      const finalItemForSync: ContentItem = {
        ...contentData,
        ...updatePayload,
        id: contentId,
        createdAt: (contentData.createdAt as Timestamp).toDate().toISOString(),
      };
      await syncItemWithMeili(finalItemForSync);

    } else {
      await addLog('INFO', `[${contentId}] ⏭️ Skipping enrichment, status is '${contentData.status}', not 'pending-analysis'.`);
    }

  } catch (error: any) {
    await addLog('ERROR', `[${contentId}] ❌ CRITICAL ERROR during enrichment flow:`, { error: error.message });
    await updateDoc(docRef, {
      status: 'failed-analysis'
    }).catch(e => addLog('ERROR', `[${contentId}] ❌ Failed to update status to 'failed-analysis' after critical error`, { error: (e as Error).message }));
  }
  }
);
