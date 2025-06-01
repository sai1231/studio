
'use server'; 

import type { ContentItem, Zone, Tag } from '@/types'; // Renamed Collection to Zone

let mockContentItems: ContentItem[] = [
  {
    id: '1',
    type: 'link',
    url: 'https://nextjs.org',
    title: 'Next.js by Vercel',
    description: 'The React Framework for the Web.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't2', name: 'nextjs' }, { id: 't1', name: 'productivity' }],
    zoneId: '1', // Renamed from collectionId
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
  },
  {
    id: '2',
    type: 'note',
    title: 'My Shopping List',
    description: 'Milk, Eggs, Bread, Coffee',
    tags: [{ id: 't-personal', name: 'personal' }, { id: 't-todos', name: 'todos' }],
    zoneId: '2', // Renamed from collectionId
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
  },
  {
    id: '3',
    type: 'image',
    title: 'Awesome Landscape',
    description: 'A beautiful landscape picture I found.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't4', name: 'inspiration' }, {id: 't-nature', name: 'nature'}],
    zoneId: '1', // Renamed from collectionId
    createdAt: new Date().toISOString(),
  },
];

let mockZones: Zone[] = [ // Renamed from mockCollections
  { id: '1', name: 'Work Projects' },
  { id: '2', name: 'Personal Errands' },
  { id: '3', name: 'Inspiration' },
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
export async function getZones(userId?: string): Promise<Zone[]> { // Renamed from getCollections
  await new Promise(resolve => setTimeout(resolve, 50));
  return [...mockZones]; // Renamed from mockCollections
}

// Function to get a single zone by ID
export async function getZoneById(id: string): Promise<Zone | undefined> { // Renamed from getCollectionById
  await new Promise(resolve => setTimeout(resolve, 50));
  return mockZones.find(zone => zone.id === id); // Renamed from mockCollections
}


// Function to add a new content item
export async function addContentItem(
  itemData: Omit<ContentItem, 'id' | 'createdAt'>
): Promise<ContentItem> {
  await new Promise(resolve => setTimeout(resolve, 100));
  const newItem: ContentItem = {
    ...itemData,
    id: Date.now().toString(), 
    createdAt: new Date().toISOString(),
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
    mockContentItems[itemIndex] = { ...mockContentItems[itemIndex], ...updates };
    return mockContentItems[itemIndex];
  }
  return undefined;
}

// Mock function for file upload, returns a placeholder URL
export async function uploadFile(file: File, path: string): Promise<string> {
  console.log(`Mock uploading file ${file.name} to ${path}`);
  await new Promise(resolve => setTimeout(resolve, 200)); 
  return 'https://placehold.co/600x400.png'; 
}
