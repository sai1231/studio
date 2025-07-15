
'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, Trash2, Globe, StickyNote, FileImage, Mic, Landmark, PlayCircle, Film, Github, Youtube, Twitter, Check } from 'lucide-react';
import type { ContentItem } from '@/types';
import { cn } from '@/lib/utils';
import { format, isSameYear, parseISO } from 'date-fns';
import PdfIcon from '@/components/core/PdfIcon';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';


interface ContentCardProps {
  item: ContentItem;
  onEdit: (item: ContentItem) => void;
  onDelete: (itemId: string) => void;
  isSelected: boolean;
  onToggleSelection: (itemId: string) => void;
  isSelectionActive: boolean;
}

const SpotifyIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      {...props}
    >
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM8.22 16.24c-.3.18-.66.2-1.02-.02-.44-.28-.7-.76-.42-1.2.28-.44.76-.7 1.2-.42.36.22 4.4 2.7 4.4 2.7s-.32.18-.5.28c-.18.1-.9.56-2.66-1.34zm6.2-1.64c-.36.22-1.2.28-1.62.06-.42-.22-2.4-1.5-4.26-2.6-1.82-1.08-1.94-1.18-1.94-1.18s.22-.36.42-.5c.2-.14.36-.22.36-.22s3.22 1.94 5.62 3.26c.44.24.6.76.36 1.2zm1.12-2.6c-.42.28-1.42.36-1.92.06-.5-.3-3.02-1.86-5.18-3.2s-2.1-1.3-2.1-1.3s.22-.38.44-.56c.22-.18.4-.28.4-.28s3.58 2.22 6.06 3.58c2.44 1.34 2.62 1.48 2.62 1.48s-.16.42-.42.72z" />
    </svg>
);

const getTypeSpecifics = (item: ContentItem) => {
  switch (item.type) {
    case 'link':
      return { icon: Globe, color: 'blue', iconRing: 'ring-sky-500/30', iconText: 'text-sky-600 dark:text-sky-400' };
    case 'note':
      return { icon: StickyNote, color: 'yellow', iconRing: 'ring-yellow-500/30', iconText: 'text-yellow-600 dark:text-yellow-400' };
    case 'image':
      return { icon: FileImage, color: 'gray', iconRing: 'ring-gray-500/30', iconText: 'text-gray-600 dark:text-gray-400' };
    case 'voice':
      return { icon: Mic, color: 'purple', iconRing: 'ring-purple-500/30', iconText: 'text-purple-600 dark:text-purple-400' };
    case 'movie':
      return { icon: Film, color: 'orange', iconRing: 'ring-orange-500/30', iconText: 'text-orange-600 dark:text-orange-400' };
    default:
      return { icon: StickyNote, color: 'gray', iconRing: 'ring-gray-500/30', iconText: 'text-muted-foreground' };
  }
};

const domainIconMap: { [key: string]: React.ElementType } = {
  'github.com': Github,
  'youtube.com': Youtube,
  'x.com': Twitter,
  'twitter.com': Twitter,
  'open.spotify.com': SpotifyIcon,
  'spotify.com': SpotifyIcon,
};

