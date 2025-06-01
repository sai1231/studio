
'use server';

import type { ContentItem, Zone, Tag, MovieDetails } from '@/types';
// Lucide icons are no longer imported here directly for mockZones

let mockContentItems: ContentItem[] = [
  {
    id: 'pdf-mock-1',
    type: 'link',
    url: 'https://storage.example.com/reports/annual_company_report_2023.pdf',
    title: 'Annual Company Report 2023.pdf',
    description: 'The official annual report for the fiscal year 2023, detailing performance and outlook.',
    tags: [{ id: 't-report', name: 'report' }, { id: 't-official', name: 'official' }, { id: 't-pdf', name: 'pdf' }],
    zoneId: '1', // Assuming Zone '1' (Work & Learning) exists
    createdAt: new Date(Date.now() - 86400000 * 0.05).toISOString(), // Very recent
    domain: 'storage.example.com',
    contentType: 'PDF',
    // No imageUrl for PDFs by default
  },
  {
    id: '1',
    type: 'link',
    url: 'https://nextjs.org/docs',
    title: 'Next.js Docs',
    description: 'The React Framework for the Web - Documentation.',
    mindNote: 'Remember to check the latest ISR strategies.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't2', name: 'nextjs' }, { id: 't1', name: 'productivity' }],
    zoneId: '1',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    domain: 'nextjs.org',
    contentType: 'Documentation',
  },
  {
    id: '2',
    type: 'note',
    title: 'My Shopping List',
    description: 'Milk, Eggs, Bread, Coffee, Avocado, Chicken Breast',
    tags: [{ id: 't-personal', name: 'personal' }, { id: 't-todos', name: 'todos' }],
    zoneId: '2',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    contentType: 'List',
  },
  {
    id: '3',
    type: 'image',
    title: 'Awesome Landscape',
    description: 'A beautiful landscape picture I found during a hike.',
    mindNote: 'Could be a good wallpaper for my desktop.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't4', name: 'inspiration' }, {id: 't-nature', name: 'nature'}],
    zoneId: '1',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    type: 'link',
    url: 'https://www.instagram.com/reel/Cabcdefg/',
    title: 'Cool Instagram Reel',
    description: 'A very cool reel I saw about travel hacks.',
    imageUrl: 'https://placehold.co/400x700.png',
    tags: [{ id: 't-social', name: 'social media'}, { id: 't-fun', name: 'fun'}, {id: 't-travel', name: 'travel'}],
    zoneId: '3',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    domain: 'instagram.com',
    contentType: 'Reel',
  },
   {
    id: '5',
    type: 'link',
    url: 'https://threads.net/@username/post/12345',
    title: 'Interesting Threads Post on AI Ethics',
    description: 'Some thoughts on the future of AI and ethical considerations.',
    imageUrl: 'https://placehold.co/600x400.png', // Added placeholder for Threads
    tags: [{ id: 't-social', name: 'social media'}, { id: 't-discussion', name: 'discussion'}, {id: 't-ai', name: 'ai ethics'}],
    zoneId: '3',
    createdAt: new Date(Date.now() - 86400000 * 0.5).toISOString(),
    domain: 'threads.net',
    contentType: 'Thread',
  },
  {
    id: '6',
    type: 'link',
    url: 'https://github.com/facebook/react',
    title: 'React GitHub Repository',
    description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.',
    mindNote: 'Check out their contribution guidelines and recent updates.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't-code', name: 'code' }, { id: 't-js', name: 'javascript' }],
    zoneId: '1',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    domain: 'github.com',
    contentType: 'Repositories',
  },
  {
    id: '7',
    type: 'link',
    url: 'https://x.com/elonmusk/status/1234567890', // Keep using x.com for twitter
    title: 'Elon Musk Tweet about Space',
    description: 'A tweet from Elon Musk regarding SpaceX.',
    imageUrl: 'https://placehold.co/600x400.png', // Added placeholder for Tweet
    tags: [{ id: 't-social', name: 'social media' }, {id: 't-space', name: 'space'}],
    zoneId: '3',
    createdAt: new Date(Date.now() - 86400000 * 0.2).toISOString(),
    domain: 'x.com',
    contentType: 'Tweet',
  },
  {
    id: '8',
    type: 'link',
    url: 'https://drata.com/resources/reports/grc-trends?utm_source=Hacker_News&utm_medium=display&utm_campaign=20250505_stateofgrc_may2025_DG_all_ALL',
    title: 'An interesting article on GRC Trends',
    description: 'Insights on a trending topic in Governance, Risk, and Compliance for 2025. Drata GRC report for security professionals.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't-reading', name: 'reading' }, { id: 't-grc', name: 'GRC'}],
    zoneId: '2',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    domain: 'drata.com',
    contentType: 'Article',
  },
  {
    id: '9',
    type: 'voice',
    title: 'Quick Voice Memo - Project Update',
    description: 'Reminder for upcoming meeting and agenda points for Project Phoenix.',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    tags: [{ id: 't-work', name: 'work' }, { id: 't-reminder', name: 'reminder' }],
    zoneId: '1',
    createdAt: new Date(Date.now() - 86400000 * 0.1).toISOString(),
    contentType: 'Voice Note',
  },
  {
    id: '10',
    type: 'link',
    url: 'https://dribbble.com/shots/popular/animation',
    title: 'Dribbble Animation Inspiration',
    description: 'Popular animations on Dribbble for UI ideas.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't-design', name: 'design' }, { id: 't4', name: 'inspiration' }, {id: 't-animation', name: 'animation'}],
    zoneId: '1',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    domain: 'dribbble.com',
    contentType: 'Inspiration',
  },
  {
    id: '11',
    type: 'note',
    title: 'Book Summary: Atomic Habits',
    description: 'Key takeaways: Small changes lead to remarkable results. Focus on systems, not goals. Identity-based habits are crucial.',
    tags: [{ id: 't-books', name: 'books' }, { id: 't-selfhelp', name: 'self-improvement' }],
    zoneId: '2',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    contentType: 'Summary',
  },
  {
    id: '12',
    type: 'image',
    title: 'Tokyo Street Scene',
    description: 'A vibrant street in Tokyo at night.',
    mindNote: 'Love the neon lights here.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't-travel', name: 'travel' }, { id: 't-city', name: 'cityscape' }],
    zoneId: '3',
    createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
  },
  {
    id: '13',
    type: 'link',
    url: 'https://www.bonappetit.com/recipe/pasta-aglio-e-olio',
    title: 'Simple Pasta Aglio e Olio Recipe',
    description: 'A quick and delicious garlic and oil pasta.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't-recipe', name: 'recipe' }, { id: 't-cooking', name: 'cooking' }],
    zoneId: '2',
    createdAt: new Date(Date.now() - 86400000 * 0.8).toISOString(),
    domain: 'bonappetit.com',
    contentType: 'Recipe',
  },
  {
    id: '14',
    type: 'voice',
    title: 'Idea for Klipped App',
    description: 'Think about adding AI-powered summarization for long articles.',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    tags: [{ id: 't-appdev', name: 'app development' }, { id: 't-ideas', name: 'ideas' }],
    zoneId: '1',
    createdAt: new Date(Date.now() - 86400000 * 0.3).toISOString(),
    contentType: 'Idea',
  },
  {
    id: '15',
    type: 'link',
    url: 'https://www.theverge.com/tech',
    title: 'The Verge - Tech News',
    description: 'Latest technology news, reviews, and analysis.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't-news', name: 'news' }, { id: 't-tech', name: 'technology' }],
    zoneId: '3',
    createdAt: new Date(Date.now() - 86400000 * 2.5).toISOString(),
    domain: 'theverge.com',
    contentType: 'News',
  },
  {
    id: '16',
    type: 'link',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Important Tech Presentation (Music Video)',
    description: 'A must-watch presentation on new web technologies and classic tunes.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't-video', name: 'video' }, { id: 't-tech-presentation', name: 'technology presentation' }, {id: 't-music', name: 'music'}], // Changed ID here
    zoneId: '1',
    createdAt: new Date(Date.now() - 86400000 * 0.7).toISOString(),
    domain: 'youtube.com',
    contentType: 'Video',
  },
  // Start of new diverse link items
  {
    id: '17',
    type: 'link',
    url: 'https://x.com/SpaceX/status/1700000000000000000', // Example, actual status ID is illustrative
    title: 'SpaceX Tweet about Starship Mission',
    description: 'Latest updates on the Starship program and upcoming test flights. Follow for more news.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't-space', name: 'space' }, { id: 't-spacex', name: 'SpaceX'}, { id: 't-social', name: 'social media' }],
    zoneId: '3',
    createdAt: new Date(Date.now() - 86400000 * 0.1).toISOString(),
    domain: 'x.com',
    contentType: 'Tweet',
  },
  {
    id: '18',
    type: 'link',
    url: 'https://www.instagram.com/p/Cxyz123AbcD/', // Example Instagram post URL structure
    title: 'Amazing Bali Travel Highlights',
    description: 'Captured the incredible sunsets and vibrant culture of Bali. A must-visit destination!',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't-travel', name: 'travel' }, { id: 't-instagram', name: 'instagram'}, { id: 't-photography', name: 'photography' }],
    zoneId: '3',
    createdAt: new Date(Date.now() - 86400000 * 0.9).toISOString(),
    domain: 'instagram.com',
    contentType: 'Instagram Post',
  },
  {
    id: '19',
    type: 'link',
    url: 'https://open.spotify.com/track/0SiywuOBRc1A30kK3uVz0o', // Example Spotify track URL
    title: 'Lo-fi Chill Beats for Study/Relax',
    description: 'My go-to Spotify track for deep focus sessions or just unwinding after a long day.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't-music', name: 'music' }, { id: 't-spotify', name: 'spotify' }, { id: 't-lofi', name: 'lo-fi' }],
    zoneId: '2',
    createdAt: new Date(Date.now() - 86400000 * 1.2).toISOString(),
    domain: 'open.spotify.com',
    contentType: 'Spotify Track',
  },
  {
    id: '20',
    type: 'link',
    url: 'https://vimeo.com/1234567890', // Example Vimeo video URL
    title: 'Indie Animation Short: "The Last Leaf"',
    description: 'A beautifully animated short film with a touching story. Great for inspiration.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't-animation', name: 'animation' }, { id: 't-vimeo', name: 'vimeo'}, { id: 't-shortfilm', name: 'short film' }],
    zoneId: '3',
    createdAt: new Date(Date.now() - 86400000 * 2.2).toISOString(),
    domain: 'vimeo.com',
    contentType: 'Vimeo Video',
  },
  {
    id: '21',
    type: 'link',
    url: 'https://soundcloud.com/exampleartist/new-electronic-track', // Example SoundCloud URL
    title: 'Fresh Electronic Track by ExampleArtist',
    description: 'Check out this new upbeat electronic music piece, perfect for a workout or coding.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't-music', name: 'music' }, { id: 't-soundcloud', name: 'soundcloud'}, { id: 't-electronic', name: 'electronic' }],
    zoneId: '3',
    createdAt: new Date(Date.now() - 86400000 * 0.4).toISOString(),
    domain: 'soundcloud.com',
    contentType: 'SoundCloud Track',
  },
  {
    id: '22',
    type: 'link',
    url: 'https://www.figma.com/community/file/123456789/Mobile-App-UI-Kit', // Example Figma Community URL
    title: 'Mobile App UI Kit - Figma Community',
    description: 'A comprehensive UI kit for designing modern mobile applications. Includes various components and screens.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't-design', name: 'design' }, { id: 't-figma', name: 'figma'}, { id: 't-ui', name: 'UI Kit' }],
    zoneId: '1',
    createdAt: new Date(Date.now() - 86400000 * 3.5).toISOString(),
    domain: 'figma.com',
    contentType: 'Figma Design',
  },
  {
    id: '23',
    type: 'link',
    url: 'https://gist.github.com/anonymous/123abc456def789ghi', // Example GitHub Gist URL
    title: 'Python Web Scraping Snippet - Gist',
    description: 'A quick Python script using BeautifulSoup and Requests for web scraping tasks.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't-code', name: 'code' }, { id: 't-python', name: 'python'}, { id: 't-gist', name: 'gist' }],
    zoneId: '1',
    createdAt: new Date(Date.now() - 86400000 * 1.8).toISOString(),
    domain: 'gist.github.com',
    contentType: 'Code Gist',
  },
  {
    id: '24',
    type: 'link',
    url: 'https://www.tiktok.com/@tiktok/video/7000000000000000000', // Example TikTok video URL structure
    title: 'Viral TikTok Dance Challenge',
    description: 'The latest dance trend taking over TikTok. Fun to watch!',
    imageUrl: 'https://placehold.co/400x700.png',
    tags: [{ id: 't-social', name: 'social media' }, { id: 't-tiktok', name: 'tiktok'}, { id: 't-fun', name: 'fun' }],
    zoneId: '3',
    createdAt: new Date(Date.now() - 86400000 * 0.6).toISOString(),
    domain: 'tiktok.com',
    contentType: 'TikTok Video',
  },
  {
    id: 'movie-1',
    type: 'movie',
    url: 'https://www.imdb.com/title/tt0133093/', // The Matrix
    title: 'The Matrix',
    description: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
    imageUrl: 'https://image.tmdb.org/t/p/w500/f89JUZ महज9f9dF5lH0bLgLgezO.jpg', // Example poster path
    tags: [{ id: 't-movie', name: 'movie' }, { id: 't-scifi', name: 'sci-fi' }],
    zoneId: '3',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    domain: 'imdb.com',
    contentType: 'Movie',
    movieDetails: {
      posterPath: '/f89JUZ महज9f9dF5lH0bLgLgezO.jpg',
      releaseYear: '1999',
      rating: 8.7,
      director: 'Lana Wachowski, Lilly Wachowski',
      cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss', 'Hugo Weaving', 'Joe Pantoliano'],
      genres: ['Action', 'Science Fiction'],
    },
  }
];

