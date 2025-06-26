
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
import { Globe, FolderOpen, Loader2, ListFilter, Search, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getContentItems, deleteContentItem, getZones, getUniqueContentTypesFromItems, getUniqueTagsFromItems } from '@/services/contentService';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const pageLoadingMessages = [
  "Fetching content from this domain...",
  "Filtering your saved items...",
  "Curating your domain-specific view...",
];

const ALL_FILTER_VALUE = "__ALL__";

export default function DomainPage() {
  const params = useParams() as { domainName: string } | null;
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [decodedDomainName, setDecodedDomainName] = useState<string>('');
  
  const [allContentForDomain, setAllContentForDomain] = useState<ContentItem[]>([]);
  const [displayedContentItems, setDisplayedContentItems] = useState<ContentItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [availableZones, setAvailableZones] = useState<Zone[]>([]);
  const [availableContentTypes, setAvailableContentTypes] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<AppTag[]>([]);
  
  const [clientLoadingMessage, setClientLoadingMessage] = useState<string | null>(null);
  const [selectedItemIdForDetail, setSelectedItemIdForDetail] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Applied filter states
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedSelectedZoneId, setAppliedSelectedZoneId] = useState<string>(ALL_FILTER_VALUE);
  const [appliedSelectedContentType, setAppliedSelectedContentType] = useState<string>(ALL_FILTER_VALUE);
  const [appliedSelectedTagIds, setAppliedSelectedTagIds] = useState<string[]>([]);

  // Pending filter states
  const [pendingSearchTerm, setPendingSearchTerm] = useState('');
  const [pendingSelectedZoneId, setPendingSelectedZoneId] = useState<string>(ALL_FILTER_VALUE);
  const [pendingSelectedContentType, setPendingSelectedContentType] = useState<string>(ALL_FILTER_VALUE);
  const [pendingSelectedTagIds, setPendingSelectedTagIds] = useState<string[]>([]);
  
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const randomIndex = Math.floor(Math.random() * pageLoadingMessages.length);
      setClientLoadingMessage(pageLoadingMessages[randomIndex]);
    }
  }, [isLoading]);

  useEffect(() => {
    if (params && params.domainName) {
      try {
        const name = decodeURIComponent(params.domainName);
        setDecodedDomainName(name);
      } catch (e) {
        console.error("Error decoding domain name:", e);
        toast({ title: "Error", description: "Invalid domain name in URL.", variant: "destructive" });
        setError("Invalid domain name.");
        setDecodedDomainName('');
      }
    } else {
      setDecodedDomainName('');
      setError("Domain name not provided in URL.");
    }
  }, [params, toast]);

  const fetchDomainPageData = useCallback(async () => {
    if (!user || !decodedDomainName) {
      setIsLoading(false);
      setAllContentForDomain([]);
      if(!error) setError("Domain name is missing or invalid.");
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
      const tags = getUniqueTagsFromItems(allItems);

      const lowerCaseDomainName = decodedDomainName.toLowerCase();
      const itemsFromThisDomain = allItems.filter(item =>
        item.domain && item.domain.toLowerCase() === lowerCaseDomainName
      );
      setAllContentForDomain(itemsFromThisDomain);
      
      setAvailableZones(zones);
      setAvailableContentTypes(contentTypes);
      setAvailableTags(tags);

    } catch (err) {
      console.error("Error fetching domain page data:", err);
      setError(`Failed to load content for domain "${decodedDomainName}".`);
      toast({ title: "Error", description: `Could not load items for domain "${decodedDomainName}".`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, decodedDomainName, toast, error]);

  useEffect(() => {
    if (user) {
      fetchDomainPageData();
    }
  }, [user, fetchDomainPageData]);

  useEffect(() => {
    if (isFilterPopoverOpen) {
      setPendingSearchTerm(appliedSearchTerm);
      setPendingSelectedZoneId(appliedSelectedZoneId);
      setPendingSelectedContentType(appliedSelectedContentType);
      setPendingSelectedTagIds([...appliedSelectedTagIds]);
    }
  }, [isFilterPopoverOpen, appliedSearchTerm, appliedSelectedZoneId, appliedSelectedContentType, appliedSelectedTagIds]);

  useEffect(() => {
    let filtered = [...allContentForDomain];

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
    if (appliedSelectedTagIds.length > 0) {
      filtered = filtered.filter(item => {
        const itemTagIds = item.tags.map(tag => tag.id);
        return appliedSelectedTagIds.every(filterTagId => itemTagIds.includes(filterTagId));
      });
    }
    setDisplayedContentItems(filtered);
  }, [appliedSearchTerm, appliedSelectedZoneId, appliedSelectedContentType, appliedSelectedTagIds, allContentForDomain]);

  const handleOpenDetailDialog = (item: ContentItem) => {
    setSelectedItemIdForDetail(item.id);
    setIsDetailDialogOpen(true);
  };

  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    const lowerCaseDomainName = decodedDomainName.toLowerCase();
    const stillMatchesDomain = updatedItem.domain && updatedItem.domain.toLowerCase() === lowerCaseDomainName;

    if (stillMatchesDomain) {
      setAllContentForDomain(prevItems =>
        prevItems.map(item => item.id === updatedItem.id ? updatedItem : item)
      );
    } else {
      setAllContentForDomain(prevItems => prevItems.filter(item => item.id !== updatedItem.id));
    }
    toast({ title: "Item Updated", description: `"${updatedItem.title}" has been updated.` });
  };

  const handleDeleteItem = async (itemIdToDelete: string) => {
    const itemTitle = allContentForDomain.find(item => item.id === itemIdToDelete)?.title || "Item";
    setAllContentForDomain(prev => prev.filter(item => item.id !== itemIdToDelete));
    const { id: toastId } = toast({ title: "Deleting Item...", description: `Removing "${itemTitle}".` });
    try {
      await deleteContentItem(itemIdToDelete);
      toast({ id: toastId, title: "Item Deleted", description: `"${itemTitle}" has been removed.`, variant: "default" });
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({ id: toastId, title: "Error Deleting", description: `Could not delete "${itemTitle}".`, variant: "destructive" });
      fetchDomainPageData(); // Restore
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
    setAppliedSelectedContentType(pendingSelectedContentType);
    setAppliedSelectedTagIds([...pendingSelectedTagIds]);
    setIsFilterPopoverOpen(false);
  };

  const handleClearAndApplyFilters = () => {
    setPendingSearchTerm('');
    setPendingSelectedZoneId(ALL_FILTER_VALUE);
    setPendingSelectedContentType(ALL_FILTER_VALUE);
    setPendingSelectedTagIds([]);
    
    setAppliedSearchTerm('');
    setAppliedSelectedZoneId(ALL_FILTER_VALUE);
    setAppliedSelectedContentType(ALL_FILTER_VALUE);
    setAppliedSelectedTagIds([]);
    setIsFilterPopoverOpen(false);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedSearchTerm.trim()) count++;
    if (appliedSelectedZoneId !== ALL_FILTER_VALUE) count++;
    if (appliedSelectedContentType !== ALL_FILTER_VALUE) count++;
    if (appliedSelectedTagIds.length > 0) count++;
    return count;
  }, [appliedSearchTerm, appliedSelectedZoneId, appliedSelectedContentType, appliedSelectedTagIds]);

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
            <Globe className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
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
          <Globe className="h-7 w-7 mr-3 text-primary" />
          Content from: <span className="ml-2 font-bold text-primary">{decodedDomainName}</span>
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
                        <Label htmlFor="search-filter-domain" className="text-sm font-medium">Search</Label>
                         <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="search-filter-domain"
                                placeholder="Search title, description..."
                                value={pendingSearchTerm}
                                onChange={(e) => setPendingSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <Label htmlFor="zone-filter-domain" className="text-sm font-medium">Zone</Label>
                        <Select value={pendingSelectedZoneId} onValueChange={setPendingSelectedZoneId}>
                            <SelectTrigger id="zone-filter-domain">
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
                        <Label htmlFor="content-type-filter-domain" className="text-sm font-medium">Content Type</Label>
                        <Select value={pendingSelectedContentType} onValueChange={setPendingSelectedContentType}>
                            <SelectTrigger id="content-type-filter-domain">
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
                                            id={`tag-domain-${tag.id}`} 
                                            checked={pendingSelectedTagIds.includes(tag.id)}
                                            onCheckedChange={(checked) => handleTagSelectionChange(tag.id, !!checked)}
                                        />
                                        <Label htmlFor={`tag-domain-${tag.id}`} className="text-sm font-normal cursor-pointer">{tag.name}</Label>
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
            {allContentForDomain.length > 0 && activeFilterCount > 0 
              ? "Hmm… it’s like déjà vu, but nothing’s here." 
              : `No items found from "${decodedDomainName}".`}
          </h2>
          <p className="text-muted-foreground mt-2">
            {allContentForDomain.length > 0 && activeFilterCount > 0 
              ? (<>Try easing up on those filters — maybe something will spark a memory, or <Button variant="link" onClick={handleClearAndApplyFilters} className="p-0 h-auto text-primary inline">clear your mind</Button> to start fresh.</>)
              : "Save content from this domain to see it here."}
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