const ContentCard: React.FC<ContentCardProps> = ({ item, onEdit, onDelete, isSelected, onToggleSelection, isSelectionActive }) => {
  const [faviconError, setFaviconError] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  useEffect(() => {
    setFaviconError(false);
    setImageError(false);
  }, [item.id]);

  const specifics = getTypeSpecifics(item);

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

  const displayTitle = React.useMemo(() => {
    if (item.type === 'voice') {
      try {
        const createdAtDate = parseISO(item.createdAt);
        const formatString = isSameYear(new Date(), createdAtDate)
          ? 'MMM d, h:mm a'
          : 'MMM d, yyyy, h:mm a';
        return format(createdAtDate, formatString);
      } catch (e) {
        console.error("Failed to parse date for voice note title:", e);
        return item.title || "Voice Note";
      }
    }
    return item.title || "Untitled";
  }, [item]);

  const hasImage = !!item.imageUrl && !imageError;

  const TitleIcon = React.useMemo(() => {
    if (item.type !== 'link') {
        if (hasImage) return null;
        return React.createElement(specifics.icon, { className: cn("h-5 w-5 shrink-0 mt-0.5", specifics.iconText) });
    }
    const DomainIcon = item.domain ? domainIconMap[item.domain] : null;
    if (DomainIcon) {
        return <DomainIcon className="h-5 w-5 shrink-0 mt-0.5 text-foreground" />;
    }
    if (item.faviconUrl && !faviconError) {
        return <img 
            src={item.faviconUrl} 
            alt="" 
            className="h-5 w-5 shrink-0 mt-0.5 rounded-sm" 
            onError={() => setFaviconError(true)}
        />;
    }
    return React.createElement(specifics.icon, { className: cn("h-5 w-5 shrink-0 mt-0.5", specifics.iconText) });
  }, [item, specifics, hasImage, faviconError]);

  return (
    <motion.div layoutId={`card-animation-${item.id}`} className="w-full break-inside-avoid mb-4">
      <Card
        draggable="true"
        onDragStart={handleDragStart}
        className={cn(
          "bg-card text-card-foreground overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex w-full flex-col group rounded-xl relative h-full",
          isSelected ? "ring-2 ring-primary shadow-2xl" : "cursor-pointer",
        )}
        onClick={() => onEdit(item)}
      >
        <div className="flex-grow min-h-0">
          <div 
            onClick={(e) => { e.stopPropagation(); onToggleSelection(item.id); }}
            className={cn(
                "absolute top-2 left-2 z-20 h-6 w-6 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center transition-all duration-200",
                isSelectionActive ? "opacity-100 scale-100" : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100",
                isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            {isSelected ? <Check className="h-4 w-4" /> : <div className="h-3.5 w-3.5 rounded-full border-2 border-primary/50" />}
          </div>

          {item.domain && item.domain !== 'mati.internal.storage' && (
            <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center gap-1.5 rounded-full bg-background/70 backdrop-blur-sm px-2 py-1 text-xs text-muted-foreground">
                <Landmark className="h-3.5 w-3.5 opacity-80 shrink-0" />
                <span className="truncate">{item.domain}</span>
              </div>
            </div>
          )}
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
                                className="h-8 w-8 p-0 rounded-full bg-background/70 backdrop-blur-sm text-card-foreground hover:bg-primary hover:text-primary-foreground" 
                            >
                                <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Open link in new tab">
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
                            className="h-8 w-8 p-0 rounded-full bg-background/70 backdrop-blur-sm text-card-foreground hover:bg-destructive hover:text-destructive-foreground"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Forget</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
          </div>

          {hasImage && <div className="relative w-full overflow-hidden bg-muted">
              <img
                  src={item.imageUrl!}
                  alt={item.title}
                  data-ai-hint={(item.title || "media content").split(' ').slice(0,2).join(' ')}
                  className="w-full h-auto object-cover transition-opacity duration-300"
                  loading="lazy"
                  onError={() => setImageError(true)}
                />
            </div>}

          {item.type === 'note' ? (
            <div className="pt-4 px-4 pb-6 flex flex-col flex-grow relative">
              <span className="absolute top-2 left-2 text-6xl text-muted-foreground/20 font-serif z-0">“</span>
              <div className="flex-grow pt-4">
                <p className="text-sm text-muted-foreground break-words line-clamp-6">
                  {plainDescription}
                </p>
              </div>
              <span className="absolute bottom-2 right-2 text-6xl text-muted-foreground/20 font-serif">”</span>
            </div>
          ) : item.contentType === 'PDF' && item.type === 'link' ? (
            <div className="p-6 flex flex-col flex-grow items-center justify-center text-center">
                <PdfIcon className="h-12 w-12 mb-3" />
                <h3 className="font-semibold text-foreground break-all leading-tight">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">PDF Document</p>
            </div>
          ) : item.type === 'image' ? (
              null
          ) : (
              <div className="p-4 flex flex-col flex-grow relative">
                <div className="flex-grow space-y-2 mb-4">
                  <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors flex items-start gap-3">
                    {TitleIcon}
                    <span className="truncate">{displayTitle}</span>
                  </h3>

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
              </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default React.memo(ContentCard);
