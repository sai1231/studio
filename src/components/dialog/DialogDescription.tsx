
'use client';

import React from 'react';
import { marked } from 'marked';
import { cn } from '@/lib/utils';
import { MessageSquareText } from 'lucide-react';

interface DialogDescriptionProps {
  description: string;
}

export const DialogDescription: React.FC<DialogDescriptionProps> = ({ description }) => {
  const getPlainTextDescription = (htmlString: string | undefined): string => {
    if (!htmlString) return '';
    // This is a simple server-side way to strip html.
    return htmlString.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' '); 
  };
  
  const plainText = getPlainTextDescription(description);

  if (!plainText) {
    return null;
  }
  
  // Using marked to parse markdown into HTML.
  const htmlDescription = marked.parse(description);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <MessageSquareText className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">Original Description</h3>
      </div>
      <div
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none text-muted-foreground p-3 bg-muted/30 dark:bg-muted/20 rounded-md",
          "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1"
        )}
        dangerouslySetInnerHTML={{ __html: htmlDescription }}
      />
    </div>
  );
};
