
'use client';
import type React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog';
import type { ContentItem, Zone as AppZone } from '@/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Loader2, FolderOpen, ListChecks, AlarmClock, Clapperboard, MessagesSquare, FileImage, Globe, BookOpen, StickyNote, Github, FileText, Trash2, Search as SearchIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getContentItemsPaginated, getTodoItems, deleteContentItem, getZones, updateContentItem } from '@/services/contentService';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { DocumentSnapshot } from 'firebase/firestore';
import { useSearch } from '@/context/SearchContext';

const pageLoadingMessages = [
  "Organizing your memories...",
  "Fetching your inspirations...",
  "Aligning your ideas...",
  "Connecting the dots...",
];

const TodoListCard: React.FC<{
  items: ContentItem[];
  onToggleStatus: (itemId: string, currentStatus: 'pending' | 'completed' | undefined) => void;
  onDeleteItem: (itemId: string) => void;
  isUpdatingStatus: string | null;
  onAddTodoClick: () => void;
}> = ({ items, onToggleStatus, onDeleteItem, isUpdatingStatus, onAddTodoClick }) => {
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
            {items.map(todo => (
              <div key={todo.id} className="group flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <Checkbox
                  id={`dialog-todo-${todo.id}`}
                  checked={todo.status === 'completed'}
                  onCheckedChange={() => onToggleStatus(todo.id, todo.status)}
                  disabled={isUpdatingStatus === todo.id}
                  aria-labelledby={`dialog-todo-label-${todo.id}`}
                  className="shrink-0 mt-1"
                />
                <div className="flex-grow min-w-0">
                  <Label
                    htmlFor={`dialog-todo-${todo.id}`}
                    id={`dialog-todo-label-${todo.id}`}
                    className={cn(
                      "font-medium text-foreground cursor-pointer break-words",
                      todo.status === 'completed' && "line-through text-muted-foreground"
                    )}
                  >
                    {todo.title}
                  </Label>
                  {todo.dueDate && (
                    <div className="text-xs text-muted-foreground flex items-center mt-1.5">
                      <AlarmClock className={cn(
                          "h-3.5 w-3.5 mr-1.5",
                          todo.status !== 'completed' && isPast(new Date(todo.dueDate)) ? "text-destructive" : "text-muted-foreground/80"
                        )}
                      />
                      <span className={cn(todo.status !== 'completed' && isPast(new Date(todo.dueDate)) ? "text-destructive font-semibold" : "")}>
                         {format(new Date(todo.dueDate), 'MMM d, yy')}
                      </span>
                    </div>
                  )}
                </div>
                 {isUpdatingStatus === todo.id ? (
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
                            e.stopPropagation(); // prevent card's onEdit from firing
                            onDeleteItem(todo.id);
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
  const { user } = useAuth();
  const { setIsAddTodoDialogOpen, newlyAddedItem, setNewlyAddedItem } = useDialog();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const isSearching = !!query.trim();

  // Search state
  const { search, searchResults, isLoading: isSearchLoading, isInitialized } = useSearch();

  // Dashboard state (for non-search view)
  const [displayedItems, setDisplayedItems] = useState<ContentItem[]>([]);
  const [todoItems, setTodoItems] = useState<ContentItem[]>([]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  
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
      search(query, {}); // Empty filters for now
    }
  }, [query, isInitialized, search, isSearching]);

  const fetchTodos = useCallback(async (userId: string) => {
    try {
      const todos = await getTodoItems(userId);
      setTodoItems(todos.sort((a, b) => {
        if (a.status === 'pending' && b.status === 'completed') return -1;
        if (a.status === 'completed' && b.status === 'pending') return 1;
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }));
    } catch (err) {
      console.error("Error fetching todos:", err);
      toast({ title: "Error", description: "Could not fetch your tasks.", variant: "destructive" });
    }
  }, [toast]);
  
  const fetchMoreContent = useCallback(async (userId: string) => {
    if (!hasMore || isFetchingMore) return;
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
  }, [hasMore, isFetchingMore, lastVisibleDoc, toast]);


  // Effect for initial data load (only runs when not searching)
  useEffect(() => {
    if (isSearching) {
      setIsLoading(false);
      return;
    }
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setDisplayedItems([]);
    setTodoItems([]);
    setLastVisibleDoc(null);
    setHasMore(true);

    const initialFetch = async () => {
      try {
        await fetchTodos(user.uid);
        const { items, lastVisibleDoc: newLastDoc } = await getContentItemsPaginated({ userId: user.uid, pageSize: 100 });
        setDisplayedItems(items);
        setLastVisibleDoc(newLastDoc);
        setHasMore(!!newLastDoc);
      } catch (err) {
        setError("Failed to load initial content.");
      } finally {
        setIsLoading(false);
      }
    };
    initialFetch();

  }, [user, fetchTodos, isSearching]);
  
  // Effect to add newly created items to the view
  useEffect(() => {
    if (newlyAddedItem) {
      if (newlyAddedItem.type === 'todo') {
        setTodoItems(prevItems => 
          [newlyAddedItem, ...prevItems].sort((a, b) => {
            if (a.status === 'pending' && b.status === 'completed') return -1;
            if (a.status === 'completed' && b.status === 'pending') return 1;
            if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            if (a.dueDate && !b.dueDate) return -1;
            if (!a.dueDate && b.dueDate) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
        );
      } else {
        setDisplayedItems(prevItems => [newlyAddedItem, ...prevItems]);
      }
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

  const handleDeleteContent = async (itemId: string, itemType: ContentItem['type']) => {
    if(itemType === 'todo') {
      setTodoItems(prevItems => prevItems.filter(item => item.id !== itemId));
    } else {
      setDisplayedItems(prevItems => prevItems.filter(item => item.id !== itemId));
    }
    const {id: toastId} = toast({ title: "Deleting Item...", description: "Removing content item."});
    try {
      await deleteContentItem(itemId);
      toast({id: toastId, title: "Content Deleted", description: "The item has been removed.", variant: "default"});
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({id: toastId, title: "Error Deleting", description: "Could not delete item. Restoring.", variant: "destructive"});
    }
  };

  const handleToggleTodoStatus = async (todoId: string, currentStatus: 'pending' | 'completed' | undefined) => {
    if (isUpdatingTodoStatus === todoId) return;
    setIsUpdatingTodoStatus(todoId);
    const newStatus = (currentStatus === 'completed') ? 'pending' : 'completed';

    setTodoItems(prevAllItems =>
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
  
  useEffect(() => {
    setClientLoadingMessage(pageLoadingMessages[Math.floor(Math.random() * pageLoadingMessages.length)]);
  }, []);

  const isPageLoading = isLoading || (isSearching && (isSearchLoading || !isInitialized));

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
  const noContentOnDashboard = !isSearching && displayedItems.length === 0 && todoItems.length === 0;

  return (
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
          <div className={'columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4'}>
            {!isSearching && (
              <>
                {todoItems.length > 0 ? (
                  <TodoListCard
                    items={todoItems}
                    onToggleStatus={handleToggleTodoStatus}
                    onDeleteItem={(id) => handleDeleteContent(id, 'todo')}
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
                onDelete={(id) => handleDeleteContent(id, item.type)}
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
