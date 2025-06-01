
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
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't2', name: 'nextjs' }, { id: 't1', name: 'productivity' }],
    zoneId: '1', 
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), 
    domain: 'nextjs.org',
    contentType: 'Article',
  },
  {
    id: '2',
    type: 'note',
    title: 'My Shopping List',
    description: 'Milk, Eggs, Bread, Coffee',
    tags: [{ id: 't-personal', name: 'personal' }, { id: 't-todos', name: 'todos' }],
    zoneId: '2', 
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(), 
    contentType: 'Note',
  },
  {
    id: '3',
    type: 'image',
    title: 'Awesome Landscape',
    description: 'A beautiful landscape picture I found.',
    mindNote: 'Could be a good wallpaper.',
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
    description: 'A very cool reel I saw.',
    imageUrl: 'https://placehold.co/400x700.png',
    tags: [{ id: 't-social', name: 'social media'}, { id: 't-fun', name: 'fun'}],
    zoneId: '3',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    domain: 'instagram.com',
    contentType: 'Reel',
  },
   {
    id: '5',
    type: 'link',
    url: 'https://threads.net/@username/post/12345',
    title: 'Interesting Threads Post',
    description: 'Some thoughts on a topic.',
    tags: [{ id: 't-social', name: 'social media'}, { id: 't-discussion', name: 'discussion'}],
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
    mindNote: 'Check out their contribution guidelines.',
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
    title: 'Elon Musk Tweet',
    description: 'A tweet from Elon Musk.',
    tags: [{ id: 't-social', name: 'social media' }],
    zoneId: '3',
    createdAt: new Date(Date.now() - 86400000 * 0.2).toISOString(),
    domain: 'twitter.com',
    contentType: 'Tweet',
  },
  {
    id: '8',
    type: 'link',
    url: 'https://medium.com/some-article',
    title: 'An interesting article on Medium',
    description: 'Insights on a trending topic.',
    tags: [{ id: 't-reading', name: 'reading' }],
    zoneId: '2',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    domain: 'medium.com',
    contentType: 'Article', 
  },
  {
    id: '9',
    type: 'voice',
    title: 'Quick Voice Memo',
    description: 'Reminder for upcoming meeting and agenda points.', // Voice items can have descriptions
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Placeholder audio
    tags: [{ id: 't-work', name: 'work' }, { id: 't-reminder', name: 'reminder' }],
    zoneId: '1',
    createdAt: new Date(Date.now() - 86400000 * 0.1).toISOString(),
    contentType: 'Voice Note',
  }
];

let mockZones: Zone[] = [ 
  { id: '1', name: 'Work Projects' },
  { id: '2', name: 'Personal Errands' },
  { id: '3', name: 'Social Finds' },
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
    audioUrl: itemData.audioUrl, // Ensure audioUrl is passed through
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
  // For testing audio, if an audio file is "uploaded", return a generic audio URL
  if (file.type.startsWith('audio/')) {
    return 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3';
  }
  return 'https://placehold.co/600x400.png'; 
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

