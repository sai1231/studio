
import type React from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, Trash2 } from 'lucide-react';
import type { ContentItem } from '@/types';
import { cn } from '@/lib/utils';

interface ContentCardExperimentProps {
  item: ContentItem;
  onEdit: (item: ContentItem) => void;
  onDelete: (itemId: string) => void;
}

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

const ContentCardExperiment: React.FC<ContentCardExperimentProps> = ({ item, onEdit, onDelete }) => {
  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card's onEdit from firing when an icon is clicked
  };

  const imageToDisplay = item.imageUrl || getNextFallbackImage();
  const imageAiHint = item.imageUrl ? (item.title || 'image').split(' ').slice(0, 2).join(' ') : "abstract design";
  const displayText = item.title || (item.description ? `${item.description.substring(0, 70)}...` : 'Untitled');

  return (
    <Card
      className={cn(
        "relative overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group rounded-2xl break-inside-avoid mb-4 cursor-pointer",
        "aspect-video bg-muted" // Using aspect-video for a common ratio, bg-muted as a base
      )}
      onClick={() => onEdit(item)}
    >
      <Image
        src={imageToDisplay}
        alt={item.title || 'Content image'}
        data-ai-hint={imageAiHint}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-300"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={false} // Consider setting priority for LCP images if applicable on dashboard
      />

      {/* Text Overlay (Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
        <h3 className="text-base font-semibold text-white shadow-black/50 drop-shadow-sm truncate" title={displayText}>
          {displayText}
        </h3>
      </div>

      {/* Icons Overlay (Top Right on Hover) */}
      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {item.type === 'link' && item.url && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  asChild
                  onClick={handleActionClick}
                  className="h-9 w-9 bg-black/50 hover:bg-black/70 border-white/30 text-white shadow-md"
                  aria-label="Open link in new tab"
                >
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
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
                variant="default" // Changed from destructive to default with custom styling for overlay
                size="icon"
                onClick={(e) => {
                  handleActionClick(e);
                  onDelete(item.id);
                }}
                className="h-9 w-9 bg-black/50 hover:bg-red-600/90 border-white/30 text-white shadow-md"
                aria-label="Forget item"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Forget</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </Card>
  );
};

export default ContentCardExperiment;
