

'use client';
import type React from 'react';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog';
import type { ContentItem, AppZone, Task, SearchFilters, Zone, Tag } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, FolderOpen, ListChecks, LayoutGrid, Rows3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { moveItemToTrash, subscribeToTaskList, updateTaskList, updateContentItem, getContentItemById, addZone } from '@/services/contentService';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { useSearch } from '@/context/SearchContext';
import TodoListCard from '@/components/dashboard/TodoListCard';
import type { Unsubscribe } from 'firebase/firestore';
import { AnimatePresence } from 'framer-motion';
import BulkActionBar from '@/components/core/BulkActionBar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";

const pageLoadingMessages = [
  "Organizing your memories...",
  "Fetching your inspirations...",
  "Aligning your ideas...",
  "Connecting the dots...",
];

type ViewMode = 'grid' | 'moodboard';

function DashboardPageContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { setIsAddTodoDialogOpen, newlyAddedItem, setNewlyAddedItem, openFocusMode } = useDialog();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Extract all potential search params
  const query = searchParams.get('q') || '';
  const zoneId = searchParams.get('zone') || '';
  const tagNames = searchParams.has('tag') ? searchParams.get('tag')!.split(',') : [];
  const domainName = searchParams.get('domain') || '';
  const contentType = searchParams.get('type') || '';
  
  const isSearching = !!query.trim() || !!zoneId.trim() || tagNames.length > 0 || !!domainName.trim() || !!contentType.trim();

  // Search state is now the primary source of truth for content
  const { search, searchResults, isLoading: isSearchLoading, isInitialized, hasMore, totalHits, availableZones } = useSearch();

  const [contentToDisplay, setContentToDisplay] = useState<ContentItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isUpdatingTodoStatus, setIsUpdatingTodoStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<ContentItem | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const { toast } = useToast();
  const [clientLoadingMessage, setClientLoadingMessage] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const regularZones = availableZones.filter(z => !z.isMoodboard);
  const moodboards = availableZones.filter(z => z.isMoodboard);

  // Update local display state when search results change from context
  useEffect(() => {
    setContentToDisplay(searchResults);
  }, [searchResults]);

  // Optimistically add newly created items to the top of the list
  useEffect(() => {
    if (newlyAddedItem) {
      setContentToDisplay(prevItems => [newlyAddedItem, ...prevItems]);
      setNewlyAddedItem(null);
    }
  }, [newlyAddedItem, setNewlyAddedItem]);
  
  // Effect to handle searching from the header
  useEffect(() => {
    if (isInitialized) {
       const filters: SearchFilters = {};
       if (zoneId) filters.zoneId = zoneId;
       if (tagNames.length > 0) filters.tagNames = tagNames;
       if (domainName) filters.domain = domainName;
       if (contentType) filters.contentType = contentType;
       
       search(query, filters, { limit: 100, append: false });
    }
  }, [query, zoneId, tagNames.join(','), domainName, contentType, isInitialized, search]);
  
  // Effect for initial data load (empty search)
  useEffect(() => {
    // Only run initial load if not searching, and if we haven't loaded anything yet.
    if (!isSearching && isInitialized && searchResults.length === 0) {
      search('', {}, { limit: 100, append: false });
    }
  }, [isInitialized, isSearching, search, searchResults.length]);


  // Subscribe to tasks
  useEffect(() => {
    if (!user) return;
    let taskUnsubscribe: Unsubscribe;
    try {
       taskUnsubscribe = subscribeToTaskList(user.uid, (taskList) => {
        if (taskList) {
          setTasks(taskList.tasks);
        }
      });
    } catch(err) {
      console.error("Task subscription failed:", err);
      setError("Failed to load tasks.");
    }
    return () => {
      if(taskUnsubscribe) taskUnsubscribe();
    }
  }, [user]);

  const fetchMoreContent = useCallback(async () => {
    if (isFetchingMore || !hasMore) return;
    
    setIsFetchingMore(true);
    const filters: SearchFilters = {};
    if (zoneId) filters.zoneId = zoneId;
    if (tagNames.length > 0) filters.tagNames = tagNames;
    if (domainName) filters.domain = domainName;
    if (contentType) filters.contentType = contentType;
    await search(query, filters, { limit: 100, offset: contentToDisplay.length, append: true });
    setIsFetchingMore(false);

  }, [isFetchingMore, hasMore, search, query, zoneId, tagNames, domainName, contentType, contentToDisplay.length]);
  
  // Effect for infinite scroll
  useEffect(() => {
    if (isFetchingMore || !hasMore || !user) return;

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        fetchMoreContent();
      }
    }, { rootMargin: "400px" });

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [isFetchingMore, hasMore, user, fetchMoreContent]);


  const handleItemClick = useCallback((item: ContentItem) => {
    if (selectedItems.length > 0) {
      // If in selection mode, a click toggles selection
      setSelectedItems(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
    } else {
      // Otherwise, open detail view
      if (item.type === 'note') {
        openFocusMode(item);
      } else {
        setSelectedItemForDetail(item);
        setIsDetailDialogOpen(true);
      }
    }
  }, [openFocusMode, selectedItems.length]);
  
  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    setContentToDisplay(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item));
  };
  
  const handleDeleteContent = useCallback(async (itemId: string) => {
    // Optimistic update
    setContentToDisplay(prevItems => prevItems.filter(item => item.id !== itemId));
    const {id: toastId} = toast({ title: "Moving to Trash...", description: "Item is being moved."});
    try {
      await moveItemToTrash(itemId);
      toast({id: toastId, title: "Item Moved to Trash", description: "You can restore it later.", variant: "default"});
    } catch (e) {
      console.error("Error moving item to trash:", e);
      toast({id: toastId, title: "Error", description: "Could not move item to trash.", variant: "destructive"});
      // Note: A full re-fetch might be warranted here in a real-world scenario
    }
  }, [toast]);

  const handleToggleTodoStatus = async (taskId: string) => {
    if (!user || isUpdatingTodoStatus === taskId) return;
    setIsUpdatingTodoStatus(taskId);

    const updatedTasks = tasks.map(t => 
        t.id === taskId ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t
    );
    setTasks(updatedTasks); // Optimistic update

    try {
      await updateTaskList(user.uid, updatedTasks);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({ title: "Error", description: "Could not update task status. Reverting.", variant: "destructive" });
      // Revert logic could be implemented here if needed
    } finally {
      setIsUpdatingTodoStatus(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if(!user) return;
    const originalTasks = tasks;
    const newTasks = tasks.filter(t => t.id !== taskId);
    setTasks(newTasks);
    try {
        await updateTaskList(user.uid, newTasks);
        toast({title: "Task Deleted", description: "The task has been removed."})
    } catch(e) {
        console.error('Error deleting task:', e);
        toast({title: "Error Deleting", description: "Could not delete task. Reverting.", variant: "destructive"});
        setTasks(originalTasks);
    }
  }

  useEffect(() => {
    setClientLoadingMessage(pageLoadingMessages[Math.floor(Math.random() * pageLoadingMessages.length)]);
  }, []);
  
  const handleAddTodoClick = () => setIsAddTodoDialogOpen(true);
  
  const handleToggleSelection = (itemId: string) => {
    setSelectedItems(prev => prev.includes(itemId) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
  };
  
  const handleBulkEdit = async (updates: {
    zoneId?: string | null;
    tagsToAdd?: string[];
    memoryNoteToAppend?: string;
    expiresAt?: string | null;
  }) => {
    const { id: toastId } = toast({ title: 'Applying changes...', description: `Updating ${selectedItems.length} items.` });

    try {
      const updatePromises = selectedItems.map(async (itemId) => {
        const itemToUpdate = contentToDisplay.find(item => item.id === itemId) || await getContentItemById(itemId);
        if (!itemToUpdate) return;

        let finalUpdates: Partial<ContentItem> = {};

        if (updates.zoneId !== undefined) {
          finalUpdates.zoneIds = updates.zoneId === null ? [] : [updates.zoneId];
        }

        if (updates.tagsToAdd && updates.tagsToAdd.length > 0) {
          const existingTags = itemToUpdate.tags || [];
          const newTags = updates.tagsToAdd.map(tagName => ({ id: tagName.toLowerCase(), name: tagName }));
          const combined = [...existingTags, ...newTags];
          finalUpdates.tags = combined.filter((tag, index, self) => index === self.findIndex(t => t.name.toLowerCase() === tag.name.toLowerCase()));
        }

        if (updates.memoryNoteToAppend) {
          const existingNote = itemToUpdate.memoryNote || '';
          finalUpdates.memoryNote = existingNote ? `${existingNote}\n\n${updates.memoryNoteToAppend}` : updates.memoryNoteToAppend;
        }

        if (updates.expiresAt !== undefined) {
          finalUpdates.expiresAt = updates.expiresAt === null ? undefined : updates.expiresAt;
        }
        
        if (Object.keys(finalUpdates).length > 0) {
          await updateContentItem(itemId, finalUpdates);
        }
      });

      await Promise.all(updatePromises);
      
      // Manually trigger a search to refresh the UI with the new data
      const currentParams = new URLSearchParams(searchParams.toString());
      search(currentParams.get('q') || '', {
        zoneId: currentParams.get('zone'),
        tagNames: currentParams.has('tag') ? currentParams.get('tag')!.split(',') : [],
        domain: currentParams.get('domain'),
        contentType: currentParams.get('type')
      }, { limit: 100, append: false });

      toast({ id: toastId, title: 'Update Complete!', description: `${selectedItems.length} items have been updated.` });
      setSelectedItems([]);

    } catch (error) {
        toast({ id: toastId, title: 'Update Failed', description: 'Could not update all items.', variant: 'destructive' });
    }
  };

  const handleAddToMoodboard = async (moodboardId: string) => {
    const { id: toastId } = toast({ title: 'Adding to Moodboard...', description: `Adding ${selectedItems.length} items.` });
    
    try {
       const updatePromises = selectedItems.map(itemId => {
         return updateContentItem(itemId, { zoneIds: [moodboardId] });
       });
       
       await Promise.all(updatePromises);
       
       const currentParams = new URLSearchParams(searchParams.toString());
       search(currentParams.get('q') || '', {
         zoneId: currentParams.get('zone'),
         tagNames: currentParams.has('tag') ? currentParams.get('tag')!.split(',') : [],
         domain: currentParams.get('domain'),
         contentType: currentParams.get('type')
       }, { limit: 100, append: false });
       
       toast({ id: toastId, title: 'Update Complete!', description: `${selectedItems.length} items added to moodboard.` });
       setSelectedItems([]);

    } catch (error) {
        toast({ id: toastId, title: 'Update Failed', description: 'Could not add items to moodboard.', variant: 'destructive' });
    }
  };
  
  const handleDeleteSelected = async () => {
    const { id: toastId } = toast({ title: 'Moving Items to Trash...', description: `Moving ${selectedItems.length} items.` });
    const originalItems = [...contentToDisplay];
    
    setContentToDisplay(prev => prev.filter(item => !selectedItems.includes(item.id)));
    
    try {
        await Promise.all(selectedItems.map(moveItemToTrash));
        toast({ id: toastId, title: 'Items Moved to Trash!', description: `${selectedItems.length} items have been moved.` });
        setSelectedItems([]);
    } catch(error) {
        toast({ id: toastId, title: 'Action Failed', description: 'Could not move all items to trash. Reverting.', variant: 'destructive' });
        setContentToDisplay(originalItems);
    }
  };

  const handleCreateZone = async (zoneName: string, isMoodboard = false): Promise<Zone | null> => {
    if (!zoneName.trim() || !user) return null;
    try {
      const newZone = await addZone(zoneName.trim(), user.uid, isMoodboard);
      // The `zones` state in SearchContext will update automatically via the Firestore listener
      toast({ title: "Collection Created", description: `"${newZone.name}" created.` });
      return newZone;
    } catch (e) {
      console.error('Error creating zone:', e);
      toast({ title: "Error", description: "Could not create new collection.", variant: "destructive" });
      return null;
    }
  };

  const handleSelectAll = () => {
    setSelectedItems(contentToDisplay.map(item => item.id));
  };


  const isPageLoading = isAuthLoading || !isInitialized || (isSearchLoading && contentToDisplay.length === 0);

  if (isPageLoading) {
    const message = isSearching ? "Searching your memories..." : (clientLoadingMessage || pageLoadingMessages[0]);
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] py-2">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{message}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-destructive">
        <FolderOpen className="h-16 w-16 mx-auto text-destructive mb-4" />
        <h1 className="text-2xl font-headline font-semibold">Error Loading Content</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">Try Again</Button>
      </div>
    );
  }

  const noContentOnDashboard = !isSearching && contentToDisplay.length === 0 && tasks.length === 0;

  return (
    <>
      <div className="py-2">

        {noContentOnDashboard ? (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-medium text-muted-foreground">No content saved yet.</h2>
            <p className="text-muted-foreground mt-2">Start by adding your first item!</p>
            <div className="mt-16 flex flex-col items-center justify-center relative">
              <svg className="w-48 h-48 text-primary/70" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M85 15 C 60 50, 40 55, 45 85" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 8" className="animate-pulse" />
                <path d="M40 89L45 85L49 89" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="mt-4 text-lg font-medium text-muted-foreground animate-pulse">
                Click the <span className="text-primary font-semibold">+</span> button to begin!
              </p>
            </div>
          </div>
        ) : isSearching && contentToDisplay.length === 0 ? (
           <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-medium text-muted-foreground">No items found.</h2>
            <p className="text-muted-foreground mt-2">Try a different search term.</p>
          </div>
        ) : (
          <div>
            <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 750: 2, 900: 3, 1200: 4, 1500: 5 }}>
                <Masonry gutter="0.75rem">
                {!isSearching && (
                    <>
                    {tasks.length > 0 ? (
                        <TodoListCard
                        tasks={tasks}
                        onToggleStatus={handleToggleTodoStatus}
                        onDeleteItem={handleDeleteTask}
                        isUpdatingStatus={isUpdatingTodoStatus}
                        onAddTodoClick={handleAddTodoClick}
                        />
                    ) : (
                        // Placeholder for when no tasks exist
                        <div className="break-inside-avoid">
                        <Button onClick={handleAddTodoClick} variant="outline" className="w-full h-full min-h-[150px] flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all border-dashed">
                            <ListChecks className="h-8 w-8 mb-2" />
                            <span className="font-medium">No Tasks Yet</span>
                            <span className="text-xs">Click to add one</span>
                        </Button>
                        </div>
                    )}
                    </>
                )}

                {contentToDisplay.map(item => (
                    <ContentCard
                    key={item.id}
                    item={item}
                    viewMode={viewMode}
                    onEdit={handleItemClick}
                    onDelete={handleDeleteContent}
                    isSelected={selectedItems.includes(item.id)}
                    onToggleSelection={handleToggleSelection}
                    isSelectionActive={selectedItems.length > 0}
                    />
                ))}
                </Masonry>
            </ResponsiveMasonry>
            <div ref={loaderRef} className="flex justify-center items-center h-16">
              {isFetchingMore && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
              {!hasMore && contentToDisplay.length > 0 && (
                  <p className="text-muted-foreground">You've reached the end!</p>
              )}
            </div>
          </div>
        )}

        <AnimatePresence>
            {selectedItems.length > 0 && (
                <BulkActionBar
                    selectedCount={selectedItems.length}
                    onClearSelection={() => setSelectedItems([])}
                    onSelectAll={handleSelectAll}
                    availableZones={regularZones}
                    availableMoodboards={moodboards}
                    onBulkEdit={handleBulkEdit}
                    onAddToMoodboard={handleAddToMoodboard}
                    onDelete={handleDeleteSelected}
                    onZoneCreate={handleCreateZone}
                />
            )}
        </AnimatePresence>

        <ContentDetailDialog
          item={selectedItemForDetail}
          open={isDetailDialogOpen}
          onOpenChange={(open) => {
            setIsDetailDialogOpen(open);
            if (!open) setSelectedItemForDetail(null);
          }}
          onItemUpdate={handleItemUpdateInDialog}
          onItemDelete={handleDeleteContent}
        />
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] py-2">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    }>
        <DashboardPageContent />
    </Suspense>
  )
}
