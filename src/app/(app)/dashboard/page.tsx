

'use client';
import type React from 'react';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog';
import type { ContentItem, AppZone, Task, SearchFilters } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, FolderOpen, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteContentItem, subscribeToTaskList, updateTaskList } from '@/services/contentService';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { useSearch } from '@/context/SearchContext';
import TodoListCard from '@/components/dashboard/TodoListCard';
import type { Unsubscribe } from 'firebase/firestore';

const pageLoadingMessages = [
  "Organizing your memories...",
  "Fetching your inspirations...",
  "Aligning your ideas...",
  "Connecting the dots...",
];

function DashboardPageContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { setIsAddTodoDialogOpen, newlyAddedItem, setNewlyAddedItem } = useDialog();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const zoneId = searchParams.get('zone') || '';
  const isSearching = !!query.trim() || !!zoneId.trim();

  // Search state is now the primary source of truth for content
  const { search, searchResults, isLoading: isSearchLoading, isInitialized, hasMore, totalHits } = useSearch();

  const [contentToDisplay, setContentToDisplay] = useState<ContentItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isUpdatingTodoStatus, setIsUpdatingTodoStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemIdForDetail, setSelectedItemIdForDetail] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const { toast } = useToast();
  const [clientLoadingMessage, setClientLoadingMessage] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

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
       search(query, filters, { limit: 100, append: false });
    }
  }, [query, zoneId, isInitialized, search]);
  
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
    await search(query, filters, { limit: 100, offset: contentToDisplay.length, append: true });
    setIsFetchingMore(false);

  }, [isFetchingMore, hasMore, search, query, zoneId, contentToDisplay.length]);
  
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


  const handleOpenDetailDialog = (item: ContentItem) => {
    setSelectedItemIdForDetail(item.id);
    setIsDetailDialogOpen(true);
  };
  
  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    setContentToDisplay(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item));
  };
  
  const handleDeleteContent = async (itemId: string) => {
    // Optimistic update
    setContentToDisplay(prevItems => prevItems.filter(item => item.id !== itemId));
    const {id: toastId} = toast({ title: "Deleting Item...", description: "Removing content item."});
    try {
      await deleteContentItem(itemId);
      toast({id: toastId, title: "Content Deleted", description: "The item has been removed.", variant: "default"});
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({id: toastId, title: "Error Deleting", description: "Could not delete item.", variant: "destructive"});
      // Note: A full re-fetch might be warranted here in a real-world scenario
    }
  };

  const handleToggleTodoStatus = async (taskId: string) => {
    if (!user || isUpdatingStatus === taskId) return;
    setIsUpdatingStatus(taskId);

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
      setIsUpdatingStatus(null);
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

  const isPageLoading = isAuthLoading || !isInitialized || (isSearchLoading && contentToDisplay.length === 0);

  if (isPageLoading) {
    const message = isSearching ? "Searching your memories..." : (clientLoadingMessage || pageLoadingMessages[0]);
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto py-2">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{message}</p>
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

  const noContentOnDashboard = !isSearching && contentToDisplay.length === 0 && tasks.length === 0;

  return (
    <>
      <div className="container mx-auto py-2">
        {isSearching ? (
          <div className="text-center py-6">
            <h2 className="text-2xl font-headline font-semibold">Search Results</h2>
            <p className="text-muted-foreground">Found {totalHits} items for &quot;{query}&quot;</p>
          </div>
        ) : null}

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
            <div className={'columns-2 md:columns-2 lg:columns-3 xl:columns-4 gap-4'}>
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
                    <div className="w-full break-inside-avoid mb-4">
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
                  onEdit={handleOpenDetailDialog}
                  onDelete={handleDeleteContent}
                />
              ))}
            </div>
            <div ref={loaderRef} className="flex justify-center items-center h-16">
              {isFetchingMore && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
              {!hasMore && contentToDisplay.length > 0 && (
                  <p className="text-muted-foreground">You've reached the end!</p>
              )}
            </div>
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
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto py-2">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    }>
        <DashboardPageContent />
    </Suspense>
  )
}
