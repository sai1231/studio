

'use client';
import type React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog';
import type { ContentItem, AppZone, Task } from '@/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Loader2, FolderOpen, ListChecks, AlarmClock, Clapperboard, MessagesSquare, FileImage, Globe, BookOpen, StickyNote, Github, FileText, Trash2, Search as SearchIcon, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getContentItems, getContentItemsPaginated, deleteContentItem, updateTaskList, getContentCount, subscribeToTaskList } from '@/services/contentService';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { DocumentSnapshot, Unsubscribe } from 'firebase/firestore';
import { useSearch } from '@/context/SearchContext';

const pageLoadingMessages = [
  "Organizing your memories...",
  "Fetching your inspirations...",
  "Aligning your ideas...",
  "Connecting the dots...",
];

const TodoListCard: React.FC<{
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onDeleteItem: (taskId: string) => void;
  isUpdatingStatus: string | null;
  onAddTodoClick: () => void;
}> = ({ tasks, onToggleStatus, onDeleteItem, isUpdatingStatus, onAddTodoClick }) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-mati-internal', 'true');
  };

  return (
    <Card 
      draggable="true"
      onDragStart={handleDragStart}
      className="shadow-lg flex flex-col w-full break-inside-avoid mb-4"
    >
      <CardContent className="p-0 flex-grow">
        <ScrollArea className="max-h-96 p-4">
          <div className="space-y-2">
            {tasks.map(task => (
              <div key={task.id} className="group flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <Checkbox
                  id={`dialog-todo-${task.id}`}
                  checked={task.status === 'completed'}
                  onCheckedChange={() => onToggleStatus(task.id)}
                  disabled={isUpdatingStatus === task.id}
                  aria-labelledby={`dialog-todo-label-${task.id}`}
                  className="shrink-0 mt-1"
                />
                <div className="flex-grow min-w-0">
                  <Label
                    htmlFor={`dialog-todo-${task.id}`}
                    id={`dialog-todo-label-${task.id}`}
                    className={cn(
                      "font-medium text-foreground cursor-pointer break-words",
                      task.status === 'completed' && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </Label>
                  {task.dueDate && (
                    <div className="text-xs text-muted-foreground flex items-center mt-1.5">
                      <AlarmClock className={cn(
                          "h-3.5 w-3.5 mr-1.5",
                          task.status !== 'completed' && isPast(new Date(task.dueDate)) ? "text-destructive" : "text-muted-foreground/80"
                        )}
                      />
                      <span className={cn(task.status !== 'completed' && isPast(new Date(task.dueDate)) ? "text-destructive font-semibold" : "")}>
                         {format(new Date(task.dueDate), 'MMM d, yy')}
                      </span>
                    </div>
                  )}
                </div>
                 {isUpdatingStatus === task.id ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary ml-auto shrink-0" />
                 ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-card-foreground hover:bg-primary hover:text-primary-foreground ml-auto shrink-0"
                          onClick={(e) => {
                            e.stopPropagation(); 
                            onDeleteItem(task.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete Task</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                 )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
       <div className="border-t p-2 flex-shrink-0">
        <Button
          variant="link"
          size="sm"
          className="w-full text-muted-foreground hover:text-primary"
          onClick={onAddTodoClick}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add a task
        </Button>
      </div>
    </Card>
  );
};


function DashboardPageContent() {
  const { user, role, isLoading: isAuthLoading } = useAuth();
  const { setIsAddTodoDialogOpen, newlyAddedItem, setNewlyAddedItem } = useDialog();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const isSearching = !!query.trim();

  // Search state
  const { search, searchResults, isLoading: isSearchLoading, isInitialized } = useSearch();

  // Dashboard state (for non-search view)
  const [displayedItems, setDisplayedItems] = useState<ContentItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [totalContentCount, setTotalContentCount] = useState<number | null>(null);
  
  // Shared state
  const [isUpdatingTodoStatus, setIsUpdatingTodoStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemIdForDetail, setSelectedItemIdForDetail] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const { toast } = useToast();
  const [clientLoadingMessage, setClientLoadingMessage] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const handleAddTodoClick = () => setIsAddTodoDialogOpen(true);

  // Effect to trigger search when query changes
  useEffect(() => {
    if (isInitialized && isSearching) {
      search(query, {}); 
    }
  }, [query, isInitialized, search, isSearching]);
  
  const fetchMoreContent = useCallback(async (userId: string) => {
    if (!hasMore || isFetchingMore) return;

    const contentLimit = role?.features.contentLimit;
    if (contentLimit !== -1) {
        setHasMore(false);
        return;
    }

    setIsFetchingMore(true);
    try {
      const { items, lastVisibleDoc: newLastDoc } = await getContentItemsPaginated({
        userId,
        pageSize: 100,
        lastDoc: lastVisibleDoc || undefined,
      });
      
      setDisplayedItems(prev => [...prev, ...items]);
      setLastVisibleDoc(newLastDoc);
      setHasMore(!!newLastDoc);
    } catch (err) {
      setError("Failed to load more content.");
      toast({ title: "Error", description: "Could not fetch more content.", variant: "destructive" });
    } finally {
      setIsFetchingMore(false);
    }
  }, [hasMore, isFetchingMore, lastVisibleDoc, toast, role]);


  // Effect for initial data load (only runs when not searching)
  useEffect(() => {
    if (isSearching || isAuthLoading) {
      if (!isAuthLoading) setIsLoading(false);
      return;
    }

    if (!user) {
      setIsLoading(false);
      setDisplayedItems([]);
      setTasks([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setDisplayedItems([]);
    setTasks([]);
    setLastVisibleDoc(null);
    setHasMore(true);
    setTotalContentCount(null);
    
    let taskUnsubscribe: Unsubscribe;
    
    const initialFetch = async () => {
      try {
        taskUnsubscribe = subscribeToTaskList(user.uid, (taskList) => {
          if (taskList) {
            setTasks(taskList.tasks);
          }
        });
        
        if (!role?.features) {
          setHasMore(false);
          setDisplayedItems([]);
          return;
        }

        const contentLimit = role.features.contentLimit;

        if (contentLimit === 0) {
            setHasMore(false);
            setDisplayedItems([]);
            setTotalContentCount(0);
        } else if (contentLimit > 0) {
            setHasMore(false);
            const limitedItems = await getContentItems(user.uid, contentLimit);
            const totalCount = await getContentCount(user.uid);
            setDisplayedItems(limitedItems);
            setTotalContentCount(totalCount);
        } else {
            const { items, lastVisibleDoc: newLastDoc } = await getContentItemsPaginated({ userId: user.uid, pageSize: 100 });
            setDisplayedItems(items);
            setLastVisibleDoc(newLastDoc);
            setHasMore(!!newLastDoc);
            setTotalContentCount(null);
        }
      } catch (err) {
        setError("Failed to load initial content.");
      } finally {
        setIsLoading(false);
      }
    };

    initialFetch();
    
    return () => {
        if(taskUnsubscribe) taskUnsubscribe();
    }

  }, [user, role, isSearching, isAuthLoading]);
  
  // Effect to add newly created items to the view
  useEffect(() => {
    if (newlyAddedItem) {
      setDisplayedItems(prevItems => [newlyAddedItem, ...prevItems]);
      setNewlyAddedItem(null);
    }
  }, [newlyAddedItem, setNewlyAddedItem]);

  // Effect for infinite scroll (only runs when not searching)
  useEffect(() => {
    if (isSearching || isFetchingMore || !hasMore || !user) return;

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        fetchMoreContent(user.uid);
      }
    });

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [isSearching, isFetchingMore, hasMore, user, fetchMoreContent]);

  const handleOpenDetailDialog = (item: ContentItem) => {
    setSelectedItemIdForDetail(item.id);
    setIsDetailDialogOpen(true);
  };

  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    setDisplayedItems(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const handleDeleteContent = async (itemId: string) => {
    setDisplayedItems(prevItems => prevItems.filter(item => item.id !== itemId));
    const {id: toastId} = toast({ title: "Deleting Item...", description: "Removing content item."});
    try {
      await deleteContentItem(itemId);
      toast({id: toastId, title: "Content Deleted", description: "The item has been removed.", variant: "default"});
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({id: toastId, title: "Error Deleting", description: "Could not delete item. Restoring.", variant: "destructive"});
    }
  };

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
      setTasks(tasks); // Revert on failure
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

  const isPageLoading = isAuthLoading || isLoading || (isSearching && (isSearchLoading || !isInitialized));

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
  
  const contentToDisplay = isSearching ? searchResults : displayedItems;
  const hiddenCount = totalContentCount !== null && role?.features.contentLimit > 0
    ? totalContentCount - displayedItems.length
    : 0;

  const noContentOnDashboard = !isSearching && displayedItems.length === 0 && tasks.length === 0 && !(hiddenCount > 0);

  return (
    <>
      <div className="container mx-auto py-2">
        {isSearching ? (
          <div className="text-center py-6">
            <h2 className="text-2xl font-headline font-semibold">Search Results</h2>
            <p className="text-muted-foreground">Found {searchResults.length} items for &quot;{query}&quot;</p>
          </div>
        ) : null}

        {noContentOnDashboard ? (
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
                    <Card 
                      draggable="true"
                      onDragStart={(e: React.DragEvent) => e.dataTransfer.setData('application/x-mati-internal', 'true')}
                      className="shadow-lg flex flex-col w-full break-inside-avoid mb-4"
                    >
                        <CardContent className="p-6 flex-grow flex flex-col items-center justify-center text-center min-h-[150px]">
                            <ListChecks className="h-10 w-10 text-muted-foreground mb-3" />
                            <p className="font-medium text-foreground">You're all caught up!</p>
                            <p className="text-sm text-muted-foreground">No pending tasks.</p>
                        </CardContent>
                        <div className="border-t p-2 flex-shrink-0">
                            <Button
                                variant="link"
                                size="sm"
                                className="w-full text-muted-foreground hover:text-primary"
                                onClick={handleAddTodoClick}
                            >
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add a task
                            </Button>
                        </div>
                    </Card>
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
            {!isSearching && (
              <div ref={loaderRef} className="flex justify-center items-center h-16">
                {isFetchingMore && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
                {!hasMore && displayedItems.length > 0 && (
                    <p className="text-muted-foreground">You've reached the end!</p>
                )}
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

      {hiddenCount > 0 && (
        <div className="fixed bottom-4 right-4 z-40 max-w-xs rounded-lg border bg-background p-3 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2">
            <div className="flex items-center gap-2">
                <div className="flex-shrink-0">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-grow text-sm">
                    <p className="text-muted-foreground">
                        <span className="font-semibold text-foreground">Limit reached.</span> You have {hiddenCount} more {hiddenCount === 1 ? 'memory' : 'memories'} hidden.
                        <Button variant="link" className="p-0 h-auto ml-1 text-primary underline align-baseline" onClick={() => toast({ title: 'Coming Soon!', description: 'Subscription management will be available shortly.' })}>
                          Upgrade
                        </Button>
                    </p>
                </div>
            </div>
        </div>
      )}
    </>
  );
}

export default function DashboardPage() {
  return (
    // Suspense is needed because useSearchParams is a client-side hook
    <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto py-2">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    }>
        <DashboardPageContent />
    </Suspense>
  )
}
