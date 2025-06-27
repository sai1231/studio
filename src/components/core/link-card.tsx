
'use client';
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, Trash2, Globe, StickyNote, FileImage, ListChecks, Mic, Landmark, PlayCircle, FileText } from 'lucide-react';
import type { ContentItem } from '@/types';
import { cn } from '@/lib/utils';

interface ContentCardProps {
  item: ContentItem;
  onEdit: (item: ContentItem) => void;
  onDelete: (itemId: string) => void;
}

const getTypeSpecifics = (item: ContentItem) => {
  if (item.type === 'link' && item.contentType === 'PDF') {
    return { icon: FileText, color: 'red', iconRing: 'ring-red-500/30', iconText: 'text-red-600 dark:text-red-400' };
  }
  switch (item.type) {
    case 'link':
      return { icon: Globe, color: 'blue', iconRing: 'ring-sky-500/30', iconText: 'text-sky-600 dark:text-sky-400' };
    case 'note':
      return { icon: StickyNote, color: 'yellow', iconRing: 'ring-yellow-500/30', iconText: 'text-yellow-600 dark:text-yellow-400' };
    case 'image':
      return { icon: FileImage, color: 'gray', iconRing: 'ring-gray-500/30', iconText: 'text-gray-600 dark:text-gray-400' };
    case 'todo':
      return { icon: ListChecks, color: 'green', iconRing: 'ring-emerald-500/30', iconText: 'text-emerald-600 dark:text-emerald-400' };
    case 'voice':
      return { icon: Mic, color: 'purple', iconRing: 'ring-purple-500/30', iconText: 'text-purple-600 dark:text-purple-400' };
    default:
      return { icon: StickyNote, color: 'gray', iconRing: 'ring-gray-500/30', iconText: 'text-muted-foreground' };
  }
};

const ContentCard: React.FC<ContentCardProps> = ({ item, onEdit, onDelete }) => {
  const specifics = getTypeSpecifics(item);
  const hasImage = !!item.imageUrl;

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
  };

  const getPlainTextDescription = (htmlString: string | undefined): string => {
    if (!htmlString) return '';
    if (typeof document !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlString;
      return tempDiv.textContent || tempDiv.innerText || '';
    }
    return htmlString.replace(/<[^>]+>/g, ''); 
  };

  const plainDescription = getPlainTextDescription(item.description);

  return (
    <Card
      className={cn(
        "bg-card text-card-foreground overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group rounded-3xl p-2 break-inside-avoid mb-4"
      )}
    >
      {hasImage && (
        <div className="relative w-full mb-1 rounded-xl overflow-hidden aspect-square">
          <img
            src={item.imageUrl!}
            alt={item.title}
            data-ai-hint={(item.title || "media content").split(' ').slice(0,2).join(' ')}
            className="absolute h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}

      {/* Main content div */}
      <div
        className={cn(
          "flex flex-col flex-grow cursor-pointer",
          !hasImage && "pt-1" // Added conditional top padding here
        )}
        onClick={() => onEdit(item)}
      >
        <div className="flex items-start gap-2">
          {!hasImage && (
            (item.type === 'link' && item.faviconUrl) ? (
                <img src={item.faviconUrl} alt="" className="h-5 w-5 shrink-0 mt-1 rounded-sm" />
            ) : (
                React.createElement(specifics.icon, { className: cn("h-5 w-5 shrink-0 mt-1", specifics.iconText) })
            )
          )}
          <h3 className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors break-words">
            {item.title || "Untitled"}
          </h3>
        </div>

        {plainDescription && (
          <p className={cn("mt-1 text-sm text-muted-foreground break-words line-clamp-2", !hasImage && "pl-7")}>
            {plainDescription}
          </p>
        )}

        {item.type === 'voice' && item.audioUrl && !plainDescription && !hasImage && (
            <div className={cn("mt-1 flex items-center gap-2 text-sm text-muted-foreground", !hasImage && "pl-7")}>
              <PlayCircle className={cn("h-5 w-5", getTypeSpecifics(item).iconText)} />
              <span>Voice recording</span>
            </div>
        )}
      </div>

      {/* Footer for domain and actions */}
      <div className="mt-auto pt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
          {item.faviconUrl ? (
            <img src={item.faviconUrl} alt="" className="h-4 w-4 rounded-sm" />
          ) : (
            item.domain && <Landmark className="h-3.5 w-3.5 opacity-80 shrink-0" />
          )}
          {item.domain && (
            <span className="truncate">{item.domain}</span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {item.type === 'link' && item.url && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild 
                    onClick={handleActionClick}
                    className="h-8 w-8 rounded-full group/linkicon" 
                  >
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open link in new tab"
                      className="flex items-center justify-center h-full w-full rounded-full hover:bg-accent"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover/linkicon:text-primary" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Open link</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    handleActionClick(e);
                    onDelete(item.id);
                  }}
                  aria-label="Forget item"
                  className="h-8 w-8 rounded-full hover:bg-accent group/deleteicon" 
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground group-hover/deleteicon:text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Forget</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Card>
  );
};

export default ContentCard;
