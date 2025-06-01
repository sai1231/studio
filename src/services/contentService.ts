
'use server'; 

import type { ContentItem, Zone, Tag } from '@/types';

let mockContentItems: ContentItem[] = [
  {
    id: '1',
    type: 'link',
    url: 'https://nextjs.org/docs',
    title: 'Next.js Docs',
    description: 'The React Framework for the Web - Documentation.',
    mindNote: 'Remember to check the latest ISR strategies.',
    imageUrl: 'https://source.unsplash.com/600x400/?technology,code,web',
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
    imageUrl: 'https://source.unsplash.com/600x400/?landscape,nature,mountains',
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
    imageUrl: 'https://source.unsplash.com/400x700/?social,mobile,travel',
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
    imageUrl: 'https://source.unsplash.com/600x400/?code,github,software',
    tags: [{ id: 't-code', name: 'code' }, { id: 't-js', name: 'javascript' }],
    zoneId: '1',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    domain: 'github.com',
    contentType: 'Repositories',
  },
  {
    id: '7',
    type: 'link',
    url: 'https://twitter.com/elonmusk/status/1234567890',
    title: 'Elon Musk Tweet about Space',
    description: 'A tweet from Elon Musk regarding SpaceX.',
    tags: [{ id: 't-social', name: 'social media' }, {id: 't-space', name: 'space'}],
    zoneId: '3',
    createdAt: new Date(Date.now() - 86400000 * 0.2).toISOString(),
    domain: 'x.com',
    contentType: 'Tweet',
  },
  {
    id: '8',
    type: 'link',
    url: 'https://medium.com/some-article-on-ux',
    title: 'An interesting article on UX Design Trends',
    description: 'Insights on a trending topic in user experience for 2024.',
    imageUrl: 'https://source.unsplash.com/600x400/?design,ux,article',
    tags: [{ id: 't-reading', name: 'reading' }, { id: 't-design', name: 'UX design'}],
    zoneId: '2', 
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    domain: 'medium.com',
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
    imageUrl: 'https://source.unsplash.com/600x400/?animation,design,ui',
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
    imageUrl: 'https://source.unsplash.com/600x400/?tokyo,city,night',
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
    imageUrl: 'https://source.unsplash.com/600x400/?pasta,food,recipe',
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
    imageUrl: 'https://source.unsplash.com/600x400/?technology,news,gadgets',
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
    imageUrl: 'https://source.unsplash.com/600x400/?youtube,presentation,music', 
    tags: [{ id: 't-video', name: 'video' }, { id: 't-tech', name: 'technology presentation' }, {id: 't-music', name: 'music'}],
    zoneId: '1',
    createdAt: new Date(Date.now() - 86400000 * 0.7).toISOString(),
    domain: 'youtube.com',
    contentType: 'Video',
  }
];

let mockZones: Zone[] = [ 
  { id: '1', name: 'Work & Learning' },
  { id: '2', name: 'Personal & Home' },
  { id: '3', name: 'Interests & Media' },
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
  if (itemData.type === 'link' && itemData.url && !extractedDomain) {
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
    domain: extractedDomain,
    contentType: itemData.contentType,
    mindNote: itemData.mindNote,
    audioUrl: itemData.audioUrl, 
    imageUrl: itemData.imageUrl || (itemData.type !== 'note' && itemData.type !== 'voice' ? `https://source.unsplash.com/600x400/?${itemData.title.split(" ")[0] || 'abstract'}` : undefined)
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
    // For audio, return a generic mp3 link
    return 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-Random.mp3'; // Using a more generic name
  }
  // For images, return a dynamic Unsplash URL based on a simple keyword from filename or a default
  const query = file.name.split('.')[0].split(' ')[0] || 'upload'; // a simple keyword
  return `https://source.unsplash.com/600x400/?${query},abstract`; 
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
