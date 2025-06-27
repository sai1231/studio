
'use client';

import type React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog';
import type { ContentItem, Tag as AppTag, Zone } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tag as TagIcon, FolderOpen, Loader2, ListFilter, Search, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getContentItems, deleteContentItem, getZones, getUniqueContentTypesFromItems, getUniqueTagsFromItems } from '@/services/contentService';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const pageLoadingMessages = [
  "Gathering tagged items...",
  "Finding relevant content...",
  "Sifting through your thoughts...",
];

const ALL_FILTER_VALUE = "__ALL__";

export default function TagPage() {
  const params = useParams() as { tagName: string } | null;
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [decodedTagName, setDecodedTagName] = useState<string>('');
  
  const [allContentForTag, setAllContentForTag] = useState<ContentItem[]>([]);
  const [displayedContentItems, setDisplayedContentItems] = useState<ContentItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [availableZones, setAvailableZones] = useState<Zone[]>([]);
  const [availableContentTypes, setAvailableContentTypes] = useState<string[]>([]);
  const [otherAvailableTags, setOtherAvailableTags] = useState<AppTag[]>([]);

  const [clientLoadingMessage, setClientLoadingMessage] = useState<string | null>(null);
  const [selectedItemIdForDetail, setSelectedItemIdForDetail] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Applied filter states
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedSelectedZoneId, setAppliedSelectedZoneId] = useState<string>(ALL_FILTER_VALUE);
  const [appliedSelectedContentType, setAppliedSelectedContentType] = useState<string>(ALL_FILTER_VALUE);
  const [appliedSelectedAdditionalTagIds, setAppliedSelectedAdditionalTagIds] = useState<string[]>([]);

  // Pending filter states
  const [pendingSearchTerm, setPendingSearchTerm] = useState('');
  const [pendingSelectedZoneId, setPendingSelectedZoneId] = useState<string>(ALL_FILTER_VALUE);
  const [pendingSelectedContentType, setPendingSelectedContentType] = useState<string>(ALL_FILTER_VALUE);
  const [pendingSelectedAdditionalTagIds, setPendingSelectedAdditionalTagIds] = useState<string[]>([]);
  
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

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
        setError("Invalid tag name.");
        setDecodedTagName('');
      }
    } else {
      setDecodedTagName('');
      setError("Tag name not provided in URL.");
    }
  }, [params, toast]);

  const fetchTagPageData = useCallback(async () => {
    if (!user || !decodedTagName) {
      setIsLoading(false);
      setAllContentForTag([]);
      if(!error) setError("Tag name is missing or invalid.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [allItems, zones] = await Promise.all([
        getContentItems(user.uid),
        getZones(user.uid),
      ]);

      const contentTypes = getUniqueContentTypesFromItems(allItems);
      const allTags = getUniqueTagsFromItems(allItems);

      const lowerCaseTagName = decodedTagName.toLowerCase();
      const itemsWithThisTag = allItems.filter(item =>
        item.tags.some(tag => tag.name.toLowerCase() === lowerCaseTagName)
      );
      setAllContentForTag(itemsWithThisTag);
      
      setAvailableZones(zones);
      setAvailableContentTypes(contentTypes);
      setOtherAvailableTags(allTags.filter(tag => tag.name.toLowerCase() !== lowerCaseTagName));

    } catch (err) {
      console.error("Error fetching tag page data:", err);
      setError(`Failed to load content for tag "${decodedTagName}".`);
      toast({ title: "Error", description: `Could not load items for tag "${decodedTagName}".`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, decodedTagName, toast, error]);

  useEffect(() => {
    if (user) {
      fetchTagPageData();
    }
  }, [user, fetchTagPageData]);
  
  useEffect(() => {
    if (isFilterPopoverOpen) {
      setPendingSearchTerm(appliedSearchTerm);
      setPendingSelectedZoneId(appliedSelectedZoneId);
      setPendingSelectedContentType(appliedSelectedContentType);
      setPendingSelectedAdditionalTagIds([...appliedSelectedAdditionalTagIds]);
    }
  }, [isFilterPopoverOpen, appliedSearchTerm, appliedSelectedZoneId, appliedSelectedContentType, appliedSelectedAdditionalTagIds]);

  useEffect(() => {
    let filtered = [...allContentForTag];

    if (appliedSearchTerm.trim()) {
      const lowerSearchTerm = appliedSearchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(lowerSearchTerm) ||
        (item.description && item.description.toLowerCase().includes(lowerSearchTerm))
      );
    }

    if (appliedSelectedZoneId !== ALL_FILTER_VALUE) {
      filtered = filtered.filter(item => item.zoneId === appliedSelectedZoneId);
    }

    if (appliedSelectedContentType !== ALL_FILTER_VALUE) {
      filtered = filtered.filter(item => item.contentType === appliedSelectedContentType);
    }
    
    if (appliedSelectedAdditionalTagIds.length > 0) {
      filtered = filtered.filter(item => {
        const itemTagIds = item.tags.map(tag => tag.id);
        return appliedSelectedAdditionalTagIds.every(filterTagId => itemTagIds.includes(filterTagId));
      });
    }

    setDisplayedContentItems(filtered);
  }, [appliedSearchTerm, appliedSelectedZoneId, appliedSelectedContentType, appliedSelectedAdditionalTagIds, allContentForTag]);


  const handleOpenDetailDialog = (item: ContentItem) => {
    setSelectedItemIdForDetail(item.id);
    setIsDetailDialogOpen(true);
  };

  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    const lowerCaseTagName = decodedTagName.toLowerCase();
    const stillHasTag = updatedItem.tags.some(tag => tag.name.toLowerCase() === lowerCaseTagName);

    if (stillHasTag) {
      setAllContentForTag(prevItems =>
        prevItems.map(item => item.id === updatedItem.id ? updatedItem : item)
      );
    } else { // Item no longer has the primary tag for this page
      setAllContentForTag(prevItems => prevItems.filter(item => item.id !== updatedItem.id));
    }
    toast({ title: "Item Updated", description: `"${updatedItem.title}" has been updated.` });
  };

  const handleDeleteItem = async (itemIdToDelete: string) => {
    const itemTitle = allContentForTag.find(item => item.id === itemIdToDelete)?.title || "Item";
    setAllContentForTag(prev => prev.filter(item => item.id !== itemIdToDelete));
    const { id: toastId } = toast({ title: "Deleting Item...", description: `Removing "${itemTitle}".` });
    try {
      await deleteContentItem(itemIdToDelete);
      toast({ id: toastId, title: "Item Deleted", description: `"${itemTitle}" has been removed.`, variant: "default" });
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({ id: toastId, title: "Error Deleting", description: `Could not delete "${itemTitle}".`, variant: "destructive" });
      fetchTagPageData(); // Restore
    }
  };

  const handleAdditionalTagSelectionChange = (tagId: string, checked: boolean) => {
    setPendingSelectedAdditionalTagIds(prev => 
      checked ? [...prev, tagId] : prev.filter(id => id !== tagId)
    );
  };

  const handleApplyPendingFilters = () => {
    setAppliedSearchTerm(pendingSearchTerm);
    setAppliedSelectedZoneId(pendingSelectedZoneId);
    setAppliedSelectedContentType(pendingSelectedContentType);
    setAppliedSelectedAdditionalTagIds([...pendingSelectedAdditionalTagIds]);
    setIsFilterPopoverOpen(false);
  };

  const handleClearAndApplyFilters = () => {
    setPendingSearchTerm('');
    setPendingSelectedZoneId(ALL_FILTER_VALUE);
    setPendingSelectedContentType(ALL_FILTER_VALUE);
    setPendingSelectedAdditionalTagIds([]);
    
    setAppliedSearchTerm('');
    setAppliedSelectedZoneId(ALL_FILTER_VALUE);
    setAppliedSelectedContentType(ALL_FILTER_VALUE);
    setAppliedSelectedAdditionalTagIds([]);
    setIsFilterPopoverOpen(false);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedSearchTerm.trim()) count++;
    if (appliedSelectedZoneId !== ALL_FILTER_VALUE) count++;
    if (appliedSelectedContentType !== ALL_FILTER_VALUE) count++;
    if (appliedSelectedAdditionalTagIds.length > 0) count++;
    return count;
  }, [appliedSearchTerm, appliedSelectedZoneId, appliedSelectedContentType, appliedSelectedAdditionalTagIds]);
  
  if (isLoading || !user) {
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
            <TagIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-headline font-semibold text-destructive">{error}</h1>
            <p className="text-muted-foreground mt-2">Please check the URL or try again.</p>
            <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">Go to Dashboard</Button>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-headline font-semibold text-foreground flex items-center">
          <TagIcon className="h-7 w-7 mr-3 text-primary" />
          Items tagged: <span className="ml-2 font-bold text-primary">#{decodedTagName}</span>
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
                        <Label htmlFor="search-filter-tag" className="text-sm font-medium">Search</Label>
                         <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="search-filter-tag"
                                placeholder="Search title, description..."
                                value={pendingSearchTerm}
                                onChange={(e) => setPendingSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <Label htmlFor="zone-filter-tag" className="text-sm font-medium">Zone</Label>
                        <Select value={pendingSelectedZoneId} onValueChange={setPendingSelectedZoneId}>
                            <SelectTrigger id="zone-filter-tag">
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
                        <Label htmlFor="content-type-filter-tag" className="text-sm font-medium">Content Type</Label>
                        <Select value={pendingSelectedContentType} onValueChange={setPendingSelectedContentType}>
                            <SelectTrigger id="content-type-filter-tag">
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
                        <Label className="text-sm font-medium">Additional Tags</Label>
                        {otherAvailableTags.length > 0 ? (
                            <ScrollArea className="h-32 rounded-md border p-2">
                                <div className="space-y-1.5">
                                {otherAvailableTags.map(tag => (
                                    <div key={tag.id} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`tag-tag-${tag.id}`} 
                                            checked={pendingSelectedAdditionalTagIds.includes(tag.id)}
                                            onCheckedChange={(checked) => handleAdditionalTagSelectionChange(tag.id, !!checked)}
                                        />
                                        <Label htmlFor={`tag-tag-${tag.id}`} className="text-sm font-normal cursor-pointer">{tag.name}</Label>
                                    </div>
                                ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <p className="text-sm text-muted-foreground">No other tags available.</p>
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
            {allContentForTag.length > 0 && activeFilterCount > 0 
              ? "Hmm… it’s like déjà vu, but nothing’s here." 
              : `No items found for tag #${decodedTagName}.`}
          </h2>
          <p className="text-muted-foreground mt-2">
            {allContentForTag.length > 0 && activeFilterCount > 0 
              ? (<>Try easing up on those filters — maybe something will spark a memory, or <Button variant="link" onClick={handleClearAndApplyFilters} className="p-0 h-auto text-primary inline">clear your mind</Button> to start fresh.</>)
              : "Try adding this tag to some content items."}
          </p>
        </div>
      ) : (
        <div className={'columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4'}>
          {displayedContentItems.map(item => (
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
