

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { subscribeToTrashedItems, restoreItemFromTrash, permanentlyDeleteContentItem } from '@/services/contentService';
import type { ContentItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Undo } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import ContentCard from '@/components/core/link-card';

export default function TrashPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trashedItems, setTrashedItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToTrashedItems(user.uid, (items, error) => {
      if (error) {
        console.error("Error fetching trashed items:", error);
        toast({ title: "Error", description: "Could not load trashed items.", variant: "destructive" });
      } else {
        setTrashedItems(items);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const handleRestore = async (item: ContentItem) => {
    setIsProcessing(item.id);
    const originalItems = [...trashedItems];
    setTrashedItems(prev => prev.filter(i => i.id !== item.id));

    try {
      await restoreItemFromTrash(item.id);
      toast({ title: "Item Restored", description: `"${item.title}" has been restored to your collection.` });
    } catch (error) {
      console.error("Error restoring item:", error);
      toast({ title: "Error", description: "Could not restore the item.", variant: "destructive" });
      setTrashedItems(originalItems); // Revert on failure
    } finally {
      setIsProcessing(null);
    }
  };

  const handlePermanentDelete = async (item: ContentItem) => {
    setIsProcessing(item.id);
    const originalItems = [...trashedItems];
    setTrashedItems(prev => prev.filter(i => i.id !== item.id));

    try {
      await permanentlyDeleteContentItem(item.id);
      toast({ title: "Item Permanently Deleted", description: `"${item.title}" has been deleted forever.` });
    } catch (error) {
      console.error("Error permanently deleting item:", error);
      toast({ title: "Error", description: "Could not permanently delete the item.", variant: "destructive" });
      setTrashedItems(originalItems); // Revert on failure
    } finally {
      setIsProcessing(null);
    }
  };

  const TrashedItemCard: React.FC<{ item: ContentItem }> = ({ item }) => {
    const timeInTrash = item.trashedAt ? formatDistanceToNow(new Date(item.trashedAt), { addSuffix: true }) : 'a while ago';

    return (
      <div className="flex flex-col gap-2">
        <ContentCard 
            item={item} 
            onEdit={() => {}} 
            onDelete={() => {}} 
            isSelected={false}
            onToggleSelection={() => {}}
            isSelectionActive={false}
        />
        <div className="p-2 bg-muted/50 rounded-lg space-y-2">
            <p className="text-xs text-muted-foreground text-center">Moved to trash {timeInTrash}</p>
            <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => handleRestore(item)} disabled={!!isProcessing}>
                    {isProcessing === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo className="h-4 w-4" />}
                    <span className="ml-2">Restore</span>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={!!isProcessing}>
                        {isProcessing === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        <span className="ml-2">Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{item.title}". This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handlePermanentDelete(item)} className="bg-destructive hover:bg-destructive/90">
                        Delete Forever
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Trash...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-3 mb-2">
        <Trash2 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Trash</h1>
      </div>
      <p className="text-muted-foreground mb-6">Items in the trash will be permanently deleted after 10 days.</p>
      
      {trashedItems.length > 0 ? (
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4">
          {trashedItems.map(item => <TrashedItemCard key={item.id} item={item} />)}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <Trash2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium">The trash is empty!</h2>
          <p className="text-muted-foreground mt-2">When you delete items, they will appear here.</p>
        </div>
      )}
    </div>
  );
}
