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
  console.log('enrichContent function called with ID:', contentId);
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
        let enrichmentFailed = false;
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
              enrichmentFailed = true;
              console.error(`Error fetching movie details from TMDb for ${contentId}:`, e);
              // Do not block completion, just log the error and proceed to mark as completed.
            }
          }
        }
        
        // Add other enrichment logic here for images, regular links, etc.
      // Add this function inside the enrichContentFlow async function,
// after the TMDb logic but before the final updateDoc.

// Check if the item is an image to enrich with a caption
if (contentData.type === 'image' && contentData.imageUrl) {
  console.log(`Image found for ${contentId}. Generating caption...`);
  try {
    // Fetch the image
    const imageResponse = await fetch(contentData.imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    // Call Moondream API
    const moondreamResponse = await fetch('https://api.moondream.ai/v1/caption', {
      method: 'POST',
headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MOONDREAM_API_KEY}`,
                // Add any necessary API key header here if required by Moondream API
              },
      body: JSON.stringify({
        image_url: dataUri,
        length: 'normal', // Or 'short'
      }),
      signal: AbortSignal.timeout(15000), // 15-second timeout
    });

    if (!moondreamResponse.ok) {
      const errorBody = await moondreamResponse.text();
      throw new Error(`Moondream API request failed: ${moondreamResponse.status} ${moondreamResponse.statusText} - ${errorBody}`);
    }

    const moondreamData = await moondreamResponse.json();
    const caption = moondreamData.caption;

    if (caption) {
       // Update description for images
      updatePayload = {
        ...updatePayload,
        description: caption,
      };
      console.log(`Successfully generated caption for ${contentId}.`);
    } else {
       console.warn(`Moondream API returned no caption for ${contentId}.`);
    }

  } catch (e) {
    enrichmentFailed = true;
    console.error(`Error generating caption for ${contentId}:`, e);
    // Do not block completion, just log the error and proceed to mark as completed.
  }
}

// Check if the item is a link to enrich with a tldr caption
if (contentData.type === 'link' && contentData.url && !contentData.url.includes('imdb.com/title/')) {
   console.log(`Regular link found for ${contentId}. Generating tldr caption...`);
   try {
    // You would likely need a different approach or API here to summarize a link's content.
    // The Moondream API is for image captioning.
    // For now, I will add a placeholder or simply rely on other enrichment if available.
    console.log(`Link summarization not yet implemented for ${contentId}. Skipping.`);
    // Example placeholder if you want to add a default tldr for non-IMDb links
    // updatePayload = {
    //   ...updatePayload,
    //   tldr: "Link analysis pending.",
    // };

  } catch (e) {
    enrichmentFailed = true;
    console.error(`Error generating tldr for ${contentId}:`, e);
    // Do not block completion, just log the error and proceed to mark as completed.
  }
}

        // Check if any enrichment failed and set status accordingly before updating
        if (enrichmentFailed) {
          updatePayload.status = 'failed-analysis';
        }
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