let mockZones: Zone[] = [
  { id: '1', name: 'Work & Learning', icon: 'Briefcase' },
  { id: '2', name: 'Personal & Home', icon: 'Home' },
  { id: '3', name: 'Interests & Media', icon: 'Library' },
];

// Function to get all content items
export async function getContentItems(userId?: string): Promise<ContentItem[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return [...mockContentItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Function to get a single content item by ID
export async function getContentItemById(id: string): Promise<ContentItem | undefined> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return mockContentItems.find(item => item.id === id);
}

// Function to get all zones
export async function getZones(userId?: string): Promise<Zone[]> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return [...mockZones];
}

// Function to get a single zone by ID
export async function getZoneById(id: string): Promise<Zone | undefined> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return mockZones.find(zone => zone.id === id);
}

// Function to add a new zone
export async function addZone(name: string): Promise<Zone> {
  await new Promise(resolve => setTimeout(resolve, 50));
  const newZone: Zone = {
    id: Date.now().toString(), // Simple ID generation for mock
    name: name.trim(),
    // New zones won't have an icon by default, they can be assigned later if UI allows
  };
  mockZones.push(newZone);
  return newZone;
}


// Function to add a new content item
export async function addContentItem(
  itemData: Omit<ContentItem, 'id' | 'createdAt'>
): Promise<ContentItem> {
  await new Promise(resolve => setTimeout(resolve, 100));

  let extractedDomain: string | undefined = itemData.domain;
  let itemType = itemData.type;
  let finalContentType = itemData.contentType;
  let finalImageUrl = itemData.imageUrl;
  let finalDescription = itemData.description;
  let movieDetailsData: MovieDetails | undefined = itemData.type === 'movie' ? itemData.movieDetails : undefined;


  if (itemData.url && itemData.url.includes('imdb.com/title/') && process.env.TMDB_API_KEY) {
    itemType = 'movie';
    finalContentType = 'Movie'; // Explicitly set content type for movies
    const imdbId = itemData.url.split('/title/')[1].split('/')[0];
    if (imdbId) {
      try {
        const tmdbResponse = await fetch(`https://api.themoviedb.org/3/find/${imdbId}?api_key=${process.env.TMDB_API_KEY}&external_source=imdb_id`);
        if (!tmdbResponse.ok) {
          console.error(`TMDb find API error: ${tmdbResponse.status} ${tmdbResponse.statusText}`);
          // Do not throw, proceed with original/default data
        } else {
          const tmdbFindData = await tmdbResponse.json();

          if (tmdbFindData.movie_results && tmdbFindData.movie_results.length > 0) {
            const movieId = tmdbFindData.movie_results[0].id;
            const movieDetailResponse = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.TMDB_API_KEY}&append_to_response=credits`);
            if (!movieDetailResponse.ok) {
               console.error(`TMDb movie detail API error: ${movieDetailResponse.status} ${movieDetailResponse.statusText}`);
              // Do not throw, proceed
            } else {
              const movieData = await movieDetailResponse.json();

              finalImageUrl = movieData.poster_path ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}` : finalImageUrl;
              finalDescription = movieData.overview || finalDescription;

              movieDetailsData = {
                posterPath: movieData.poster_path,
                releaseYear: movieData.release_date ? movieData.release_date.split('-')[0] : undefined,
                rating: movieData.vote_average ? parseFloat(movieData.vote_average.toFixed(1)) : undefined,
                director: movieData.credits?.crew?.find((c: any) => c.job === 'Director')?.name,
                cast: movieData.credits?.cast?.slice(0, 5).map((c: any) => c.name) || [],
                genres: movieData.genres?.map((g: any) => g.name) || [],
              };
            }
          }
        }
      } catch (e) {
        console.error("Error fetching movie details from TMDb:", e);
        // Keep original itemData.type, imageUrl, description if TMDb fetch fails
      }
    }
  } else if (itemType === 'link' && itemData.url && !extractedDomain) {
    try {
      const urlObject = new URL(itemData.url);
      extractedDomain = urlObject.hostname.replace(/^www\./, '');
    } catch (e) {
      console.warn("Could not extract domain from URL:", itemData.url);
    }
  }


  const newItem: ContentItem = {
    ...itemData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    type: itemType, // Use potentially updated itemType
    domain: extractedDomain,
    contentType: finalContentType, // Use potentially updated finalContentType
    mindNote: itemData.mindNote,
    audioUrl: itemData.audioUrl,
    imageUrl: finalImageUrl || (itemType !== 'note' && itemType !== 'voice' && itemType !== 'movie' && !(itemType === 'link' && finalContentType === 'PDF') ? `https://placehold.co/600x400.png` : undefined),
    description: finalDescription, // Use potentially updated finalDescription
    movieDetails: movieDetailsData, // Use potentially updated movieDetailsData
  };
  mockContentItems.unshift(newItem);
  return newItem;
}

