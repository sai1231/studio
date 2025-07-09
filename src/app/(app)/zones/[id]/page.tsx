

'use client';

import type React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog'; 
import type { ContentItem, Zone, Tag as AppTag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ListFilter, FolderOpen, Loader2, Search, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getContentItems, getZoneById, deleteContentItem, getUniqueContentTypesFromItems, getUniqueTagsFromItems } from '@/services/contentService';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { AnimatePresence } from 'framer-motion';

const pageLoadingMessages = [
  "Organizing your thoughts...",
  "Fetching your inspirations...",
  "Aligning your ideas...",
  "Connecting the dots...",
];

const ALL_FILTER_VALUE = "__ALL__";

export default function ZonePage() {
  const params = useParams() as { id: string };
  const zoneId = params.id; 
  const router = useRouter();
  const { toast } = useToast();
  const { user, role } = useAuth();
  const { openFocusMode } = useDialog();

  const [allContentInZone, setAllContentInZone] = useState<ContentItem[]>([]);
  const [displayedContentItems, setDisplayedContentItems] = useState<ContentItem[]>([]);
  const [currentZone, setCurrentZone] = useState<Zone | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [availableContentTypes, setAvailableContentTypes] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<AppTag[]>([]);
  
  const [clientLoadingMessage, setClientLoadingMessage] = useState<string | null>(null);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<ContentItem | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  // Applied filter states
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedSelectedContentType, setAppliedSelectedContentType] = useState<string>(ALL_FILTER_VALUE);
  const [appliedSelectedTagIds, setAppliedSelectedTagIds] = useState<string[]>([]);

  // Pending filter states
  const [pendingSearchTerm, setPendingSearchTerm] = useState('');
  const [pendingSelectedContentType, setPendingSelectedContentType] = useState<string>(ALL_FILTER_VALUE);
  const [pendingSelectedTagIds, setPendingSelectedTagIds] = useState<string[]>([]);
  
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const randomIndex = Math.floor(Math.random() * pageLoadingMessages.length);
      setClientLoadingMessage(pageLoadingMessages[randomIndex]);
    }
  }, [isLoading]);

  const fetchZonePageData = useCallback(async () => {
    if (!user || !zoneId || !role) {
      setIsLoading(false);
      if (!zoneId) setError("Zone ID is missing.");
      else if (!user) setError("User not authenticated.");
      else if (!role) setError("User role not loaded.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [zoneDetails, allItems] = await Promise.all([
        getZoneById(zoneId),
        getContentItems(user.uid, role.features.contentLimit),
      ]);

      if (zoneDetails) {
        setCurrentZone(zoneDetails);
        const itemsInThisZone = allItems.filter(item => item.zoneId === zoneId);
        setAllContentInZone(itemsInThisZone);
        
        const contentTypes = getUniqueContentTypesFromItems(itemsInThisZone);
        const tags = getUniqueTagsFromItems(itemsInThisZone);
        setAvailableContentTypes(contentTypes);
        setAvailableTags(tags);

      } else {
        setCurrentZone(null);
        setAllContentInZone([]);
        setError('Zone not found.');
      }

    } catch (err) {
      console.error("Error fetching zone page data:", err);
      setError("Failed to load zone content. Please try again.");
      toast({ title: "Error", description: "Could not load zone content.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [zoneId, toast, user, role]);

  useEffect(() => {
    if (user && role) {
      fetchZonePageData();
    }
  }, [user, role, fetchZonePageData]);

  useEffect(() => {
    if (isFilterPopoverOpen) {
      setPendingSearchTerm(appliedSearchTerm);
      setPendingSelectedContentType(appliedSelectedContentType);
      setPendingSelectedTagIds([...appliedSelectedTagIds]);
    }
  }, [isFilterPopoverOpen, appliedSearchTerm, appliedSelectedContentType, appliedSelectedTagIds]);

  useEffect(() => {
    let filtered = [...allContentInZone];

    if (appliedSearchTerm.trim()) {
      const lowerSearchTerm = appliedSearchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(lowerSearchTerm) ||
        (item.description && item.description.toLowerCase().includes(lowerSearchTerm))
      );
    }

    if (appliedSelectedContentType !== ALL_FILTER_VALUE) {
      filtered = filtered.filter(item => item.contentType === appliedSelectedContentType);
    }
    
    if (appliedSelectedTagIds.length > 0) {
      filtered = filtered.filter(item => {
        const itemTagIds = item.tags.map(tag => tag.id);
        return appliedSelectedTagIds.every(filterTagId => itemTagIds.includes(filterTagId));
      });
    }

    setDisplayedContentItems(filtered);
  }, [appliedSearchTerm, appliedSelectedContentType, appliedSelectedTagIds, allContentInZone]);

  const handleItemClick = (item: ContentItem) => {
    if (item.type === 'note') {
      openFocusMode(item);
    } else {
      setSelectedItemForDetail(item);
      setIsDetailDialogOpen(true);
    }
  };
  
  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    const wasInZone = allContentInZone.some(item => item.id === updatedItem.id);
    const stillInZone = updatedItem.zoneId === zoneId;

    if (wasInZone && !stillInZone) { // Moved out of current zone
      setAllContentInZone(prev => prev.filter(item => item.id !== updatedItem.id));
    } else if (!wasInZone && stillInZone) { // Moved into current zone
      setAllContentInZone(prev => [...prev, updatedItem].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } else if (wasInZone && stillInZone) { // Updated within current zone
      setAllContentInZone(prev => 
        prev.map(item => item.id === updatedItem.id ? updatedItem : item)
      );
    }
  };

  const handleDeleteItem = async (itemIdToDelete: string) => {
    const itemTitle = allContentInZone.find(item => item.id === itemIdToDelete)?.title || "Item";
    setAllContentInZone(prev => prev.filter(item => item.id !== itemIdToDelete));
    const { id: toastId } = toast({ title: "Deleting Item...", description: `Removing "${itemTitle}".`});
    try {
      await deleteContentItem(itemIdToDelete);
      toast({ id: toastId, title: "Item Deleted", description: `"${itemTitle}" has been removed.`, variant: "default" });
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({ id: toastId, title: "Error Deleting", description: `Could not delete "${itemTitle}".`, variant: "destructive"});
      fetchZonePageData(); // Re-fetch to restore if delete failed
    }
  };

  const handleTagSelectionChange = (tagId: string, checked: boolean) => {
    setPendingSelectedTagIds(prev => 
      checked ? [...prev, tagId] : prev.filter(id => id !== tagId)
    );
  };

  const handleApplyPendingFilters = () => {
    setAppliedSearchTerm(pendingSearchTerm);
    setAppliedSelectedContentType(pendingSelectedContentType);
    setAppliedSelectedTagIds([...pendingSelectedTagIds]);
    setIsFilterPopoverOpen(false);
  };

  const handleClearAndApplyFilters = () => {
    setPendingSearchTerm('');
    setPendingSelectedContentType(ALL_FILTER_VALUE);
    setPendingSelectedTagIds([]);
    
    setAppliedSearchTerm('');
    setAppliedSelectedContentType(ALL_FILTER_VALUE);
    setAppliedSelectedTagIds([]);
    setIsFilterPopoverOpen(false);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedSearchTerm.trim()) count++;
    if (appliedSelectedContentType !== ALL_FILTER_VALUE) count++;
    if (appliedSelectedTagIds.length > 0) count++;
    return count;
  }, [appliedSearchTerm, appliedSelectedContentType, appliedSelectedTagIds]);

  if (isLoading || !user || !role) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto py-2">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          {clientLoadingMessage || pageLoadingMessages[0]}
        </p>
      </div>
    );
  }

  if (error || !currentZone) {
     return (
        <div className="container mx-auto py-8 text-center">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-headline font-semibold text-destructive">{error || "Zone Not Found"}</h1>
            <p className="text-muted-foreground mt-2">The zone with ID "{zoneId}" could not be found or loaded.</p>
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
                        <Label htmlFor="search-filter-zone" className="text-sm font-medium">Search</Label>
                         <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="search-filter-zone"
                                placeholder="Search title, description..."
                                value={pendingSearchTerm}
                                onChange={(e) => setPendingSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="content-type-filter-zone" className="text-sm font-medium">Content Type</Label>
                        <Select value={pendingSelectedContentType} onValueChange={setPendingSelectedContentType}>
                            <SelectTrigger id="content-type-filter-zone">
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
                                            id={`tag-zone-${tag.id}`} 
                                            checked={pendingSelectedTagIds.includes(tag.id)}
                                            onCheckedChange={(checked) => handleTagSelectionChange(tag.id, !!checked)}
                                        />
                                        <Label htmlFor={`tag-zone-${tag.id}`} className="text-sm font-normal cursor-pointer">{tag.name}</Label>
                                    </div>
                                ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <p className="text-sm text-muted-foreground">No tags available.</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                        <Button onClick={handleClearAndApplyFilters} variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <XCircle className="h-4 w-4 mr-2"/>
                            Clear All
                        </Button>
                        <Button onClick={handleApplyPendingFilters} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            Apply Filters
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
      </div>

      {displayedContentItems.length === 0 ? (
        <div className="text-center py-12">
           <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">
            {allContentInZone.length > 0 && activeFilterCount > 0 
              ? "Hmm… it’s like déjà vu, but nothing’s here." 
              : `No items in "${currentZone.name}" yet.`}
          </h2>
          <p className="text-muted-foreground mt-2">
            {allContentInZone.length > 0 && activeFilterCount > 0 
              ? (<>Try easing up on those filters — maybe something will spark a memory, or <Button variant="link" onClick={handleClearAndApplyFilters} className="p-0 h-auto text-primary inline">clear your mind</Button> to start fresh.</>)
              : `Add items to this zone via the "Add Content" button.`}
          </p>
        </div>
      ) : (
        <div className={'columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4'}>
          {displayedContentItems.map(item => (
            <ContentCard
              key={item.id}
              item={item}
              onEdit={handleItemClick} 
              onDelete={handleDeleteItem}
            />
          ))}
        </div>
      )}
      <AnimatePresence>
        {selectedItemForDetail && (
          <ContentDetailDialog
            item={selectedItemForDetail}
            open={isDetailDialogOpen}
            onOpenChange={(open) => {
              setIsDetailDialogOpen(open);
              if (!open) setSelectedItemForDetail(null);
            }}
            onItemUpdate={handleItemUpdateInDialog}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
