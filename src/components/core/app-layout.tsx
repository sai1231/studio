
'use client';
import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import AppHeader from '@/components/core/app-header';
import AppSidebar from '@/components/core/app-sidebar';
import AddContentDialog from '@/components/core/add-content-dialog';
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
import { Plus, FileText, ImageUp, Mic, UploadCloud, FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAddContentDialogOpen, setIsAddContentDialogOpen] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const { toast } = useToast();
  const imageUploadInputRef = useRef<HTMLInputElement>(null);
  const pdfUploadInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fetchZones = useCallback(async () => {
    try {
      const fetchedZones = await getZones();
      setZones(fetchedZones);
    } catch (error) {
      console.error("Error fetching zones:", error);
      toast({ title: "Error", description: "Could not load zones.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const handleAddContentFromDialog = async (newContentData: Omit<ContentItem, 'id' | 'createdAt'>) => {
    const currentToast = toast({
      title: "Saving Content...",
      description: "Please wait while your content is being saved.",
    });
    try {
      await addContentItem({
        ...newContentData,
      });
      currentToast.update({
        id: currentToast.id,
        title: "Content Saved!",
        description: `"${newContentData.title}" (${newContentData.type}) has been saved.`,
      });
      setIsAddContentDialogOpen(false);
      // Consider a global state or event bus if immediate refresh on other pages is needed
    } catch (error) {
      console.error("Error saving content from dialog:", error);
      currentToast.update({
        id: currentToast.id,
        title: "Error Saving Content",
        description: "Could not save your content. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImageFileSelected = async (file: File) => {
    const currentToast = toast({
      title: "Processing Image...",
      description: "Preparing your image.",
    });

    try {
      const imagePath = `contentImages/${Date.now()}_${file.name}`;
      const downloadURL = await uploadFile(file, imagePath);

      currentToast.update({
        id: currentToast.id,
        title: "Saving Image...",
        description: "Adding your image to your library.",
      });

      const defaultZoneId = zones.length > 0 ? zones[0].id : undefined;
       if (!defaultZoneId && zones.length > 0) { 
        console.warn("No default zone available, image might not be assigned to a zone.");
       }


      const newImageContent: Omit<ContentItem, 'id' | 'createdAt'> = {
        type: 'image',
        title: file.name || 'Uploaded Image',
        description: `Uploaded image: ${file.name}`,
        imageUrl: downloadURL,
        tags: [{id: 'upload', name: 'upload'}, { id: file.type.startsWith('image/') ? 'image-upload' : 'file-upload', name: file.type.startsWith('image/') ? 'image' : 'file' }],
        zoneId: defaultZoneId,
      };

      await addContentItem(newImageContent);

      currentToast.update({
        id: currentToast.id,
        title: "Image Saved!",
        description: `"${newImageContent.title}" has been saved.`,
      });
    } catch (error) {
      console.error("Error processing image upload:", error);
      currentToast.update({
        id: currentToast.id,
        title: "Image Upload Failed",
        description: "Could not process your image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePdfFileSelected = async (file: File) => {
    const currentToast = toast({
      title: "Processing PDF...",
      description: "Preparing your PDF.",
    });

    try {
      const pdfPath = `contentPdfs/${Date.now()}_${file.name}`;
      const downloadURL = await uploadFile(file, pdfPath);

      currentToast.update({
        id: currentToast.id,
        title: "Saving PDF...",
        description: "Adding your PDF to your library.",
      });

      const defaultZoneId = zones.length > 0 ? zones[0].id : undefined;
      if (!defaultZoneId && zones.length > 0) {
        console.warn("No default zone available, PDF might not be assigned to a zone.");
      }

      const newPdfContent: Omit<ContentItem, 'id' | 'createdAt'> = {
        type: 'link', // PDFs are treated as links to the uploaded file
        title: file.name || 'Uploaded PDF',
        url: downloadURL,
        description: `Uploaded PDF: ${file.name}`,
        tags: [{ id: 'upload', name: 'upload' }, { id: 'pdf-upload', name: 'pdf' }],
        zoneId: defaultZoneId,
        contentType: 'PDF',
        domain: 'klipped.internal.storage', 
      };

      await addContentItem(newPdfContent);

      currentToast.update({
        id: currentToast.id,
        title: "PDF Saved!",
        description: `"${newPdfContent.title}" has been saved as a link.`,
      });
    } catch (error) {
      console.error("Error processing PDF upload:", error);
      currentToast.update({
        id: currentToast.id,
        title: "PDF Upload Failed",
        description: "Could not process your PDF. Please try again.",
        variant: "destructive",
      });
    }
  };


  const handleUploadImageClick = () => {
    imageUploadInputRef.current?.click();
  };

  const handleImageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageFileSelected(file);
      if (event.target) event.target.value = '';
    }
  };

  const handleUploadPdfClick = () => {
    pdfUploadInputRef.current?.click();
  };

  const handlePdfInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handlePdfFileSelected(file);
      if (event.target) event.target.value = '';
    }
  };

  const handleRecordVoiceClick = () => {
    toast({
      title: "Voice Recording",
      description: "Voice recording feature coming soon!",
    });
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const saveDroppedItem = async (type: ContentItemType, title: string, data: string | { url?: string; description?: string } ) => {
    const toastId = toast({ title: `Processing Dropped ${type === 'link' ? 'Link' : 'Content'}...`});
    try {
        const defaultZoneId = zones.length > 0 ? zones[0].id : undefined;
        if (!defaultZoneId) {
            toast({ id: toastId.id, title: "Error", description: `No zones available to save the ${type}.`, variant: "destructive"});
            return;
        }

        let contentData: Omit<ContentItem, 'id' | 'createdAt'>;

        if (type === 'link' && typeof data === 'object' && data.url) {
            contentData = {
                type: 'link',
                title: title || `Dropped Link: ${new URL(data.url).hostname}`,
                url: data.url,
                description: data.description || `Link dropped on ${new Date().toLocaleDateString()}`,
                tags: [{ id: 'dnd-drop', name: 'dropped' }],
                zoneId: defaultZoneId,
            };
        } else if (type === 'note' && typeof data === 'string') {
            contentData = {
                type: 'note',
                title: title || `Dropped Note - ${new Date().toLocaleDateString()}`,
                description: data,
                tags: [{ id: 'dnd-drop', name: 'dropped' }],
                zoneId: defaultZoneId,
            };
        } else {
            throw new Error("Invalid data structure for dropped item.");
        }

        await addContentItem(contentData);
        toast({
            id: toastId.id,
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} Saved!`,
            description: `Dropped ${type} "${contentData.title}" has been saved.`,
        });

    } catch (error) {
        console.error(`Error saving dropped ${type}:`, error);
        toast({
            id: toastId.id,
            title: `Error Saving ${type.charAt(0).toUpperCase() + type.slice(1)}`,
            description: `Could not save the dropped ${type}.`,
            variant: "destructive",
        });
    }
  };


  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // Check if the drag contains useful data types
    const types = event.dataTransfer.types;
    if (types.includes('Files') || types.includes('text/uri-list') || types.includes('text/plain')) {
        setIsDraggingOver(true);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // Ensure isDraggingOver stays true if it was set by handleDragEnter
    if (!isDraggingOver) {
        const types = event.dataTransfer.types;
        if (types.includes('Files') || types.includes('text/uri-list') || types.includes('text/plain')) {
            setIsDraggingOver(true);
        }
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
     // Check if the mouse is leaving to an internal child or truly outside the drop zone
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    setIsDraggingOver(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);

    const files = event.dataTransfer.files;
    const items = event.dataTransfer.items;

    // Handle Files
    if (files && files.length > 0) {
      const file = files[0]; // Process first file
      if (file.type.startsWith('image/')) {
        await handleImageFileSelected(file);
        return;
      }
      if (file.type === 'application/pdf') {
        await handlePdfFileSelected(file);
        return;
      }
      if (file.type === 'text/plain') {
        const text = await file.text();
        await saveDroppedItem('note', file.name || `Dropped Text File`, text);
        return;
      }
    }

    // Handle DataTransferItems (preferred for web content)
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'string') {
          if (item.type === 'text/uri-list' || item.type.includes('url')) { // More robust URL type check
            item.getAsString(async (url) => {
              if (isValidUrl(url)) {
                await saveDroppedItem('link', '', { url });
              } else { // Fallback for text if URI is not a valid URL
                await saveDroppedItem('note', 'Dropped Content', url);
              }
            });
            return;
          } else if (item.type === 'text/plain') {
            item.getAsString(async (text) => {
               if (isValidUrl(text)) { // Check if plain text is actually a URL
                await saveDroppedItem('link', '', { url: text });
              } else {
                await saveDroppedItem('note', `Dropped Text`, text);
              }
            });
            return;
          }
        }
      }
    }

    // Fallback for older browsers or specific drag sources using getData
    try {
      const urlData = event.dataTransfer.getData('URL') || event.dataTransfer.getData('text/uri-list');
      if (urlData && isValidUrl(urlData)) {
        await saveDroppedItem('link', '', { url: urlData });
        return;
      }

      const textData = event.dataTransfer.getData('text/plain');
      if (textData) {
        if (isValidUrl(textData)) { // Check if plain text is actually a URL
          await saveDroppedItem('link', '', { url: textData });
        } else {
          await saveDroppedItem('note', 'Dropped Plain Text', textData);
        }
        return;
      }
    } catch (e) {
      console.error("Error processing getData from dataTransfer:", e);
    }

    toast({
      title: "Drop Not Processed",
      description: "Could not determine the type of the dropped content or content was empty.",
      variant: "default",
    });
  };


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
        onContentAdd={handleAddContentFromDialog}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 md:bottom-8 md:right-8 rounded-full h-16 w-16 shadow-xl z-40 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center"
            aria-label="Add Content Menu"
          >
            <Plus className="h-7 w-7" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" sideOffset={16} className="w-56 mb-1">
          <DropdownMenuItem onClick={() => setIsAddContentDialogOpen(true)} className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            <span>Add Link / Note</span>
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
