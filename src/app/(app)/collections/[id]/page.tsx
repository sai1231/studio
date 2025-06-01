
'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog'; // Import the new dialog
import type { ContentItem, Collection } from '@/types';
import { Button } from '@/components/ui/button';
import { LayoutGrid, LayoutList, ListFilter, FolderOpen, Loader2 } from 'lucide-react';
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
    imageUrl: 'https://source.unsplash.com/600x400/?nextjs,framework',
    tags: [{ id: 't2', name: 'nextjs' }, { id: 't1', name: 'productivity' }],
    // collectionId: '1', // This should be zoneId now, but CollectionPage still uses collectionId
    zoneId: '1', // Assuming '1' maps to 'Work Projects'
    createdAt: new Date().toISOString(),
    // sentiment: { label: 'positive', score: 0.85 } // Sentiment removed for now
  },
  {
    id: '2',
    type: 'link',
    url: 'https://tailwindcss.com',
    title: 'Tailwind CSS',
    description: 'Rapidly build modern websites.',
    imageUrl: 'https://source.unsplash.com/600x400/?tailwindcss,css',
    tags: [{ id: 't3', name: 'design' }, { id: 't1', name: 'productivity' }],
    zoneId: '2', // Assuming '2' maps to 'Reading List'
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    type: 'link',
    url: 'https://www.figma.com',
    title: 'Figma',
    description: 'Collaborative interface design tool.',
    imageUrl: 'https://source.unsplash.com/600x400/?figma,design,tool',
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
    imageUrl: 'https://source.unsplash.com/600x400/?openai,chatgpt,ai',
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
    imageUrl: 'https://source.unsplash.com/600x400/?macaroni,cheese,recipe',
    tags: [{ id: 't6', name: 'cooking' }, { id: 't7', name: 'comfort food' }],
    zoneId: '3', // Assuming '3' maps to 'Recipes'
    createdAt: new Date(Date.now() - 3*86400000).toISOString(),
  },
];

// This Collection type might need to be aligned with Zone or phased out
const allMockCollections: Collection[] = [
  { id: '1', name: 'Work Projects' },
  { id: '2', name: 'Reading List' },
  { id: '3', name: 'Recipes' },
  { id: '4', name: 'Travel Ideas' },
];

// Helper to adapt collectionId to zoneId for ContentItem from this page's mock data
const adaptMockItemForDialog = (item: ContentItem & { collectionId?: string }): ContentItem => {
  const { collectionId, ...rest } = item;
  // If zoneId is not present, use collectionId as zoneId for compatibility with ContentDetailDialog
  // This is a temporary measure for this page's specific mock data structure.
  // Ideally, this page's mock data should also use zoneId.
  return { ...rest, zoneId: item.zoneId || collectionId };
};


export default function CollectionPage({ params }: { params: { id: string } }) {
  const collectionId = params.id; // This page still uses collectionId in its route
  const router = useRouter();
  const [items, setItems] = useState<ContentItem[]>([]); 
  const [currentCollection, setCurrentCollection] = useState<Collection | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(
    pageLoadingMessages[Math.floor(Math.random() * pageLoadingMessages.length)]
  );

  useEffect(() => {
    if (isLoading) {
      const randomIndex = Math.floor(Math.random() * pageLoadingMessages.length);
      setCurrentLoadingMessage(pageLoadingMessages[randomIndex]);
    }
  }, [isLoading]);

  // State for the ContentDetailDialog
  const [selectedItemIdForDetail, setSelectedItemIdForDetail] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const foundCollection = allMockCollections.find(c => c.id === collectionId);
    if (foundCollection) {
      setCurrentCollection(foundCollection);
      // Filter mockContent based on collectionId (this page's specific logic)
      const collectionItems = allMockContent.filter(item => (item as any).collectionId === collectionId || item.zoneId === collectionId);
      setItems(collectionItems.map(adaptMockItemForDialog)); // Adapt items
    } else {
      setCurrentCollection(null);
      setItems([]);
    }
    setTimeout(() => setIsLoading(false), 500); // Simulate loading
  }, [collectionId]);

  const handleOpenDetailDialog = (item: ContentItem) => {
    setSelectedItemIdForDetail(item.id);
    setIsDetailDialogOpen(true);
  };

  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    // Since this page uses its own mock data, we update it directly
    setItems(prevItems => 
      prevItems.map(item => item.id === updatedItem.id ? adaptMockItemForDialog(updatedItem) : item)
    );
    // If the item's zone (or collection for this page) changes, it might need to be removed from view
    // This logic might need to be more robust if zoneId is truly distinct from collectionId here.
    if ((updatedItem.zoneId || (updatedItem as any).collectionId) !== collectionId) {
        setItems(prevItems => prevItems.filter(item => item.id !== updatedItem.id));
    }
    toast({ title: "Item Updated", description: `"${updatedItem.title}" has been updated.`});
  };

  const handleDeleteItem = (itemIdToDelete: string) => {
    // Delete from this page's local mock data
    setItems(prevItems => prevItems.filter(item => item.id !== itemIdToDelete));
    const itemTitle = allMockContent.find(i => i.id === itemIdToDelete)?.title || "Item";
    toast({ title: "Item Deleted", description: `"${itemTitle}" has been removed from this collection view (mock).`, variant: "destructive" });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto py-2">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{currentLoadingMessage}</p>
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
            <Button variant="outline" size="icon" onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-accent text-accent-foreground' : ''}>
                <LayoutGrid className="h-4 w-4"/>
                <span className="sr-only">Grid View</span>
            </Button>
            <Button variant="outline" size="icon" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-accent text-accent-foreground' : ''}>
                <LayoutList className="h-4 w-4"/>
                <span className="sr-only">List View</span>
            </Button>
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
              onEdit={handleOpenDetailDialog} // Use the new handler
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
