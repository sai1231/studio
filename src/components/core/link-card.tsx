
import type React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, Trash2, Globe, StickyNote, FileImage, ListChecks, Mic, Layers, Landmark, PlayCircle } from 'lucide-react';
import type { ContentItem, ContentItemType } from '@/types';
import { cn } from '@/lib/utils';

interface ContentCardProps {
  item: ContentItem;
  onDelete: (itemId: string) => void;
}

const getHintFromItem = (item: ContentItem): string => {
  let hint = "content item";
  if (item.tags && item.tags.length > 0) {
    hint = item.tags.slice(0, 2).map(tag => tag.name.split(' ')[0]).join(' ');
  } else if (item.title) {
    hint = item.title.split(' ').slice(0, 2).join(' ');
  }
  return hint.toLowerCase() || "web content";
};

const getTypeSpecifics = (type: ContentItemType | undefined) => {
  switch (type) {
    case 'link':
      return { icon: Globe, color: 'blue', bgClass: 'bg-sky-50 dark:bg-sky-950/60', iconRing: 'ring-sky-500/30', iconText: 'text-sky-600 dark:text-sky-400' };
    case 'note':
      return { icon: StickyNote, color: 'yellow', bgClass: 'bg-yellow-50 dark:bg-yellow-950/60', iconRing: 'ring-yellow-500/30', iconText: 'text-yellow-600 dark:text-yellow-400' };
    case 'image':
      return { icon: FileImage, color: 'gray', bgClass: 'bg-card', iconRing: 'ring-gray-500/30', iconText: 'text-gray-600 dark:text-gray-400' };
    case 'todo':
      return { icon: ListChecks, color: 'green', bgClass: 'bg-emerald-50 dark:bg-emerald-950/60', iconRing: 'ring-emerald-500/30', iconText: 'text-emerald-600 dark:text-emerald-400' };
    case 'voice':
      return { icon: Mic, color: 'purple', bgClass: 'bg-purple-50 dark:bg-purple-950/60', iconRing: 'ring-purple-500/30', iconText: 'text-purple-600 dark:text-purple-400' };
    default:
      return { icon: StickyNote, color: 'gray', bgClass: 'bg-card', iconRing: 'ring-gray-500/30', iconText: 'text-muted-foreground' };
  }
};

const ContentCard: React.FC<ContentCardProps> = ({ item, onDelete }) => {
  const hasImage = item.imageUrl && (item.type === 'link' || item.type === 'image');
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

  return (
    <Card className={cn(
      "overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col group rounded-2xl break-inside-avoid mb-4",
      !hasImage && specifics.bgClass
    )}>
      <Link href={`/content/${item.id}`} passHref className="flex flex-col flex-grow group/link">
        <div className="flex flex-col flex-grow cursor-pointer">
          {hasImage ? (
            <div className="relative w-full h-56">
              <Image
                src={item.imageUrl || "https://placehold.co/600x400.png"}
                alt={item.title}
                layout="fill"
                objectFit="cover"
                data-ai-hint={getHintFromItem(item)}
                className="rounded-t-2xl group-hover/link:scale-105 transition-transform duration-300"
              />
            </div>
          ) : null}

          <CardHeader className={cn("pb-3", !hasImage ? "pt-4" : "pt-3")}>
            {!hasImage && (
              <div className="flex items-baseline gap-3 mb-2"> {/* Changed items-center to items-baseline */}
                <div className={cn("p-2 rounded-full ring-2", specifics.iconRing, specifics.iconBg?.replace('bg-', 'bg-opacity-50 dark:bg-opacity-50 bg-'))}>
                  <IconComponent className={cn("h-6 w-6", specifics.iconText)} />
                </div>
                <CardTitle className="text-xl font-headline leading-tight group-hover/link:text-primary transition-colors">
                  {item.title}
                </CardTitle>
              </div>
            )}
            {hasImage && (
                 <CardTitle className="text-lg font-headline leading-tight group-hover/link:text-primary transition-colors">
                    {item.title}
                </CardTitle>
            )}
            {item.type === 'link' && (
              <CardDescription className="text-xs text-muted-foreground flex items-center pt-1">
                <Globe className="h-3 w-3 mr-1.5 shrink-0" />
                <span className="truncate group-hover/link:underline">{item.url}</span>
              </CardDescription>
            )}
            {item.type !== 'link' && !hasImage && (
              <CardDescription className={cn("text-xs flex items-center pt-1", specifics.iconText ? specifics.iconText.replace('text-', 'text-opacity-70 ') : 'text-muted-foreground')}>
                <span className="capitalize">{item.type}</span>
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className={cn("flex-grow space-y-3", hasImage ? "pt-0 pb-3" : "pt-2 pb-3")}>
            {item.description && (
              <div className={cn("text-sm mb-3 break-words", specifics.bgClass !== 'bg-card' ? 'text-foreground/80' : 'text-muted-foreground')}>
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
                <Badge variant="outline" className={cn("text-xs py-0.5 px-1.5 font-normal", specifics.bgClass !== 'bg-card' ? 'border-foreground/20 text-foreground/70 bg-background/10 hover:bg-background/20' : 'border-blue-500/30 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30')}>
                  <Landmark className="h-3 w-3 mr-1 opacity-70" />{item.domain}
                </Badge>
              )}
              {item.contentType && (
                <Badge variant="outline" className={cn("text-xs py-0.5 px-1.5 font-normal", specifics.bgClass !== 'bg-card' ? 'border-foreground/20 text-foreground/70 bg-background/10 hover:bg-background/20' : 'border-purple-500/30 text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30')}>
                  <Layers className="h-3 w-3 mr-1 opacity-70" />{item.contentType}
                </Badge>
              )}
            </div>

            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.tags.slice(0, 2).map((tag) => ( 
                  <Badge key={tag.id} variant="secondary" className="font-normal bg-opacity-70 dark:bg-opacity-50 text-xs py-0.5 px-1.5">
                    {tag.name}
                  </Badge>
                ))}
                {item.tags.length > 2 && <Badge variant="outline" className={cn("text-xs py-0.5 px-1.5 font-normal", specifics.bgClass !== 'bg-card' ? 'border-foreground/20 text-foreground/70 bg-background/10 hover:bg-background/20' : '')}>+{item.tags.length - 2} more</Badge>}
              </div>
            )}
          </CardContent>
        </div>
      </Link>
      <CardFooter className={cn("flex justify-between items-center pt-3 pb-3 px-4", specifics.bgClass !== 'bg-card' ? 'mt-auto border-t-0' : 'border-t-0')}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {/* Placeholder for date or other small info */}
        </div>
        <div className="flex items-center gap-2">
          {item.type === 'link' && item.url && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild onClick={handleActionClick} className={cn("h-8 w-8", specifics.bgClass !== 'bg-card' && 'bg-background/30 hover:bg-background/50 border-foreground/20 text-foreground/70')}>
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
                  className={cn("h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10", specifics.bgClass !== 'bg-card' && 'hover:bg-black/10 dark:hover:bg-white/10')}
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
