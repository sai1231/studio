
'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog';
import type { ContentItem } from '@/types';
import { Button } from '@/components/ui/button';
import { ClipboardList, FolderOpen, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getContentItems, deleteContentItem } from '@/services/contentService';

const pageLoadingMessages = [
  "Categorizing your content...",
  "Filtering by type...",
  "Sorting your collection...",
];

// Helper to get a display name for content types (could be expanded)
const getContentTypeDisplayName = (contentTypeKey: string): string => {
  // Basic camelCase to Title Case, or just return the key
  return contentTypeKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

export default function ContentTypePage() {
  const params = useParams() as { contentTypeName: string } | null;
  const router = useRouter();
  const { toast } = useToast();

  const [decodedContentTypeName, setDecodedContentTypeName] = useState<string>('');
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
    if (params && params.contentTypeName) {
      try {
        const name = decodeURIComponent(params.contentTypeName);
        setDecodedContentTypeName(name);
      } catch (e) {
        console.error("Error decoding content type name:", e);
        toast({ title: "Error", description: "Invalid content type name in URL.", variant: "destructive" });
        setDecodedContentTypeName('');
      }
    } else {
      setDecodedContentTypeName('');
       if (typeof window !== 'undefined' && params === null) {
          console.warn("ContentTypePage: params or params.contentTypeName is not available.");
      }
    }
  }, [params, toast]);

  const fetchItemsByContentType = useCallback(async () => {
    if (!decodedContentTypeName) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const allContent = await getContentItems();
      const lowerCaseContentType = decodedContentTypeName.toLowerCase();
      const typeItems = allContent.filter(item =>
        item.contentType && item.contentType.toLowerCase() === lowerCaseContentType
      );
      setItems(typeItems);
    } catch (error) {
      console.error("Error fetching items for content type:", error);
      toast({ title: "Error", description: `Could not load items for type "${decodedContentTypeName}".`, variant: "destructive" });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [decodedContentTypeName, toast]);

  useEffect(() => {
    if (decodedContentTypeName) {
      fetchItemsByContentType();
    } else {
      setItems([]);
      setIsLoading(false);
    }
  }, [decodedContentTypeName, fetchItemsByContentType]);

  const handleOpenDetailDialog = (item: ContentItem) => {
    setSelectedItemIdForDetail(item.id);
    setIsDetailDialogOpen(true);
  };

  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    const lowerCaseContentType = decodedContentTypeName.toLowerCase();
    const stillMatchesType = updatedItem.contentType && updatedItem.contentType.toLowerCase() === lowerCaseContentType;

    if (stillMatchesType) {
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
      fetchItemsByContentType(); 
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({ id: toastId, title: "Error Deleting", description: `Could not delete "${itemTitle}".`, variant: "destructive" });
    }
  };
  
  if (isLoading && !decodedContentTypeName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto py-2">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading content type information...</p>
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

  if (!decodedContentTypeName && !isLoading) {
    return (
        <div className="container mx-auto py-8 text-center">
            <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-headline font-semibold text-destructive">Invalid Content Type</h1>
            <p className="text-muted-foreground mt-2">The specified content type could not be processed.</p>
            <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">Go to Dashboard</Button>
        </div>
    );
  }

  const displayName = getContentTypeDisplayName(decodedContentTypeName);

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-headline font-semibold text-foreground flex items-center">
          <ClipboardList className="h-7 w-7 mr-3 text-primary" />
          Content Type: <span className="ml-2 font-bold text-primary">{displayName}</span>
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">
            No items found for type "{displayName}".
          </h2>
          <p className="text-muted-foreground mt-2">
            Save content of this type to see it here.
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

