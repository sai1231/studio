
'use client';
import type React from 'react';
import { useState, useEffect } from 'react';
import ContentCard from '@/components/core/link-card';
import type { ContentItem, Collection } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, ListFilter, LayoutGrid, LayoutList } from 'lucide-react';
import AddContentDialog from '@/components/core/add-content-dialog';
import { useToast } from '@/hooks/use-toast';

// Mock Data - replace with actual data fetching
const mockInitialContent: ContentItem[] = [
  {
    id: '1',
    type: 'link',
    url: 'https://nextjs.org',
    title: 'Next.js by Vercel - The React Framework for the Web',
    description: 'Next.js enables you to create full-stack Web applications by extending the latest React features, and integrating powerful Rust-based JavaScript tooling for the fastest builds.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't2', name: 'nextjs' }, { id: 't1', name: 'productivity' }],
    collectionId: '1',
    createdAt: new Date().toISOString(),
    sentiment: { label: 'positive', score: 0.85 }
  },
  {
    id: 'note-1',
    type: 'note',
    title: 'Quick Idea for Klipped App',
    description: 'Consider adding a feature for collaborative collections. \nUsers could share a collection with friends or colleagues.\n\n- Permissions (view, edit)\n- Real-time updates?',
    tags: [{id: 't-feature', name: 'feature idea'}, {id: 't-klipped', name: 'klipped'}],
    collectionId: '1',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: 'img-1',
    type: 'image',
    title: 'Abstract Background',
    description: 'A cool abstract background image found online.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't-img', name: 'image' }, { id: 't-abstract', name: 'abstract' }],
    collectionId: '2',
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
  },
  {
    id: '2',
    type: 'link',
    url: 'https://tailwindcss.com',
    title: 'Tailwind CSS - Rapidly build modern websites without ever leaving your HTML.',
    description: 'A utility-first CSS framework packed with classes like flex, pt-4, text-center and rotate-90 that can be composed to build any design, directly in your markup.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't3', name: 'design' }, { id: 't1', name: 'productivity' }],
    collectionId: '2',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    sentiment: { label: 'neutral', score: 0.15 }
  },
  {
    id: '3',
    type: 'link',
    url: 'https://www.figma.com',
    title: 'Figma: the collaborative interface design tool.',
    description: 'Figma is a vector graphics editor and prototyping tool which is primarily web-based, with additional offline features enabled by desktop applications for macOS and Windows.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't3', name: 'design' }, { id: 't4', name: 'inspiration' }],
    createdAt: new Date(Date.now() - 172800000).toISOString(), // Two days ago
    sentiment: { label: 'positive', score: 0.92 }
  },
   {
    id: '4',
    type: 'link',
    url: 'https://openai.com/blog/chatgpt',
    title: 'ChatGPT: Optimizing Language Models for Dialogue',
    description: 'We’ve trained a model called ChatGPT which interacts in a conversational way. The dialogue format makes it possible for ChatGPT to answer followup questions, admit its mistakes, challenge incorrect premises, and reject inappropriate requests.',
    imageUrl: 'https://placehold.co/600x400.png',
    tags: [{ id: 't5', name: 'ai' }, { id: 't1', name: 'productivity' }],
    collectionId: '1',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    sentiment: { label: 'negative', score: -0.40 }
  },
];

const mockCollections: Collection[] = [
  { id: '1', name: 'Work Projects' },
  { id: '2', name: 'Reading List' },
];


export default function DashboardPage() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isAddContentDialogOpen, setIsAddContentDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { toast } = useToast();

  useEffect(() => {
    setContentItems(mockInitialContent);
  }, []);

  const handleAddContent = (newContentData: Omit<ContentItem, 'id' | 'createdAt'>) => {
    let finalImageUrl = newContentData.imageUrl;
    if (newContentData.type === 'link' && !newContentData.imageUrl) {
      // Only set placeholder for links if no imageUrl is provided (e.g. from AI or manual input)
      finalImageUrl = `https://placehold.co/600x400.png?text=${encodeURIComponent(newContentData.title.substring(0,15))}`;
    } else if (newContentData.type === 'image' && !newContentData.imageUrl) {
      // This case should ideally not happen if image upload is mandatory for 'image' type.
      // If it can, use a generic placeholder.
      finalImageUrl = `https://placehold.co/600x400.png?text=Image`;
    }


    const newItem: ContentItem = {
      ...newContentData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      imageUrl: finalImageUrl, // Use the determined imageUrl
    };
    setContentItems(prevItems => [newItem, ...prevItems]);
    toast({ title: "Content Added", description: `"${newItem.title}" has been successfully saved.` });
    setIsAddContentDialogOpen(false);
    setEditingContent(null);
  };

  const handleEditContent = (itemToEdit: ContentItem) => {
    setEditingContent(itemToEdit);
    setIsAddContentDialogOpen(true);
    // For now, direct edit functionality isn't fully wired up beyond opening the dialog.
  };

  const handleDeleteContent = (itemId: string) => {
    setContentItems(prevItems => prevItems.filter(item => item.id !== itemId));
    toast({ title: "Content Deleted", description: "The item has been removed.", variant: "destructive" });
  };

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-headline font-semibold text-foreground">My Content</h1>
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

      {contentItems.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-muted-foreground">No content saved yet.</h2>
          <p className="text-muted-foreground mt-2">Start by adding your first item!</p>
          <Button onClick={() => { setEditingContent(null); setIsAddContentDialogOpen(true);}} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Your First Item
          </Button>
        </div>
      ) : (
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
          {contentItems.map(item => (
            <ContentCard
              key={item.id}
              item={item}
              onEdit={handleEditContent}
              onDelete={handleDeleteContent}
            />
          ))}
        </div>
      )}
      <AddContentDialog
        open={isAddContentDialogOpen}
        onOpenChange={setIsAddContentDialogOpen}
        collections={mockCollections}
        onContentAdd={handleAddContent}
        // existingContent={editingContent} // For full edit functionality
      />
    </div>
  );
}

    