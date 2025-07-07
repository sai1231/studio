

'use client';
import type React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Loader2, AlarmClock, Trash2 } from 'lucide-react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TodoListCardProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onDeleteItem: (taskId: string) => void;
  isUpdatingStatus: string | null;
  onAddTodoClick: () => void;
}

const TodoListCard: React.FC<TodoListCardProps> = ({ tasks, onToggleStatus, onDeleteItem, isUpdatingStatus, onAddTodoClick }) => {
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
                          className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-card-foreground hover:bg-destructive hover:text-destructive-foreground ml-auto shrink-0"
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

export default TodoListCard;
