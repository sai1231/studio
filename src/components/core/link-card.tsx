
import type React from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, Trash2, Globe, StickyNote, FileImage, ListChecks, Mic, Layers, Landmark, PlayCircle } from 'lucide-react';
import type { ContentItem, ContentItemType } from '@/types';
import { cn } from '@/lib/utils';

interface ContentCardProps {
  item: ContentItem;
  onEdit: (item: ContentItem) => void;
  onDelete: (itemId: string) => void;
}

const getTypeSpecifics = (type: ContentItemType | undefined) => {
  switch (type) {
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

const pixabayFallbackImages = [
  'https://cdn.pixabay.com/photo/2023/06/21/06/12/man-8078578_640.jpg',
  'https://cdn.pixabay.com/photo/2024/07/09/03/48/shiva-poster-8882318_1280.jpg',
  'https://cdn.pixabay.com/photo/2025/05/14/16/21/city-9599967_960_720.jpg',
  'https://cdn.pixabay.com/photo/2024/05/26/10/00/lighthouse-8788992_640.jpg',
  'https://cdn.pixabay.com/photo/2024/04/09/15/07/coffee-8686017_640.jpg'
];
let lastUsedFallbackIndex = -1;
const getNextFallbackImage = () => {
  lastUsedFallbackIndex = (lastUsedFallbackIndex + 1) % pixabayFallbackImages.length;
  return pixabayFallbackImages[lastUsedFallbackIndex];
};

const ContentCard: React.FC<ContentCardProps> = ({ item, onEdit, onDelete }) => {
  const hasImage = item.imageUrl && (item.type === 'link' || item.type === 'image' || item.type === 'note' || item.type === 'voice' || item.type === 'movie');
  const specifics = getTypeSpecifics(item.type);
  const IconComponent = specifics.icon;

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card's onClick when clicking an icon
  };

  // Strip HTML for card display and truncate
  const getPlainTextDescription = (htmlString: string | undefined): string => {
    if (!htmlString) return '';
    // Ensure this only runs client-side or in an environment with DOM
    if (typeof document !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlString;
      return tempDiv.textContent || tempDiv.innerText || '';
    }
    return htmlString; // Fallback for server-side or non-DOM environments
  };
  
  const plainDescription = getPlainTextDescription(item.description);
  const imageToDisplay = item.imageUrl || getNextFallbackImage();
  const imageAiHint = item.imageUrl ? item.title.split(' ').slice(0,2).join(' ') : "abstract placeholder";


  return (
    <Card
      className={cn(
        "overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col group rounded-3xl p-3 break-inside-avoid mb-4 relative"
      )}
    >
      {/* Action Icons - Moved to bottom right, appear on hover */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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

      <div className="flex flex-col flex-grow group/link cursor-pointer" onClick={() => onEdit(item)}>
        {/* Image or Icon Section */}
        {hasImage ? (
            <div className="relative w-full mb-2 rounded-xl overflow-hidden aspect-[4/3]">
            <Image
              src={imageToDisplay}
              alt={item.title}
              data-ai-hint={imageAiHint}
              fill
              className="object-cover group-hover/link:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ) : (
          // No image container if no image, text will flow from top
          item.type !== 'link' && // For non-links without image, show icon placeholder if needed
          <div className="relative w-full mb-2 rounded-xl overflow-hidden aspect-[4/3] bg-muted flex items-center justify-center">
             <IconComponent className={cn("h-16 w-16", specifics.iconText)} />
          </div>
        )}


        {/* Text Content Section */}
        <div className="flex flex-col flex-grow pt-1">
          <h3 className="text-lg font-semibold leading-tight group-hover/link:text-primary transition-colors truncate">
            {item.title || "Untitled"}
          </h3>

          {plainDescription && (
            <p className="mt-1 text-sm text-muted-foreground break-words line-clamp-2">
              {plainDescription}
            </p>
          )}

          {item.type === 'voice' && item.audioUrl && !plainDescription && (
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <PlayCircle className={cn("h-5 w-5", specifics.iconText)} />
                <span>Voice recording</span>
              </div>
            )}
          
          {/* Meta Information */}
          <div className="mt-auto pt-2 flex flex-wrap gap-x-4 gap-y-1 items-center text-xs text-muted-foreground">
            {item.domain && (
              <div className="flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 opacity-80" />
                <span>{item.domain}</span>
              </div>
            )}
            {/* Content Type Removed */}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ContentCard;
