
'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog'; 
import type { ContentItem, Collection } from '@/types';
import { Button } from '@/components/ui/button';
import { ListFilter, FolderOpen, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const pageLoadingMessages = [
  "Organizing your thoughts...",
  "Fetching your inspirations...",
  "Aligning your ideas...",
  "Connecting the dots...",
];

// Mock Data - This page uses its own mock data, will need to adapt ContentDetailDialog for it or ideally refactor to use contentService
const allMockContent: ContentItem[] = [
  {
    id: '1',
    type: 'link',
    url: 'https://nextjs.org',
    title: 'Next.js by Vercel',
    description: 'The React Framework for the Web.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't2', name: 'nextjs' }, { id: 't1', name: 'productivity' }],
    zoneId: '1', 
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'link',
    url: 'https://tailwindcss.com',
    title: 'Tailwind CSS',
    description: 'Rapidly build modern websites.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't3', name: 'design' }, { id: 't1', name: 'productivity' }],
    zoneId: '2', 
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    type: 'link',
    url: 'https://www.figma.com',
    title: 'Figma',
    description: 'Collaborative interface design tool.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't3', name: 'design' }, { id: 't4', name: 'inspiration' }],
    zoneId: '1', 
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
   {
    id: '4',
    type: 'link',
    url: 'https://openai.com/blog/chatgpt',
    title: 'ChatGPT Blog',
    description: 'Optimizing Language Models for Dialogue.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't5', name: 'ai' }, { id: 't1', name: 'productivity' }],
    zoneId: '1', 
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: 'note-coll-1',
    type: 'note',
    title: 'Meeting Notes - Project K',
    description: 'Discussed timeline for Q3.\nKey takeaway: Focus on core features first.',
    tags: [{id: 't-meeting', name: 'meeting'}, {id: 't-projectk', name: 'project k'}],
    zoneId: '1', 
    createdAt: new Date(Date.now() - 2*86400000).toISOString(),
  },
  {
    id: '5',
    type: 'link',
    url: 'https://www.epicurious.com/recipes/food/views/our-favorite-macaroni-and-cheese-233022',
    title: 'Macaroni and Cheese Recipe',
    description: 'Classic mac and cheese recipe from Epicurious.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't6', name: 'cooking' }, { id: 't7', name: 'comfort food' }],
    zoneId: '3', 
    createdAt: new Date(Date.now() - 3*86400000).toISOString(),
  },
];

const allMockCollections: Collection[] = [
  { id: '1', name: 'Work Projects' },
  { id: '2', name: 'Reading List' },
  { id: '3', name: 'Recipes' },
  { id: '4', name: 'Travel Ideas' },
];

const adaptMockItemForDialog = (item: ContentItem & { collectionId?: string }): ContentItem => {
  const { collectionId, ...rest } = item;
  return { ...rest, zoneId: item.zoneId || collectionId };
};


export default function CollectionPage({ params }: { params: { id: string } }) {
  const collectionId = params.id; 
  const router = useRouter();
  const [items, setItems] = useState<ContentItem[]>([]); 
  const [currentCollection, setCurrentCollection] = useState<Collection | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // Default to grid
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [clientLoadingMessage, setClientLoadingMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) {
      const randomIndex = Math.floor(Math.random() * pageLoadingMessages.length);
      setClientLoadingMessage(pageLoadingMessages[randomIndex]);
    }
  }, [isLoading]);

  const [selectedItemIdForDetail, setSelectedItemIdForDetail] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const foundCollection = allMockCollections.find(c => c.id === collectionId);
    if (foundCollection) {
      setCurrentCollection(foundCollection);
      const collectionItems = allMockContent.filter(item => (item as any).collectionId === collectionId || item.zoneId === collectionId);
      setItems(collectionItems.map(adaptMockItemForDialog)); 
    } else {
      setCurrentCollection(null);
      setItems([]);
    }
    setTimeout(() => setIsLoading(false), 500); 
  }, [collectionId]);

  const handleOpenDetailDialog = (item: ContentItem) => {
    setSelectedItemIdForDetail(item.id);
    setIsDetailDialogOpen(true);
  };

  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    setItems(prevItems => 
      prevItems.map(item => item.id === updatedItem.id ? adaptMockItemForDialog(updatedItem) : item)
    );
    if ((updatedItem.zoneId || (updatedItem as any).collectionId) !== collectionId) {
        setItems(prevItems => prevItems.filter(item => item.id !== updatedItem.id));
    }
    toast({ title: "Item Updated", description: `"${updatedItem.title}" has been updated.`});
  };

  const handleDeleteItem = (itemIdToDelete: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemIdToDelete));
    const itemTitle = allMockContent.find(i => i.id === itemIdToDelete)?.title || "Item";
    toast({ title: "Item Deleted", description: `"${itemTitle}" has been removed from this collection view (mock).`, variant: "destructive" });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto py-2">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          {clientLoadingMessage || pageLoadingMessages[0]}
        </p>
      </div>
    );
  }

  if (!currentCollection) {
     return (
        <div className="container mx-auto py-8 text-center">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-headline font-semibold text-destructive">Collection Not Found</h1>
            <p className="text-muted-foreground mt-2">The collection with ID "{collectionId}" could not be found.</p>
            <Button onClick={() => router.back()} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">Go Back</Button>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-headline font-semibold text-foreground">
          {currentCollection.name}
        </h1>
        <div className="flex items-center gap-2">
            <Button variant="outline">
                <ListFilter className="h-4 w-4 mr-2"/>
                Filters
            </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
           <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">
            No items in "{currentCollection.name}" yet.
          </h2>
          <p className="text-muted-foreground mt-2">
            Add items to this collection via the "Add Content" button.
          </p>
        </div>
      ) : (
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
          {items.map(item => (
            <ContentCard
              key={item.id}
              item={item}
              onEdit={handleOpenDetailDialog} 
              onDelete={handleDeleteItem}
            />
          ))}
        </div>
      )}
      {selectedItemIdForDetail && (
        <ContentDetailDialog
          itemId={selectedItemIdForDetail}
          open={isDetailDialogOpen}
          onOpenChange={(open) => {
            setIsDetailDialogOpen(open);
            if (!open) setSelectedItemIdForDetail(null);
          }}
          onItemUpdate={handleItemUpdateInDialog}
        />
      )}
    </div>
  );
}
