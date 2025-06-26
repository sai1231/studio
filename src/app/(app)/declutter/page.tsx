
'use client';

import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { getContentItems, deleteContentItem } from '@/services/contentService';
import type { ContentItem, Tag } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, Trash2, Sparkles, CalendarDays, Globe, StickyNote, FileImage, ListChecks, Mic, Layers, Landmark, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const getTypeSpecifics = (type: ContentItem['type'] | undefined) => {
  switch (type) {
    case 'link': return { icon: Globe, color: 'blue', iconRing: 'ring-sky-500/30', iconText: 'text-sky-600 dark:text-sky-400' };
    case 'note': return { icon: StickyNote, color: 'yellow', iconRing: 'ring-yellow-500/30', iconText: 'text-yellow-600 dark:text-yellow-400' };
    case 'image': return { icon: FileImage, color: 'gray', iconRing: 'ring-gray-500/30', iconText: 'text-gray-600 dark:text-gray-400' };
    case 'todo': return { icon: ListChecks, color: 'green', iconRing: 'ring-emerald-500/30', iconText: 'text-emerald-600 dark:text-emerald-400' };
    case 'voice': return { icon: Mic, color: 'purple', iconRing: 'ring-purple-500/30', iconText: 'text-purple-600 dark:text-purple-400' };
    default: return { icon: StickyNote, color: 'gray', iconRing: 'ring-gray-500/30', iconText: 'text-muted-foreground' };
  }
};

const tagColorPalettes = [
  'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100',
  'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100',
  'bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-purple-100',
  'bg-pink-100 text-pink-800 dark:bg-pink-700 dark:text-pink-100',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100',
];

const getTagStyles = (tagName: string): string => {
  let hash = 0;
  if (!tagName || tagName.length === 0) return tagColorPalettes[0];
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % tagColorPalettes.length;
  return tagColorPalettes[index];
};

const initialLoadingMessages = [
  "Finding your oldest memories to declutter...",
  "Dusting off the archives...",
  "Preparing items for review...",
];

