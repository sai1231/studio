'use client';
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, Trash2, Globe, StickyNote, FileImage, ListChecks, Mic, Landmark, PlayCircle, FileText, Film } from 'lucide-react';
import type { ContentItem } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
    case 'movie':
      return { icon: Film, color: 'orange', iconRing: 'ring-orange-500/30', iconText: 'text-orange-600 dark:text-orange-400' };
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
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-mati-internal', 'true');
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

  const showStatusBadge = item.status === 'pending-analysis' || item.status === 'completed';
  const statusText = item.status === 'pending-analysis' ? 'Analyzing...' : item.status;

  const statusBadge = showStatusBadge ? (
    <Badge
      variant="outline"
      className={cn("absolute z-10 top-3 right-3 text-xs",
          item.status === 'completed' && 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800',
          item.status === 'pending-analysis' && 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-400 dark:border-yellow-800'
      )}
    >
        {statusText}
    </Badge>
  ) : null;
  
  return (
    <Card
      draggable="true"
      onDragStart={handleDragStart}
      className={cn(
        "bg-card text-card-foreground overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex w-full flex-col group rounded-3xl break-inside-avoid mb-4",
        "cursor-pointer relative"
      )}
      onClick={() => onEdit(item)}
    >
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {(item.type === 'link' || item.type === 'movie') && item.url && (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            asChild 
                            onClick={handleActionClick}
                            className="h-8 w-8 rounded-full bg-background/70 backdrop-blur-sm text-card-foreground hover:bg-primary hover:text-primary-foreground" 
                        >
                            <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Open link in new tab" className="flex items-center justify-center h-full w-full rounded-full">
                                <ExternalLink className="h-4 w-4" />
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
                        className="h-8 w-8 rounded-full bg-background/70 backdrop-blur-sm text-card-foreground hover:bg-destructive hover:text-white"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Forget</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>

      {hasImage && item.type !== 'note' && (
        <div 
          className="relative w-full overflow-hidden"
        >
          {statusBadge}
          <img
            src={item.imageUrl!}
            alt={item.title}
            data-ai-hint={(item.title || "media content").split(' ').slice(0,2).join(' ')}
            className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}

      {item.type === 'note' && (
        <div className="p-4 flex flex-col flex-grow relative">
          {statusBadge}
          <div className="flex-grow mb-4 relative p-6">
            <span className="absolute -top-2 left-0 text-7xl text-muted-foreground/20 font-serif leading-none">“</span>
            <p className="text-base text-foreground line-clamp-6">
              {plainDescription}
            </p>
            <span className="absolute -bottom-8 right-0 text-7xl text-muted-foreground/20 font-serif leading-none">”</span>
          </div>
        </div>
      )}
      
      {item.type !== 'note' && item.type !== 'image' && (
        <div className="p-4 flex flex-col flex-grow relative">
          {!hasImage && statusBadge}
          <div className="flex-grow space-y-2 mb-4">
            <div className="flex items-start gap-3">
              {(item.type === 'link' && item.faviconUrl) ? (
                <img src={item.faviconUrl} alt="" className="h-5 w-5 shrink-0 mt-0.5 rounded-sm" />
              ) : !hasImage ? (
                React.createElement(specifics.icon, { className: cn("h-5 w-5 shrink-0 mt-0.5", specifics.iconText) })
              ) : null}
              <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors truncate">
                {item.title || "Untitled"}
              </h3>
            </div>

            {plainDescription && (
              <p className="text-sm text-muted-foreground break-words line-clamp-3">
                {plainDescription}
              </p>
            )}

            {item.type === 'voice' && item.audioUrl && !plainDescription && !hasImage && (
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <PlayCircle className={cn("h-5 w-5", getTypeSpecifics(item).iconText)} />
                  <span>Voice recording</span>
                </div>
            )}
          </div>
           <div className="mt-auto pt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              {item.domain && (
                <>
                    <Landmark className="h-3.5 w-3.5 opacity-80 shrink-0" />
                    <span className="truncate">{item.domain}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {item.type === 'image' && (
         <div className="p-4 flex flex-col flex-grow relative">
          {!hasImage && statusBadge}
          <div className="flex-grow space-y-2">
            <div className="flex items-start gap-3">
              {(item.type === 'link' && item.faviconUrl) || (item.type === 'image' && item.faviconUrl) ? (
                <img src={item.faviconUrl!} alt="" className="h-5 w-5 shrink-0 mt-0.5 rounded-sm" />
              ) : !hasImage ? (
                React.createElement(specifics.icon, { className: cn("h-5 w-5 shrink-0 mt-0.5", specifics.iconText) })
              ) : null}
              <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors truncate">
                {item.title || "Untitled"}
              </h3>
            </div>
          </div>
        </div>
      )}

    </Card>
  );
};

export default ContentCard;
