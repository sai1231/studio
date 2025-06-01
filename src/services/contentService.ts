
'use server'; 

import type { ContentItem, Collection, Tag } from '@/types';

let mockContentItems: ContentItem[] = [
  {
    id: '1',
    type: 'link',
    url: 'https://nextjs.org',
    title: 'Next.js by Vercel',
    description: 'The React Framework for the Web.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't2', name: 'nextjs' }, { id: 't1', name: 'productivity' }],
    collectionId: '1',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
  },
  {
    id: '2',
    type: 'note',
    title: 'My Shopping List',
    description: 'Milk, Eggs, Bread, Coffee',
    tags: [{ id: 't-personal', name: 'personal' }, { id: 't-todos', name: 'todos' }],
    collectionId: '2',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
  },
  {
    id: '3',
    type: 'image',
    title: 'Awesome Landscape',
    description: 'A beautiful landscape picture I found.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't4', name: 'inspiration' }, {id: 't-nature', name: 'nature'}],
    collectionId: '1',
    createdAt: new Date().toISOString(),
  },
];

let mockCollections: Collection[] = [
  { id: '1', name: 'Work Projects' },
  { id: '2', name: 'Personal Errands' },
  { id: '3', name: 'Inspiration' },
];

// Function to get all content items
export async function getContentItems(userId?: string): Promise<ContentItem[]> {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  // TODO: Implement filtering by userId when authentication is in place
  return [...mockContentItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Function to get a single content item by ID
export async function getContentItemById(id: string): Promise<ContentItem | undefined> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return mockContentItems.find(item => item.id === id);
}

// Function to get all collections
export async function getCollections(userId?: string): Promise<Collection[]> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return [...mockCollections];
}

// Function to get a single collection by ID
export async function getCollectionById(id: string): Promise<Collection | undefined> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return mockCollections.find(collection => collection.id === id);
}


// Function to add a new content item
export async function addContentItem(
  itemData: Omit<ContentItem, 'id' | 'createdAt'>
): Promise<ContentItem> {
  await new Promise(resolve => setTimeout(resolve, 100));
  const newItem: ContentItem = {
    ...itemData,
    id: Date.now().toString(), // Simple ID generation for mock
    createdAt: new Date().toISOString(),
  };
  mockContentItems.unshift(newItem); // Add to the beginning like Firestore desc order
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
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate upload time
  // Return a generic placeholder or one based on file type if needed
  return 'https://placehold.co/600x400.png'; 
}
