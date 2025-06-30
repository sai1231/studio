'use server';

/**
 * @fileOverview A flow for enriching content after it has been created.
 *
 * - enrichContent - A function that takes a content ID, fetches the content,
 *   and updates its status to 'completed'. This simulates a background job.
 */
import { ai } from '@/ai/genkit';
import { generateCaptionFromImage } from '@/ai/moondream';
import { extractTagsFromText } from '@/ai/tag-extraction';
import { z } from 'zod';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminStorage } from '@/lib/firebase-admin'; // Use admin storage
import { addLog } from '@/services/loggingService';

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
        return;
      }

      const contentData = docSnap.data();
      await addLog('INFO', `YRDY`);

      if (contentData.status === 'pending-analysis') {
        let enrichmentFailed = false;
        let updatePayload: { [key: string]: any } = { status: 'completed' };

        // Check if the item is an IMDb link to enrich with movie data
        if (contentData.type === 'link' && contentData.url && contentData.url.includes('imdb.com/title/') && process.env.NEXT_PUBLIC_TMDB_API_KEY) {
          const imdbId = contentData.url.split('/title/')[1].split('/')[0];
          if (imdbId) {
            try {
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
        
        // Determine the URL to process for image captioning
        let imageUrlToProcess: string | null = null;
        if (contentData.imagePath) {
          try {
            // Use Admin SDK to get a short-lived signed URL for the private file
            const [signedUrl] = await adminStorage
              .bucket()
              .file(contentData.imagePath)
              .getSignedUrl({
                action: 'read',
                expires: Date.now() + 5 * 60 * 1000, // URL is valid for 5 minutes
              });
            imageUrlToProcess = signedUrl;
            
          } catch(e: any) {
            await addLog('ERROR', `[${contentId}] 🖼️❌ Could not get signed URL for imagePath: ${contentData.imagePath}`, { error: (e as Error).message });
          }
        } else if (contentData.imageUrl) {
          imageUrlToProcess = contentData.imageUrl;
        }

        // Check if the item is an image to enrich with a caption
        if ((contentData.type === 'image' || contentData.type === 'link') && imageUrlToProcess) {
          await addLog('INFO', `[${contentId}] 🖼️ Image found. Generating caption...`);
          try {
            const caption = await generateCaptionFromImage(imageUrlToProcess);

            if (caption) {
              updatePayload.description = (contentData.description || '') + (contentData.description ? '\\n' : '') + caption;

              await addLog('INFO', `[${contentId}] 🖼️✅ Successfully generated caption.`, { caption });
            } else {
              await addLog('WARN', `[${contentId}] 🖼️⚠️ Moondream returned no caption.`);
            }

          } catch (e: any) {
            enrichmentFailed = true;
            // Log error but don't fail the entire enrichment if captioning fails
            await addLog('WARN', `[${contentId}] 🖼️❌ Error generating caption:`, { error: e.message });
          }
        }
        
        // Keyword and Key Phrase Extraction
        const descriptionToAnalyze = updatePayload.description || contentData.description;

        if (descriptionToAnalyze && typeof descriptionToAnalyze === 'string') {
          await addLog('INFO', `[${contentId}] 📝 Extracting keywords and key phrases...`);

          try {
            const formattedTags = await extractTagsFromText(descriptionToAnalyze);


            if (formattedTags.length > 0) {
              updatePayload = {
                ...updatePayload,
                tags: formattedTags, // Format as [{ id, name }]
              };
              await addLog('INFO', `[${contentId}] 📝✅ Successfully extracted keywords and key phrases.`, { formattedTags });
            } else {
              await addLog('INFO', `[${contentId}] 📝ℹ️ No keywords or key phrases extracted.`);
            }

          } catch (e: any) {
            // Log error but don't fail the entire enrichment if tag extraction fails
            // enrichmentFailed = true; // Decided not to fail the whole process for failed tag extraction
            await addLog('ERROR', `[${contentId}] 📝❌ Error during keyword extraction:`, { error: e.message });
          }
        } else {
          await addLog('INFO', `[${contentId}] 📝ℹ️ Skipping keyword extraction: description is empty or not a string.`);
        }

        if (enrichmentFailed) {
          updatePayload.status = 'failed-analysis';
          await addLog('WARN', `[${contentId}] ⚠️ Setting status to 'failed-analysis' due to errors.`);
        }

        await updateDoc(docRef, updatePayload);
        await addLog('INFO', `[${contentId}] ✅ Successfully updated document with payload:`, { payload: updatePayload });

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