// Function to delete a content item
export async function deleteContentItem(itemId: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 100));
  mockContentItems = mockContentItems.filter(item => item.id !== itemId);
}

// Function to update a content item
export async function updateContentItem(
  itemId: string,
  updates: Partial<Omit<ContentItem, 'id' | 'createdAt' | 'userId'>>
): Promise<ContentItem | undefined> {
  await new Promise(resolve => setTimeout(resolve, 100));
  const itemIndex = mockContentItems.findIndex(item => item.id === itemId);
  if (itemIndex > -1) {
    // Ensure mindNote can be explicitly set to empty string or undefined
    const currentItem = mockContentItems[itemIndex];
    const newUpdates = {...updates};
    if (updates.hasOwnProperty('mindNote')) {
        newUpdates.mindNote = updates.mindNote;
    }
     if (updates.hasOwnProperty('audioUrl')) {
        newUpdates.audioUrl = updates.audioUrl;
    }
    if (updates.hasOwnProperty('movieDetails')) {
        newUpdates.movieDetails = updates.movieDetails;
    }


    mockContentItems[itemIndex] = { ...currentItem, ...newUpdates };
    return mockContentItems[itemIndex];
  }
  return undefined;
}

// Mock function for file upload, returns a placeholder URL
export async function uploadFile(file: File, path: string): Promise<string> {
  console.log(`Mock uploading file ${file.name} to ${path}`);
  await new Promise(resolve => setTimeout(resolve, 200));

  if (file.type.startsWith('audio/')) {
    return 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-Random.mp3';
  }
  if (file.type === 'application/pdf') {
    // Return a more representative mock URL for PDFs, ensuring it's unique enough for testing
    return `https://storage.example.com/uploads/${Date.now()}_${encodeURIComponent(file.name)}`;
  }
  // For images, return a dynamic placehold.co URL
  return `https://placehold.co/600x400.png`;
}

// Function to get unique domains
export async function getUniqueDomains(): Promise<string[]> {
  await new Promise(resolve => setTimeout(resolve, 50));
  const domains = new Set<string>();
  mockContentItems.forEach(item => {
    if (item.domain) {
      domains.add(item.domain);
    }
  });
  return Array.from(domains).sort();
}

// Function to get unique content types
export async function getUniqueContentTypes(): Promise<string[]> {
  await new Promise(resolve => setTimeout(resolve, 50));
  const contentTypes = new Set<string>();
  mockContentItems.forEach(item => {
    if (item.contentType) {
      contentTypes.add(item.contentType);
    }
  });
  return Array.from(contentTypes).sort();
}

// Function to get all unique tags
export async function getUniqueTags(userId?: string): Promise<Tag[]> {
  await new Promise(resolve => setTimeout(resolve, 50));
  const allTagsMap = new Map<string, Tag>();
  mockContentItems.forEach(item => {
    (item.tags || []).forEach(tag => { // Ensure item.tags exists
      if (tag && tag.name && !allTagsMap.has(tag.name.toLowerCase())) { 
        allTagsMap.set(tag.name.toLowerCase(), tag);
      }
    });
  });
  return Array.from(allTagsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

