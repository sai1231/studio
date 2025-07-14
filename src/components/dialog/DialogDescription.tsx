
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import { cn } from '@/lib/utils';
import { MessageSquareText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DialogDescriptionProps {
  description: string;
}

const TRUNCATION_THRESHOLD = 250; // characters

export const DialogDescription: React.FC<DialogDescriptionProps> = ({ description }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncatable, setIsTruncatable] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const getPlainTextDescription = (htmlString: string | undefined): string => {
    if (!htmlString) return '';
    if (typeof document !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlString;
      return tempDiv.textContent || tempDiv.innerText || '';
    }
    return htmlString.replace(/<[^>]+>/g, ''); 
  };
  
  const plainText = getPlainTextDescription(description);

  useEffect(() => {
    if (plainText.length > TRUNCATION_THRESHOLD) {
      setIsTruncatable(true);
    } else {
      setIsTruncatable(false);
      setIsExpanded(true); // Always expand if not truncatable
    }
  }, [plainText]);


  if (!plainText) {
    return null;
  }
  
  const htmlDescription = marked.parse(description);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <MessageSquareText className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">Description</h3>
      </div>
      <div
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none text-muted-foreground p-3 bg-muted/30 dark:bg-muted/20 rounded-md overflow-hidden transition-all duration-300 ease-in-out",
          !isExpanded && isTruncatable && "line-clamp-4"
        )}
      >
        <div ref={contentRef} dangerouslySetInnerHTML={{ __html: htmlDescription }} />
      </div>
      {isTruncatable && (
        <Button
          variant="link"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-primary hover:text-primary/80 px-1"
        >
          {isExpanded ? 'Show less' : 'Show more'}
          <ChevronDown
            className={cn(
              "h-4 w-4 ml-1 transition-transform duration-300",
              isExpanded && "rotate-180"
            )}
          />
        </Button>
      )}
    </div>
  );
};
