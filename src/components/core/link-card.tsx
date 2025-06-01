
import type React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, Trash2, Globe, StickyNote, FileImage, ListChecks, Mic, Layers, Landmark, PlayCircle } from 'lucide-react';
import type { ContentItem, ContentItemType, Tag } from '@/types';
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

const tagColorPalettes = [
  'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100',
  'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100',
  'bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-purple-100',
  'bg-pink-100 text-pink-800 dark:bg-pink-700 dark:text-pink-100',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-700 dark:text-indigo-100',
  'bg-teal-100 text-teal-800 dark:bg-teal-700 dark:text-teal-100',
  'bg-sky-100 text-sky-800 dark:bg-sky-700 dark:text-sky-100',
  'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100',
  'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-100',
];

const getTagStyles = (tagName: string): string => {
  let hash = 0;
  if (!tagName || tagName.length === 0) {
    return tagColorPalettes[0];
  }
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % tagColorPalettes.length;
  return tagColorPalettes[index];
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
    e.stopPropagation();
  };

  const renderDescription = (description: string | undefined) => {
    if (!description) return null;
    const truncatedDescription = description.length > 150 ? description.substring(0, 150) + '...' : description;
    if (item.type === 'note' || item.type === 'todo') {
      return truncatedDescription.split('\n').map((line, index) => (
        <p key={index} className="mb-1 last:mb-0">
          {line.startsWith('- ') || line.startsWith('* ') ? `• ${line.substring(2)}` : line}
        </p>
      ));
    }
    return <div className="text-sm text-muted-foreground break-words" dangerouslySetInnerHTML={{ __html: truncatedDescription }} />;
  };

  const tagBaseClasses = "px-3 py-1 text-xs rounded-full font-medium";
  const imageToDisplay = item.imageUrl || getNextFallbackImage(); // Use sequential fallback
  const imageAiHint = item.imageUrl ? item.title.split(' ').slice(0,2).join(' ') : "abstract city";


  return (
    <Card
      className={cn(
        "overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col group rounded-2xl break-inside-avoid mb-4 cursor-pointer"
      )}
      onClick={() => onEdit(item)}
    >
      <div className="flex flex-col flex-grow group/link">
        <div className="flex flex-col flex-grow">
          {hasImage ? (
            <div className="relative w-full h-56">
              <Image
                src={imageToDisplay}
                alt={item.title}
                data-ai-hint={imageAiHint}
                fill
                className="object-cover rounded-t-2xl group-hover/link:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          ) : null}

          <CardHeader className={cn("pb-2", !hasImage ? "pt-4" : "pt-3")}>
            <div className="flex items-center gap-3 mb-2">
              {!hasImage && (
                <div className={cn("p-2 rounded-full ring-2", specifics.iconRing, "bg-muted/30 dark:bg-muted/20")}>
                  <IconComponent className={cn("h-6 w-6", specifics.iconText)} />
                </div>
              )}
              <CardTitle className="text-xl font-headline leading-tight group-hover/link:text-primary transition-colors">
                {item.title}
              </CardTitle>
            </div>

            {item.type === 'link' && item.url && (
              <CardDescription className="text-xs text-muted-foreground flex items-center pt-1">
                <Globe className="h-3 w-3 mr-1.5 shrink-0" />
                <span className="truncate group-hover/link:underline">{item.url}</span>
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className={cn("flex-grow space-y-3", hasImage ? "pt-0 pb-4" : "pt-2 pb-4")}>
            {item.description && (
              <div className={cn("text-sm mb-3 break-words", 'text-muted-foreground')}>
                {renderDescription(item.description)}
              </div>
            )}

            {item.type === 'voice' && item.audioUrl && (
              <div className="my-2 flex items-center gap-2 text-sm text-muted-foreground">
                <PlayCircle className={cn("h-5 w-5", specifics.iconText)} />
                <span>Voice recording ready.</span>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 items-center">
              {item.domain && (
                <Badge variant="outline" className={cn("text-xs py-0.5 px-1.5 font-normal", 'border-blue-500/30 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30')}>
                  <Landmark className="h-3 w-3 mr-1 opacity-70" />{item.domain}
                </Badge>
              )}
              {item.contentType && (
                <Badge variant="outline" className={cn("text-xs py-0.5 px-1.5 font-normal", 'border-purple-500/30 text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30')}>
                  <Layers className="h-3 w-3 mr-1 opacity-70" />{item.contentType}
                </Badge>
              )}
            </div>

            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag.id} className={cn(tagBaseClasses, getTagStyles(tag.name))}>
                    {tag.name}
                  </Badge>
                ))}
                {item.tags.length > 3 &&
                  <Badge
                    className={cn(tagBaseClasses, "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-100")}
                  >
                    +{item.tags.length - 3} more
                  </Badge>
                }
              </div>
            )}
          </CardContent>
        </div>
      </div>
      <CardFooter className={cn("flex justify-between items-center pt-3 pb-3 px-4", 'mt-auto border-t-0')}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {/* Placeholder for date or other small info */}
        </div>
        <div className="flex items-center gap-2">
          {item.type === 'link' && item.url && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild onClick={handleActionClick} className={cn("h-8 w-8", 'bg-background/30 hover:bg-background/50 border-foreground/20 text-foreground/70')}>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Open link in new tab">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open link</p>
                </TooltipContent>
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
                  className={cn("h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10", 'hover:bg-black/10 dark:hover:bg-white/10')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Forget</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ContentCard;
