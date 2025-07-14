
'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Globe, ExternalLink } from 'lucide-react';
import type { ContentItem } from '@/types';

interface DialogHeaderSectionProps {
  item: ContentItem;
  editableTitle: string;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTitleBlur: () => void;
}

export const DialogHeaderSection: React.FC<DialogHeaderSectionProps> = ({ item, editableTitle, onTitleChange, onTitleBlur }) => {
  return (
    <>
      {item.domain && item.domain !== 'mati.internal.storage' && (
        <div className="flex items-center text-sm text-muted-foreground">
          <Globe className="h-4 w-4 mr-2" />
          <span>{item.domain}</span>
          {(item.type === 'link' || item.type === 'movie') && item.url && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1 ml-1.5 text-primary hover:text-primary/80" title={`Open link: ${item.url}`}>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </TooltipTrigger>
                <TooltipContent><p>Open link</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
      <Input
        value={editableTitle}
        onChange={onTitleChange}
        onBlur={onTitleBlur}
        className="text-2xl font-headline font-semibold border-0 focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-0 shadow-none p-0 h-auto flex-grow bg-transparent"
        placeholder="Enter title"
      />
    </>
  );
};
