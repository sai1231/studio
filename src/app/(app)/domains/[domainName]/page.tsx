
'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ContentCard from '@/components/core/link-card';
import ContentDetailDialog from '@/components/core/ContentDetailDialog';
import type { ContentItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Globe, FolderOpen, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getContentItems, deleteContentItem } from '@/services/contentService';

const pageLoadingMessages = [
  "Fetching content from this domain...",
  "Filtering your saved items...",
  "Curating your domain-specific view...",
];

export default function DomainPage() {
  const params = useParams() as { domainName: string } | null;
  const router = useRouter();
  const { toast } = useToast();

  const [decodedDomainName, setDecodedDomainName] = useState<string>('');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clientLoadingMessage, setClientLoadingMessage] = useState<string | null>(null);

  const [selectedItemIdForDetail, setSelectedItemIdForDetail] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const randomIndex = Math.floor(Math.random() * pageLoadingMessages.length);
      setClientLoadingMessage(pageLoadingMessages[randomIndex]);
    }
  }, [isLoading]);

  useEffect(() => {
    if (params && params.domainName) {
      try {
        const name = decodeURIComponent(params.domainName);
        setDecodedDomainName(name);
      } catch (e) {
        console.error("Error decoding domain name:", e);
        toast({ title: "Error", description: "Invalid domain name in URL.", variant: "destructive" });
        setDecodedDomainName('');
      }
    } else {
      setDecodedDomainName('');
       if (typeof window !== 'undefined' && params === null) {
          console.warn("DomainPage: params or params.domainName is not available.");
      }
    }
  }, [params, toast]);

  const fetchItemsByDomain = useCallback(async () => {
    if (!decodedDomainName) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const allContent = await getContentItems();
      const lowerCaseDomainName = decodedDomainName.toLowerCase();
      const domainItems = allContent.filter(item =>
        item.domain && item.domain.toLowerCase() === lowerCaseDomainName
      );
      setItems(domainItems);
    } catch (error) {
      console.error("Error fetching items for domain:", error);
      toast({ title: "Error", description: `Could not load items for domain "${decodedDomainName}".`, variant: "destructive" });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [decodedDomainName, toast]);

  useEffect(() => {
    if (decodedDomainName) {
      fetchItemsByDomain();
    } else {
      setItems([]);
      setIsLoading(false);
    }
  }, [decodedDomainName, fetchItemsByDomain]);

  const handleOpenDetailDialog = (item: ContentItem) => {
    setSelectedItemIdForDetail(item.id);
    setIsDetailDialogOpen(true);
  };

  const handleItemUpdateInDialog = (updatedItem: ContentItem) => {
    const lowerCaseDomainName = decodedDomainName.toLowerCase();
    const stillMatchesDomain = updatedItem.domain && updatedItem.domain.toLowerCase() === lowerCaseDomainName;

    if (stillMatchesDomain) {
      setItems(prevItems =>
        prevItems.map(item => item.id === updatedItem.id ? updatedItem : item)
      );
    } else {
      // If the domain changed and no longer matches, remove it from this view
      setItems(prevItems => prevItems.filter(item => item.id !== updatedItem.id));
    }
    toast({ title: "Item Updated", description: `"${updatedItem.title}" has been updated.` });
  };

  const handleDeleteItem = async (itemIdToDelete: string) => {
    const itemTitle = items.find(item => item.id === itemIdToDelete)?.title || "Item";
    const { id: toastId } = toast({ title: "Deleting Item...", description: `Removing "${itemTitle}".` });
    try {
      await deleteContentItem(itemIdToDelete);
      toast({ id: toastId, title: "Item Deleted", description: `"${itemTitle}" has been removed.`, variant: "default" });
      fetchItemsByDomain(); 
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({ id: toastId, title: "Error Deleting", description: `Could not delete "${itemTitle}".`, variant: "destructive" });
    }
  };
  
  if (isLoading && !decodedDomainName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto py-2">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading domain information...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto py-2">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          {clientLoadingMessage || pageLoadingMessages[0]}
        </p>
      </div>
    );
  }

  if (!decodedDomainName && !isLoading) {
    return (
        <div className="container mx-auto py-8 text-center">
            <Globe className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-headline font-semibold text-destructive">Invalid Domain</h1>
            <p className="text-muted-foreground mt-2">The specified domain could not be processed.</p>
            <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">Go to Dashboard</Button>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-headline font-semibold text-foreground flex items-center">
          <Globe className="h-7 w-7 mr-3 text-primary" />
          Content from: <span className="ml-2 font-bold text-primary">{decodedDomainName}</span>
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">
            No items found from "{decodedDomainName}".
          </h2>
          <p className="text-muted-foreground mt-2">
            Save content from this domain to see it here.
          </p>
        </div>
      ) : (
        <div className={'columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4'}>
          {items.map(item => (
            <ContentCard
              key={item.id}
              item={item}
              onEdit={handleOpenDetailDialog}
              onDelete={handleDeleteItem}
            />
          ))}
        </div>
      )}
      {selectedItemIdForDetail && (
        <ContentDetailDialog
          itemId={selectedItemIdForDetail}
          open={isDetailDialogOpen}
          onOpenChange={(open) => {
            setIsDetailDialogOpen(open);
            if (!open) setSelectedItemIdForDetail(null);
          }}
          onItemUpdate={handleItemUpdateInDialog}
        />
      )}
    </div>
  );
}
