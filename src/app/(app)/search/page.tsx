
'use client';

import type React from 'react';
import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog';
import type { ContentItem, Zone, Tag as AppTag, SearchFilters } from '@/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search as SearchIcon, FolderOpen, ListFilter, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteContentItem, getZones, getContentItems } from '@/services/contentService';
import { useAuth } from '@/context/AuthContext';
import { useSearch } from '@/context/SearchContext';

const ALL_FILTER_VALUE = "__ALL__";

function SearchResultsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const query = searchParams.get('q') || '';
  const zoneId = searchParams.get('zoneId') || ALL_FILTER_VALUE;
  const contentType = searchParams.get('contentType') || ALL_FILTER_VALUE;
  const tagNames = useMemo(() => searchParams.get('tags')?.split(',').filter(Boolean) || [], [searchParams]);

  const {
    searchResults,
    isLoading: isSearchLoading,
    isInitialized,
    search,
    availableTags,
    availableContentTypes,
  } = useSearch();

  const [availableZones, setAvailableZones] = useState<Zone[]>([]);
  
  const [selectedItemIdForDetail, setSelectedItemIdForDetail] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Pending filter states
  const [pendingSelectedZoneId, setPendingSelectedZoneId] = useState<string>(zoneId);
  const [pendingSelectedContentType, setPendingSelectedContentType] = useState<string>(contentType);
  const [pendingSelectedTagNames, setPendingSelectedTagNames] = useState<string[]>(tagNames);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  // Fetch static filter options (zones) once
  useEffect(() => {
    if (!user) return;
    const fetchFilterOptions = async () => {
        try {
            const zones = await getZones(user.uid);
            setAvailableZones(zones);
        } catch (e) {
            console.error("Error fetching filter options:", e);
            toast({title: "Error", description: "Could not load zone filter options.", variant: "destructive"});
        }
    };
    fetchFilterOptions();
  }, [user, toast]);

  // Perform search when query or filters change
  useEffect(() => {
    if (!user || !isInitialized) return;

    // Do not search if query is empty and no filters are applied
    if (!query.trim() && zoneId === ALL_FILTER_VALUE && contentType === ALL_FILTER_VALUE && tagNames.length === 0) {
        search('', {}); // Clear results if no query/filters
        return;
    }
    
    const filters: SearchFilters = {
        zoneId: zoneId !== ALL_FILTER_VALUE ? zoneId : undefined,
        contentType: contentType !== ALL_FILTER_VALUE ? contentType : undefined,
        tagNames: tagNames,
    };
    search(query, filters);
  }, [user, query, zoneId, contentType, tagNames, isInitialized, search]);

  // Update pending filters when popover opens
  useEffect(() => {
    if (isFilterPopoverOpen) {
      setPendingSelectedZoneId(zoneId);
      setPendingSelectedContentType(contentType);
      setPendingSelectedTagNames(tagNames);
    }
  }, [isFilterPopoverOpen, zoneId, contentType, tagNames]);

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (pendingSelectedZoneId === ALL_FILTER_VALUE) params.delete('zoneId'); else params.set('zoneId', pendingSelectedZoneId);
    if (pendingSelectedContentType === ALL_FILTER_VALUE) params.delete('contentType'); else params.set('contentType', pendingSelectedContentType);
    if (pendingSelectedTagNames.length === 0) params.delete('tags'); else params.set('tags', pendingSelectedTagNames.join(','));

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
    // The search context handles the update automatically via the real-time listener.
    // No need to manually update search results here.
    toast({ title: "Item Updated", description: `"${updatedItem.title}" has been updated.`});
  };

  const handleDeleteItem = async (itemIdToDelete: string) => {
    const { id: toastId } = toast({ title: "Deleting Item...", description: `Removing item.` });
    try {
      await deleteContentItem(itemIdToDelete);
      // The search context handles the removal automatically.
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
    if (tagNames.length > 0) count++;
    return count;
  }, [zoneId, contentType, tagNames]);

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
            <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="relative">
                        <ListFilter className="h-4 w-4 mr-2"/>
                        Filters
                        {activeFilterCount > 0 && (
                           <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                             {activeFilterCount}
                           </span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 space-y-4" align="end">
                    <div className="space-y-1">
                        <Label htmlFor="zone-filter-search" className="text-sm font-medium">Zone</Label>
                        <Select value={pendingSelectedZoneId} onValueChange={setPendingSelectedZoneId}>
                            <SelectTrigger id="zone-filter-search">
                                <SelectValue placeholder="All Zones" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_FILTER_VALUE}>All Zones</SelectItem>
                                {availableZones.map(zone => (
                                    <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="content-type-filter-search" className="text-sm font-medium">Content Type</Label>
                        <Select value={pendingSelectedContentType} onValueChange={setPendingSelectedContentType}>
                            <SelectTrigger id="content-type-filter-search">
                                <SelectValue placeholder="All Content Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_FILTER_VALUE}>All Content Types</SelectItem>
                                {availableContentTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Tags</Label>
                        {availableTags.length > 0 ? (
                            <ScrollArea className="h-32 rounded-md border p-2">
                                <div className="space-y-1.5">
                                {availableTags.map(tag => (
                                    <div key={tag.id} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`tag-search-${tag.id}`} 
                                            checked={pendingSelectedTagNames.includes(tag.name)}
                                            onCheckedChange={(checked) => setPendingSelectedTagNames(prev => checked ? [...prev, tag.name] : prev.filter(name => name !== tag.name))}
                                        />
                                        <Label htmlFor={`tag-search-${tag.id}`} className="text-sm font-normal cursor-pointer">{tag.name}</Label>
                                    </div>
                                ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <p className="text-sm text-muted-foreground">No tags found.</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                        <Button onClick={handleClearFilters} variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <XCircle className="h-4 w-4 mr-2"/>
                            Clear All
                        </Button>
                        <Button onClick={handleApplyFilters} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            Apply Filters
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
      </div>

      <main className="flex-1 min-w-0">
        {!isInitialized ? (
           <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Preparing search engine...</p>
          </div>
        ) : !query.trim() && activeFilterCount === 0 ? (
            <div className="text-center py-12">
                <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-medium text-muted-foreground">Search Your Memories</h2>
                <p className="text-muted-foreground mt-2">Enter a term in the search bar above to begin.</p>
            </div>
        ) : isSearchLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
             <Loader2 className="h-12 w-12 animate-spin text-primary" />
             <p className="mt-4 text-muted-foreground">Searching...</p>
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
