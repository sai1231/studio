
'use client';
import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/core/app-header';
import AppSidebar from '@/components/core/app-sidebar';
import AddContentDialog from '@/components/core/add-content-dialog';
import AddTodoDialog from '@/components/core/AddTodoDialog';
import type { Zone, ContentItem, ContentItemType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { addContentItem, getZones, uploadFile } from '@/services/contentService';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, FileText, ImageUp, Mic, UploadCloud, FileUp, ListChecks, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [isAddContentDialogOpen, setIsAddContentDialogOpen] = useState(false);
  const [isAddTodoDialogOpen, setIsAddTodoDialogOpen] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const { toast } = useToast();
  const imageUploadInputRef = useRef<HTMLInputElement>(null);
  const pdfUploadInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileUpload = async (file: File) => {
    if (!user) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      toast({ title: "Unsupported File", description: "You can only upload images or PDF files.", variant: "destructive" });
      return;
    }

    const fileType = isImage ? 'Image' : 'PDF';
    const currentToast = toast({
      title: `Processing ${fileType}...`,
      description: "Uploading to cloud storage.",
    });

    try {
      const folder = isImage ? 'contentImages' : 'contentPdfs';
      const path = `${folder}/${user.uid}/${Date.now()}_${file.name}`;

      const downloadURL = await uploadFile(file, path);

      currentToast.update({
        id: currentToast.id,
        title: `${fileType} Uploaded`,
        description: `Saving metadata to your library...`,
      });

      const newContentData: Omit<ContentItem, 'id' | 'createdAt'> = isImage ? {
        type: 'image',
        title: file.name || 'Uploaded Image',
        description: `Uploaded image: ${file.name}`,
        imageUrl: downloadURL,
        tags: [{id: 'upload', name: 'upload'}, { id: 'image-upload', name: 'image' }],
        zoneId: zones[0]?.id,
        userId: user.uid,
      } : {
        type: 'link', 
        title: file.name || 'Uploaded PDF',
        url: downloadURL,
        description: `Uploaded PDF: ${file.name}`,
        tags: [{ id: 'upload', name: 'upload' }, { id: 'pdf-upload', name: 'pdf' }],
        zoneId: zones[0]?.id,
        contentType: 'PDF',
        domain: 'mati.internal.storage',
        userId: user.uid,
      };

      await addContentItem(newContentData);

      currentToast.update({
        id: currentToast.id,
        title: `${fileType} Saved!`,
        description: `Path: ${path}`,
      });
      
      router.refresh();

    } catch (error: any) {
      console.error(`Error processing ${fileType} upload:`, error);
      let description = error.message || `Could not process your ${fileType}. Please try again.`;
      if (error.code) {
        switch(error.code) {
          case 'storage/retry-limit-exceeded':
            description = "Connection timed out. Is Storage enabled with a Blaze plan in your project console?";
            break;
          case 'storage/unauthorized':
            description = "Permission denied. Please check your Firebase Storage security rules.";
            break;
          case 'storage/object-not-found':
            description = "File not found. This can happen if the upload was interrupted.";
            break;
          default:
            description = `An unknown storage error occurred: ${error.code}.`;
        }
      }
      currentToast.update({
        id: currentToast.id,
        title: `${fileType} Upload Failed`,
        description: description,
        variant: "destructive",
      });
    }
  };

  const handleUploadImageClick = () => imageUploadInputRef.current?.click();
  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
      if(e.target) e.target.value = '';
    }
  };

  const handleUploadPdfClick = () => pdfUploadInputRef.current?.click();
  const handlePdfInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
      if(e.target) e.target.value = '';
    }
  };

  const handleRecordVoiceClick = () => toast({ title: "Voice Recording", description: "Voice recording feature coming soon!" });
  const handleAddTodoClick = () => setIsAddTodoDialogOpen(true);

  const isValidUrl = (s: string) => { try { new URL(s); return true; } catch (_) { return false; } };

  const saveDroppedItem = async (type: ContentItemType, title: string, data: string | { url?: string; description?: string } ) => {
    const newContent: Omit<ContentItem, 'id' | 'createdAt'> = type === 'link' && typeof data === 'object' && data.url
      ? {
          type: 'link',
          title: title || `Dropped Link: ${new URL(data.url).hostname}`,
          url: data.url,
          description: data.description || `Link dropped on ${new Date().toLocaleDateString()}`,
          tags: [{ id: 'dnd-drop', name: 'dropped' }],
          zoneId: zones[0]?.id,
        }
      : {
          type: 'note',
          title: title || `Dropped Note - ${new Date().toLocaleDateString()}`,
          description: data as string,
          tags: [{ id: 'dnd-drop', name: 'dropped' }],
          zoneId: zones[0]?.id,
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

    if (isAuthLoading || !user) {
        toast({ title: "Hold on...", description: "Still getting things ready. Please try again in a moment.", variant: "default" });
        return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        return await handleFileUpload(file);
      }
      if (file.type === 'text/plain') return await saveDroppedItem('note', file.name, await file.text());
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
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full relative">
      <AppSidebar />
      <div className="flex flex-col flex-1 md:ml-64 min-w-0">
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 md:bottom-8 md:right-8 rounded-full h-16 w-16 shadow-xl z-40 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center"
            aria-label="Add Content Menu"
            disabled={isAuthLoading}
          >
            <Plus className="h-7 w-7" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" sideOffset={16} className="w-56 mb-1">
          <DropdownMenuItem onClick={() => setIsAddContentDialogOpen(true)} className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            <span>Add Link / Note</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddTodoClick} className="cursor-pointer">
            <ListChecks className="mr-2 h-4 w-4" />
            <span>Add Todo</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleUploadImageClick} className="cursor-pointer">
            <ImageUp className="mr-2 h-4 w-4" />
            <span>Upload Image</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleUploadPdfClick} className="cursor-pointer">
            <FileUp className="mr-2 h-4 w-4" />
            <span>Upload PDF</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRecordVoiceClick} className="cursor-pointer">
            <Mic className="mr-2 h-4 w-4" />
            <span>Record Voice</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        type="file"
        ref={imageUploadInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleImageInputChange}
      />
      <input
        type="file"
        ref={pdfUploadInputRef}
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handlePdfInputChange}
      />
    </div>
  );
}
