
'use client';
import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog'; // Import the new dialog
import type { ContentItem, Zone as AppZone, Tag as AppTag } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, ListFilter, LayoutGrid, LayoutList, Loader2, FolderOpen } from 'lucide-react';
import AddContentDialog from '@/components/core/add-content-dialog';
import { useToast } from '@/hooks/use-toast';
import { getContentItems, addContentItem, deleteContentItem, getZones } from '@/services/contentService';

const pageLoadingMessages = [
  "Organizing your thoughts...",
  "Fetching your inspirations...",
  "Aligning your ideas...",
  "Connecting the dots...",
];

export default function DashboardPage() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [zones, setZones] = useState<AppZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isAddContentDialogOpen, setIsAddContentDialogOpen] = useState(false);
  // State for the ContentDetailDialog
  const [selectedItemIdForDetail, setSelectedItemIdForDetail] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { toast } = useToast();

  const [clientLoadingMessage, setClientLoadingMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) {
      const randomIndex = Math.floor(Math.random() * pageLoadingMessages.length);
      setClientLoadingMessage(pageLoadingMessages[randomIndex]);
    }
  }, [isLoading]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [items, fetchedZones] = await Promise.all([
        getContentItems(),
        getZones()
      ]);
      setContentItems(items);
      setZones(fetchedZones);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load content. Please try again later.");
      toast({ title: "Error", description: "Could not fetch content.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddOrUpdateContentDialog = async (
    contentData: Omit<ContentItem, 'id' | 'createdAt'>
  ) => {
    const { id: toastId } = toast({
      title: "Saving Content...",
      description: "Please wait while your content is being saved.",
    });
    try {
      await addContentItem(contentData); 
      toast({
        id: toastId,
        title: "Content Saved!",
        description: `"${contentData.title}" has been successfully saved.`,
      });
      setIsAddContentDialogOpen(false);
      fetchData(); 
    } catch (error) {
      console.error("Error saving content from dialog:", error);
      toast({
        id: toastId,
        title: "Error Saving Content",
        description: "Could not save your content. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOpenDetailDialog = (item: ContentItem) => {
    setSelectedItemIdForDetail(item.id);
    setIsDetailDialogOpen(true);
  };

  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    // Option 1: Refetch all data
    // fetchData();
    // Option 2: Update specific item in local state (more performant)
    setContentItems(prevItems => 
      prevItems.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
    toast({ title: "Item Updated", description: `"${updatedItem.title}" has been updated.`});
  };

  const handleDeleteContent = async (itemId: string) => {
    const originalItems = [...contentItems];
    setContentItems(prevItems => prevItems.filter(item => item.id !== itemId)); 
    const {id: toastId} = toast({ title: "Deleting Item...", description: "Removing content item."});
    try {
      await deleteContentItem(itemId);
      toast({id: toastId, title: "Content Deleted", description: "The item has been removed.", variant: "default"});
      fetchData(); // Refetch to ensure consistency, or could also just update local state
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({id: toastId, title: "Error Deleting", description: "Could not delete item. Restoring.", variant: "destructive"});
      setContentItems(originalItems); 
    }
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

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center text-destructive">
        <FolderOpen className="h-16 w-16 mx-auto text-destructive mb-4" />
        <h1 className="text-2xl font-headline font-semibold">Error Loading Content</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button onClick={fetchData} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-headline font-semibold text-foreground">My Content</h1>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-accent text-accent-foreground' : ''} aria-label="Grid View">
                <LayoutGrid className="h-4 w-4"/>
            </Button>
            <Button variant="outline" size="icon" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-accent text-accent-foreground' : ''} aria-label="List View">
                <LayoutList className="h-4 w-4"/>
            </Button>
            <Button variant="outline">
                <ListFilter className="h-4 w-4 mr-2"/>
                Filters
            </Button>
        </div>
      </div>

      {contentItems.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">No content saved yet.</h2>
          <p className="text-muted-foreground mt-2">Start by adding your first item!</p>
          <Button onClick={() => { setIsAddContentDialogOpen(true);}} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Your First Item
          </Button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4' : 'grid grid-cols-1 gap-4'}>
          {contentItems.map(item => (
            <ContentCard
              key={item.id}
              item={item}
              onEdit={handleOpenDetailDialog} // Changed to open the detail dialog
              onDelete={handleDeleteContent}
            />
          ))}
        </div>
      )}
      <AddContentDialog
        open={isAddContentDialogOpen}
        onOpenChange={setIsAddContentDialogOpen}
        zones={zones}
        onContentAdd={handleAddOrUpdateContentDialog}
      />
      {selectedItemIdForDetail && (
        <ContentDetailDialog
          itemId={selectedItemIdForDetail}
          open={isDetailDialogOpen}
          onOpenChange={(open) => {
            setIsDetailDialogOpen(open);
            if (!open) setSelectedItemIdForDetail(null); // Reset selected ID when dialog closes
          }}
          onItemUpdate={handleItemUpdateInDialog}
        />
      )}
    </div>
  );
}
