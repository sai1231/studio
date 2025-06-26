
'use client';

import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, ListChecks, CalendarDays, Loader2, AlarmClock, CalendarIcon } from 'lucide-react';
import { addContentItem, getContentItems, getZones, updateContentItem } from '@/services/contentService';
import type { ContentItem, Zone } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function QuickTodoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [newTodoText, setNewTodoText] = useState('');
  const [selectedDueDate, setSelectedDueDate] = useState<Date | undefined>(undefined);
  const [todos, setTodos] = useState<ContentItem[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const todoInputRef = useRef<HTMLInputElement>(null);


  const fetchTodosAndZones = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [allContent, fetchedZones] = await Promise.all([
        getContentItems(user.uid),
        getZones(user.uid),
      ]);
      const todoItems = allContent.filter(item => item.type === 'todo').sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTodos(todoItems);
      setZones(fetchedZones);
    } catch (error) {
      console.error('Error fetching data for quick todo page:', error);
      toast({ title: "Error", description: "Could not load TODOs or zones.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (user) {
      fetchTodosAndZones();
    }
  }, [user, fetchTodosAndZones]);

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

    const defaultZoneId = zones.length > 0 ? zones[0].id : undefined;

    const newTodoData: Omit<ContentItem, 'id' | 'createdAt'> = {
      type: 'todo',
      title: newTodoText.trim(),
      tags: [],
      zoneId: defaultZoneId,
      contentType: 'Task',
      description: '',
      status: 'pending',
      dueDate: selectedDueDate ? selectedDueDate.toISOString() : undefined,
      userId: user.uid,
    };

    try {
      const addedItem = await addContentItem(newTodoData);
      setTodos(prevTodos => [addedItem, ...prevTodos]);
      setNewTodoText('');
      setSelectedDueDate(undefined); // Reset due date after adding
      toast({ title: "TODO Added", description: `"${addedItem.title}" was added.` });
      todoInputRef.current?.focus(); // Refocus input after adding
    } catch (error) {
      console.error('Error adding TODO:', error);
      toast({ title: "Error", description: "Could not add TODO item.", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleTodoStatus = async (todoId: string, currentStatus: 'pending' | 'completed' | undefined) => {
    setIsUpdatingStatus(todoId);
    const newStatus = (currentStatus === 'completed') ? 'pending' : 'completed';
    
    setTodos(prevTodos => 
      prevTodos.map(todo => 
        todo.id === todoId ? { ...todo, status: newStatus } : todo
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
      console.error('Error updating TODO status:', error);
      toast({ title: "Error", description: "Could not update TODO status.", variant: "destructive" });
      setTodos(prevTodos => 
        prevTodos.map(todo => 
          todo.id === todoId ? { ...todo, status: currentStatus } : todo
        )
      );
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <Button onClick={() => router.back()} variant="outline" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="flex items-center mb-6">
        <ListChecks className="h-8 w-8 mr-3 text-primary" />
        <h1 className="text-3xl font-headline font-semibold text-foreground">Quick TODO Entry</h1>
      </div>

      <form onSubmit={handleAddTodo} className="mb-8">
        <div className="flex items-center gap-2">
          <Input
            ref={todoInputRef}
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-grow text-lg h-12 focus-visible:ring-accent"
            disabled={isAdding}
            autoFocus
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-auto h-12 justify-start text-left font-normal",
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
          <Button type="submit" size="lg" className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isAdding}>
            {isAdding ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Add'}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading TODOs...</p>
        </div>
      ) : todos.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No TODOs yet. Add your first one above!</p>
      ) : (
        <div className="space-y-3">
          {todos.map(todo => (
            <Card key={todo.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`todo-${todo.id}`}
                    checked={todo.status === 'completed'}
                    onCheckedChange={() => handleToggleTodoStatus(todo.id, todo.status)}
                    disabled={isUpdatingStatus === todo.id}
                    aria-labelledby={`todo-label-${todo.id}`}
                  />
                  <div className="flex-grow">
                    <Label
                      htmlFor={`todo-${todo.id}`}
                      id={`todo-label-${todo.id}`}
                      className={cn(
                        "font-medium text-foreground cursor-pointer",
                        todo.status === 'completed' && "line-through text-muted-foreground"
                      )}
                    >
                      {todo.title}
                    </Label>
                    <div className="text-xs text-muted-foreground flex items-center mt-1 space-x-3">
                      {todo.dueDate && (
                        <div className="flex items-center">
                          <AlarmClock className="h-3.5 w-3.5 mr-1.5 text-destructive/80" />
                          <span className={cn(new Date(todo.dueDate) < new Date() && todo.status !== 'completed' ? "text-destructive font-medium" : "")}>
                            Due: {format(new Date(todo.dueDate), 'MMM d, yy')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {isUpdatingStatus === todo.id && <Loader2 className="h-5 w-5 animate-spin text-primary ml-2" />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
