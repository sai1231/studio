

'use client';

import React, from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DialogClose } from '@/components/ui/dialog';
import { CalendarDays, Trash2, Share2, RotateCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { ContentItem } from '@/types';
import { ShareDialog } from '../core/ShareDialog';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '@/lib/utils';

interface DialogFooterActionsProps {
  item: ContentItem;
  onDelete: () => void;
  onOpenChange: (open: boolean) => void;
  shouldShowRetry?: boolean | null;
  isRetrying?: boolean;
  handleRetryClick?: () => void;
}

export const DialogFooterActions: React.FC<DialogFooterActionsProps> = ({ item, onDelete, onOpenChange, shouldShowRetry, isRetrying, handleRetryClick }) => {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  
  return (
    <>
      <div className="flex-shrink-0 flex justify-between items-center px-6 py-3 border-t">
        <div className="flex items-center gap-3">
            {shouldShowRetry && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleRetryClick} disabled={isRetrying}>
                                <RotateCw className={cn("h-4 w-4 text-amber-600", isRetrying && "animate-spin")} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Retry AI Analysis</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            <div className="text-xs text-muted-foreground flex items-center">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              Saved {format(parseISO(item.createdAt), 'MMM d, yyyy @ h:mm a')}
            </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setIsShareDialogOpen(true)}>
            <Share2 className="h-4 w-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will move "{item.title}" to the trash. You can restore it later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                  Move to Trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </div>
      </div>
      <ShareDialog item={item} open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen} />
    </>
  );
};
