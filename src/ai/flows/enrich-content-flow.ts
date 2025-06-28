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
    console.log(`Starting enrichment for content ID: ${contentId}`);

    const docRef = doc(contentCollectionRef, contentId);
    
    try {
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.error(`Enrichment failed: Document with ID ${contentId} does not exist.`);
        return;
      }
      
      const contentData = docSnap.data();
      if (contentData.status === 'pending-analysis') {
        let updatePayload: { [key: string]: any } = { status: 'completed' };

        // Check if the item is an IMDb link to enrich with movie data
        if (contentData.type === 'link' && contentData.url && contentData.url.includes('imdb.com/title/') && process.env.NEXT_PUBLIC_TMDB_API_KEY) {
          console.log(`IMDb link found for ${contentId}. Fetching movie data...`);
          const imdbId = contentData.url.split('/title/')[1].split('/')[0];
          if (imdbId) {
            try {
              const tmdbResponse = await fetch(`https://api.themoviedb.org/3/find/${imdbId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&external_source=imdb_id`);
              const tmdbFindData = await tmdbResponse.json();
              
              if (tmdbFindData.movie_results && tmdbFindData.movie_results.length > 0) {
                const movieId = tmdbFindData.movie_results[0].id;
                const movieDetailResponse = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&append_to_response=credits`);
                const movieData = await movieDetailResponse.json();

                // Prepare movie-specific updates, merging with the default 'completed' status
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
                console.log(`Successfully fetched and processed movie data for ${contentId}.`);
              } else {
                console.log(`No movie results found on TMDb for IMDb ID ${imdbId}.`);
              }
            } catch (e) {
              console.error(`Error fetching movie details from TMDb for ${contentId}:`, e);
              // Do not block completion, just log the error and proceed to mark as completed.
            }
          }
        }
        
        // Add other enrichment logic here for images, regular links, etc.
        // For now, they will just get marked as 'completed' by the default payload.

        await updateDoc(docRef, updatePayload);
        console.log(`Successfully enriched content ID: ${contentId}, payload:`, updatePayload);

      } else {
         console.log(`Skipping enrichment for content ID: ${contentId}, status is not 'pending-analysis'.`);
      }

    } catch (error) {
      console.error(`Error during enrichment for content ID ${contentId}:`, error);
      // Optionally update status to 'failed-analysis'
      await updateDoc(docRef, {
        status: 'failed-analysis'
      }).catch(e => console.error(`Failed to update status to failed-analysis for ${contentId}`, e));
    }
  }
);
