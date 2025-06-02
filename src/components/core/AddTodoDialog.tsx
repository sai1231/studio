
'use client';

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
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
import { CalendarIcon, ListChecks, Loader2 } from 'lucide-react';
import type { ContentItem, Zone } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AddTodoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: Zone[];
  onTodoAdd: (newTodoData: Omit<ContentItem, 'id' | 'createdAt'>) => Promise<void>;
}

const AddTodoDialog: React.FC<AddTodoDialogProps> = ({ open, onOpenChange, zones, onTodoAdd }) => {
  const { toast } = useToast();
  const [todoTitle, setTodoTitle] = useState('');
  const [selectedDueDate, setSelectedDueDate] = useState<Date | undefined>(undefined);
  const [isAdding, setIsAdding] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Reset fields when dialog opens, but don't clear if it's already open and user is adding multiple items
      if (!isAdding) {
        setTodoTitle('');
        setSelectedDueDate(undefined);
      }
      // Delay focus slightly to ensure dialog is fully rendered
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [open, isAdding]); // Depend on isAdding to prevent reset during multi-add

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
      await onTodoAdd(newTodoData);
      // Clear fields for next entry and refocus
      setTodoTitle('');
      setSelectedDueDate(undefined);
      titleInputRef.current?.focus();
      // Dialog stays open - onOpenChange(false); // Removed to keep dialog open
    } catch (error) {
      // Error is handled by the onTodoAdd callback in the layout
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center font-headline">
            <ListChecks className="h-6 w-6 mr-2 text-primary" />
            Add New TODO
          </DialogTitle>
          <DialogDescription>
            Quickly add a new task to your list. Set an optional due date.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="todo-title" className="font-medium">Title</Label>
            <Input
              id="todo-title"
              ref={titleInputRef}
              value={todoTitle}
              onChange={(e) => setTodoTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="text-base h-11 focus-visible:ring-accent"
              disabled={isAdding}
              autoFocus // Ensure focus on open
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="todo-due-date" className="font-medium">Due Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="todo-due-date"
                  variant={"outline"}
                  className={cn(
                    "w-full h-11 justify-start text-left font-normal text-base",
                    !selectedDueDate && "text-muted-foreground"
                  )}
                  disabled={isAdding}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDueDate ? format(selectedDueDate, "PPP") : <span>Pick a date</span>}
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
          </div>
        </form>
        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isAdding || !todoTitle.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Add TODO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddTodoDialog;
