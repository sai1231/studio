
'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import type { ContentItem, Zone } from '@/types';
import { Button } from '@/components/ui/button';
import { LayoutGrid, LayoutList, ListFilter, FolderOpen, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getContentItems, getZoneById, deleteContentItem } from '@/services/contentService'; // Added deleteContentItem

export default function ZonePage({ params }: { params: { id: string } }) {
  const zoneId = params.id;
  const router = useRouter();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [currentZone, setCurrentZone] = useState<Zone | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchZoneData = async () => { // Renamed for clarity
    setIsLoading(true);
    try {
      const foundZone = await getZoneById(zoneId);
      if (foundZone) {
        setCurrentZone(foundZone);
        const allContent = await getContentItems();
        const zoneItems = allContent.filter(item => item.zoneId === zoneId);
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

  useEffect(() => {
    fetchZoneData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId, toast]); // fetchZoneData is not added to deps to avoid re-fetch on every render if not memoized

  const handleEditItem = (itemToEdit: ContentItem) => {
    // This would typically open a dialog or navigate to an edit page
    // For now, using a toast and potentially navigating to a generic edit page or opening AddContentDialog
    toast({ title: "Edit Action", description: `Editing "${itemToEdit.title}" (Not fully implemented on this page).`});
    // Example: router.push(`/dashboard?edit=${itemToEdit.id}`); // Or open AddContentDialog in edit mode
  };

  const handleDeleteItem = async (itemIdToDelete: string) => {
    const itemTitle = items.find(item => item.id === itemIdToDelete)?.title || "Item";
    const { id: toastId } = toast({ title: "Deleting Item...", description: `Removing "${itemTitle}".`});
    try {
      await deleteContentItem(itemIdToDelete);
      toast({ id: toastId, title: "Item Deleted", description: `"${itemTitle}" has been removed.`, variant: "default" });
      fetchZoneData(); // Refetch data for the zone
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({ id: toastId, title: "Error Deleting", description: `Could not delete "${itemTitle}".`, variant: "destructive"});
    }
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
        <div className={viewMode === 'grid' ? 'columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4' : 'grid grid-cols-1 gap-4'}>
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
