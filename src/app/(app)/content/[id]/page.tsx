
'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getContentItemById, getZoneById } from '@/services/contentService'; 
import type { ContentItem, Zone } from '@/types'; 
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CalendarDays, Folder, Tag as TagIcon, Globe, StickyNote, FileImage, ExternalLink, ListChecks, Mic, Layers, Landmark } from 'lucide-react';
import { format } from 'date-fns';

const getTypeIcon = (type: ContentItem['type'] | undefined) => {
  if (!type) return <StickyNote className="h-5 w-5 text-muted-foreground" />;
  switch (type) {
    case 'link':
      return <Globe className="h-5 w-5 text-primary" />;
    case 'note':
      return <StickyNote className="h-5 w-5 text-primary" />;
    case 'image':
      return <FileImage className="h-5 w-5 text-primary" />;
    case 'todo':
      return <ListChecks className="h-5 w-5 text-primary" />;
    case 'voice':
      return <Mic className="h-5 w-5 text-primary" />;
    default:
      return <StickyNote className="h-5 w-5 text-muted-foreground" />;
  }
};


export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [item, setItem] = useState<ContentItem | null>(null);
  const [zone, setZone] = useState<Zone | null>(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const fetchedItem = await getContentItemById(id);
          if (fetchedItem) {
            setItem(fetchedItem);
            if (fetchedItem.zoneId) { 
              const fetchedZone = await getZoneById(fetchedItem.zoneId); 
              setZone(fetchedZone || null); 
            }
          } else {
            setError('Content item not found.');
          }
        } catch (e) {
          console.error('Error fetching content details:', e);
          setError('Failed to load content details.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-3/4 mx-auto mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mx-auto mb-6"></div>
          <div className="space-y-4">
            <div className="h-40 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-semibold text-destructive mb-4">{error}</h1>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-semibold text-muted-foreground">Content Item Not Found</h1>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <Button onClick={() => router.back()} variant="outline" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className="shadow-xl">
        {item.imageUrl && (item.type === 'image' || item.type === 'link') && (
          <div className="relative w-full h-72 rounded-t-lg overflow-hidden">
            <Image
              src={item.imageUrl}
              alt={item.title}
              layout="fill"
              objectFit="cover"
              data-ai-hint={item.title.substring(0,20)}
            />
          </div>
        )}
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2">
            {getTypeIcon(item.type)}
            <CardTitle className="text-3xl font-headline">{item.title}</CardTitle>
          </div>
          {item.type === 'link' && item.url && (
            <CardDescription className="text-sm text-muted-foreground flex items-center">
              <ExternalLink className="h-4 w-4 mr-2" />
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary break-all">
                {item.url}
              </a>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {item.description && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Description</h3>
              <div className="prose dark:prose-invert max-w-none text-foreground whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: item.description }} />
            </div>
          )}
           {item.type === 'voice' && item.audioUrl && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Voice Note</h3>
              <audio controls src={item.audioUrl} className="w-full">
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>Created: {format(new Date(item.createdAt), 'MMMM d, yyyy p')}</span>
            </div>
            {zone && ( 
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Folder className="h-4 w-4" />
                <span>Zone: {zone.name}</span> 
              </div>
            )}
             <div className="flex items-center space-x-2 text-muted-foreground capitalize">
                {getTypeIcon(item.type)}
                <span>Type: {item.type}</span>
              </div>
            {item.domain && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Landmark className="h-4 w-4" />
                <span>Domain: {item.domain}</span>
              </div>
            )}
            {item.contentType && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Layers className="h-4 w-4" />
                <span>Content Type: {item.contentType}</span>
              </div>
            )}
          </div>

          {item.tags && item.tags.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground flex items-center">
                <TagIcon className="h-5 w-5 mr-2 text-primary" /> Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {item.tags.map(tag => (
                  <Badge key={tag.id} variant="secondary" className="font-normal text-sm px-3 py-1">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
        </CardFooter>
      </Card>
    </div>
  );
}
