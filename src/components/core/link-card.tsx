
import type React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ExternalLink, Edit3, Trash2, MoreVertical, Globe, Smile, Meh, Frown, StickyNote, FileImage, ListChecks, Mic } from 'lucide-react';
import type { ContentItem } from '@/types';

interface ContentCardProps {
  item: ContentItem;
  onEdit: (item: ContentItem) => void;
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

const getTypeIcon = (type: ContentItem['type']) => {
  switch (type) {
    case 'link':
      return <Globe className="h-3 w-3 mr-1.5 shrink-0" />;
    case 'note':
      return <StickyNote className="h-3 w-3 mr-1.5 shrink-0" />;
    case 'image':
      return <FileImage className="h-3 w-3 mr-1.5 shrink-0" />;
    case 'todo':
      return <ListChecks className="h-3 w-3 mr-1.5 shrink-0" />;
    case 'voice':
      return <Mic className="h-3 w-3 mr-1.5 shrink-0" />;
    default:
      return <Globe className="h-3 w-3 mr-1.5 shrink-0" />;
  }
}

const ContentCard: React.FC<ContentCardProps> = ({ item, onEdit, onDelete }) => {
  const renderSentimentIcon = () => {
    if (item.type !== 'link' || !item.sentiment) return null;
    switch (item.sentiment.label) {
      case 'positive':
        return <Smile className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <Frown className="h-4 w-4 text-red-500" />;
      case 'neutral':
        return <Meh className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const isLink = item.type === 'link' && item.url;

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
      {item.imageUrl && (item.type === 'link' || item.type === 'image') && (
        <div className="relative w-full h-48">
          <Image
            src={item.imageUrl || "https://placehold.co/600x400.png"}
            alt={item.title}
            layout="fill"
            objectFit="cover"
            data-ai-hint={getHintFromItem(item)}
          />
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-lg font-headline leading-tight">{item.title}</CardTitle>
        {isLink && (
          <CardDescription className="text-xs text-muted-foreground flex items-center pt-1">
            {getTypeIcon(item.type)}
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{item.url}</a>
          </CardDescription>
        )}
        {item.type !== 'link' && (
           <CardDescription className="text-xs text-muted-foreground flex items-center pt-1">
            {getTypeIcon(item.type)}
            <span className="capitalize">{item.type}</span>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-grow">
        {item.description && <p className={`text-sm ${item.type === 'note' ? 'text-foreground whitespace-pre-wrap' : 'text-muted-foreground'} mb-3`}>{item.description}</p>}
        {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
            {item.tags.slice(0, 5).map((tag) => (
                <Badge key={tag.id} variant="secondary" className="font-normal">
                {tag.name}
                </Badge>
            ))}
            {item.tags.length > 5 && <Badge variant="outline">+{item.tags.length - 5} more</Badge>}
            </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-4 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {item.type === 'link' && renderSentimentIcon()}
          {item.type === 'link' && item.sentiment && (
            <span className="capitalize">{item.sentiment.label} ({item.sentiment.score.toFixed(2)})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLink && (
            <Button variant="outline" size="icon" asChild>
              <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Open link in new tab">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(item.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ContentCard;
