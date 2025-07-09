

'use client';

import type React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { ClipboardList, FolderOpen, Loader2, ListFilter, Search, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getContentItems, deleteContentItem, getZones, getUniqueDomainsFromItems, getUniqueTagsFromItems } from '@/services/contentService';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { AnimatePresence } from 'framer-motion';

const pageLoadingMessages = [
  "Categorizing your content...",
  "Filtering by type...",
  "Sorting your collection...",
];

const ALL_FILTER_VALUE = "__ALL__";

const getContentTypeDisplayName = (contentTypeKey: string): string => {
  return contentTypeKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

export default function ContentTypePage() {
  const params = useParams() as { contentTypeName: string } | null;
  const router = useRouter();
  const { toast } = useToast();
  const { user, role } = useAuth();
  const { openFocusMode } = useDialog();

  const [decodedContentTypeName, setDecodedContentTypeName] = useState<string>('');
  
  const [allContentForType, setAllContentForType] = useState<ContentItem[]>([]);
  const [displayedContentItems, setDisplayedContentItems] = useState<ContentItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [availableZones, setAvailableZones] = useState<Zone[]>([]);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<AppTag[]>([]);

  const [clientLoadingMessage, setClientLoadingMessage] = useState<string | null>(null);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<ContentItem | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Applied filter states
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedSelectedZoneId, setAppliedSelectedZoneId] = useState<string>(ALL_FILTER_VALUE);
  const [appliedSelectedDomain, setAppliedSelectedDomain] = useState<string>(ALL_FILTER_VALUE);
  const [appliedSelectedTagIds, setAppliedSelectedTagIds] = useState<string[]>([]);

  // Pending filter states
  const [pendingSearchTerm, setPendingSearchTerm] = useState('');
  const [pendingSelectedZoneId, setPendingSelectedZoneId] = useState<string>(ALL_FILTER_VALUE);
  const [pendingSelectedDomain, setPendingSelectedDomain] = useState<string>(ALL_FILTER_VALUE);
  const [pendingSelectedTagIds, setPendingSelectedTagIds] = useState<string[]>([]);
  
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

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
        setError("Invalid content type name.");
        setDecodedContentTypeName('');
      }
    } else {
      setDecodedContentTypeName('');
      setError("Content type name not provided in URL.");
    }
  }, [params, toast]);

  const fetchContentTypePageData = useCallback(async () => {
    if (!user || !decodedContentTypeName || !role) {
      setIsLoading(false);
      if (!decodedContentTypeName) setError("Content type name is missing.");
      else if (!user) setError("User not authenticated.");
      else if (!role) setError("User role not loaded.");
      setAllContentForType([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [allItems, zones] = await Promise.all([
        getContentItems(user.uid, role.features.contentLimit),
        getZones(user.uid),
      ]);

      const domains = getUniqueDomainsFromItems(allItems);
      const tags = getUniqueTagsFromItems(allItems);

      const lowerCaseContentType = decodedContentTypeName.toLowerCase();
      const itemsOfThisType = allItems.filter(item =>
        item.contentType && item.contentType.toLowerCase() === lowerCaseContentType
      );
      setAllContentForType(itemsOfThisType);
      
      setAvailableZones(zones);
      setAvailableDomains(domains);
      setAvailableTags(tags);

    } catch (err) {
      console.error("Error fetching content type page data:", err);
      setError(`Failed to load content for type "${decodedContentTypeName}".`);
      toast({ title: "Error", description: `Could not load items for type "${decodedContentTypeName}".`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, role, decodedContentTypeName, toast]);

  useEffect(() => {
    if (user && role) {
      fetchContentTypePageData();
    }
  }, [user, role, fetchContentTypePageData]);

  useEffect(() => {
    if (isFilterPopoverOpen) {
      setPendingSearchTerm(appliedSearchTerm);
      setPendingSelectedZoneId(appliedSelectedZoneId);
      setPendingSelectedDomain(appliedSelectedDomain);
      setPendingSelectedTagIds([...appliedSelectedTagIds]);
    }
  }, [isFilterPopoverOpen, appliedSearchTerm, appliedSelectedZoneId, appliedSelectedDomain, appliedSelectedTagIds]);

  useEffect(() => {
    let filtered = [...allContentForType];

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
    if (appliedSelectedDomain !== ALL_FILTER_VALUE) {
      filtered = filtered.filter(item => item.domain === appliedSelectedDomain);
    }
    if (appliedSelectedTagIds.length > 0) {
      filtered = filtered.filter(item => {
        const itemTagIds = item.tags.map(tag => tag.id);
        return appliedSelectedTagIds.every(filterTagId => itemTagIds.includes(filterTagId));
      });
    }
    setDisplayedContentItems(filtered);
  }, [appliedSearchTerm, appliedSelectedZoneId, appliedSelectedDomain, appliedSelectedTagIds, allContentForType]);


  const handleItemClick = (item: ContentItem) => {
    if (item.type === 'note') {
      openFocusMode(item);
    } else {
      setSelectedItemForDetail(item);
      setIsDetailDialogOpen(true);
    }
  };

  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    const lowerCaseContentType = decodedContentTypeName.toLowerCase();
    const stillMatchesType = updatedItem.contentType && updatedItem.contentType.toLowerCase() === lowerCaseContentType;

    if (stillMatchesType) {
      setAllContentForType(prevItems =>
        prevItems.map(item => item.id === updatedItem.id ? updatedItem : item)
      );
    } else {
      setAllContentForType(prevItems => prevItems.filter(item => item.id !== updatedItem.id));
    }
  };

  const handleDeleteItem = async (itemIdToDelete: string) => {
    const itemTitle = allContentForType.find(item => item.id === itemIdToDelete)?.title || "Item";
    setAllContentForType(prev => prev.filter(item => item.id !== itemIdToDelete));
    const { id: toastId } = toast({ title: "Deleting Item...", description: `Removing "${itemTitle}".` });
    try {
      await deleteContentItem(itemIdToDelete);
      toast({ id: toastId, title: "Item Deleted", description: `"${itemTitle}" has been removed.`, variant: "default" });
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({ id: toastId, title: "Error Deleting", description: `Could not delete "${itemTitle}".`, variant: "destructive" });
      fetchContentTypePageData(); // Restore
    }
  };
  
  const handleTagSelectionChange = (tagId: string, checked: boolean) => {
    setPendingSelectedTagIds(prev => 
      checked ? [...prev, tagId] : prev.filter(id => id !== tagId)
    );
  };

  const handleApplyPendingFilters = () => {
    setAppliedSearchTerm(pendingSearchTerm);
    setAppliedSelectedZoneId(pendingSelectedZoneId);
    setAppliedSelectedDomain(pendingSelectedDomain);
    setAppliedSelectedTagIds([...pendingSelectedTagIds]);
    setIsFilterPopoverOpen(false);
  };

  const handleClearAndApplyFilters = () => {
    setPendingSearchTerm('');
    setPendingSelectedZoneId(ALL_FILTER_VALUE);
    setPendingSelectedDomain(ALL_FILTER_VALUE);
    setPendingSelectedTagIds([]);
    
    setAppliedSearchTerm('');
    setAppliedSelectedZoneId(ALL_FILTER_VALUE);
    setAppliedSelectedDomain(ALL_FILTER_VALUE);
    setAppliedSelectedTagIds([]);
    setIsFilterPopoverOpen(false);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedSearchTerm.trim()) count++;
    if (appliedSelectedZoneId !== ALL_FILTER_VALUE) count++;
    if (appliedSelectedDomain !== ALL_FILTER_VALUE) count++;
    if (appliedSelectedTagIds.length > 0) count++;
    return count;
  }, [appliedSearchTerm, appliedSelectedZoneId, appliedSelectedDomain, appliedSelectedTagIds]);
  
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

  if (error) {
    return (
        <div className="container mx-auto py-8 text-center">
            <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-headline font-semibold text-destructive">{error}</h1>
            <p className="text-muted-foreground mt-2">Please check the URL or try again.</p>
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
                        <Label htmlFor="search-filter-type" className="text-sm font-medium">Search</Label>
                         <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="search-filter-type"
                                placeholder="Search title, description..."
                                value={pendingSearchTerm}
                                onChange={(e) => setPendingSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <Label htmlFor="zone-filter-type" className="text-sm font-medium">Zone</Label>
                        <Select value={pendingSelectedZoneId} onValueChange={setPendingSelectedZoneId}>
                            <SelectTrigger id="zone-filter-type">
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
                        <Label htmlFor="domain-filter-type" className="text-sm font-medium">Domain</Label>
                        <Select value={pendingSelectedDomain} onValueChange={setPendingSelectedDomain}>
                            <SelectTrigger id="domain-filter-type">
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
                                            id={`tag-type-${tag.id}`} 
                                            checked={pendingSelectedTagIds.includes(tag.id)}
                                            onCheckedChange={(checked) => handleTagSelectionChange(tag.id, !!checked)}
                                        />
                                        <Label htmlFor={`tag-type-${tag.id}`} className="text-sm font-normal cursor-pointer">{tag.name}</Label>
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
            {allContentForType.length > 0 && activeFilterCount > 0 
              ? "Hmm… it’s like déjà vu, but nothing’s here." 
              : `No items found for type "${displayName}".`}
          </h2>
          <p className="text-muted-foreground mt-2">
            {allContentForType.length > 0 && activeFilterCount > 0 
              ? (<>Try easing up on those filters — maybe something will spark a memory, or <Button variant="link" onClick={handleClearAndApplyFilters} className="p-0 h-auto text-primary inline">clear your mind</Button> to start fresh.</>)
              : "Save content of this type to see it here."}
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