export default function DeclutterPage() {
  const { user } = useAuth();
  const [itemsToDeclutter, setItemsToDeclutter] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [clientLoadingMessage, setClientLoadingMessage] = useState<string | null>(null);

  useEffect(() => {
      const randomIndex = Math.floor(Math.random() * initialLoadingMessages.length);
      setClientLoadingMessage(initialLoadingMessages[randomIndex]);
  }, []);

  const fetchAndSortItems = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const allItems = await getContentItems(user.uid);
      // Sort oldest first
      const sortedItems = allItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setItemsToDeclutter(sortedItems);
    } catch (error) {
      console.error("Error fetching items for declutter:", error);
      toast({ title: "Error", description: "Could not load items to declutter.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (user) {
      fetchAndSortItems();
    }
  }, [user, fetchAndSortItems]);

  const currentItem = itemsToDeclutter.length > 0 ? itemsToDeclutter[0] : null;

  const handleNextItem = () => {
    setItemsToDeclutter(prev => prev.slice(1));
    setIsProcessing(false);
  };

  const handleKeep = () => {
    if (!currentItem) return;
    setIsProcessing(true);
    toast({ title: "Item Kept", description: `"${currentItem.title}" will remain in your collection.`});
    // Simulate a small delay for visual feedback if needed, then proceed
    setTimeout(() => {
        handleNextItem();
    }, 200); 
  };

  const handleDelete = async () => {
    if (!currentItem) return;
    setIsProcessing(true);
    const itemTitle = currentItem.title;
    try {
      await deleteContentItem(currentItem.id);
      toast({ title: "Item Deleted", description: `"${itemTitle}" has been removed.`, variant: "default" });
      handleNextItem();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({ title: "Error", description: `Could not delete "${itemTitle}".`, variant: "destructive" });
      setIsProcessing(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto py-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">{clientLoadingMessage || 'Loading...'}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 flex flex-col items-center max-w-2xl">
      <div className="flex items-center text-3xl font-headline font-semibold text-foreground mb-2">
        <Sparkles className="h-8 w-8 mr-3 text-primary" />
        Declutter Old Memories
      </div>
      <p className="text-muted-foreground mb-8 text-center">Review your oldest items one by one. Decide what to keep or delete.</p>

      {isProcessing && currentItem && (
         <div className="w-full h-[450px] flex flex-col items-center justify-center bg-background rounded-xl shadow-2xl p-6 my-6">
            <Loader2 className="h-10 w-10 animate-spin text-primary"/>
            <p className="mt-3 text-muted-foreground">Processing...</p>
         </div>
      )}

      {!isProcessing && currentItem && (
        <Card className="w-full shadow-2xl rounded-xl overflow-hidden my-6 transition-all duration-300 ease-in-out transform hover:scale-[1.01]">
          <CardHeader className="pb-3">
            {currentItem.imageUrl && (
              <div className="relative w-full h-56 mb-3 rounded-lg overflow-hidden">
                <Image
                  src={currentItem.imageUrl}
                  alt={currentItem.title}
                  data-ai-hint={currentItem.title.split(' ').slice(0,2).join(' ') || "item image"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              {!currentItem.imageUrl && (
                <div className={cn("p-1.5 rounded-full ring-1", getTypeSpecifics(currentItem.type).iconRing, "bg-muted/30 dark:bg-muted/20")}>
                    {React.createElement(getTypeSpecifics(currentItem.type).icon, { className: cn("h-5 w-5", getTypeSpecifics(currentItem.type).iconText) })}
                </div>
              )}
              <CardTitle className="text-2xl font-headline">{currentItem.title}</CardTitle>
            </div>
             <div className="text-xs text-muted-foreground flex items-center pt-1">
                <CalendarDays className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                Saved {formatDistanceToNow(parseISO(currentItem.createdAt), { addSuffix: true })}
              </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentItem.description && (
              <p className="text-sm text-muted-foreground break-words line-clamp-3">
                {currentItem.description.length > 200 ? currentItem.description.substring(0, 200) + '...' : currentItem.description}
              </p>
            )}
            {currentItem.type === 'voice' && currentItem.audioUrl && (
                <div className="my-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <PlayCircle className={cn("h-5 w-5", getTypeSpecifics(currentItem.type).iconText)} />
                    <span>Voice recording available.</span>
                </div>
            )}
            <div className="flex flex-wrap gap-1.5 items-center">
              {currentItem.domain && (
                <Badge variant="outline" className={cn("text-xs py-0.5 px-1.5 font-normal", 'border-blue-500/30 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30')}>
                  <Landmark className="h-3 w-3 mr-1 opacity-70" />{currentItem.domain}
                </Badge>
              )}
              {currentItem.contentType && (
                <Badge variant="outline" className={cn("text-xs py-0.5 px-1.5 font-normal", 'border-purple-500/30 text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30')}>
                  <Layers className="h-3 w-3 mr-1 opacity-70" />{currentItem.contentType}
                </Badge>
              )}
            </div>
            {currentItem.tags && currentItem.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {currentItem.tags.slice(0, 4).map((tag: Tag) => (
                  <Badge key={tag.id} className={cn("px-2 py-0.5 text-xs rounded-full font-medium", getTagStyles(tag.name))}>
                    {tag.name}
                  </Badge>
                ))}
                {currentItem.tags.length > 4 && <Badge className={cn("px-2 py-0.5 text-xs rounded-full font-medium", getTagStyles('more'))}>+{currentItem.tags.length - 4} more</Badge>}
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-4">
            {/* Footer can be empty or show some other small info if needed */}
          </CardFooter>
        </Card>
      )}

      {!isProcessing && !isLoading && !currentItem && (
        <div className="text-center py-16">
          <Sparkles className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-semibold text-foreground">All Decluttered!</h2>
          <p className="text-muted-foreground mt-2">Your space is sparkling clean. Great job!</p>
           <Button onClick={fetchAndSortItems} className="mt-6">Refresh Items</Button>
        </div>
      )}

      {!isProcessing && currentItem && (
        <div className="flex w-full justify-around mt-6 mb-8">
          <Button
            onClick={handleKeep}
            size="lg"
            className="px-10 py-6 text-lg bg-green-600 hover:bg-green-700 text-white min-w-[150px] shadow-md hover:shadow-lg transition-shadow"
            disabled={isProcessing}
          >
            <Check className="mr-2 h-5 w-5" /> Keep
          </Button>
          <Button
            onClick={handleDelete}
            size="lg"
            variant="destructive"
            className="px-10 py-6 text-lg min-w-[150px] shadow-md hover:shadow-lg transition-shadow"
            disabled={isProcessing}
          >
            <Trash2 className="mr-2 h-5 w-5" /> Delete
          </Button>
        </div>
      )}
    </div>
  );
}
