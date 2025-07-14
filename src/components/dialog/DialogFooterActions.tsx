
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DialogClose } from '@/components/ui/dialog';
import { CalendarDays, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { ContentItem } from '@/types';

interface DialogFooterActionsProps {
  item: ContentItem;
  onDelete: () => void;
  onOpenChange: (open: boolean) => void;
}

export const DialogFooterActions: React.FC<DialogFooterActionsProps> = ({ item, onDelete, onOpenChange }) => {
  return (
    <div className="flex-shrink-0 flex justify-between items-center px-6 py-3 border-t">
      <div className="text-xs text-muted-foreground flex items-center">
        <CalendarDays className="h-3.5 w-3.5 mr-1.5 shrink-0" />
        Saved {format(parseISO(item.createdAt), 'MMM d, yyyy @ h:mm a')}
      </div>
      <div className="flex items-center gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{item.title}" and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
      </div>
    </div>
  );
};
