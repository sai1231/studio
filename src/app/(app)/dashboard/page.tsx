
'use client';
import type React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog';
import type { ContentItem, Zone as AppZone, Tag as AppTag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, ListFilter, Loader2, FolderOpen, Search, XCircle } from 'lucide-react';
import AddContentDialog from '@/components/core/add-content-dialog';
import { useToast } from '@/hooks/use-toast';
import { getContentItems, addContentItem, deleteContentItem, getZones, getUniqueContentTypes, getUniqueDomains, getUniqueTags } from '@/services/contentService';
import { cn } from '@/lib/utils';

const pageLoadingMessages = [
  "Organizing your thoughts...",
  "Fetching your inspirations...",
  "Aligning your ideas...",
  "Connecting the dots...",
];

const ALL_FILTER_VALUE = "__ALL__";

export default function DashboardPage() {
  const [allContentItems, setAllContentItems] = useState<ContentItem[]>([]);
  const [displayedContentItems, setDisplayedContentItems] = useState<ContentItem[]>([]);
  
  const [zones, setZones] = useState<AppZone[]>([]);
  const [availableContentTypes, setAvailableContentTypes] = useState<string[]>([]);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<AppTag[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isAddContentDialogOpen, setIsAddContentDialogOpen] = useState(false);
  const [selectedItemIdForDetail, setSelectedItemIdForDetail] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const [clientLoadingMessage, setClientLoadingMessage] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContentType, setSelectedContentType] = useState<string>(ALL_FILTER_VALUE);
  const [selectedDomain, setSelectedDomain] = useState<string>(ALL_FILTER_VALUE);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

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
      const [items, fetchedZones, uniqueContentTypes, uniqueDomains, uniqueTags] = await Promise.all([
        getContentItems(),
        getZones(),
        getUniqueContentTypes(),
        getUniqueDomains(),
        getUniqueTags(),
      ]);
      setAllContentItems(items);
      setDisplayedContentItems(items); // Initially display all items
      setZones(fetchedZones);
      setAvailableContentTypes(uniqueContentTypes);
      setAvailableDomains(uniqueDomains);
      setAvailableTags(uniqueTags);
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

  // Filtering logic
  useEffect(() => {
    let filtered = [...allContentItems];

    // Search term filter
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(lowerSearchTerm) ||
        (item.description && item.description.toLowerCase().includes(lowerSearchTerm))
      );
    }

    // Content type filter
    if (selectedContentType !== ALL_FILTER_VALUE) {
      filtered = filtered.filter(item => item.contentType === selectedContentType);
    }

    // Domain filter
    if (selectedDomain !== ALL_FILTER_VALUE) {
      filtered = filtered.filter(item => item.domain === selectedDomain);
    }
    
    // Tag filter (item must have ALL selected tags)
    if (selectedTagIds.length > 0) {
      filtered = filtered.filter(item => {
        const itemTagIds = item.tags.map(tag => tag.id);
        return selectedTagIds.every(filterTagId => itemTagIds.includes(filterTagId));
      });
    }

    setDisplayedContentItems(filtered);
  }, [searchTerm, selectedContentType, selectedDomain, selectedTagIds, allContentItems]);

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
    setAllContentItems(prevItems => 
      prevItems.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
    // No need to call fetchData, filtering useEffect will handle display update
    toast({ title: "Item Updated", description: `"${updatedItem.title}" has been updated.`});
  };

  const handleDeleteContent = async (itemId: string) => {
    const originalItems = [...allContentItems];
    setAllContentItems(prevItems => prevItems.filter(item => item.id !== itemId)); 
    const {id: toastId} = toast({ title: "Deleting Item...", description: "Removing content item."});
    try {
      await deleteContentItem(itemId);
      toast({id: toastId, title: "Content Deleted", description: "The item has been removed.", variant: "default"});
      // No explicit fetchData(), filtering useEffect handles the display update of allContentItems
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({id: toastId, title: "Error Deleting", description: "Could not delete item. Restoring.", variant: "destructive"});
      setAllContentItems(originalItems); 
    }
  };

  const handleTagSelectionChange = (tagId: string, checked: boolean) => {
    setSelectedTagIds(prev => 
      checked ? [...prev, tagId] : prev.filter(id => id !== tagId)
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedContentType(ALL_FILTER_VALUE);
    setSelectedDomain(ALL_FILTER_VALUE);
    setSelectedTagIds([]);
    setIsFilterPopoverOpen(false);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (selectedContentType !== ALL_FILTER_VALUE) count++;
    if (selectedDomain !== ALL_FILTER_VALUE) count++;
    if (selectedTagIds.length > 0) count++;
    return count;
  }, [searchTerm, selectedContentType, selectedDomain, selectedTagIds]);
  
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
        <h1 className="text-3xl font-headline font-semibold text-foreground">My Thoughts</h1>
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
                        <Label htmlFor="search-filter" className="text-sm font-medium">Search</Label>
                         <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="search-filter"
                                placeholder="Search title, description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="content-type-filter" className="text-sm font-medium">Content Type</Label>
                        <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                            <SelectTrigger id="content-type-filter">
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

                    <div className="space-y-1">
                        <Label htmlFor="domain-filter" className="text-sm font-medium">Domain</Label>
                        <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                            <SelectTrigger id="domain-filter">
                                <SelectValue placeholder="All Domains" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_FILTER_VALUE}>All Domains</SelectItem>
                                {availableDomains.map(domain => (
                                    <SelectItem key={domain} value={domain}>{domain}</SelectItem>
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
                                            id={`tag-${tag.id}`} 
                                            checked={selectedTagIds.includes(tag.id)}
                                            onCheckedChange={(checked) => handleTagSelectionChange(tag.id, !!checked)}
                                        />
                                        <Label htmlFor={`tag-${tag.id}`} className="text-sm font-normal cursor-pointer">{tag.name}</Label>
                                    </div>
                                ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <p className="text-sm text-muted-foreground">No tags available.</p>
                        )}
                    </div>
                    <Button onClick={clearFilters} variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive">
                        <XCircle className="h-4 w-4 mr-2"/>
                        Clear All Filters
                    </Button>
                </PopoverContent>
            </Popover>
        </div>
      </div>

      {displayedContentItems.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">
            {allContentItems.length > 0 && activeFilterCount > 0 ? "No items match your filters." : "No content saved yet."}
          </h2>
          <p className="text-muted-foreground mt-2">
            {allContentItems.length > 0 && activeFilterCount > 0 
              ? "Try adjusting your filters or " 
              : "Start by adding your first item!"}
            {allContentItems.length > 0 && activeFilterCount > 0 && 
              <Button variant="link" onClick={clearFilters} className="p-0 h-auto text-primary">clear them</Button>
            }
          </p>
          { (allContentItems.length === 0 || (allContentItems.length > 0 && activeFilterCount === 0 )) &&
             <Button onClick={() => { setIsAddContentDialogOpen(true);}} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Your First Item
            </Button>
          }
        </div>
      ) : (
        <div className={'columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4'}>
          {displayedContentItems.map(item => (
            <ContentCard
              key={item.id}
              item={item}
              onEdit={handleOpenDetailDialog}
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
            if (!open) setSelectedItemIdForDetail(null); 
          }}
          onItemUpdate={handleItemUpdateInDialog}
        />
      )}
    </div>
  );
}
