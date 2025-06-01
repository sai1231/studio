import type React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ExternalLink, Edit3, Trash2, MoreVertical, Globe, Smile, Meh, Frown } from 'lucide-react';
import type { LinkItem } from '@/types';

interface LinkCardProps {
  link: LinkItem;
  onEdit: (link: LinkItem) => void;
  onDelete: (linkId: string) => void;
}

const LinkCard: React.FC<LinkCardProps> = ({ link, onEdit, onDelete }) => {
  const renderSentimentIcon = () => {
    if (!link.sentiment) return null;
    switch (link.sentiment.label) {
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

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
      {link.imageUrl && (
        <div className="relative w-full h-48">
          <Image 
            src={link.imageUrl || "https://placehold.co/600x400.png"} 
            alt={link.title} 
            layout="fill" 
            objectFit="cover" 
            data-ai-hint="website preview technology"
          />
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-lg font-headline leading-tight">{link.title}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground flex items-center pt-1">
          <Globe className="h-3 w-3 mr-1.5 shrink-0" /> 
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{link.url}</a>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {link.description && <p className="text-sm text-muted-foreground mb-3">{link.description}</p>}
        <div className="flex flex-wrap gap-2">
          {link.tags.slice(0, 5).map((tag) => (
            <Badge key={tag.id} variant="secondary" className="font-normal">
              {tag.name}
            </Badge>
          ))}
          {link.tags.length > 5 && <Badge variant="outline">+{link.tags.length - 5} more</Badge>}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-4 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {renderSentimentIcon()}
          {link.sentiment && (
            <span className="capitalize">{link.sentiment.label} ({link.sentiment.score.toFixed(2)})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label="Open link in new tab">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(link)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(link.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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

export default LinkCard;
