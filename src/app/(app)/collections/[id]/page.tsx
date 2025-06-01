
'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LinkCard from '@/components/core/link-card';
import type { LinkItem, Collection } from '@/types';
import { Button } from '@/components/ui/button';
import { LayoutGrid, LayoutList, ListFilter, FolderOpen, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock Data - Sourced and expanded from dashboard/page.tsx for broader coverage
const allMockLinks: LinkItem[] = [
  {
    id: '1',
    url: 'https://nextjs.org',
    title: 'Next.js by Vercel',
    description: 'The React Framework for the Web.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't2', name: 'nextjs' }, { id: 't1', name: 'productivity' }],
    collectionId: '1', // Work Projects
    createdAt: new Date().toISOString(),
    sentiment: { label: 'positive', score: 0.85 }
  },
  {
    id: '2',
    url: 'https://tailwindcss.com',
    title: 'Tailwind CSS',
    description: 'Rapidly build modern websites.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't3', name: 'design' }, { id: 't1', name: 'productivity' }],
    collectionId: '2', // Reading List
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    sentiment: { label: 'neutral', score: 0.15 }
  },
  {
    id: '3',
    url: 'https://www.figma.com',
    title: 'Figma',
    description: 'Collaborative interface design tool.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't3', name: 'design' }, { id: 't4', name: 'inspiration' }],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    sentiment: { label: 'positive', score: 0.92 }
  },
   {
    id: '4',
    url: 'https://openai.com/blog/chatgpt',
    title: 'ChatGPT Blog',
    description: 'Optimizing Language Models for Dialogue.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't5', name: 'ai' }, { id: 't1', name: 'productivity' }],
    collectionId: '1', // Work Projects
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    sentiment: { label: 'negative', score: -0.40 }
  },
  {
    id: '5',
    url: 'https://www.epicurious.com/recipes/food/views/our-favorite-macaroni-and-cheese-233022',
    title: 'Macaroni and Cheese Recipe',
    description: 'Classic mac and cheese recipe from Epicurious.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't6', name: 'cooking' }, { id: 't7', name: 'comfort food' }],
    collectionId: '3', // Recipes
    createdAt: new Date(Date.now() - 3*86400000).toISOString(),
    sentiment: { label: 'positive', score: 0.95 }
  },
  {
    id: '6',
    url: 'https://www.bbcgoodfood.com/recipes/collection/easy-dinner-recipes',
    title: 'Easy Dinner Recipes',
    description: 'Quick and easy dinner ideas from BBC Good Food.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't6', name: 'cooking' }, { id: 't8', name: 'weeknight meals' }],
    collectionId: '3', // Recipes
    createdAt: new Date(Date.now() - 4*86400000).toISOString(),
    sentiment: { label: 'positive', score: 0.88 }
  },
  {
    id: '7',
    url: 'https://www.nomadicmatt.com/travel-blogs/top-10-travel-destinations/',
    title: 'Top 10 Travel Destinations',
    description: 'Travel inspiration from Nomadic Matt.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't9', name: 'travel' }, { id: 't4', name: 'inspiration' }],
    collectionId: '4', // Travel Ideas
    createdAt: new Date(Date.now() - 5*86400000).toISOString(),
    sentiment: { label: 'positive', score: 0.90 }
  },
  {
    id: '8',
    url: 'https://www.lonelyplanet.com/articles',
    title: 'Lonely Planet Articles',
    description: 'Travel guides, tips, and articles.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't9', name: 'travel' }, { id: 't10', name: 'guides' }],
    collectionId: '4', // Travel Ideas
    createdAt: new Date(Date.now() - 6*86400000).toISOString(),
    sentiment: { label: 'neutral', score: 0.20 }
  }
];

const allMockCollections: Collection[] = [
  { id: '1', name: 'Work Projects' },
  { id: '2', name: 'Reading List' },
  { id: '3', name: 'Recipes' },
  { id: '4', name: 'Travel Ideas' },
];

export default function CollectionPage({ params }: { params: { id: string } }) {
  const collectionId = params.id;
  const router = useRouter();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [currentCollection, setCurrentCollection] = useState<Collection | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    setIsLoading(true);
    // Simulate fetching data
    const foundCollection = allMockCollections.find(c => c.id === collectionId);
    if (foundCollection) {
      setCurrentCollection(foundCollection);
      const collectionLinks = allMockLinks.filter(link => link.collectionId === collectionId);
      setLinks(collectionLinks);
    } else {
      setCurrentCollection(null);
      setLinks([]);
    }
    // Simulate delay for loading state
    setTimeout(() => setIsLoading(false), 500);
  }, [collectionId]);

  const handleEditLink = (linkToEdit: LinkItem) => {
    toast({ title: "Edit Action", description: `Editing "${linkToEdit.title}" (Not fully implemented on this page).`});
  };

  const handleDeleteLink = (linkIdToDelete: string) => {
    setLinks(prevLinks => prevLinks.filter(link => link.id !== linkIdToDelete));
    toast({ title: "Link Deleted", description: "The link has been removed from this collection view.", variant: "destructive" });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto py-2">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Collection...</p>
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

      {links.length === 0 ? (
        <div className="text-center py-12">
           <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">
            No links in "{currentCollection.name}" yet.
          </h2>
          <p className="text-muted-foreground mt-2">
            Add links to this collection via the "Add Link" button or by editing existing links.
          </p>
        </div>
      ) : (
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
          {links.map(link => (
            <LinkCard 
              key={link.id} 
              link={link}
              onEdit={handleEditLink}
              onDelete={handleDeleteLink}
            />
          ))}
        </div>
      )}
    </div>
  );
}
