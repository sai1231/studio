

'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog'; 
import type { ContentItem, Zone } from '@/types';
import { Button } from '@/components/ui/button';
import { FolderOpen, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getContentItems, getZoneById, moveItemToTrash } from '@/services/contentService';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry';

const pageLoadingMessages = [
  "Organizing your thoughts...",
  "Fetching your inspirations...",
  "Aligning your ideas...",
  "Connecting the dots...",
];

export default function ZonePage() {
  const params = useParams() as { id: string };
  const zoneId = params.id; 
  const router = useRouter();
  const { toast } = useToast();
  const { user, role } = useAuth();
  const { openFocusMode } = useDialog();

  const [allContentInZone, setAllContentInZone] = useState<ContentItem[]>([]);
  const [currentZone, setCurrentZone] = useState<Zone | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [clientLoadingMessage, setClientLoadingMessage] = useState<string | null>(null);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<ContentItem | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  useEffect(() => {
    if (isLoading) {
      const randomIndex = Math.floor(Math.random() * pageLoadingMessages.length);
      setClientLoadingMessage(pageLoadingMessages[randomIndex]);
    }
  }, [isLoading]);

  const fetchZonePageData = useCallback(async () => {
    if (!user || !zoneId || !role) {
      setIsLoading(false);
      if (!zoneId) setError("Zone ID is missing.");
      else if (!user) setError("User not authenticated.");
      else if (!role) setError("User role not loaded.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [zoneDetails, allItems] = await Promise.all([
        getZoneById(zoneId),
        getContentItems(user.uid, role.features.contentLimit),
      ]);

      if (zoneDetails) {
        setCurrentZone(zoneDetails);
        const itemsInThisZone = allItems.filter(item => item.zoneIds?.includes(zoneId));
        setAllContentInZone(itemsInThisZone);
      } else {
        setCurrentZone(null);
        setAllContentInZone([]);
        setError('Zone not found.');
      }

    } catch (err) {
      console.error("Error fetching zone page data:", err);
      setError("Failed to load zone content. Please try again.");
      toast({ title: "Error", description: "Could not load zone content.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [zoneId, toast, user, role]);

  useEffect(() => {
    if (user && role) {
      fetchZonePageData();
    }
  }, [user, role, fetchZonePageData]);

  const handleItemClick = (item: ContentItem) => {
    if (item.type === 'note') {
      openFocusMode(item);
    } else {
      setSelectedItemForDetail(item);
      setIsDetailDialogOpen(true);
    }
  };
  
  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    const wasInZone = allContentInZone.some(item => item.id === updatedItem.id);
    const stillInZone = updatedItem.zoneIds?.includes(zoneId);

    if (wasInZone && !stillInZone) { // Moved out of current zone
      setAllContentInZone(prev => prev.filter(item => item.id !== updatedItem.id));
    } else if (!wasInZone && stillInZone) { // Moved into current zone
      setAllContentInZone(prev => [...prev, updatedItem].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } else if (wasInZone && stillInZone) { // Updated within current zone
      setAllContentInZone(prev => 
        prev.map(item => item.id === updatedItem.id ? updatedItem : item)
      );
    }
  };

  const handleDeleteItem = async (itemIdToDelete: string) => {
    const itemTitle = allContentInZone.find(item => item.id === itemIdToDelete)?.title || "Item";
    setAllContentInZone(prev => prev.filter(item => item.id !== itemIdToDelete));
    const { id: toastId } = toast({ title: "Deleting Item...", description: `Removing "${itemTitle}".`});
    try {
      await moveItemToTrash(itemIdToDelete);
      toast({ id: toastId, title: "Item Deleted", description: `"${itemTitle}" has been removed.`, variant: "default" });
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({ id: toastId, title: "Error Deleting", description: `Could not delete "${itemTitle}".`, variant: "destructive"});
      fetchZonePageData(); // Re-fetch to restore if delete failed
    }
  };

  if (isLoading || !user || !role) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto py-2">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          {clientLoadingMessage || pageLoadingMessages[0]}
        </p>
      </div>
    );
  }

  if (error || !currentZone) {
     return (
        <div className="container mx-auto py-8 text-center">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-headline font-semibold text-destructive">{error || "Zone Not Found"}</h1>
            <p className="text-muted-foreground mt-2">The zone with ID "{zoneId}" could not be found or loaded.</p>
            <Button onClick={() => router.back()} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">Go Back</Button>
        </div>
    );
  }
  
  const viewMode = currentZone.isMoodboard ? 'moodboard' : 'grid';

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-headline font-semibold text-foreground">
          {currentZone.name}
        </h1>
      </div>

      {allContentInZone.length === 0 ? (
        <div className="text-center py-12">
           <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">
              No items in "{currentZone.name}" yet.
          </h2>
          <p className="text-muted-foreground mt-2">
              Add items to this zone via the "Add Content" button.
          </p>
        </div>
      ) : (
        <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 750: 2, 900: 3, 1200: 4, 1500: 5 }}>
            <Masonry gutter="1rem">
                {allContentInZone.map(item => (
                    <ContentCard
                    key={item.id}
                    item={item}
                    viewMode={viewMode}
                    onEdit={handleItemClick}
                    onDelete={handleDeleteItem}
                    isSelected={false} // Selection not enabled on this page yet
                    onToggleSelection={() => {}} // No-op
                    isSelectionActive={false}
                    />
                ))}
            </Masonry>
        </ResponsiveMasonry>
      )}
      <ContentDetailDialog
        item={selectedItemForDetail}
        open={isDetailDialogOpen}
        onOpenChange={(open) => {
          setIsDetailDialogOpen(open);
          if (!open) setSelectedItemForDetail(null);
        }}
        onItemUpdate={handleItemUpdateInDialog}
        onItemDelete={handleDeleteItem}
      />
    </div>
  );
}
