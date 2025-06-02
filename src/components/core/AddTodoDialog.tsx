
'use client';

import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ListChecks, Loader2, AlarmClock, Checkbox as CheckboxIcon } from 'lucide-react'; // Using CheckboxIcon to avoid name clash
import type { ContentItem, Zone } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox'; // Shadcn Checkbox
import { getContentItems, updateContentItem } from '@/services/contentService'; // Import getContentItems

interface AddTodoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: Zone[]; // Kept for default zone assignment, though not directly used in UI now
  onTodoAdd: (newTodoData: Omit<ContentItem, 'id' | 'createdAt'>) => Promise<void>;
}

const AddTodoDialog: React.FC<AddTodoDialogProps> = ({ open, onOpenChange, zones, onTodoAdd }) => {
  const { toast } = useToast();
  const [todoTitle, setTodoTitle] = useState('');
  const [selectedDueDate, setSelectedDueDate] = useState<Date | undefined>(undefined);
  const [isAdding, setIsAdding] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [displayedTodos, setDisplayedTodos] = useState<ContentItem[]>([]);
  const [isLoadingTodos, setIsLoadingTodos] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  const fetchLocalTodos = useCallback(async () => {
    setIsLoadingTodos(true);
    try {
      const allContent = await getContentItems();
      const todoItems = allContent
        .filter(item => item.type === 'todo')
        .sort((a, b) => {
            if (a.status === 'pending' && b.status === 'completed') return -1;
            if (a.status === 'completed' && b.status === 'pending') return 1;
            if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            if (a.dueDate && !b.dueDate) return -1;
            if (!a.dueDate && b.dueDate) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      setDisplayedTodos(todoItems);
    } catch (error) {
      console.error('Error fetching TODOs for dialog:', error);
      toast({ title: "Error", description: "Could not load TODOs.", variant: "destructive" });
    } finally {
      setIsLoadingTodos(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      fetchLocalTodos();
      if (!isAdding) {
        setTodoTitle('');
        setSelectedDueDate(undefined);
      }
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [open, fetchLocalTodos, isAdding]);

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!todoTitle.trim()) {
      toast({ title: "Empty TODO", description: "Please enter a title for your TODO.", variant: "destructive" });
      titleInputRef.current?.focus();
      return;
    }
    setIsAdding(true);

    const defaultZoneId = zones.length > 0 ? zones[0].id : undefined;

    const newTodoData: Omit<ContentItem, 'id' | 'createdAt'> = {
      type: 'todo',
      title: todoTitle.trim(),
      description: '',
      tags: [],
      zoneId: defaultZoneId,
      contentType: 'Task',
      status: 'pending',
      dueDate: selectedDueDate ? selectedDueDate.toISOString() : undefined,
    };

    try {
      await onTodoAdd(newTodoData); // This calls the layout's function to save globally
      setTodoTitle('');
      setSelectedDueDate(undefined);
      titleInputRef.current?.focus();
      await fetchLocalTodos(); // Re-fetch to update the list inside the dialog
    } catch (error) {
      // Error toast is handled by onTodoAdd in layout
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleTodoStatusInDialog = async (todoId: string, currentStatus: 'pending' | 'completed' | undefined) => {
    if (isUpdatingStatus === todoId) return;
    setIsUpdatingStatus(todoId);
    const newStatus = (currentStatus === 'completed') ? 'pending' : 'completed';

    // Optimistically update local state
    setDisplayedTodos(prevTodos =>
      prevTodos.map(todo =>
        todo.id === todoId ? { ...todo, status: newStatus } : todo
      )
    );

    try {
      const updatedItem = await updateContentItem(todoId, { status: newStatus });
      if (updatedItem) {
        toast({ title: "TODO Updated", description: `"${updatedItem.title}" marked as ${newStatus}.` });
        // Potentially re-fetch or ensure the global state (e.g., dashboard) also knows.
        // For now, this dialog's list is updated. Dashboard will update on its own cycle or next full refresh.
      } else {
        throw new Error("Update failed, item not returned");
      }
    } catch (error) {
      console.error('Error updating TODO status in dialog:', error);
      toast({ title: "Error", description: "Could not update TODO status.", variant: "destructive" });
      // Revert optimistic update
      setDisplayedTodos(prevTodos =>
        prevTodos.map(todo =>
          todo.id === todoId ? { ...todo, status: currentStatus } : todo
        )
      );
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center font-headline">
            <ListChecks className="h-6 w-6 mr-2 text-primary" />
            Add & Manage TODOs
          </DialogTitle>
          <DialogDescription>
            Quickly add tasks and manage your list below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex items-start gap-2 py-2 flex-shrink-0">
          <Input
            id="todo-title"
            ref={titleInputRef}
            value={todoTitle}
            onChange={(e) => setTodoTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="text-base h-11 flex-grow focus-visible:ring-accent"
            disabled={isAdding}
            autoFocus
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="todo-due-date"
                variant={"outline"}
                className={cn(
                  "h-11 justify-start text-left font-normal text-base w-auto min-w-[140px]",
                  !selectedDueDate && "text-muted-foreground"
                )}
                disabled={isAdding}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDueDate ? format(selectedDueDate, "MMM d") : <span>Due date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDueDate}
                onSelect={setSelectedDueDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button type="submit" className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isAdding || !todoTitle.trim()}>
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
          </Button>
        </form>

        <ScrollArea className="flex-grow mt-2 border-t pt-3 pr-1 custom-scrollbar">
          {isLoadingTodos ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : displayedTodos.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No TODOs yet. Add your first one!</p>
          ) : (
            <div className="space-y-2.5">
              {displayedTodos.map(todo => (
                <div key={todo.id} className="flex items-center gap-3 p-2.5 rounded-md border hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id={`dialog-todo-${todo.id}`}
                    checked={todo.status === 'completed'}
                    onCheckedChange={() => handleToggleTodoStatusInDialog(todo.id, todo.status)}
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
          )}
        </ScrollArea>

        <DialogFooter className="pt-4 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddTodoDialog;

    