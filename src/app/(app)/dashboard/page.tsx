'use client';
import type React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog';
import type { ContentItem, Zone as AppZone } from '@/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Loader2, FolderOpen, ListChecks, AlarmClock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { subscribeToContentItems, deleteContentItem, getZones, updateContentItem } from '@/services/contentService';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';


const pageLoadingMessages = [
  "Organizing your memories...",
  "Fetching your inspirations...",
  "Aligning your ideas...",
  "Connecting the dots...",
];

const TodoListCard: React.FC<{
  items: ContentItem[];
  onToggleStatus: (itemId: string, currentStatus: 'pending' | 'completed' | undefined) => void;
  isUpdatingStatus: string | null;
  onAddTodoClick: () => void;
}> = ({ items, onToggleStatus, isUpdatingStatus, onAddTodoClick }) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-mati-internal', 'true');
  };

  return (
    <Card 
      draggable="true"
      onDragStart={handleDragStart}
      className="break-inside-avoid mb-4 shadow-lg inline-flex flex-col w-full"
    >
      <CardContent className="p-0 flex-grow">
        <ScrollArea className="max-h-96 p-4 pr-1">
          <div className="space-y-3">
            {items.map(todo => (
              <div key={todo.id} className="flex items-center gap-3 p-2.5 rounded-md border hover:bg-muted/50 transition-colors">
                <Checkbox
                  id={`dialog-todo-${todo.id}`}
                  checked={todo.status === 'completed'}
                  onCheckedChange={() => onToggleStatus(todo.id, todo.status)}
                  disabled={isUpdatingStatus === todo.id}
                  aria-labelledby={`dialog-todo-label-${todo.id}`}
                  className="shrink-0"
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
                {isUpdatingStatus === todo.id && <Loader2 className="h-5 w-5 animate-spin text-primary ml-auto shrink-0" />}
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
          Add a new TODO
        </Button>
      </div>
    </Card>
  );
};


export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { setIsAddTodoDialogOpen } = useDialog();

  const [allContentItems, setAllContentItems] = useState<ContentItem[]>([]);
  const [zones, setZones] = useState<AppZone[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingTodoStatus, setIsUpdatingTodoStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedItemIdForDetail, setSelectedItemIdForDetail] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const { toast } = useToast();
  const [clientLoadingMessage, setClientLoadingMessage] = useState<string | null>(null);

  const handleAddTodoClick = () => {
    setIsAddTodoDialogOpen(true);
  };

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

        setAllContentItems(items);
        
        if (!initialDataLoaded) {
            setIsLoading(false);
            initialDataLoaded = true;
        }
    });

    return () => {
      unsubscribe(); // Cleanup subscription on component unmount
    };
  }, [user, toast]);

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
        <h1 className="text-3xl font-headline font-semibold text-foreground">My Memories</h1>
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
          { (todoItems.length === 0 && otherItems.length === 0) ? (
            <div className="text-center py-16 rounded-lg bg-muted/50">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-medium text-muted-foreground">
                  Your saved memories will appear here.
              </h2>
              <p className="text-muted-foreground mt-2">
                  Save some new links, notes, or images!
              </p>
            </div>
          ) : (
            <div className={'columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4'}>
              {todoItems.length > 0 && (
                <TodoListCard
                  items={todoItems}
                  onToggleStatus={handleToggleTodoStatus}
                  isUpdatingStatus={isUpdatingTodoStatus}
                  onAddTodoClick={handleAddTodoClick}
                />
              )}
              {otherItems.map(item => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onEdit={handleOpenDetailDialog}
                  onDelete={handleDeleteContent}
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
