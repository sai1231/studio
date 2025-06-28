
'use server';
/**
 * @fileOverview A flow for enriching content after it has been created.
 *
 * - enrichContent - A function that takes a content ID, fetches the content,
 *   and updates its status to 'completed'. This simulates a background job.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { addLog } from '@/services/loggingService';

const contentCollectionRef = collection(db, 'content');

const EnrichContentInputSchema = z.string().describe("The ID of the content item to enrich.");
export type EnrichContentInput = z.infer<typeof EnrichContentInputSchema>;

export async function enrichContent(contentId: EnrichContentInput): Promise<void> {
  await addLog('INFO', `✅✅✅ TRIGGERING ENRICHMENT FLOW ✅✅✅ for content ID: ${contentId}`);
  await enrichContentFlow(contentId);
}

const enrichContentFlow = ai.defineFlow(
  {
    name: 'enrichContentFlow',
    inputSchema: EnrichContentInputSchema,
    outputSchema: z.void(),
  },
  async (contentId) => {
    await addLog('INFO', `[${contentId}] ➡️ Starting enrichment process...`);

    const docRef = doc(contentCollectionRef, contentId);
    
    try {
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await addLog('ERROR', `[${contentId}] ❌ Enrichment failed: Document does not exist.`);
        return;
      }
      
      const contentData = docSnap.data();
      await addLog('INFO', `[${contentId}] 📄 Found document with status: ${contentData.status}`, { data: contentData });

      if (contentData.status === 'pending-analysis') {
        let enrichmentFailed = false;
        let updatePayload: { [key: string]: any } = { status: 'completed' };

        // Check if the item is an IMDb link to enrich with movie data
        if (contentData.type === 'link' && contentData.url && contentData.url.includes('imdb.com/title/') && process.env.NEXT_PUBLIC_TMDB_API_KEY) {
          await addLog('INFO', `[${contentId}] 🎬 IMDb link found. Fetching movie data...`);
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
        
        // Check if the item is an image to enrich with a caption
        if (contentData.type === 'image' && contentData.imageUrl) {
          await addLog('INFO', `[${contentId}] 🖼️ Image found. Generating caption...`);
          try {
            const imageResponse = await fetch(contentData.imageUrl);
            if (!imageResponse.ok) {
              throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
            }
            const imageBuffer = await imageResponse.arrayBuffer();
            const base64Image = Buffer.from(imageBuffer).toString('base64');
            const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
            const dataUri = `data:${mimeType};base64,${base64Image}`;

            const { text } = await ai.generate({
              model: 'googleai/gemini-pro-vision',
              prompt: `Provide a one-sentence descriptive caption for this image.`,
              history: [{
                parts: [{
                  media: {
                    url: dataUri,
                  }
                }]
              }],
            });

            const caption = text;

            if (caption) {
              updatePayload = {
                ...updatePayload,
                description: caption,
              };
              await addLog('INFO', `[${contentId}] 🖼️✅ Successfully generated caption.`, { caption });
            } else {
              await addLog('WARN', `[${contentId}] 🖼️⚠️ Gemini returned no caption.`);
            }

          } catch (e: any) {
            enrichmentFailed = true;
            await addLog('ERROR', `[${contentId}] 🖼️❌ Error generating caption:`, { error: e.message });
          }
        }

        // Check if the item is a link to enrich with a tldr caption
        if (contentData.type === 'link' && contentData.url && !contentData.url.includes('imdb.com/title/')) {
          await addLog('INFO', `[${contentId}] 🔗 Regular link found. Analysis not yet implemented. Skipping.`);
        }
        
        if (contentData.type === 'voice') {
          await addLog('INFO', `[${contentId}] 🎙️ Voice note found. Analysis not yet implemented. Skipping.`);
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
