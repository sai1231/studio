
'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog';
import type { ContentItem, Tag } from '@/types';
import { Button } from '@/components/ui/button';
import { Tag as TagIcon, FolderOpen, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getContentItems, deleteContentItem } from '@/services/contentService';

const pageLoadingMessages = [
  "Gathering tagged items...",
  "Finding relevant content...",
  "Sifting through your thoughts...",
];

export default function TagPage() {
  const params = useParams() as { tagName: string } | null;
  const router = useRouter();
  const { toast } = useToast();

  const [decodedTagName, setDecodedTagName] = useState<string>('');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clientLoadingMessage, setClientLoadingMessage] = useState<string | null>(null);

  const [selectedItemIdForDetail, setSelectedItemIdForDetail] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const randomIndex = Math.floor(Math.random() * pageLoadingMessages.length);
      setClientLoadingMessage(pageLoadingMessages[randomIndex]);
    }
  }, [isLoading]);

  useEffect(() => {
    if (params && params.tagName) {
      try {
        const name = decodeURIComponent(params.tagName);
        setDecodedTagName(name);
      } catch (e) {
        console.error("Error decoding tag name:", e);
        toast({ title: "Error", description: "Invalid tag name in URL.", variant: "destructive" });
        setDecodedTagName(''); // Set to empty or an invalid marker
      }
    } else {
      // Handle cases where params or params.tagName is not available
      // This might indicate an issue if the page is not part of a dynamic route segment
      // or if params are null initially.
      setDecodedTagName('');
      if (typeof window !== 'undefined' && params === null) {
          // Could redirect or show specific error if params are unexpectedly null
          // For now, fetching will be skipped if decodedTagName is empty.
          console.warn("TagPage: params or params.tagName is not available.");
      }
    }
  }, [params, toast]);

  const fetchItemsByTag = useCallback(async () => {
    if (!decodedTagName) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const allContent = await getContentItems();
      const lowerCaseTagName = decodedTagName.toLowerCase();
      const taggedItems = allContent.filter(item =>
        item.tags.some(tag => tag.name.toLowerCase() === lowerCaseTagName)
      );
      setItems(taggedItems);
    } catch (error) {
      console.error("Error fetching items for tag:", error);
      toast({ title: "Error", description: `Could not load items for tag "${decodedTagName}".`, variant: "destructive" });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [decodedTagName, toast]);

  useEffect(() => {
    // Only fetch if decodedTagName is set (avoids fetching for empty/invalid tags)
    if (decodedTagName) {
      fetchItemsByTag();
    } else {
      // If decodedTagName is empty (e.g., due to invalid params), clear items and stop loading.
      setItems([]);
      setIsLoading(false);
    }
  }, [decodedTagName, fetchItemsByTag]);

  const handleOpenDetailDialog = (item: ContentItem) => {
    setSelectedItemIdForDetail(item.id);
    setIsDetailDialogOpen(true);
  };

  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    const lowerCaseTagName = decodedTagName.toLowerCase();
    const stillHasTag = updatedItem.tags.some(tag => tag.name.toLowerCase() === lowerCaseTagName);

    if (stillHasTag) {
      setItems(prevItems =>
        prevItems.map(item => item.id === updatedItem.id ? updatedItem : item)
      );
    } else {
      setItems(prevItems => prevItems.filter(item => item.id !== updatedItem.id));
    }
    toast({ title: "Item Updated", description: `"${updatedItem.title}" has been updated.` });
  };

  const handleDeleteItem = async (itemIdToDelete: string) => {
    const itemTitle = items.find(item => item.id === itemIdToDelete)?.title || "Item";
    const { id: toastId } = toast({ title: "Deleting Item...", description: `Removing "${itemTitle}".` });
    try {
      await deleteContentItem(itemIdToDelete);
      toast({ id: toastId, title: "Item Deleted", description: `"${itemTitle}" has been removed.`, variant: "default" });
      fetchItemsByTag(); 
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({ id: toastId, title: "Error Deleting", description: `Could not delete "${itemTitle}".`, variant: "destructive" });
    }
  };

  if (isLoading && !decodedTagName) { // Initial load or invalid tag before decodedTagName is set
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto py-2">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading tag information...</p>
      </div>
    );
  }
  
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
  
  if (!decodedTagName && !isLoading) { // Case where tagName was invalid or not found, and not loading
    return (
        <div className="container mx-auto py-8 text-center">
            <TagIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-headline font-semibold text-destructive">Invalid Tag</h1>
            <p className="text-muted-foreground mt-2">The specified tag could not be processed.</p>
            <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">Go to Dashboard</Button>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-headline font-semibold text-foreground flex items-center">
          <TagIcon className="h-7 w-7 mr-3 text-primary" />
          Items tagged with: <span className="ml-2 font-bold text-primary">#{decodedTagName}</span>
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">
            No items found for tag "#{decodedTagName}".
          </h2>
          <p className="text-muted-foreground mt-2">
            Try adding this tag to some content items.
          </p>
        </div>
      ) : (
        <div className={'columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4'}>
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
