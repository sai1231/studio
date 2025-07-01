
'use client';

import type React from 'react';
import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog';
import type { ContentItem, Zone } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2, Search as SearchIcon, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getContentItems,
  deleteContentItem,
  getZones,
  getUniqueContentTypesFromItems,
} from '@/services/contentService';
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
  const zoneId = searchParams.get('zoneId');
  const contentType = searchParams.get('contentType');

  const [allItems, setAllItems] = useState<ContentItem[]>([]);
  const [availableZones, setAvailableZones] = useState<Zone[]>([]);
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

  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const [items, zones] = await Promise.all([
        getContentItems(user.uid),
        getZones(user.uid)
      ]);
      setAllItems(items);
      setAvailableZones(zones);
    } catch (err) {
      console.error("Error fetching search data:", err);
      setError("Failed to load search data. Please try again.");
      toast({ title: "Error", description: "Could not fetch data for search page.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const availableContentTypes = useMemo(() => getUniqueContentTypesFromItems(allItems), [allItems]);

  useEffect(() => {
    if (isLoading) return;

    let filtered = [...allItems];
    
    if (query.trim()) {
      const lowerCaseQuery = query.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(lowerCaseQuery) ||
        (item.description && item.description.toLowerCase().includes(lowerCaseQuery)) ||
        item.tags.some(tag => tag.name.toLowerCase().includes(lowerCaseQuery)) ||
        (item.contentType && item.contentType.toLowerCase().includes(lowerCaseQuery)) ||
        (item.colorPalette && item.colorPalette.some(color => color.toLowerCase().includes(lowerCaseQuery)))
      );
    }

    if (zoneId) {
      filtered = filtered.filter(item => item.zoneId === zoneId);
    }

    if (contentType) {
      filtered = filtered.filter(item => item.contentType === contentType);
    }
    
    setSearchResults(filtered);

  }, [allItems, query, zoneId, contentType, isLoading]);

  const handleFilterChange = (filterType: 'zoneId' | 'contentType', value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(filterType, value);
    } else {
      params.delete(filterType);
    }
    router.push(`/search?${params.toString()}`);
  };

  const handleOpenDetailDialog = (item: ContentItem) => {
    setSelectedItemIdForDetail(item.id);
    setIsDetailDialogOpen(true);
  };

  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    fetchData();
    toast({ title: "Item Updated", description: `"${updatedItem.title}" has been updated.`});
  };

  const handleDeleteItem = async (itemIdToDelete: string) => {
    const itemTitle = searchResults.find(item => item.id === itemIdToDelete)?.title || "Item";
    setAllItems(prev => prev.filter(item => item.id !== itemIdToDelete));
    const { id: toastId } = toast({ title: "Deleting Item...", description: `Removing "${itemTitle}".` });
    try {
      await deleteContentItem(itemIdToDelete);
      toast({ id: toastId, title: "Item Deleted", description: `"${itemTitle}" has been removed.`, variant: "default" });
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({ id: toastId, title: "Error Deleting", description: `Could not delete "${itemTitle}".`, variant: "destructive" });
      fetchData();
    }
  };
  
  const hasActiveSearch = query.trim().length > 0 || !!zoneId || !!contentType;

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-60 lg:w-72 flex-shrink-0">
          <h2 className="text-lg font-semibold mb-4 px-1">Filter Results</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2 px-1">Zones</h3>
              <div className="space-y-1">
                <Button 
                  variant={!zoneId ? 'secondary' : 'ghost'} 
                  className="w-full justify-start text-left h-auto py-2 px-3"
                  onClick={() => handleFilterChange('zoneId', null)}
                >
                  All Zones
                </Button>
                {availableZones.map(zone => (
                  <Button 
                    key={zone.id}
                    variant={zoneId === zone.id ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-left h-auto py-2 px-3"
                    onClick={() => handleFilterChange('zoneId', zone.id)}
                  >
                    {zone.name}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2 px-1">Content Types</h3>
              <div className="space-y-1">
                <Button 
                  variant={!contentType ? 'secondary' : 'ghost'} 
                  className="w-full justify-start text-left h-auto py-2 px-3"
                  onClick={() => handleFilterChange('contentType', null)}
                >
                  All Types
                </Button>
                {availableContentTypes.map(type => (
                  <Button 
                    key={type}
                    variant={contentType === type ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-left h-auto py-2 px-3"
                    onClick={() => handleFilterChange('contentType', type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="mb-6">
            <h1 className="text-3xl font-headline font-semibold text-foreground flex items-center">
              <SearchIcon className="h-7 w-7 mr-3 text-primary" />
              {hasActiveSearch ? "Search Results" : "Explore All Content"}
            </h1>
            {query && <p className="text-muted-foreground mt-1">Showing results for: <span className="font-semibold text-foreground">&quot;{query}&quot;</span></p>}
          </div>

          {isLoading ? (
             <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">
                {clientLoadingMessage}
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-medium text-destructive">{error}</h2>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-medium text-muted-foreground">
                No items found.
              </h2>
              <p className="text-muted-foreground mt-2">
                Try a different search or filter combination.
              </p>
            </div>
          ) : (
             <div className={'columns-1 md:columns-2 lg:columns-2 xl:columns-3 gap-4'}>
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
        </main>
      </div>

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
