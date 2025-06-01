
'use client';

import type React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ReadableArticleViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string | undefined;
  htmlContent: string | undefined;
}

const ReadableArticleView: React.FC<ReadableArticleViewProps> = ({
  open,
  onOpenChange,
  title,
  htmlContent,
}) => {
  if (!open || !htmlContent) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="text-2xl font-headline truncate pr-10">
            {title || 'Readable Article'}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-grow p-6 custom-scrollbar">
          <article
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </ScrollArea>
        <DialogFooter className="p-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReadableArticleView;
