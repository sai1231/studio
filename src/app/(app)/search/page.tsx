
'use client';

import type React from 'react';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog';
import type { ContentItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2, Search as SearchIcon, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getContentItems, deleteContentItem } from '@/services/contentService';

const pageLoadingMessages = [
  "Searching through your memories...",
  "Looking for matches...",
  "Sifting through the digital haystack...",
];

function SearchResultsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const query = searchParams.get('q');

  const [allContentItems, setAllContentItems] = useState<ContentItem[]>([]);
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [clientLoadingMessage, setClientLoadingMessage] = useState<string | null>(null);
  const [selectedItemIdForDetail, setSelectedItemIdForDetail] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const randomIndex = Math.floor(Math.random() * pageLoadingMessages.length);
      setClientLoadingMessage(pageLoadingMessages[randomIndex]);
    }
  }, [isLoading]);

  const fetchDataAndFilter = useCallback(async () => {
    if (!query) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const items = await getContentItems();
      setAllContentItems(items); // Store all items in case detail dialog needs it or if query changes

      const lowerCaseQuery = query.toLowerCase();
      const filteredItems = items.filter(item => 
        item.title.toLowerCase().includes(lowerCaseQuery) ||
        (item.description && item.description.toLowerCase().includes(lowerCaseQuery))
      );
      setSearchResults(filteredItems);
    } catch (err) {
      console.error("Error fetching search results:", err);
      setError("Failed to load search results. Please try again.");
      toast({ title: "Error", description: "Could not fetch search results.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [query, toast]);

  useEffect(() => {
    fetchDataAndFilter();
  }, [fetchDataAndFilter]);

  const handleOpenDetailDialog = (item: ContentItem) => {
    setSelectedItemIdForDetail(item.id);
    setIsDetailDialogOpen(true);
  };

  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    // Update in allContentItems
    setAllContentItems(prevAll => 
      prevAll.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
    // Re-filter search results if the updated item might change its match status
    if (query) {
        const lowerCaseQuery = query.toLowerCase();
        const stillMatchesSearch = updatedItem.title.toLowerCase().includes(lowerCaseQuery) ||
                                 (updatedItem.description && updatedItem.description.toLowerCase().includes(lowerCaseQuery));
        
        setSearchResults(prevResults => {
            if (stillMatchesSearch) {
                return prevResults.map(item => item.id === updatedItem.id ? updatedItem : item);
            } else {
                return prevResults.filter(item => item.id !== updatedItem.id);
            }
        });
    }
    toast({ title: "Item Updated", description: `"${updatedItem.title}" has been updated.`});
  };

  const handleDeleteItem = async (itemIdToDelete: string) => {
    const itemTitle = searchResults.find(item => item.id === itemIdToDelete)?.title || allContentItems.find(item => item.id === itemIdToDelete)?.title || "Item";
    
    setAllContentItems(prev => prev.filter(item => item.id !== itemIdToDelete));
    setSearchResults(prev => prev.filter(item => item.id !== itemIdToDelete));

    const { id: toastId } = toast({ title: "Deleting Item...", description: `Removing "${itemTitle}".` });
    try {
      await deleteContentItem(itemIdToDelete);
      toast({ id: toastId, title: "Item Deleted", description: `"${itemTitle}" has been removed.`, variant: "default" });
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({ id: toastId, title: "Error Deleting", description: `Could not delete "${itemTitle}".`, variant: "destructive" });
      fetchDataAndFilter(); // Restore if deletion failed
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
        <div className="container mx-auto py-8 text-center">
            <SearchIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-headline font-semibold text-destructive">{error}</h1>
            <Button onClick={fetchDataAndFilter} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">Try Again</Button>
        </div>
    );
  }

  if (!query) {
    return (
      <div className="container mx-auto py-8 text-center">
        <SearchIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-headline font-semibold text-foreground">Search Your Memories</h1>
        <p className="text-muted-foreground mt-2">Enter a term in the search bar above to find content.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-headline font-semibold text-foreground flex items-center">
          <SearchIcon className="h-7 w-7 mr-3 text-primary" />
          Search Results for: <span className="ml-2 font-bold text-primary">&quot;{query}&quot;</span>
        </h1>
      </div>

      {searchResults.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">
            No items found matching &quot;{query}&quot;.
          </h2>
          <p className="text-muted-foreground mt-2">
            Try a different search term or broaden your query.
          </p>
        </div>
      ) : (
        <div className={'columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4'}>
          {searchResults.map(item => (
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

export default function SearchPage() {
  // Wrap with Suspense because useSearchParams() needs it for SSR components
  // or components not part of a Client Boundary that uses it.
  // Here, SearchResultsPageContent is a client component, but SearchPage itself might not be.
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto py-2">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading search...</p>
      </div>
    }>
      <SearchResultsPageContent />
    </Suspense>
  );
}
