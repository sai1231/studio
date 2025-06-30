
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
import { addContentItem, getZones } from '@/services/contentService';
import { Button } from '@/components/ui/button';
import { Plus, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';

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
    setDroppedFile,
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

      if (newContentData.type !== 'todo') {
        setIsAddContentDialogOpen(false);
      }
      
      router.refresh();

    } catch (error) {
      console.error("Error saving content from dialog:", error);
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

  const saveDroppedItem = async (type: ContentItemType, title: string, data: string | { url?: string; description?: string } ) => {
    const newContent: Omit<ContentItem, 'id' | 'createdAt'> = type === 'link' && typeof data === 'object' && data.url
      ? {
          type: 'link',
          title: title || `Dropped Link: ${new URL(data.url).hostname}`,
          url: data.url,
          description: data.description || `Link dropped on ${new Date().toLocaleDateString()}`,
          tags: [{ id: 'dnd-drop', name: 'dropped' }],
        }
      : {
          type: 'note',
          title: title || `Dropped Note - ${new Date().toLocaleDateString()}`,
          description: data as string,
          tags: [{ id: 'dnd-drop', name: 'dropped' }],
        };
    await handleAddContentAndRefresh(newContent);
  };

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

    if (e.dataTransfer.types.includes('application/x-mati-internal')) {
      return;
    }

    if (isAuthLoading || !user) {
        toast({ title: "Hold on...", description: "Still getting things ready. Please try again in a moment.", variant: "default" });
        return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file) {
        setDroppedFile(file);
        setIsAddContentDialogOpen(true);
      }
      return;
    }

    const uri = e.dataTransfer.getData('text/uri-list');
    if (uri && isValidUrl(uri)) return await saveDroppedItem('link', '', { url: uri });
    
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      if (isValidUrl(text)) return await saveDroppedItem('link', '', { url: text });
      return await saveDroppedItem('note', 'Dropped Text', text);
    }

    toast({ title: "Drop Not Processed", description: "Could not handle the dropped content type.", variant: "default" });
  };
  
  if (isAuthLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
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
  );
}
