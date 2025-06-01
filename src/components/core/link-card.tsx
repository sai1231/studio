
import type React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ExternalLink, Edit3, Trash2, MoreVertical, Globe, StickyNote, FileImage, ListChecks, Mic } from 'lucide-react';
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
  const isLink = item.type === 'link' && item.url;

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full group">
      <Link href={`/content/${item.id}`} passHref className="flex flex-col flex-grow">
        <div className="flex flex-col flex-grow cursor-pointer">
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
            <CardTitle className="text-lg font-headline leading-tight group-hover:text-primary transition-colors">
              {item.title}
            </CardTitle>
            {isLink && (
              <CardDescription className="text-xs text-muted-foreground flex items-center pt-1">
                {getTypeIcon(item.type)}
                <span className="truncate group-hover:underline">{item.url}</span>
              </CardDescription>
            )}
            {(item.type !== 'link') && (
              <CardDescription className="text-xs text-muted-foreground flex items-center pt-1">
                {getTypeIcon(item.type)}
                <span className="capitalize">{item.type}</span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-grow">
            {item.description && <div className={`text-sm ${item.type === 'note' ? 'text-foreground whitespace-pre-wrap' : 'text-muted-foreground'} mb-3 break-words`} dangerouslySetInnerHTML={{ __html: item.description.length > 150 ? item.description.substring(0, 150) + '...' : item.description }} />}
            {item.type === 'voice' && item.audioUrl && (
              <div className="my-2">
                <p className="text-sm text-muted-foreground">Voice recording ready.</p>
              </div>
            )}
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
        </div>
      </Link>
      <CardFooter className="flex justify-between items-center pt-4 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {/* Any footer content like date, etc. */}
        </div>
        <div className="flex items-center gap-2">
          {isLink && (
            <Button variant="outline" size="icon" asChild onClick={handleActionClick}>
              <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Open link in new tab">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleActionClick}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={handleActionClick}>
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
