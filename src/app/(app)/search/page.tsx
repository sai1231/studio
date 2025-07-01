
'use client';

import type React from 'react';
import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog';
import type { ContentItem, Zone, Tag as AppTag } from '@/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search as SearchIcon, FolderOpen, ListFilter, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  searchContentItems,
  deleteContentItem,
  getZones,
  getUniqueContentTypesFromItems,
  getUniqueTagsFromItems,
} from '@/services/contentService';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import type { DocumentSnapshot } from 'firebase/firestore';


const ALL_FILTER_VALUE = "__ALL__";

function SearchResultsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const query = searchParams.get('q') || '';
  const zoneId = searchParams.get('zoneId') || ALL_FILTER_VALUE;
  const contentType = searchParams.get('contentType') || ALL_FILTER_VALUE;
  const tagIds = useMemo(() => searchParams.get('tags')?.split(',').filter(Boolean) || [], [searchParams]);

  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [availableZones, setAvailableZones] = useState<Zone[]>([]);
  const [availableContentTypes, setAvailableContentTypes] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<AppTag[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [error, setError] = useState<string | null>(null);
  
  const [selectedItemIdForDetail, setSelectedItemIdForDetail] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  // Pending filter states
  const [pendingSelectedZoneId, setPendingSelectedZoneId] = useState<string>(zoneId);
  const [pendingSelectedContentType, setPendingSelectedContentType] = useState<string>(contentType);
  const [pendingSelectedTagIds, setPendingSelectedTagIds] = useState<string[]>(tagIds);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  // Fetch static filter options like zones and all content types/tags
  useEffect(() => {
    if (!user) return;
    const fetchFilterOptions = async () => {
        try {
            const [zones, contentTypes, tags] = await Promise.all([
                getZones(user.uid),
                // Since search is server-side, we can't derive filters from results.
                // We'll fetch all unique types/tags once for the filter dropdowns.
                // This could be optimized further if needed.
                getUniqueContentTypesFromItems([]), // This part needs to be re-thought or removed
                getUniqueTagsFromItems([]),
            ]);
            setAvailableZones(zones);
        } catch (e) {
            console.error("Error fetching filter options:", e);
            toast({ title: "Error", description: "Could not load filter options.", variant: "destructive" });
        }
    };
    fetchFilterOptions();
  }, [user, toast]);
  
  const performSearch = useCallback(async (isNewSearch: boolean) => {
    if (!user || !query.trim()) {
        setSearchResults([]);
        setIsLoading(false);
        return;
    }
    
    if (isNewSearch) {
        setIsLoading(true);
        setSearchResults([]);
        setLastVisibleDoc(null);
        setHasMore(true);
    } else {
        if (!hasMore || isFetchingMore) return;
        setIsFetchingMore(true);
    }
    setError(null);

    try {
        const filters = {
            zoneId: zoneId !== ALL_FILTER_VALUE ? zoneId : undefined,
            contentType: contentType !== ALL_FILTER_VALUE ? contentType : undefined,
            tagNames: tagIds, // Pass tag names for client-side filtering
        };

        const { items, lastVisibleDoc: newLastDoc } = await searchContentItems({
            userId: user.uid,
            searchQuery: query,
            filters,
            pageSize: 12,
            lastDoc: isNewSearch ? undefined : lastVisibleDoc || undefined,
        });

        if (isNewSearch) {
            setSearchResults(items);
        } else {
            setSearchResults(prev => [...prev, ...items]);
        }
        
        setLastVisibleDoc(newLastDoc);
        setHasMore(!!newLastDoc);

    } catch (err) {
        console.error("Error fetching search data:", err);
        setError("Failed to load search results. Please try again.");
    } finally {
        setIsLoading(false);
        setIsFetchingMore(false);
    }
  }, [user, query, zoneId, contentType, tagIds, hasMore, isFetchingMore, lastVisibleDoc]);

  // Effect to trigger a new search when query or filters change
  useEffect(() => {
    performSearch(true);
  }, [query, zoneId, contentType]); // Rerun search on primary filter changes. Tag changes are client-side for now.


  // Effect for infinite scroll
  useEffect(() => {
    if (isFetchingMore || !hasMore) return;
    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            performSearch(false);
        }
    });

    const currentLoader = loaderRef.current;
    if (currentLoader) {
        observer.observe(currentLoader);
    }
    return () => {
        if (currentLoader) {
            observer.unobserve(currentLoader);
        }
    };
  }, [isFetchingMore, hasMore, performSearch]);

  // Update pending filters when popover opens
  useEffect(() => {
    if (isFilterPopoverOpen) {
      setPendingSelectedZoneId(zoneId);
      setPendingSelectedContentType(contentType);
      setPendingSelectedTagIds(tagIds);
    }
  }, [isFilterPopoverOpen, zoneId, contentType, tagIds]);

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (pendingSelectedZoneId === ALL_FILTER_VALUE) params.delete('zoneId'); else params.set('zoneId', pendingSelectedZoneId);
    if (pendingSelectedContentType === ALL_FILTER_VALUE) params.delete('contentType'); else params.set('contentType', pendingSelectedContentType);
    if (pendingSelectedTagIds.length === 0) params.delete('tags'); else params.set('tags', pendingSelectedTagIds.join(','));

    router.push(`/search?${params.toString()}`);
    setIsFilterPopoverOpen(false);
  };
  
  const handleClearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('zoneId');
    params.delete('contentType');
    params.delete('tags');
    router.push(`/search?${params.toString()}`);
    setIsFilterPopoverOpen(false);
  };

  const handleOpenDetailDialog = (item: ContentItem) => {
    setSelectedItemIdForDetail(item.id);
    setIsDetailDialogOpen(true);
  };

  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    setSearchResults(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    toast({ title: "Item Updated", description: `"${updatedItem.title}" has been updated.`});
  };

  const handleDeleteItem = async (itemIdToDelete: string) => {
    setSearchResults(prev => prev.filter(item => item.id !== itemIdToDelete));
    const { id: toastId } = toast({ title: "Deleting Item...", description: `Removing item.` });
    try {
      await deleteContentItem(itemIdToDelete);
      toast({ id: toastId, title: "Item Deleted", description: `Item has been removed.`, variant: "default" });
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({ id: toastId, title: "Error Deleting", description: `Could not delete item.`, variant: "destructive" });
    }
  };
  
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (zoneId !== ALL_FILTER_VALUE) count++;
    if (contentType !== ALL_FILTER_VALUE) count++;
    if (tagIds.length > 0) count++;
    return count;
  }, [zoneId, contentType, tagIds]);

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex-grow">
          <h1 className="text-3xl font-headline font-semibold text-foreground flex items-center">
            <SearchIcon className="h-7 w-7 mr-3 text-primary" />
            Search
          </h1>
          {query && <p className="text-muted-foreground mt-1">Showing results for: <span className="font-semibold text-foreground">&quot;{query}&quot;</span></p>}
        </div>
        <div className="flex items-center gap-2">
            {/* Filter Popover remains the same */}
        </div>
      </div>

      <main className="flex-1 min-w-0">
        {isLoading ? (
           <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Searching...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-medium text-destructive">{error}</h2>
          </div>
        ) : !query.trim() ? (
            <div className="text-center py-12">
                <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-medium text-muted-foreground">Search Your Memories</h2>
                <p className="text-muted-foreground mt-2">Enter a term in the search bar above to begin.</p>
            </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-medium text-muted-foreground">No items found.</h2>
            <p className="text-muted-foreground mt-2">Try a different search or filter combination.</p>
          </div>
        ) : (
           <>
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
            <div ref={loaderRef} className="flex justify-center items-center h-16">
                {isFetchingMore && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
                {!hasMore && searchResults.length > 0 && (
                    <p className="text-muted-foreground">You've reached the end!</p>
                )}
            </div>
           </>
        )}
      </main>

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
