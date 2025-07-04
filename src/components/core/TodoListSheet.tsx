

'use client';

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, AlarmClock, CalendarIcon } from 'lucide-react';
import { subscribeToTaskList, updateTaskList } from '@/services/contentService';
import type { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function TodoListSheet() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [newTodoText, setNewTodoText] = useState('');
  const [selectedDueDate, setSelectedDueDate] = useState<Date | undefined>(undefined);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const todoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    const unsubscribe = subscribeToTaskList(user.uid, (taskList, error) => {
      if (error) {
        console.error('Error fetching data for quick todo page:', error);
        toast({ title: "Error", description: "Could not load TODOs.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (taskList) {
        setTasks(taskList.tasks);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const handleAddTodo = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!newTodoText.trim()) {
      toast({ title: "Empty TODO", description: "Please enter some text for your TODO item.", variant: "destructive" });
      return;
    }
    if (!user) {
        toast({ title: "Not Authenticated", description: "You must be logged in to add a TODO.", variant: "destructive" });
        return;
    }
    setIsAdding(true);

    const newTask: Task = {
      id: Date.now().toString(), // Temporary ID, Firestore doesn't need it but React keys do
      title: newTodoText.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      dueDate: selectedDueDate ? selectedDueDate.toISOString() : undefined,
    };

    const newTasks = [newTask, ...tasks];

    try {
      await updateTaskList(user.uid, newTasks);
      setNewTodoText('');
      setSelectedDueDate(undefined);
      toast({ title: "TODO Added", description: `"${newTask.title}" was added.` });
      todoInputRef.current?.focus();
    } catch (error) {
      console.error('Error adding TODO:', error);
      toast({ title: "Error", description: "Could not add TODO item.", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleTodoStatus = async (taskId: string) => {
    if (!user) return;
    setIsUpdatingStatus(taskId);

    const newTasks = tasks.map(t => 
        t.id === taskId ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t
    );
    
    try {
      await updateTaskList(user.uid, newTasks);
    } catch (error) {
      console.error('Error updating TODO status:', error);
      toast({ title: "Error", description: "Could not update TODO status.", variant: "destructive" });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleAddTodo} className="mb-4 px-2">
        <div className="flex items-center gap-2">
          <Input
            ref={todoInputRef}
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-grow text-base h-11 focus-visible:ring-accent"
            disabled={isAdding}
            autoFocus
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-auto h-11 justify-start text-left font-normal",
                  !selectedDueDate && "text-muted-foreground"
                )}
                disabled={isAdding}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDueDate ? format(selectedDueDate, "PPP") : <span>Due date</span>}
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
          <Button type="submit" size="lg" className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isAdding}>
            {isAdding ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Add'}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <div className="flex-grow flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex-grow flex justify-center items-center">
            <p className="text-center text-muted-foreground">No TODOs yet. Add your first one!</p>
        </div>
      ) : (
        <div className="space-y-3 flex-grow overflow-y-auto pr-2">
          {tasks.map(task => (
            <Card key={task.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`todo-${task.id}`}
                    checked={task.status === 'completed'}
                    onCheckedChange={() => handleToggleTodoStatus(task.id)}
                    disabled={isUpdatingStatus === task.id}
                    aria-labelledby={`todo-label-${task.id}`}
                  />
                  <div className="flex-grow">
                    <Label
                      htmlFor={`todo-${task.id}`}
                      id={`todo-label-${task.id}`}
                      className={cn(
                        "font-medium text-foreground cursor-pointer",
                        task.status === 'completed' && "line-through text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </Label>
                    <div className="text-xs text-muted-foreground flex items-center mt-1 space-x-3">
                      {task.dueDate && (
                        <div className="flex items-center">
                          <AlarmClock className={cn("h-3.5 w-3.5 mr-1.5", isPast(new Date(task.dueDate)) && task.status !== 'completed' ? 'text-destructive/80' : '')} />
                          <span className={cn(isPast(new Date(task.dueDate)) && task.status !== 'completed' ? "text-destructive font-medium" : "")}>
                            Due: {format(new Date(task.dueDate), 'MMM d, yy')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {isUpdatingStatus === task.id && <Loader2 className="h-5 w-5 animate-spin text-primary ml-2" />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
