
'use client';

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Pencil } from 'lucide-react';

interface DialogMemoryNoteProps {
  editableMemoryNote: string;
  onMemoryNoteChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onMemoryNoteBlur: () => void;
}

export const DialogMemoryNote: React.FC<DialogMemoryNoteProps> = ({
  editableMemoryNote,
  onMemoryNoteChange,
  onMemoryNoteBlur,
}) => {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Pencil className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">Memory Note</h3>
      </div>
      <Textarea
        value={editableMemoryNote}
        onChange={onMemoryNoteChange}
        onBlur={onMemoryNoteBlur}
        placeholder="Add your personal thoughts..."
        className="w-full min-h-[120px] focus-visible:ring-accent bg-muted/30 dark:bg-muted/20 border-border"
      />
    </div>
  );
};
