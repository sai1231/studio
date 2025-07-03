

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
import { CalendarIcon, ListChecks, Loader2, AlarmClock } from 'lucide-react';
import type { Task, TaskList } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { subscribeToTaskList, updateTaskList } from '@/services/contentService';
import { useAuth } from '@/context/AuthContext';
import { Unsubscribe } from 'firebase/firestore';

interface AddTodoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddTodoDialog: React.FC<AddTodoDialogProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [todoTitle, setTodoTitle] = useState('');
  const [selectedDueDate, setSelectedDueDate] = useState<Date | undefined>(undefined);
  const [isAdding, setIsAdding] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTodos, setIsLoadingTodos] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    
    setIsLoadingTodos(true);
    const unsubscribe = subscribeToTaskList(user.uid, (taskList, error) => {
        if (error) {
            console.error('Error subscribing to tasks in dialog:', error);
            toast({ title: "Error", description: "Could not load TODOs.", variant: "destructive" });
        } else if (taskList) {
            setTasks(taskList.tasks);
        }
        setIsLoadingTodos(false);
    });

    if (!isAdding) {
        setTodoTitle('');
        setSelectedDueDate(undefined);
    }
    setTimeout(() => titleInputRef.current?.focus(), 100);

    return () => unsubscribe();
  }, [open, user, toast, isAdding]);

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!todoTitle.trim()) {
      toast({ title: "Empty TODO", description: "Please enter a title for your TODO.", variant: "destructive" });
      titleInputRef.current?.focus();
      return;
    }
    if (!user) {
        toast({ title: "Not Authenticated", description: "You must be logged in.", variant: "destructive" });
        return;
    }
    setIsAdding(true);

    const newTask: Task = {
        id: Date.now().toString(),
        title: todoTitle.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        dueDate: selectedDueDate?.toISOString()
    };
    
    const updatedTasks = [newTask, ...tasks];

    try {
      await updateTaskList(user.uid, updatedTasks);
      setTodoTitle(''); 
      setSelectedDueDate(undefined);
      titleInputRef.current?.focus(); 
    } catch (error) {
      console.error('Error in AddTodoDialog handleSubmit during onTodoAdd:', error);
      toast({ title: "Error", description: "Could not save your new task.", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleTodoStatusInDialog = async (taskId: string) => {
    if (!user || isUpdatingStatus === taskId) return;
    setIsUpdatingStatus(taskId);
    
    const newTasks = tasks.map(t =>
      t.id === taskId ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t
    );
    
    try {
      await updateTaskList(user.uid, newTasks);
    } catch (error) {
      console.error('Error updating TODO status in dialog:', error);
      toast({ title: "Error", description: "Could not update TODO status.", variant: "destructive" });
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
            Quickly add tasks below. The list will update instantly. Close when done.
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
          ) : tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No TODOs yet. Add your first one!</p>
          ) : (
            <div className="space-y-2.5">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-md border hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id={`dialog-todo-${task.id}`}
                    checked={task.status === 'completed'}
                    onCheckedChange={() => handleToggleTodoStatusInDialog(task.id)}
                    disabled={isUpdatingStatus === task.id}
                    aria-labelledby={`dialog-todo-label-${task.id}`}
                    className="shrink-0"
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
                      <div className="text-xs text-muted-foreground flex items-center mt-0.5">
                        <AlarmClock className={cn(
                            "h-3.5 w-3.5 mr-1",
                            task.status !== 'completed' && isPast(new Date(task.dueDate)) ? "text-destructive" : "text-muted-foreground/80"
                          )}
                        />
                        <span className={cn(task.status !== 'completed' && isPast(new Date(task.dueDate)) ? "text-destructive font-semibold" : "")}>
                           {format(new Date(task.dueDate), 'MMM d, yy')}
                        </span>
                      </div>
                    )}
                  </div>
                   {isUpdatingStatus === task.id && <Loader2 className="h-5 w-5 animate-spin text-primary ml-auto shrink-0" />}
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
