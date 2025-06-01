
'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import type { ContentItem, Zone } from '@/types'; // Updated to Zone
import { Button } from '@/components/ui/button';
import { LayoutGrid, LayoutList, ListFilter, FolderOpen, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getContentItems, getZoneById } from '@/services/contentService'; // Updated to getZoneById

export default function ZonePage({ params }: { params: { id: string } }) { // Renamed from CollectionPage
  const zoneId = params.id; // Renamed from collectionId
  const router = useRouter();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [currentZone, setCurrentZone] = useState<Zone | null>(null); // Renamed from currentCollection
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      try {
        const foundZone = await getZoneById(zoneId); // Use new service function
        if (foundZone) {
          setCurrentZone(foundZone);
          const allContent = await getContentItems(); // Fetch all items
          const zoneItems = allContent.filter(item => item.zoneId === zoneId); // Filter by zoneId
          setItems(zoneItems);
        } else {
          setCurrentZone(null);
          setItems([]);
        }
      } catch (error) {
        console.error("Error fetching zone data:", error);
        toast({ title: "Error", description: "Could not load zone details.", variant: "destructive" });
        setCurrentZone(null);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [zoneId, toast]);

  const handleEditItem = (itemToEdit: ContentItem) => {
    toast({ title: "Edit Action", description: `Editing "${itemToEdit.title}" (Not fully implemented on this page).`});
  };

  const handleDeleteItem = async (itemIdToDelete: string) => {
    // For mock, we'd call a delete service function then refetch or filter locally
    setItems(prevItems => prevItems.filter(item => item.id !== itemIdToDelete));
    toast({ title: "Item Deleted", description: "The item has been removed from this zone view.", variant: "destructive" });
    // In a real app, you would call deleteContentItem(itemIdToDelete) and then refetch or update state.
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto py-2">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Zone...</p>
      </div>
    );
  }

  if (!currentZone) {
     return (
        <div className="container mx-auto py-8 text-center">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-headline font-semibold text-destructive">Zone Not Found</h1>
            <p className="text-muted-foreground mt-2">The zone with ID "{zoneId}" could not be found.</p>
            <Button onClick={() => router.back()} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">Go Back</Button>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-headline font-semibold text-foreground">
          {currentZone.name}
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
            No items in "{currentZone.name}" yet.
          </h2>
          <p className="text-muted-foreground mt-2">
            Add items to this zone via the "Add Content" button.
          </p>
        </div>
      ) : (
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
          {items.map(item => (
            <ContentCard
              key={item.id}
              item={item}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
