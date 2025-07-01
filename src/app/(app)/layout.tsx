
'use client';
import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/core/app-header';
import AppSidebar from '@/components/core/app-sidebar';
import AddContentDialog from '@/components/core/add-content-dialog';
import AddTodoDialog from '@/components/core/AddTodoDialog';
import RecordVoiceDialog from '@/components/core/RecordVoiceDialog';
import type { Zone, ContentItem, ContentItemType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { addContentItem, getZones, uploadFile } from '@/services/contentService';
import { Button } from '@/components/ui/button';
import { Plus, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { SearchProvider } from '@/context/SearchContext';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { 
    isAddContentDialogOpen, 
    setIsAddContentDialogOpen, 
    isAddTodoDialogOpen, 
    setIsAddTodoDialogOpen,
    isRecordVoiceDialogOpen,
    setIsRecordVoiceDialogOpen,
    setNewlyAddedItem,
  } = useDialog();

  const [zones, setZones] = useState<Zone[]>([]);
  const { toast } = useToast();
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login');
    }
  }, [user, isAuthLoading, router]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const fetchedZones = await getZones(user.uid);
      setZones(fetchedZones);
    } catch (error) {
      console.error("Error fetching initial data for layout:", error);
      toast({ title: "Error", description: "Could not load essential data.", variant: "destructive" });
    }
  }, [toast, user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const handleAddContentAndRefresh = async (newContentData: Omit<ContentItem, 'id' | 'createdAt'>) => {
    if (!user) {
      toast({ title: "Not Authenticated", description: "You must be logged in to add content.", variant: "destructive" });
      return;
    }
    
    const currentToast = toast({
      title: `Saving ${newContentData.type === 'todo' ? 'TODO' : 'Content'}...`,
      description: "Please wait...",
    });

    try {
      const contentWithUser = { ...newContentData, userId: user.uid };
      const addedItem = await addContentItem(contentWithUser);

      currentToast.update({
        id: currentToast.id,
        title: `${addedItem.type.charAt(0).toUpperCase() + addedItem.type.slice(1)} Saved!`,
        description: `"${addedItem.title}" has been saved.`,
      });

      if (isAddContentDialogOpen) setIsAddContentDialogOpen(false);
      
      setNewlyAddedItem(addedItem);

    } catch (error) {
      console.error("Error saving content from layout:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      currentToast.update({
        id: currentToast.id,
        title: "Error Saving",
        description: `Could not save your item: ${errorMessage}.`,
        variant: "destructive",
      });
    }
  };

  const isValidUrl = (s: string) => { try { new URL(s); return true; } catch (_) { return false; } };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer.types.some(t => ['Files', 'text/uri-list', 'text/plain'].includes(t))) {
      setIsDraggingOver(true);
    }
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.types.includes('application/x-mati-internal')) return;
    if (isAuthLoading || !user) {
        toast({ title: "Hold on...", description: "Still getting things ready. Please try again in a moment.", variant: "default" });
        return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';

      if (!isImage && !isPdf) {
        toast({ title: "Unsupported File", description: "You can only upload images or PDF files.", variant: "destructive" });
        return;
      }
      
      const fileTypeForUpload = isImage ? 'image' : 'pdf';
      const toastId = toast({
        title: `Uploading ${fileTypeForUpload}...`,
        description: file.name,
      }).id;

      try {
        const folder = isImage ? 'contentImages' : 'contentPdfs';
        const path = `${folder}/${user.uid}/${Date.now()}_${file.name}`;
        const uploadedFileUrl = await uploadFile(file, path);

        const contentData = isImage
          ? {
              type: 'image', title: file.name, imageUrl: uploadedFileUrl,
              tags: [{id: 'dnd-drop', name: 'dropped'}], status: 'pending-analysis',
            } as Omit<ContentItem, 'id' | 'createdAt'>
          : {
              type: 'link', title: file.name, url: uploadedFileUrl, contentType: 'PDF',
              domain: 'mati.internal.storage', tags: [{id: 'dnd-drop', name: 'dropped'}],
              status: 'pending-analysis',
            } as Omit<ContentItem, 'id' | 'createdAt'>;

        await handleAddContentAndRefresh(contentData);
      } catch (error: any) {
        toast({ id: toastId, title: "Upload Failed", description: error.message || "An unknown error occurred.", variant: 'destructive' });
      }
      return;
    }

    let contentData: Omit<ContentItem, 'id' | 'createdAt'> | null = null;
    const uri = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (uri && isValidUrl(uri)) {
        let metadata = { title: '', description: '', faviconUrl: '', imageUrl: '' };
        try {
            const response = await fetch(`/api/scrape-metadata?url=${encodeURIComponent(uri)}`);
            if (response.ok) { metadata = await response.json(); }
        } catch (e) { console.error("Failed to scrape metadata for dropped link:", e); }
        if (!metadata.title) {
            try { metadata.title = new URL(uri).hostname.replace(/^www\./, ''); } 
            catch { metadata.title = "Untitled Link"; }
        }
        contentData = {
            type: 'link', url: uri, title: metadata.title, description: metadata.description, 
            faviconUrl: metadata.faviconUrl, imageUrl: metadata.imageUrl,
            tags: [{ id: 'dnd-drop', name: 'dropped' }], domain: new URL(uri).hostname.replace(/^www\./, ''),
            status: 'pending-analysis',
        };
    } else {
        const text = e.dataTransfer.getData('text/plain');
        if (text) {
            const generatedTitle = text.split(/\s+/).slice(0, 5).join(' ') + (text.split(/\s+/).length > 5 ? '...' : '');
            contentData = {
                type: 'note', title: generatedTitle || 'Untitled Note', description: text,
                tags: [{ id: 'dnd-drop', name: 'dropped' }], contentType: 'Note', status: 'pending-analysis',
            };
        }
    }

    if (contentData) {
      await handleAddContentAndRefresh(contentData);
    } else {
      toast({ title: "Drop Not Processed", description: "Could not handle the dropped content type.", variant: "default" });
    }
  };
  
  if (isAuthLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SearchProvider>
      <div className="flex min-h-screen w-full relative">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 md:ml-20">
          <AppHeader />
          <main
            className="flex-1 p-4 md:p-6 lg:p-8 bg-background overflow-auto relative"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {children}
            {isDraggingOver && (
              <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm flex flex-col items-center justify-center z-50 pointer-events-none rounded-lg border-2 border-dashed border-primary">
                <UploadCloud className="h-16 w-16 text-primary mb-4" />
                <p className="text-lg font-semibold text-primary">Drop here to save</p>
              </div>
            )}
          </main>
        </div>
        <AddContentDialog
          open={isAddContentDialogOpen}
          onOpenChange={setIsAddContentDialogOpen}
          zones={zones}
          onContentAdd={handleAddContentAndRefresh}
        />
        <AddTodoDialog
          open={isAddTodoDialogOpen}
          onOpenChange={setIsAddTodoDialogOpen}
          zones={zones}
          onTodoAdd={handleAddContentAndRefresh} 
        />
        <RecordVoiceDialog
          open={isRecordVoiceDialogOpen}
          onOpenChange={setIsRecordVoiceDialogOpen}
          onRecordingSave={handleAddContentAndRefresh}
        />

        <Button
          size="lg"
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 rounded-full h-16 w-16 shadow-xl z-40 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center"
          aria-label="Add Content"
          disabled={isAuthLoading}
          onClick={() => setIsAddContentDialogOpen(true)}
        >
          <Plus className="h-7 w-7" />
        </Button>
      </div>
    </SearchProvider>
  );
}
