
'use client';
import type React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog';
import type { ContentItem, Zone as AppZone, Tag as AppTag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, ListFilter, Loader2, FolderOpen, Search, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { subscribeToContentItems, deleteContentItem, getZones, getUniqueContentTypesFromItems, getUniqueDomainsFromItems, getUniqueTagsFromItems, updateContentItem } from '@/services/contentService';
import { useAuth } from '@/context/AuthContext';

const pageLoadingMessages = [
  "Organizing your memories...",
  "Fetching your inspirations...",
  "Aligning your ideas...",
  "Connecting the dots...",
];

const ALL_FILTER_VALUE = "__ALL__";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [allContentItems, setAllContentItems] = useState<ContentItem[]>([]);
  const [displayedContentItems, setDisplayedContentItems] = useState<ContentItem[]>([]);

  const [zones, setZones] = useState<AppZone[]>([]);
  const [availableContentTypes, setAvailableContentTypes] = useState<string[]>([]);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<AppTag[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingTodoStatus, setIsUpdatingTodoStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedItemIdForDetail, setSelectedItemIdForDetail] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const { toast } = useToast();
  const [clientLoadingMessage, setClientLoadingMessage] = useState<string | null>(null);

  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedSelectedContentType, setAppliedSelectedContentType] = useState<string>(ALL_FILTER_VALUE);
  const [appliedSelectedDomain, setAppliedSelectedDomain] = useState<string>(ALL_FILTER_VALUE);
  const [appliedSelectedTagIds, setAppliedSelectedTagIds] = useState<string[]>([]);

  const [pendingSearchTerm, setPendingSearchTerm] = useState('');
  const [pendingSelectedContentType, setPendingSelectedContentType] = useState<string>(ALL_FILTER_VALUE);
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
    if (!user) {
        setIsLoading(false);
        return;
    };

    setIsLoading(true);
    setError(null);
    let initialDataLoaded = false;

    // Fetch zones once
    const fetchZonesData = async () => {
        try {
            const fetchedZones = await getZones(user.uid);
            setZones(fetchedZones);
        } catch (err) {
            console.error("Error fetching zones:", err);
            setError("Failed to load dashboard components.");
            toast({ title: "Error", description: "Could not fetch essential data like zones.", variant: "destructive" });
        }
    };
    fetchZonesData();

    // Subscribe to content items for real-time updates
    const unsubscribe = subscribeToContentItems(user.uid, (items, err) => {
        if (err) {
            setError("Failed to load content. Please try refreshing the page.");
            toast({ title: "Real-time Error", description: "Could not listen for content updates.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const uniqueContentTypes = getUniqueContentTypesFromItems(items);
        const uniqueDomains = getUniqueDomainsFromItems(items);
        const uniqueTags = getUniqueTagsFromItems(items);

        setAllContentItems(items);
        setAvailableContentTypes(uniqueContentTypes);
        setAvailableDomains(uniqueDomains);
        setAvailableTags(uniqueTags);
        
        if (!initialDataLoaded) {
            setIsLoading(false);
            initialDataLoaded = true;
        }
    });

    return () => {
      unsubscribe(); // Cleanup subscription on component unmount
    };
  }, [user, toast]);


  useEffect(() => {
    if (isFilterPopoverOpen) {
      setPendingSearchTerm(appliedSearchTerm);
      setPendingSelectedContentType(appliedSelectedContentType);
      setPendingSelectedDomain(appliedSelectedDomain);
      setPendingSelectedTagIds([...appliedSelectedTagIds]);
    }
  }, [isFilterPopoverOpen, appliedSearchTerm, appliedSelectedContentType, appliedSelectedDomain, appliedSelectedTagIds]);

  const todoItems = useMemo(() => {
    return allContentItems
      .filter(item => item.type === 'todo')
      .sort((a, b) => {
        if (a.status === 'pending' && b.status === 'completed') return -1;
        if (a.status === 'completed' && b.status === 'pending') return 1;
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [allContentItems]);

  const otherItems = useMemo(() => {
    return allContentItems.filter(item => item.type !== 'todo');
  }, [allContentItems]);

  useEffect(() => {
    let filtered = [...otherItems];

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
  }, [appliedSearchTerm, appliedSelectedContentType, appliedSelectedDomain, appliedSelectedTagIds, otherItems]);
  
  const allDisplayItems = useMemo(() => [...todoItems, ...displayedContentItems], [todoItems, displayedContentItems]);

  const handleOpenDetailDialog = (item: ContentItem) => {
    setSelectedItemIdForDetail(item.id);
    setIsDetailDialogOpen(true);
  };

  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    toast({ title: "Item Updated", description: `"${updatedItem.title}" has been updated.`});
  };

  const handleDeleteContent = async (itemId: string) => {
    const originalItems = [...allContentItems];
    setAllContentItems(prevItems => prevItems.filter(item => item.id !== itemId));
    const {id: toastId} = toast({ title: "Deleting Item...", description: "Removing content item."});
    try {
      await deleteContentItem(itemId);
      toast({id: toastId, title: "Content Deleted", description: "The item has been removed.", variant: "default"});
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({id: toastId, title: "Error Deleting", description: "Could not delete item. Restoring.", variant: "destructive"});
      setAllContentItems(originalItems);
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
    setAppliedSelectedDomain(pendingSelectedDomain);
    setAppliedSelectedTagIds([...pendingSelectedTagIds]);
    setIsFilterPopoverOpen(false);
  };

  const handleClearAndApplyFilters = () => {
    setPendingSearchTerm('');
    setPendingSelectedContentType(ALL_FILTER_VALUE);
    setPendingSelectedDomain(ALL_FILTER_VALUE);
    setPendingSelectedTagIds([]);

    setAppliedSearchTerm('');
    setAppliedSelectedContentType(ALL_FILTER_VALUE);
    setAppliedSelectedDomain(ALL_FILTER_VALUE);
    setAppliedSelectedTagIds([]);
    setIsFilterPopoverOpen(false);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedSearchTerm.trim()) count++;
    if (appliedSelectedContentType !== ALL_FILTER_VALUE) count++;
    if (appliedSelectedDomain !== ALL_FILTER_VALUE) count++;
    if (appliedSelectedTagIds.length > 0) count++;
    return count;
  }, [appliedSearchTerm, appliedSelectedContentType, appliedSelectedDomain, appliedSelectedTagIds]);

  const handleToggleTodoStatus = async (todoId: string, currentStatus: 'pending' | 'completed' | undefined) => {
    if (isUpdatingTodoStatus === todoId) return;
    setIsUpdatingTodoStatus(todoId);
    const newStatus = (currentStatus === 'completed') ? 'pending' : 'completed';

    setAllContentItems(prevAllItems =>
      prevAllItems.map(item =>
        item.id === todoId ? { ...item, status: newStatus } : item
      )
    );

    try {
      await updateContentItem(todoId, { status: newStatus });
    } catch (error) {
      console.error('Error updating TODO status from dashboard:', error);
      toast({ title: "Error", description: "Could not update TODO status.", variant: "destructive" });
    } finally {
      setIsUpdatingTodoStatus(null);
    }
  };

  if (isLoading && allContentItems.length === 0) {
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
        <Button onClick={() => window.location.reload()} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-headline font-semibold text-foreground">Dashboard</h1>
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
                        <Label htmlFor="search-filter" className="text-sm font-medium">Search (Memories)</Label>
                         <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="search-filter"
                                placeholder="Search title, description..."
                                value={pendingSearchTerm}
                                onChange={(e) => setPendingSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="content-type-filter" className="text-sm font-medium">Content Type (Memories)</Label>
                        <Select value={pendingSelectedContentType} onValueChange={setPendingSelectedContentType}>
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
                        <Label htmlFor="domain-filter" className="text-sm font-medium">Domain (Memories)</Label>
                        <Select value={pendingSelectedDomain} onValueChange={setPendingSelectedDomain}>
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
                        <Label className="text-sm font-medium">Tags (Memories)</Label>
                        {availableTags.length > 0 ? (
                            <ScrollArea className="h-32 rounded-md border p-2">
                                <div className="space-y-1.5">
                                {availableTags.map(tag => (
                                    <div key={tag.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`tag-${tag.id}`}
                                            checked={pendingSelectedTagIds.includes(tag.id)}
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

      {(allContentItems.length === 0 && !isLoading) ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">No content saved yet.</h2>
          <p className="text-muted-foreground mt-2">Start by adding your first item!</p>
          <div className="mt-16 flex flex-col items-center justify-center relative">
            <svg
              className="w-48 h-48 text-primary/70"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M85 15 C 60 50, 40 55, 45 85"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="4 8"
                className="animate-pulse"
              />
               <path
                d="M40 89L45 85L49 89"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-4 text-lg font-medium text-muted-foreground animate-pulse">
              Click the <span className="text-primary font-semibold">+</span> button to begin!
            </p>
          </div>
        </div>
      ) : (
        <div>
            <h2 className="text-2xl font-headline font-semibold text-foreground mb-4">My Memories</h2>
            {allDisplayItems.length === 0 ? (
                <div className="text-center py-16 rounded-lg bg-muted/50">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-medium text-muted-foreground">
                    {activeFilterCount > 0 ? "No memories match your filters." : "Your saved memories will appear here."}
                </h2>
                <p className="text-muted-foreground mt-2">
                    {activeFilterCount > 0 ? (
                    <>Try easing up on those filters, or <Button variant="link" onClick={handleClearAndApplyFilters} className="p-0 h-auto text-primary inline">clear them</Button>.</>
                    ) : "Save some new links, notes, or images!"}
                </p>
            </div>
            ) : (
            <div className={'columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4'}>
                {allDisplayItems.map(item => (
                <ContentCard
                    key={item.id}
                    item={item}
                    onEdit={handleOpenDetailDialog}
                    onDelete={handleDeleteContent}
                    onToggleStatus={handleToggleTodoStatus}
                />
                ))}
            </div>
            )}
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
