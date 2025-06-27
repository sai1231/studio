
'use client';

import type React from 'react';
import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog';
import type { ContentItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2, Search as SearchIcon, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { searchContentItems, deleteContentItem } from '@/services/contentService';
import { useAuth } from '@/context/AuthContext';

const pageLoadingMessages = [
  "Searching through your memories...",
  "Looking for matches...",
  "Sifting through the digital haystack...",
];

function SearchResultsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const query = searchParams.get('q') || '';
  const zoneId = searchParams.get('zone');
  const contentType = searchParams.get('contentType');
  const tagsParam = searchParams.get('tags');
  const tagNames = useMemo(() => (tagsParam ? tagsParam.split(',') : []), [tagsParam]);

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

  const performSearch = useCallback(async () => {
    if (!user) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }
    
    // Don't perform search if there's no query and no filters
    const hasQuery = query.trim().length > 0;
    const hasFilters = !!zoneId || !!contentType || tagNames.length > 0;
    if (!hasQuery && !hasFilters) {
        setSearchResults([]);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const results = await searchContentItems(user.uid, query, { 
        zoneId, 
        contentType, 
        tagNames 
      });
      setSearchResults(results);
    } catch (err) {
      console.error("Error fetching search results:", err);
      setError("Failed to load search results. Please try again.");
      toast({ title: "Error", description: "Could not fetch search results.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [query, zoneId, contentType, tagNames, toast, user]);

  useEffect(() => {
    if (user) {
      performSearch();
    }
  }, [user, performSearch]);

  const handleOpenDetailDialog = (item: ContentItem) => {
    setSelectedItemIdForDetail(item.id);
    setIsDetailDialogOpen(true);
  };

  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    // Re-run the search to ensure the view is consistent with the latest data.
    performSearch();
    toast({ title: "Item Updated", description: `"${updatedItem.title}" has been updated.`});
  };

  const handleDeleteItem = async (itemIdToDelete: string) => {
    const itemTitle = searchResults.find(item => item.id === itemIdToDelete)?.title || "Item";
    
    // Optimistically remove the item from the UI
    setSearchResults(prev => prev.filter(item => item.id !== itemIdToDelete));

    const { id: toastId } = toast({ title: "Deleting Item...", description: `Removing "${itemTitle}".` });
    try {
      await deleteContentItem(itemIdToDelete);
      toast({ id: toastId, title: "Item Deleted", description: `"${itemTitle}" has been removed.`, variant: "default" });
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({ id: toastId, title: "Error Deleting", description: `Could not delete "${itemTitle}".`, variant: "destructive" });
      performSearch(); // Re-run search to restore item if deletion failed
    }
  };
  
  const hasActiveSearch = query.trim().length > 0 || !!zoneId || !!contentType || tagNames.length > 0;

  if (isLoading && hasActiveSearch) {
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
            <Button onClick={performSearch} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">Try Again</Button>
        </div>
    );
  }

  if (!hasActiveSearch) {
    return (
      <div className="container mx-auto py-8 text-center">
        <SearchIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-headline font-semibold text-foreground">Search Your Memories</h1>
        <p className="text-muted-foreground mt-2">Enter a term or use the advanced filters in the header to find content.</p>
      </div>
    );
  }

  const hasFilters = !!zoneId || !!contentType || tagNames.length > 0;

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-headline font-semibold text-foreground flex items-center">
              <SearchIcon className="h-7 w-7 mr-3 text-primary" />
                {query ? (
                    <>Search Results for: <span className="ml-2 font-bold text-primary">&quot;{query}&quot;</span></>
                ) : (
                    "Advanced Search Results"
                )}
            </h1>
            {hasFilters && <p className="text-muted-foreground mt-1">Filters are active. Click the filter icon in the header to modify.</p>}
        </div>
      </div>

      {searchResults.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">
            No items found matching your criteria.
          </h2>
          <p className="text-muted-foreground mt-2">
            Try a different search term or adjust your filters.
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
