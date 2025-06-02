
'use client';
import type React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog';
import type { ContentItem, Zone as AppZone, Tag as AppTag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, ListFilter, Loader2, FolderOpen, Search, XCircle, ListChecks, AlarmClock, CalendarDays } from 'lucide-react';
import AddContentDialog from '@/components/core/add-content-dialog';
import { useToast } from '@/hooks/use-toast';
import { getContentItems, addContentItem, deleteContentItem, getZones, getUniqueContentTypes, getUniqueDomains, getUniqueTags, updateContentItem } from '@/services/contentService';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';

const pageLoadingMessages = [
  "Organizing your memories...",
  "Fetching your inspirations...",
  "Aligning your ideas...",
  "Connecting the dots...",
];

const ALL_FILTER_VALUE = "__ALL__";

interface TodoDashboardCardProps {
  todos: ContentItem[];
  onToggleStatus: (todoId: string, currentStatus: 'pending' | 'completed' | undefined) => void;
  isLoading: boolean;
  onEditTodo: (todo: ContentItem) => void;
}

const TodoDashboardCard: React.FC<TodoDashboardCardProps> = ({ todos, onToggleStatus, isLoading, onEditTodo }) => {
  if (isLoading) {
    return (
      <Card className="mb-4 shadow-lg break-inside-avoid">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <ListChecks className="h-6 w-6 mr-2 text-primary" /> My TODOs
          </CardTitle>
          <CardDescription>Your upcoming tasks and reminders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 animate-pulse">
              <Checkbox disabled className="opacity-50" />
              <div className="flex-grow space-y-1.5">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (todos.length === 0) {
    return (
      <Card className="mb-4 shadow-lg break-inside-avoid">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <ListChecks className="h-6 w-6 mr-2 text-primary" /> My TODOs
          </CardTitle>
          <CardDescription>Your upcoming tasks and reminders.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-6">
          <ListChecks className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No active TODOs. Great job, or add some new ones!</p>
          <Button variant="link" className="mt-2" onClick={() => (window as any).openQuickTodo && (window as any).openQuickTodo()}>
            Add a TODO
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4 shadow-lg break-inside-avoid">
      <CardHeader>
        <CardTitle className="text-xl font-headline flex items-center">
          <ListChecks className="h-6 w-6 mr-2 text-primary" /> My TODOs
        </CardTitle>
        <CardDescription>Your upcoming tasks and reminders. Click title to edit.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
        {todos.map(todo => (
          <div key={todo.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors border">
            <Checkbox
              id={`todo-dash-${todo.id}`}
              checked={todo.status === 'completed'}
              onCheckedChange={() => onToggleStatus(todo.id, todo.status)}
              className="mt-1"
              aria-labelledby={`todo-dash-label-${todo.id}`}
            />
            <div className="flex-grow">
              <Label
                htmlFor={`todo-dash-${todo.id}`}
                id={`todo-dash-label-${todo.id}`}
                className={cn(
                  "font-medium text-foreground cursor-pointer hover:text-primary",
                  todo.status === 'completed' && "line-through text-muted-foreground hover:text-muted-foreground/80"
                )}
                onClick={(e) => {
                  e.preventDefault(); 
                  onEditTodo(todo);
                }}
              >
                {todo.title}
              </Label>
              {todo.dueDate && (
                <div className="text-xs text-muted-foreground flex items-center mt-0.5">
                  <AlarmClock className={cn(
                      "h-3.5 w-3.5 mr-1",
                      todo.status !== 'completed' && isPast(new Date(todo.dueDate)) ? "text-destructive" : "text-muted-foreground/80"
                    )}
                  />
                  <span className={cn(todo.status !== 'completed' && isPast(new Date(todo.dueDate)) ? "text-destructive font-semibold" : "")}>
                     {format(new Date(todo.dueDate), 'MMM d, yy')}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};


export default function DashboardPage() {
  const [allContentItems, setAllContentItems] = useState<ContentItem[]>([]);
  const [displayedContentItems, setDisplayedContentItems] = useState<ContentItem[]>([]); 
  
  const [zones, setZones] = useState<AppZone[]>([]);
  const [availableContentTypes, setAvailableContentTypes] = useState<string[]>([]);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<AppTag[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingTodoStatus, setIsUpdatingTodoStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isAddContentDialogOpen, setIsAddContentDialogOpen] = useState(false);
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
    
    const originalTodos = [...allContentItems];
    setAllContentItems(prevAllItems => 
      prevAllItems.map(item => 
        item.id === todoId ? { ...item, status: newStatus } : item
      )
    );

    try {
      const updatedItem = await updateContentItem(todoId, { status: newStatus });
      if (updatedItem) {
        toast({ title: "TODO Updated", description: `"${updatedItem.title}" marked as ${newStatus}.` });
      } else {
        throw new Error("Update failed, item not returned");
      }
    } catch (error) {
      console.error('Error updating TODO status from dashboard:', error);
      toast({ title: "Error", description: "Could not update TODO status.", variant: "destructive" });
      setAllContentItems(originalTodos); 
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
        <Button onClick={fetchData} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-headline font-semibold text-foreground">My Memories</h1>
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

      {isLoading && allContentItems.length > 0 ? ( // Show a smaller loading indicator if there's already content (e.g. during filter change)
        <div className="flex justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {(displayedContentItems.length === 0 && !isLoading && todoItems.length === 0) ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-medium text-muted-foreground">
                {activeFilterCount > 0 
                  ? "Hmm… no memories match your filters." 
                  : "No content saved yet."}
              </h2>
              <p className="text-muted-foreground mt-2">
                {activeFilterCount > 0 
                  ? (<>Try easing up on those filters, or <Button variant="link" onClick={handleClearAndApplyFilters} className="p-0 h-auto text-primary inline">clear them</Button> to see all your memories.</>)
                  : "Start by adding your first item!"}
              </p>
              { (allContentItems.length === 0 && activeFilterCount === 0 && !isLoading) &&
                 <Button onClick={() => { setIsAddContentDialogOpen(true);}} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Your First Item
                </Button>
              }
            </div>
          ) : (
             <div className={'columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4'}>
                <TodoDashboardCard
                  todos={todoItems}
                  onToggleStatus={handleToggleTodoStatus}
                  isLoading={isLoading && allContentItems.length === 0} 
                  onEditTodo={handleOpenDetailDialog}
                />
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
          {displayedContentItems.length === 0 && todoItems.length > 0 && !isLoading && activeFilterCount === 0 && (
            <div className="text-center py-12 mt-[-2rem]"> {/* Adjust margin if TodoCard has content */}
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-medium text-muted-foreground">No other memories found yet.</h2>
              <p className="text-muted-foreground mt-2">Save some new links, notes, or images!</p>
            </div>
          )}
           {displayedContentItems.length === 0 && todoItems.length > 0 && !isLoading && activeFilterCount > 0 && (
            <div className="text-center py-12 mt-[-2rem]">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-medium text-muted-foreground">Hmm… no memories match your filters.</h2>
              <p className="text-muted-foreground mt-2">
                Try easing up on those filters, or <Button variant="link" onClick={handleClearAndApplyFilters} className="p-0 h-auto text-primary inline">clear them</Button> to see all your memories.
              </p>
            </div>
          )}
        </>
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
